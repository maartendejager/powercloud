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
      // Handle toggling button visibility
      const buttonHost = document.getElementById('powercloud-shadow-host');
      if (buttonHost) {
        buttonHost.className = message.showButtons ? 'powercloud-visible' : 'powercloud-hidden';
      }
      sendResponse({ status: 'Updated button visibility' });
    }
    return true; // Keep the message channel open for asynchronous response
  });
}

// Register visibility manager functions in the PowerCloud namespace
window.PowerCloudFeatures.uiVisibilityManager = {
  init: initVisibilityManager
};
