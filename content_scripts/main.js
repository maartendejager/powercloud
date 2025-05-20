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
// Note: We check if the script-specific functions exist first to prevent duplicate loading
// if the script was already loaded via manifest
const scriptsToLoad = [];

// Only load adyen-book.js if its namespace doesn't already exist
if (!window.PowerCloudFeatures?.book?.init) {
  scriptsToLoad.push(loadScript('content_scripts/features/adyen-book.js'));
}

// Only load token-detector.js if its namespace doesn't already exist
if (!window.PowerCloudFeatures?.tokenDetector?.init) {
  scriptsToLoad.push(loadScript('content_scripts/features/token-detector.js'));
}

if (scriptsToLoad.length > 0) {
  Promise.all(scriptsToLoad).catch(error => {
    console.error('Error loading feature scripts:', error);
  });
}

// Initialize the PowerCloudFeatures namespace if it doesn't exist already
window.PowerCloudFeatures = window.PowerCloudFeatures || {};

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
      // Use the init function from token-detector.js using the PowerCloudFeatures namespace
      if (window.PowerCloudFeatures?.tokenDetector?.init) {
        return window.PowerCloudFeatures.tokenDetector.init();
      }
    },
    cleanup: null  // No cleanup needed
  },
  {
    name: 'cardInfo',
    urlPattern: /https:\/\/([^.]+)\.spend\.cloud\/cards\/([^\/]+)(\/.*|$)/,
    init: initCardFeature,
    cleanup: function() {
      // Use the card-specific cleanup function from the namespace
      if (window.PowerCloudFeatures?.card?.cleanup) {
        return window.PowerCloudFeatures.card.cleanup();
      }
      return removeCardInfoButton();
    }
  },
  {
    name: 'cardInfoProactive',
    urlPattern: /https:\/\/([^.]+)\.spend\.cloud\/proactive\/data\.card\/single_card_update\?id=([^&]+)/,
    init: initCardFeature,
    cleanup: function() {
      // Use the card-specific cleanup function from the namespace
      if (window.PowerCloudFeatures?.card?.cleanup) {
        return window.PowerCloudFeatures.card.cleanup();
      }
      return removeCardInfoButton();
    }
  },
  {
    name: 'cardInfoKasboek',
    urlPattern: /https:\/\/([^.]+)\.spend\.cloud\/proactive\/kasboek\.passen\/show\?id=([^&]+)/,
    init: initCardFeature,
    cleanup: function() {
      // Use the card-specific cleanup function from the namespace
      if (window.PowerCloudFeatures?.card?.cleanup) {
        return window.PowerCloudFeatures.card.cleanup();
      }
      return removeCardInfoButton();
    }
  },
  {
    name: 'bookInfo',
    urlPattern: /https:\/\/([^.]+)\.spend\.cloud\/proactive\/kasboek\.boekingen\/([^\/]+)(\/.*|$)/,
    init: loadBookFeature,
    cleanup: function() {
      // Use the book-specific cleanup function from the namespace
      if (window.PowerCloudFeatures?.book?.cleanup) {
        return window.PowerCloudFeatures.book.cleanup();
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
  // Call the implementation from adyen-card.js using the PowerCloudFeatures namespace
  if (window.PowerCloudFeatures?.card?.init) {
    return window.PowerCloudFeatures.card.init(match);
  }
}

/**
 * Load and initialize the book feature
 * @param {object} match - The URL match result containing capture groups  
 */
function loadBookFeature(match) {
  // Use the implementation from adyen-book.js using the PowerCloudFeatures namespace
  if (window.PowerCloudFeatures?.book?.init) {
    return window.PowerCloudFeatures.book.init(match);
  }
  
  // If for some reason the external implementation is not available,
  // log an error but don't try to use a local implementation
  console.error('Book feature implementation not found');
}

// Card feature functions are now imported from adyen-card.js
// Book feature functions are now imported from adyen-book.js

/**
 * Generic cleanup utility for UI elements
 * Delegates to feature-specific implementations when available (from adyen-card.js or adyen-book.js)
 * This function is used as cleanup for both card and book features
 */
function removeCardInfoButton() {
  // For card features, use the implementation from adyen-card.js using the PowerCloudFeatures namespace
  if (window.PowerCloudFeatures?.card?.cleanup) {
    return window.PowerCloudFeatures.card.cleanup();
  }
  
  // For book features, use the implementation from adyen-book.js using the PowerCloudFeatures namespace
  if (window.PowerCloudFeatures?.book?.cleanup) {
    return window.PowerCloudFeatures.book.cleanup();
  }
  
  // As a last resort, perform generic cleanup if neither implementation is available
  console.warn('No feature-specific cleanup implementation found, using generic cleanup');
  
  const shadowHost = document.getElementById('powercloud-shadow-host');
  if (shadowHost) {
    shadowHost.remove();
  }
  
  const resultHost = document.getElementById('powercloud-result-host');
  if (resultHost) {
    resultHost.remove();
  }
}

// Initialize the extension using the FeatureManager from feature-manager.js
const featureManager = new window.FeatureManager(features).init();