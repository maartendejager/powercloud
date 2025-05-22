/**
 * Shared API Service Module for PowerCloud Chrome Extension
 * 
 * This module provides centralized functionality for making authenticated 
 * requests to spend.cloud APIs.
 */

import { getToken, extractClientEnvironment, isDevelopmentRoute } from './auth.js';

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
  const url = buildApiUrl(customer, `/cards/${cardId}`, isDev);
  return get(url);
}

/**
 * Fetches book details from the API
 * @param {string} customer - The customer subdomain
 * @param {string} bookId - The book ID to fetch
 * @param {boolean} [isDev=false] - Whether to use the development environment
 * @returns {Promise<Object>} The book details
 */
async function getBookDetails(customer, bookId, isDev = false) {
  const url = buildApiUrl(customer, `/books/${bookId}`, isDev);
  return get(url);
}

/**
 * Fetches administration details from the API
 * @param {string} customer - The customer subdomain
 * @param {string} administrationId - The administration ID to fetch
 * @param {boolean} [isDev=false] - Whether to use the development environment
 * @returns {Promise<Object>} The administration details
 */
async function getAdministrationDetails(customer, administrationId, isDev = false) {
  console.log(`%c FETCHING ADMINISTRATION DETAILS FROM API `, 'background: #2196F3; color: white; font-size: 14px; font-weight: bold;');
  console.log(`Customer: ${customer}, ID: ${administrationId}, Timestamp: ${new Date().toISOString()}`);
  
  if (!customer || !administrationId) {
    console.error('Invalid parameters for getAdministrationDetails');
    console.trace('Trace for invalid parameters');
    throw new Error(`Invalid parameters: customer=${customer}, administrationId=${administrationId}`);
  }
  
  // Try both API endpoints since we're not sure which one is correct
  // First, try the /administrations/ endpoint as specified in the requirements
  const url = buildApiUrl(customer, `/administrations/${administrationId}`, isDev);
  console.log(`Primary Administration API URL: ${url}`);
  
  // For debugging, add details about token
  try {
    const token = await getToken(customer, isDev);
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
      const alternateUrl = buildApiUrl(customer, `/api/v1/administrations/${administrationId}`, isDev);
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
  getCardDetails,
  getBookDetails,
  getAdministrationDetails
};
