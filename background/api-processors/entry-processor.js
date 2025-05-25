/**
 * Book Entry API Processor
 * 
 * Handles processing of book entry details requests and data extraction.
 * Extracts adyenTransferId from book entry resources.
 */

import { getEntryDetails as apiGetEntryDetails } from '../../shared/api-module.js';

// Initialize logger for Entry Processor (service worker safe)
const logger = (() => {
  try {
    // Try to use the global logger factory if available
    if (typeof globalThis !== 'undefined' && globalThis.PowerCloudLoggerFactory) {
      return globalThis.PowerCloudLoggerFactory.createLogger('EntryProcessor');
    } else if (typeof window !== 'undefined' && window.PowerCloudLoggerFactory) {
      return window.PowerCloudLoggerFactory.createLogger('EntryProcessor');
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
    warn: (message, data) => console.warn(`[WARN][EntryProcessor] ${message}`, data || ''),
    error: (message, data) => console.error(`[ERROR][EntryProcessor] ${message}`, data || '')
  };
})();

/**
 * Process entry details request and extract relevant information
 * @param {string} customer - The customer subdomain
 * @param {string} entryId - The entry ID
 * @param {boolean} isDev - Whether to use the development environment
 * @param {string} requestId - Optional request ID for tracing
 * @param {function} sendResponse - The function to send the response back to the caller
 */
export function processEntryDetailsRequest(customer, entryId, isDev, requestId, sendResponse) {
  // Get entry details using our API module
  apiGetEntryDetails(customer, entryId, isDev)
    .then(data => {
      // Send back the full response for extraction in the content script
      sendResponse({
        success: true,
        data: data,
        requestId
      });
    })
    .catch(error => {
      logger.error('Error fetching entry details', { 
        requestId: requestId || 'unknown',
        error: error.message,
        entryId
      });
      sendResponse({
        success: false,
        error: error.message || 'Failed to fetch entry details',
        requestId
      });
    });
}
