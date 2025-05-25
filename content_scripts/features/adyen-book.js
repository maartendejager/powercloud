/**
 * Adyen Book Feature Module
 *
 * This module provides functionality for viewing balance account information at Adyen
 * for book pages at https://[customer-environment].spend.cloud/books/[book-id]/* or
 * https://[customer-environment].dev.spend.cloud/books/[book-id]/* and other related book pages.
 * 
 * Loading Method: Manifest-only
 * This script is loaded via the manifest.json content_scripts configuration.
 * 
 * UI/UX: Uses PowerCloud UI component system with shadow DOM isolation,
 * accessibility support, and responsive design.
 */

// Import PowerCloud UI component system
(function loadPowerCloudUI() {
  if (typeof PowerCloudUI === 'undefined') {
    // Load UI components if not available
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('shared/ui-components.js');
    script.onload = () => {
      bookLogger.info('UI components loaded for adyen-book feature');
    };
    script.onerror = (error) => {
      bookLogger.error('Failed to load UI components for adyen-book feature', { error });
    };
    document.head.appendChild(script);

    // Also load accessibility utilities
    const accessibilityScript = document.createElement('script');
    accessibilityScript.src = chrome.runtime.getURL('shared/accessibility-utils.js');
    document.head.appendChild(accessibilityScript);

    // Also load responsive design utilities
    const responsiveScript = document.createElement('script');
    responsiveScript.src = chrome.runtime.getURL('shared/responsive-design.js');
    document.head.appendChild(responsiveScript);
  }
})();

// Initialize logger for this feature
const bookLogger = (() => {
  if (window.PowerCloudLoggerFactory) {
    return window.PowerCloudLoggerFactory.createLogger('AdyenBook');
  }
  return {
    info: (message, data) => console.log(`[INFO][AdyenBook] ${message}`, data || ''),
    warn: (message, data) => console.warn(`[WARN][AdyenBook] ${message}`, data || ''),
    error: (message, data) => console.error(`[ERROR][AdyenBook] ${message}`, data || '')
  };
})();

/**
 * AdyenBookFeature class extending BaseFeature
 * Provides balance account viewing functionality with enhanced UI/UX
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
          
          bookLogger.info('Book API response structure', {
            hasBalanceAccountId: !!response.balanceAccountId,
            hasAdyenBalanceAccountId: !!response.adyenBalanceAccountId,
            internalBalanceAccountId: this.balanceAccountId,
            adyenBalanceAccountId: this.adyenBalanceAccountId,
            bookType: this.bookType,
            warning: !this.adyenBalanceAccountId ? 'No Adyen balance account ID found - using internal ID would be incorrect!' : null
          });

          // Don't create button if no Adyen balance account ID
          if (!this.adyenBalanceAccountId) {
            bookLogger.warn('Cannot create Adyen button: No Adyen balance account ID available');
            bookLogger.info('Internal balance account ID available', { balanceAccountId: this.balanceAccountId });
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
        
        // Check if this is a 404 error - don't retry for these
        const is404Error = error.message && error.message.includes('404');
        const isNotFoundError = is404Error || (error.message && 
          (error.message.includes('not found') || error.message.includes('Not Found')));
        
        if (isNotFoundError) {
          this.log('Book not found (404) - this is normal, not retrying', {
            bookId: this.bookId,
            customer: this.customer,
            error: error.message
          });
          
          // For 404 errors, don't show error message to user, just use fallback
          if (this.config.fallbackToDefaultBehavior) {
            this.log('Book not found - using fallback behavior without error display');
            this.bookType = 'monetary_account_book';
            this.balanceAccountId = null;
            this.addBookInfoButton();
          }
          return; // Exit early, don't retry 404 errors
        }
        
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
      this.showBookInfoResult(`API Error: ${operation} failed after ${this.config.retryAttempts} attempts. ${error.message}`, 'error');
    } else {
      this.showBookInfoResult('Unable to connect to services. Please try again later.', 'error');
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
   * Adds a button to view balance account information at Adyen using PowerCloud UI components
   */
  addBookInfoButton() {
    // Check if button already exists
    if (this.getHostElement()) {
      return;
    }

    // Wait for PowerCloud UI to be available
    this.waitForPowerCloudUI().then(() => {
      // Create button configuration based on balance account availability
      const buttonConfig = {
        text: this.balanceAccountId ? 'View Balance Account in Adyen' : 'No Adyen Balance Account',
        variant: this.balanceAccountId ? 'primary' : 'secondary',
        disabled: !this.balanceAccountId,
        size: 'medium',
        id: 'powercloud-book-info-btn',
        ariaLabel: this.balanceAccountId 
          ? 'Open Adyen balance account in new tab'
          : 'This monetary account is not linked to an Adyen balance account',
        onClick: this.balanceAccountId ? () => this.handleBookInfoClick() : null
      };

      // Create button using PowerCloud UI
      const button = PowerCloudUI.createButton(buttonConfig);

      // Create container using PowerCloud UI
      const container = PowerCloudUI.createContainer({
        id: this.hostElementId,
        className: 'powercloud-button-container',
        children: [button]
      });

      // Check if buttons should be hidden by default
      chrome.storage.local.get('showButtons', (result) => {
        const showButtons = result.showButtons === undefined ? true : result.showButtons;
        container.style.display = showButtons ? 'block' : 'none';
      });

      // Add to page
      document.body.appendChild(container);
      
      this.log('Book info button added with PowerCloud UI', { 
        hasBalanceAccount: !!this.balanceAccountId,
        balanceAccountId: this.balanceAccountId,
        buttonVariant: buttonConfig.variant
      });
    }).catch(error => {
      this.handleError('Failed to create PowerCloud UI button', error);
      // Fallback to basic button creation if PowerCloud UI fails
      this.createFallbackButton();
    });
  }

  /**
   * Wait for PowerCloud UI to be available
   * @returns {Promise}
   */
  waitForPowerCloudUI() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max wait
      
      const checkUI = () => {
        if (typeof PowerCloudUI !== 'undefined') {
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error('PowerCloud UI not available after timeout'));
        } else {
          attempts++;
          setTimeout(checkUI, 100);
        }
      };
      
      checkUI();
    });
  }

  /**
   * Create fallback button if PowerCloud UI is not available
   */
  createFallbackButton() {
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
    
    this.log('Fallback book info button added', { 
      hasBalanceAccount: !!this.balanceAccountId,
      balanceAccountId: this.balanceAccountId 
    });
  }

  /**
   * Handle book info button click
   */
  async handleBookInfoClick() {
    try {
      bookLogger.info('Book info click handler called', {
        hasInternalBalanceAccountId: !!this.balanceAccountId,
        hasAdyenBalanceAccountId: !!this.adyenBalanceAccountId,
        internalBalanceAccountId: this.balanceAccountId,
        adyenBalanceAccountId: this.adyenBalanceAccountId,
        bookType: this.bookType
      });
      
      if (!this.adyenBalanceAccountId) {
        bookLogger.warn('No Adyen balance account ID available for book');
        this.showBookInfoResult('No Adyen Balance Account ID found for this book', 'warning');
        return;
      }

      const adyenUrl = `https://balanceplatform-live.adyen.com/balanceplatform/accounts/balance-accounts/${this.adyenBalanceAccountId}`;
      
      bookLogger.info('Opening Adyen balance account', {
        adyenBalanceAccountId: this.adyenBalanceAccountId,
        url: adyenUrl
      });
      
      // Open Adyen URL in new tab
      chrome.runtime.sendMessage({
        action: "openTab",
        url: adyenUrl
      });
      
      this.showBookInfoResult('Balance Account opened in Adyen', 'success');
    } catch (error) {
      bookLogger.error('Book info click error', { error: error.message, stack: error.stack });
      this.handleError('Failed to handle book info click', error);
      this.showBookInfoResult('Error: Unable to open balance account', 'error');
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
   * Shows a result message for book info operations using PowerCloud UI components
   * @param {string} message - The message to display
   * @param {string} type - The type of message ('success', 'error', 'warning', 'info')
   */
  showBookInfoResult(message, type = 'info') {
    // Remove any existing result
    const existingResult = document.getElementById('powercloud-result-host');
    if (existingResult) {
      existingResult.remove();
    }

    // Try to use PowerCloud UI, fallback to basic implementation
    this.waitForPowerCloudUI().then(() => {
      // Create alert using PowerCloud UI
      const alert = PowerCloudUI.createAlert({
        message: message,
        variant: type,
        dismissible: true,
        autoHide: true,
        autoHideDelay: 10000,
        id: 'powercloud-book-result',
        ariaLabel: `Book operation result: ${message}`
      });

      // Create container for the alert
      const container = PowerCloudUI.createContainer({
        id: 'powercloud-result-host',
        className: 'powercloud-result-container',
        children: [alert]
      });

      // Add to page
      document.body.appendChild(container);
      
      this.log('Book info result shown with PowerCloud UI', { 
        message, 
        type 
      });
    }).catch(error => {
      this.handleError('Failed to create PowerCloud UI alert', error);
      // Fallback to basic result display
      this.createFallbackResult(message);
    });
  }

  /**
   * Create fallback result display if PowerCloud UI is not available
   * @param {string} message - The message to display
   */
  createFallbackResult(message) {
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
    
    this.log('Fallback book info result shown', { message });
  }
}

// Create instance and register with PowerCloud features
const adyenBookFeature = new AdyenBookFeature();

// Create namespace for PowerCloud features if it doesn't exist
window.PowerCloudFeatures = window.PowerCloudFeatures || {};

bookLogger.info('Registering adyen-book feature');

// Register book feature with backward compatibility
window.PowerCloudFeatures.book = {
  init: async (match) => {
    bookLogger.info('Feature init called', { match });
    
    // Record feature initialization in health dashboard
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'recordFeatureEvent',
        featureName: 'adyenBook',
        event: 'init',
        level: 'info',
        logMessage: 'Adyen Book feature initialization started',
        data: { 
          match: match,
          url: window.location.href,
          timestamp: Date.now()
        }
      }).catch(() => {});
    }
    
    try {
      await adyenBookFeature.onInit(match);
      await adyenBookFeature.onActivate();
      
      // Record successful activation
      if (chrome?.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          action: 'recordFeatureEvent',
          featureName: 'adyenBook',
          event: 'activate',
          level: 'info',
          logMessage: 'Adyen Book feature activated successfully',
          data: { match: match }
        }).catch(() => {});
      }
    } catch (error) {
      // Record initialization error in health dashboard
      if (chrome?.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          action: 'recordFeatureEvent',
          featureName: 'adyenBook',
          event: 'error',
          level: 'error',
          logMessage: 'Adyen Book feature initialization failed',
          data: { 
            error: error.message,
            stack: error.stack,
            match: match,
            context: 'initialization'
          }
        }).catch(() => {});
      }
      
      bookLogger.error('Feature initialization error', { error: error.message, stack: error.stack });
      adyenBookFeature.onError(error, 'initialization');
    }
  },
  cleanup: async () => {
    bookLogger.info('Feature cleanup called');
    
    // Record feature deactivation in health dashboard
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'recordFeatureEvent',
        featureName: 'adyenBook',
        event: 'deactivate',
        level: 'info',
        logMessage: 'Adyen Book feature cleanup started',
        data: { 
          url: window.location.href,
          timestamp: Date.now()
        }
      }).catch(() => {});
    }
    
    try {
      await adyenBookFeature.onDeactivate();
      await adyenBookFeature.onCleanup();
    } catch (error) {
      // Record cleanup error in health dashboard
      if (chrome?.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          action: 'recordFeatureEvent',
          featureName: 'adyenBook',
          event: 'error',
          level: 'error',
          logMessage: 'Adyen Book feature cleanup failed',
          data: { 
            error: error.message,
            stack: error.stack,
            context: 'cleanup'
          }
        }).catch(() => {});
      }
      
      bookLogger.error('Feature cleanup error', { error: error.message, stack: error.stack });
      adyenBookFeature.onError(error, 'cleanup');
    }
  }
};

bookLogger.info('Feature registered successfully');
