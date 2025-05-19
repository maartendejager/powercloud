// filepath: /home/maarten/projects/Extensions/PowerCloud/background/service-worker.js
import { setToken, getAllTokens, getToken, isValidJWT } from '../shared/auth.js';
import { makeAuthenticatedRequest, getCardDetails as apiGetCardDetails } from '../shared/api.js';
import { testApiService } from './api-test.js';

// Keep a local reference to tokens for quicker access
let authTokens = [];

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
      
      // Use the shared auth module to store the token
      setToken(token, { url: details.url, source: 'webRequest' })
        .then(() => getAllTokens())
        .then(tokens => {
          // Update local reference
          authTokens = tokens;
        });
    }
  },
  { urls: ["*://*.spend.cloud/*"] },
  ["requestHeaders", "extraHeaders"]
);

// Initialize from storage on startup
chrome.runtime.onInstalled.addListener(() => {
  getAllTokens().then(tokens => {
    authTokens = tokens;
    console.log('Auth tokens initialized:', authTokens.length);
  }).catch(error => {
    console.error('Error initializing tokens:', error);
  });
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getAuthTokens") {
    sendResponse({ authTokens });
  } else if (message.action === "foundTokensInPage") {
    // Handle tokens found by content script
    const promises = [];
    
    message.tokens.forEach(({ token, source }) => {
      // Use shared isValidJWT function to validate the token
      if (isValidJWT(token)) {
        // Store token using shared auth module
        const promise = setToken(token, {
          url: message.url,
          source: source || 'content-script',
          timestamp: message.timestamp
        });
        promises.push(promise);
      }
    });
    
    Promise.all(promises)
      .then(() => getAllTokens())
      .then(tokens => {
        authTokens = tokens; // Update local cache
        sendResponse({ status: 'Tokens processed' });
      })
      .catch(error => {
        console.error('Error processing page tokens:', error);
        sendResponse({ status: 'Error processing tokens', error: error.message });
      });
    
    return true; // Keep message channel open for async response
  } else if (message.action === "checkForTokens") {
    // Trigger token check in active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url.includes('spend.cloud')) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'checkPageForTokens' });
      }
    });
    sendResponse({ status: 'Token check initiated' });
  } else if (message.action === "fetchCardDetails") {
    // Fetch card details using the shared API module
    const { customer, cardId } = message;
    
    // Get card details using our new API module
    apiGetCardDetails(customer, cardId)
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
  } else if (message.action === "testApiService") {
    // Test our API service
    const { customer, cardId } = message;
    
    testApiService(customer, cardId)
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        sendResponse({
          success: false,
          error: error.message
        });
      });
    
    return true; // Keep message channel open for async response
  }
  
  return true; // Keep the messaging channel open for async response
});
