/**
 * PowerCloud Content Script
 * Runs on spend.cloud pages to capture authentication tokens
 * and provide additional functionality
 *
 * Note: All feature scripts and CSS are loaded via the manifest.json content_scripts configuration
 * This ensures a consistent loading strategy through manifest-only injection.
 * 
 * IMPORTANT: Do not attempt to dynamically load scripts here.
 * All feature scripts must be loaded via manifest.json before this script runs.
 * 
 * URL Pattern Note: All URL patterns support both standard customer domains (https://[customer].spend.cloud/*)
 * and dev environments (https://[customer].dev.spend.cloud/*).
 */

// Initialize the PowerCloudFeatures namespace if it doesn't exist already
// All feature scripts should be loaded via manifest.json before this code runs
window.PowerCloudFeatures = window.PowerCloudFeatures || {};
window.PowerCloudFeatures.main = window.PowerCloudFeatures.main || {};

// Import URL patterns from shared module using dynamic import
if (!window.PowerCloudFeatures.main.urlPatterns) {
  window.PowerCloudFeatures.main.urlPatterns = null;
  (async () => {
    try {
      const module = await import(chrome.runtime.getURL('/shared/url-patterns.js'));
      window.PowerCloudFeatures.main.urlPatterns = module;
      console.log('URL patterns loaded successfully in main.js');
      
      // Update feature registry with loaded patterns
      updateFeatureRegistry(window.PowerCloudFeatures.main.urlPatterns);
    } catch (error) {
      console.error('Failed to load URL patterns:', error);
    }
  })();
}

/**
 * Updates the feature registry with patterns from the URL patterns module
 * @param {Object} patterns - The URL patterns module
 */
function updateFeatureRegistry(patterns) {
  if (!patterns) return;
  
  // Update URL patterns in the feature registry
  if (features && features.length) {
    features.forEach(feature => {
      if (feature.name === 'tokenDetection') {
        feature.urlPattern = patterns.ANY_SPEND_CLOUD_DOMAIN;
      } else if (feature.name === 'cardInfo') {
        feature.urlPattern = patterns.CARD_PATTERNS.standard;
      } else if (feature.name === 'cardInfoProactive') {
        feature.urlPattern = patterns.CARD_PATTERNS.proactive;
      } else if (feature.name === 'cardInfoKasboek') {
        feature.urlPattern = patterns.CARD_PATTERNS.kasboek;
      } else if (feature.name === 'bookInfo') {
        feature.urlPattern = patterns.BOOK_PATTERN;
      }
    });
    console.log('Feature registry updated with shared URL patterns');
  }
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
    urlPattern: /.*\.spend\.cloud.*|.*\.dev\.spend\.cloud.*/,  // Run on all spend.cloud pages (including .dev subdomains)
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
    urlPattern: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/cards\/([^\/]+)(\/.*|$)/,
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
    urlPattern: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/data\.card\/single_card_update\?id=([^&]+)/,
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
    urlPattern: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/kasboek\.passen\/show\?id=([^&]+)/,
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
    urlPattern: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/kasboek\.boekingen\/([^\/]+)(\/.*|$)/,
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
  // Use the implementation from adyen-book.js which is loaded via manifest
  if (window.PowerCloudFeatures?.book?.init) {
    return window.PowerCloudFeatures.book.init(match);
  } else {
    console.error('Book feature implementation not found. Check that adyen-book.js is properly included in manifest.json');
  }
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