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
 * Validates if a JWT token is expired
 * @param {string} token - The JWT token to validate
 * @returns {boolean} True if token is expired, false otherwise
 */
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp) {
      return new Date(payload.exp * 1000) <= new Date();
    }
  } catch (e) {
    logger.warn('Failed to parse JWT token for expiration check', e);
  }
  return false; // If we can't parse, assume not expired
}

/**
 * Validates a token before making API requests
 * @param {string} token - The token to validate
 * @param {string} clientEnvironment - The client environment
 * @param {boolean} isDev - Whether this is a development environment
 * @returns {Promise<string>} The validated token or throws if invalid
 */
async function validateTokenBeforeRequest(token, clientEnvironment, isDev) {
  if (isTokenExpired(token)) {
    logger.warn('Token expired before API request', {
      clientEnvironment,
      isDev,
      tokenExpired: true
    });
    
    // Record token expiration in health dashboard
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'recordStructuredLog',
        level: 'warn',
        feature: 'auth',
        category: 'auth',
        message: 'Token expired before API request',
        data: {
          clientEnvironment,
          isDev,
          timestamp: Date.now(),
          url: globalThis?.location?.href || 'unknown'
        }
      }).catch(() => {});
    }
    
    // Clear expired token and try to get a fresh one
    await clearExpiredToken(clientEnvironment, isDev);
    
    // Try to get a new token
    try {
      return await getToken(clientEnvironment, isDev);
    } catch (error) {
      // Use the more specific error message from getToken if available
      if (error.message && error.message.includes('refresh the page')) {
        // Pass through the improved error message from getToken
        const authError = new Error(error.message);
        authError.isAuthError = true;
        authError.status = 401;
        throw authError;
      }
      
      // Fallback for other errors
      const authError = new Error('No valid authentication token available. Please refresh the page to capture a new token.');
      authError.isAuthError = true;
      authError.status = 401;
      throw authError;
    }
  }
  
  return token;
}

/**
 * Clears expired tokens from storage for a specific environment
 * @param {string} clientEnvironment - The client environment
 * @param {boolean} isDev - Whether this is a development environment
 */
async function clearExpiredToken(clientEnvironment, isDev) {
  try {
    const tokens = await new Promise((resolve) => {
      chrome.storage.local.get("authTokens", (result) => {
        resolve(result.authTokens || []);
      });
    });
    
    // Filter out expired tokens for this environment
    const filteredTokens = tokens.filter(tokenEntry => {
      // Skip tokens that don't match the environment
      if (clientEnvironment !== undefined && tokenEntry.clientEnvironment !== clientEnvironment) {
        return true; // Keep tokens from other environments
      }
      
      if (isDev !== undefined && tokenEntry.isDevRoute !== isDev) {
        return true; // Keep tokens from other dev status
      }
      
      // Check if this token is expired
      return !isTokenExpired(tokenEntry.token);
    });
    
    if (filteredTokens.length !== tokens.length) {
      // Save the filtered tokens back to storage
      chrome.storage.local.set({ authTokens: filteredTokens });
      
      logger.info(`Cleared ${tokens.length - filteredTokens.length} expired tokens for environment: ${clientEnvironment}, isDev: ${isDev}`);
      
      // Record token cleanup in health dashboard
      if (chrome?.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          action: 'recordStructuredLog',
          level: 'info',
          feature: 'auth',
          category: 'auth',
          message: 'Cleared expired tokens from storage',
          data: {
            clientEnvironment,
            isDev,
            tokensRemoved: tokens.length - filteredTokens.length,
            tokensRemaining: filteredTokens.length,
            timestamp: Date.now()
          }
        }).catch(() => {});
      }
    }
  } catch (error) {
    logger.error('Failed to clear expired tokens:', error);
  }
}

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
    let token = await getToken(clientEnvironment, isDev);
    
    // Validate the token before making the request
    token = await validateTokenBeforeRequest(token, clientEnvironment, isDev);
    
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
    
    // Handle 401 Unauthorized responses specifically
    if (response.status === 401) {
      logger.warn('401 Unauthorized response detected - token may be expired', {
        endpoint,
        method,
        clientEnvironment,
        isDev
      });
      
      const errorText = await response.text();
      
      // Report authentication error using Step 3.2 enhanced error reporting
      if (chrome?.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          action: 'reportAuthError',
          endpoint: endpoint,
          error: `API request failed with 401 Unauthorized - ${errorText}`,
          clientEnvironment: clientEnvironment,
          isDev: isDev
        }).catch(() => {});
      }
      
      // Clear potentially expired token from storage
      await clearExpiredToken(clientEnvironment, isDev);
      
      const authError = new Error(`Authentication failed - token expired. Please refresh the page to capture a new token.`);
      authError.status = 401;
      authError.isAuthError = true;
      authError.originalMessage = errorText;
      throw authError;
      authError.isAuthError = true;
      authError.originalMessage = errorText;
      throw authError;
    }
    
    // Check if response is ok (status in the range 200-299)
    if (!response.ok) {
      // Create more descriptive error messages based on status code
      let errorMessage;
      let logLevel = 'error';
      
      switch (response.status) {
        case 400:
          errorMessage = `Bad Request (400): Invalid parameters sent to ${endpoint}`;
          break;
        case 401:
          errorMessage = `Unauthorized (401): Authentication failed for ${endpoint}`;
          break;
        case 403:
          errorMessage = `Forbidden (403): Access denied to ${endpoint}`;
          break;
        case 404:
          errorMessage = `Not Found (404): Resource not found at ${endpoint}`;
          logLevel = 'warn'; // 404s are often expected (missing resources)
          break;
        case 409:
          errorMessage = `Conflict (409): Resource conflict at ${endpoint}`;
          break;
        case 422:
          errorMessage = `Unprocessable Entity (422): Invalid data sent to ${endpoint}`;
          break;
        case 429:
          errorMessage = `Too Many Requests (429): Rate limited at ${endpoint}`;
          break;
        case 500:
          errorMessage = `Internal Server Error (500): Server error at ${endpoint}`;
          break;
        case 502:
          errorMessage = `Bad Gateway (502): Gateway error for ${endpoint}`;
          break;
        case 503:
          errorMessage = `Service Unavailable (503): Service down for ${endpoint}`;
          break;
        default:
          errorMessage = `HTTP error! status: ${response.status} for ${endpoint}`;
      }
      
      // Record specific HTTP error in health dashboard
      if (chrome?.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          action: 'recordStructuredLog',
          level: logLevel,
          feature: 'api',
          category: 'api',
          message: `HTTP ${response.status} error`,
          data: {
            endpoint: endpoint,
            method: method,
            statusCode: response.status,
            statusText: response.statusText,
            timestamp: Date.now(),
            clientEnvironment: endpoint.includes('spend.cloud') ? extractClientEnvironment(endpoint) : 'unknown',
            isDev: endpoint.includes('spend.cloud') ? isDevelopmentRoute(endpoint) : false
          }
        }).catch(() => {});
      }
      
      const httpError = new Error(errorMessage);
      httpError.status = response.status;
      httpError.statusText = response.statusText;
      httpError.endpoint = endpoint;
      throw httpError;
    }
    
    // Parse JSON response
    const data = await response.json();
    return data;
  } catch (error) {
    // Only log if it's not an HTTP error we already handled above
    if (!error.status) {
      logger.error(`API request failed for ${endpoint}:`, error);
      
      // Record general API failure in health dashboard
      if (chrome?.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          action: 'recordStructuredLog',
          level: 'error',
          feature: 'api',
          category: 'api',
          message: 'API module request failed',
          data: {
            endpoint: endpoint,
            method: method,
            error: error.message,
            stack: error.stack,
            timestamp: Date.now()
          }
        }).catch(() => {});
      }
    } else {
      // For HTTP errors, use appropriate log level
      const logLevel = error.status === 404 ? 'warn' : 'error';
      logger[logLevel](`API request failed for ${endpoint}:`, error);
    }
    
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
    
    // Record parameter validation error in health dashboard
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'recordStructuredLog',
        level: 'error',
        feature: 'api',
        category: 'api',
        message: 'Card API called with invalid parameters',
        data: {
          customer: customer,
          cardId: cardId,
          error: errorMsg
        }
      }).catch(() => {});
    }
    
    throw new Error(`Invalid parameters: customer=${customer}, cardId=${cardId}`);
  }
  
  const url = buildApiUrl(customer, `/cards/${cardId}`, isDev);
  
  try {
    const response = await get(url);
    return response;
  } catch (error) {
    logger.error(`Card API request failed: ${error.message}`);
    
    // Record card API failure in health dashboard
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'recordStructuredLog',
        level: 'error',
        feature: 'api',
        category: 'api',
        message: 'Card API request failed',
        data: {
          customer: customer,
          cardId: cardId,
          endpoint: url,
          error: error.message,
          stack: error.stack,
          isDev: isDev
        }
      }).catch(() => {});
    }
    
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
    
    // Record parameter validation error in health dashboard
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'recordStructuredLog',
        level: 'error',
        feature: 'api',
        category: 'api',
        message: 'Book API called with invalid parameters',
        data: {
          customer: customer,
          bookId: bookId,
          error: errorMsg
        }
      }).catch(() => {});
    }
    
    throw new Error(`Invalid parameters: customer=${customer}, bookId=${bookId}`);
  }
  
  const url = buildApiUrl(customer, `/books/${bookId}`, isDev);
  
  try {
    const response = await get(url);
    return response;
  } catch (error) {
    logger.error(`Book API request failed: ${error.message}`);
    
    // Record book API failure in health dashboard
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'recordStructuredLog',
        level: 'error',
        feature: 'api',
        category: 'api',
        message: 'Book API request failed',
        data: {
          customer: customer,
          bookId: bookId,
          endpoint: url,
          error: error.message,
          stack: error.stack,
          isDev: isDev
        }
      }).catch(() => {});
    }
    
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
    
    // Record parameter validation error in health dashboard
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'recordStructuredLog',
        level: 'error',
        feature: 'api',
        category: 'api',
        message: 'Administration API called with invalid parameters',
        data: {
          customer: customer,
          administrationId: administrationId,
          error: errorMsg,
          timestamp: Date.now()
        }
      }).catch(() => {});
    }
    
    throw new Error(`Invalid parameters: customer=${customer}, administrationId=${administrationId}`);
  }
  
  const url = buildApiUrl(customer, `/administrations/${administrationId}`, isDev);
  
  try {
    const response = await get(url);
    return response;
  } catch (error) {
    logger.error(`Administration API request failed: ${error.message}`);
    
    // Record administration API failure in health dashboard
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'recordStructuredLog',
        level: 'error',
        feature: 'api',
        category: 'api',
        message: 'Administration API request failed',
        data: {
          customer: customer,
          administrationId: administrationId,
          endpoint: url,
          error: error.message,
          stack: error.stack,
          isDev: isDev,
          timestamp: Date.now()
        }
      }).catch(() => {});
    }
    
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
    
    // Record parameter validation error in health dashboard
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'recordStructuredLog',
        level: 'error',
        feature: 'api',
        category: 'api',
        message: 'Balance account API called with invalid parameters',
        data: {
          customer: customer,
          balanceAccountId: balanceAccountId,
          error: errorMsg,
          timestamp: Date.now()
        }
      }).catch(() => {});
    }
    
    throw new Error(`Invalid parameters: customer=${customer}, balanceAccountId=${balanceAccountId}`);
  }
  
  const url = buildApiUrl(customer, `/balance-accounts/${balanceAccountId}`, isDev);
  
  try {
    const response = await get(url);
    return response;
  } catch (error) {
    logger.error(`Balance account API request failed: ${error.message}`);
    
    // Record balance account API failure in health dashboard
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'recordStructuredLog',
        level: 'error',
        feature: 'api',
        category: 'api',
        message: 'Balance account API request failed',
        data: {
          customer: customer,
          balanceAccountId: balanceAccountId,
          endpoint: url,
          error: error.message,
          stack: error.stack,
          isDev: isDev,
          timestamp: Date.now()
        }
      }).catch(() => {});
    }
    
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
    
    // Record parameter validation error in health dashboard
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'recordStructuredLog',
        level: 'error',
        feature: 'api',
        category: 'api',
        message: 'Entry API called with invalid parameters',
        data: {
          customer: customer,
          entryId: entryId,
          error: errorMsg,
          timestamp: Date.now()
        }
      }).catch(() => {});
    }
    
    throw new Error(`Invalid parameters: customer=${customer}, entryId=${entryId}`);
  }
  
  const url = buildApiUrl(customer, `/book-entries/${entryId}`, isDev);
  
  try {
    const response = await get(url);
    return response;
  } catch (error) {
    logger.error(`Entry API request failed: ${error.message}`);
    
    // Record entry API failure in health dashboard
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'recordStructuredLog',
        level: 'error',
        feature: 'api',
        category: 'api',
        message: 'Entry API request failed',
        data: {
          customer: customer,
          entryId: entryId,
          endpoint: url,
          error: error.message,
          stack: error.stack,
          isDev: isDev,
          timestamp: Date.now()
        }
      }).catch(() => {});
    }
    
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
