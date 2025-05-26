/**
 * UI Visibility Manager Feature Module
 *
 * This module handles the visibility of dynamically injected UI elements (like buttons)
 * based on user settings from the popup.
 *
 * Loading Method: Manifest-only
 * This script is loaded via the manifest.json content_scripts configuration.
 */

// Initialize the PowerCloudFeatures namespace if it doesn't exist
window.PowerCloudFeatures = window.PowerCloudFeatures || {};
window.PowerCloudFeatures.uiVisibilityManager = window.PowerCloudFeatures.uiVisibilityManager || {};

/**
 * Initialize the UI visibility management feature.
 * Sets up a message listener to toggle visibility of UI elements.
 */
function initVisibilityManager() {
  // Set up message listener for button visibility
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateButtonVisibility') {
      try {
        // Store the visibility state globally
        window.PowerCloudFeatures.uiVisibilityManager.showButtons = message.showButtons;
        
        // Handle toggling button visibility for both legacy and new container
        const visibilityUpdated = updateButtonVisibility(message.showButtons);
        
        // Log result
        if (visibilityUpdated) {
          console.log(`Button visibility updated: ${message.showButtons ? 'visible' : 'hidden'}`);
        } else {
          console.log('Button containers not found, visibility state stored but UI not updated');
        }
        
        sendResponse({ status: 'Updated button visibility', success: true });
      } catch (err) {
        console.error('Error updating button visibility:', err);
        sendResponse({ status: 'Error updating button visibility', success: false, error: err.message });
      }
    }
    return true; // Keep the message channel open for asynchronous response
  });
}

/**
 * Update button visibility for all container types
 * @param {boolean} isVisible - Whether buttons should be visible
 * @returns {boolean} Whether any containers were updated
 */
function updateButtonVisibility(isVisible) {
  let updated = false;
  
  console.log(`[UI Visibility] Updating button visibility: ${isVisible ? 'visible' : 'hidden'}`);
  
  // If hiding buttons completely (isVisible = false), simply call the main cleanup function
  if (!isVisible && typeof window.cleanupButtonContainer === 'function') {
    console.log('[UI Visibility] Using cleanupButtonContainer for complete removal');
    try {
      // Use the main cleanup function for complete removal
      window.cleanupButtonContainer();
      return true;
    } catch (err) {
      console.error('[UI Visibility] Error using cleanupButtonContainer:', err);
      // Fall through to traditional visibility methods below
    }
  }
  
  // Traditional visibility methods (CSS classes)
  
  // 1. Legacy container
  const buttonHost = document.getElementById('powercloud-shadow-host');
  if (buttonHost) {
    buttonHost.className = isVisible ? 'powercloud-visible' : 'powercloud-hidden';
    updated = true;
    console.log('[UI Visibility] Updated legacy shadow host');
  }
  
  // 2. New container (direct element)
  const buttonContainer = document.getElementById('powercloud-button-container');
  if (buttonContainer) {
    buttonContainer.className = isVisible ? 'powercloud-button-container powercloud-visible' : 'powercloud-button-container powercloud-hidden';
    updated = true;
    console.log('[UI Visibility] Updated button container element');
  }
  
  // 3. If PowerCloudButtonManager is available, use its updateVisibility method
  if (window.PowerCloudButtonManager?.instance) {
    if (typeof window.PowerCloudButtonManager.instance.updateVisibility === 'function') {
      // Use the manager's updateVisibility method if available
      const managerUpdated = window.PowerCloudButtonManager.instance.updateVisibility(isVisible);
      if (managerUpdated) {
        updated = true;
        console.log('[UI Visibility] Updated via PowerCloudButtonManager.updateVisibility()');
      }
    } else if (window.PowerCloudButtonManager.instance.container?.element) {
      // Fall back to direct element access if method isn't available
      const managerContainer = window.PowerCloudButtonManager.instance.container.element;
      managerContainer.className = isVisible ? 'powercloud-button-container powercloud-visible' : 'powercloud-button-container powercloud-hidden';
      updated = true;
      console.log('[UI Visibility] Updated via direct container element access');
    }
  }
  
  return updated;
}

/**
 * Apply initial visibility settings based on stored preference
 */
function applyInitialVisibility() {
  chrome.storage.local.get('showButtons', (result) => {
    const showButtons = result.showButtons === undefined ? true : result.showButtons;
    
    // Store the current visibility state
    window.PowerCloudFeatures.uiVisibilityManager.showButtons = showButtons;
    
    // Apply visibility to all button containers
    const visibilityUpdated = updateButtonVisibility(showButtons);
    
    if (visibilityUpdated) {
      console.log(`Initial button visibility set to: ${showButtons ? 'visible' : 'hidden'}`);
    } else {
      console.log('Button containers not found during initialization, visibility will be applied when created');
      
      // Set up a MutationObserver to detect when containers are added to the DOM
      setupButtonContainerObserver(showButtons);
    }
  });
}

/**
 * Set up a MutationObserver to detect when button containers are added to the DOM
 * @param {boolean} initialVisibility - Initial visibility setting to apply
 */
function setupButtonContainerObserver(initialVisibility) {
  // Create an observer to detect when buttons are added to the DOM
  const observer = new MutationObserver(mutations => {
    let containersFound = false;
    
    for (const mutation of mutations) {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        // Check if our containers were added
        if (document.getElementById('powercloud-shadow-host') || 
            document.getElementById('powercloud-button-container')) {
          containersFound = true;
          break;
        }
      }
    }
    
    if (containersFound) {
      // Apply visibility
      updateButtonVisibility(window.PowerCloudFeatures.uiVisibilityManager.showButtons);
      console.log(`Button containers found and visibility applied: ${window.PowerCloudFeatures.uiVisibilityManager.showButtons ? 'visible' : 'hidden'}`);
      
      // Disconnect observer since we found our elements
      observer.disconnect();
    }
  });
  
  // Start observing the document body for added nodes
  observer.observe(document.body, { childList: true, subtree: true });
  console.log('Button container observer set up');
}

// Register visibility manager functions in the PowerCloud namespace
window.PowerCloudFeatures.uiVisibilityManager = {
  // Current visibility state (default to true - visible)
  showButtons: true,
  
  init: function() {
    // Initialize the message listener
    initVisibilityManager();
    
    // Apply initial visibility settings
    applyInitialVisibility();
    
    // Return success
    return true;
  },
  
  // Method to programmatically update visibility
  updateVisibility: function(isVisible) {
    // Store the state
    this.showButtons = isVisible;
    
    // Apply to all button containers
    return updateButtonVisibility(isVisible);
  },
  
  // Get current visibility state
  getVisibility: function() {
    return this.showButtons;
  }
};
