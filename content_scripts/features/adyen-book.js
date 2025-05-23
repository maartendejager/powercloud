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

// Initialize the PowerCloudFeatures namespace if it doesn't exist
window.PowerCloudFeatures = window.PowerCloudFeatures || {};
window.PowerCloudFeatures.book = window.PowerCloudFeatures.book || {};

/**
 * Initialize the book feature
 * Adds functionality specific to book pages
 * @param {object} match - The URL match result containing capture groups
 *                        For URLs like https://[customer].spend.cloud/* or https://[customer].dev.spend.cloud/*
 *                        match[1]=customer, match[2]=bookId
 */
function initBookFeature(match) {
  if (!match || match.length < 3) return;
  
  // In our new pattern, customer is always in match[1] and bookId is always in match[2]
  const customer = match[1];
  const bookId = match[2];
  
  // Check if buttons should be shown before fetching book details
  chrome.storage.local.get('showButtons', (result) => {
    const showButtons = result.showButtons === undefined ? true : result.showButtons;
    
    if (!showButtons) {
      return;
    }
    
    // First fetch book details to determine book type before adding button
    chrome.runtime.sendMessage(
      { 
        action: "fetchBookDetails", 
        customer: customer, 
        bookId: bookId 
      },
      (response) => {
        if (response && response.success) {
          const bookType = response.bookType;
          const adyenBalanceAccountId = response.adyenBalanceAccountId;
          const administrationId = response.administrationId;
          const balanceAccountReference = response.balanceAccountReference;
          
          // Only continue for monetary_account_book type
          if (bookType !== 'monetary_account_book') {
            return;
          }
          
          // Either use the direct balance account ID or show a disabled button
          if (adyenBalanceAccountId) {
            // If we have a direct adyenBalanceAccountId, add the button with that ID
            addBookInfoButton(customer, bookId, bookType, adyenBalanceAccountId, administrationId, balanceAccountReference);
          } else {
            // No balance account ID found, show disabled button
            addBookInfoButton(customer, bookId, bookType, null, administrationId, balanceAccountReference);
          }
        }
      }
    );
  });
}

/**
 * Adds a button to view balance account at Adyen
 * @param {string} customer - The customer subdomain
 * @param {string} bookId - The book ID
 * @param {string} bookType - The type of book
 * @param {string} balanceAccountId - The Adyen balance account ID if available
 * @param {string} administrationId - The administration ID if available
 * @param {string} balanceAccountReference - Optional reference/name for the balance account
 */
function addBookInfoButton(customer, bookId, bookType, balanceAccountId, administrationId, balanceAccountReference) {
  // Only show button for monetary_account_book type
  if (bookType !== 'monetary_account_book') {
    return;
  }
  
  // Check if button already exists
  if (document.getElementById('powercloud-shadow-host')) {
    return;
  }

  // Create shadow DOM host element
  const shadowHost = document.createElement('div');
  shadowHost.id = 'powercloud-shadow-host'; 
  // The positioning styles are now in the CSS file
  
  // Check if buttons should be hidden by default
  chrome.storage.local.get('showButtons', (result) => {
    const showButtons = result.showButtons === undefined ? true : result.showButtons;
    shadowHost.className = showButtons ? 'powercloud-visible' : 'powercloud-hidden';
  });
  
  // Attach a shadow DOM tree to completely isolate our styles
  const shadowRoot = shadowHost.attachShadow({ mode: 'closed' });
  
  // Add link to our external stylesheet in shadow DOM
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
  
  // Set button state and text based on balance account availability
  if (balanceAccountId) {
    // Set button text based on whether we have a reference or just an ID
    if (balanceAccountReference) {
      button.innerHTML = `View Adyen Balance Account: ${balanceAccountReference}`;
      button.title = `View balance account details for ${balanceAccountReference} at Adyen`;
    } else {
      // Show a truncated version of the ID in the button text
      button.innerHTML = `View Adyen Balance Account: ${balanceAccountId.substring(0, 8)}...`;
      button.title = `View balance account details for ID: ${balanceAccountId} at Adyen`;
    }
    
    button.disabled = false;
    
    // Add click event to open Adyen balance account page
    button.addEventListener('click', () => {
      const originalText = button.innerHTML;
      button.innerHTML = '⏳ Loading...';
      button.disabled = true;
      
      // First, fetch the Adyen balance account ID
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      chrome.runtime.sendMessage(
        { 
          action: "fetchBalanceAccountDetails", 
          customer: customer, 
          balanceAccountId: balanceAccountId,
          requestId: requestId
        },
        (response) => {
          if (response && response.success && response.adyenBalanceAccountId) {
            // Open Adyen directly in a new tab with the correct adyenBalanceAccountId
            const adyenUrl = `https://balanceplatform-live.adyen.com/balanceplatform/accounts/balance-accounts/${response.adyenBalanceAccountId}`;
            window.open(adyenUrl, '_blank');
          } else {
            console.error('Failed to fetch Adyen balance account ID:', response?.error || 'Unknown error');
            // Fall back to using the internal balance account ID
            const adyenUrl = `https://balanceplatform-live.adyen.com/balanceplatform/balance-accounts/${balanceAccountId}`;
            window.open(adyenUrl, '_blank');
          }
          
          // Restore button text
          setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
          }, 1500);
        }
      );
    });
  } else {
    button.disabled = true;
    button.innerHTML = 'Adyen Balance Account Not Found';
    button.title = `This monetary account book doesn't have a linked Adyen balance account`;
  }

  // Add button to container and container to shadow DOM
  buttonContainer.appendChild(button);
  shadowRoot.appendChild(buttonContainer);
  
  // Add shadow host to the page
  document.body.appendChild(shadowHost);
}

/**
 * Remove book info button and related UI elements
 */
function removeBookInfoButton() {
  const shadowHost = document.getElementById('powercloud-shadow-host');
  if (shadowHost) {
    shadowHost.remove();
  }
  
  const resultHost = document.getElementById('powercloud-result-host');
  if (resultHost) {
    resultHost.remove();
  }
}

// Create namespace for PowerCloud features if it doesn't exist
window.PowerCloudFeatures = window.PowerCloudFeatures || {};

// Register book feature functions in the PowerCloud namespace
window.PowerCloudFeatures.book = {
  init: initBookFeature,
  cleanup: removeBookInfoButton
};
