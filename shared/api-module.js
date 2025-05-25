/**
 * ES6 Module wrapper for api.js
 * This module provides ES6 exports by duplicating the core functionality
 * Content scripts use the window exports from api.js
 * Background scripts and popup use this ES6 module
 */

// Static imports for service worker compatibility
import { getToken, extractClientEnvironment, isDevelopmentRoute } from './auth-module.js';

// Initialize logger for API module (fallback for service worker context)
const logger = (() => {
  try {
    // Try to use the global logger factory if available
    if (typeof globalThis !== 'undefined' && globalThis.PowerCloudLoggerFactory) {
      return globalThis.PowerCloudLoggerFactory.createLogger('API-Module');
    } else if (typeof window !== 'undefined' && window.PowerCloudLoggerFactory) {
      return window.PowerCloudLoggerFactory.createLogger('API-Module');
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
    warn: (message, data) => console.warn(`[WARN][API-Module] ${message}`, data || ''),
    error: (message, data) => console.error(`[ERROR][API-Module] ${message}`, data || '')
  };
})();

/**
 * Makes an authenticated request to an API endpoint
 * @param {string} endpoint - The API endpoint URL (complete URL)
 * @param {string} method - The HTTP method (GET, POST, PUT, DELETE, etc.)
 * @param {Object} [body] - Optional request body for POST/PUT requests
 * @param {Object} [additionalHeaders] - Optional additional headers to include
 * @returns {Promise<Object>} The parsed response data
 * @throws {Error} If the request fails or returns an error status
 */
async function makeAuthenticatedRequest(endpoint, method = 'GET', body = null, additionalHeaders = {}) {
  try {
    // Extract client environment and isDev from the endpoint URL
    const clientEnvironment = endpoint.includes('spend.cloud') ? extractClientEnvironment(endpoint) : undefined;
    const isDev = endpoint.includes('spend.cloud') ? isDevelopmentRoute(endpoint) : undefined;
    
    // Get the current authentication token appropriate for this request
    const token = await getToken(clientEnvironment, isDev);
    
    // Prepare headers
    const headers = {
      'Accept': 'application/json',
      'X-Authorization-Token': token,
      ...additionalHeaders
    };
    
    // Add Content-Type for requests with body
    if (body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    
    // Prepare request options
    const options = {
      method,
      headers,
      credentials: 'same-origin'
    };
    
    // Add body if present
    if (body) {
      options.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
    
    logger.debug(`Making ${method} request to: ${endpoint}`);
    const response = await fetch(endpoint, options);
    
    // Check if response is ok
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Parse JSON response
    const data = await response.json();
    return data;
  } catch (error) {
    logger.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Makes a GET request to an API endpoint
 * @param {string} endpoint - The API endpoint URL
 * @param {Object} [additionalHeaders] - Optional additional headers to include
 * @returns {Promise<Object>} The parsed response data
 */
async function get(endpoint, additionalHeaders = {}) {
  return makeAuthenticatedRequest(endpoint, 'GET', null, additionalHeaders);
}

/**
 * Makes a POST request to an API endpoint
 * @param {string} endpoint - The API endpoint URL
 * @param {Object} body - The request body
 * @param {Object} [additionalHeaders] - Optional additional headers to include
 * @returns {Promise<Object>} The parsed response data
 */
async function post(endpoint, body, additionalHeaders = {}) {
  return makeAuthenticatedRequest(endpoint, 'POST', body, additionalHeaders);
}

/**
 * Makes a PUT request to an API endpoint
 * @param {string} endpoint - The API endpoint URL
 * @param {Object} body - The request body
 * @param {Object} [additionalHeaders] - Optional additional headers to include
 * @returns {Promise<Object>} The parsed response data
 */
async function put(endpoint, body, additionalHeaders = {}) {
  return makeAuthenticatedRequest(endpoint, 'PUT', body, additionalHeaders);
}

/**
 * Makes a DELETE request to an API endpoint
 * @param {string} endpoint - The API endpoint URL
 * @param {Object} [additionalHeaders] - Optional additional headers to include
 * @returns {Promise<Object>} The parsed response data
 */
async function del(endpoint, additionalHeaders = {}) {
  return makeAuthenticatedRequest(endpoint, 'DELETE', null, additionalHeaders);
}

/**
 * Utility function to build a complete URL for spend.cloud API
 * @param {string} customer - The customer subdomain
 * @param {string} path - The API path
 * @param {boolean} [isDev=false] - Whether to use the development environment
 * @returns {string} The complete API URL
 */
function buildApiUrl(customer, path, isDev = false) {
  return `https://${customer}${isDev ? '.dev' : ''}.spend.cloud/api${path.startsWith('/') ? path : '/' + path}`;
}

/**
 * Fetches card details from the API
 * @param {string} customer - The customer subdomain
 * @param {string} cardId - The card ID to fetch
 * @param {boolean} [isDev=false] - Whether to use the development environment
 * @returns {Promise<Object>} The card details
 */
async function getCardDetails(customer, cardId, isDev = false) {
  if (!customer || !cardId) {
    const errorMsg = 'Invalid parameters for getCardDetails';
    logger.error(errorMsg, { customer, cardId });
    throw new Error(`Invalid parameters: customer=${customer}, cardId=${cardId}`);
  }
  
  const url = buildApiUrl(customer, `/cards/${cardId}`, isDev);
  
  try {
    const response = await get(url);
    return response;
  } catch (error) {
    logger.error(`Card API request failed: ${error.message}`);
    throw error;
  }
}

/**
 * Fetches book details from the API
 * @param {string} customer - The customer subdomain
 * @param {string} bookId - The book ID to fetch
 * @param {boolean} [isDev=false] - Whether to use the development environment
 * @returns {Promise<Object>} The book details
 */
async function getBookDetails(customer, bookId, isDev = false) {
  if (!customer || !bookId) {
    const errorMsg = 'Invalid parameters for getBookDetails';
    logger.error(errorMsg, { customer, bookId });
    throw new Error(`Invalid parameters: customer=${customer}, bookId=${bookId}`);
  }
  
  const url = buildApiUrl(customer, `/books/${bookId}`, isDev);
  
  try {
    const response = await get(url);
    return response;
  } catch (error) {
    logger.error(`Book API request failed: ${error.message}`);
    throw error;
  }
}

/**
 * Fetches administration details from the API
 * @param {string} customer - The customer subdomain
 * @param {string} administrationId - The administration ID to fetch
 * @param {boolean} [isDev=false] - Whether to use the development environment
 * @returns {Promise<Object>} The administration details
 */
async function getAdministrationDetails(customer, administrationId, isDev = false) {
  if (!customer || !administrationId) {
    const errorMsg = 'Invalid parameters for getAdministrationDetails';
    logger.error(errorMsg, { customer, administrationId });
    throw new Error(`Invalid parameters: customer=${customer}, administrationId=${administrationId}`);
  }
  
  const url = buildApiUrl(customer, `/administrations/${administrationId}`, isDev);
  
  try {
    const response = await get(url);
    return response;
  } catch (error) {
    logger.error(`Administration API request failed: ${error.message}`);
    throw error;
  }
}

/**
 * Fetches balance account details from the API
 * @param {string} customer - The customer subdomain
 * @param {string} balanceAccountId - The balance account ID to fetch
 * @param {boolean} [isDev=false] - Whether to use the development environment
 * @returns {Promise<Object>} The balance account details
 */
async function getBalanceAccountDetails(customer, balanceAccountId, isDev = false) {
  if (!customer || !balanceAccountId) {
    const errorMsg = 'Invalid parameters for getBalanceAccountDetails';
    logger.error(errorMsg, { customer, balanceAccountId });
    throw new Error(`Invalid parameters: customer=${customer}, balanceAccountId=${balanceAccountId}`);
  }
  
  const url = buildApiUrl(customer, `/balance-accounts/${balanceAccountId}`, isDev);
  
  try {
    const response = await get(url);
    return response;
  } catch (error) {
    logger.error(`Balance account API request failed: ${error.message}`);
    throw error;
  }
}

/**
 * Fetches book entry details from the API
 * @param {string} customer - The customer subdomain
 * @param {string} entryId - The entry ID to fetch
 * @param {boolean} [isDev=false] - Whether to use the development environment
 * @returns {Promise<Object>} The entry details
 */
async function getEntryDetails(customer, entryId, isDev = false) {
  if (!customer || !entryId) {
    const errorMsg = 'Invalid parameters for getEntryDetails';
    logger.error(errorMsg, { customer, entryId });
    throw new Error(`Invalid parameters: customer=${customer}, entryId=${entryId}`);
  }
  
  const url = buildApiUrl(customer, `/book-entries/${entryId}`, isDev);
  
  try {
    const response = await get(url);
    return response;
  } catch (error) {
    logger.error(`Entry API request failed: ${error.message}`);
    throw error;
  }
}

logger.info('API module (ES6) loaded');

export {
  makeAuthenticatedRequest,
  get,
  post,
  put,
  del,
  buildApiUrl,
  getCardDetails,
  getBookDetails,
  getAdministrationDetails,
  getBalanceAccountDetails,
  getEntryDetails
};
