/**
 * Balance Account API Processor
 * 
 * Handles processing of balance account details requests and data extraction.
 */

import { getBalanceAccountDetails as apiGetBalanceAccountDetails } from '../../shared/api-module.js';

// Initialize logger for Balance Account Processor (service worker safe)
const logger = (() => {
  try {
    // Try to use the global logger factory if available
    if (typeof globalThis !== 'undefined' && globalThis.PowerCloudLoggerFactory) {
      return globalThis.PowerCloudLoggerFactory.createLogger('BalanceAccountProcessor');
    } else if (typeof window !== 'undefined' && window.PowerCloudLoggerFactory) {
      return window.PowerCloudLoggerFactory.createLogger('BalanceAccountProcessor');
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
    warn: (message, data) => console.warn(`[WARN][BalanceAccountProcessor] ${message}`, data || ''),
    error: (message, data) => console.error(`[ERROR][BalanceAccountProcessor] ${message}`, data || '')
  };
})();

/**
 * Process balance account details request and extract relevant information
 * @param {string} customer - The customer subdomain
 * @param {string} balanceAccountId - The balance account ID
 * @param {boolean} isDev - Whether to use the development environment
 * @param {string} requestId - Optional request ID for tracking
 * @param {function} sendResponse - The function to send the response back to the caller
 */
export function processBalanceAccountDetailsRequest(customer, balanceAccountId, isDev, requestId, sendResponse) {
  // Get balance account details using our API module
  apiGetBalanceAccountDetails(customer, balanceAccountId, isDev)
    .then(data => {
      
      // Extract the Adyen balance account ID from attributes if available
      // Path: data->attributes->remoteBalanceAccountId
      let remoteBalanceAccountId = null;
      if (data?.data?.attributes?.remoteBalanceAccountId) {
        remoteBalanceAccountId = data.data.attributes.remoteBalanceAccountId;
      } else if (data?.attributes?.remoteBalanceAccountId) {
        remoteBalanceAccountId = data.attributes.remoteBalanceAccountId;
      }
      
      sendResponse({
        success: true,
        balanceAccountId: balanceAccountId,
        remoteBalanceAccountId: remoteBalanceAccountId,
        data: data.data || data
      });
    })
    .catch(error => {
      logger.error('Error fetching balance account details', { 
        requestId: requestId || 'unknown',
        error: error.message,
        balanceAccountId
      });
      sendResponse({
        success: false,
        error: error.message
      });
    });
}
