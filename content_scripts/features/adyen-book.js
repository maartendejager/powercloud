/**
 * Adyen Book Feature Module
 *
 * This module provides functionality for viewing balance account information at Adyen
 * for book pages at https://[customer-environment].spend.cloud/books/[book-id]/* or
 * https://[customer-environment].dev.spend.cloud/books/[book-id]/* and other related book pages.
 * 
 * Loading Method: Manifest-only
 * This script is loaded via the manifest.json content_scripts configuration.
 */

/**
 * AdyenBookFeature class extending BaseFeature
 * Provides balance account viewing functionality
 */
class AdyenBookFeature extends BaseFeature {
  constructor() {
    super('adyen-book', {
      hostElementId: 'powercloud-shadow-host',
      enableDebugLogging: false
    });
    
    // Feature-specific properties
    this.customer = null;
    this.bookId = null;
    this.bookType = null;
    this.balanceAccountId = null; // Internal balance account ID 
    this.adyenBalanceAccountId = null; // Actual Adyen balance account ID (BA_...)
    this.administrationId = null;
    this.balanceAccountReference = null;
    
    // Feature-specific configuration options
    this.config = {
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 5000,
      autoRetryOnFailure: true,
      showDetailedErrors: false,
      fallbackToDefaultBehavior: true,
      enableBookTypeFiltering: true,
      supportedBookTypes: ['monetary_account_book']
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
      throw new Error('Invalid match data for book feature');
    }

    // In our new pattern, customer is always in match[1] and bookId is always in match[2]
    this.customer = match[1];
    this.bookId = match[2];
    
    // Load feature-specific configuration
    await this.loadFeatureConfig();
    
    this.log('Initializing book feature', { 
      customer: this.customer, 
      bookId: this.bookId,
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
      if (result.adyenBookConfig) {
        this.config = { ...this.config, ...result.adyenBookConfig };
      }
      
      this.log('Feature configuration loaded', { config: this.config });
    } catch (error) {
      this.handleError('Failed to load feature configuration', error);
    }
  }

  /**
   * Activate the feature - check settings and fetch book details
   */
  async onActivate() {
    await super.onActivate();
    
    try {
      // Check if buttons should be shown before fetching book details
      const result = await this.getStorageSettings();
      const showButtons = result.showButtons === undefined ? true : result.showButtons;

      if (!showButtons) {
        this.log('Buttons disabled, skipping book feature activation');
        return;
      }

      // Fetch book details to determine book type before adding button
      await this.fetchBookDetailsAndAddButton();
      
    } catch (error) {
      this.handleError('Failed to activate book feature', error);
    }
  }

  /**
   * Clean up the feature
   */
  async onCleanup() {
    this.removeBookInfoButton();
    await super.onCleanup();
  }

  /**
   * Get storage settings as a Promise
   * @returns {Promise<Object>}
   */
  getStorageSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['showButtons', 'adyenBookConfig'], resolve);
    });
  }

  /**
   * Fetch book details and add button based on book type with enhanced error handling
   */
  async fetchBookDetailsAndAddButton() {
    let attempt = 0;
    let lastError = null;
    
    while (attempt < this.config.retryAttempts) {
      try {
        attempt++;
        this.log(`Fetching book details (attempt ${attempt}/${this.config.retryAttempts})`);
        
        const response = await this.sendMessageWithTimeout({
          action: "fetchBookDetails",
          customer: this.customer,
          bookId: this.bookId
        }, this.config.timeout);

        if (response && response.success) {
          this.bookType = response.bookType;
          // Store both internal and Adyen balance account IDs separately
          this.balanceAccountId = response.balanceAccountId; // Internal ID (like "1")
          
          // Handle different response structures for Adyen balance account ID
          // Only use the actual Adyen balance account ID, never fall back to internal ID
          this.adyenBalanceAccountId = response.adyenBalanceAccountId || null; // Adyen ID (like "BA_...")
          
          this.administrationId = response.administrationId;
          this.balanceAccountReference = response.balanceAccountReference;
          
          console.log('[PowerCloud] Book API response structure:', {
            hasBalanceAccountId: !!response.balanceAccountId,
            hasAdyenBalanceAccountId: !!response.adyenBalanceAccountId,
            internalBalanceAccountId: this.balanceAccountId,
            adyenBalanceAccountId: this.adyenBalanceAccountId,
            bookType: this.bookType,
            warning: !this.adyenBalanceAccountId ? 'No Adyen balance account ID found - using internal ID would be incorrect!' : null
          });

          // Don't create button if no Adyen balance account ID
          if (!this.adyenBalanceAccountId) {
            console.warn('[PowerCloud] Cannot create Adyen button: No Adyen balance account ID available');
            console.log('[PowerCloud] Internal balance account ID available:', this.balanceAccountId);
            this.log('Skipping button creation - no Adyen balance account ID found');
            return;
          }
          
          // Check if book type is supported
          if (this.config.enableBookTypeFiltering && 
              !this.config.supportedBookTypes.includes(this.bookType)) {
            this.log(`Book type '${this.bookType}' not supported, skipping button creation`);
            return;
          }
          
          this.addBookInfoButton();
          
          // Clear any previous errors on success
          this.clearApiError('fetchBookDetails');
          return;
        } else {
          const error = new Error(response?.error || 'API returned unsuccessful response');
          error.apiResponse = response;
          throw error;
        }
        
      } catch (error) {
        lastError = error;
        this.trackApiError('fetchBookDetails', error, attempt);
        
        if (attempt < this.config.retryAttempts) {
          const delay = this.config.retryDelay * attempt; // Exponential backoff
          this.log(`Retrying in ${delay}ms due to error: ${error.message}`);
          await this.delay(delay);
        }
      }
    }
    
    // All attempts failed
    this.handleAdyenApiFailure('fetchBookDetails', lastError);
    
    // Fallback behavior based on configuration
    if (this.config.fallbackToDefaultBehavior) {
      this.log('Using fallback behavior after API failure');
      this.bookType = 'monetary_account_book';
      this.balanceAccountId = null;
      this.addBookInfoButton();
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
      bookId: this.bookId,
      attempts: this.config.retryAttempts,
      config: this.config
    };
    
    // Enhanced error logging
    this.handleError(`Adyen API failure for ${operation}`, error, errorDetails);
    
    // Track error patterns
    this.lastErrorTime = Date.now();
    
    // Show user-friendly error message if configured
    if (this.config.showDetailedErrors) {
      this.showBookInfoResult(`API Error: ${operation} failed after ${this.config.retryAttempts} attempts. ${error.message}`);
    } else {
      this.showBookInfoResult('Unable to connect to services. Please try again later.');
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
   * Adds a button to view balance account information at Adyen
   */
  addBookInfoButton() {
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
    button.id = 'powercloud-book-info-btn';
    button.className = 'powercloud-button';

    // Set button text and state based on balance account availability
    if (this.balanceAccountId) {
      button.textContent = 'View Balance Account in Adyen';
      button.addEventListener('click', () => this.handleBookInfoClick());
    } else {
      button.textContent = 'No Adyen Balance Account';
      button.disabled = true;
      button.className += ' powercloud-button-disabled';
      button.title = 'This monetary account is not linked to an Adyen balance account';
    }

    // Add button to container and container to shadow DOM
    buttonContainer.appendChild(button);
    shadowRoot.appendChild(buttonContainer);

    // Add shadow host to the page
    document.body.appendChild(shadowHost);
    
    this.log('Book info button added', { 
      hasBalanceAccount: !!this.balanceAccountId,
      balanceAccountId: this.balanceAccountId 
    });
  }

  /**
   * Handle book info button click
   */
  async handleBookInfoClick() {
    try {
      console.log('[PowerCloud] Book info click handler called', {
        hasInternalBalanceAccountId: !!this.balanceAccountId,
        hasAdyenBalanceAccountId: !!this.adyenBalanceAccountId,
        internalBalanceAccountId: this.balanceAccountId,
        adyenBalanceAccountId: this.adyenBalanceAccountId,
        bookType: this.bookType
      });
      
      if (!this.adyenBalanceAccountId) {
        console.log('[PowerCloud] No Adyen balance account ID available for book');
        this.showBookInfoResult('No Adyen Balance Account ID found for this book');
        return;
      }

      const adyenUrl = `https://balanceplatform-live.adyen.com/balanceplatform/accounts/balance-accounts/${this.adyenBalanceAccountId}`;
      
      console.log('[PowerCloud] Opening Adyen balance account:', {
        adyenBalanceAccountId: this.adyenBalanceAccountId,
        url: adyenUrl
      });
      
      // Open Adyen URL in new tab
      chrome.runtime.sendMessage({
        action: "openTab",
        url: adyenUrl
      });
      
      this.showBookInfoResult('Balance Account opened in Adyen');
    } catch (error) {
      console.error('[PowerCloud] Book info click error:', error);
      this.handleError('Failed to handle book info click', error);
      this.showBookInfoResult('Error: Unable to open balance account');
    }
  }

  /**
   * Removes the book information button and any related UI elements
   */
  removeBookInfoButton() {
    // Remove the shadow host for the button
    this.removeHostElement();

    // Also remove any result shadow host that might be showing
    const resultHost = document.getElementById('powercloud-result-host');
    if (resultHost) {
      resultHost.remove();
    }
    
    this.log('Book info button removed');
  }



  /**
   * Shows a result message for book info operations
   * @param {string} message - The message to display
   */
  showBookInfoResult(message) {
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
    
    this.log('Book info result shown', { message });
  }
}

// Create instance and register with PowerCloud features
const adyenBookFeature = new AdyenBookFeature();

// Create namespace for PowerCloud features if it doesn't exist
window.PowerCloudFeatures = window.PowerCloudFeatures || {};

console.log('[PowerCloud] Registering adyen-book feature');

// Register book feature with backward compatibility
window.PowerCloudFeatures.book = {
  init: async (match) => {
    console.log('[PowerCloud] adyen-book feature init called with match:', match);
    try {
      await adyenBookFeature.onInit(match);
      await adyenBookFeature.onActivate();
    } catch (error) {
      console.error('[PowerCloud] adyen-book feature initialization error:', error);
      adyenBookFeature.onError(error, 'initialization');
    }
  },
  cleanup: async () => {
    console.log('[PowerCloud] adyen-book feature cleanup called');
    try {
      await adyenBookFeature.onDeactivate();
      await adyenBookFeature.onCleanup();
    } catch (error) {
      console.error('[PowerCloud] adyen-book feature cleanup error:', error);
      adyenBookFeature.onError(error, 'cleanup');
    }
  }
};

console.log('[PowerCloud] adyen-book feature registered successfully');
