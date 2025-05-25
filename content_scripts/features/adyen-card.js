/**
 * Adyen Card Feature Module
 *
 * This module provides functionality for viewing card information at Adyen
 * for card pages at https://[customer-environment].spend.cloud/cards/[card-id]/* or
 * https://[customer-environment].dev.spend.cloud/cards/[card-id]/* and other related card pages.
 * 
 * Loading Method: Manifest-only
 * This script is loaded via the manifest.json content_scripts configuration.
 */

// Initialize logger for this feature
const cardLogger = (() => {
  if (window.PowerCloudLoggerFactory) {
    return window.PowerCloudLoggerFactory.createLogger('AdyenCard');
  }
  return {
    info: (message, data) => console.log(`[INFO][AdyenCard] ${message}`, data || ''),
    warn: (message, data) => console.warn(`[WARN][AdyenCard] ${message}`, data || ''),
    error: (message, data) => console.error(`[ERROR][AdyenCard] ${message}`, data || '')
  };
})();

cardLogger.info('Loading adyen-card.js...');
cardLogger.info('BaseFeature available', { isAvailable: typeof BaseFeature !== 'undefined' });

// Check if BaseFeature is available
if (typeof BaseFeature === 'undefined') {
  cardLogger.error('BaseFeature class not available! Cannot initialize AdyenCardFeature');
} else {
  cardLogger.info('BaseFeature is available, proceeding with AdyenCardFeature creation');
}

/**
 * AdyenCardFeature class extending BaseFeature
 * Provides card information viewing functionality
 */
class AdyenCardFeature extends BaseFeature {
  constructor() {
    super('adyen-card', {
      hostElementId: 'powercloud-shadow-host',
      enableDebugLogging: false
    });
    
    // Feature-specific properties
    this.customer = null;
    this.cardId = null;
    this.isAdyenCard = null;
    this.vendor = null;
    
    // Feature-specific configuration options
    this.config = {
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 5000,
      autoRetryOnFailure: true,
      showDetailedErrors: false,
      fallbackToDefaultBehavior: true
    };
    
    // Error tracking
    this.apiErrors = new Map();
    this.lastErrorTime = null;
  }

  /**
   * Initialize the feature with URL match data
   * @param {object} match - The URL match result containing capture groups
   */
  async onInit(match) {
    await super.onInit(match);
    
    if (!match || match.length < 3) {
      throw new Error('Invalid match data for card feature');
    }

    // In our new pattern, customer is always in match[1] and cardId is always in match[2]
    this.customer = match[1];
    this.cardId = match[2];
    
    // Load feature-specific configuration
    await this.loadFeatureConfig();
    
    this.log('Initializing card feature', { 
      customer: this.customer, 
      cardId: this.cardId,
      config: this.config 
    });
  }

  /**
   * Load feature-specific configuration from storage
   */
  async loadFeatureConfig() {
    try {
      const result = await this.getStorageSettings();
      
      // Merge with default config
      if (result.adyenCardConfig) {
        this.config = { ...this.config, ...result.adyenCardConfig };
      }
      
      this.log('Feature configuration loaded', { config: this.config });
    } catch (error) {
      this.handleError('Failed to load feature configuration', error);
    }
  }

  /**
   * Activate the feature - check settings and fetch card details
   */
  async onActivate() {
    await super.onActivate();
    
    try {
      // Check if buttons should be shown before fetching card details
      const result = await this.getStorageSettings();
      const showButtons = result.showButtons === undefined ? true : result.showButtons;

      if (!showButtons) {
        this.log('Buttons disabled, skipping card feature activation');
        return;
      }

      // Fetch card details to determine vendor before adding button
      await this.fetchCardDetailsAndAddButton();
      
    } catch (error) {
      this.handleError('Failed to activate card feature', error);
    }
  }

  /**
   * Clean up the feature
   */
  async onCleanup() {
    this.removeCardInfoButton();
    await super.onCleanup();
  }

  /**
   * Get storage settings as a Promise
   * @returns {Promise<Object>}
   */
  getStorageSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['showButtons', 'adyenCardConfig'], resolve);
    });
  }

  /**
   * Fetch card details and add button based on vendor with enhanced error handling
   */
  async fetchCardDetailsAndAddButton() {
    let attempt = 0;
    let lastError = null;
    
    while (attempt < this.config.retryAttempts) {
      try {
        attempt++;
        this.log(`Fetching card details (attempt ${attempt}/${this.config.retryAttempts})`);
        
        const response = await this.sendMessageWithTimeout({
          action: "fetchCardDetails",
          customer: this.customer,
          cardId: this.cardId
        }, this.config.timeout);

        if (response && response.success) {
          this.isAdyenCard = response.vendor === 'adyen';
          this.vendor = response.vendor;
          this.addCardInfoButton();
          
          // Clear any previous errors on success
          this.clearApiError('fetchCardDetails');
          return;
        } else {
          const error = new Error(response?.error || 'API returned unsuccessful response');
          error.apiResponse = response;
          throw error;
        }
        
      } catch (error) {
        lastError = error;
        this.trackApiError('fetchCardDetails', error, attempt);
        
        if (attempt < this.config.retryAttempts) {
          const delay = this.config.retryDelay * attempt; // Exponential backoff
          this.log(`Retrying in ${delay}ms due to error: ${error.message}`);
          await this.delay(delay);
        }
      }
    }
    
    // All attempts failed
    this.handleAdyenApiFailure('fetchCardDetails', lastError);
    
    // Fallback behavior based on configuration
    if (this.config.fallbackToDefaultBehavior) {
      this.log('Using fallback behavior after API failure');
      this.isAdyenCard = true;
      this.vendor = null;
      this.addCardInfoButton();
    }
  }

  /**
   * Send message to background script with timeout support
   * @param {Object} message
   * @param {number} timeout
   * @returns {Promise<Object>}
   */
  sendMessageWithTimeout(message, timeout = 5000) {
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
    return this.sendMessageWithTimeout(message, this.config.timeout);
  }

  /**
   * Handle Adyen API failures with enhanced error tracking and reporting
   * @param {string} operation - The operation that failed
   * @param {Error} error - The error that occurred
   */
  handleAdyenApiFailure(operation, error) {
    const errorDetails = {
      operation,
      error: error.message,
      timestamp: Date.now(),
      customer: this.customer,
      cardId: this.cardId,
      attempts: this.config.retryAttempts,
      config: this.config
    };
    
    // Enhanced error logging
    this.handleError(`Adyen API failure for ${operation}`, error, errorDetails);
    
    // Track error patterns
    this.lastErrorTime = Date.now();
    
    // Show user-friendly error message if configured
    if (this.config.showDetailedErrors) {
      this.showCardInfoResult(`API Error: ${operation} failed after ${this.config.retryAttempts} attempts. ${error.message}`);
    } else {
      this.showCardInfoResult('Unable to connect to services. Please try again later.');
    }
  }

  /**
   * Track API errors for pattern analysis
   * @param {string} operation - The operation that failed
   * @param {Error} error - The error that occurred
   * @param {number} attempt - Current attempt number
   */
  trackApiError(operation, error, attempt) {
    const errorKey = `${operation}-${Date.now()}`;
    const errorRecord = {
      operation,
      error: error.message,
      attempt,
      timestamp: Date.now(),
      isNetworkError: error.message.includes('timeout') || error.message.includes('network'),
      isApiError: error.apiResponse !== undefined
    };
    
    this.apiErrors.set(errorKey, errorRecord);
    
    // Keep only recent errors (last 10)
    if (this.apiErrors.size > 10) {
      const oldestKey = this.apiErrors.keys().next().value;
      this.apiErrors.delete(oldestKey);
    }
    
    this.log('API error tracked', errorRecord);
  }

  /**
   * Clear tracked API errors for an operation
   * @param {string} operation - The operation to clear errors for
   */
  clearApiError(operation) {
    for (const [key, record] of this.apiErrors.entries()) {
      if (record.operation === operation) {
        this.apiErrors.delete(key);
      }
    }
  }

  /**
   * Utility method to create delays
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get API error statistics
   * @returns {Object} Error statistics
   */
  getApiErrorStats() {
    const errors = Array.from(this.apiErrors.values());
    const now = Date.now();
    const recentErrors = errors.filter(e => (now - e.timestamp) < 300000); // Last 5 minutes
    
    return {
      totalErrors: errors.length,
      recentErrors: recentErrors.length,
      networkErrors: errors.filter(e => e.isNetworkError).length,
      apiErrors: errors.filter(e => e.isApiError).length,
      lastErrorTime: this.lastErrorTime,
      errorsByOperation: errors.reduce((acc, err) => {
        acc[err.operation] = (acc[err.operation] || 0) + 1;
        return acc;
      }, {})
    };
  }

  /**
   * Adds a button to view card information at Adyen
   */
  addCardInfoButton() {
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
    button.id = 'powercloud-card-info-btn';
    button.className = 'powercloud-button';

    // Set button text and state based on vendor
    if (this.isAdyenCard) {
      button.textContent = 'View in Adyen';
      button.addEventListener('click', () => this.handleCardInfoClick());
    } else {
      button.textContent = `Card not in Adyen (${this.vendor || 'unknown vendor'})`;
      button.disabled = true;
      button.className += ' powercloud-button-disabled';
    }

    // Add button to container and container to shadow DOM
    buttonContainer.appendChild(button);
    shadowRoot.appendChild(buttonContainer);

    // Add shadow host to the page
    document.body.appendChild(shadowHost);
    
    this.log('Card info button added');
  }

  /**
   * Handle card info button click
   */
  async handleCardInfoClick() {
    try {
      cardLogger.info('Card button clicked, fetching card details...');
      
      const response = await this.sendMessage({
        action: "fetchCardDetails",
        customer: this.customer,
        cardId: this.cardId
      });

      cardLogger.info('Card details response', { success: response?.success, hasCard: !!response?.card });

      // Check for the correct response structure
      // Response can have either:
      // 1. response.card.adyenCardToken (old format)
      // 2. response.paymentInstrumentId (new format)
      let paymentInstrumentId = null;
      
      if (response && response.success) {
        if (response.card && response.card.adyenCardToken) {
          // Old format
          paymentInstrumentId = response.card.adyenCardToken;
          console.log('[PowerCloud] Using old format adyenCardToken:', paymentInstrumentId);
        } else if (response.paymentInstrumentId) {
          // New format
          paymentInstrumentId = response.paymentInstrumentId;
          console.log('[PowerCloud] Using new format paymentInstrumentId:', paymentInstrumentId);
        }
      }

      if (paymentInstrumentId) {
        const adyenUrl = `https://balanceplatform-live.adyen.com/balanceplatform/payment-instruments/${paymentInstrumentId}`;
        
        console.log('[PowerCloud] Opening Adyen URL:', adyenUrl);
        
        // Open Adyen URL in new tab
        chrome.runtime.sendMessage({
          action: "openTab",
          url: adyenUrl
        }, (tabResponse) => {
          console.log('[PowerCloud] OpenTab response:', tabResponse);
          if (chrome.runtime.lastError) {
            console.error('[PowerCloud] OpenTab error:', chrome.runtime.lastError);
            this.showCardInfoResult('Error opening tab: ' + chrome.runtime.lastError.message);
          } else {
            this.showCardInfoResult('Card opened in Adyen');
          }
        });
        
      } else {
        console.log('[PowerCloud] Card details not found or missing payment instrument ID');
        console.log('[PowerCloud] Response structure:', {
          hasResponse: !!response,
          hasSuccess: response?.success,
          hasCard: !!response?.card,
          hasAdyenCardToken: !!response?.card?.adyenCardToken,
          hasPaymentInstrumentId: !!response?.paymentInstrumentId,
          vendor: response?.vendor,
          responseKeys: response ? Object.keys(response) : 'No response',
          cardKeys: response?.card ? Object.keys(response.card) : 'No card object'
        });
        this.showCardInfoResult('Unable to view card in Adyen: Payment instrument ID not found');
      }
    } catch (error) {
      console.error('[PowerCloud] Card button click error:', error);
      this.handleError('Failed to handle card info click', error);
      this.showCardInfoResult('Error: Unable to retrieve card information');
    }
  }

  /**
   * Removes the card information button and any related UI elements
   */
  removeCardInfoButton() {
    // Remove the shadow host for the button
    this.removeHostElement();

    // Also remove any result shadow host that might be showing
    const resultHost = document.getElementById('powercloud-result-host');
    if (resultHost) {
      resultHost.remove();
    }
    
    this.log('Card info button removed');
  }

  /**
   * Shows a result message for card info operations
   * @param {string} message - The message to display
   */
  showCardInfoResult(message) {
    console.log('[PowerCloud] Showing result message:', message);
    
    // Check if result display already exists
    const existingResult = document.getElementById('powercloud-result-host');
    if (existingResult) {
      console.log('[PowerCloud] Removing existing result display');
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
    closeButton.addEventListener('click', () => {
      console.log('[PowerCloud] Result message closed by user');
      resultHost.remove();
    });
    resultContainer.appendChild(closeButton);
    
    // Add container to shadow DOM
    shadowRoot.appendChild(resultContainer);
    
    // Add to page
    document.body.appendChild(resultHost);
    
    console.log('[PowerCloud] Result message displayed');
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (document.body.contains(resultHost)) {
        console.log('[PowerCloud] Auto-removing result message after timeout');
        resultHost.remove();
      }
    }, 10000);
    
    this.log('Card info result shown', { message });
  }
}

// Create instance and register with PowerCloud features
const adyenCardFeature = new AdyenCardFeature();

// Create namespace for PowerCloud features if it doesn't exist
window.PowerCloudFeatures = window.PowerCloudFeatures || {};

cardLogger.info('Registering adyen-card feature');

// Register card feature with backward compatibility
window.PowerCloudFeatures.card = {
  init: async (match) => {
    console.log('[PowerCloud] adyen-card feature init called with match:', match);
    try {
      await adyenCardFeature.onInit(match);
      await adyenCardFeature.onActivate();
    } catch (error) {
      console.error('[PowerCloud] adyen-card feature initialization error:', error);
      adyenCardFeature.onError(error, 'initialization');
    }
  },
  cleanup: async () => {
    console.log('[PowerCloud] adyen-card feature cleanup called');
    try {
      await adyenCardFeature.onDeactivate();
      await adyenCardFeature.onCleanup();
    } catch (error) {
      console.error('[PowerCloud] adyen-card feature cleanup error:', error);
      adyenCardFeature.onError(error, 'cleanup');
    }
  },
  showResult: (message) => adyenCardFeature.showCardInfoResult(message)
};

console.log('[PowerCloud] adyen-card feature registered successfully');
