// filepath: /home/maarten/projects/Extensions/PowerCloud/background/service-worker.js
// Import modules from shared directory
import { setToken, getAllTokens, getToken, isValidJWT, saveTokens, removeToken, clearTokens, handleAuthHeaderFromWebRequest } from '../shared/auth.js';
import { makeAuthenticatedRequest, getCardDetails as apiGetCardDetails, getBookDetails as apiGetBookDetails, getAdministrationDetails as apiGetAdministrationDetails, getBalanceAccountDetails as apiGetBalanceAccountDetails } from '../shared/api.js';
import { isApiRoute } from '../shared/url-patterns.js';

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
    
    // If request comes from a content script (tab), check the tab URL
    let isDev = false;
    if (sender.tab && sender.tab.url) {
      isDev = sender.tab.url.includes('.dev.spend.cloud');
      processCardDetailsRequest(customer, cardId, isDev, sendResponse);
    } else {
      // If request comes from popup, check active tab URL first
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url) {
          isDev = tabs[0].url.includes('.dev.spend.cloud');
        }
        processCardDetailsRequest(customer, cardId, isDev, sendResponse);
      });
    }
    
    return true; // Keep message channel open for async response
  } else if (message.action === "fetchBookDetails") {
    // Fetch book details using the shared API module
    const { customer, bookId } = message;
    
    // If request comes from a content script (tab), check the tab URL
    let isDev = false;
    if (sender.tab && sender.tab.url) {
      isDev = sender.tab.url.includes('.dev.spend.cloud');
      processBookDetailsRequest(customer, bookId, isDev, sendResponse);
    } else {
      // If request comes from popup, check active tab URL first
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url) {
          isDev = tabs[0].url.includes('.dev.spend.cloud');
        }
        processBookDetailsRequest(customer, bookId, isDev, sendResponse);
      });
    }
    
    return true; // Keep message channel open for async response
  } else if (message.action === "fetchAdministrationDetails") {
    // Fetch administration details using the shared API module
    const { customer, administrationId, requestId } = message;
    
    console.log(`%c RECEIVED fetchAdministrationDetails REQUEST ${requestId || ''} `, 'background: #9C27B0; color: white; font-size: 14px; font-weight: bold;');
    console.log(`Customer: ${customer}, AdministrationID: ${administrationId}`);
    console.log(`Request timestamp: ${new Date().toISOString()}`);
    
    if (!customer || !administrationId) {
      const errorMsg = `Missing required parameters: ${!customer ? 'customer' : ''} ${!administrationId ? 'administrationId' : ''}`;
      console.error(errorMsg);
      sendResponse({
        success: false,
        error: errorMsg
      });
      return true;
    }
    
    // If request comes from a content script (tab), check the tab URL
    let isDev = false;
    if (sender.tab && sender.tab.url) {
      isDev = sender.tab.url.includes('.dev.spend.cloud');
      processAdministrationDetailsRequest(customer, administrationId, isDev, requestId, sendResponse);
    } else {
      // If request comes from popup, check active tab URL first
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url) {
          isDev = tabs[0].url.includes('.dev.spend.cloud');
        }
        processAdministrationDetailsRequest(customer, administrationId, isDev, requestId, sendResponse);
      });
    }
    
    return true; // Keep message channel open for async response
  } else if (message.action === "fetchBalanceAccountDetails") {
    // Fetch balance account details using the shared API module
    const { customer, balanceAccountId, requestId } = message;
    
    console.log(`%c RECEIVED fetchBalanceAccountDetails REQUEST ${requestId || ''} `, 'background: #9C27B0; color: white; font-size: 14px; font-weight: bold;');
    console.log(`Customer: ${customer}, BalanceAccountID: ${balanceAccountId}`);
    console.log(`Request timestamp: ${new Date().toISOString()}`);
    
    if (!customer || !balanceAccountId) {
      const errorMsg = `Missing required parameters: ${!customer ? 'customer' : ''} ${!balanceAccountId ? 'balanceAccountId' : ''}`;
      console.error(errorMsg);
      sendResponse({
        success: false,
        error: errorMsg
      });
      return true;
    }
    
    // If request comes from a content script (tab), check the tab URL
    let isDev = false;
    if (sender.tab && sender.tab.url) {
      isDev = sender.tab.url.includes('.dev.spend.cloud');
      processBalanceAccountDetailsRequest(customer, balanceAccountId, isDev, requestId, sendResponse);
    } else {
      // If request comes from popup, check active tab URL first
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url) {
          isDev = tabs[0].url.includes('.dev.spend.cloud');
        }
        processBalanceAccountDetailsRequest(customer, balanceAccountId, isDev, requestId, sendResponse);
      });
    }
    
    return true; // Keep message channel open for async response
  }
  
  return true; // Keep the messaging channel open for async response
});

/**
 * Helper function to process card details request
 * @param {string} customer - The customer subdomain
 * @param {string} cardId - The card ID
 * @param {boolean} isDev - Whether to use the development environment
 * @param {function} sendResponse - The function to send the response back to the caller
 */
function processCardDetailsRequest(customer, cardId, isDev, sendResponse) {
  // Get card details using our API module
  apiGetCardDetails(customer, cardId, isDev)
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
      
      // Check for vendor information in the response
      let vendor = null;
      if (data?.data?.attributes?.vendor) {
        vendor = data.data.attributes.vendor;
      } else if (data?.attributes?.vendor) {
        vendor = data.attributes.vendor;
      } else if (data?.vendor) {
        vendor = data.vendor;
      }
      
      // Convert vendor to lowercase if it exists for case-insensitive comparison
      if (vendor) {
        vendor = vendor.toLowerCase();
      }
      
      sendResponse({
        success: true,
        paymentInstrumentId: paymentInstrumentId,
        vendor: vendor,
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
}

/**
 * Helper function to process book details request
 * @param {string} customer - The customer subdomain
 * @param {string} bookId - The book ID
 * @param {boolean} isDev - Whether to use the development environment
 * @param {function} sendResponse - The function to send the response back to the caller
 */
function processBookDetailsRequest(customer, bookId, isDev, sendResponse) {
  // Get book details using our API module
  apiGetBookDetails(customer, bookId, isDev)
    .then(data => {
      console.log('Book API response:', JSON.stringify(data));
      
      // Extract book data from the response
      const bookData = data?.data?.attributes || data?.attributes || data;
      
      // Extract the necessary fields
      const bookType = bookData?.bookType;
      const adyenBalanceAccountId = bookData?.adyenBalanceAccountId;
      let administrationId = bookData?.administrationId;
      const balanceAccountReference = bookData?.balanceAccountReference;
      
      // Extract administration ID from relationships if available
      // Path: data->relationships->administration->data->id
      if (!administrationId && data?.data?.relationships?.administration?.data?.id) {
        administrationId = data.data.relationships.administration.data.id;
        console.log('Found administration ID in relationships:', administrationId);
      } 
      // Also check for other possible paths
      else if (!administrationId && data?.relationships?.administration?.data?.id) {
        administrationId = data.relationships.administration.data.id;
        console.log('Found administration ID in alternative relationships path:', administrationId);
      }
      
      // Log full data to help debugging
      if (bookData?.bookType === 'monetary_account_book') {
        console.log('Monetary account book found. Full relationships data:', 
                    JSON.stringify(data?.data?.relationships || data?.relationships || {}));
      }
      
      sendResponse({
        success: true,
        bookType: bookType,
        adyenBalanceAccountId: adyenBalanceAccountId,
        administrationId: administrationId,
        balanceAccountReference: balanceAccountReference,
        data: data.data || data
      });
    })
    .catch(error => {
      console.error('Error fetching book details:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    });
}

/**
 * Helper function to process administration details request
 * @param {string} customer - The customer subdomain
 * @param {string} administrationId - The administration ID
 * @param {boolean} isDev - Whether to use the development environment
 * @param {string} requestId - Optional request ID for tracking
 * @param {function} sendResponse - The function to send the response back to the caller
 */
function processAdministrationDetailsRequest(customer, administrationId, isDev, requestId, sendResponse) {
  // Get administration details using our API module
  console.log('About to call apiGetAdministrationDetails...');
  apiGetAdministrationDetails(customer, administrationId, isDev)
    .then(data => {
      console.log(`%c Administration API response received! ${requestId || ''} `, 'background: #4CAF50; color: white; font-size: 14px; font-weight: bold;');
      console.log(`Response timestamp: ${new Date().toISOString()}`);
      
      // Short summary log first
      console.log('Administration response summary:', {
        success: true,
        hasData: !!data,
        hasRelationships: !!(data?.data?.relationships || data?.relationships),
        hasBalanceAccount: !!(data?.data?.relationships?.balanceAccount || data?.relationships?.balanceAccount)
      });
      
      // Detailed log after
      console.log('Full administration API response:', JSON.stringify(data, null, 2));
      
      // Extract the balance account ID from relationships if available
      // Path: data->relationships->balanceAccount->data->id
      let balanceAccountId = null;
      if (data?.data?.relationships?.balanceAccount?.data?.id) {
        balanceAccountId = data.data.relationships.balanceAccount.data.id;
        console.log('%c FOUND BALANCE ACCOUNT ID (PRIMARY PATH): ', 'background: #009688; color: white; font-size: 14px; font-weight: bold;', balanceAccountId);
      } else if (data?.relationships?.balanceAccount?.data?.id) {
        balanceAccountId = data.relationships.balanceAccount.data.id;
        console.log('%c FOUND BALANCE ACCOUNT ID (ALTERNATE PATH): ', 'background: #009688; color: white; font-size: 14px; font-weight: bold;', balanceAccountId);
      } 
      // Check attributes for balance account ID as another fallback
      else if (data?.data?.attributes?.balanceAccountId) {
        balanceAccountId = data.data.attributes.balanceAccountId;
        console.log('%c FOUND BALANCE ACCOUNT ID (ATTRIBUTES): ', 'background: #009688; color: white; font-size: 14px; font-weight: bold;', balanceAccountId);
      } else if (data?.attributes?.balanceAccountId) {
        balanceAccountId = data.attributes.balanceAccountId;
        console.log('%c FOUND BALANCE ACCOUNT ID (ROOT ATTRIBUTES): ', 'background: #009688; color: white; font-size: 14px; font-weight: bold;', balanceAccountId);
      } else {
        console.log('%c NO BALANCE ACCOUNT ID FOUND ', 'background: #F44336; color: white; font-size: 14px; font-weight: bold;');
        // Log possible paths in the response to help debugging
        console.log('Response structure:', {
          hasDataObj: !!data?.data,
          hasAttributes: !!(data?.data?.attributes || data?.attributes),
          dataRelationshipsKeys: data?.data?.relationships ? Object.keys(data.data.relationships) : [],
          rootRelationshipsKeys: data?.relationships ? Object.keys(data.relationships) : []
        });
      }
      
      // Log full relationship data for debugging
      console.log('Full administration relationships data:',
                  JSON.stringify(data?.data?.relationships || data?.relationships || {}));
      
      console.log('Sending response back to content script...');
      sendResponse({
        success: true,
        administrationId: administrationId,
        balanceAccountId: balanceAccountId,
        data: data.data || data
      });
      console.log('Response sent!');
    })
    .catch(error => {
      console.error(`Error fetching administration details (${requestId || ''}):`, error);
      console.log('Error stack:', error.stack);
      sendResponse({
        success: false,
        error: error.message
      });
    });
}

/**
 * Helper function to process balance account details request
 * @param {string} customer - The customer subdomain
 * @param {string} balanceAccountId - The balance account ID
 * @param {boolean} isDev - Whether to use the development environment
 * @param {string} requestId - Optional request ID for tracking
 * @param {function} sendResponse - The function to send the response back to the caller
 */
function processBalanceAccountDetailsRequest(customer, balanceAccountId, isDev, requestId, sendResponse) {
  // Get balance account details using our API module
  console.log('About to call apiGetBalanceAccountDetails...');
  apiGetBalanceAccountDetails(customer, balanceAccountId, isDev)
    .then(data => {
      console.log(`%c Balance Account API response received! ${requestId || ''} `, 'background: #4CAF50; color: white; font-size: 14px; font-weight: bold;');
      console.log(`Response timestamp: ${new Date().toISOString()}`);
      
      // Short summary log first
      console.log('Balance Account response summary:', {
        success: true,
        hasData: !!data,
        hasAttributes: !!(data?.data?.attributes || data?.attributes)
      });
      
      // Detailed log after
      console.log('Full balance account API response:', JSON.stringify(data, null, 2));
      
      // Extract the Adyen balance account ID from attributes if available
      // Path: data->attributes->adyenBalanceAccountId
      let adyenBalanceAccountId = null;
      if (data?.data?.attributes?.adyenBalanceAccountId) {
        adyenBalanceAccountId = data.data.attributes.adyenBalanceAccountId;
        console.log('%c FOUND ADYEN BALANCE ACCOUNT ID (PRIMARY PATH): ', 'background: #009688; color: white; font-size: 14px; font-weight: bold;', adyenBalanceAccountId);
      } else if (data?.attributes?.adyenBalanceAccountId) {
        adyenBalanceAccountId = data.attributes.adyenBalanceAccountId;
        console.log('%c FOUND ADYEN BALANCE ACCOUNT ID (ALTERNATE PATH): ', 'background: #009688; color: white; font-size: 14px; font-weight: bold;', adyenBalanceAccountId);
      } else {
        console.log('%c NO ADYEN BALANCE ACCOUNT ID FOUND ', 'background: #F44336; color: white; font-size: 14px; font-weight: bold;');
        // Log possible paths in the response to help debugging
        console.log('Response structure:', {
          hasDataObj: !!data?.data,
          hasAttributes: !!(data?.data?.attributes || data?.attributes),
          dataAttributesKeys: data?.data?.attributes ? Object.keys(data.data.attributes) : [],
          rootAttributesKeys: data?.attributes ? Object.keys(data.attributes) : []
        });
      }
      
      console.log('Sending response back to content script...');
      sendResponse({
        success: true,
        balanceAccountId: balanceAccountId,
        adyenBalanceAccountId: adyenBalanceAccountId,
        data: data.data || data
      });
      console.log('Response sent!');
    })
    .catch(error => {
      console.error(`Error fetching balance account details (${requestId || ''}):`, error);
      console.log('Error stack:', error.stack);
      sendResponse({
        success: false,
        error: error.message
      });
    });
}
