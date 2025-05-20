/**
 * PowerCloud Content Script
 * Runs on spend.cloud pages to capture authentication tokens
 * and provide additional functionality
 */

// Load styles for PowerCloud UI components
function loadPowerCloudStyles() {
  // Check if styles are already loaded
  if (document.getElementById('powercloud-styles')) {
    return;
  }

  // Create stylesheet link
  const link = document.createElement('link');
  link.id = 'powercloud-styles';
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = chrome.runtime.getURL('content_scripts/styles.css');
  document.head.appendChild(link);
}

// Load CSS styles immediately
loadPowerCloudStyles();

// Load adyen-book.js using a script tag dynamically instead of import
// This approach works with or without module support
function loadScript(src, retries = 3, delay = 500) {
  return new Promise((resolve, reject) => {
    const attemptLoad = (attemptsLeft) => {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL(src);
      
      script.onload = () => {
        console.log(`Successfully loaded script: ${src.split('/').pop()}`);
        resolve();
      };
      
      script.onerror = (err) => {
        console.error(`Error loading script: ${src}`, err);
        if (attemptsLeft > 0) {
          console.log(`Retrying script load (${attemptsLeft} attempts left)...`);
          setTimeout(() => attemptLoad(attemptsLeft - 1), delay);
        } else {
          reject(new Error(`Failed to load script: ${src} after multiple attempts`));
        }
      };
      
      // Add to document
      document.head.appendChild(script);
    };
    
    // Start loading with specified number of retries
    attemptLoad(retries);
  });
}

// Test Loading of Feature Scripts
console.log('%c TESTING FEATURE SCRIPT LOADING', 'background: #9c27b0; color: white; font-size: 16px; font-weight: bold;');

// Load feature scripts immediately to ensure they're available before URL matching happens
console.log('Attempting to load feature scripts for testing...');

// Load the feature script for adyen-book.js only since adyen-card.js is loaded via manifest
Promise.all([
  loadScript(chrome.runtime.getURL('content_scripts/features/adyen-book.js'))
]).then(() => {
  console.log('%c ✅ Feature scripts loaded successfully!', 'background: #4caf50; color: white; font-size: 14px; font-weight: bold;');
  
  // Debug check: see if the window functions are available
  if (window.initBookFeature) {
    console.log('%c ✓ window.initBookFeature is available', 'background: #4caf50; color: white');
  } else {
    console.log('%c ✗ window.initBookFeature is NOT available', 'background: #f44336; color: white');
  }
  
  if (window.adyenCardInit) {
    console.log('%c ✓ window.adyenCardInit is available', 'background: #4caf50; color: white');
  } else {
    console.log('%c ✗ window.adyenCardInit is NOT available', 'background: #f44336; color: white');
  }
}).catch(error => {
  console.error('Error loading feature scripts:', error);
});

// Also try loading when DOM is ready as a fallback
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded - Checking if feature scripts were successfully loaded');
  
  // Debug check: see if the window functions are available after DOM is loaded
  if (window.initBookFeature) {
    console.log('%c ✓ window.initBookFeature is available after DOM load', 'background: #4caf50; color: white');
  } else {
    console.log('%c ✗ window.initBookFeature is NOT available after DOM load', 'background: #f44336; color: white');
  }
});

/**
 * Feature registry for different page types
 * Each entry represents a feature with:
 * - urlPattern: RegExp to match the URL
 * - init: Function to initialize the feature
 * - cleanup: Function to clean up the feature when page changes (optional)
 */
const features = [
  {
    name: 'tokenDetection',
    urlPattern: /.*\.spend\.cloud.*/,  // Run on all spend.cloud pages
    init: initTokenDetection,
    cleanup: null  // No cleanup needed
  },
  {
    name: 'cardInfo',
    urlPattern: /https:\/\/([^.]+)\.spend\.cloud\/cards\/([^\/]+)(\/.*|$)/,
    init: initCardFeature,
    cleanup: removeCardInfoButton
  },
  {
    name: 'cardInfoProactive',
    urlPattern: /https:\/\/([^.]+)\.spend\.cloud\/proactive\/data\.card\/single_card_update\?id=([^&]+)/,
    init: initCardFeature,
    cleanup: removeCardInfoButton
  },
  {
    name: 'cardInfoKasboek',
    urlPattern: /https:\/\/([^.]+)\.spend\.cloud\/proactive\/kasboek\.passen\/show\?id=([^&]+)/,
    init: initCardFeature,
    cleanup: removeCardInfoButton
  },
  {
    name: 'bookInfo',
    urlPattern: /https:\/\/([^.]+)\.spend\.cloud\/proactive\/kasboek\.boekingen\/([^\/]+)(\/.*|$)/,
    init: loadBookFeature,
    cleanup: removeCardInfoButton  // We can reuse the same cleanup function
  }
  // Additional features can be registered here
];

/**
 * Initialize the token detection feature
 * Detects and reports tokens found in localStorage or sessionStorage
 */
function initTokenDetection() {
  // Run an initial check
  checkForTokensInStorage();
  
  // Periodically check for tokens
  setInterval(checkForTokensInStorage, 30000);
  
  // Set up message listener for token detection requests
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'checkPageForTokens') {
      checkForTokensInStorage();
      sendResponse({ status: 'Checked for tokens' });      } else if (message.action === 'updateButtonVisibility') {
        // Handle toggling button visibility
        const buttonHost = document.getElementById('powercloud-shadow-host');
        if (buttonHost) {
          buttonHost.className = message.showButtons ? 'powercloud-visible' : 'powercloud-hidden';
        }
        sendResponse({ status: 'Updated button visibility' });
      }
    return true;
  });
  
  console.log('Token detection feature initialized');
}

/**
 * Initialize the card feature - uses implementation from adyen-card.js
 * Adds functionality specific to card pages
 * @param {object} match - The URL match result containing capture groups
 */
function initCardFeature(match) {
  // Store the external reference using a different name to avoid recursion
  const adyenCardInit = window.adyenCardInit;
  
  // Call the implementation from adyen-card.js
  if (typeof adyenCardInit === 'function') {
    return adyenCardInit(match);
  } else {
    console.error('Error: adyenCardInit function not found in adyen-card.js');
  }
}

/**
 * Load and initialize the book feature
 * @param {object} match - The URL match result containing capture groups  
 */
function loadBookFeature(match) {
  if (!match || match.length < 3) {
    console.error('Invalid match for book feature:', match);
    return;
  }
  
  console.log('%c 🔍 TESTING: loadBookFeature called from main.js', 'background: #673ab7; color: white; font-size: 14px; font-weight: bold;');
  
  // Check for the external implementation with detailed logging
  if (typeof window.initBookFeature === 'function') {
    console.log('%c ✅ Using external initBookFeature from adyen-book.js', 'background: #4caf50; color: white; font-size: 14px; font-weight: bold;');
    
    // Log the source of the function if possible
    try {
      console.log('Function source check:', {
        exists: 'Yes',
        type: typeof window.initBookFeature,
        stringified: window.initBookFeature.toString().substring(0, 100) + '...',
        timestamp: new Date().toISOString()
      });
      
      // Call the external implementation and return to exit this function
      return window.initBookFeature(match);
    } catch (err) {
      console.error('Error using external initBookFeature:', err);
    }
  }
  
  // If external implementation doesn't exist, use local implementation with detailed debug info
  console.log('%c ⚠️ External initBookFeature not found, using local implementation', 'background: #ff9800; color: white; font-size: 14px; font-weight: bold;');
  console.log('Debug info:', {
    windowFunctions: Object.keys(window).filter(key => key.includes('init') || key.includes('Feature')),
    timestamp: new Date().toISOString()
  });
  
  const customer = match[1]; // Extract customer subdomain
  const bookId = match[2];   // Extract the actual book ID from URL
  
  console.log(`Found book page. Customer: ${customer}, Book ID: ${bookId}`);
  
  // Check if buttons should be shown before fetching book details
  chrome.storage.local.get('showButtons', (result) => {
    const showButtons = result.showButtons === undefined ? true : result.showButtons;
    
    if (!showButtons) {
      console.log('Buttons are disabled. Skipping button creation.');
      return;
    }
    
    // First fetch book details to determine book type before adding button
    chrome.runtime.sendMessage(
      { 
        action: "fetchBookDetails", 
        customer: customer, 
        bookId: bookId 
      },
      (response) => {
        if (response && response.success) {
          const bookType = response.bookType;
          const adyenBalanceAccountId = response.adyenBalanceAccountId;
          const administrationId = response.administrationId;
          const balanceAccountReference = response.balanceAccountReference;
          
          console.log(`Book Details: Type=${bookType}, AdministrationId=${administrationId || 'N/A'}`);
          
          // Log more details for monetary_account_book type
          if (bookType === 'monetary_account_book') {
            console.log('Special book type detected: monetary_account_book');
          }
          
          addAdyenBookInfoButton(customer, bookId, bookType, adyenBalanceAccountId, administrationId, balanceAccountReference);
        } else {
          const errorMessage = response?.error || 'Failed to fetch book details';
          console.error(`Error fetching book details: ${errorMessage}`);
        }
      }
    );
  });
}

/**
 * Check for tokens in localStorage or sessionStorage
 */
function checkForTokensInStorage() {
  // First, check if we're on an API page
  const isApiRoute = window.location.href.match(/https:\/\/[^.]+\.spend\.cloud\/api\//);
  if (!isApiRoute) {
    console.log('Not an API route, skipping token detection');
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

// Card feature functions are now imported from adyen-card.js

/**
 * Shows a result message for card info operations - uses implementation from adyen-card.js
 * @param {string} message - The message to display 
 */
function showCardInfoResult(message) {
  if (window.showCardInfoResult) {
    return window.showCardInfoResult(message);
  } else {
    console.error('Error: showCardInfoResult function not found in adyen-card.js');
    // Show a basic alert as fallback
    alert(message);
  }
}

// Book feature functions
/**
 * Adds a button to view balance account at Adyen if it's a monetary_account_book
 * @param {string} customer - The customer subdomain
 * @param {string} bookId - The book ID
 * @param {string} bookType - The type of book
 * @param {string} balanceAccountId - The Adyen balance account ID if available
 * @param {string} administrationId - The administration ID if available
 * @param {string} balanceAccountReference - Optional reference/name for the balance account
 */
function addAdyenBookInfoButton(customer, bookId, bookType, balanceAccountId, administrationId, balanceAccountReference) {
  // Only show button for monetary_account_book type
  if (bookType !== 'monetary_account_book') {
    console.log(`Book type is '${bookType}', not 'monetary_account_book'. No button will be added.`);
    return;
  }
  
  // Check if button already exists
  if (document.getElementById('powercloud-shadow-host')) {
    return;
  }

  // Create shadow DOM host element
  const shadowHost = document.createElement('div');
  shadowHost.id = 'powercloud-shadow-host'; 
  // The positioning styles are now in the CSS file
  
  // Check if buttons should be hidden by default
  chrome.storage.local.get('showButtons', (result) => {
    const showButtons = result.showButtons === undefined ? true : result.showButtons;
    shadowHost.className = showButtons ? 'powercloud-visible' : 'powercloud-hidden';
  });
  
  // Attach a shadow DOM tree to completely isolate our styles
  const shadowRoot = shadowHost.attachShadow({ mode: 'closed' });
  
  // Add link to our external stylesheet in shadow DOM
  const linkElem = document.createElement('link');
  linkElem.rel = 'stylesheet';
  linkElem.href = chrome.runtime.getURL('content_scripts/styles.css');
  shadowRoot.appendChild(linkElem);

  // Create button container with styling
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'powercloud-container powercloud-button-container';
  buttonContainer.id = 'powercloud-button-container';

  // Create the button
  const button = document.createElement('button');
  button.id = 'powercloud-book-info-btn';
  button.className = 'powercloud-button';
  
  // Set button text to "Monetary Account Book"
  button.innerHTML = 'Monetary Account Book';
  
  // If we have administration ID, display it
  if (administrationId) {
    const adminBadge = document.createElement('div');
    adminBadge.className = 'powercloud-admin-badge';
    adminBadge.textContent = `Admin ID: ${administrationId}`;
    buttonContainer.appendChild(adminBadge);
  }
  
  // Set button state based on balance account availability
  if (balanceAccountId) {
    // Create badge for balance account reference if available
    if (balanceAccountReference) {
      const refBadge = document.createElement('div');
      refBadge.className = 'powercloud-balance-badge';
      refBadge.textContent = `Balance Account: ${balanceAccountReference}`;
      buttonContainer.appendChild(refBadge);
    }
    
    button.disabled = false;
    button.title = `View balance account details at Adyen`;
    
    // Add click event to open Adyen balance account page
    button.addEventListener('click', () => {
      const originalText = button.innerHTML;
      button.innerHTML = '⏳ Loading...';
      button.disabled = true;
      
      // Open Adyen directly in a new tab
      const adyenUrl = `https://balanceplatform-live.adyen.com/balanceplatform/balance-accounts/${balanceAccountId}`;
      window.open(adyenUrl, '_blank');
      
      // Restore button text
      setTimeout(() => {
        button.innerHTML = originalText;
        button.disabled = false;
      }, 1500);
    });
  } else {
    button.disabled = true;
    button.title = `This monetary account book doesn't have a linked Adyen balance account`;
  }

  // Add button to container and container to shadow DOM
  buttonContainer.appendChild(button);
  shadowRoot.appendChild(buttonContainer);
  
  // Add shadow host to the page
  document.body.appendChild(shadowHost);
}

/**
 * Remove card info button - uses implementation from adyen-card.js
 */
function removeCardInfoButton() {
  if (window.removeCardInfoButton) {
    return window.removeCardInfoButton();
  } else {
    console.error('Error: removeCardInfoButton function not found in adyen-card.js');
    
    // Fallback implementation if the function is not available from adyen-card.js
    const shadowHost = document.getElementById('powercloud-shadow-host');
    if (shadowHost) {
      shadowHost.remove();
    }
    
    const resultHost = document.getElementById('powercloud-result-host');
    if (resultHost) {
      resultHost.remove();
    }
  }
}

/**
 * Feature Manager
 * Handles loading and unloading features based on page URL
 */
class FeatureManager {
  constructor() {
    this.activeFeatures = new Set();
    this.lastUrl = window.location.href;
  }
  
  /**
   * Check current page and load appropriate features
   */
  checkPage() {
    const url = window.location.href;
    console.log(`Checking page: ${url}`);
    
    // Clean up features if URL changed
    if (url !== this.lastUrl) {
      this.cleanup();
      this.lastUrl = url;
    }
    
    // Load features that match the current URL
    features.forEach(feature => {
      const match = url.match(feature.urlPattern);
      if (match && !this.activeFeatures.has(feature.name)) {
        console.log(`Initializing feature: ${feature.name}`);
        feature.init(match);
        this.activeFeatures.add(feature.name);
      }
    });
  }
  
  /**
   * Clean up active features
   */
  cleanup() {
    features.forEach(feature => {
      if (this.activeFeatures.has(feature.name) && feature.cleanup) {
        console.log(`Cleaning up feature: ${feature.name}`);
        feature.cleanup();
        this.activeFeatures.delete(feature.name);
      }
    });
  }
  
  /**
   * Set up URL change detection
   */
  setupUrlChangeDetection() {
    // Use MutationObserver for SPA detection
    const urlChangeObserver = new MutationObserver(() => {
      const currentUrl = window.location.href;
      if (this.lastUrl !== currentUrl) {
        console.log(`URL changed from ${this.lastUrl} to ${currentUrl}`);
        this.checkPage();
      }
    });
    
    // Observe the entire document for changes
    urlChangeObserver.observe(document, { 
      subtree: true, 
      childList: true,
      attributes: true, 
      characterData: false 
    });
    
    // Additional fallback check for SPAs that don't trigger DOM mutations
    setInterval(() => {
      const currentUrl = window.location.href;
      if (this.lastUrl !== currentUrl) {
        console.log(`URL change detected by interval: ${this.lastUrl} to ${currentUrl}`);
        this.checkPage();
      }
    }, 1000);
  }
  
  /**
   * Initialize the feature manager
   */
  init() {
    this.checkPage();
    this.setupUrlChangeDetection();
    console.log('PowerCloud feature manager initialized');
  }
}

// Initialize the extension
const featureManager = new FeatureManager();
featureManager.init();