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

// Initialize the PowerCloudFeatures namespace if it doesn't exist
window.PowerCloudFeatures = window.PowerCloudFeatures || {};
window.PowerCloudFeatures.entries = window.PowerCloudFeatures.entries || {};

// Constants for feature elements
const FEATURE_HOST_ID = 'powercloud-shadow-host';
const ADYEN_TRANSFERS_BASE_URL = 'https://balanceplatform-live.adyen.com/balanceplatform/transfers/';

/**
 * Initialize the entries feature
 * Adds functionality specific to book entry pages
 * @param {object} match - The URL match result containing capture groups
 *                        For URLs like https://[customer].spend.cloud/proactive/kasboek.boekingen/show?id=[entry-id]
 *                        or https://[customer].dev.spend.cloud/proactive/kasboek.boekingen/show?id=[entry-id]
 *                        match[1]=customer, match[2]=entryId (from query parameter)
 */
function initEntriesFeature(match) {
  // Extract entryId from URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const entryId = urlParams.get('id');
  
  if (!match || !match[1] || !entryId) {
    console.log('Adyen Entries: Invalid URL match or missing entry ID, exiting.');
    return;
  }
  
  const customer = match[1];
  
  // Check if buttons should be shown before fetching entry details
  chrome.storage.local.get('showButtons', (result) => {
    const showButtons = result.showButtons === undefined ? true : result.showButtons;
    
    if (!showButtons) {
      return;
    }
    
    // Fetch entry details to check for adyenTransferId
    fetchEntryDetails(customer, entryId);
  });
}

/**
 * Fetch entry details from API
 * @param {string} customer - The customer subdomain
 * @param {string} entryId - The entry ID
 */
function fetchEntryDetails(customer, entryId) {
  chrome.runtime.sendMessage(
    { 
      action: "fetchEntryDetails", 
      customer: customer, 
      entryId: entryId 
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error fetching entry details:", chrome.runtime.lastError.message);
        return;
      }
      
      if (!response || !response.success) {
        console.log('Failed to fetch entry details:', response?.error || 'Unknown error');
        return;
      }
      
      // Extract adyenTransferId from the response
      const entryData = response.data?.data?.attributes || response.data?.attributes || response.data;
      const adyenTransferId = entryData?.adyenTransferId;
      
      // Add the UI with the transfer ID
      addEntryFeatureUI(entryId, adyenTransferId);
    }
  );
}

/**
 * Add the UI elements for the Adyen Entries feature
 * @param {string} entryId - The ID of the entry
 * @param {string|null} adyenTransferId - The Adyen transfer ID (if available)
 */
function addEntryFeatureUI(entryId, adyenTransferId) {
    console.log('Adding Adyen Entries feature UI');
    console.log(`Entry ID: ${entryId}, Adyen Transfer ID: ${adyenTransferId || 'not available'}`);

  // First, let's try to clean up any existing UI
  cleanupEntriesFeature();
  
  // Check if any PowerCloud feature UI from other features exists and leave those alone
  const existingHost = document.getElementById(FEATURE_HOST_ID);
  if (existingHost) {
    console.log('Another feature UI is present, using a unique ID for ours');
    // If there's already a shared host, use our specific host ID instead
    const ourShadowHost = document.createElement('div');
    ourShadowHost.id = 'powercloud-adyen-entries-host';
    
    // Position it near but not overlapping the existing button
    ourShadowHost.style.cssText = 'position: fixed; bottom: 20px; right: 80px; z-index: 9999;';
    
    document.body.appendChild(ourShadowHost);
    console.log('Created our custom shadow host');
    
    // Create and attach shadow DOM
    const shadowRoot = ourShadowHost.attachShadow({ mode: 'closed' });
    
    // Rest of the UI creation...
    createUiContent(shadowRoot, adyenTransferId);
    return;
  }
  
  // No existing UI, create the standard shadow host
  const shadowHost = document.createElement('div');
  shadowHost.id = FEATURE_HOST_ID;
  
  // Check if buttons should be hidden by default
  chrome.storage.local.get('showButtons', (result) => {
    const showButtons = result.showButtons === undefined ? true : result.showButtons;
    shadowHost.className = showButtons ? 'powercloud-visible' : 'powercloud-hidden';
  });
  
  document.body.appendChild(shadowHost);
  console.log('Shadow host added to document body');
  
  const shadowRoot = shadowHost.attachShadow({ mode: 'closed' });
  
  // Create the UI content
  createUiContent(shadowRoot, adyenTransferId);
}

/**
 * Create UI content inside the shadow root
 * @param {ShadowRoot} shadowRoot - The shadow root to add content to
 * @param {string|null} adyenTransferId - The Adyen transfer ID (if available)
 */
function createUiContent(shadowRoot, adyenTransferId) {
  // Add stylesheet
  const linkElem = document.createElement('link');
  linkElem.rel = 'stylesheet';
  linkElem.href = chrome.runtime.getURL('content_scripts/styles.css');
  shadowRoot.appendChild(linkElem);
  console.log('Stylesheet linked to shadow DOM');
  
  // Create container
  const container = document.createElement('div');
  container.className = 'powercloud-container powercloud-button-container';
  
  // Create button
  const button = document.createElement('button');
  button.className = 'powercloud-button';
  button.id = 'powercloud-adyen-transfer-btn';
  
  if (adyenTransferId) {
    button.textContent = 'View in Adyen';
    button.title = `Open Adyen transfer ${adyenTransferId}`;
    button.addEventListener('click', () => handleViewAdyenTransfer(adyenTransferId, button));
  } else {
    button.textContent = 'No Adyen Transfer';
    button.disabled = true;
    button.title = 'This entry has no associated Adyen transfer';
  }
  
  container.appendChild(button);
  shadowRoot.appendChild(container);
  console.log('Button added to shadow DOM');
}

/**
 * Handle clicking the "View in Adyen" button
 * @param {string} adyenTransferId - The Adyen transfer ID
 * @param {HTMLButtonElement} buttonElement - The button element
 */
function handleViewAdyenTransfer(adyenTransferId, buttonElement) {
  const originalText = buttonElement.textContent;
  buttonElement.textContent = '⏳ Opening...';
  buttonElement.disabled = true;
  
  try {
    // Open Adyen transfer URL in a new tab
    const adyenUrl = `${ADYEN_TRANSFERS_BASE_URL}${adyenTransferId}`;
    window.open(adyenUrl, '_blank');
    
    // Show success message
    if (window.PowerCloudFeatures.card?.showResult) {
      window.PowerCloudFeatures.card.showResult('Opened Adyen transfer in new tab');
    } else {
      console.log('Success: Opened Adyen transfer in new tab');
    }
  } catch (error) {
    // Show error message
    if (window.PowerCloudFeatures.card?.showResult) {
      window.PowerCloudFeatures.card.showResult(`Error opening Adyen transfer: ${error.message}`);
    } else {
      console.error('Error opening Adyen transfer:', error);
    }
  }
  
  // Reset button state
  buttonElement.textContent = originalText;
  buttonElement.disabled = false;
}

/**
 * Clean up UI elements added by the Entries Feature
 */
function cleanupEntriesFeature() {
  // Check for the standard shadow host
  const shadowHost = document.getElementById(FEATURE_HOST_ID);
  if (shadowHost) {
    // Only remove if it's ours (check for our button)
    // Note: we can't directly check the shadow DOM due to closed mode,
    // so we just check if another feature is active that might be using it
    const isBookActive = window.PowerCloudFeatures?.book?.isActive?.();
    const isCardActive = window.PowerCloudFeatures?.card?.isActive?.();
    
    if (!isBookActive && !isCardActive) {
      shadowHost.remove();
      console.log('Removed standard shadow host');
    } else {
      console.log('Standard shadow host being used by another feature, not removing');
    }
  }
  
  // Always check for our custom shadow host
  const customShadowHost = document.getElementById('powercloud-adyen-entries-host');
  if (customShadowHost) {
    customShadowHost.remove();
    console.log('Removed custom shadow host');
  }
}

// Register functions in the PowerCloudFeatures namespace
window.PowerCloudFeatures.entries.init = initEntriesFeature;
window.PowerCloudFeatures.entries.cleanup = cleanupEntriesFeature;
