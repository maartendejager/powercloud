/**
 * Shared Authentication Module for PowerCloud Chrome Extension
 * 
 * This module provides centralized authentication token management functionality,
 * handling storage, retrieval, validation, and manipulation of JWT tokens.
 */

// Note: This module depends on url-patterns.js being loaded first

/**
 * Maximum number of tokens to store in history
 * @type {number}
 */
const MAX_TOKENS = 10;

/**
 * Retrieves all stored authentication tokens
 * @returns {Promise<Array>} Array of token objects with metadata
 */
async function getAllTokens() {
  return new Promise((resolve) => {
    chrome.storage.local.get("authTokens", (result) => {
      resolve(result.authTokens || []);
    });
  });
}

/**
 * Gets the most recent valid authentication token for a specific environment and development status.
 * If clientEnvironment or isDev parameters are not provided, returns the most recent valid token.
 * @param {string} [clientEnvironment] - The client environment (tenant) name.
 * @param {boolean} [isDev] - Whether a token for a development environment is required.
 * @returns {Promise<string>} The most recent valid and applicable auth token.
 * @throws {Error} If no suitable valid token is found.
 */
async function getToken(clientEnvironment, isDev) {
  const tokens = await getAllTokens();
  
  if (!tokens || tokens.length === 0) {
    throw new Error("No authentication tokens found");
  }
  
  // Filter for valid tokens and, if specified, by environment and dev status
  const validTokens = tokens.filter(token => {
    // Check clientEnvironment and isDevRoute match if parameters are provided
    if (clientEnvironment !== undefined && token.clientEnvironment !== clientEnvironment) {
      return false;
    }
    
    if (isDev !== undefined && token.isDevRoute !== isDev) {
      return false;
    }
    
    // If token has explicit validity flag
    if (token.hasOwnProperty('isValid')) {
      return token.isValid;
    }
    
    // If token has expiry info
    if (token.expiryDate) {
      return new Date(token.expiryDate) > new Date();
    }
    
    // Try to parse the JWT
    try {
      const payload = JSON.parse(atob(token.token.split('.')[1]));
      if (payload.exp) {
        return new Date(payload.exp * 1000) > new Date();
      }
    } catch (e) {
      // Skip error
    }
    
    // If we can't determine validity, assume it's valid
    return true;
  });
  
  if (validTokens.length > 0) {
    return validTokens[0].token;
  }
  
  if (clientEnvironment || isDev !== undefined) {
    throw new Error(`No valid authentication token found for environment '${clientEnvironment || "any"}' and isDev=${isDev !== undefined ? isDev : "any"}`);
  } else {
    throw new Error("No valid authentication tokens found");
  }
}

/**
 * Adds a new token to storage
 * @param {string} token - JWT token string
 * @param {Object} metadata - Additional data about the token
 * @param {string} metadata.url - URL where the token was captured
 * @param {string} [metadata.source] - Source of the token (header, localStorage, etc.)
 * @param {string} [metadata.clientEnvironment] - Client environment name
 * @param {boolean} [metadata.isDevRoute] - Whether the token was captured from a dev route
 * @returns {Promise<void>}
 */
async function setToken(token, metadata = {}) {
  // Don't process empty tokens
  if (!token) {
    return;
  }
  
  // Only accept tokens from API routes
  if (metadata.url && !window.isApiRoute(metadata.url)) {
    console.log('Skipping token from non-API URL:', metadata.url);
    return;
  }
  
  // Get existing tokens
  let authTokens = await getAllTokens();
  
  // Parse token and check validity
  let isValid = true;
  let expiryDate = null;
  
  try {
    const payloadBase64 = token.split('.')[1];
    if (payloadBase64) {
      const payload = JSON.parse(atob(payloadBase64));
      if (payload.exp) {
        expiryDate = new Date(payload.exp * 1000);
        isValid = expiryDate > new Date();
      }
    }
  } catch (e) {
    // If we can't parse the token, assume it's valid
    console.error("Error parsing token:", e);
  }
  
  // Create token entry
  const tokenEntry = {
    token,
    timestamp: new Date().toISOString(),
    url: metadata.url || window.location?.href || "unknown",
    source: metadata.source || "direct",
    clientEnvironment: metadata.clientEnvironment || "unknown",
    isDevRoute: metadata.isDevRoute || false,
    isValid: isValid,
    expiryDate: expiryDate ? expiryDate.toISOString() : null
  };
  
  // Don't add duplicate tokens
  if (!authTokens.some(entry => entry.token === token)) {
    // Add to beginning of array
    authTokens.unshift(tokenEntry);
    
    // Keep only MAX_TOKENS entries
    if (authTokens.length > MAX_TOKENS) {
      authTokens.pop();
    }
    
    // Store in chrome.storage
    await saveTokens(authTokens);
  }
}

/**
 * Saves array of tokens to storage
 * @param {Array} tokens - Array of token objects
 * @returns {Promise<void>}
 */
async function saveTokens(tokens) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ authTokens: tokens }, resolve);
  });
}

/**
 * Clears all stored authentication tokens
 * @returns {Promise<void>}
 */
async function clearTokens() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ authTokens: [] }, resolve);
  });
}

/**
 * Removes a specific token from storage
 * @param {string} tokenToRemove - The token string to remove
 * @returns {Promise<boolean>} True if token was found and removed
 */
async function removeToken(tokenToRemove) {
  const tokens = await getAllTokens();
  const initialLength = tokens.length;
  
  const filteredTokens = tokens.filter(entry => entry.token !== tokenToRemove);
  
  if (filteredTokens.length !== initialLength) {
    await saveTokens(filteredTokens);
    return true;
  }
  
  return false;
}

/**
 * Validates if a string appears to be a JWT token
 * @param {string} token - Token string to validate
 * @returns {boolean} True if the token looks like a JWT
 */
function isValidJWT(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // Basic structure check: should have 3 parts separated by dots
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }
  
  // Try to parse the payload (middle part)
  try {
    JSON.parse(atob(parts[1]));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Gets the decoded payload from a JWT token
 * @param {string} token - JWT token string
 * @returns {Object|null} Decoded payload or null if invalid
 */
function getTokenPayload(token) {
  if (!isValidJWT(token)) {
    return null;
  }
  
  try {
    const payloadBase64 = token.split('.')[1];
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch (e) {
    console.error("Error decoding token payload:", e);
    return null;
  }
}

/**
 * Processes web request details to find, validate, and store an authentication token.
 * It calls setToken to store the token and then getAllTokens to return the updated list.
 * @param {object} details - The details object from chrome.webRequest.onSendHeaders.
 * @returns {Promise<Array|null>} A promise that resolves with the updated list of all tokens 
 *                                if a new valid token was processed, or null otherwise.
 */
async function handleAuthHeaderFromWebRequest(details) {
  // Check if the URL is an API route
  if (!window.isApiRoute(details.url)) {
    return null; // Skip non-API routes
  }

  // Look for Authorization header
  const authHeader = details.requestHeaders?.find(header =>
    header.name.toLowerCase() === 'x-authorization-token' ||
    header.name.toLowerCase() === 'authorization'
  );

  if (authHeader?.value) {
    let token = authHeader.value;
    // If it's a Bearer token, extract just the JWT
    if (token.startsWith('Bearer ')) {
      token = token.slice(7);
    }

    // Determine client environment and dev route status
    const clientEnvironment = extractClientEnvironment(details.url);
    const isDevRouteFlag = isDevelopmentRoute(details.url);

    // Store the token using the existing setToken function
    await setToken(token, { 
      url: details.url, 
      source: 'webRequest',
      clientEnvironment: clientEnvironment,
      isDevRoute: isDevRouteFlag
    });
    // After setting the token, get the updated list of all tokens
    const allTokens = await getAllTokens();
    return allTokens;
  }
  return null; // No relevant header found
}

/**
 * Extracts client environment (tenant) name from a URL
 * @param {string} url - URL to extract from
 * @returns {string} Client environment (tenant) name, or 'unknown' if not found
 */
function extractClientEnvironment(url) {
  try {
    // Extract the client environment (tenant) name from the URL
    // Pattern: https://[client-environment].spend.cloud/... or https://[client-environment].dev.spend.cloud/...
    const match = url.match(/https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud/);
    return match ? match[1] : 'unknown';
  } catch (e) {
    return 'unknown';
  }
}

/**
 * Checks if a URL is for a development environment
 * @param {string} url - URL to check
 * @returns {boolean} True if the URL is for a development environment
 */
function isDevelopmentRoute(url) {
  // Check if URL contains development indicators
  return url.includes('localhost') || 
         url.includes('.dev.') || 
         url.includes('dev-');
}

// Export for browser extension environment
if (typeof window !== 'undefined') {
  window.getToken = getToken;
  window.setToken = setToken;
  window.clearTokens = clearTokens;
  window.removeToken = removeToken;
  window.getAllTokens = getAllTokens;
  window.isValidJWT = isValidJWT;
  window.saveTokens = saveTokens;
  window.getTokenPayload = getTokenPayload;
  window.handleAuthHeaderFromWebRequest = handleAuthHeaderFromWebRequest;
  window.extractClientEnvironment = extractClientEnvironment;
  window.isDevelopmentRoute = isDevelopmentRoute;
}

console.log('🔐 AUTH MODULE LOADED AT:', new Date().toISOString());
