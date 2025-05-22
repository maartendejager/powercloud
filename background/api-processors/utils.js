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
 * @param {Function} callback - Callback to execute with isDev result
 */
export function determineDevelopmentStatus(sender, callback) {
  // If request comes from a content script (tab), check the tab URL
  if (sender.tab && sender.tab.url) {
    const isDev = sender.tab.url.includes('.dev.spend.cloud');
    callback(isDev);
  } else {
    // If request comes from popup, check active tab URL first
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      let isDev = false;
      if (tabs[0] && tabs[0].url) {
        isDev = tabs[0].url.includes('.dev.spend.cloud');
      }
      callback(isDev);
    });
  }
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
