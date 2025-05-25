/**
 * Shared API Service Module for PowerCloud Chrome Extension
 * 
 * This module provides centralized functionality for making authenticated 
 * requests to spend.cloud APIs.
 */

// Initialize logger for API module
const apiLogger = (() => {
  if (typeof window !== 'undefined' && window.PowerCloudLoggerFactory) {
    return window.PowerCloudLoggerFactory.createLogger('API');
  } else if (typeof window !== 'undefined' && window.LoggerFactory) {
    return window.LoggerFactory.createFallbackLogger('API');
  }
  // Fallback logger
  return {
    debug: () => {},
    info: () => {},
    warn: console.warn,
    error: console.error
  };
})();

// Note: This module depends on auth.js being loaded first
// Auth functions are available via window.getToken, window.extractClientEnvironment, window.isDevelopmentRoute

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
    const clientEnvironment = endpoint.includes('spend.cloud') ? window.extractClientEnvironment(endpoint) : undefined;
    const isDev = endpoint.includes('spend.cloud') ? window.isDevelopmentRoute(endpoint) : undefined;
    
    // Get the current authentication token appropriate for this request
    const token = await window.getToken(clientEnvironment, isDev);
    
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
    apiLogger.error('API request error:', error);
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
  if (!customer || !administrationId) {
    const errorMsg = 'Invalid parameters for getAdministrationDetails';
    apiLogger.error(errorMsg, { customer, administrationId });
    throw new Error(`Invalid parameters: customer=${customer}, administrationId=${administrationId}`);
  }
  
  // Try both API endpoints since we're not sure which one is correct
  // First, try the /administrations/ endpoint as specified in the requirements
  const url = buildApiUrl(customer, `/administrations/${administrationId}`, isDev);
  
  // For debugging, add details about token
  try {
    const token = await window.getToken(customer, isDev);
    if (!token) {
      apiLogger.warn('No token available for administration API request!');
    }
  } catch (error) {
    apiLogger.error('Error checking token:', error);
  }
  
  try {
    const response = await get(url);
    
    // Check if the response has the expected structure
    return response;
  } catch (primaryError) {
    apiLogger.error(`Primary administration API request failed: ${primaryError.message}`);
    
    // Try fallback endpoint in case the primary fails
    try {
      const alternateUrl = buildApiUrl(customer, `/api/v1/administrations/${administrationId}`, isDev);
      return await get(alternateUrl);
    } catch (fallbackError) {
      apiLogger.error(`Alternative administration API request also failed: ${fallbackError.message}`);
      throw primaryError; // Throw the original error
    }
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
    apiLogger.error(errorMsg, { customer, balanceAccountId });
    throw new Error(`Invalid parameters: customer=${customer}, balanceAccountId=${balanceAccountId}`);
  }
  
  const url = buildApiUrl(customer, `/balance-accounts/${balanceAccountId}`, isDev);
  
  try {
    const response = await get(url);
    return response;
  } catch (error) {
    apiLogger.error(`Balance account API request failed: ${error.message}`);
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
    apiLogger.error(errorMsg, { customer, entryId });
    throw new Error(`Invalid parameters: customer=${customer}, entryId=${entryId}`);
  }
  
  const url = buildApiUrl(customer, `/book-entries/${entryId}`, isDev);
  
  try {
    const response = await get(url);
    return response;
  } catch (error) {
    apiLogger.error(`Entry API request failed: ${error.message}`);
    throw error;
  }
}

// Export for browser extension environment (content scripts)
if (typeof window !== 'undefined') {
  window.makeAuthenticatedRequest = makeAuthenticatedRequest;
  window.get = get;
  window.post = post;
  window.put = put;
  window.del = del;
  window.buildApiUrl = buildApiUrl;
  window.getCardDetails = getCardDetails;
  window.getBookDetails = getBookDetails;
  window.getAdministrationDetails = getAdministrationDetails;
  window.getBalanceAccountDetails = getBalanceAccountDetails;
  window.getEntryDetails = getEntryDetails;
}

apiLogger.info('API module loaded');
