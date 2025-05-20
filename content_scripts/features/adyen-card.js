// filepath: /home/maarten/projects/Extensions/PowerCloud/content_scripts/features/adyen-card.js
/**
 * Adyen Card Feature Module
 *
 * This module provides functionality for viewing card information at Adyen
 * for card pages at https://[customer-environment].spend.cloud/cards/[card-id]/*
 * and other related card pages.
 */

/**
 * Initialize the card feature
 * Adds functionality specific to card pages
 * @param {object} match - The URL match result containing capture groups
 */
function initCardFeature(match) {
  if (!match || match.length < 3) return;

  const customer = match[1]; // Extract customer subdomain
  const cardId = match[2];   // Extract the actual card ID from URL

  // Check if buttons should be shown before fetching card details
  chrome.storage.local.get('showButtons', (result) => {
    const showButtons = result.showButtons === undefined ? true : result.showButtons;

    if (!showButtons) {
      return;
    }

    // First fetch card details to determine vendor before adding button
    chrome.runtime.sendMessage(
      {
        action: "fetchCardDetails",
        customer: customer,
        cardId: cardId
      },
      (response) => {
        if (response && response.success) {
          const isAdyenCard = response.vendor === 'adyen';
          addCardInfoButton(customer, cardId, isAdyenCard, response.vendor);
        } else {
          // If we can't determine vendor, add button with default behavior
          addCardInfoButton(customer, cardId, true);
        }
      }
    );
  });
}

/**
 * Adds a button to view card information at Adyen
 * @param {string} customer - The customer subdomain
 * @param {string} cardId - The card ID
 * @param {boolean} isAdyenCard - Whether the card is an Adyen card
 * @param {string|null} vendor - The vendor of the card, if known
 */
function addCardInfoButton(customer, cardId, isAdyenCard = true, vendor = null) {
  // Check if button already exists
  if (document.getElementById('powercloud-shadow-host')) {
    return;
  }

  // Create shadow DOM host element
  const shadowHost = document.createElement('div');
  shadowHost.id = 'powercloud-shadow-host';

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
  button.id = 'powercloud-card-info-btn';
  button.className = 'powercloud-button';

  // Set button text and state based on vendor
  if (isAdyenCard) {
    button.innerHTML = '🔍 View Card at Adyen';
    button.disabled = false;
  } else {
    button.innerHTML = '⚠️ Non Adyen Card';
    button.disabled = true;

    // Show more info if we know the vendor
    if (vendor) {
      button.title = `This card is issued by ${vendor}, not Adyen`;
    } else {
      button.title = 'This card is not issued by Adyen';
    }
  }

  // Add click event only if it's an Adyen card
  if (isAdyenCard) {
    button.addEventListener('click', () => {
      const originalText = button.innerHTML;
      button.innerHTML = '⏳ Loading...';
      button.disabled = true;

      // Get card details and navigate directly to Adyen
      chrome.runtime.sendMessage(
        {
          action: "fetchCardDetails",
          customer: customer,
          cardId: cardId
        },
        (response) => {
          button.innerHTML = originalText;
          button.disabled = false;

          if (!response || !response.success) {
            showCardInfoResult(`Error: ${response?.error || 'Failed to fetch card details'}`);
            return;
          }

          if (!response.paymentInstrumentId) {
            showCardInfoResult('No Adyen Payment Instrument ID found for this card. This card may not be linked to an Adyen account yet.');
            return;
          }

          // Open Adyen directly in a new tab
          const paymentInstrumentId = response.paymentInstrumentId;
          const adyenUrl = `https://balanceplatform-live.adyen.com/balanceplatform/payment-instruments/${paymentInstrumentId}`;
          window.open(adyenUrl, '_blank');
        }
      );
    });
  }

  // Add button to container and container to shadow DOM
  buttonContainer.appendChild(button);
  shadowRoot.appendChild(buttonContainer);

  // Add shadow host to the page
  document.body.appendChild(shadowHost);
}

/**
 * Removes the card information button and any related UI elements
 */
function removeCardInfoButton() {
  // Remove the shadow host for the button
  const shadowHost = document.getElementById('powercloud-shadow-host');
  if (shadowHost) {
    shadowHost.remove();
  }

  // Also remove any result shadow host that might be showing
  const resultHost = document.getElementById('powercloud-result-host');
  if (resultHost) {
    resultHost.remove();
  }
}

// Functions will be made available globally at the end of the file

/**
 * Shows a result message for card info operations
 * @param {string} message - The message to display
 */
function showCardInfoResult(message) {
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
}

// Make functions available globally for main.js
window.adyenCardInit = initCardFeature; // Use a unique name to avoid recursion
window.removeCardInfoButton = removeCardInfoButton;
window.showCardInfoResult = showCardInfoResult;
