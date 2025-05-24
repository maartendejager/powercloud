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

// Import health monitoring handlers
import {
  initializeHealthMonitoring,
  handleGetExtensionHealth,
  handleGetFeatureStatus,
  handleGetPerformanceMetrics,
  handleGetDebugLogs,
  handleGetErrorReports,
  handleClearDebugData,
  handleExportHealthReport,
  handleUpdateFeatureHealth,
  handleRecordPerformanceMetric,
  recordDebugLog
} from './message-handlers/health-handlers.js';

// Set up message action handlers map for cleaner code
const messageHandlers = {
  "getAuthTokens": handleGetAuthTokens,
  "deleteToken": handleDeleteToken,
  "deleteAllTokens": handleDeleteAllTokens,
  "fetchCardDetails": handleFetchCardDetails,
  "fetchBookDetails": handleFetchBookDetails,
  "fetchAdministrationDetails": handleFetchAdministrationDetails,
  "fetchBalanceAccountDetails": handleFetchBalanceAccountDetails,
  "fetchEntryDetails": handleFetchEntryDetails,
  // Health dashboard handlers
  "getExtensionHealth": handleGetExtensionHealth,
  "getFeatureStatus": handleGetFeatureStatus,
  "getPerformanceMetrics": handleGetPerformanceMetrics,
  "getDebugLogs": handleGetDebugLogs,
  "getErrorReports": handleGetErrorReports,
  "clearDebugData": handleClearDebugData,
  "exportHealthReport": handleExportHealthReport,
  "updateFeatureHealth": handleUpdateFeatureHealth,
  "recordPerformanceMetric": handleRecordPerformanceMetric
};

// Set up web request listener for token capture
console.log('[service-worker] Setting up web request listener...');
setupWebRequestListener();
console.log('[service-worker] Web request listener setup complete');

// Initialize health monitoring
console.log('[service-worker] Initializing health monitoring...');
initializeHealthMonitoring();
recordDebugLog('info', 'Service worker started and health monitoring initialized');

// Initialize from storage on startup
chrome.runtime.onInstalled.addListener(() => {
  console.log('[service-worker] Extension installed, initializing tokens...');
  recordDebugLog('info', 'Extension installed/updated');
  
  initializeTokens()
    .then(tokens => {
      const message = `Tokens initialized successfully, count: ${tokens.length}`;
      console.log(`[service-worker] ${message}`);
      recordDebugLog('info', message);
    })
    .catch(error => {
      console.error('[service-worker] Error initializing tokens:', error);
      recordDebugLog('error', 'Error initializing tokens', { error: error.message });
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
