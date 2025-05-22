/**
 * API Processor Utilities
 * 
 * Common utility functions shared by API processors.
 */

/**
 * Determines if a request should use the development environment
 * based on the sender tab URL or active tab URL
 * 
 * @param {Object} sender - The message sender object
 * @returns {Promise<boolean>} - Promise that resolves to whether this is a dev environment
 */
export function determineDevelopmentStatus(sender) {
  return new Promise((resolve) => {
    // If request comes from a content script (tab), check the tab URL
    if (sender.tab && sender.tab.url) {
      const isDev = sender.tab.url.includes('.dev.spend.cloud');
      resolve(isDev);
    } else {
      // If request comes from popup, check active tab URL first
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        let isDev = false;
        if (tabs[0] && tabs[0].url) {
          isDev = tabs[0].url.includes('.dev.spend.cloud');
        }
        resolve(isDev);
      });
    }
  });
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
