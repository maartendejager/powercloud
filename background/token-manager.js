/**
 * Token Manager
 * 
 * Manages authentication tokens for the PowerCloud extension.
 * Handles token storage, retrieval, and web request interception.
 */

import { getAllTokens, saveTokens, removeToken, clearTokens, handleAuthHeaderFromWebRequest, isValidJWT } from '../shared/auth.js';
import { isApiRoute } from '../shared/url-patterns.js';

// Local reference to tokens for quicker access
let authTokens = [];

/**
 * Initialize tokens from storage
 * @returns {Promise<Array>} - The initialized tokens
 */
export function initializeTokens() {
  return getAllTokens()
    .then(tokens => {
      // Filter out non-API tokens
      const apiTokens = tokens.filter(token => 
        token.url && isApiRoute(token.url)
      );
      
      if (apiTokens.length !== tokens.length) {
        console.log(`Filtered out ${tokens.length - apiTokens.length} non-API tokens`);
        // Save the filtered tokens
        return saveTokens(apiTokens).then(() => {
          authTokens = apiTokens;
          console.log('Auth tokens initialized:', authTokens.length);
          return authTokens;
        });
      } else {
        authTokens = tokens;
        console.log('Auth tokens initialized:', authTokens.length);
        return authTokens;
      }
    });
}

/**
 * Set up web request listener for token capture
 */
export function setupWebRequestListener() {
  chrome.webRequest.onSendHeaders.addListener(
    (details) => {
      handleAuthHeaderFromWebRequest(details)
        .then(updatedTokens => {
          if (updatedTokens) {
            // Update local reference if a token was processed
            authTokens = updatedTokens;
          }
        })
        .catch(error => {
          console.error('Error handling auth header from web request:', error);
        });
    },
    { urls: ["*://*.spend.cloud/api/*"] }, // Only monitor API routes
    ["requestHeaders", "extraHeaders"]
  );
}

/**
 * Get the current auth tokens
 * @returns {Array} - The current auth tokens
 */
export function getAuthTokens() {
  return authTokens;
}

/**
 * Delete a specific token
 * @param {string} token - The token to delete
 * @returns {Promise<boolean>} - Whether the operation was successful
 */
export function deleteToken(token) {
  if (!token) {
    return Promise.reject(new Error('No token provided'));
  }
  
  return removeToken(token)
    .then(success => {
      if (success) {
        return getAllTokens();
      } else {
        throw new Error('Token not found');
      }
    })
    .then(tokens => {
      authTokens = tokens; // Update local cache
      return true;
    });
}

/**
 * Clear all tokens
 * @returns {Promise<boolean>} - Whether the operation was successful
 */
export function deleteAllTokens() {
  return clearTokens()
    .then(() => {
      authTokens = []; // Update local cache
      return true;
    });
}

/**
 * Update the auth tokens array
 * @param {Array} tokens - The new auth tokens
 */
export function updateAuthTokens(tokens) {
  authTokens = tokens;
}
