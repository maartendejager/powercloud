/**
 * ES6 Module wrapper for auth.js
 * This module provides ES6 exports by duplicating the core functionality
 * Content scripts use the window exports from auth.js
 * Background scripts and popup use this ES6 module
 */

// Import URL pattern utilities
import { isApiRoute } from './url-patterns-module.js';

/**
 * Token management functions
 * These functions provide secure token storage and management for the extension
 */

/**
 * Get all stored tokens
 * @returns {Promise<Array>} Array of stored tokens
 */
async function getAllTokens() {
  try {
    const result = await chrome.storage.local.get(['authTokens']);
    return result.authTokens || [];
  } catch (error) {
    console.error('Failed to get all tokens:', error);
    return [];
  }
}

/**
 * Get the most recent valid authentication token for a specific environment and development status.
 * If clientEnvironment or isDev parameters are not provided, returns the most recent valid token.
 * @param {string} [clientEnvironment] - The client environment (tenant) name.
 * @param {boolean} [isDev] - Whether a token for a development environment is required.
 * @returns {Promise<string>} The most recent valid and applicable auth token.
 * @throws {Error} If no suitable valid token is found.
 */
async function getToken(clientEnvironment, isDev) {
  try {
    const tokens = await getAllTokens();
    
    // Filter tokens based on validity and criteria
    const validTokens = tokens.filter(token => {
      // Check if token matches environment filter
      if (clientEnvironment && token.clientEnvironment !== clientEnvironment) {
        return false;
      }
      
      // Check if token matches dev environment filter
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
  } catch (error) {
    console.error('Failed to get token:', error);
    throw error;
  }
}

/**
 * Set/update a token 
 * @param {string} token - The JWT token
 * @param {Object} metadata - Additional data about the token
 * @param {string} metadata.url - URL where the token was captured
 * @param {string} [metadata.source] - Source of the token (header, localStorage, etc.)
 * @param {string} [metadata.clientEnvironment] - Client environment name
 * @param {boolean} [metadata.isDevRoute] - Whether the token was captured from a dev route
 * @returns {Promise<boolean>} Success status
 */
async function setToken(token, metadata = {}) {
  console.log(`[auth-module] ${new Date().toISOString()} - Setting token with metadata:`, metadata);
  
  // Don't process empty tokens
  if (!token) {
    return false;
  }
  
  try {
    const tokens = await getAllTokens();
    
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
      url: metadata.url || "unknown",
      source: metadata.source || "direct",
      clientEnvironment: metadata.clientEnvironment || "unknown",
      isDevRoute: metadata.isDevRoute || false,
      isValid: isValid,
      expiryDate: expiryDate ? expiryDate.toISOString() : null
    };
    
    // Don't add duplicate tokens
    if (!tokens.some(entry => entry.token === token)) {
      // Add to beginning of array
      tokens.unshift(tokenEntry);
      
      // Keep only 10 entries (MAX_TOKENS)
      if (tokens.length > 10) {
        tokens.pop();
      }
      
      // Store in chrome.storage
      await chrome.storage.local.set({ authTokens: tokens });
      console.log(`[auth-module] ${new Date().toISOString()} - Token saved successfully`);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to set token:', error);
    return false;
  }
}

/**
 * Save multiple tokens at once
 * @param {Array} tokens - Array of token objects
 * @returns {Promise<boolean>} Success status
 */
async function saveTokens(tokens) {
  try {
    await chrome.storage.local.set({ authTokens: tokens });
    return true;
  } catch (error) {
    console.error('Failed to save tokens:', error);
    return false;
  }
}

/**
 * Clear all stored tokens
 * @returns {Promise<boolean>} Success status
 */
async function clearTokens() {
  try {
    await chrome.storage.local.set({ authTokens: [] });
    return true;
  } catch (error) {
    console.error('Failed to clear tokens:', error);
    return false;
  }
}

/**
 * Remove a specific token by token string
 * @param {string} tokenToRemove - The token string to remove
 * @returns {Promise<boolean>} Success status
 */
async function removeToken(tokenToRemove) {
  try {
    const tokens = await getAllTokens();
    const initialLength = tokens.length;
    
    const filteredTokens = tokens.filter(entry => entry.token !== tokenToRemove);
    
    if (filteredTokens.length !== initialLength) {
      await chrome.storage.local.set({ authTokens: filteredTokens });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to remove token:', error);
    return false;
  }
}

/**
 * Validate if a JWT token is valid (basic format check)
 * @param {string} token - The JWT token to validate
 * @returns {boolean} True if token appears to be valid JWT format
 */
function isValidJWT(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }
  
  try {
    // Try to decode the header and payload
    JSON.parse(atob(parts[0]));
    JSON.parse(atob(parts[1]));
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get the payload from a JWT token
 * @param {string} token - The JWT token
 * @returns {Object|null} Decoded payload or null if invalid
 */
function getTokenPayload(token) {
  if (!isValidJWT(token)) {
    return null;
  }
  
  try {
    const parts = token.split('.');
    return JSON.parse(atob(parts[1]));
  } catch (error) {
    console.error('Failed to decode token payload:', error);
    return null;
  }
}

/**
 * Handle authentication header from web request
 * @param {Object} details - Web request details
 * @returns {Promise<Array|null>} Updated tokens array or null
 */
async function handleAuthHeaderFromWebRequest(details) {
  console.log(`[auth-module] ${new Date().toISOString()} - Processing web request for token capture: ${details.url}`);
  
  try {
    if (!isApiRoute(details.url)) {
      console.log(`[auth-module] Skipping non-API route: ${details.url}`);
      return null; // Skip non-API routes
    }

    console.log(`[auth-module] Processing API route: ${details.url}`);

    // Look for Authorization header
    const authHeader = details.requestHeaders?.find(header =>
      header.name.toLowerCase() === 'x-authorization-token' ||
      header.name.toLowerCase() === 'authorization'
    );

    if (authHeader?.value) {
      let token = authHeader.value;
      console.log(`[auth-module] Found auth header: ${authHeader.name} = ${token.substring(0, 20)}...`);
      
      // If it's a Bearer token, extract just the JWT
      if (token.startsWith('Bearer ')) {
        token = token.slice(7);
        console.log(`[auth-module] Extracted Bearer token: ${token.substring(0, 20)}...`);
      }

      // Determine client environment and dev route status
      const clientEnvironment = extractClientEnvironment(details.url);
      const isDevRouteFlag = isDevelopmentRoute(details.url);

      console.log(`[auth-module] Token metadata - Environment: ${clientEnvironment}, isDev: ${isDevRouteFlag}`);

      // Store the token using the existing setToken function
      await setToken(token, { 
        url: details.url, 
        source: 'webRequest',
        clientEnvironment: clientEnvironment,
        isDevRoute: isDevRouteFlag
      });
      // After setting the token, get the updated list of all tokens
      const allTokens = await getAllTokens();
      console.log(`[auth-module] ${new Date().toISOString()} - Token captured and stored, total tokens: ${allTokens.length}`);
      return allTokens;
    } else {
      console.log(`[auth-module] No auth header found in request to ${details.url}`);
    }
    return null; // No relevant header found
  } catch (error) {
    console.error('[auth-module] Failed to handle auth header:', error);
    return null;
  }
}

/**
 * Extract client environment from URL or token
 * @param {string} url - The URL to analyze
 * @returns {string} Environment identifier
 */
function extractClientEnvironment(url) {
  if (!url) return 'unknown';
  
  if (url.includes('localhost') || url.includes('.dev.') || url.includes('dev-')) {
    return 'development';
  }
  
  if (url.includes('.staging.') || url.includes('staging-')) {
    return 'staging';
  }
  
  return 'production';
}

/**
 * Check if URL is a development route
 * @param {string} url - The URL to check
 * @returns {boolean} True if development route
 */
function isDevelopmentRoute(url) {
  return extractClientEnvironment(url) === 'development';
}

export {
  getAllTokens,
  getToken,
  setToken,
  saveTokens,
  clearTokens,
  removeToken,
  isValidJWT,
  getTokenPayload,
  handleAuthHeaderFromWebRequest,
  extractClientEnvironment,
  isDevelopmentRoute
};
