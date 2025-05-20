/**
 * PowerCloud Content Script
 * Runs on spend.cloud pages to capture authentication tokens
 * and provide additional functionality
 *
 * Note: CSS is loaded via the manifest.json content_scripts configuration
 */

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

// Load the feature scripts
Promise.all([
  loadScript('content_scripts/features/adyen-book.js'),
  loadScript('content_scripts/features/token-detector.js')
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
  
  if (window.tokenDetector) {
    console.log('%c ✓ window.tokenDetector is available', 'background: #4caf50; color: white');
  } else {
    console.log('%c ✗ window.tokenDetector is NOT available', 'background: #f44336; color: white');
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
  
  if (window.adyenCardInit) {
    console.log('%c ✓ window.adyenCardInit is available after DOM load', 'background: #4caf50; color: white');
  } else {
    console.log('%c ✗ window.adyenCardInit is NOT available after DOM load', 'background: #f44336; color: white');
  }
  
  if (window.tokenDetector) {
    console.log('%c ✓ window.tokenDetector is available after DOM load', 'background: #4caf50; color: white');
  } else {
    console.log('%c ✗ window.tokenDetector is NOT available after DOM load', 'background: #f44336; color: white');
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
    init: function() {
      // Use the init function from token-detector.js if available, otherwise fallback to local function
      if (window.tokenDetector && typeof window.tokenDetector.init === 'function') {
        return window.tokenDetector.init();
      } else {
        console.error('Error: tokenDetector.init function not found in token-detector.js');
      }
    },
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

// Initialize the extension using the FeatureManager from feature-manager.js
const featureManager = new window.FeatureManager(features).init();