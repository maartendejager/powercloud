/**
 * Token Detector Feature Module
 *
 * This module provides functionality for detecting authentication tokens
 * on spend.cloud and dev.spend.cloud pages. It searches localStorage and sessionStorage for 
 * common token patterns and reports them to the extension background script.
 * 
 * The detector ensures tokens are only used within matching environments (same customer subdomain
 * and same environment type - dev or non-dev).
 *
 * Loading Method: Manifest-only
 * This script is loaded via the manifest.json content_scripts configuration.
 */

// Initialize the PowerCloudFeatures namespace if it doesn't exist
window.PowerCloudFeatures = window.PowerCloudFeatures || {};
window.PowerCloudFeatures.tokenDetector = window.PowerCloudFeatures.tokenDetector || {};

/**
 * Extract environment information from a URL
 * @param {string} url - The URL to parse
 * @returns {Object|null} Object with customer subdomain and isDev flag, or null if not a spend.cloud URL
 */
function extractEnvironmentInfo(url) {
  // Match for spend.cloud domains (with optional dev prefix)
  const match = url.match(/https:\/\/([^.]+)\.(?:(dev)\.)?spend\.cloud/);
  if (!match) return null;
  
  return {
    customer: match[1],
    isDev: !!match[2]
  };
}

/**
 * Check if two environments match (same customer and same environment type)
 * @param {Object} env1 - First environment object { customer, isDev }
 * @param {Object} env2 - Second environment object { customer, isDev }
 * @returns {boolean} - True if environments match
 */
function environmentsMatch(env1, env2) {
  return env1.customer === env2.customer && env1.isDev === env2.isDev;
}

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
  console.log('nopeeeeeeeeeeeeeeeee')
  return
  // First, check if we're on an API page
  const isApiRoute = window.location.href.match(/https:\/\/[^.]+\.(?:dev\.)?spend\.cloud\/api\//);
  if (!isApiRoute) {
    return;
  }
  
  // Extract current environment information
  const currentEnvironment = extractEnvironmentInfo(window.location.href);
  if (!currentEnvironment) {
    return; // Not a recognized spend.cloud domain
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
          // Try to extract environment info from the token if it contains a URL or domain
          const tokenValue = storage[key];
          let tokenEnvironment = null;
          
          // Check if this token belongs to the current environment
          // For now we assume if the key matches our pattern, it belongs to the current domain
          // In a more sophisticated implementation, you might parse the JWT to get more info
          foundTokens.push({
            token: tokenValue,
            source: `${type}:${key}`,
            environment: currentEnvironment
          });
        }
        
        // Check for keys containing the token name
        Object.keys(storage).forEach(storageKey => {
          if (storageKey.toLowerCase().includes(key)) {
            // Check if this is an environment-aware storage key
            const envMatch = storageKey.match(/^(.+)_(dev_)?([^_]+)$/);
            
            if (envMatch) {
              // This appears to be an environment-aware key
              const keyCustomer = envMatch[3];
              const keyIsDev = !!envMatch[2];
              const keyEnvironment = { customer: keyCustomer, isDev: keyIsDev };
              
              // Only include this token if it matches our current environment
              if (environmentsMatch(currentEnvironment, keyEnvironment) && 
                  !foundTokens.some(t => t.token === storage[storageKey])) {
                foundTokens.push({
                  token: storage[storageKey],
                  source: `${type}:${storageKey}`,
                  environment: keyEnvironment
                });
              }
            } else if (!foundTokens.some(t => t.token === storage[storageKey])) {
              // For non-environment keys, assume they belong to current environment
              foundTokens.push({
                token: storage[storageKey],
                source: `${type}:${storageKey}`,
                environment: currentEnvironment
              });
            }
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

// Register token detector functions in the PowerCloud namespace
window.PowerCloudFeatures.tokenDetector = {
  init: initTokenDetection,
  checkStorage: checkForTokensInStorage,
  // Expose utility functions for potential reuse
  extractEnvironmentInfo: extractEnvironmentInfo,
  environmentsMatch: environmentsMatch
};