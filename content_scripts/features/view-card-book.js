/**
 * View Card Book Feature Module
 *
 * This module provides functionality for viewing the associated book for a card
 * on card pages at https://[customer-environment].spend.cloud/cards/[card-id]/* or
 * https://[customer-environment].dev.spend.cloud/cards/[card-id]/* and other related card pages.
 * 
 * Loading Method: Manifest-only
 * This script is loaded via the manifest.json content_scripts configuration.
 */

// Initialize logger for this feature
const cardBookLogger = (() => {
  if (window.PowerCloudLoggerFactory) {
    return window.PowerCloudLoggerFactory.createLogger('ViewCardBook');
  }
  return {
    info: (message, data) => console.log(`[INFO][ViewCardBook] ${message}`, data || ''),
    warn: (message, data) => console.warn(`[WARN][ViewCardBook] ${message}`, data || ''),
    error: (message, data) => console.error(`[ERROR][ViewCardBook] ${message}`, data || '')
  };
})();

cardBookLogger.info('Loading view-card-book.js...');
cardBookLogger.info('BaseFeature available', { isAvailable: typeof BaseFeature !== 'undefined' });

// Check if BaseFeature is available
if (typeof BaseFeature === 'undefined') {
  cardBookLogger.error('BaseFeature class not available! Cannot initialize ViewCardBookFeature');
} else {
  cardBookLogger.info('BaseFeature is available, proceeding with ViewCardBookFeature creation');
}

/**
 * ViewCardBookFeature class extending BaseFeature
 * Provides card book viewing functionality
 */
class ViewCardBookFeature extends BaseFeature {
  constructor() {
    super('view-card-book', {
      hostElementId: 'powercloud-book-shadow-host',
      enableDebugLogging: false
    });
    
    // Feature-specific properties
    this.customer = null;
    this.cardId = null;
    this.bookId = null;
    this.currentPeriod = null;
    this.bookButtonCreated = false;
    
    // Feature-specific configuration options
    this.config = {
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 5000,
      autoRetryOnFailure: true,
      showDetailedErrors: false
    };
    
    // UI elements
    this.bookButton = null;
  }

  /**
   * Initialize the feature with URL match data and card data
   * @param {object} match - The URL match result containing capture groups
   * @param {object} cardData - The card data response from the API
   */
  async onInit(match, cardData) {
    await super.onInit(match);
    
    if (!match || match.length < 3) {
      throw new Error('Invalid match data for view card book feature');
    }

    // In our pattern, customer is always in match[1] and cardId is always in match[2]
    this.customer = match[1];
    this.cardId = match[2];
    
    // If card data is available, extract book ID
    if (cardData) {
      this.extractBookId(cardData);
    }
    
    // Set current period (MM-YYYY format)
    this.setCurrentPeriod();
    
    this.log('Initializing view card book feature', { 
      customer: this.customer, 
      cardId: this.cardId,
      bookId: this.bookId,
      currentPeriod: this.currentPeriod,
      config: this.config 
    });
  }

  /**
   * Extract book ID from card data response
   * @param {object} cardData - Card data response from the API
   */
  extractBookId(cardData) {
    try {
      // Try to extract book ID from relationships
      if (cardData?.data?.relationships?.books?.data?.[0]?.id) {
        this.bookId = cardData.data.relationships.books.data[0].id;
        this.log('Book ID extracted from card data (data.relationships path)', { bookId: this.bookId });
        return;
      }
      
      // Alternative path for book ID
      if (cardData?.relationships?.books?.data?.[0]?.id) {
        this.bookId = cardData.relationships.books.data[0].id;
        this.log('Book ID extracted from card data (relationships path)', { bookId: this.bookId });
        return;
      }

      // If no book ID is found
      this.log('No book ID found in card data');
    } catch (error) {
      this.handleError('Failed to extract book ID from card data', error);
    }
  }

  /**
   * Set current period in MM-YYYY format
   */
  setCurrentPeriod() {
    try {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0'); // getMonth() is 0-indexed
      const year = now.getFullYear();
      this.currentPeriod = `${month}-${year}`;
      this.log('Current period set', { period: this.currentPeriod });
    } catch (error) {
      this.handleError('Failed to set current period', error);
      // Default to current date as fallback
      const now = new Date();
      this.currentPeriod = `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
    }
  }

  /**
   * Activate the feature - create book button if book ID is present
   */
  async onActivate() {
    await super.onActivate();
    
    try {
      // Check if book ID is available
      if (!this.bookId) {
        this.log('No book ID available, skipping button creation');
        return;
      }

      // Add button to view card book
      this.addCardBookButton();
    } catch (error) {
      this.handleError('Failed to activate view card book feature', error);
    }
  }

  /**
   * Clean up the feature
   */
  async onCleanup() {
    this.removeCardBookButton();
    await super.onCleanup();
  }

  /**
   * Adds a button to view the card's associated book
   */
  addCardBookButton() {
    if (this.bookButtonCreated) {
      this.log('Book button already exists, skipping creation');
      return;
    }

    try {
      // Only create button if we have a book ID and current period
      if (!this.bookId || !this.currentPeriod) {
        this.log('Missing book ID or current period, cannot create book button', {
          bookId: this.bookId,
          currentPeriod: this.currentPeriod
        });
        return;
      }
      
      // Create shadow DOM container if not exists
      let shadowHost = document.getElementById(this.config.hostElementId);
      if (!shadowHost) {
        shadowHost = document.createElement('div');
        shadowHost.id = this.config.hostElementId;
        document.body.appendChild(shadowHost);
        
        // Set styling for the host element
        shadowHost.style.position = 'fixed';
        shadowHost.style.right = '85px'; // Position to the left of card info button
        shadowHost.style.bottom = '20px';
        shadowHost.style.zIndex = '9999';
      }
      
      // Create shadow DOM
      const shadow = shadowHost.attachShadow({ mode: 'open' });
      
      // Create button element
      this.bookButton = document.createElement('button');
      this.bookButton.textContent = 'View Card Book';
      this.bookButton.addEventListener('click', () => this.handleCardBookClick());
      
      // Style the button
      const style = document.createElement('style');
      style.textContent = `
        button {
          background-color: #4CAF50;
          color: white;
          padding: 10px 15px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: bold;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          transition: background-color 0.3s;
        }
        button:hover {
          background-color: #45a049;
        }
        button:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.3);
        }
      `;
      
      // Append elements to shadow DOM
      shadow.appendChild(style);
      shadow.appendChild(this.bookButton);
      
      this.bookButtonCreated = true;
      this.log('Card book button added successfully');
    } catch (error) {
      this.handleError('Failed to add card book button', error);
    }
  }

  /**
   * Handle card book button click
   */
  async handleCardBookClick() {
    try {
      this.log('Card book button clicked');
      
      if (!this.bookId || !this.currentPeriod) {
        this.showCardBookResult('Error: Missing book ID or period information');
        return;
      }
      
      // Construct the book URL
      const isDev = window.location.href.includes('.dev.spend.cloud');
      const baseUrl = `https://${this.customer}${isDev ? '.dev' : ''}.spend.cloud`;
      const bookUrl = `${baseUrl}/proactive/kasboek.boekingen/${this.bookId}/${this.currentPeriod}`;
      
      this.log('Opening card book URL', { url: bookUrl });
      
      // Open the book URL in a new tab
      chrome.runtime.sendMessage({
        action: "openTab",
        url: bookUrl
      }, (tabResponse) => {
        this.log('OpenTab response', { response: tabResponse });
        if (chrome.runtime.lastError) {
          this.handleError('Error opening tab', chrome.runtime.lastError);
          this.showCardBookResult('Error opening tab: ' + chrome.runtime.lastError.message);
        } else {
          this.showCardBookResult('Card book opened in new tab');
        }
      });
    } catch (error) {
      this.handleError('Failed to handle card book click', error);
      this.showCardBookResult('Error: Unable to open card book');
    }
  }

  /**
   * Removes the card book button and any related UI elements
   */
  removeCardBookButton() {
    try {
      const shadowHost = document.getElementById(this.config.hostElementId);
      if (shadowHost) {
        shadowHost.remove();
        this.bookButtonCreated = false;
        this.log('Card book button removed');
      }
    } catch (error) {
      this.handleError('Failed to remove card book button', error);
    }
  }

  /**
   * Shows a result message for card book operations
   * @param {string} message - The message to display
   */
  showCardBookResult(message) {
    try {
      let resultHost = document.getElementById('powercloud-book-result-host');
      if (!resultHost) {
        resultHost = document.createElement('div');
        resultHost.id = 'powercloud-book-result-host';
        document.body.appendChild(resultHost);
        
        // Style the result host
        resultHost.style.position = 'fixed';
        resultHost.style.right = '20px';
        resultHost.style.bottom = '60px';
        resultHost.style.zIndex = '10000';
        resultHost.style.backgroundColor = 'rgba(0,0,0,0.7)';
        resultHost.style.color = 'white';
        resultHost.style.padding = '10px 15px';
        resultHost.style.borderRadius = '4px';
        resultHost.style.maxWidth = '300px';
        resultHost.style.wordWrap = 'break-word';
      }
      
      resultHost.textContent = message;
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        if (resultHost && resultHost.parentNode) {
          resultHost.remove();
        }
      }, 3000);
    } catch (error) {
      this.handleError('Failed to show card book result', error);
    }
  }
}

// Register the feature with the PowerCloudFeatures namespace
if (window.PowerCloudFeatures) {
  window.PowerCloudFeatures.viewCardBook = {
    init: function(match, cardData) {
      cardBookLogger.info('ViewCardBook feature init called', { 
        match, 
        hasCardData: !!cardData
      });
      
      // Create and initialize the feature
      const feature = new ViewCardBookFeature();
      return feature.init(match, cardData).then(() => {
        feature.activate();
        // Store the instance for cleanup
        window.PowerCloudFeatures.viewCardBook._instance = feature;
        return feature;
      });
    },
    cleanup: function() {
      cardBookLogger.info('ViewCardBook feature cleanup called');
      // If we have an instance, call its cleanup method
      if (window.PowerCloudFeatures.viewCardBook._instance) {
        return window.PowerCloudFeatures.viewCardBook._instance.cleanup();
      }
      return Promise.resolve();
    }
  };
  
  cardBookLogger.info('ViewCardBook feature registered with PowerCloudFeatures');
} else {
  cardBookLogger.error('PowerCloudFeatures namespace not available, cannot register ViewCardBook feature');
}
