/**
 * Balance Account API Processor
 * 
 * Handles processing of balance account details requests and data extraction.
 */

import { getBalanceAccountDetails as apiGetBalanceAccountDetails } from '../../shared/api.js';

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
      // Path: data->attributes->adyenBalanceAccountId
      let adyenBalanceAccountId = null;
      if (data?.data?.attributes?.adyenBalanceAccountId) {
        adyenBalanceAccountId = data.data.attributes.adyenBalanceAccountId;
      } else if (data?.attributes?.adyenBalanceAccountId) {
        adyenBalanceAccountId = data.attributes.adyenBalanceAccountId;
      }
      
      sendResponse({
        success: true,
        balanceAccountId: balanceAccountId,
        adyenBalanceAccountId: adyenBalanceAccountId,
        data: data.data || data
      });
    })
    .catch(error => {
      console.error(`Error fetching balance account details (${requestId || ''}):`, error);
      sendResponse({
        success: false,
        error: error.message
      });
    });
}
