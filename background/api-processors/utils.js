/**
 * API Processor Utilities
 * 
 * Common utility functions shared by API processors.
 */

import { SUPPORTED_BASE_DOMAINS, getBaseDomain } from '../../shared/url-patterns-module.js';

/**
 * Resolves the URL of the tab a request originates from: the sender tab for
 * content scripts, or the active tab for the popup
 *
 * @param {Object} sender - The message sender object
 * @returns {Promise<string>} - Promise that resolves to the tab URL ('' if unknown)
 */
function getRequestTabUrl(sender) {
  return new Promise((resolve) => {
    if (sender.tab && sender.tab.url) {
      resolve(sender.tab.url);
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        resolve((tabs[0] && tabs[0].url) || '');
      });
    }
  });
}

/**
 * Determines if a request should use the development environment
 * based on the sender tab URL or active tab URL
 * 
 * @param {Object} sender - The message sender object
 * @returns {Promise<boolean>} - Promise that resolves to whether this is a dev environment
 */
export function determineDevelopmentStatus(sender) {
  return getRequestTabUrl(sender).then(url =>
    SUPPORTED_BASE_DOMAINS.some(d => url.includes(`.dev.${d}`))
  );
}

/**
 * Determines the base domain (elari.app or spend.cloud) API requests should
 * go to, based on the sender tab URL or active tab URL
 *
 * @param {Object} sender - The message sender object
 * @returns {Promise<string>} - Promise that resolves to the base domain
 */
export function determineBaseDomain(sender) {
  return getRequestTabUrl(sender).then(getBaseDomain);
}

/**
 * Validates that required parameters are present
 * 
 * @param {Object} params - Object containing parameters to check
 * @param {Array<string>} requiredParams - Array of required parameter names
 * @returns {Object} - Object with validation result { isValid, errorMessage }
 */
export function validateRequiredParams(params, requiredParams) {
  const missingParams = requiredParams.filter(param => !params[param]);
  
  if (missingParams.length > 0) {
    const errorMsg = `Missing required parameters: ${missingParams.join(', ')}`;
    return {
      isValid: false,
      errorMessage: errorMsg
    };
  }
  
  return {
    isValid: true,
    errorMessage: null
  };
}

/**
 * Generates a unique request ID for tracking API requests in logs
 * 
 * @param {string} prefix - Optional prefix for the request ID
 * @returns {string} - A unique request ID
 */
export function generateRequestId(prefix = 'req') {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${randomPart}`;
}
