/**
 * Book API Processor
 * 
 * Handles processing of book details requests and data extraction.
 * Extracts balance account relationships and fetches Adyen balance account ID from balance account details.
 */

import { getBookDetails as apiGetBookDetails, getBalanceAccountDetails as apiGetBalanceAccountDetails } from '../../shared/api-module.js';

/**
 * Process book details request and extract relevant information
 * @param {string} customer - The customer subdomain
 * @param {string} bookId - The book ID
 * @param {boolean} isDev - Whether to use the development environment
 * @param {string} requestId - Optional request ID for tracing
 * @param {function} sendResponse - The function to send the response back to the caller
 */
export async function processBookDetailsRequest(customer, bookId, isDev, requestId, sendResponse) {
  try {
    // Get book details using our API module
    const data = await apiGetBookDetails(customer, bookId, isDev);
    
    console.log(`[book-processor] Raw API response structure (${requestId || ''}):`, {
      hasData: !!data?.data,
      hasAttributes: !!data?.data?.attributes,
      hasRelationships: !!data?.data?.relationships,
      relationshipKeys: data?.data?.relationships ? Object.keys(data.data.relationships) : [],
      alternativeHasRelationships: !!data?.relationships,
      alternativeRelationshipKeys: data?.relationships ? Object.keys(data.relationships) : []
    });
    
    // Extract book data from the response
    const bookData = data?.data?.attributes || data?.attributes || data;
    
    // Extract the necessary fields
    const bookType = bookData?.bookType;
    let balanceAccountId = null; // Internal balance account ID
    let adyenBalanceAccountId = bookData?.adyenBalanceAccountId; // Try direct first
    let administrationId = bookData?.administrationId;
    const balanceAccountReference = bookData?.balanceAccountReference;
    
    // Extract balance account ID from relationships
    // Path: data->relationships->balanceAccount->data->id
    if (!balanceAccountId && data?.data?.relationships?.balanceAccount?.data?.id) {
      balanceAccountId = data.data.relationships.balanceAccount.data.id;
      console.log(`[book-processor] Found balance account ID via balanceAccount relationship: ${balanceAccountId} (${requestId || ''})`);
    }
    // Also check alternative path
    else if (!balanceAccountId && data?.relationships?.balanceAccount?.data?.id) {
      balanceAccountId = data.relationships.balanceAccount.data.id;
      console.log(`[book-processor] Found balance account ID via alternative balanceAccount relationship: ${balanceAccountId} (${requestId || ''})`);
    }
    
    // ALSO check adyenBalanceAccount relationship for the internal balance account ID
    // This seems to be where the internal balance account ID is stored in some cases
    if (!balanceAccountId && data?.data?.relationships?.adyenBalanceAccount?.data?.id) {
      const foundId = data.data.relationships.adyenBalanceAccount.data.id;
      console.log(`[book-processor] Found ID via adyenBalanceAccount relationship: ${foundId} (${requestId || ''})`);
      // This should be the internal balance account ID (like "1"), not the actual Adyen ID
      balanceAccountId = foundId;
      console.log(`[book-processor] Using as internal balance account ID: ${balanceAccountId} (${requestId || ''})`);
    }
    // Also check alternative path for adyenBalanceAccount
    else if (!balanceAccountId && data?.relationships?.adyenBalanceAccount?.data?.id) {
      const foundId = data.relationships.adyenBalanceAccount.data.id;
      console.log(`[book-processor] Found ID via alternative adyenBalanceAccount relationship: ${foundId} (${requestId || ''})`);
      // This should be the internal balance account ID (like "1"), not the actual Adyen ID
      balanceAccountId = foundId;
      console.log(`[book-processor] Using as internal balance account ID: ${balanceAccountId} (${requestId || ''})`);
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
    
    console.log(`[book-processor] After extraction (${requestId || ''}):`, {
      balanceAccountId: balanceAccountId,
      adyenBalanceAccountId: adyenBalanceAccountId,
      administrationId: administrationId,
      balanceAccountReference: balanceAccountReference,
      bookType: bookType
    });
    
    // If we have a balance account ID but no Adyen balance account ID, 
    // fetch balance account details to get the Adyen balance account ID
    if (balanceAccountId && !adyenBalanceAccountId) {
      console.log(`[book-processor] Fetching balance account details for ID: ${balanceAccountId} (${requestId || ''})`);
      
      try {
        const balanceAccountData = await apiGetBalanceAccountDetails(customer, balanceAccountId, isDev);
        
        // Extract the Adyen balance account ID from balance account attributes
        if (balanceAccountData?.data?.attributes?.adyenBalanceAccountId) {
          adyenBalanceAccountId = balanceAccountData.data.attributes.adyenBalanceAccountId;
          console.log(`[book-processor] Found Adyen balance account ID: ${adyenBalanceAccountId} (${requestId || ''})`);
        } else if (balanceAccountData?.attributes?.adyenBalanceAccountId) {
          adyenBalanceAccountId = balanceAccountData.attributes.adyenBalanceAccountId;
          console.log(`[book-processor] Found Adyen balance account ID: ${adyenBalanceAccountId} (${requestId || ''})`);
        } else {
          console.log(`[book-processor] No Adyen balance account ID found in balance account details (${requestId || ''})`);
        }
      } catch (error) {
        console.warn(`[book-processor] Failed to fetch balance account details for ID ${balanceAccountId} (${requestId || ''}):`, error.message);
        // Continue without adyenBalanceAccountId - the feature will handle this gracefully
      }
    }
    
    sendResponse({
      success: true,
      bookType: bookType,
      balanceAccountId: balanceAccountId, // Internal balance account ID 
      adyenBalanceAccountId: adyenBalanceAccountId, // Actual Adyen balance account ID
      administrationId: administrationId,
      balanceAccountReference: balanceAccountReference,
      data: data.data || data,
      requestId
    });
    
  } catch (error) {
    console.error(`Error fetching book details (${requestId || ''}):`, error);
    sendResponse({
      success: false,
      error: error.message,
      requestId
    });
  }
}
