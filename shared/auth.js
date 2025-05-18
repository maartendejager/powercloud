/**
 * Shared Authentication Module for PowerCloud Chrome Extension
 * 
 * This module provides centralized authentication token management functionality,
 * handling storage, retrieval, validation, and manipulation of JWT tokens.
 */

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
 * Gets the most recent valid authentication token
 * @returns {Promise<string>} The most recent valid auth token
 * @throws {Error} If no valid token is found
 */
async function getToken() {
  const tokens = await getAllTokens();
  
  if (!tokens || tokens.length === 0) {
    throw new Error("No authentication tokens found");
  }
  
  // Filter for valid tokens
  const validTokens = tokens.filter(token => {
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
  
  throw new Error("No valid authentication tokens found");
}

/**
 * Adds a new token to storage
 * @param {string} token - JWT token string
 * @param {Object} metadata - Additional data about the token
 * @param {string} metadata.url - URL where the token was captured
 * @param {string} [metadata.source] - Source of the token (header, localStorage, etc.)
 * @returns {Promise<void>}
 */
async function setToken(token, metadata = {}) {
  // Don't process empty tokens
  if (!token) {
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

export {
  getToken,
  setToken,
  clearTokens,
  removeToken,
  getAllTokens,
  isValidJWT
};
