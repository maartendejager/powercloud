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
  }

  /**
   * Initialize the feature with URL match data
   * @param {object} match - The URL match result containing capture groups
   */
  async onInit(match) {
    await super.onInit(match);
    
    // Extract entryId from URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    this.entryId = urlParams.get('id');
    
    if (!match || !match[1] || !this.entryId) {
      throw new Error('Invalid match data or missing entry ID for entries feature');
    }
    
    this.customer = match[1];
    
    this.log('Initializing entries feature', { customer: this.customer, entryId: this.entryId });
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
    try {
      const response = await this.sendMessage({
        action: "fetchEntryDetails",
        customer: this.customer,
        entryId: this.entryId
      });

      if (response && response.success) {
        this.entry = response.entry;
        this.adyenTransferId = response.entry ? response.entry.adyenTransferId : null;
        
        this.addEntriesInfoButton();
      } else {
        this.log('Failed to fetch entry details', { error: response?.error });
        // Still add button, but it will be disabled
        this.addEntriesInfoButton();
      }
    } catch (error) {
      this.handleError('Failed to fetch entry details', error);
      // Still add button, but it will be disabled
      this.addEntriesInfoButton();
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
    try {
      if (!this.adyenTransferId) {
        this.showEntriesInfoResult('No Adyen Transfer ID found for this entry');
        return;
      }

      const adyenUrl = `${ADYEN_TRANSFERS_BASE_URL}${this.adyenTransferId}`;
      
      // Open Adyen URL in new tab
      chrome.runtime.sendMessage({
        action: "openTab",
        url: adyenUrl
      });
      
      this.showEntriesInfoResult('Transfer opened in Adyen');
    } catch (error) {
      this.handleError('Failed to handle entries info click', error);
      this.showEntriesInfoResult('Error: Unable to open transfer');
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

// Register entries feature with backward compatibility
window.PowerCloudFeatures.entries = {
  init: (match) => {
    try {
      adyenEntriesFeature.onInit(match);
      adyenEntriesFeature.onActivate();
    } catch (error) {
      adyenEntriesFeature.onError(error, 'initialization');
    }
  },
  cleanup: () => {
    try {
      adyenEntriesFeature.onDeactivate();
      adyenEntriesFeature.onCleanup();
    } catch (error) {
      adyenEntriesFeature.onError(error, 'cleanup');
    }
  }
};
