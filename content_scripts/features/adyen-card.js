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

  console.log(`Found card page. Customer: ${customer}, Card ID: ${cardId}`);

  // Check if buttons should be shown before fetching card details
  chrome.storage.local.get('showButtons', (result) => {
    const showButtons = result.showButtons === undefined ? true : result.showButtons;

    if (!showButtons) {
      console.log('Buttons are disabled. Skipping button creation.');
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

      console.log(`Fetching card details for customer: ${customer}, cardId: ${cardId}`);

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

          console.log('Card details response:', response);

          if (!response || !response.success) {
            // It's better to have a dedicated function in main.js or a shared UI module
            // to show messages, but for now, we'll log to console.
            console.error(`Error: ${response?.error || 'Failed to fetch card details'}`);
            alert(`Error: ${response?.error || 'Failed to fetch card details'}`);
            return;
          }

          if (!response.paymentInstrumentId) {
            console.warn('No Adyen Payment Instrument ID found for this card.');
            alert('No Adyen Payment Instrument ID found for this card. This card may not be linked to an Adyen account yet.');
            return;
          }

          // Open Adyen directly in a new tab
          const paymentInstrumentId = response.paymentInstrumentId;
          console.log(`Opening Adyen with payment instrument ID: ${paymentInstrumentId}`);
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

  // Also remove any result shadow host that might be showing (if you implement a result display)
  // const resultHost = document.getElementById('powercloud-result-host');
  // if (resultHost) {
  //   resultHost.remove();
  // }
}

// Make functions available globally for main.js
window.initCardFeature = initCardFeature;
window.removeCardInfoButton = removeCardInfoButton;
