/**
 * PowerCloud Extension Service Worker
 * 
 * Main entry point for the background service worker.
 * Handles initialization, message routing, and token management.
 */

// Import token management functions
import { initializeTokens, setupWebRequestListener } from './token-manager.js';

// Import message handlers
import { 
  handleGetAuthTokens,
  handleDeleteToken,
  handleDeleteAllTokens,
  handleFetchCardDetails,
  handleFetchBookDetails,
  handleFetchAdministrationDetails,
  handleFetchBalanceAccountDetails,
  handleFetchEntryDetails
} from './message-handlers/index.js';

// Set up message action handlers map for cleaner code
const messageHandlers = {
  "getAuthTokens": handleGetAuthTokens,
  "deleteToken": handleDeleteToken,
  "deleteAllTokens": handleDeleteAllTokens,
  "fetchCardDetails": handleFetchCardDetails,
  "fetchBookDetails": handleFetchBookDetails,
  "fetchAdministrationDetails": handleFetchAdministrationDetails,
  "fetchBalanceAccountDetails": handleFetchBalanceAccountDetails,
  "fetchEntryDetails": handleFetchEntryDetails
};

// Set up web request listener for token capture
console.log('[service-worker] Setting up web request listener...');
setupWebRequestListener();
console.log('[service-worker] Web request listener setup complete');

// Initialize from storage on startup
chrome.runtime.onInstalled.addListener(() => {
  console.log('[service-worker] Extension installed, initializing tokens...');
  initializeTokens()
    .then(tokens => {
      console.log(`[service-worker] Tokens initialized successfully, count: ${tokens.length}`);
    })
    .catch(error => {
      console.error('[service-worker] Error initializing tokens:', error);
    });
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = messageHandlers[message.action];
  
  if (handler) {
    return handler(message, sender, sendResponse);
  }
  
  console.warn(`No handler found for action: ${message.action}`);
  return true; // Keep the messaging channel open for async response
});
