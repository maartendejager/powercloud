/**
 * Token Detector Feature Module
 *
 * This module provides functionality for detecting authentication tokens
 * on spend.cloud pages. It searches localStorage and sessionStorage for 
 * common token patterns and reports them to the extension background script.
 */

/**
 * Initialize the token detection feature
 * Detects and reports tokens found in localStorage or sessionStorage
 */
function initTokenDetection() {
  // Run an initial check
  checkForTokensInStorage();
  
  // Periodically check for tokens
  setInterval(checkForTokensInStorage, 30000);
  
  // Set up message listener for button visibility
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateButtonVisibility') {
      // Handle toggling button visibility
      const buttonHost = document.getElementById('powercloud-shadow-host');
      if (buttonHost) {
        buttonHost.className = message.showButtons ? 'powercloud-visible' : 'powercloud-hidden';
      }
      sendResponse({ status: 'Updated button visibility' });
    }
    return true;
  });
}

/**
 * Check for tokens in localStorage or sessionStorage
 */
function checkForTokensInStorage() {
  // First, check if we're on an API page
  const isApiRoute = window.location.href.match(/https:\/\/[^.]+\.spend\.cloud\/api\//);
  if (!isApiRoute) {
    return;
  }
  
  const storageLocations = [
    { type: 'localStorage', storage: localStorage },
    { type: 'sessionStorage', storage: sessionStorage }
  ];
  
  let foundTokens = [];
  
  // Common key names for auth tokens
  const possibleTokenKeys = [
    'token', 
    'authToken', 
    'jwt', 
    'accessToken', 
    'auth_token', 
    'id_token',
    'x_authorization_token'
  ];
  
  // Check each storage type
  storageLocations.forEach(({ type, storage }) => {
    // Try to find tokens in common key patterns
    possibleTokenKeys.forEach(key => {
      try {
        // Check for exact key match
        if (storage[key]) {
          foundTokens.push({
            token: storage[key],
            source: `${type}:${key}`
          });
        }
        
        // Check for keys containing the token name
        Object.keys(storage).forEach(storageKey => {
          if (storageKey.toLowerCase().includes(key) && !foundTokens.some(t => t.token === storage[storageKey])) {
            foundTokens.push({
              token: storage[storageKey],
              source: `${type}:${storageKey}`
            });
          }
        });
      } catch (e) {
        // Ignore errors, could be security restrictions
      }
    });
  });
  
  // If we found tokens, send them to the background script
  if (foundTokens.length > 0) {
    chrome.runtime.sendMessage({
      action: 'foundTokensInPage',
      tokens: foundTokens,
      url: window.location.href,
      timestamp: new Date().toISOString()
    });
  }
}

// Make functions available globally
window.tokenDetector = {
  init: initTokenDetection,
  checkStorage: checkForTokensInStorage
};