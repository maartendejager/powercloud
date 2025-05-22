/**
 * Token Message Handlers
 * 
 * Handlers for token-related messages received by the service worker.
 */

import { getAuthTokens, deleteToken, deleteAllTokens } from '../token-manager.js';

/**
 * Handle getAuthTokens message
 * @param {Object} message - The message object
 * @param {Object} sender - The sender information
 * @param {Function} sendResponse - Function to send response
 * @returns {boolean} - Whether to keep the message channel open
 */
export function handleGetAuthTokens(message, sender, sendResponse) {
  sendResponse({ authTokens: getAuthTokens() });
  return false; // No need to keep message channel open for sync response
}

/**
 * Handle deleteToken message
 * @param {Object} message - The message object containing token
 * @param {Object} sender - The sender information
 * @param {Function} sendResponse - Function to send response
 * @returns {boolean} - Whether to keep the message channel open
 */
export function handleDeleteToken(message, sender, sendResponse) {
  deleteToken(message.token)
    .then(() => {
      sendResponse({ success: true });
    })
    .catch(error => {
      console.error('Error deleting token:', error);
      sendResponse({ success: false, error: error.message });
    });
  
  return true; // Keep message channel open for async response
}

/**
 * Handle deleteAllTokens message
 * @param {Object} message - The message object
 * @param {Object} sender - The sender information
 * @param {Function} sendResponse - Function to send response
 * @returns {boolean} - Whether to keep the message channel open
 */
export function handleDeleteAllTokens(message, sender, sendResponse) {
  deleteAllTokens()
    .then(() => {
      sendResponse({ success: true });
    })
    .catch(error => {
      console.error('Error clearing all tokens:', error);
      sendResponse({ success: false, error: error.message });
    });
  
  return true; // Keep message channel open for async response
}
