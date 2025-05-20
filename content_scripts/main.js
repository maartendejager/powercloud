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
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(src);
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

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
      sendResponse({ status: 'Checked for tokens' });
    } else if (message.action === 'updateButtonVisibility') {
      // Handle toggling button visibility
      const buttonHost = document.getElementById('powercloud-shadow-host');
      if (buttonHost) {
        buttonHost.style.display = message.showButtons ? 'block' : 'none';
      }
      sendResponse({ status: 'Updated button visibility' });
    }
    return true;
  });
  
  console.log('Token detection feature initialized');
}

/**
 * Initialize the card feature
 * Adds functionality specific to card pages
 * @param {object} match - The URL match result containing capture groups
 */
function initCardFeature(match) {
  if (!match || match.length < 3) return;
  
  const customer = match[1]; // Extract customer subdomain
  const cardId = match[2];   // Extract the actual card ID from URL
  
  console.log(`Found card page. Customer: ${customer}, Card ID: ${cardId}`);
  
  // Check if buttons should be shown before fetching card details
  chrome.storage.local.get('showButtons', (result) => {
    const showButtons = result.showButtons === undefined ? true : result.showButtons;
    
    if (!showButtons) {
      console.log('Buttons are disabled. Skipping button creation.');
      return;
    }
    
    // First fetch card details to determine vendor before adding button
    chrome.runtime.sendMessage(
      { 
        action: "fetchCardDetails", 
        customer: customer, 
        cardId: cardId 
      },
      (response) => {
        if (response && response.success) {
          const isAdyenCard = response.vendor === 'adyen';
          addCardInfoButton(customer, cardId, isAdyenCard, response.vendor);
        } else {
          // If we can't determine vendor, add button with default behavior
          addCardInfoButton(customer, cardId, true);
        }
      }
    );
  });
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

// Card feature functions
function addCardInfoButton(customer, cardId, isAdyenCard = true, vendor = null) {
  // Check if button already exists
  if (document.getElementById('powercloud-shadow-host')) {
    return;
  }

  // Create shadow DOM host element
  const shadowHost = document.createElement('div');
  shadowHost.id = 'powercloud-shadow-host'; 
  
  // Position the host element with inline styles that won't leak to other elements
  shadowHost.style.position = 'fixed';
  shadowHost.style.bottom = '20px';
  shadowHost.style.right = '20px';
  shadowHost.style.zIndex = '9999';
  
  // Check if buttons should be hidden by default
  chrome.storage.local.get('showButtons', (result) => {
    const showButtons = result.showButtons === undefined ? true : result.showButtons;
    shadowHost.style.display = showButtons ? 'block' : 'none';
  });
  
  // Attach a shadow DOM tree to completely isolate our styles
  const shadowRoot = shadowHost.attachShadow({ mode: 'closed' });
  
  // Add comprehensive styles to shadow DOM
  const style = document.createElement('style');
  style.textContent = `
    /* Base container style */
    .powercloud-container {
      font-family: Arial, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      color: #333;
      background-color: transparent;
    }
    
    /* Button styling */
    .powercloud-button {
      background-color: #4CAF50;
      color: white;
      padding: 10px 15px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      transition: background-color 0.3s;
      font-family: Arial, sans-serif;
      font-size: 14px;
      text-align: center;
    }
    
    .powercloud-button:hover {
      background-color: #3e8e41;
    }
    
    .powercloud-button:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
    
    /* Button container */
    .powercloud-button-container {
      margin: 0;
      padding: 0;
    }
  `;
  shadowRoot.appendChild(style);

  // Create button container with styling
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'powercloud-container powercloud-button-container';
  buttonContainer.id = 'powercloud-button-container';

  // Create the button
  const button = document.createElement('button');
  button.id = 'powercloud-card-info-btn';
  button.className = 'powercloud-button';
  
  // Set button text and state based on vendor
  if (isAdyenCard) {
    button.innerHTML = '🔍 View Card at Adyen';
    button.disabled = false;
  } else {
    button.innerHTML = '⚠️ Non Adyen Card';
    button.disabled = true;
    
    // Show more info if we know the vendor
    if (vendor) {
      button.title = `This card is issued by ${vendor}, not Adyen`;
    } else {
      button.title = 'This card is not issued by Adyen';
    }
  }

  // Add click event only if it's an Adyen card
  if (isAdyenCard) {
    button.addEventListener('click', () => {
      const originalText = button.innerHTML;
      button.innerHTML = '⏳ Loading...';
      button.disabled = true;
      
      console.log(`Fetching card details for customer: ${customer}, cardId: ${cardId}`);
      
      // Get card details and navigate directly to Adyen
      chrome.runtime.sendMessage(
        { 
          action: "fetchCardDetails", 
          customer: customer, 
          cardId: cardId 
        }, 
        (response) => {
          button.innerHTML = originalText;
          button.disabled = false;
          
          console.log('Card details response:', response);
          
          if (!response || !response.success) {
            showCardInfoResult(`Error: ${response?.error || 'Failed to fetch card details'}`);
            return;
          }
          
          if (!response.paymentInstrumentId) {
            showCardInfoResult('No Adyen Payment Instrument ID found for this card. This card may not be linked to an Adyen account yet.');
            return;
          }
          
          // Open Adyen directly in a new tab
          const paymentInstrumentId = response.paymentInstrumentId;
          console.log(`Opening Adyen with payment instrument ID: ${paymentInstrumentId}`);
          const adyenUrl = `https://balanceplatform-live.adyen.com/balanceplatform/payment-instruments/${paymentInstrumentId}`;
          window.open(adyenUrl, '_blank');
        }
      );
    });
  }

  // Add button to container and container to shadow DOM
  buttonContainer.appendChild(button);
  shadowRoot.appendChild(buttonContainer);
  
  // Add shadow host to the page
  document.body.appendChild(shadowHost);
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
    shadowHost.style.display = showButtons ? 'block' : 'none';
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

function removeCardInfoButton() {
  // Remove the shadow host for the button
  const shadowHost = document.getElementById('powercloud-shadow-host');
  if (shadowHost) {
    shadowHost.remove();
  }
  
  // Also remove any result shadow host that might be showing
  const resultHost = document.getElementById('powercloud-result-host');
  if (resultHost) {
    resultHost.remove();
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