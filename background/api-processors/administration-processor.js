/**
 * Administration API Processor
 * 
 * Handles processing of administration details requests and data extraction.
 */

import { getAdministrationDetails as apiGetAdministrationDetails } from '../../shared/api-module.js';

// Initialize logger for Administration Processor (service worker safe)
const logger = (() => {
  try {
    // Try to use the global logger factory if available
    if (typeof globalThis !== 'undefined' && globalThis.PowerCloudLoggerFactory) {
      return globalThis.PowerCloudLoggerFactory.createLogger('AdministrationProcessor');
    } else if (typeof window !== 'undefined' && window.PowerCloudLoggerFactory) {
      return window.PowerCloudLoggerFactory.createLogger('AdministrationProcessor');
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
    warn: (message, data) => console.warn(`[WARN][AdministrationProcessor] ${message}`, data || ''),
    error: (message, data) => console.error(`[ERROR][AdministrationProcessor] ${message}`, data || '')
  };
})();

/**
 * Process administration details request and extract relevant information
 * @param {string} customer - The customer subdomain
 * @param {string} administrationId - The administration ID
 * @param {boolean} isDev - Whether to use the development environment
 * @param {string} requestId - Optional request ID for tracking
 * @param {function} sendResponse - The function to send the response back to the caller
 */
export function processAdministrationDetailsRequest(customer, administrationId, isDev, requestId, sendResponse) {
  // Get administration details using our API module
  apiGetAdministrationDetails(customer, administrationId, isDev)
    .then(data => {
      
      // Extract the balance account ID from relationships if available
      // Path: data->relationships->balanceAccount->data->id
      let balanceAccountId = null;
      if (data?.data?.relationships?.balanceAccount?.data?.id) {
        balanceAccountId = data.data.relationships.balanceAccount.data.id;
      } else if (data?.relationships?.balanceAccount?.data?.id) {
        balanceAccountId = data.relationships.balanceAccount.data.id;
      } 
      // Check attributes for balance account ID as another fallback
      else if (data?.data?.attributes?.balanceAccountId) {
        balanceAccountId = data.data.attributes.balanceAccountId;
      } else if (data?.attributes?.balanceAccountId) {
        balanceAccountId = data.attributes.balanceAccountId;
      }
      
      sendResponse({
        success: true,
        administrationId: administrationId,
        balanceAccountId: balanceAccountId,
        data: data.data || data
      });
    })
    .catch(error => {
      logger.error('Error fetching administration details', { 
        error: error.message, 
        stack: error.stack, 
        requestId 
      });
      sendResponse({
        success: false,
        error: error.message
      });
    });
}
