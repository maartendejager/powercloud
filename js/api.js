/**
 * Helper functions for making authenticated requests to spend.cloud APIs
 */

/**
 * Retrieves the most recent valid authentication token from storage
 * @returns {Promise<string>} The most recent valid auth token
 */
async function getLatestValidToken() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get("authTokens", (result) => {
      if (result.authTokens && result.authTokens.length > 0) {
        // First check if tokens have isValid property
        const validTokens = result.authTokens.filter(token => {
          // If token has isValid property and it's true, use it
          if (token.hasOwnProperty('isValid')) {
            return token.isValid;
          }
          
          // If isValid is not set, check expiry date manually
          if (token.expiryDate) {
            return new Date(token.expiryDate) > new Date();
          }

          // For tokens without expiry info, try to parse the JWT
          try {
            const payload = JSON.parse(atob(token.token.split('.')[1]));
            if (payload.exp) {
              return new Date(payload.exp * 1000) > new Date();
            }
          } catch (e) {
            // Skip error
          }
          
          // If we can't determine validity, assume it's valid
          return true;
        });
        
        if (validTokens.length > 0) {
          resolve(validTokens[0].token);
        } else {
          reject(new Error("No valid authentication tokens found"));
        }
      } else {
        reject(new Error("No authentication tokens found"));
      }
    });
  });
}

/**
 * Retrieves the most recent authentication token from storage (for backward compatibility)
 * @returns {Promise<string>} The most recent auth token
 * @deprecated Use getLatestValidToken instead
 */
async function getLatestToken() {
  return getLatestValidToken();
}

/**
 * Makes an authenticated request to spend.cloud API
 * @param {string} url - The API endpoint URL
 * @param {Object} options - Fetch options like method, body, etc.
 * @param {string} [tokenOverride] - Optional specific token to use
 * @returns {Promise<Object>} The response data
 */
async function makeAuthenticatedRequest(url, options = {}, tokenOverride = null) {
  try {
    const token = tokenOverride || await getLatestValidToken();
    
    const requestOptions = {
      ...options,
      headers: {
        ...options.headers,
        'X-Authorization-Token': token
      }
    };
    
    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error making authenticated request:', error);
    throw error;
  }
}

/**
 * Fetches card details including the Adyen Payment Instrument ID
 * @param {string} customer - The customer subdomain
 * @param {string} cardId - The ID of the card
 * @returns {Promise<Object>} The card details
 */
async function getCardDetails(customer, cardId) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { 
        action: "fetchCardDetails", 
        customer: customer, 
        cardId: cardId 
      },
      (response) => {
        if (!response) {
          reject(new Error('No response from background script'));
        } else if (!response.success) {
          reject(new Error(response.error || 'Failed to fetch card details'));
        } else {
          resolve(response);
        }
      }
    );
  });
}

// Export functions for use in other parts of the extension
export { getLatestToken, getLatestValidToken, makeAuthenticatedRequest, getCardDetails };

