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

// Initialize PowerCloud UI system for consistent button management
if (window.PowerCloudUI) {
  try {
    window.PowerCloudUI.initialize();
    if (mainLogger) {
      mainLogger.info('PowerCloud UI system initialized successfully');
    }
  } catch (error) {
    if (mainLogger) {
      mainLogger.error('Failed to initialize PowerCloud UI system:', error);
    }
  }
} else {
  if (mainLogger) {
    mainLogger.warn('PowerCloud UI system not available');
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
    name: 'uiVisibilityManager', // Renamed from tokenDetection
    urlPattern: /.*\.spend\.cloud.*|.*\.dev\.spend\.cloud.*/,  // Run on all spend.cloud pages (including .dev subdomains)
    init: function() {
      // Use the init function from ui-visibility-manager.js using the PowerCloudFeatures namespace
      if (window.PowerCloudFeatures?.uiVisibilityManager?.init) {
        try {
          if (mainLogger) {
            mainLogger.info('Initializing UI visibility manager');
          } else {
            console.log('Initializing UI visibility manager');
          }
          return window.PowerCloudFeatures.uiVisibilityManager.init();
        } catch (err) {
          if (mainLogger) {
            mainLogger.error('Error initializing UI visibility manager', { error: err.message });
          } else {
            console.error('Error initializing UI visibility manager:', err);
          }
        }
      } else {
        if (mainLogger) {
          mainLogger.warn('UI visibility manager init function not found');
        } else {
          console.warn('UI visibility manager init function not found');
        }
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
  },
  {
    name: 'viewEntryCard',
    urlPattern: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/kasboek\.boekingen\/show\?id=([^&]+)/,
    init: loadViewEntryCardFeature,
    excludes: [], // Compatible with existing entry features
    cleanup: function() {
      // Use the view-entry-card specific cleanup function from the namespace
      if (window.PowerCloudFeatures?.viewEntryCard?.cleanup) {
        return window.PowerCloudFeatures.viewEntryCard.cleanup();
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

/**
 * Load and initialize the view entry card feature
 * @param {object} match - The URL match result containing capture groups
 */
async function loadViewEntryCardFeature(match) {
  const logger = window.loggerFactory ? window.loggerFactory.createLogger('Main') : null;
  
  if (logger) {
    logger.info('loadViewEntryCardFeature called', { match });
    logger.debug('PowerCloudFeatures state', {
      exists: !!window.PowerCloudFeatures,
      keys: window.PowerCloudFeatures ? Object.keys(window.PowerCloudFeatures) : [],
      viewEntryCard: !!window.PowerCloudFeatures?.viewEntryCard
    });
  }
  
  // Wait for view-entry-card feature to be available (with timeout)
  let attempts = 0;
  const maxAttempts = 10;
  const delay = 100; // 100ms between attempts
  
  while (attempts < maxAttempts) {
    if (window.PowerCloudFeatures?.viewEntryCard?.init) {
      if (logger) {
        logger.info('Calling view-entry-card feature init', { attempt: attempts + 1 });
      }
      return await window.PowerCloudFeatures.viewEntryCard.init(match);
    }
    
    attempts++;
    if (logger) {
      logger.debug('Waiting for view-entry-card feature to register', { 
        attempt: attempts, 
        maxAttempts 
      });
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  if (logger) {
    logger.error('view-entry-card feature failed to register', { maxAttempts });
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

/**
 * Global container cleanup function
 * Makes sure button container is removed when not on a supported page
 */
function cleanupButtonContainer() {
  try {
    // Method 1: Use PowerCloudButtonManager cleanup
    if (window.PowerCloudButtonManager?.instance) {
      if (mainLogger) {
        mainLogger.info('Removing PowerCloudButtonManager container');
      } else {
        console.log('Removing PowerCloudButtonManager container');
      }
      window.PowerCloudButtonManager.instance.cleanup();
      
      // Force instance reset to null to prevent singleton persistence issues
      if (window.PowerCloudButtonManagerInstance) {
        window.PowerCloudButtonManagerInstance = null;
      }
    }
    
    // Method 2: Direct DOM removal (try both even if the first method succeeds)
    const containers = [
      document.getElementById('powercloud-button-container'),
      document.getElementById('powercloud-shadow-host'),
      document.querySelector('.powercloud-button-container')
    ].filter(Boolean); // Remove nulls
    
    if (containers.length > 0) {
      containers.forEach(container => {
        try {
          container.remove();
        } catch (err) {
          // Ignore errors with individual container removal
        }
      });
      
      if (mainLogger) {
        mainLogger.info(`Directly removed ${containers.length} button container elements`);
      } else {
        console.log(`Directly removed ${containers.length} button container elements`);
      }
    }
    
    // Method 3: Clean up global PowerCloud references
    if (window.PowerCloudUI?.getButtonManager) {
      try {
        const manager = window.PowerCloudUI.getButtonManager();
        if (manager && manager.cleanup) {
          manager.cleanup();
        }
      } catch (err) {
        // Ignore errors with manager cleanup
      }
    }
  } catch (error) {
    if (mainLogger) {
      mainLogger.error('Error in cleanupButtonContainer', { error: error.message });
    } else {
      console.error('Error in cleanupButtonContainer:', error);
    }
  }
}

/**
 * Run cleanup code when feature manager is not loaded 
 * or no features match the current URL
 */
function runFeatureCheck() {
  try {
    // Check if any feature URL pattern matches the current URL
    const currentUrl = window.location.href;
    
    // Check if any feature (excluding uiVisibilityManager) in our feature array matches the URL
    // We exclude uiVisibilityManager because it matches ALL spend.cloud domains
    // but it doesn't add any buttons itself
    const matchesAnyButtonFeature = features.some(feature => {
      // Skip uiVisibilityManager when checking for features that add buttons
      if (feature.name === 'uiVisibilityManager') {
        return false;
      }
      return feature.urlPattern.test(currentUrl);
    });
    
    if (!matchesAnyButtonFeature) {
      if (mainLogger) {
        mainLogger.info('No matching button features found for current URL, cleaning up any UI elements');
      } else {
        console.log('No matching button features found for current URL, cleaning up any UI elements');
      }
      
      // Clean up any UI elements if we're not on a supported page
      cleanupButtonContainer();
    }
  } catch (error) {
    if (mainLogger) {
      mainLogger.error('Error in runFeatureCheck', { error: error.message });
    } else {
      console.error('Error in runFeatureCheck:', error);
    }
  }
}

// Enhance the feature manager with a function to run after navigation
function enhanceFeatureManager() {
  if (window.featureManager) {
    // Store the original init method
    const originalInit = window.featureManager.init;
    
    // Override the init method to also run our feature check
    window.featureManager.init = function() {
      const result = originalInit.apply(this, arguments);
      
      // After regular initialization, run our check to clean up if needed
      runFeatureCheck();
      
      return result;
    };
    
    if (mainLogger) {
      mainLogger.info('Enhanced feature manager with navigation cleanup');
    } else {
      console.log('Enhanced feature manager with navigation cleanup');
    }
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
    
    // Store the feature manager instance for our enhancements
    window.featureManager = featureManager;
    
    // Enhance the feature manager to clean up UI on navigation
    enhanceFeatureManager();
    
    // Also run our feature check immediately to clean up any existing UI elements
    // if we're not on a supported page
    runFeatureCheck();
    
    // Set up a mutation observer to detect SPA navigation
    setupSpaNavigationObserver();
    
    return featureManager;
  } catch (error) {
    if (logger) {
      logger.error('Error initializing extension', { error });
    } else {
      console.error('Error initializing extension:', error);
    }
    
    // Even if main initialization fails, still try to clean up any existing UI
    // to avoid orphaned buttons
    try {
      runFeatureCheck();
    } catch (cleanupErr) {
      console.error('Error during cleanup after failed initialization:', cleanupErr);
    }
    
    // Record errors in health dashboard
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'recordFeatureEvent',
        featureName: 'extension',
        event: 'error',
        level: 'error',
        logMessage: 'Failed to initialize extension',
        data: { 
          error: error.message,
          stack: error.stack
        }
      }).catch(() => {});
    }
    
    return null;
  }
}

/**
 * Set up a mutation observer to detect SPA (Single Page Application) navigation
 * This helps clean up UI elements when the page URL changes without a full page reload
 */
function setupSpaNavigationObserver() {
  // Store the current URL to detect changes
  let lastUrl = window.location.href;
  let lastPathname = window.location.pathname;
  let lastSearch = window.location.search;
  
  // Create a mutation observer to watch for DOM changes that might indicate navigation
  const observer = new MutationObserver(() => {
    // Check for URL changes - both full URL and pathname/search changes
    const currentUrl = window.location.href;
    const currentPathname = window.location.pathname;
    const currentSearch = window.location.search;
    const urlChanged = lastUrl !== currentUrl;
    const pathnameChanged = lastPathname !== currentPathname;
    const searchChanged = lastSearch !== currentSearch;
    
    if (urlChanged || pathnameChanged || searchChanged) {
      if (mainLogger) {
        mainLogger.info('SPA navigation detected', { 
          from: lastUrl, 
          to: currentUrl,
          pathnameChanged,
          searchChanged
        });
      } else {
        console.log(`SPA navigation detected: ${lastUrl} → ${currentUrl}`);
      }
      
      // Update stored URL components
      lastUrl = currentUrl;
      lastPathname = currentPathname;
      lastSearch = currentSearch;
      
      // Run our feature check to clean up UI if needed
      runFeatureCheck();
    }
  });
  
  // Start observing the whole document with a configuration to detect navigation
  observer.observe(document, { 
    childList: true,
    subtree: true
  });
  
  if (mainLogger) {
    mainLogger.info('Set up SPA navigation observer');
  } else {
    console.log('Set up SPA navigation observer');
  }
  
  // Also listen for the history API
  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;
  
  window.history.pushState = function() {
    originalPushState.apply(this, arguments);
    
    // Run feature check after pushState
    setTimeout(runFeatureCheck, 50);
  };
  
  window.history.replaceState = function() {
    originalReplaceState.apply(this, arguments);
    
    // Run feature check after replaceState
    setTimeout(runFeatureCheck, 50);
  };
}

// Initialize the extension when DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}

// Perform initial cleanup to remove button container if not on a supported page
cleanupButtonContainer();

// Run feature check to clean up any UI elements if no features match the current URL
runFeatureCheck();

// Enhance the feature manager to include navigation cleanup
enhanceFeatureManager();