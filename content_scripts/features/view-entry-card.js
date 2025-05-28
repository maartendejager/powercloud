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
      
      // Fetch entry details to determine if cardId exists before adding button
      await this.fetchEntryDetailsAndExtractCard();
      
    } catch (error) {
      this.handleError('Failed to activate view entry card feature', error);
    }
  }

  /**
   * Clean up the feature
   */
  async onCleanup() {
    this.removeEntryCardButton();
    this.removeResultFeedback();
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
   * Fetch entry details and extract card ID for navigation
   * Implements Step 2.1: Entry Data Fetching with retry logic and multiple format handling
   */
  async fetchEntryDetailsAndExtractCard() {
    let attempt = 0;
    const maxAttempts = this.config.retryAttempts;
    
    while (attempt < maxAttempts) {
      try {
        entryCardLogger.info(`Fetching entry details (attempt ${attempt + 1}/${maxAttempts})`);
        
        const response = await this.sendMessageWithTimeout({
          action: "fetchEntryDetails",
          customer: this.customer,
          entryId: this.entryId
        }, this.config.timeout);

        if (response && response.success) {
          // Handle both old and new response formats
          // Step 2.3: Data Validation - extract and validate card data
          let entryData = null;
          let cardId = null;

          if (response.entry) {
            // Old format
            entryData = response.entry;
            cardId = this.extractCardIdFromEntry(response.entry);
            entryCardLogger.info('Using old format entry data', { cardId });
          } else if (response.data) {
            // New format - extract from data structure
            if (response.data.data && response.data.data.attributes) {
              entryData = response.data.data.attributes;
              cardId = this.extractCardIdFromEntry(response.data.data);
            } else if (response.data.attributes) {
              entryData = response.data.attributes;
              cardId = this.extractCardIdFromEntry(response.data);
            } else {
              entryData = response.data;
              cardId = this.extractCardIdFromEntry(response.data);
            }
            entryCardLogger.info('Using new format entry data', { 
              cardId,
              dataStructure: response.data.data ? 'nested' : 'flat'
            });
          }
          
          // Step 2.3: Validate entry data completeness
          if (!this.validateEntryData(entryData)) {
            throw new Error('Entry data validation failed - incomplete or invalid data');
          }
          
          this.entry = entryData;
          this.cardId = cardId;
          
          entryCardLogger.info('Entry details processing result', {
            hasEntry: !!this.entry,
            hasCardId: !!this.cardId,
            cardId: this.cardId,
            entryValidation: 'passed'
          });
          
          this.addEntryCardButton();
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
            entryCardLogger.info('Using fallback behavior - adding disabled button');
            this.addEntryCardButton();
          }
          return;
        } else {
          // Step 2.2: Retry logic with exponential backoff
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          entryCardLogger.warn(`Retrying entry details fetch in ${delay}ms (attempt ${attempt}/${maxAttempts})`, {
            error: error.message
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }

  /**
   * Extract card ID from entry data, handling multiple response formats
   * Step 2.1: Handle multiple API response structures
   * @param {Object} entryData - Entry data from API response
   * @returns {string|null} Card ID if found, null otherwise
   */
  extractCardIdFromEntry(entryData) {
    if (!entryData) {
      entryCardLogger.warn('No entry data provided for card ID extraction');
      return null;
    }

    // Try different possible locations for card ID
    const possiblePaths = [
      // Direct card ID in attributes
      entryData.attributes?.cardId,
      entryData.cardId,
      
      // Card relationship structure (new format)
      entryData.relationships?.card?.data?.id,
      entryData.data?.relationships?.card?.data?.id,
      
      // Card object with ID (old format)
      entryData.card?.id,
      entryData.attributes?.card?.id,
      
      // Alternative card reference structures
      entryData.cardReference?.id,
      entryData.attributes?.cardReference?.id,
      
      // Legacy format variations
      entryData.card_id,
      entryData.attributes?.card_id
    ];

    for (const cardId of possiblePaths) {
      if (cardId && this.isValidCardId(cardId)) {
        entryCardLogger.info('Card ID extracted successfully', { 
          cardId, 
          source: 'entry_data_extraction' 
        });
        return String(cardId);
      }
    }

    entryCardLogger.info('No valid card ID found in entry data', { 
      entryDataKeys: Object.keys(entryData),
      hasAttributes: !!entryData.attributes,
      hasRelationships: !!entryData.relationships
    });
    return null;
  }

  /**
   * Validate entry data completeness and structure
   * Step 2.3: Data Validation
   * @param {Object} entryData - Entry data to validate
   * @returns {boolean} True if data is valid, false otherwise
   */
  validateEntryData(entryData) {
    if (!entryData || typeof entryData !== 'object') {
      entryCardLogger.warn('Entry data validation failed: not an object', { entryData });
      return false;
    }

    // Flexible validation - accept any object with meaningful content
    // Check for various possible field combinations that indicate valid entry data
    const hasBasicFields = entryData.id || entryData.entryId || 
                          (entryData.attributes && (entryData.attributes.id || entryData.attributes.entryId)) ||
                          entryData.type || // JSON:API format typically has 'type' field
                          (entryData.attributes && Object.keys(entryData.attributes).length > 0) ||
                          Object.keys(entryData).length > 0; // Any non-empty object

    if (!hasBasicFields) {
      entryCardLogger.warn('Entry data validation failed: missing required ID fields', {
        hasId: !!entryData.id,
        hasEntryId: !!entryData.entryId,
        hasAttributes: !!entryData.attributes,
        hasType: !!entryData.type,
        objectKeys: Object.keys(entryData),
        isEmpty: Object.keys(entryData).length === 0
      });
      return false;
    }

    entryCardLogger.info('Entry data validation passed', {
      dataStructure: entryData.attributes ? 'with_attributes' : 'direct',
      hasId: !!entryData.id,
      hasEntryId: !!entryData.entryId,
      hasType: !!entryData.type,
      keyCount: Object.keys(entryData).length
    });
    return true;
  }

  /**
   * Validate if a card ID is in the correct format
   * Step 2.3: Card ID validation
   * @param {*} cardId - Card ID to validate
   * @returns {boolean} True if valid card ID, false otherwise
   */
  isValidCardId(cardId) {
    if (!cardId) return false;
    
    // Convert to string for validation
    const cardIdStr = String(cardId).trim();
    
    // Card ID should be non-empty and not contain only whitespace
    if (cardIdStr.length === 0) return false;
    
    // Card ID should not be common invalid values
    const invalidValues = ['null', 'undefined', '0', '', 'false'];
    if (invalidValues.includes(cardIdStr.toLowerCase())) return false;
    
    // Additional validation: should be alphanumeric (allowing hyphens, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(cardIdStr)) {
      entryCardLogger.warn('Card ID contains invalid characters', { cardId: cardIdStr });
      return false;
    }
    
    return true;
  }

  /**
   * Placeholder for button creation (to be implemented in Phase 3)
   */
  /**
   * Create and add the entry card navigation button
   * Step 3.1: Button Creation using PowerCloudButtonManager
   */
  addEntryCardButton() {
    entryCardLogger.info('addEntryCardButton called', { 
      hasCardId: !!this.cardId,
      cardId: this.cardId 
    });

    // Check if button already exists
    if (this.cardButtonCreated) {
      entryCardLogger.info('Entry card button already exists, skipping creation');
      return;
    }

    try {
      // Initialize button manager if not already done
      if (!window.PowerCloudUI || !window.PowerCloudButtonManager) {
        entryCardLogger.error('PowerCloudUI or PowerCloudButtonManager not available');
        this.createFallbackButton();
        return;
      }
      
      // Get the singleton button manager instance
      this.buttonManager = window.PowerCloudUI.getButtonManager();
      
      // Determine button configuration based on card availability
      let buttonConfig;
      if (this.cardId) {
        buttonConfig = {
          id: 'view-card',
          text: 'View Card Details',
          variant: 'spendcloud',
          size: 'medium',
          title: `Navigate to card details for card ${this.cardId}`,
          onClick: () => this.handleViewCardClick()
        };
      } else {
        buttonConfig = {
          id: 'view-card',
          text: 'No Associated Card',
          variant: 'secondary',
          size: 'medium',
          disabled: true,
          title: 'This entry is not linked to any card'
        };
      }
      
      // Add button using the centralized button manager
      const button = this.buttonManager.addButton('view-entry-card', buttonConfig);
      
      if (button) {
        this.cardButtonCreated = true;
        entryCardLogger.info('Entry card button added successfully using PowerCloudButtonManager');
        
        // Verify button is visible
        setTimeout(() => {
          entryCardLogger.info('Button manager status:', this.buttonManager.getStatus());
        }, 100);
      } else {
        entryCardLogger.warn('Button creation failed, falling back to alternative method');
        this.createFallbackButton();
      }
    } catch (error) {
      this.handleError('Failed to add entry card button', error);
      entryCardLogger.error('Error during button creation:', error);
    }
  }

  /**
   * Create fallback button if PowerCloudButtonManager is not available
   */
  createFallbackButton() {
    // Create shadow DOM host for button
    const shadowHost = document.createElement('div');
    shadowHost.id = this.config.hostElementId || 'powercloud-entry-card-shadow-host';
    
    // Attach a shadow DOM tree
    const shadowRoot = shadowHost.attachShadow({ mode: 'closed' });
    
    // Add link to our external stylesheet in shadow DOM
    const linkElem = document.createElement('link');
    linkElem.rel = 'stylesheet';
    linkElem.href = chrome.runtime.getURL('content_scripts/styles.css');
    shadowRoot.appendChild(linkElem);

    // Create button container with styling
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'powercloud-container powercloud-button-container';
    buttonContainer.id = 'powercloud-entry-card-button-container';

    // Create the button
    const button = document.createElement('button');
    button.id = 'powercloud-entry-card-btn';
    button.className = 'powercloud-button';

    // Handle enabled/disabled states based on card availability
    if (this.cardId) {
      // Enabled state - card available
      button.textContent = 'View Card Details';
      button.addEventListener('click', () => this.handleViewCardClick());
      button.title = `Navigate to card details for card ${this.cardId}`;
      
      // Add ARIA attributes for accessibility
      button.setAttribute('aria-label', `View details for card ${this.cardId}`);
      button.setAttribute('aria-describedby', 'powercloud-entry-card-description');
      
      entryCardLogger.info('Created enabled entry card button', { cardId: this.cardId });
    } else {
      // Disabled state - no card available
      button.textContent = 'No Associated Card';
      button.disabled = true;
      button.className += ' powercloud-button-disabled';
      button.title = 'This entry is not linked to any card';
      
      // Add ARIA attributes for accessibility
      button.setAttribute('aria-label', 'No associated card available');
      button.setAttribute('aria-describedby', 'powercloud-entry-card-description');
      
      entryCardLogger.info('Created disabled entry card button - no card ID available');
    }

    // Add hidden description for screen readers
    const description = document.createElement('div');
    description.id = 'powercloud-entry-card-description';
    description.className = 'powercloud-sr-only';
    description.textContent = this.cardId 
      ? `Button to navigate to the card details page for card ${this.cardId}`
      : 'This entry does not have an associated card to view';

    // Add elements to container
    buttonContainer.appendChild(button);
    buttonContainer.appendChild(description);
    
    // Add container to shadow DOM
    shadowRoot.appendChild(buttonContainer);

    // Add shadow host to the page
    document.body.appendChild(shadowHost);
    
    // Store reference for cleanup
    this.shadowHost = shadowHost;
    this.cardButtonCreated = true;
    
    entryCardLogger.info('Fallback entry card button added to page', { 
      hasCardId: !!this.cardId,
      cardId: this.cardId,
      buttonEnabled: !!this.cardId
    });
  }

  /**
   * Enhanced button event handling with card navigation
   * Step 2.1: Navigation logic with error handling
   */
  async handleViewCardClick() {
    let attempt = 0;
    const maxAttempts = this.config.retryAttempts;
    
    entryCardLogger.info('Card navigation click handler called', {
      hasCardId: !!this.cardId,
      cardId: this.cardId,
      customer: this.customer
    });
    
    while (attempt < maxAttempts) {
      try {
        if (!this.cardId) {
          entryCardLogger.warn('No card ID available for navigation');
          this.showEntryCardResult('No associated card found for this entry');
          return;
        }

        // Step 2.1: Construct proper card URL for navigation
        const cardUrl = this.buildCardUrl(this.cardId);
        
        entryCardLogger.info(`Opening card page (attempt ${attempt + 1}/${maxAttempts})`, { 
          cardId: this.cardId,
          cardUrl: cardUrl,
          attempt: attempt + 1
        });
        
        // Open card URL in new tab with timeout
        await this.sendMessageWithTimeout({
          action: "openTab",
          url: cardUrl
        }, this.config.timeout);
        
        this.showEntryCardResult('Card page opened successfully');
        this.clearApiError('openTab');
        return;
        
      } catch (error) {
        attempt++;
        this.trackApiError('openTab', error);
        
        if (attempt >= maxAttempts) {
          const errorMessage = this.config.showDetailedErrors
            ? `Failed to open card page after ${maxAttempts} attempts: ${error.message}`
            : 'Unable to open card page';
            
          this.handleError('Failed to handle card navigation click', error, {
            showUserMessage: true,
            userMessage: errorMessage
          });
          
          if (this.config.fallbackToDefaultBehavior) {
            this.showEntryCardResult('Error: Unable to open card page. You can try navigating manually.');
          } else {
            this.showEntryCardResult('Error: Unable to open card page');
          }
          return;
        } else {
          // Step 2.2: Wait before retry with exponential backoff
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          entryCardLogger.warn(`Retrying card navigation in ${delay}ms (attempt ${attempt}/${maxAttempts})`, {
            error: error.message
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }

  /**
   * Build the card URL for navigation
   * Step 2.1: URL construction with environment detection
   * @param {string} cardId - The card ID to navigate to
   * @returns {string} Complete card URL
   */
  buildCardUrl(cardId) {
    if (!cardId) {
      throw new Error('Card ID is required to build card URL');
    }

    // Detect if we're on dev environment
    const isDev = window.location.hostname.includes('.dev.');
    const devSuffix = isDev ? '.dev' : '';
    
    // Construct the card URL for the single card update page
    const cardUrl = `https://${this.customer}${devSuffix}.spend.cloud/proactive/data.card/single_card_update?id=${cardId}`;
    
    entryCardLogger.info('Card URL constructed', {
      cardId,
      customer: this.customer,
      isDev,
      cardUrl
    });
    
    return cardUrl;
  }

  /**
   * Removes the entry card navigation button and any related UI elements
   */
  removeEntryCardButton() {
    try {
      if (this.buttonManager) {
        this.buttonManager.removeButton('view-entry-card', 'view-card');
        this.cardButtonCreated = false;
        entryCardLogger.info('Entry card button removed using PowerCloudButtonManager');
      }
      
      // Also remove fallback shadow host if it exists
      this.removeHostElement();

      // Also remove any result feedback that might be showing
      this.removeResultFeedback();
      
      this.cardButtonCreated = false;
      entryCardLogger.info('Entry card button removed');
    } catch (error) {
      this.handleError('Failed to remove entry card button', error);
    }
  }

  /**
   * Enhanced result feedback with error categorization
   * Step 3.3: Result Feedback System - UI implementation
   * @param {string} message - The message to display
   */
  showEntryCardResult(message) {
    entryCardLogger.info('showEntryCardResult called', { message });
    
    // Categorize message type for appropriate styling
    const messageType = this.categorizeResultMessage(message);
    
    entryCardLogger.info('Result message categorized', { 
      message, 
      messageType 
    });
    
    // Remove any existing result feedback
    this.removeResultFeedback();
    
    // Create shadow DOM host for result feedback
    const resultHost = document.createElement('div');
    resultHost.id = 'powercloud-entry-card-result-host';
    
    // Attach shadow DOM for styling isolation
    const shadowRoot = resultHost.attachShadow({ mode: 'closed' });
    
    // Add link to our external stylesheet
    const linkElem = document.createElement('link');
    linkElem.rel = 'stylesheet';
    linkElem.href = chrome.runtime.getURL('content_scripts/styles.css');
    shadowRoot.appendChild(linkElem);
    
    // Create result container
    const resultContainer = document.createElement('div');
    resultContainer.className = `powercloud-container powercloud-result-container powercloud-result-${messageType}`;
    resultContainer.id = 'powercloud-entry-card-result';
    
    // Create result message element
    const messageElement = document.createElement('div');
    messageElement.className = 'powercloud-result-message';
    messageElement.textContent = message;
    
    // Add ARIA attributes for accessibility
    messageElement.setAttribute('role', messageType === 'error' ? 'alert' : 'status');
    messageElement.setAttribute('aria-live', messageType === 'error' ? 'assertive' : 'polite');
    
    // Create close button for manual dismissal
    const closeButton = document.createElement('button');
    closeButton.className = 'powercloud-result-close';
    closeButton.textContent = '×';
    closeButton.title = 'Close message';
    closeButton.setAttribute('aria-label', 'Close result message');
    closeButton.addEventListener('click', () => this.removeResultFeedback());
    
    // Add elements to container
    resultContainer.appendChild(messageElement);
    resultContainer.appendChild(closeButton);
    
    // Add container to shadow DOM
    shadowRoot.appendChild(resultContainer);
    
    // Position the result near the button or at top of page
    this.positionResultFeedback(resultHost);
    
    // Add to page
    document.body.appendChild(resultHost);
    
    // Store reference for cleanup
    this.resultHost = resultHost;
    
    // Auto-hide non-error messages after 5 seconds
    if (messageType !== 'error') {
      setTimeout(() => {
        this.removeResultFeedback();
      }, 5000);
    }
    
    entryCardLogger.info('Result feedback UI created', {
      messageType,
      message,
      autoHide: messageType !== 'error'
    });
  }
  
  /**
   * Position the result feedback element appropriately
   * Step 3.3: Smart positioning relative to button or page
   * @param {HTMLElement} resultHost - The result feedback host element
   */
  positionResultFeedback(resultHost) {
    // Try to position near the entry card button if it exists
    const buttonHost = document.getElementById('powercloud-entry-card-shadow-host');
    
    if (buttonHost) {
      // Position below the button
      resultHost.style.position = 'fixed';
      resultHost.style.zIndex = '10001';
      
      const buttonRect = buttonHost.getBoundingClientRect();
      resultHost.style.top = `${buttonRect.bottom + 10}px`;
      resultHost.style.left = `${buttonRect.left}px`;
      resultHost.style.maxWidth = '400px';
    } else {
      // Fallback: position at top-right of viewport
      resultHost.style.position = 'fixed';
      resultHost.style.top = '20px';
      resultHost.style.right = '20px';
      resultHost.style.zIndex = '10001';
      resultHost.style.maxWidth = '400px';
    }
  }
  
  /**
   * Remove result feedback UI
   * Step 3.3: Cleanup result feedback elements
   */
  removeResultFeedback() {
    const existingResult = document.getElementById('powercloud-entry-card-result-host');
    if (existingResult) {
      existingResult.remove();
      entryCardLogger.info('Removed existing result feedback');
    }
    
    // Clear reference
    this.resultHost = null;
  }

  /**
   * Categorize result messages for appropriate UI styling
   * Step 2.2: Enhanced user feedback
   * @param {string} message - The message to categorize
   * @returns {string} Message category (success, error, warning, info)
   */
  categorizeResultMessage(message) {
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('success') || messageLower.includes('opened')) {
      return 'success';
    } else if (messageLower.includes('error') || messageLower.includes('failed') || messageLower.includes('unable')) {
      return 'error';
    } else if (messageLower.includes('no') || messageLower.includes('not found')) {
      return 'warning';
    } else {
      return 'info';
    }
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
