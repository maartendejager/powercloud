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
  
  console.log(`Found book page. Customer: ${customer}, Book ID: ${bookId}`);
  
  // Check if buttons should be shown before fetching book details
  chrome.storage.local.get('showButtons', (result) => {
    const showButtons = result.showButtons === undefined ? true : result.showButtons;
    
    if (!showButtons) {
      console.log('Buttons are disabled. Skipping button creation.');
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
          
          // Enhanced logging with all details
          console.log(`Book Details: Type=${bookType}, AdministrationId=${administrationId || 'N/A'}`);
          
          // Log more details for monetary_account_book type
          if (bookType === 'monetary_account_book') {
            console.log('Special book type detected: monetary_account_book');
            
            // Check and log administration ID from relationships
            if (administrationId) {
              console.log(`%c ADMINISTRATION ID: ${administrationId} `, 'background: #FF9800; color: white; font-size: 14px; font-weight: bold;');
              console.log(`The administration ID for this monetary account book is: ${administrationId}`);
              console.log(`Path to administration ID in response: data->relationships->administration->data->id`);
              
              // Add expanded object for easy inspection
              console.log('Administration ID details:', {
                id: administrationId,
                bookId: bookId,
                customer: customer,
                bookType: bookType,
                foundIn: 'data.relationships.administration.data.id',
                timestamp: new Date().toISOString()
              });
            } else {
              console.warn('No Administration ID found for this monetary_account_book');
            }
            
            if (adyenBalanceAccountId) {
              console.log(`Balance Account ID: ${adyenBalanceAccountId}`);
              if (balanceAccountReference) {
                console.log(`Balance Account Reference: ${balanceAccountReference}`);
              }
            } else {
              console.warn('No Balance Account ID found for monetary_account_book');
            }
          }
          
          // Add the button only if it has a bookType
          if (bookType) {
            addBookInfoButton(customer, bookId, bookType, adyenBalanceAccountId, administrationId, balanceAccountReference);
          } else {
            console.log('Book type not found, not showing button');
          }
        } else {
          const errorMessage = response?.error || 'Failed to fetch book details';
          console.error(`Error fetching book details: ${errorMessage}`);
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
    console.log(`Book type is '${bookType}', not 'monetary_account_book'. No button will be added.`);
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
    shadowHost.style.display = showButtons ? 'block' : 'none';
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

  // Log book and administration information
  console.log(`Book Information - Type: ${bookType}, AdministrationId: ${administrationId || 'N/A'}`);
  if (administrationId) {
    console.log(`Found Administration ID: ${administrationId}`);
  } else {
    console.log('No Administration ID found in the response');
  }
  
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

// Make the initBookFeature function available globally
// This approach works even when ES modules aren't available
window.initBookFeature = initBookFeature;
