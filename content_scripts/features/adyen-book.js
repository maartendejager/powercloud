/**
 * Adyen Book Feature Module
 * 
 * This module provides functionality for viewing balance account information at Adyen
 * for book pages at https://[customer-environment].spend.cloud/proactive/kasboek.boekingen/[book-id]/*
 */

/**
 * Initialize the book feature
 * Adds functionality specific to book pages
 * @param {object} match - The URL match result containing capture groups
 */
function initBookFeature(match) {
  if (!match || match.length < 3) return;
  
  const customer = match[1]; // Extract customer subdomain
  const bookId = match[2];   // Extract the actual book ID from URL
  
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
          
          // Check for monetary_account_book type
          if (bookType === 'monetary_account_book') {
            
            // Check administration ID from relationships
            if (!administrationId && !adyenBalanceAccountId) {
              // No relevant IDs found for this monetary_account_book
            }
          }
          
          // If we have an administration ID but no balance account ID, fetch administration details
          if (bookType === 'monetary_account_book' && administrationId && !adyenBalanceAccountId) {
            // Create a unique request ID to track this specific request
            const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
            
            // Fetch administration details to check for balance account ID
            try {
              chrome.runtime.sendMessage(
                { 
                  action: "fetchAdministrationDetails", 
                  customer: customer, 
                  administrationId: administrationId,
                  requestId: requestId
                },
                (adminResponse) => {
                  
                  if (adminResponse && adminResponse.success) {
                    const balanceAccountIdFromAdmin = adminResponse.balanceAccountId;
                    
                    // Examine raw data
                    const rawData = adminResponse.data;
                    
                    // Check relationships data
                    const relationships = rawData?.relationships || rawData?.data?.relationships;
                    
                    if (balanceAccountIdFromAdmin) {
                      // Now add the button with the balance account ID
                      addBookInfoButton(customer, bookId, bookType, balanceAccountIdFromAdmin, administrationId, balanceAccountReference);
                    } else {
                      
                      // Try to extract it manually from the raw data
                      let extractedBalanceAccountId = null;
                      
                      // Check various possible paths for the balance account ID
                      if (rawData?.data?.relationships?.balanceAccount?.data?.id) {
                        extractedBalanceAccountId = rawData.data.relationships.balanceAccount.data.id;
                      } else if (rawData?.relationships?.balanceAccount?.data?.id) {
                        extractedBalanceAccountId = rawData.relationships.balanceAccount.data.id;
                      } else if (rawData?.attributes?.balanceAccountId) {
                        extractedBalanceAccountId = rawData.attributes.balanceAccountId;
                      } else if (rawData?.data?.attributes?.balanceAccountId) {
                        extractedBalanceAccountId = rawData.data.attributes.balanceAccountId;
                      }
                      
                      if (extractedBalanceAccountId) {
                        addBookInfoButton(customer, bookId, bookType, extractedBalanceAccountId, administrationId, balanceAccountReference);
                      } else {
                        // Add button without balance account ID
                        addBookInfoButton(customer, bookId, bookType, null, administrationId, balanceAccountReference);
                      }
                    }
                  } else {
                    // Add button without balance account ID
                    addBookInfoButton(customer, bookId, bookType, null, administrationId, balanceAccountReference);
                  }
                }
              );
            } catch (error) {
              // Add button without balance account ID as a fallback
              addBookInfoButton(customer, bookId, bookType, null, administrationId, balanceAccountReference);
            }
          } 
          // Add the button directly if we already have a balance account ID or if it's a different book type
          else if (bookType) {
            addBookInfoButton(customer, bookId, bookType, adyenBalanceAccountId, administrationId, balanceAccountReference);
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

  // Book and administration information handling
  
  // Create a badge to show the book type
  const typeBadge = document.createElement('div');
  typeBadge.className = 'powercloud-info-badge';
  typeBadge.textContent = `Book Type: ${bookType}`;
  buttonContainer.appendChild(typeBadge);

  // Special handling for monetary_account_book type
  if (bookType === 'monetary_account_book') {
    const monetaryBadge = document.createElement('div');
    monetaryBadge.className = 'powercloud-monetary-badge';
    monetaryBadge.textContent = 'Monetary Account Book';
    buttonContainer.appendChild(monetaryBadge);
    
    // If we have administration ID, display it
    if (administrationId) {
      const adminBadge = document.createElement('div');
      adminBadge.className = 'powercloud-admin-badge';
      adminBadge.textContent = `Administration ID: ${administrationId}`;
      adminBadge.title = "The administration ID from the book's relationships";
      buttonContainer.appendChild(adminBadge);
    }
  }
  
  // Create the button
  const button = document.createElement('button');
  button.id = 'powercloud-book-info-btn';
  button.className = 'powercloud-button';
  
  // Set button text to "Monetary Account Book"
  button.innerHTML = 'Monetary Account Book';
  
  // Set button state based on balance account availability
  if (balanceAccountId) {
    // Create badge for balance account reference if available
    if (balanceAccountReference) {
      const refBadge = document.createElement('div');
      refBadge.className = 'powercloud-balance-badge';
      refBadge.textContent = `Balance Account: ${balanceAccountReference}`;
      buttonContainer.appendChild(refBadge);
    } else {
      // Create a badge for the balance account ID
      const balanceBadge = document.createElement('div');
      balanceBadge.className = 'powercloud-balance-badge';
      balanceBadge.textContent = `Balance Account ID: ${balanceAccountId.substring(0, 8)}...`;
      balanceBadge.title = balanceAccountId;
      buttonContainer.appendChild(balanceBadge);
    }
    
    button.disabled = false;
    button.title = `View balance account details at Adyen`;
    
    // Add click event to open Adyen balance account page
    button.addEventListener('click', () => {
      const originalText = button.innerHTML;
      button.innerHTML = '⏳ Loading...';
      button.disabled = true;
      
      // Open Adyen directly in a new tab
      const adyenUrl = `https://balanceplatform-live.adyen.com/balanceplatform/balance-accounts/${balanceAccountId}`;
      window.open(adyenUrl, '_blank');
      
      // Restore button text
      setTimeout(() => {
        button.innerHTML = originalText;
        button.disabled = false;
      }, 1500);
    });
  } else {
    button.disabled = true;
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
