/**
 * PowerCloud Content Script
 * Runs on spend.cloud pages to capture authentication tokens
 * and provide additional functionality
 */

// Function to check current URL and add or remove custom UI elements as needed
function checkCurrentPage() {
  const url = window.location.href;
  
  // Check if we're on any card page
  const cardSettingsMatch = url.match(/https:\/\/([^.]+)\.spend\.cloud\/cards\/([^\/]+)(\/.*|$)/);
  
  // First, remove any existing button to ensure we don't have stale buttons
  removeCardInfoButton();
  
  // If we're on a card page, add the button with updated card info
  if (cardSettingsMatch) {
    const customer = cardSettingsMatch[1]; // Extract customer subdomain
    const cardId = cardSettingsMatch[2]; // Extract the actual card ID from URL
    console.log(`Found card page. Customer: ${customer}, Card ID: ${cardId}`);
    addCardInfoButton(customer, cardId);
  }
}

// Function to add a button to request card payment instrument ID
function addCardInfoButton(customer, cardId) {
  // Check if button already exists
  if (document.getElementById('powercloud-shadow-host')) {
    return;
  }

  // Create shadow DOM host element
  const shadowHost = document.createElement('div');
  shadowHost.id = 'powercloud-shadow-host'; 
  
  // Position the host element with inline styles that won't leak to other elements
  shadowHost.style.position = 'fixed';
  shadowHost.style.bottom = '20px';
  shadowHost.style.right = '20px';
  shadowHost.style.zIndex = '9999';
  
  // Attach a shadow DOM tree to completely isolate our styles
  const shadowRoot = shadowHost.attachShadow({ mode: 'closed' });
  
  // Add comprehensive styles to shadow DOM
  const style = document.createElement('style');
  style.textContent = `
    /* Base container style */
    .powercloud-container {
      font-family: Arial, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      color: #333;
      background-color: transparent;
    }
    
    /* Button styling */
    .powercloud-button {
      background-color: #4CAF50;
      color: white;
      padding: 10px 15px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      transition: background-color 0.3s;
      font-family: Arial, sans-serif;
      font-size: 14px;
      text-align: center;
    }
    
    .powercloud-button:hover {
      background-color: #3e8e41;
    }
    
    .powercloud-button:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
    
    /* Button container */
    .powercloud-button-container {
      margin: 0;
      padding: 0;
    }
  `;
  shadowRoot.appendChild(style);

  // Create button container with styling
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'powercloud-container powercloud-button-container';
  buttonContainer.id = 'powercloud-button-container';

  // Create the button
  const button = document.createElement('button');
  button.id = 'powercloud-card-info-btn';
  button.className = 'powercloud-button';
  button.innerHTML = '🔍 View Card at Adyen';

  // Add click event - directly open Adyen page
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
          showCardInfoResult(`Error: ${response?.error || 'Failed to fetch card details'}`);
          return;
        }
        
        if (!response.paymentInstrumentId) {
          showCardInfoResult('No Adyen Payment Instrument ID found for this card. This card may not be linked to an Adyen account yet.');
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

  // Add button to container and container to shadow DOM
  buttonContainer.appendChild(button);
  shadowRoot.appendChild(buttonContainer);
  
  // Add shadow host to the page
  document.body.appendChild(shadowHost);
}

// Function to show the result (used for error messages)

// Function to show the result
function showCardInfoResult(message, paymentId = null) {
  // Remove any existing result box
  const existingHost = document.getElementById('powercloud-result-host');
  if (existingHost) {
    existingHost.remove();
  }
  
  // Create a shadow DOM host element
  const shadowHost = document.createElement('div');
  shadowHost.id = 'powercloud-result-host';
  shadowHost.style.position = 'fixed';
  shadowHost.style.bottom = '80px';
  shadowHost.style.right = '20px';
  shadowHost.style.zIndex = '9999';
  
  // Attach a shadow DOM tree
  const shadowRoot = shadowHost.attachShadow({ mode: 'closed' });
  
  // Add comprehensive styles to shadow DOM
  const style = document.createElement('style');
  style.textContent = `
    /* Base container style */
    .powercloud-container {
      font-family: Arial, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      color: #333;
      background-color: white;
      padding: 15px;
      border-radius: 4px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      max-width: 350px;
      word-break: break-all;
      position: relative;
      margin: 0;
      box-sizing: border-box;
    }
    
    /* Button styling */
    .powercloud-button {
      background-color: #4CAF50;
      color: white;
      padding: 5px 10px;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      margin-top: 10px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      text-align: center;
      transition: background-color 0.2s;
    }
    
    .powercloud-button:hover {
      background-color: #3e8e41;
    }
    
    .powercloud-button:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
    
    /* Close button styling */
    .powercloud-button-close {
      position: absolute;
      top: 5px;
      right: 5px;
      border: none;
      background: none;
      font-size: 16px;
      cursor: pointer;
      color: #666;
      padding: 0;
      margin: 0;
      line-height: 1;
      transition: color 0.2s;
    }
    
    .powercloud-button-close:hover {
      color: #333;
    }
  `;
  shadowRoot.appendChild(style);
  
  // Create result box
  const resultBox = document.createElement('div');
  resultBox.className = 'powercloud-container';
  resultBox.id = 'powercloud-result';
  
  // Add close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'powercloud-button-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = () => shadowHost.remove();

  // Add content container
  const contentDiv = document.createElement('div');
  contentDiv.innerHTML = message;
  
  // Add copy button if payment ID is provided and valid
  let copyBtn = null;
  if (paymentId && paymentId !== 'Not found') {
    copyBtn = document.createElement('button');
    copyBtn.className = 'powercloud-button';
    copyBtn.innerHTML = 'Copy Adyen ID';
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(paymentId).then(() => {
        copyBtn.innerHTML = 'Copied!';
        setTimeout(() => {
          copyBtn.innerHTML = 'Copy Adyen ID';
        }, 1500);
      });
    };
  }
  
  // Add message and buttons to result box
  resultBox.appendChild(closeBtn);
  resultBox.appendChild(contentDiv);
  if (copyBtn) {
    resultBox.appendChild(copyBtn);
  }
  
  // Add to shadow root and then to page
  shadowRoot.appendChild(resultBox);
  document.body.appendChild(shadowHost);
  
  // Auto-dismiss after 15 seconds
  setTimeout(() => {
    if (document.body.contains(shadowHost)) {
      shadowHost.remove();
    }
  }, 15000);
}

// Function to check for tokens in localStorage or sessionStorage
function checkForTokensInStorage() {
  const storageLocations = [
    { type: 'localStorage', storage: localStorage },
    { type: 'sessionStorage', storage: sessionStorage }
  ];
  
  let foundTokens = [];
  
  // Common key names for auth tokens
  const possibleTokenKeys = [
    'token', 
    'authToken', 
    'jwt', 
    'accessToken', 
    'auth_token', 
    'id_token',
    'x_authorization_token'
  ];
  
  // Check each storage type
  storageLocations.forEach(({ type, storage }) => {
    // Try to find tokens in common key patterns
    possibleTokenKeys.forEach(key => {
      try {
        // Check for exact key match
        if (storage[key]) {
          foundTokens.push({
            token: storage[key],
            source: `${type}:${key}`
          });
        }
        
        // Check for keys containing the token name
        Object.keys(storage).forEach(storageKey => {
          if (storageKey.toLowerCase().includes(key) && !foundTokens.some(t => t.token === storage[storageKey])) {
            foundTokens.push({
              token: storage[storageKey],
              source: `${type}:${storageKey}`
            });
          }
        });
      } catch (e) {
        // Ignore errors, could be security restrictions
      }
    });
  });
  
  // If we found tokens, send them to the background script
  if (foundTokens.length > 0) {
    chrome.runtime.sendMessage({
      action: 'foundTokensInPage',
      tokens: foundTokens,
      url: window.location.href,
      timestamp: new Date().toISOString()
    });
  }
}

// Function to add a message listener for page-level token inspection
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'checkPageForTokens') {
      checkForTokensInStorage();
      sendResponse({ status: 'Checked for tokens' });
    }
    return true;
  });
}

// Function to remove the card info button if it exists
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

// Initialize the content script
function init() {
  // Run token check on page load
  checkForTokensInStorage();
  
  // Check current page for potential card settings
  checkCurrentPage();
  
  // Set up listener for messages from extension
  setupMessageListener();
  
  // Periodically check for tokens (every 30 seconds)
  setInterval(checkForTokensInStorage, 30000);
  
  // Set up listener for URL changes (Single Page Apps)
  let lastUrl = window.location.href;
  
  // Create a more robust URL change detection
  const urlChangeObserver = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (lastUrl !== currentUrl) {
      console.log(`URL changed from ${lastUrl} to ${currentUrl}`);
      lastUrl = currentUrl;
      
      // Check and update UI based on new URL
      checkCurrentPage();
    }
  });
  
  // Observe the entire document for changes that might indicate navigation
  urlChangeObserver.observe(document, { 
    subtree: true, 
    childList: true,
    attributes: true, 
    characterData: false 
  });
  
  // Also set up a regular check every 1 second as a fallback for SPAs
  setInterval(() => {
    const currentUrl = window.location.href;
    if (lastUrl !== currentUrl) {
      console.log(`URL change detected by interval: ${lastUrl} to ${currentUrl}`);
      lastUrl = currentUrl;
      checkCurrentPage();
    }
  }, 1000);
  
  console.log('PowerCloud extension initialized on page');
}

// Start the content script
init();