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
  console.log('About to call apiGetBalanceAccountDetails...');
  apiGetBalanceAccountDetails(customer, balanceAccountId, isDev)
    .then(data => {
      console.log(`%c Balance Account API response received! ${requestId || ''} `, 'background: #4CAF50; color: white; font-size: 14px; font-weight: bold;');
      console.log(`Response timestamp: ${new Date().toISOString()}`);
      
      // Short summary log first
      console.log('Balance Account response summary:', {
        success: true,
        hasData: !!data,
        hasAttributes: !!(data?.data?.attributes || data?.attributes)
      });
      
      // Detailed log after
      console.log('Full balance account API response:', JSON.stringify(data, null, 2));
      
      // Extract the Adyen balance account ID from attributes if available
      // Path: data->attributes->adyenBalanceAccountId
      let adyenBalanceAccountId = null;
      if (data?.data?.attributes?.adyenBalanceAccountId) {
        adyenBalanceAccountId = data.data.attributes.adyenBalanceAccountId;
        console.log('%c FOUND ADYEN BALANCE ACCOUNT ID (PRIMARY PATH): ', 'background: #009688; color: white; font-size: 14px; font-weight: bold;', adyenBalanceAccountId);
      } else if (data?.attributes?.adyenBalanceAccountId) {
        adyenBalanceAccountId = data.attributes.adyenBalanceAccountId;
        console.log('%c FOUND ADYEN BALANCE ACCOUNT ID (ALTERNATE PATH): ', 'background: #009688; color: white; font-size: 14px; font-weight: bold;', adyenBalanceAccountId);
      } else {
        console.log('%c NO ADYEN BALANCE ACCOUNT ID FOUND ', 'background: #F44336; color: white; font-size: 14px; font-weight: bold;');
        // Log possible paths in the response to help debugging
        console.log('Response structure:', {
          hasDataObj: !!data?.data,
          hasAttributes: !!(data?.data?.attributes || data?.attributes),
          dataAttributesKeys: data?.data?.attributes ? Object.keys(data.data.attributes) : [],
          rootAttributesKeys: data?.attributes ? Object.keys(data.attributes) : []
        });
      }
      
      console.log('Sending response back to content script...');
      sendResponse({
        success: true,
        balanceAccountId: balanceAccountId,
        adyenBalanceAccountId: adyenBalanceAccountId,
        data: data.data || data
      });
      console.log('Response sent!');
    })
    .catch(error => {
      console.error(`Error fetching balance account details (${requestId || ''}):`, error);
      console.log('Error stack:', error.stack);
      sendResponse({
        success: false,
        error: error.message
      });
    });
}
