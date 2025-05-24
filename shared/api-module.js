/**
 * ES6 Module wrapper for api.js
 * This module provides ES6 exports by duplicating the core functionality
 * Content scripts use the window exports from api.js
 * Background scripts and popup use this ES6 module
 */

// Static imports for service worker compatibility
import { getToken, extractClientEnvironment, isDevelopmentRoute } from './auth-module.js';

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
    
    console.log(`Making ${method} request to: ${endpoint}`);
    const response = await fetch(endpoint, options);
    
    // Check if response is ok
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Parse JSON response
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
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
    console.error('Invalid parameters for getCardDetails');
    console.trace('Trace for invalid parameters');
    throw new Error(`Invalid parameters: customer=${customer}, cardId=${cardId}`);
  }
  
  const url = buildApiUrl(customer, `/cards/${cardId}`, isDev);
  
  try {
    const response = await get(url);
    return response;
  } catch (error) {
    console.error(`Card API request failed: ${error.message}`);
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
    console.error('Invalid parameters for getBookDetails');
    console.trace('Trace for invalid parameters');
    throw new Error(`Invalid parameters: customer=${customer}, bookId=${bookId}`);
  }
  
  const url = buildApiUrl(customer, `/books/${bookId}`, isDev);
  
  try {
    const response = await get(url);
    return response;
  } catch (error) {
    console.error(`Book API request failed: ${error.message}`);
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
    console.error('Invalid parameters for getAdministrationDetails');
    console.trace('Trace for invalid parameters');
    throw new Error(`Invalid parameters: customer=${customer}, administrationId=${administrationId}`);
  }
  
  const url = buildApiUrl(customer, `/administrations/${administrationId}`, isDev);
  
  try {
    const response = await get(url);
    return response;
  } catch (error) {
    console.error(`Administration API request failed: ${error.message}`);
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
    console.error('Invalid parameters for getBalanceAccountDetails');
    console.trace('Trace for invalid parameters');
    throw new Error(`Invalid parameters: customer=${customer}, balanceAccountId=${balanceAccountId}`);
  }
  
  const url = buildApiUrl(customer, `/balance-accounts/${balanceAccountId}`, isDev);
  
  try {
    const response = await get(url);
    return response;
  } catch (error) {
    console.error(`Balance account API request failed: ${error.message}`);
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
    console.error('Invalid parameters for getEntryDetails');
    console.trace('Trace for invalid parameters');
    throw new Error(`Invalid parameters: customer=${customer}, entryId=${entryId}`);
  }
  
  const url = buildApiUrl(customer, `/book-entries/${entryId}`, isDev);
  
  try {
    const response = await get(url);
    return response;
  } catch (error) {
    console.error(`Entry API request failed: ${error.message}`);
    throw error;
  }
}

console.log('🚀 API MODULE (ES6) LOADED AT:', new Date().toISOString());

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
