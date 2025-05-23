/**
 * Book Entry API Processor
 * 
 * Handles processing of book entry details requests and data extraction.
 * Extracts adyenTransferId from book entry resources.
 */

import { getEntryDetails as apiGetEntryDetails } from '../../shared/api.js';

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
      console.log(`%c Entry API response received! ${requestId || ''} `, 'background: #4CAF50; color: white; font-size: 14px; font-weight: bold;');
      console.log('Entry API response:', JSON.stringify(data));
      
      // Send back the full response for extraction in the content script
      sendResponse({
        success: true,
        data: data,
        requestId
      });
    })
    .catch(error => {
      console.error(`Error fetching entry details (${requestId || ''}):`, error);
      sendResponse({
        success: false,
        error: error.message || 'Failed to fetch entry details',
        requestId
      });
    });
}
