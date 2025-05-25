/**
 * Token Manager
 * 
 * Manages authentication tokens for the PowerCloud extension.
 * Handles token storage, retrieval, and web request interception.
 */

import { getAllTokens, saveTokens, removeToken, clearTokens, handleAuthHeaderFromWebRequest, isValidJWT } from '../shared/auth-module.js';
import { isApiRoute } from '../shared/url-patterns-module.js';

// Initialize logger for Token Manager (service worker safe)
const logger = (() => {
  try {
    // Try to use the global logger factory if available
    if (typeof globalThis !== 'undefined' && globalThis.PowerCloudLoggerFactory) {
      return globalThis.PowerCloudLoggerFactory.createLogger('TokenManager');
    } else if (typeof window !== 'undefined' && window.PowerCloudLoggerFactory) {
      return window.PowerCloudLoggerFactory.createLogger('TokenManager');
    }
  } catch (e) {
    // Fallback for service worker or when logger is not available
  }
  
  // Service worker safe fallback logger
  return {
    debug: (message, data) => {
      // In service worker, only log errors and warnings to console
    },
    info: (message, data) => {
      // In service worker, only log errors and warnings to console
    },
    warn: (message, data) => console.warn(`[WARN][TokenManager] ${message}`, data || ''),
    error: (message, data) => console.error(`[ERROR][TokenManager] ${message}`, data || '')
  };
})();

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
        logger.debug(`Filtered out ${tokens.length - apiTokens.length} non-API tokens`);
        // Save the filtered tokens
        return saveTokens(apiTokens).then(() => {
          authTokens = apiTokens;
          logger.debug('Auth tokens initialized:', authTokens.length);
          return authTokens;
        });
      } else {
        authTokens = tokens;
        logger.debug('Auth tokens initialized:', authTokens.length);
        return authTokens;
      }
    });
}

/**
 * Set up web request listener for token capture
 */
export function setupWebRequestListener() {
  logger.info('Setting up chrome.webRequest.onSendHeaders listener...');
  
  chrome.webRequest.onSendHeaders.addListener(
    (details) => {
      logger.debug(`Web request intercepted: ${details.url}`);
      handleAuthHeaderFromWebRequest(details)
        .then(updatedTokens => {
          if (updatedTokens) {
            // Update local reference if a token was processed
            authTokens = updatedTokens;
            logger.debug(`Token processed successfully, updated local cache with ${updatedTokens.length} tokens`);
          } else {
            logger.debug(`No token found in request to ${details.url}`);
          }
        })
        .catch(error => {
          logger.error('Error handling auth header from web request:', error);
        });
    },
    { urls: ["*://*.spend.cloud/api/*", "*://*.dev.spend.cloud/api/*"] }, // Monitor both production and dev API routes
    ["requestHeaders", "extraHeaders"]
  );
  
  logger.info('Web request listener registered for URLs: *://*.spend.cloud/api/*, *://*.dev.spend.cloud/api/*');
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
