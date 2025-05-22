/**
 * Book API Processor
 * 
 * Handles processing of book details requests and data extraction.
 */

import { getBookDetails as apiGetBookDetails } from '../../shared/api.js';

/**
 * Process book details request and extract relevant information
 * @param {string} customer - The customer subdomain
 * @param {string} bookId - The book ID
 * @param {boolean} isDev - Whether to use the development environment
 * @param {function} sendResponse - The function to send the response back to the caller
 */
export function processBookDetailsRequest(customer, bookId, isDev, sendResponse) {
  // Get book details using our API module
  apiGetBookDetails(customer, bookId, isDev)
    .then(data => {
      console.log('Book API response:', JSON.stringify(data));
      
      // Extract book data from the response
      const bookData = data?.data?.attributes || data?.attributes || data;
      
      // Extract the necessary fields
      const bookType = bookData?.bookType;
      const adyenBalanceAccountId = bookData?.adyenBalanceAccountId;
      let administrationId = bookData?.administrationId;
      const balanceAccountReference = bookData?.balanceAccountReference;
      
      // Extract administration ID from relationships if available
      // Path: data->relationships->administration->data->id
      if (!administrationId && data?.data?.relationships?.administration?.data?.id) {
        administrationId = data.data.relationships.administration.data.id;
        console.log('Found administration ID in relationships:', administrationId);
      } 
      // Also check for other possible paths
      else if (!administrationId && data?.relationships?.administration?.data?.id) {
        administrationId = data.relationships.administration.data.id;
        console.log('Found administration ID in alternative relationships path:', administrationId);
      }
      
      // Log full data to help debugging
      if (bookData?.bookType === 'monetary_account_book') {
        console.log('Monetary account book found. Full relationships data:', 
                    JSON.stringify(data?.data?.relationships || data?.relationships || {}));
      }
      
      sendResponse({
        success: true,
        bookType: bookType,
        adyenBalanceAccountId: adyenBalanceAccountId,
        administrationId: administrationId,
        balanceAccountReference: balanceAccountReference,
        data: data.data || data
      });
    })
    .catch(error => {
      console.error('Error fetching book details:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    });
}
