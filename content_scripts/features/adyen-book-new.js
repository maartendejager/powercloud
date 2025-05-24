/**
 * Adyen Book Feature Module
 * 
 * This module provides functionality for viewing balance account information at Adyen
 * for book pages at https://[customer-environment].spend.cloud/proactive/kasboek.boekingen/[book-id]/* or
 * https://[customer-environment].dev.spend.cloud/proactive/kasboek.boekingen/[book-id]/*
 *
 * The module:
 * 1. Detects monetary account book pages
 * 2. Checks for a direct relationship to an Adyen balance account 
 * 3. Displays a button to view the balance account at Adyen
 * 4. Button states: hidden (non-monetary book), disabled (no balance account), or enabled (with balance account)
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
    this.book = null;
    this.isMonetaryBook = false;
    this.adyenBalanceAccountId = null;
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
    
    this.log('Initializing book feature', { customer: this.customer, bookId: this.bookId });
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
      chrome.storage.local.get('showButtons', resolve);
    });
  }

  /**
   * Fetch book details and add button based on book type
   */
  async fetchBookDetailsAndAddButton() {
    try {
      const response = await this.sendMessage({
        action: "fetchBookDetails",
        customer: this.customer,
        bookId: this.bookId
      });

      if (response && response.success) {
        this.book = response.book;
        this.isMonetaryBook = response.book && response.book.type === 'monetary';
        this.adyenBalanceAccountId = response.book ? response.book.adyenBalanceAccountId : null;
        
        // Only show button for monetary books
        if (this.isMonetaryBook) {
          this.addBookInfoButton();
        } else {
          this.log('Non-monetary book, not showing button', { bookType: response.book?.type });
        }
      } else {
        this.log('Failed to fetch book details', { error: response?.error });
      }
    } catch (error) {
      this.handleError('Failed to fetch book details', error);
    }
  }

  /**
   * Send message to background script as a Promise
   * @param {Object} message
   * @returns {Promise<Object>}
   */
  sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });
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
    if (this.adyenBalanceAccountId) {
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
      hasBalanceAccount: !!this.adyenBalanceAccountId,
      balanceAccountId: this.adyenBalanceAccountId 
    });
  }

  /**
   * Handle book info button click
   */
  async handleBookInfoClick() {
    try {
      if (!this.adyenBalanceAccountId) {
        this.showBookInfoResult('No Adyen Balance Account ID found for this book');
        return;
      }

      const adyenUrl = `https://balanceplatform-live.adyen.com/balanceplatform/balance-accounts/${this.adyenBalanceAccountId}`;
      
      // Open Adyen URL in new tab
      chrome.runtime.sendMessage({
        action: "openTab",
        url: adyenUrl
      });
      
      this.showBookInfoResult('Balance Account opened in Adyen');
    } catch (error) {
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

// Register book feature with backward compatibility
window.PowerCloudFeatures.book = {
  init: (match) => {
    try {
      adyenBookFeature.onInit(match);
      adyenBookFeature.onActivate();
    } catch (error) {
      adyenBookFeature.onError(error, 'initialization');
    }
  },
  cleanup: () => {
    try {
      adyenBookFeature.onDeactivate();
      adyenBookFeature.onCleanup();
    } catch (error) {
      adyenBookFeature.onError(error, 'cleanup');
    }
  }
};
