/**
 * Entity Message Handlers
 * 
 * Handlers for entity-related messages received by the service worker.
 */

import { 
  processCardDetailsRequest 
} from '../api-processors/card-processor.js';
import { 
  processBookDetailsRequest 
} from '../api-processors/book-processor.js';
import { 
  processAdministrationDetailsRequest 
} from '../api-processors/administration-processor.js';
import { 
  processBalanceAccountDetailsRequest 
} from '../api-processors/balance-account-processor.js';
import { 
  processEntryDetailsRequest 
} from '../api-processors/entry-processor.js';
import { 
  determineDevelopmentStatus, 
  determineBaseDomain,
  validateRequiredParams,
  generateRequestId
} from '../api-processors/utils.js';

/**
 * Handle fetchCardDetails message
 * @param {Object} message - The message with customer and cardId
 * @param {Object} sender - The sender information
 * @param {Function} sendResponse - Function to send response
 * @returns {boolean} - Whether to keep the message channel open
 */
export function handleFetchCardDetails(message, sender, sendResponse) {
  const { customer, cardId } = message;
  // Generate a request ID for tracing
  const requestId = message.requestId || generateRequestId('card');
  
  // Validate required parameters
  const validation = validateRequiredParams({ customer, cardId }, ['customer', 'cardId']);
  if (!validation.isValid) {
    sendResponse({
      success: false,
      error: validation.errorMessage,
      requestId
    });
    return true;
  }
  
  // Determine environment and process the request
  Promise.all([determineDevelopmentStatus(sender), determineBaseDomain(sender)])
    .then(([isDev, domain]) => {
      processCardDetailsRequest(customer, cardId, isDev, domain, requestId, sendResponse);
    })
    .catch(error => {
      console.error(`Error determining development status (${requestId}):`, error);
      // Default to production if there's an error
      processCardDetailsRequest(customer, cardId, false, undefined, requestId, sendResponse);
    });
  
  return true; // Keep message channel open for async response
}

/**
 * Handle fetchBookDetails message
 * @param {Object} message - The message with customer and bookId
 * @param {Object} sender - The sender information
 * @param {Function} sendResponse - Function to send response
 * @returns {boolean} - Whether to keep the message channel open
 */
export function handleFetchBookDetails(message, sender, sendResponse) {
  const { customer, bookId } = message;
  // Generate a request ID for tracing
  const requestId = message.requestId || generateRequestId('book');
  
  // Validate required parameters
  const validation = validateRequiredParams({ customer, bookId }, ['customer', 'bookId']);
  if (!validation.isValid) {
    sendResponse({
      success: false,
      error: validation.errorMessage,
      requestId
    });
    return true;
  }
  
  // Determine environment and process the request
  Promise.all([determineDevelopmentStatus(sender), determineBaseDomain(sender)])
    .then(async ([isDev, domain]) => {
      await processBookDetailsRequest(customer, bookId, isDev, domain, requestId, sendResponse);
    })
    .catch(async (error) => {
      console.error(`Error determining development status (${requestId}):`, error);
      // Default to production if there's an error
      await processBookDetailsRequest(customer, bookId, false, undefined, requestId, sendResponse);
    });
  
  return true; // Keep message channel open for async response
}

/**
 * Handle fetchAdministrationDetails message
 * @param {Object} message - The message with customer and administrationId
 * @param {Object} sender - The sender information
 * @param {Function} sendResponse - Function to send response
 * @returns {boolean} - Whether to keep the message channel open
 */
export function handleFetchAdministrationDetails(message, sender, sendResponse) {
  const { customer, administrationId } = message;
  // Generate or use existing request ID for tracing
  const requestId = message.requestId || generateRequestId('admin');
  
  // Validate required parameters
  const validation = validateRequiredParams({ customer, administrationId }, ['customer', 'administrationId']);
  if (!validation.isValid) {
    sendResponse({
      success: false,
      error: validation.errorMessage,
      requestId
    });
    return true;
  }
  
  // Determine environment and process the request
  Promise.all([determineDevelopmentStatus(sender), determineBaseDomain(sender)])
    .then(([isDev, domain]) => {
      processAdministrationDetailsRequest(customer, administrationId, isDev, domain, requestId, sendResponse);
    })
    .catch(error => {
      console.error(`Error determining development status (${requestId}):`, error);
      // Default to production if there's an error
      processAdministrationDetailsRequest(customer, administrationId, false, undefined, requestId, sendResponse);
    });
  
  return true; // Keep message channel open for async response
}

/**
 * Handle fetchBalanceAccountDetails message
 * @param {Object} message - The message with customer and balanceAccountId
 * @param {Object} sender - The sender information
 * @param {Function} sendResponse - Function to send response
 * @returns {boolean} - Whether to keep the message channel open
 */
export function handleFetchBalanceAccountDetails(message, sender, sendResponse) {
  const { customer, balanceAccountId } = message;
  // Generate or use existing request ID for tracing
  const requestId = message.requestId || generateRequestId('balance');
  
  // Validate required parameters
  const validation = validateRequiredParams({ customer, balanceAccountId }, ['customer', 'balanceAccountId']);
  if (!validation.isValid) {
    sendResponse({
      success: false,
      error: validation.errorMessage,
      requestId
    });
    return true;
  }
  
  // Determine environment and process the request
  Promise.all([determineDevelopmentStatus(sender), determineBaseDomain(sender)])
    .then(([isDev, domain]) => {
      processBalanceAccountDetailsRequest(customer, balanceAccountId, isDev, domain, requestId, sendResponse);
    })
    .catch(error => {
      console.error(`Error determining development status (${requestId}):`, error);
      // Default to production if there's an error
      processBalanceAccountDetailsRequest(customer, balanceAccountId, false, undefined, requestId, sendResponse);
    });
  
  return true; // Keep message channel open for async response
}

/**
 * Handle fetchEntryDetails message
 * @param {Object} message - The message with customer and entryId
 * @param {Object} sender - The sender information
 * @param {Function} sendResponse - Function to send response
 * @returns {boolean} - Whether to keep the message channel open
 */
export function handleFetchEntryDetails(message, sender, sendResponse) {
  const { customer, entryId } = message;
  // Generate a request ID for tracing
  const requestId = message.requestId || generateRequestId('entry');
  
  // Validate required parameters
  const validation = validateRequiredParams({ customer, entryId }, ['customer', 'entryId']);
  if (!validation.isValid) {
    sendResponse({
      success: false,
      error: validation.errorMessage,
      requestId
    });
    return true;
  }
  
  // Determine environment and process the request
  Promise.all([determineDevelopmentStatus(sender), determineBaseDomain(sender)])
    .then(([isDev, domain]) => {
      processEntryDetailsRequest(customer, entryId, isDev, domain, requestId, sendResponse);
    })
    .catch(error => {
      console.error(`Error determining development status (${requestId}):`, error);
      // Default to production if there's an error
      processEntryDetailsRequest(customer, entryId, false, undefined, requestId, sendResponse);
    });
  
  return true; // Keep message channel open for async response
}
