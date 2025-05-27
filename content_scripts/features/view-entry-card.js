/**
 * View Entry Card Feature Module
 *
 * This module provides functionality for navigating from entry pages to their associated card pages
 * on entry pages at https://[customer-environment].spend.cloud/proactive/kasboek.boekingen/show?id=[entry-id] or
 * https://[customer-environment].dev.spend.cloud/proactive/kasboek.boekingen/show?id=[entry-id].
 * 
 * Loading Method: Manifest-only
 * This script is loaded via the manifest.json content_scripts configuration.
 */

// Initialize logger for this feature
const entryCardLogger = (() => {
  if (window.PowerCloudLoggerFactory) {
    return window.PowerCloudLoggerFactory.createLogger('ViewEntryCard');
  }
  return {
    info: (message, data) => console.log(`[INFO][ViewEntryCard] ${message}`, data || ''),
    warn: (message, data) => console.warn(`[WARN][ViewEntryCard] ${message}`, data || ''),
    error: (message, data) => console.error(`[ERROR][ViewEntryCard] ${message}`, data || '')
  };
})();

entryCardLogger.info('Loading view-entry-card.js...');
entryCardLogger.info('BaseFeature available', { isAvailable: typeof BaseFeature !== 'undefined' });
console.log('[DEBUG][ViewEntryCard] Script loaded and executing');

// Check if BaseFeature is available
if (typeof BaseFeature === 'undefined') {
  entryCardLogger.error('BaseFeature class not available! Cannot initialize ViewEntryCardFeature');
  console.error('[DEBUG][ViewEntryCard] BaseFeature is undefined');
} else {
  entryCardLogger.info('BaseFeature is available, proceeding with ViewEntryCardFeature');
  console.log('[DEBUG][ViewEntryCard] BaseFeature is available');
}

/**
 * ViewEntryCardFeature class extending BaseFeature
 * Provides navigation functionality from entry pages to their associated card pages
 */
class ViewEntryCardFeature extends BaseFeature {
  constructor() {
    super('view-entry-card', {
      enableDebugLogging: false
    });
    
    // Feature-specific properties
    this.customer = null;
    this.entryId = null;
    this.entry = null;
    this.cardId = null;
    this.cardButtonCreated = false;
    
    // Feature-specific configuration options
    this.config = {
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 30000,
      showDetailedErrors: false,
      fallbackToDefaultBehavior: true
    };
    
    // Error tracking
    this.apiErrorStats = new Map();
    
    // UI elements
    this.buttonManager = null;
    
    entryCardLogger.info('ViewEntryCardFeature constructor completed', {
      featureId: this.featureId,
      config: this.config
    });
  }

  /**
   * Initialize the feature with URL match data
   * @param {object} match - The URL match result containing capture groups
   */
  async onInit(match) {
    console.log('[DEBUG][ViewEntryCard] onInit called with:', { 
      match, 
      matchType: typeof match,
      url: window.location.href
    });
    
    try {
      await super.onInit(match);
      
      // Validate match data
      if (!match || (Array.isArray(match) && match.length < 3)) {
        console.error('[DEBUG][ViewEntryCard] Invalid match data:', match);
        throw new Error('Invalid match data for view entry card feature');
      }

      // Extract customer and entry ID from match
      if (Array.isArray(match)) {
        // Array format from regex exec
        this.customer = match[1];
        // Entry ID comes from URL query parameters, not the regex match
      } else if (match.groups) {
        // Object with named groups
        this.customer = match.groups.customer || match.groups[1];
      } else {
        // Try to extract from properties
        this.customer = match[1] || match.customer;
      }

      // Extract entryId from URL query parameters
      const urlParams = new URLSearchParams(window.location.search);
      this.entryId = urlParams.get('id');
      
      if (!this.customer || !this.entryId) {
        throw new Error('Invalid match data or missing entry ID for view entry card feature');
      }
      
      entryCardLogger.info('ViewEntryCardFeature initialized', { 
        customer: this.customer, 
        entryId: this.entryId, 
        config: this.config 
      });
      
    } catch (error) {
      entryCardLogger.error('Failed to initialize view entry card feature', { error: error.message });
      this.handleError('Initialization failed', error);
      throw error;
    }
  }

  /**
   * Load feature-specific configuration from Chrome storage
   */
  async loadConfiguration() {
    try {
      const result = await new Promise((resolve) => {
        chrome.storage.sync.get(['viewEntryCardConfig'], (result) => {
          resolve(result);
        });
      });
      
      if (result.viewEntryCardConfig) {
        // Merge stored config with defaults
        this.config = { ...this.config, ...result.viewEntryCardConfig };
        entryCardLogger.info('Configuration loaded from storage', { config: this.config });
      }
    } catch (error) {
      entryCardLogger.warn('Failed to load configuration, using defaults', { error: error.message });
    }
  }

  /**
   * Activate the feature - check settings and fetch entry details
   */
  async onActivate() {
    await super.onActivate();
    
    try {
      // Load feature-specific configuration
      await this.loadConfiguration();
      
      // Check if buttons should be shown before fetching entry details
      const result = await this.getStorageSettings();
      const showButtons = result.showButtons === undefined ? true : result.showButtons;

      if (!showButtons) {
        entryCardLogger.info('Buttons disabled, skipping view entry card feature activation');
        return;
      }

      entryCardLogger.info('View entry card feature activated', { 
        customer: this.customer, 
        entryId: this.entryId 
      });
      
      // TODO: Phase 2 will implement fetchEntryDetailsAndExtractCard
      
    } catch (error) {
      this.handleError('Failed to activate view entry card feature', error);
    }
  }

  /**
   * Clean up the feature
   */
  async onCleanup() {
    this.removeEntryCardButton();
    await super.onCleanup();
    
    entryCardLogger.info('ViewEntryCardFeature cleanup completed');
  }

  /**
   * Get storage settings as a Promise
   * @returns {Promise<Object>}
   */
  getStorageSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['showButtons'], (result) => {
        resolve(result);
      });
    });
  }

  /**
   * Track API errors for monitoring and debugging
   * @param {string} operation - The operation that failed
   * @param {Error} error - The error that occurred
   */
  trackApiError(operation, error) {
    const key = `${operation}:${error.name}`;
    const current = this.apiErrorStats.get(key) || { count: 0, lastError: null };
    current.count++;
    current.lastError = {
      message: error.message,
      timestamp: new Date().toISOString()
    };
    this.apiErrorStats.set(key, current);
    
    entryCardLogger.warn('API error tracked', { operation, error: error.message, stats: current });
  }

  /**
   * Clear API error tracking for an operation
   * @param {string} operation - The operation to clear
   */
  clearApiError(operation) {
    for (const [key] of this.apiErrorStats) {
      if (key.startsWith(`${operation}:`)) {
        this.apiErrorStats.delete(key);
      }
    }
  }

  /**
   * Get API error statistics
   * @returns {Object} Error statistics
   */
  getApiErrorStats() {
    const stats = {};
    for (const [key, value] of this.apiErrorStats) {
      stats[key] = value;
    }
    return stats;
  }

  /**
   * Placeholder for button creation (to be implemented in Phase 3)
   */
  addEntryCardButton() {
    entryCardLogger.info('addEntryCardButton called - placeholder implementation');
    // TODO: Phase 3 will implement the actual button creation
  }

  /**
   * Placeholder for button event handling (to be implemented in Phase 3)
   */
  async handleViewCardClick() {
    entryCardLogger.info('handleViewCardClick called - placeholder implementation');
    // TODO: Phase 3 will implement the actual navigation logic
  }

  /**
   * Removes the entry card navigation button and any related UI elements
   */
  removeEntryCardButton() {
    // Remove the shadow host for the button
    this.removeHostElement();

    // Also remove any result shadow host that might be showing
    const resultHost = document.getElementById('powercloud-entry-card-result-host');
    if (resultHost) {
      resultHost.remove();
    }
    
    this.cardButtonCreated = false;
    entryCardLogger.info('Entry card button removed');
  }

  /**
   * Placeholder for result feedback (to be implemented in Phase 3)
   * @param {string} message - The message to display
   */
  showEntryCardResult(message) {
    entryCardLogger.info('showEntryCardResult called', { message });
    // TODO: Phase 3 will implement the actual result feedback system
  }

  /**
   * Enhanced error handling with user feedback options
   * @param {string} context - Context where the error occurred
   * @param {Error} error - The error object
   * @param {Object} options - Additional options for error handling
   */
  handleError(context, error, options = {}) {
    const errorDetails = {
      context,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      customer: this.customer,
      entryId: this.entryId
    };
    
    // Log the error
    entryCardLogger.error(context, errorDetails);
    
    // Call parent error handler
    super.handleError(context, error);
    
    // Show user message if requested
    if (options.showUserMessage) {
      const userMessage = options.userMessage || 'An error occurred while processing the entry card feature';
      this.showEntryCardResult(userMessage);
    }
  }
}

// Register the feature in the PowerCloudFeatures namespace
if (typeof window !== 'undefined') {
  // Ensure the PowerCloudFeatures namespace exists
  if (!window.PowerCloudFeatures) {
    window.PowerCloudFeatures = {};
  }

  // Create feature instance and register it
  const viewEntryCardFeature = new ViewEntryCardFeature();
  
  window.PowerCloudFeatures.viewEntryCard = {
    instance: viewEntryCardFeature,
    init: async function(match) {
      entryCardLogger.info('Feature init called via namespace', { match });
      try {
        await viewEntryCardFeature.onInit(match);
        await viewEntryCardFeature.onActivate();
        return viewEntryCardFeature;
      } catch (error) {
        entryCardLogger.error('Feature initialization failed', { error: error.message });
        throw error;
      }
    },
    cleanup: async function() {
      entryCardLogger.info('Feature cleanup called via namespace');
      try {
        await viewEntryCardFeature.onCleanup();
      } catch (error) {
        entryCardLogger.error('Feature cleanup failed', { error: error.message });
      }
    },
    // Expose feature for debugging
    getFeature: function() {
      return viewEntryCardFeature;
    }
  };

  entryCardLogger.info('ViewEntryCardFeature registered in PowerCloudFeatures namespace');
}

console.log('[DEBUG][ViewEntryCard] Feature registration completed');
