/**
 * Shared API Service Module for PowerCloud Chrome Extension
 * 
 * This module provides centralized functionality for making authenticated 
 * requests to spend.cloud APIs.
 */

import { getToken } from './auth.js';

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

export { 
  makeAuthenticatedRequest, 
  get, 
  post, 
  put, 
  del, 
  buildApiUrl,
  getCardDetails,
  getBookDetails
};
