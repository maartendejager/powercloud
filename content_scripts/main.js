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

/**
 * Feature registry for different page types
 * Each entry represents a feature with:
 * - urlPattern: RegExp to match the URL
 * - init: Function to initialize the feature
 * - cleanup: Function to clean up the feature when page changes (optional)
 */
const features = [
  {
    name: 'uiVisibilityManager', // Renamed from tokenDetection
    urlPattern: /.*\.spend\.cloud.*|.*\.dev\.spend\.cloud.*/,  // Run on all spend.cloud pages (including .dev subdomains)
    init: function() {
      // Use the init function from ui-visibility-manager.js using the PowerCloudFeatures namespace
      if (window.PowerCloudFeatures?.uiVisibilityManager?.init) {
        return window.PowerCloudFeatures.uiVisibilityManager.init();
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
    name: 'entriesInfo',
    urlPattern: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/kasboek\.boekingen\/show\?id=([^&]+)/,
    init: loadEntriesFeature,
    excludes: ['bookInfo'], // Exclude the bookInfo feature when on entry pages
    cleanup: function() {
      // Use the entries-specific cleanup function from the namespace
      if (window.PowerCloudFeatures?.entries?.cleanup) {
        return window.PowerCloudFeatures.entries.cleanup();
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
    // Feature not found - should never happen with manifest loading
  }
}

/**
 * Load and initialize the entries feature
 * @param {object} match - The URL match result containing capture groups  
 */
function loadEntriesFeature(match) {
  // Use the implementation from adyen-entries.js which is loaded via manifest
  if (window.PowerCloudFeatures?.entries?.init) {
    return window.PowerCloudFeatures.entries.init(match);
  } else {
    // Feature not found - should never happen with manifest loading
  }
}

// Card feature functions are now imported from adyen-card.js
// Book feature functions are now imported from adyen-book.js

/**
 * Generic cleanup utility for UI elements
 * Delegates to feature-specific implementations when available
 * This function is used as cleanup for card, book, and entries features
 */
function removeCardInfoButton() {
  // For card features, use the implementation from adyen-card.js
  if (window.PowerCloudFeatures?.card?.cleanup) {
    return window.PowerCloudFeatures.card.cleanup();
  }
  
  // For book features, use the implementation from adyen-book.js
  if (window.PowerCloudFeatures?.book?.cleanup) {
    return window.PowerCloudFeatures.book.cleanup();
  }
  
  // For entries features, use the implementation from adyen-entries.js
  if (window.PowerCloudFeatures?.entries?.cleanup) {
    return window.PowerCloudFeatures.entries.cleanup();
  }
  
  // As a last resort, perform generic cleanup if no implementation is available
  
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