// filepath: /home/maarten/projects/Extensions/PowerCloud/background/service-worker.js
// Import modules from shared directory
import { setToken, getAllTokens, getToken, isValidJWT, saveTokens, removeToken, clearTokens, handleAuthHeaderFromWebRequest } from '../shared/auth.js';
import { isApiRoute } from '../shared/url-patterns.js';

// Import API processors
import { 
  processCardDetailsRequest,
  processBookDetailsRequest,
  processAdministrationDetailsRequest,
  processBalanceAccountDetailsRequest,
  determineDevelopmentStatus,
  validateRequiredParams
} from './api-processors/index.js';

// Keep a local reference to tokens for quicker access
let authTokens = [];

// Listen for requests to spend.cloud API domains only
chrome.webRequest.onSendHeaders.addListener(
  (details) => {
    handleAuthHeaderFromWebRequest(details)
      .then(updatedTokens => {
        if (updatedTokens) {
          // Update local reference if a token was processed and new list returned
          authTokens = updatedTokens;
        }
      })
      .catch(error => {
        console.error('Error handling auth header from web request:', error);
      });
  },
  { urls: ["*://*.spend.cloud/api/*"] }, // Only monitor API routes
  ["requestHeaders", "extraHeaders"]
);

// Initialize from storage on startup
chrome.runtime.onInstalled.addListener(() => {
  getAllTokens().then(tokens => {
    // Filter out non-API tokens
    const apiTokens = tokens.filter(token => 
      token.url && isApiRoute(token.url)
    );
    
    if (apiTokens.length !== tokens.length) {
      console.log(`Filtered out ${tokens.length - apiTokens.length} non-API tokens`);
      // Save the filtered tokens
      saveTokens(apiTokens).then(() => {
        authTokens = apiTokens;
        console.log('Auth tokens initialized:', authTokens.length);
      });
    } else {
      authTokens = tokens;
      console.log('Auth tokens initialized:', authTokens.length);
    }
  }).catch(error => {
    console.error('Error initializing tokens:', error);
  });
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getAuthTokens") {
    sendResponse({ authTokens });
  } else if (message.action === "deleteToken") {
    // Handle token deletion
    if (!message.token) {
      sendResponse({ success: false, error: 'No token provided' });
      return true;
    }
    
    // Use the removeToken function from auth.js
    removeToken(message.token)
      .then(success => {
        if (success) {
          return getAllTokens();
        } else {
          throw new Error('Token not found');
        }
      })
      .then(tokens => {
        authTokens = tokens; // Update local cache
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('Error deleting token:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Keep message channel open for async response
  } else if (message.action === "deleteAllTokens") {
    // Handle clearing all tokens
    clearTokens()
      .then(() => {
        authTokens = []; // Update local cache
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('Error clearing all tokens:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Keep message channel open for async response
  } else if (message.action === "fetchCardDetails") {
    // Fetch card details using the shared API module
    const { customer, cardId } = message;
    
    // Validate required parameters
    const validation = validateRequiredParams({ customer, cardId }, ['customer', 'cardId']);
    if (!validation.isValid) {
      sendResponse({
        success: false,
        error: validation.errorMessage
      });
      return true;
    }
    
    // Determine environment and process the request
    determineDevelopmentStatus(sender, (isDev) => {
      processCardDetailsRequest(customer, cardId, isDev, sendResponse);
    });
    
    return true; // Keep message channel open for async response
  } else if (message.action === "fetchBookDetails") {
    // Fetch book details using the shared API module
    const { customer, bookId } = message;
    
    // Validate required parameters
    const validation = validateRequiredParams({ customer, bookId }, ['customer', 'bookId']);
    if (!validation.isValid) {
      sendResponse({
        success: false,
        error: validation.errorMessage
      });
      return true;
    }
    
    // Determine environment and process the request
    determineDevelopmentStatus(sender, (isDev) => {
      processBookDetailsRequest(customer, bookId, isDev, sendResponse);
    });
    
    return true; // Keep message channel open for async response
  } else if (message.action === "fetchAdministrationDetails") {
    // Fetch administration details using the shared API module
    const { customer, administrationId, requestId } = message;
    
    console.log(`%c RECEIVED fetchAdministrationDetails REQUEST ${requestId || ''} `, 'background: #9C27B0; color: white; font-size: 14px; font-weight: bold;');
    console.log(`Customer: ${customer}, AdministrationID: ${administrationId}`);
    console.log(`Request timestamp: ${new Date().toISOString()}`);
    
    // Validate required parameters
    const validation = validateRequiredParams({ customer, administrationId }, ['customer', 'administrationId']);
    if (!validation.isValid) {
      sendResponse({
        success: false,
        error: validation.errorMessage
      });
      return true;
    }
    
    // Determine environment and process the request
    determineDevelopmentStatus(sender, (isDev) => {
      processAdministrationDetailsRequest(customer, administrationId, isDev, requestId, sendResponse);
    });
    
    return true; // Keep message channel open for async response
  } else if (message.action === "fetchBalanceAccountDetails") {
    // Fetch balance account details using the shared API module
    const { customer, balanceAccountId, requestId } = message;
    
    console.log(`%c RECEIVED fetchBalanceAccountDetails REQUEST ${requestId || ''} `, 'background: #9C27B0; color: white; font-size: 14px; font-weight: bold;');
    console.log(`Customer: ${customer}, BalanceAccountID: ${balanceAccountId}`);
    console.log(`Request timestamp: ${new Date().toISOString()}`);
    
    // Validate required parameters
    const validation = validateRequiredParams({ customer, balanceAccountId }, ['customer', 'balanceAccountId']);
    if (!validation.isValid) {
      sendResponse({
        success: false,
        error: validation.errorMessage
      });
      return true;
    }
    
    // Determine environment and process the request
    determineDevelopmentStatus(sender, (isDev) => {
      processBalanceAccountDetailsRequest(customer, balanceAccountId, isDev, requestId, sendResponse);
    });
    
    return true; // Keep message channel open for async response
  }
  
  return true; // Keep the messaging channel open for async response
});
