/**
 * Card API Processor
 * 
 * Handles processing of card details requests and data extraction.
 */

import { getCardDetails as apiGetCardDetails } from '../../shared/api-module.js';

// Initialize logger for Card Processor (service worker safe)
const logger = (() => {
  try {
    // Try to use the global logger factory if available
    if (typeof globalThis !== 'undefined' && globalThis.PowerCloudLoggerFactory) {
      return globalThis.PowerCloudLoggerFactory.createLogger('CardProcessor');
    } else if (typeof window !== 'undefined' && window.PowerCloudLoggerFactory) {
      return window.PowerCloudLoggerFactory.createLogger('CardProcessor');
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
    warn: (message, data) => console.warn(`[WARN][CardProcessor] ${message}`, data || ''),
    error: (message, data) => console.error(`[ERROR][CardProcessor] ${message}`, data || '')
  };
})();

/**
 * Process card details request and extract relevant information
 * @param {string} customer - The customer subdomain
 * @param {string} cardId - The card ID
 * @param {boolean} isDev - Whether to use the development environment
 * @param {string} requestId - Optional request ID for tracing
 * @param {function} sendResponse - The function to send the response back to the caller
 */
export function processCardDetailsRequest(customer, cardId, isDev, requestId, sendResponse) {
  // Get card details using our API module
  apiGetCardDetails(customer, cardId, isDev)
    .then(data => {
      // Check various possible paths for the Adyen payment instrument ID
      let paymentInstrumentId = null;
      if (data?.data?.attributes?.adyenPaymentInstrumentId) {
        paymentInstrumentId = data.data.attributes.adyenPaymentInstrumentId;
      } else if (data?.attributes?.adyenPaymentInstrumentId) {
        paymentInstrumentId = data.attributes.adyenPaymentInstrumentId;
      } else if (data?.adyenPaymentInstrumentId) {
        paymentInstrumentId = data.adyenPaymentInstrumentId;
      }
      
      // Check for vendor information in the response
      let vendor = null;
      if (data?.data?.attributes?.vendor) {
        vendor = data.data.attributes.vendor;
      } else if (data?.attributes?.vendor) {
        vendor = data.attributes.vendor;
      } else if (data?.vendor) {
        vendor = data.vendor;
      }
      
      // Convert vendor to lowercase if it exists for case-insensitive comparison
      if (vendor) {
        vendor = vendor.toLowerCase();
      }
      
      sendResponse({
        success: true,
        paymentInstrumentId: paymentInstrumentId,
        vendor: vendor,
        data: data.data || data,
        requestId
      });
    })
    .catch(error => {
      logger.error('Error fetching card details', { 
        requestId: requestId || 'unknown',
        error: error.message,
        cardId
      });
      sendResponse({
        success: false,
        error: error.message,
        requestId
      });
    });
}
