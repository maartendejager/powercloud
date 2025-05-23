/**
 * Book API Processor
 * 
 * Handles processing of book details requests and data extraction.
 * Extracts balance account relationships directly from book resources.
 */

import { getBookDetails as apiGetBookDetails } from '../../shared/api.js';

/**
 * Process book details request and extract relevant information
 * @param {string} customer - The customer subdomain
 * @param {string} bookId - The book ID
 * @param {boolean} isDev - Whether to use the development environment
 * @param {string} requestId - Optional request ID for tracing
 * @param {function} sendResponse - The function to send the response back to the caller
 */
export function processBookDetailsRequest(customer, bookId, isDev, requestId, sendResponse) {
  // Get book details using our API module
  apiGetBookDetails(customer, bookId, isDev)
    .then(data => {
      // Extract book data from the response
      const bookData = data?.data?.attributes || data?.attributes || data;
      
      // Extract the necessary fields
      const bookType = bookData?.bookType;
      let adyenBalanceAccountId = bookData?.adyenBalanceAccountId;
      let administrationId = bookData?.administrationId;
      const balanceAccountReference = bookData?.balanceAccountReference;
      
      // Check for direct adyenBalanceAccount relationship
      // Path: data->relationships->adyenBalanceAccount->data->id
      if (!adyenBalanceAccountId && data?.data?.relationships?.adyenBalanceAccount?.data?.id) {
        adyenBalanceAccountId = data.data.relationships.adyenBalanceAccount.data.id;
      }
      // Also check alternative path
      else if (!adyenBalanceAccountId && data?.relationships?.adyenBalanceAccount?.data?.id) {
        adyenBalanceAccountId = data.relationships.adyenBalanceAccount.data.id;
      }
      
      // Extract administration ID from relationships if available
      // Path: data->relationships->administration->data->id
      if (!administrationId && data?.data?.relationships?.administration?.data?.id) {
        administrationId = data.data.relationships.administration.data.id;
      } 
      // Also check for other possible paths
      else if (!administrationId && data?.relationships?.administration?.data?.id) {
        administrationId = data.relationships.administration.data.id;
      }
      
      sendResponse({
        success: true,
        bookType: bookType,
        adyenBalanceAccountId: adyenBalanceAccountId,
        administrationId: administrationId,
        balanceAccountReference: balanceAccountReference,
        data: data.data || data,
        requestId
      });
    })
    .catch(error => {
      console.error(`Error fetching book details (${requestId || ''}):`, error);
      sendResponse({
        success: false,
        error: error.message,
        requestId
      });
    });
}
