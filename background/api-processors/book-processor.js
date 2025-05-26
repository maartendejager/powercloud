/**
 * Book API Processor
 * 
 * Handles processing of book details requests and data extraction.
 * Extracts balance account relationships and fetches Adyen balance account ID from balance account details.
 */

import { getBookDetails as apiGetBookDetails, getBalanceAccountDetails as apiGetBalanceAccountDetails } from '../../shared/api-module.js';

// Initialize logger for Book Processor (service worker safe)
const logger = (() => {
  try {
    // Try to use the global logger factory if available
    if (typeof globalThis !== 'undefined' && globalThis.PowerCloudLoggerFactory) {
      return globalThis.PowerCloudLoggerFactory.createLogger('BookProcessor');
    } else if (typeof window !== 'undefined' && window.PowerCloudLoggerFactory) {
      return window.PowerCloudLoggerFactory.createLogger('BookProcessor');
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
    warn: (message, data) => console.warn(`[WARN][BookProcessor] ${message}`, data || ''),
    error: (message, data) => console.error(`[ERROR][BookProcessor] ${message}`, data || '')
  };
})();

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
    
    logger.debug('Raw API response structure', {
      hasData: !!data?.data,
      hasAttributes: !!data?.data?.attributes,
      hasRelationships: !!data?.data?.relationships,
      relationshipKeys: data?.data?.relationships ? Object.keys(data.data.relationships) : [],
      alternativeHasRelationships: !!data?.relationships,
      alternativeRelationshipKeys: data?.relationships ? Object.keys(data.relationships) : [],
      requestId
    });
    
    // Extract book data from the response
    const bookData = data?.data?.attributes || data?.attributes || data;
    
    // Extract the necessary fields
    const bookType = bookData?.bookType;
    let balanceAccountId = null; // Internal balance account ID
    let remoteBalanceAccountId = bookData?.remoteBalanceAccountId; // Try direct first
    let administrationId = bookData?.administrationId;
    const balanceAccountReference = bookData?.balanceAccountReference;
    
    // Extract balance account ID from relationships
    // Path: data->relationships->balanceAccount->data->id
    if (!balanceAccountId && data?.data?.relationships?.balanceAccount?.data?.id) {
      balanceAccountId = data.data.relationships.balanceAccount.data.id;
      logger.info('Found balance account ID via balanceAccount relationship', { 
        balanceAccountId, 
        requestId 
      });
    }
    // Also check alternative path
    else if (!balanceAccountId && data?.relationships?.balanceAccount?.data?.id) {
      balanceAccountId = data.relationships.balanceAccount.data.id;
      logger.info('Found balance account ID via alternative balanceAccount relationship', { 
        balanceAccountId, 
        requestId 
      });
    }
    
    // ALSO check adyenBalanceAccount relationship for the internal balance account ID
    // This seems to be where the internal balance account ID is stored in some cases
    if (!balanceAccountId && data?.data?.relationships?.adyenBalanceAccount?.data?.id) {
      const foundId = data.data.relationships.adyenBalanceAccount.data.id;
      logger.info('Found ID via adyenBalanceAccount relationship', { 
        foundId, 
        requestId 
      });
      // This should be the internal balance account ID (like "1"), not the actual Adyen ID
      balanceAccountId = foundId;
      logger.info('Using as internal balance account ID', { 
        balanceAccountId, 
        requestId 
      });
    }
    // Also check alternative path for adyenBalanceAccount
    else if (!balanceAccountId && data?.relationships?.adyenBalanceAccount?.data?.id) {
      const foundId = data.relationships.adyenBalanceAccount.data.id;
      logger.info('Found ID via alternative adyenBalanceAccount relationship', { 
        foundId, 
        requestId 
      });
      // This should be the internal balance account ID (like "1"), not the actual Adyen ID
      balanceAccountId = foundId;
      logger.info('Using as internal balance account ID', { 
        balanceAccountId, 
        requestId 
      });
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
    
    logger.debug('After extraction', {
      balanceAccountId: balanceAccountId,
      remoteBalanceAccountId: remoteBalanceAccountId,
      administrationId: administrationId,
      balanceAccountReference: balanceAccountReference,
      bookType: bookType,
      requestId
    });
    
    // If we have a balance account ID but no Adyen balance account ID, 
    // fetch balance account details to get the Adyen balance account ID
    if (balanceAccountId && !remoteBalanceAccountId) {
      logger.info('Fetching balance account details', { 
        balanceAccountId, 
        requestId 
      });
      
      try {
        const balanceAccountData = await apiGetBalanceAccountDetails(customer, balanceAccountId, isDev);
        
        // Extract the Adyen balance account ID from balance account attributes
        if (balanceAccountData?.data?.attributes?.remoteBalanceAccountId) {
          remoteBalanceAccountId = balanceAccountData.data.attributes.remoteBalanceAccountId;
          logger.info('Found Adyen balance account ID', { 
            remoteBalanceAccountId, 
            requestId 
          });
        } else if (balanceAccountData?.attributes?.remoteBalanceAccountId) {
          remoteBalanceAccountId = balanceAccountData.attributes.remoteBalanceAccountId;
          logger.info('Found Adyen balance account ID', { 
            remoteBalanceAccountId, 
            requestId 
          });
        } else {
          logger.warn('No Adyen balance account ID found in balance account details', { 
            requestId 
          });
        }
      } catch (error) {
        logger.warn('Failed to fetch balance account details', { 
          balanceAccountId, 
          error: error.message, 
          requestId 
        });
        // Continue without remoteBalanceAccountId - the feature will handle this gracefully
      }
    }
    
    sendResponse({
      success: true,
      bookType: bookType,
      balanceAccountId: balanceAccountId, // Internal balance account ID 
      remoteBalanceAccountId: remoteBalanceAccountId, // Actual Adyen balance account ID
      administrationId: administrationId,
      balanceAccountReference: balanceAccountReference,
      data: data.data || data,
      requestId
    });
    
  } catch (error) {
    logger.error('Error fetching book details', { 
      error: error.message, 
      stack: error.stack, 
      requestId 
    });
    sendResponse({
      success: false,
      error: error.message,
      requestId
    });
  }
}
