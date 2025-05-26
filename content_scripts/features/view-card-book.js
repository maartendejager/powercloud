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
console.log('[DEBUG][ViewCardBook] Script loaded and executing');

// Check if BaseFeature is available
if (typeof BaseFeature === 'undefined') {
  cardBookLogger.error('BaseFeature class not available! Cannot initialize ViewCardBookFeature');
  console.error('[DEBUG][ViewCardBook] BaseFeature is undefined');
} else {
  cardBookLogger.info('BaseFeature is available, proceeding with ViewCardBookFeature');
  console.log('[DEBUG][ViewCardBook] BaseFeature is available');
}

/**
 * ViewCardBookFeature class extending BaseFeature
 * Provides card book viewing functionality
 */
class ViewCardBookFeature extends BaseFeature {
  constructor() {
    super('view-card-book', {
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
    this.buttonManager = null;
  }

  /**
   * Initialize the feature with URL match data and card data
   * @param {object} match - The URL match result containing capture groups
   * @param {object} cardData - The card data response from the API
   */
  async onInit(match, cardData) {
    console.log('[DEBUG][ViewCardBook] onInit called with:', { 
      match, 
      hasCardData: !!cardData,
      matchType: typeof match,
      cardDataType: typeof cardData,
      url: window.location.href
    });
    
    try {
      await super.onInit(match);
      
      // Validate match data
      if (!match || (Array.isArray(match) && match.length < 3)) {
        console.error('[DEBUG][ViewCardBook] Invalid match data:', match);
        throw new Error('Invalid match data for view card book feature');
      }

      // Handle different match formats (array or object with groups)
      if (Array.isArray(match)) {
        // Array format from regex exec
        this.customer = match[1];
        this.cardId = match[2];
      } else if (match.groups) {
        // Object with named groups
        this.customer = match.groups.customer || match.groups[1];
        this.cardId = match.groups.cardId || match.groups[2];
      } else {
        // Try to extract from properties
        this.customer = match[1] || match.customer;
        this.cardId = match[2] || match.cardId;
      }
      
      console.log('[DEBUG][ViewCardBook] Customer and cardId extracted:', { 
        customer: this.customer, 
        cardId: this.cardId,
        extractionSuccessful: !!(this.customer && this.cardId)
      });
      
      // Verify we have the required data
      if (!this.customer || !this.cardId) {
        console.error('[DEBUG][ViewCardBook] Failed to extract customer or cardId from match:', match);
        throw new Error('Failed to extract customer or cardId from match data');
      }
      
      // If card data is available, extract book ID
      if (cardData) {
        console.log('[DEBUG][ViewCardBook] Card data available, extracting book ID');
        // Debug log the first part of the card data
        const cardDataStr = JSON.stringify(cardData).substring(0, 500);
        console.log(`[DEBUG][ViewCardBook] Card data preview: ${cardDataStr}...`);
        this.extractBookId(cardData);
      } else {
        console.warn('[DEBUG][ViewCardBook] No card data provided to extract book ID');
        // If no card data provided, try to fetch it (implementation for future)
        this.log('Attempting to recover by looking for data in window');
        // Look for data in window.__INITIAL_STATE__ or other common patterns
        this.tryRecoverCardData();
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
      
      console.log('[DEBUG][ViewCardBook] Initialization complete:', {
        customer: this.customer,
        cardId: this.cardId,
        bookId: this.bookId,
        currentPeriod: this.currentPeriod,
        hasBookId: !!this.bookId
      });
    } catch (error) {
      console.error('[DEBUG][ViewCardBook] Error during initialization:', error);
      throw error;
    }
  }
  
  /**
   * Try to recover card data from other sources if not provided
   * This is a fallback method
   */
  tryRecoverCardData() {
    try {
      console.log('[DEBUG][ViewCardBook] Attempting to recover card data from window object');
      // Check common patterns for data
      if (window.__INITIAL_STATE__ && window.__INITIAL_STATE__.cards) {
        console.log('[DEBUG][ViewCardBook] Found __INITIAL_STATE__ with cards data');
        const cardData = window.__INITIAL_STATE__.cards.find(c => c.id === this.cardId);
        if (cardData) {
          console.log('[DEBUG][ViewCardBook] Found card data in window.__INITIAL_STATE__');
          this.extractBookId(cardData);
          return;
        }
      }
      
      // Try looking for any book_id or books relationship in the page source
      const pageSource = document.documentElement.innerHTML;
      const bookIdMatch = pageSource.match(/"book_id"\s*:\s*"?(\d+)"?/);
      if (bookIdMatch && bookIdMatch[1]) {
        this.bookId = bookIdMatch[1];
        console.log('[DEBUG][ViewCardBook] Found book ID in page source:', this.bookId);
        return;
      }
      
      console.log('[DEBUG][ViewCardBook] Could not recover card data from alternative sources');
    } catch (error) {
      console.error('[DEBUG][ViewCardBook] Error trying to recover card data:', error);
    }
  }

  /**
   * Extract book ID from card data response
   * @param {object} cardData - Card data response from the API
   */
  extractBookId(cardData) {
    try {
      console.log('[DEBUG][ViewCardBook] Attempting to extract book ID from card data');
      
      // Deep debug logging of the card data structure
      let pathsToCheck = [];
      let dataStructure = {};
      
      // Check if response is wrapped in a container
      if (cardData?.success === true && cardData?.data) {
        console.log('[DEBUG][ViewCardBook] Found success wrapper structure');
        dataStructure.hasSuccessWrapper = true;
        cardData = cardData.data; // Unwrap the actual data
      }
      
      // Build data structure map for debugging
      dataStructure = {
        topLevelKeys: Object.keys(cardData || {}),
        hasData: !!cardData?.data,
        hasAttributes: !!cardData?.attributes || !!cardData?.data?.attributes,
        hasRelationships: !!cardData?.relationships || !!cardData?.data?.relationships,
        dataKeys: cardData?.data ? Object.keys(cardData.data) : []
      };
      
      // Build paths to check for book ID
      pathsToCheck = [
        { path: 'data.relationships.books.data[0].id', value: cardData?.data?.relationships?.books?.data?.[0]?.id },
        { path: 'relationships.books.data[0].id', value: cardData?.relationships?.books?.data?.[0]?.id },
        { path: 'data.attributes.books[0].id', value: cardData?.data?.attributes?.books?.[0]?.id },
        { path: 'attributes.books[0].id', value: cardData?.attributes?.books?.[0]?.id },
        { path: 'data.books[0].id', value: cardData?.data?.books?.[0]?.id },
        { path: 'books[0].id', value: cardData?.books?.[0]?.id },
        { path: 'data.book_id', value: cardData?.data?.book_id },
        { path: 'book_id', value: cardData?.book_id }
      ];
      
      console.log('[DEBUG][ViewCardBook] Card data structure:', dataStructure);
      console.log('[DEBUG][ViewCardBook] Paths to check for book ID:', pathsToCheck);
      
      // Try each path in order
      for (const { path, value } of pathsToCheck) {
        if (value) {
          this.bookId = value;
          this.log(`Book ID extracted from card data (${path})`, { bookId: this.bookId });
          console.log(`[DEBUG][ViewCardBook] Book ID found: ${this.bookId} from path: ${path}`);
          return;
        }
      }
      
      // Special case: if cardData is the full API response, try to check inside it
      if (cardData?.vendor && !this.bookId) {
        console.log('[DEBUG][ViewCardBook] Found vendor in cardData, checking for books in nested locations');
        
        // Check additional structures
        const bookDataInIncluded = cardData.included?.find(item => item.type === 'books');
        if (bookDataInIncluded) {
          this.bookId = bookDataInIncluded.id;
          this.log('Book ID extracted from included data', { bookId: this.bookId });
          console.log('[DEBUG][ViewCardBook] Book ID found in included data:', this.bookId);
          return;
        }
      }

      // If no book ID is found, dump the structure for debugging
      this.log('No book ID found in card data');
      console.warn('[DEBUG][ViewCardBook] No book ID could be found in the card data structure');
      console.log('[DEBUG][ViewCardBook] Full card data for debugging:', JSON.stringify(cardData, null, 2).substring(0, 500) + '...');
    } catch (error) {
      this.handleError('Failed to extract book ID from card data', error);
      console.error('[DEBUG][ViewCardBook] Error extracting book ID:', error);
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
  }  /**
   * Activate the feature - create book button if book ID is present
   */
  async onActivate() {
    await super.onActivate();

    try {
      console.log('[DEBUG][ViewCardBook] Activating feature with bookId:', this.bookId);
      
      // Check if book ID is available
      if (!this.bookId) {
        this.log('No book ID available, skipping button creation');
        console.warn('[DEBUG][ViewCardBook] Cannot create button due to missing book ID');
        return;
      }

      // Add button to view card book
      this.addCardBookButton();
      
    } catch (error) {
      this.handleError('Failed to activate view card book feature', error);
      console.error('[DEBUG][ViewCardBook] Activation error:', error);
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
    console.log('[DEBUG][ViewCardBook] addCardBookButton called. Button already exists?', this.bookButtonCreated);
    
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
        console.warn('[DEBUG][ViewCardBook] Cannot create button due to missing data:', {
          hasBookId: !!this.bookId, 
          bookId: this.bookId, 
          hasPeriod: !!this.currentPeriod, 
          period: this.currentPeriod
        });
        return;
      }
      
      console.log('[DEBUG][ViewCardBook] Creating button with PowerCloudButtonManager:', {
        bookId: this.bookId,
        currentPeriod: this.currentPeriod
      });
      
      // Initialize button manager if not already done
      if (!window.PowerCloudUI || !window.PowerCloudButtonManager) {
        console.error('[DEBUG][ViewCardBook] PowerCloudUI or PowerCloudButtonManager not available');
        this.emergencyShowButton();
        return;
      }
      
      // Get the singleton button manager instance
      this.buttonManager = window.PowerCloudUI.getButtonManager();
      
      // Add button using the centralized button manager
      const button = this.buttonManager.addButton('view-card-book', {
        id: 'book',
        text: 'View Card Book',
        variant: 'success',
        size: 'medium',
        onClick: () => this.handleCardBookClick()
      });
      
      if (button) {
        this.bookButtonCreated = true;
        this.log('Card book button added successfully using PowerCloudButtonManager');
        console.log('[DEBUG][ViewCardBook] Button creation completed successfully using PowerCloudButtonManager');
        
        // Verify button is visible
        setTimeout(() => {
          console.log('[DEBUG][ViewCardBook] Button manager status:', this.buttonManager.getStatus());
        }, 100);
      } else {
        console.warn('[DEBUG][ViewCardBook] Button creation failed, falling back to emergency method');
        this.emergencyShowButton();
      }
    } catch (error) {
      this.handleError('Failed to add card book button', error);
      console.error('[DEBUG][ViewCardBook] Error during button creation:', error);
    }
  }

  /**
   * Debug helper - check if button is in DOM and properly positioned
   */
  debugCheckButtonVisibility() {
    console.log('[DEBUG][ViewCardBook] Checking button visibility');
    
    try {
      // Check if button manager exists and has our button
      if (!this.buttonManager) {
        console.warn('[DEBUG][ViewCardBook] Button manager not found');
        return false;
      }
      
      const status = this.buttonManager.getStatus();
      console.log('[DEBUG][ViewCardBook] Button manager status:', status);
      
      // Check if our button is registered
      const hasButton = status.buttonCount > 0;
      console.log('[DEBUG][ViewCardBook] Button found in manager:', hasButton);
      return hasButton;
    } catch (error) {
      console.error('[DEBUG][ViewCardBook] Error checking button visibility:', error);
      return false;
    }
  }

  /**
   * Alternative test method to ensure button visibility by trying multiple approaches
   * This is a fallback for troubleshooting purposes
   */
  emergencyShowButton() {
    try {
      console.log('[DEBUG][ViewCardBook] Attempting emergency button display methods');
      
      // Try method 1: Direct DOM insertion with no shadow DOM
      const directBtn = document.createElement('button');
      directBtn.textContent = 'View Card Book (Direct)';
      directBtn.style.position = 'fixed';
      directBtn.style.right = '20px';
      directBtn.style.bottom = '60px';
      directBtn.style.zIndex = '10000';
      directBtn.style.backgroundColor = '#4CAF50';
      directBtn.style.color = 'white';
      directBtn.style.padding = '10px 15px';
      directBtn.style.border = 'none';
      directBtn.style.borderRadius = '4px';
      directBtn.style.cursor = 'pointer';
      directBtn.style.fontWeight = 'bold';
      directBtn.id = 'powercloud-emergency-book-btn';
      
      // Add click handler
      directBtn.addEventListener('click', () => {
        try {
          if (this.bookId && this.currentPeriod) {
            const isDev = window.location.href.includes('.dev.spend.cloud');
            const baseUrl = `https://${this.customer}${isDev ? '.dev' : ''}.spend.cloud`;
            const bookUrl = `${baseUrl}/proactive/kasboek.boekingen/${this.bookId}/${this.currentPeriod}`;
            window.open(bookUrl, '_blank');
          } else {
            alert('No book ID available for this card');
          }
        } catch (clickError) {
          console.error('[DEBUG][ViewCardBook] Error in emergency button click:', clickError);
        }
      });
      
      document.body.appendChild(directBtn);
      console.log('[DEBUG][ViewCardBook] Added emergency direct button to DOM');
      
      // Try method 2: Append to a common container
      try {
        // Look for common containers in the page
        const containers = [
          document.querySelector('.card-details'),
          document.querySelector('.card-header'),
          document.querySelector('header'),
          document.querySelector('main')
        ].filter(Boolean);
        
        if (containers.length > 0) {
          const container = containers[0];
          const inlineBtn = document.createElement('button');
          inlineBtn.textContent = 'View Book';
          inlineBtn.className = 'btn btn-secondary';
          inlineBtn.style.margin = '10px';
          inlineBtn.addEventListener('click', () => {
            try {
              if (this.bookId && this.currentPeriod) {
                const isDev = window.location.href.includes('.dev.spend.cloud');
                const baseUrl = `https://${this.customer}${isDev ? '.dev' : ''}.spend.cloud`;
                const bookUrl = `${baseUrl}/proactive/kasboek.boekingen/${this.bookId}/${this.currentPeriod}`;
                window.open(bookUrl, '_blank');
              } else {
                alert('No book ID available for this card');
              }
            } catch (clickError) {
              console.error('[DEBUG][ViewCardBook] Error in inline button click:', clickError);
            }
          });
          
          container.appendChild(inlineBtn);
          console.log('[DEBUG][ViewCardBook] Added emergency inline button to container:', container);
        }
      } catch (inlineError) {
        console.error('[DEBUG][ViewCardBook] Error with inline button:', inlineError);
      }
      
      return true;
    } catch (error) {
      console.error('[DEBUG][ViewCardBook] Emergency button display failed:', error);
      return false;
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
      if (this.buttonManager) {
        this.buttonManager.removeButton('view-card-book', 'book');
        this.bookButtonCreated = false;
        this.log('Card book button removed');
      }
      
      // Also clean up any emergency buttons that might exist
      const emergencyBtn = document.getElementById('powercloud-emergency-book-btn');
      if (emergencyBtn) {
        emergencyBtn.remove();
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
// Ensure feature registration happens after page is fully loaded to avoid timing issues
const registerViewCardBookFeature = function() {
  // Ensure PowerCloudFeatures namespace exists
  window.PowerCloudFeatures = window.PowerCloudFeatures || {};
  
  // Define our feature
  window.PowerCloudFeatures.viewCardBook = {
    init: function(match, cardData) {
      cardBookLogger.info('ViewCardBook feature init called', { 
        match, 
        hasCardData: !!cardData,
        cardDataStructure: cardData ? Object.keys(cardData) : []
      });
      console.log('[DEBUG][ViewCardBook] Init called with card data structure:', 
        cardData ? JSON.stringify(cardData, null, 2) : 'No card data');
      
      try {
        // Create and initialize the feature
        const feature = new ViewCardBookFeature();
        return feature.onInit(match, cardData).then(() => {
          console.log('[DEBUG][ViewCardBook] Init completed, activating feature');
          feature.onActivate();
          // Store the instance for cleanup
          window.PowerCloudFeatures.viewCardBook._instance = feature;
          return feature;
        }).catch(error => {
          console.error('[DEBUG][ViewCardBook] Error during init/activate:', error);
          throw error;
        });
      } catch (error) {
        console.error('[DEBUG][ViewCardBook] Error creating feature instance:', error);
        throw error;
      }
    },
    cleanup: function() {
      cardBookLogger.info('ViewCardBook feature cleanup called');
      // If we have an instance, call its cleanup method
      if (window.PowerCloudFeatures.viewCardBook._instance) {
        return window.PowerCloudFeatures.viewCardBook._instance.onCleanup();
      }
      return Promise.resolve();
    }
  };
  
  cardBookLogger.info('ViewCardBook feature registered with PowerCloudFeatures');
  console.log('[DEBUG][ViewCardBook] Feature successfully registered with PowerCloudFeatures');
};

// Immediate registration attempt
if (typeof BaseFeature !== 'undefined') {
  registerViewCardBookFeature();
} else {
  cardBookLogger.warn('BaseFeature not available yet, will try again when page loads');
  console.warn('[DEBUG][ViewCardBook] BaseFeature not available yet, will try again when page loads');
  
  // Try again when the document is fully loaded
  if (document.readyState === 'complete') {
    registerViewCardBookFeature();
  } else {
    window.addEventListener('load', function() {
      console.log('[DEBUG][ViewCardBook] Window loaded, attempting to register feature');
      if (typeof BaseFeature !== 'undefined') {
        registerViewCardBookFeature();
      } else {
        console.error('[DEBUG][ViewCardBook] BaseFeature still not available after page load');
        cardBookLogger.error('BaseFeature class not available after page load! Cannot initialize ViewCardBookFeature');
      }
    });
  }
}
