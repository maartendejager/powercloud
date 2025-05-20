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
        resolve();
      };
      
      script.onerror = (err) => {
        if (attemptsLeft > 0) {
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

// Load feature scripts immediately to ensure they're available before URL matching happens
// Load the feature scripts
Promise.all([
  loadScript('content_scripts/features/adyen-book.js'),
  loadScript('content_scripts/features/token-detector.js')
]).catch(error => {
  // Keep only critical errors
  console.error('Error loading feature scripts:', error);
});

// Also try loading when DOM is ready as a fallback
document.addEventListener('DOMContentLoaded', () => {
  // Fallback loading check is done silently
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
    cleanup: function() {
      // Use the book-specific cleanup function if available, otherwise fall back to the card cleanup
      if (window.removeBookInfoButton) {
        return window.removeBookInfoButton();
      }
      return removeCardInfoButton();
    }
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
  }
}

/**
 * Load and initialize the book feature
 * @param {object} match - The URL match result containing capture groups  
 */
function loadBookFeature(match) {
  // Directly use the implementation from adyen-book.js
  if (typeof window.initBookFeature === 'function') {
    return window.initBookFeature(match);
  }
  
  // If for some reason the external implementation is not available,
  // log an error but don't try to use a local implementation
  console.error('Book feature implementation not found');
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
    // Show a basic alert as fallback
    alert(message);
  }
}

// Book feature functions are now imported from adyen-book.js

/**
 * Remove UI elements - uses implementation from adyen-card.js
 * This function is used as cleanup for both card and book features
 */
function removeCardInfoButton() {
  if (window.removeCardInfoButton) {
    return window.removeCardInfoButton();
  } else {
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