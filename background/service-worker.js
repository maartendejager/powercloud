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
  handleFetchEntryDetails,
  // Enhanced health monitoring handlers (Phase 2.1)
  handleGetExtensionHealth,
  handleGetFeatureStatus,
  handleGetPerformanceMetrics,
  handleGetDebugLogs,
  handleGetErrorReports,
  handleClearDebugData,
  handleExportHealthReport,
  handleUpdateFeatureHealth,
  handleRecordPerformanceMetric,
  handleGetFilteredLogs,
  handleGetFeatureChannels,
  handleGetPerformanceSummary,
  handleUpdatePerformanceThresholds,
  handleRecordStructuredLog,
  handleRecordFeatureEvent,
  initializeHealthMonitoring,
  recordDebugLog,
  // Step 3.2 authentication handlers
  handleGetAuthStatus,
  handleReportAuthError
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
  "recordPerformanceMetric": handleRecordPerformanceMetric,
  // Phase 2.1 enhanced health API
  "getFilteredLogs": handleGetFilteredLogs,
  "getFeatureChannels": handleGetFeatureChannels,
  "getPerformanceSummary": handleGetPerformanceSummary,
  "updatePerformanceThresholds": handleUpdatePerformanceThresholds,
  "recordStructuredLog": handleRecordStructuredLog,
  "recordFeatureEvent": handleRecordFeatureEvent,
  // Step 3.2 authentication handlers
  "getAuthStatus": handleGetAuthStatus,
  "reportAuthError": handleReportAuthError,
  // Tab management
  "openTab": handleOpenTab
};

/**
 * Handle opening a new tab
 * @param {Object} message - The message object
 * @param {Object} sender - The sender information
 * @param {Function} sendResponse - Function to send response back
 * @returns {boolean} - Whether to keep the message channel open
 */
function handleOpenTab(message, sender, sendResponse) {
  console.log('[service-worker] Opening tab:', message.url);
  
  if (!message.url) {
    console.error('[service-worker] No URL provided for openTab action');
    sendResponse({ success: false, error: 'No URL provided' });
    return false;
  }
  
  try {
    chrome.tabs.create({ url: message.url }, (tab) => {
      if (chrome.runtime.lastError) {
        console.error('[service-worker] Error creating tab:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('[service-worker] Tab created successfully:', tab.id);
        sendResponse({ success: true, tabId: tab.id });
      }
    });
    
    return true; // Keep message channel open for async response
  } catch (error) {
    console.error('[service-worker] Exception in handleOpenTab:', error);
    sendResponse({ success: false, error: error.message });
    return false;
  }
}

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
