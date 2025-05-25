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

// Initialize logging early
let mainLogger;
if (window.loggerFactory) {
  mainLogger = window.loggerFactory.createLogger('Main');
  mainLogger.info('Main script loaded');
  mainLogger.info('PowerCloudFeatures namespace initialized');
  mainLogger.info('Available features', { features: Object.keys(window.PowerCloudFeatures) });
  mainLogger.info('BaseFeature available', { available: typeof window.BaseFeature !== 'undefined' });
  mainLogger.info('Current URL', { url: window.location.href });
}

// Initialize enhanced debugging system
if (window.enhancedDebug && window.loggerFactory) {
  const debugLogger = window.loggerFactory.createLogger('Main');
  window.enhancedDebug.initialize(debugLogger, {
    enabled: true,
    mode: window.DebugMode?.BASIC || 1,
    enablePerformanceTracking: true,
    enableUsageTracking: true
  });
  
  debugLogger.info('Enhanced debugging system initialized');
} else {
  if (mainLogger) {
    mainLogger.warn('Enhanced debugging system not available, using basic logging');
  }
}

// Initialize the enhanced feature manager with error boundaries
const safeFeatureManager = new window.PowerCloudSafeFeatureManager();
window.PowerCloudFeatureManager = safeFeatureManager;

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
    urlPattern: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/kasboek\.boekingen\/(\d+)(\/.*|$)/,
    init: loadBookFeature,
    cleanup: function() {
      // Use the book-specific cleanup function from the namespace
      if (window.PowerCloudFeatures?.book?.cleanup) {
        return window.PowerCloudFeatures.book.cleanup();
      }
      return removeCardInfoButton();
    }
  },
  {
    name: 'adyenBookInfo',
    urlPattern: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/book\/([^\/]+)(\/.*|$)/,
    init: loadBookFeature,
    cleanup: function() {
      // Use the book-specific cleanup function from the namespace
      if (window.PowerCloudFeatures?.book?.cleanup) {
        return window.PowerCloudFeatures.book.cleanup();
      }
    }
  },
  {
    name: 'adyenEntriesInfo',
    urlPattern: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/entries\/([^\/]+)(\/.*|$)/,
    init: loadEntriesFeature,
    cleanup: function() {
      // Use the entries-specific cleanup function from the namespace
      if (window.PowerCloudFeatures?.entries?.cleanup) {
        return window.PowerCloudFeatures.entries.cleanup();
      }
    }
  }
  // Additional features can be registered here
];

/**
 * Initialize the card feature - uses implementation from adyen-card.js
 * Adds functionality specific to card pages
 * @param {object} match - The URL match result containing capture groups
 */
async function initCardFeature(match) {
  const logger = window.loggerFactory ? window.loggerFactory.createLogger('Main') : null;
  
  if (logger) {
    logger.info('initCardFeature called', { match });
    logger.debug('PowerCloudFeatures state', {
      exists: !!window.PowerCloudFeatures,
      keys: window.PowerCloudFeatures ? Object.keys(window.PowerCloudFeatures) : [],
      card: !!window.PowerCloudFeatures?.card
    });
  }
  
  // Wait for adyen-card feature to be available (with timeout)
  let attempts = 0;
  const maxAttempts = 10;
  const delay = 100; // 100ms between attempts
  
  while (attempts < maxAttempts) {
    if (window.PowerCloudFeatures?.card?.init) {
      if (logger) {
        logger.info('Calling adyen-card feature init', { attempt: attempts + 1 });
      }
      return await window.PowerCloudFeatures.card.init(match);
    }
    
    attempts++;
    if (logger) {
      logger.debug('Waiting for adyen-card feature to register', { 
        attempt: attempts, 
        maxAttempts 
      });
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  if (logger) {
    logger.error('adyen-card feature failed to register', { maxAttempts });
  }
}

/**
 * Load and initialize the book feature
 * @param {object} match - The URL match result containing capture groups  
 */
async function loadBookFeature(match) {
  const logger = window.loggerFactory ? window.loggerFactory.createLogger('Main') : null;
  
  if (logger) {
    logger.info('loadBookFeature called', { match });
    logger.debug('PowerCloudFeatures state', {
      exists: !!window.PowerCloudFeatures,
      keys: window.PowerCloudFeatures ? Object.keys(window.PowerCloudFeatures) : [],
      book: !!window.PowerCloudFeatures?.book
    });
  }
  
  // Wait for adyen-book feature to be available (with timeout)
  let attempts = 0;
  const maxAttempts = 10;
  const delay = 100; // 100ms between attempts
  
  while (attempts < maxAttempts) {
    if (window.PowerCloudFeatures?.book?.init) {
      if (logger) {
        logger.info('Calling adyen-book feature init', { attempt: attempts + 1 });
      }
      return await window.PowerCloudFeatures.book.init(match);
    }
    
    attempts++;
    if (logger) {
      logger.debug('Waiting for adyen-book feature to register', { 
        attempt: attempts, 
        maxAttempts 
      });
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  if (logger) {
    logger.error('adyen-book feature failed to register', { maxAttempts });
  }
}

/**
 * Load and initialize the entries feature
 * @param {object} match - The URL match result containing capture groups  
 */
async function loadEntriesFeature(match) {
  const logger = window.loggerFactory ? window.loggerFactory.createLogger('Main') : null;
  
  if (logger) {
    logger.info('loadEntriesFeature called', { match });
    logger.debug('PowerCloudFeatures state', {
      exists: !!window.PowerCloudFeatures,
      keys: window.PowerCloudFeatures ? Object.keys(window.PowerCloudFeatures) : [],
      entries: !!window.PowerCloudFeatures?.entries
    });
  }
  
  // Wait for adyen-entries feature to be available (with timeout)
  let attempts = 0;
  const maxAttempts = 10;
  const delay = 100; // 100ms between attempts
  
  while (attempts < maxAttempts) {
    if (window.PowerCloudFeatures?.entries?.init) {
      if (logger) {
        logger.info('Calling adyen-entries feature init', { attempt: attempts + 1 });
      }
      return await window.PowerCloudFeatures.entries.init(match);
    }
    
    attempts++;
    if (logger) {
      logger.debug('Waiting for adyen-entries feature to register', { 
        attempt: attempts, 
        maxAttempts 
      });
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  if (logger) {
    logger.error('adyen-entries feature failed to register', { maxAttempts });
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

// Initialize the extension using enhanced SafeFeatureManager with error boundaries
async function initializeExtension() {
  const logger = window.loggerFactory ? window.loggerFactory.createLogger('Main') : null;
  
  try {
    // Record extension initialization start event in health dashboard
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'recordFeatureEvent',
        featureName: 'extension',
        event: 'init',
        level: 'info',
        logMessage: 'Extension initialization started',
        data: { 
          url: window.location.href,
          timestamp: Date.now(),
          userAgent: navigator.userAgent
        }
      }).catch(() => {}); // Ignore errors to avoid blocking initialization
    }
    
    if (logger) {
      logger.info('Starting extension initialization');
    }
    
    // Check if PowerCloudFeatures namespace is populated
    if (logger) {
      logger.debug('PowerCloudFeatures at initialization', {
        exists: !!window.PowerCloudFeatures,
        keys: window.PowerCloudFeatures ? Object.keys(window.PowerCloudFeatures) : [],
        card: !!window.PowerCloudFeatures?.card,
        book: !!window.PowerCloudFeatures?.book,
        entries: !!window.PowerCloudFeatures?.entries
      });
    }
    
    // Register features with the SafeFeatureManager for better error handling
    for (const feature of features) {
      if (logger) {
        logger.info('Registering feature with SafeFeatureManager', { featureName: feature.name });
      }
      await safeFeatureManager.registerFeature(feature.name, {
        init: () => {
          // Create a feature manager instance for this specific feature
          const manager = new window.FeatureManager([feature]);
          return manager.init();
        }
      }, {
        allowRetry: true,
        retryDelay: 2000
      });
    }
    
    if (logger) {
      logger.info('All features registered with enhanced error handling');
    }
    
    // Record successful feature registration in health dashboard
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'recordFeatureEvent',
        featureName: 'extension',
        event: 'activate',
        level: 'info',
        logMessage: 'All features registered successfully',
        data: { 
          featureCount: features.length,
          registeredFeatures: features.map(f => f.name)
        }
      }).catch(() => {});
    }
    
    // Also initialize with the traditional feature manager for backward compatibility
    if (logger) {
      logger.info('Initializing traditional FeatureManager', { featureCount: features.length });
    }
    const featureManager = new window.FeatureManager(features).init();
    
  } catch (error) {
    // Record initialization failure in health dashboard
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'recordFeatureEvent',
        featureName: 'extension',
        event: 'error',
        level: 'error',
        logMessage: 'Extension initialization failed',
        data: { 
          error: error.message,
          stack: error.stack,
          url: window.location.href
        }
      }).catch(() => {});
    }
    
    if (logger) {
      logger.error('Extension initialization failed', { 
        error: error.message, 
        stack: error.stack 
      });
    }
  }
}

// Initialize the extension
const initLogger = window.loggerFactory ? window.loggerFactory.createLogger('Main') : null;

if (initLogger) {
  initLogger.info('About to initialize extension');
  initLogger.info('Current URL', { url: window.location.href });
  
  // Test URL patterns against current URL for debugging
  initLogger.debug('Testing URL patterns against current URL');
  features.forEach(feature => {
    const match = window.location.href.match(feature.urlPattern);
    initLogger.debug('Feature pattern test', {
      featureName: feature.name,
      pattern: feature.urlPattern.toString(),
      matches: !!match,
      match: match
    });
  });
}

initializeExtension();