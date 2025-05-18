// Store the last captured tokens
let authTokens = [];
const MAX_TOKENS = 10; // Store only the last 10 tokens

// Listen for requests to spend.cloud domains
chrome.webRequest.onSendHeaders.addListener(
  (details) => {
    // Filter out proactive-frame requests
    if (details.url.includes('/proactive-frame/')) {
      return;
    }
    
    // Look for Authorization header
    const authHeader = details.requestHeaders ? details.requestHeaders.find(header => 
      header.name.toLowerCase() === 'x-authorization-token' || 
      header.name.toLowerCase() === 'authorization'
    ) : null;
    
    if (authHeader && authHeader.value) {
      let token = authHeader.value;
      // If it's a Bearer token, extract just the JWT
      if (token.startsWith('Bearer ')) {
        token = token.slice(7);
      }
      
      // Check if token is valid (not expired)
      let isValid = true;
      let expiryDate = null;
      
      try {
        const payloadBase64 = token.split('.')[1];
        if (payloadBase64) {
          const payload = JSON.parse(atob(payloadBase64));
          if (payload.exp) {
            expiryDate = new Date(payload.exp * 1000);
            isValid = expiryDate > new Date();
          }
        }
      } catch (e) {
        // If we can't parse the token, assume it's valid
        console.error("Error parsing token:", e);
      }
      
      // Add token to the beginning of array with timestamp and validity info
      const tokenEntry = {
        token,
        timestamp: new Date().toISOString(),
        url: details.url,
        isValid: isValid,
        expiryDate: expiryDate ? expiryDate.toISOString() : null
      };
      
      // Don't add duplicate tokens
      if (!authTokens.some(entry => entry.token === token)) {
        authTokens.unshift(tokenEntry);
        // Keep only MAX_TOKENS entries
        if (authTokens.length > MAX_TOKENS) {
          authTokens.pop();
        }
        
        // Store tokens in storage for persistence
        chrome.storage.local.set({ authTokens });
      }
    }
  },
  { urls: ["*://*.spend.cloud/*"] },
  ["requestHeaders", "extraHeaders"]
);

// Initialize from storage on startup
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("authTokens", (result) => {
    if (result.authTokens) {
      authTokens = result.authTokens;
    }
  });
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getAuthTokens") {
    sendResponse({ authTokens });
  } else if (message.action === "foundTokensInPage") {
    // Handle tokens found by content script
    message.tokens.forEach(({ token, source }) => {
      // Validate if it looks like a JWT (contains 2 dots and has 3 parts)
      if (token.split('.').length === 3) {
        // Check if token is valid (not expired)
        let isValid = true;
        let expiryDate = null;
        
        try {
          const payloadBase64 = token.split('.')[1];
          if (payloadBase64) {
            const payload = JSON.parse(atob(payloadBase64));
            if (payload.exp) {
              expiryDate = new Date(payload.exp * 1000);
              isValid = expiryDate > new Date();
            }
          }
        } catch (e) {
          // If we can't parse the token, assume it's valid
          console.error("Error parsing token:", e);
        }
        
        const tokenEntry = {
          token,
          timestamp: message.timestamp,
          url: message.url,
          source: source, // Track where it was found
          isValid: isValid,
          expiryDate: expiryDate ? expiryDate.toISOString() : null
        };
        
        // Don't add duplicate tokens
        if (!authTokens.some(entry => entry.token === token)) {
          authTokens.unshift(tokenEntry);
          // Keep only MAX_TOKENS entries
          if (authTokens.length > MAX_TOKENS) {
            authTokens.pop();
          }
          
          // Store tokens in storage for persistence
          chrome.storage.local.set({ authTokens });
        }
      }
    });
    sendResponse({ status: 'Tokens processed' });
  } else if (message.action === "checkForTokens") {
    // Trigger token check in active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url.includes('spend.cloud')) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'checkPageForTokens' });
      }
    });
    sendResponse({ status: 'Token check initiated' });
  } else if (message.action === "fetchCardDetails") {
    // Fetch card details using the most recent valid token
    const { customer, cardId } = message;
    const apiUrl = `https://${customer}.spend.cloud/api/cards/${cardId}`;
    console.log(`Fetching card details from: ${apiUrl}`);
    
    // Find the most recent valid token
    const validTokens = authTokens.filter(token => {
      if (token.isValid === false) return false;
      
      if (token.expiryDate) {
        return new Date(token.expiryDate) > new Date();
      }
      
      // For tokens without validity info, check JWT
      try {
        const payload = JSON.parse(atob(token.token.split('.')[1]));
        if (payload.exp) {
          return new Date(payload.exp * 1000) > new Date();
        }
      } catch (e) {
        // Skip error
      }
      
      return true;
    });
    
    if (validTokens.length === 0) {
      sendResponse({ 
        success: false, 
        error: 'No valid authentication token found' 
      });
      return true;
    }
    
    const latestValidToken = validTokens[0].token;
    
    fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-Authorization-Token': latestValidToken,
        'Accept': 'application/json'
      }
    })
    .then(async response => {
      if (!response.ok) {
        // Try to parse the error response as JSON
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          const errorMessage = errorData.errors && errorData.errors[0] 
            ? `${errorData.errors[0].title}: ${errorData.errors[0].detail}`
            : `API request failed with status: ${response.status}`;
          throw new Error(errorMessage);
        } else {
          throw new Error(`API request failed with status: ${response.status}`);
        }
      }
      return response.json();
    })
    .then(data => {
      console.log('API response:', JSON.stringify(data));
      // Check various possible paths for the Adyen payment instrument ID
      let paymentInstrumentId = null;
      if (data?.data?.attributes?.adyenPaymentInstrumentId) {
        paymentInstrumentId = data.data.attributes.adyenPaymentInstrumentId;
      } else if (data?.attributes?.adyenPaymentInstrumentId) {
        paymentInstrumentId = data.attributes.adyenPaymentInstrumentId;
      } else if (data?.adyenPaymentInstrumentId) {
        paymentInstrumentId = data.adyenPaymentInstrumentId;
      }
      
      sendResponse({
        success: true,
        paymentInstrumentId: paymentInstrumentId,
        data: data.data || data
      });
    })
    .catch(error => {
      console.error('Error fetching card details:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    });
    
    // Return true to indicate we will send a response asynchronously
    return true;
  }
  return true; // Keep the messaging channel open for async response
});