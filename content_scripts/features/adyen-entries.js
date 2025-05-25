/**
 * Adyen Entries Feature Module
 * 
 * This module provides functionality for linking book entries to Adyen transfers
 * for entry pages at:
 * https://[customer-environment].spend.cloud/proactive/kasboek.boekingen/show?id=[entry-id]
 * or
 * https://[customer-environment].dev.spend.cloud/proactive/kasboek.boekingen/show?id=[entry-id]
 *
 * The module:
 * 1. Detects book entry pages
 * 2. Checks if the entry has an associated adyenTransferId
 * 3. Displays a button to view the corresponding transfer in Adyen
 * 4. Button states: disabled (no adyenTransferId) or enabled (with adyenTransferId)
 *
 * Loading Method: Manifest-only
 * This script is loaded via the manifest.json content_scripts configuration.
 */

// Constants for feature elements
const ADYEN_TRANSFERS_BASE_URL = 'https://balanceplatform-live.adyen.com/balanceplatform/transfers/';

// Initialize logger for this feature
const entriesLogger = (() => {
  if (window.PowerCloudLoggerFactory) {
    return window.PowerCloudLoggerFactory.createLogger('AdyenEntries');
  }
  return {
    info: (message, data) => console.log(`[INFO][AdyenEntries] ${message}`, data || ''),
    warn: (message, data) => console.warn(`[WARN][AdyenEntries] ${message}`, data || ''),
    error: (message, data) => console.error(`[ERROR][AdyenEntries] ${message}`, data || '')
  };
})();

/**
 * AdyenEntriesFeature class extending BaseFeature
 * Provides transfer viewing functionality for book entries
 */
class AdyenEntriesFeature extends BaseFeature {
  constructor() {
    super('adyen-entries', {
      hostElementId: 'powercloud-shadow-host',
      enableDebugLogging: false
    });
    
    // Feature-specific properties
    this.customer = null;
    this.entryId = null;
    this.entry = null;
    this.adyenTransferId = null;
    
    // Error handling and configuration
    this.config = {
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 30000,
      showDetailedErrors: false,
      fallbackToDefaultBehavior: true
    };
    this.apiErrorStats = new Map();
  }

  /**
   * Initialize the feature with URL match data
   * @param {object} match - The URL match result containing capture groups
   */
  async onInit(match) {
    await super.onInit(match);
    
    // Load feature-specific configuration
    await this.loadConfiguration();
    
    // Extract entryId from URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    this.entryId = urlParams.get('id');
    
    if (!match || !match[1] || !this.entryId) {
      throw new Error('Invalid match data or missing entry ID for entries feature');
    }
    
    this.customer = match[1];
    
    this.log('Initializing entries feature', { customer: this.customer, entryId: this.entryId, config: this.config });
  }

  /**
   * Load feature-specific configuration from Chrome storage
   */
  async loadConfiguration() {
    try {
      const result = await new Promise((resolve) => {
        chrome.storage.local.get('adyenEntriesConfig', resolve);
      });
      
      if (result.adyenEntriesConfig) {
        this.config = { ...this.config, ...result.adyenEntriesConfig };
        this.log('Configuration loaded', this.config);
      }
    } catch (error) {
      this.log('Failed to load configuration, using defaults', error);
    }
  }

  /**
   * Activate the feature - check settings and fetch entry details
   */
  async onActivate() {
    await super.onActivate();
    
    try {
      // Check if buttons should be shown before fetching entry details
      const result = await this.getStorageSettings();
      const showButtons = result.showButtons === undefined ? true : result.showButtons;

      if (!showButtons) {
        this.log('Buttons disabled, skipping entries feature activation');
        return;
      }

      // Fetch entry details to determine if adyenTransferId exists before adding button
      await this.fetchEntryDetailsAndAddButton();
      
    } catch (error) {
      this.handleError('Failed to activate entries feature', error);
    }
  }

  /**
   * Clean up the feature
   */
  async onCleanup() {
    this.removeEntriesInfoButton();
    await super.onCleanup();
  }

  /**
   * Get storage settings as a Promise
   * @returns {Promise<Object>}
   */
  getStorageSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get('showButtons', resolve);
    });
  }

  /**
   * Fetch entry details and add button based on adyenTransferId availability
   */
  async fetchEntryDetailsAndAddButton() {
    let attempt = 0;
    const maxAttempts = this.config.retryAttempts;
    
    while (attempt < maxAttempts) {
      try {
        this.log(`Fetching entry details (attempt ${attempt + 1}/${maxAttempts})`);
        
        const response = await this.sendMessageWithTimeout({
          action: "fetchEntryDetails",
          customer: this.customer,
          entryId: this.entryId
        }, this.config.timeout);

        if (response && response.success) {
          // Handle both old and new response formats
          // Old format: response.entry.adyenTransferId
          // New format: response.data.data.attributes.adyenTransferId or response.data.attributes.adyenTransferId
          let entryData = null;
          let adyenTransferId = null;
          
          if (response.entry) {
            // Old format
            entryData = response.entry;
            adyenTransferId = response.entry.adyenTransferId;
            entriesLogger.info('Using old format entry data', { adyenTransferId });
          } else if (response.data) {
            // New format - extract from data structure
            if (response.data.data && response.data.data.attributes) {
              entryData = response.data.data.attributes;
              adyenTransferId = response.data.data.attributes.adyenTransferId;
            } else if (response.data.attributes) {
              entryData = response.data.attributes;
              adyenTransferId = response.data.attributes.adyenTransferId;
            } else {
              entryData = response.data;
              adyenTransferId = response.data.adyenTransferId;
            }
            entriesLogger.info('Using new format entry data', { 
              adyenTransferId,
              dataStructure: response.data.data ? 'nested' : 'flat'
            });
          }
          
          this.entry = entryData;
          this.adyenTransferId = adyenTransferId;
          
          entriesLogger.info('Entry details processing result', {
            hasEntry: !!this.entry,
            hasAdyenTransferId: !!this.adyenTransferId,
            transferId: this.adyenTransferId
          });
          
          this.addEntriesInfoButton();
          this.clearApiError('fetchEntryDetails');
          return;
        } else {
          throw new Error(response?.error || 'Unknown API error');
        }
      } catch (error) {
        attempt++;
        this.trackApiError('fetchEntryDetails', error);
        
        if (attempt >= maxAttempts) {
          const errorMessage = this.config.showDetailedErrors 
            ? `Failed to fetch entry details after ${maxAttempts} attempts: ${error.message}`
            : 'Unable to load entry details';
            
          this.handleError('Failed to fetch entry details', error, { 
            showUserMessage: true, 
            userMessage: errorMessage 
          });
          
          if (this.config.fallbackToDefaultBehavior) {
            this.log('Using fallback behavior - adding disabled button');
            this.addEntriesInfoButton();
          }
          return;
        } else {
          // Wait before retry with exponential backoff
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          this.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }

  /**
   * Send message to background script with timeout support
   * @param {Object} message
   * @param {number} timeout
   * @returns {Promise<Object>}
   */
  sendMessageWithTimeout(message, timeout = this.config.timeout) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Message timeout after ${timeout}ms`));
      }, timeout);
      
      chrome.runtime.sendMessage(message, (response) => {
        clearTimeout(timeoutId);
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Send message to background script as a Promise (legacy support)
   * @param {Object} message
   * @returns {Promise<Object>}
   */
  sendMessage(message) {
    return this.sendMessageWithTimeout(message);
  }

  /**
   * Track API error for analysis
   * @param {string} operation - The operation that failed
   * @param {Error} error - The error that occurred
   */
  trackApiError(operation, error) {
    const key = `${operation}:${error.message}`;
    const current = this.apiErrorStats.get(key) || { count: 0, lastOccurred: null, operation, error: error.message };
    current.count++;
    current.lastOccurred = new Date().toISOString();
    this.apiErrorStats.set(key, current);
    
    this.log(`API error tracked for ${operation}`, { error: error.message, count: current.count });
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
   * Adds a button to view transfer information at Adyen
   */
  addEntriesInfoButton() {
    // Check if button already exists
    if (this.getHostElement()) {
      return;
    }

    // Create shadow DOM host element
    const shadowHost = document.createElement('div');
    shadowHost.id = this.hostElementId;

    // Check if buttons should be hidden by default
    chrome.storage.local.get('showButtons', (result) => {
      const showButtons = result.showButtons === undefined ? true : result.showButtons;
      shadowHost.className = showButtons ? 'powercloud-visible' : 'powercloud-hidden';
    });

    // Attach a shadow DOM tree to completely isolate our styles
    const shadowRoot = shadowHost.attachShadow({ mode: 'closed' });

    // Add external stylesheet to shadow DOM
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
    button.id = 'powercloud-entries-info-btn';
    button.className = 'powercloud-button';

    // Set button text and state based on adyenTransferId availability
    if (this.adyenTransferId) {
      button.textContent = 'View Transfer in Adyen';
      button.addEventListener('click', () => this.handleEntriesInfoClick());
    } else {
      button.textContent = 'No Adyen Transfer ID';
      button.disabled = true;
      button.className += ' powercloud-button-disabled';
      button.title = 'This entry is not linked to an Adyen transfer';
    }

    // Add button to container and container to shadow DOM
    buttonContainer.appendChild(button);
    shadowRoot.appendChild(buttonContainer);

    // Add shadow host to the page
    document.body.appendChild(shadowHost);
    
    this.log('Entries info button added', { 
      hasTransferId: !!this.adyenTransferId,
      transferId: this.adyenTransferId 
    });
  }

  /**
   * Handle entries info button click
   */
  async handleEntriesInfoClick() {
    let attempt = 0;
    const maxAttempts = this.config.retryAttempts;
    
    entriesLogger.info('Entries info click handler called', {
      hasAdyenTransferId: !!this.adyenTransferId,
      adyenTransferId: this.adyenTransferId,
      entry: this.entry
    });
    
    while (attempt < maxAttempts) {
      try {
        if (!this.adyenTransferId) {
          entriesLogger.warn('No transfer ID available for entry');
          this.showEntriesInfoResult('No Adyen Transfer ID found for this entry');
          return;
        }

        const adyenUrl = `${ADYEN_TRANSFERS_BASE_URL}${this.adyenTransferId}`;
        
        this.log(`Opening Adyen transfer (attempt ${attempt + 1}/${maxAttempts})`, { transferId: this.adyenTransferId });
        entriesLogger.info('Opening Adyen transfer', {
          transferId: this.adyenTransferId,
          url: adyenUrl,
          attempt: attempt + 1
        });
        
        // Open Adyen URL in new tab with timeout
        await this.sendMessageWithTimeout({
          action: "openTab",
          url: adyenUrl
        }, this.config.timeout);
        
        this.showEntriesInfoResult('Transfer opened in Adyen');
        this.clearApiError('openTab');
        return;
        
      } catch (error) {
        attempt++;
        this.trackApiError('openTab', error);
        
        if (attempt >= maxAttempts) {
          const errorMessage = this.config.showDetailedErrors
            ? `Failed to open transfer after ${maxAttempts} attempts: ${error.message}`
            : 'Unable to open transfer in Adyen';
            
          this.handleError('Failed to handle entries info click', error, {
            showUserMessage: true,
            userMessage: errorMessage
          });
          
          if (this.config.fallbackToDefaultBehavior) {
            this.showEntriesInfoResult('Error: Unable to open transfer. You can try navigating manually.');
          } else {
            this.showEntriesInfoResult('Error: Unable to open transfer');
          }
          return;
        } else {
          // Wait before retry with exponential backoff
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          this.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }

  /**
   * Removes the entries information button and any related UI elements
   */
  removeEntriesInfoButton() {
    // Remove the shadow host for the button
    this.removeHostElement();

    // Also remove any result shadow host that might be showing
    const resultHost = document.getElementById('powercloud-result-host');
    if (resultHost) {
      resultHost.remove();
    }
    
    this.log('Entries info button removed');
  }

  /**
   * Shows a result message for entries info operations
   * @param {string} message - The message to display
   */
  showEntriesInfoResult(message) {
    // Check if result display already exists
    const existingResult = document.getElementById('powercloud-result-host');
    if (existingResult) {
      existingResult.remove();
    }

    // Create shadow DOM host for result
    const resultHost = document.createElement('div');
    resultHost.id = 'powercloud-result-host';
    
    // Attach a shadow DOM tree
    const shadowRoot = resultHost.attachShadow({ mode: 'closed' });
    
    // Add link to our external stylesheet in shadow DOM
    const linkElem = document.createElement('link');
    linkElem.rel = 'stylesheet';
    linkElem.href = chrome.runtime.getURL('content_scripts/styles.css');
    shadowRoot.appendChild(linkElem);
    
    // Create result container
    const resultContainer = document.createElement('div');
    resultContainer.className = 'powercloud-result-container';
    
    // Add message
    const messageElem = document.createElement('div');
    messageElem.className = 'powercloud-result-message';
    messageElem.textContent = message;
    resultContainer.appendChild(messageElem);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'powercloud-result-close';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => resultHost.remove());
    resultContainer.appendChild(closeButton);
    
    // Add container to shadow DOM
    shadowRoot.appendChild(resultContainer);
    
    // Add to page
    document.body.appendChild(resultHost);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (document.body.contains(resultHost)) {
        resultHost.remove();
      }
    }, 10000);
    
    this.log('Entries info result shown', { message });
  }
}

// Create instance and register with PowerCloud features
const adyenEntriesFeature = new AdyenEntriesFeature();

// Create namespace for PowerCloud features if it doesn't exist
window.PowerCloudFeatures = window.PowerCloudFeatures || {};

entriesLogger.info('Registering adyen-entries feature');

//    Register entries feature with backward compatibility
window.PowerCloudFeatures.entries = {
  init: async (match) => {
    entriesLogger.info('Feature init called', { match });
    
    // Record feature initialization in health dashboard
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'recordFeatureEvent',
        featureName: 'adyenEntries',
        event: 'init',
        level: 'info',
        logMessage: 'Adyen Entries feature initialization started',
        data: { 
          match: match,
          url: window.location.href,
          timestamp: Date.now()
        }
      }).catch(() => {});
    }
    
    try {
      await adyenEntriesFeature.onInit(match);
      await adyenEntriesFeature.onActivate();
      
      // Record successful activation
      if (chrome?.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          action: 'recordFeatureEvent',
          featureName: 'adyenEntries',
          event: 'activate',
          level: 'info',
          logMessage: 'Adyen Entries feature activated successfully',
          data: { match: match }
        }).catch(() => {});
      }
    } catch (error) {
      // Record initialization error in health dashboard
      if (chrome?.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          action: 'recordFeatureEvent',
          featureName: 'adyenEntries',
          event: 'error',
          level: 'error',
          logMessage: 'Adyen Entries feature initialization failed',
          data: { 
            error: error.message,
            stack: error.stack,
            match: match,
            context: 'initialization'
          }
        }).catch(() => {});
      }
      
      entriesLogger.error('Feature initialization error', { error: error.message, stack: error.stack });
      adyenEntriesFeature.onError(error, 'initialization');
    }
  },
  cleanup: async () => {
    entriesLogger.info('Feature cleanup called');
    
    // Record feature deactivation in health dashboard
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'recordFeatureEvent',
        featureName: 'adyenEntries',
        event: 'deactivate',
        level: 'info',
        logMessage: 'Adyen Entries feature cleanup started',
        data: { 
          url: window.location.href,
          timestamp: Date.now()
        }
      }).catch(() => {});
    }
    
    try {
      await adyenEntriesFeature.onDeactivate();
      await adyenEntriesFeature.onCleanup();
    } catch (error) {
      // Record cleanup error in health dashboard
      if (chrome?.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          action: 'recordFeatureEvent',
          featureName: 'adyenEntries',
          event: 'error',
          level: 'error',
          logMessage: 'Adyen Entries feature cleanup failed',
          data: { 
            error: error.message,
            stack: error.stack,
            context: 'cleanup'
          }
        }).catch(() => {});
      }
      
      entriesLogger.error('Feature cleanup error', { error: error.message, stack: error.stack });
      adyenEntriesFeature.onError(error, 'cleanup');
    }
  }
};

entriesLogger.info('Feature registered successfully');
