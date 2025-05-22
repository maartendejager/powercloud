/**
 * Administration API Processor
 * 
 * Handles processing of administration details requests and data extraction.
 */

import { getAdministrationDetails as apiGetAdministrationDetails } from '../../shared/api.js';

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
  console.log('About to call apiGetAdministrationDetails...');
  apiGetAdministrationDetails(customer, administrationId, isDev)
    .then(data => {
      console.log(`%c Administration API response received! ${requestId || ''} `, 'background: #4CAF50; color: white; font-size: 14px; font-weight: bold;');
      console.log(`Response timestamp: ${new Date().toISOString()}`);
      
      // Short summary log first
      console.log('Administration response summary:', {
        success: true,
        hasData: !!data,
        hasRelationships: !!(data?.data?.relationships || data?.relationships),
        hasBalanceAccount: !!(data?.data?.relationships?.balanceAccount || data?.relationships?.balanceAccount)
      });
      
      // Detailed log after
      console.log('Full administration API response:', JSON.stringify(data, null, 2));
      
      // Extract the balance account ID from relationships if available
      // Path: data->relationships->balanceAccount->data->id
      let balanceAccountId = null;
      if (data?.data?.relationships?.balanceAccount?.data?.id) {
        balanceAccountId = data.data.relationships.balanceAccount.data.id;
        console.log('%c FOUND BALANCE ACCOUNT ID (PRIMARY PATH): ', 'background: #009688; color: white; font-size: 14px; font-weight: bold;', balanceAccountId);
      } else if (data?.relationships?.balanceAccount?.data?.id) {
        balanceAccountId = data.relationships.balanceAccount.data.id;
        console.log('%c FOUND BALANCE ACCOUNT ID (ALTERNATE PATH): ', 'background: #009688; color: white; font-size: 14px; font-weight: bold;', balanceAccountId);
      } 
      // Check attributes for balance account ID as another fallback
      else if (data?.data?.attributes?.balanceAccountId) {
        balanceAccountId = data.data.attributes.balanceAccountId;
        console.log('%c FOUND BALANCE ACCOUNT ID (ATTRIBUTES): ', 'background: #009688; color: white; font-size: 14px; font-weight: bold;', balanceAccountId);
      } else if (data?.attributes?.balanceAccountId) {
        balanceAccountId = data.attributes.balanceAccountId;
        console.log('%c FOUND BALANCE ACCOUNT ID (ROOT ATTRIBUTES): ', 'background: #009688; color: white; font-size: 14px; font-weight: bold;', balanceAccountId);
      } else {
        console.log('%c NO BALANCE ACCOUNT ID FOUND ', 'background: #F44336; color: white; font-size: 14px; font-weight: bold;');
        // Log possible paths in the response to help debugging
        console.log('Response structure:', {
          hasDataObj: !!data?.data,
          hasAttributes: !!(data?.data?.attributes || data?.attributes),
          dataRelationshipsKeys: data?.data?.relationships ? Object.keys(data.data.relationships) : [],
          rootRelationshipsKeys: data?.relationships ? Object.keys(data.relationships) : []
        });
      }
      
      // Log full relationship data for debugging
      console.log('Full administration relationships data:',
                  JSON.stringify(data?.data?.relationships || data?.relationships || {}));
      
      console.log('Sending response back to content script...');
      sendResponse({
        success: true,
        administrationId: administrationId,
        balanceAccountId: balanceAccountId,
        data: data.data || data
      });
      console.log('Response sent!');
    })
    .catch(error => {
      console.error(`Error fetching administration details (${requestId || ''}):`, error);
      console.log('Error stack:', error.stack);
      sendResponse({
        success: false,
        error: error.message
      });
    });
}
