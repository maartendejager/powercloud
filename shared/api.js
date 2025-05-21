/**
 * Shared API Service Module for PowerCloud Chrome Extension
 * 
 * This module provides centralized functionality for making authenticated 
 * requests to spend.cloud APIs.
 */

import { getToken } from './auth.js';
import { isApiRoute, extractCustomerDomain } from './url-patterns.js';

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
    // Get the current authentication token
    const token = await getToken();
    
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
    
    // Make the request
    const response = await fetch(endpoint, options);
    
    // Check if response is ok (status in the range 200-299)
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }
    
    // Check content type to determine how to parse the response
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  } catch (error) {
    console.error('API request error:', error);
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
 * @param {Object} data - The data to send in the request body
 * @param {Object} [additionalHeaders] - Optional additional headers to include
 * @returns {Promise<Object>} The parsed response data
 */
async function post(endpoint, data, additionalHeaders = {}) {
  return makeAuthenticatedRequest(endpoint, 'POST', data, additionalHeaders);
}

/**
 * Makes a PUT request to an API endpoint
 * @param {string} endpoint - The API endpoint URL
 * @param {Object} data - The data to send in the request body
 * @param {Object} [additionalHeaders] - Optional additional headers to include
 * @returns {Promise<Object>} The parsed response data
 */
async function put(endpoint, data, additionalHeaders = {}) {
  return makeAuthenticatedRequest(endpoint, 'PUT', data, additionalHeaders);
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
 * @returns {string} The complete API URL
 */
function buildApiUrl(customer, path) {
  return `https://${customer}.spend.cloud/api${path.startsWith('/') ? path : '/' + path}`;
}

/**
 * Constructs a spend.cloud API URL for a given customer and endpoint
 * Supports both standard and development domains
 * 
 * @param {string} customer - The customer subdomain
 * @param {string} endpoint - The API endpoint path (without leading slash)
 * @param {boolean} isDev - Whether to use the dev domain (default: false)
 * @returns {string} The complete API URL
 */
function constructApiUrl(customer, endpoint, isDev = false) {
  if (!customer || typeof customer !== 'string') {
    throw new Error('Customer subdomain is required');
  }
  
  if (!endpoint || typeof endpoint !== 'string') {
    throw new Error('API endpoint path is required');
  }
  
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  
  // Construct the domain with or without dev subdomain
  const domain = isDev ? 
    `https://${customer}.dev.spend.cloud` : 
    `https://${customer}.spend.cloud`;
  
  // Add api/ prefix if not already present
  const apiPath = cleanEndpoint.startsWith('api/') ? cleanEndpoint : `api/${cleanEndpoint}`;
  
  return `${domain}/${apiPath}`;
}

/**
 * Fetches card details from the API
 * @param {string} customer - The customer subdomain
 * @param {string} cardId - The card ID to fetch
 * @returns {Promise<Object>} The card details
 */
async function getCardDetails(customer, cardId) {
  const url = buildApiUrl(customer, `/cards/${cardId}`);
  return get(url);
}

/**
 * Fetches book details from the API
 * @param {string} customer - The customer subdomain
 * @param {string} bookId - The book ID to fetch
 * @returns {Promise<Object>} The book details
 */
async function getBookDetails(customer, bookId) {
  const url = buildApiUrl(customer, `/books/${bookId}`);
  return get(url);
}

/**
 * Fetches administration details from the API
 * @param {string} customer - The customer subdomain
 * @param {string} administrationId - The administration ID to fetch
 * @returns {Promise<Object>} The administration details
 */
async function getAdministrationDetails(customer, administrationId) {
  console.log(`%c FETCHING ADMINISTRATION DETAILS FROM API `, 'background: #2196F3; color: white; font-size: 14px; font-weight: bold;');
  console.log(`Customer: ${customer}, ID: ${administrationId}, Timestamp: ${new Date().toISOString()}`);
  
  if (!customer || !administrationId) {
    console.error('Invalid parameters for getAdministrationDetails');
    console.trace('Trace for invalid parameters');
    throw new Error(`Invalid parameters: customer=${customer}, administrationId=${administrationId}`);
  }
  
  // Try both API endpoints since we're not sure which one is correct
  // First, try the /administrations/ endpoint as specified in the requirements
  const url = buildApiUrl(customer, `/administrations/${administrationId}`);
  console.log(`Primary Administration API URL: ${url}`);
  
  // For debugging, add details about token
  try {
    const token = await getToken();
    if (token) {
      console.log('Token available for API request:', { 
        tokenLength: token.length,
        tokenStart: token.substring(0, 10) + '...',
        tokenEnd: '...' + token.substring(token.length - 10)
      });
    } else {
      console.warn('No token available for administration API request!');
    }
  } catch (error) {
    console.error('Error checking token:', error);
  }
  
  console.log('Making administration API request...');
  try {
    const response = await get(url);
    console.log('Administration API request completed successfully');
    
    // Check if the response has the expected structure
    if (response?.data?.relationships?.balanceAccount?.data?.id) {
      console.log('Found balance account ID in response data');
    }
    
    return response;
  } catch (primaryError) {
    console.error(`Primary administration API request failed: ${primaryError.message}`);
    
    // Try fallback endpoint in case the primary fails
    try {
      console.log('Trying alternative API endpoint...');
      const alternateUrl = buildApiUrl(customer, `/api/v1/administrations/${administrationId}`);
      console.log(`Alternative Administration API URL: ${alternateUrl}`);
      return await get(alternateUrl);
    } catch (fallbackError) {
      console.error(`Alternative administration API request also failed: ${fallbackError.message}`);
      throw primaryError; // Throw the original error
    }
  }
}

export { 
  makeAuthenticatedRequest, 
  get, 
  post, 
  put, 
  del, 
  buildApiUrl,
  constructApiUrl,
  getCardDetails,
  getBookDetails,
  getAdministrationDetails
};
