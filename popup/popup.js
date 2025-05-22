import { isApiRoute } from '../shared/url-patterns.js';

document.addEventListener('DOMContentLoaded', () => {
  // Load and set toggle state for showing buttons
  chrome.storage.local.get('showButtons', (result) => {
    const showButtons = result.showButtons === undefined ? true : result.showButtons;
    document.getElementById('show-buttons-toggle').checked = showButtons;
  });

  // Add event listener for the toggle
  document.getElementById('show-buttons-toggle').addEventListener('change', (e) => {
    const showButtons = e.target.checked;
    chrome.storage.local.set({ showButtons: showButtons });
    
    // Notify all tabs to update button visibility
    chrome.tabs.query({ url: ["*://*.spend.cloud/*", "*://*.dev.spend.cloud/*"] }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { action: 'updateButtonVisibility', showButtons });
      });
    });
  });
  
  // Function to fetch and display tokens
  const fetchAndDisplayTokens = () => {
    chrome.runtime.sendMessage({action: "getAuthTokens"}, (response) => {
    const tokensList = document.getElementById('tokens-list');
    
    if (!response || !response.authTokens || response.authTokens.length === 0) {
      tokensList.textContent = "No authentication tokens captured yet. Browse spend.cloud or dev.spend.cloud API routes to capture tokens.";
      return;
    }
    
    // Additional filtering in case any non-API tokens are still present
    const apiTokens = response.authTokens.filter(token => 
      token.url && isApiRoute(token.url)
    );
    
    if (apiTokens.length === 0) {
      tokensList.textContent = "No API authentication tokens captured yet. Browse spend.cloud or dev.spend.cloud API routes to capture tokens.";
      return;
    }
    
    // Use filtered tokens
    response.authTokens = apiTokens;
    
    // Clear the loading message
    tokensList.innerHTML = '';
    
    // Add each token to the UI
    response.authTokens.forEach((entry, index) => {
      const tokenDiv = document.createElement('div');
      tokenDiv.className = 'token-entry';
      
      // Format the timestamp
      const date = new Date(entry.timestamp);
      const formattedDate = date.toLocaleString();
      
      // Get token validity status
      let expiryInfo = '';
      let isExpired = false;
      
      if (entry.hasOwnProperty('isValid') && entry.isValid === false) {
        isExpired = true;
      }
      
      if (entry.expiryDate) {
        const expiryDate = new Date(entry.expiryDate);
        const now = new Date();
        isExpired = expiryDate < now;
        expiryInfo = `<br>Expires: ${expiryDate.toLocaleString()} (${isExpired ? '<span style="color:red;font-weight:bold">EXPIRED</span>' : '<span style="color:green">Valid</span>'})`;
      } else {
        // Try to parse the JWT if expiry info isn't stored
        try {
          const payload = JSON.parse(atob(entry.token.split('.')[1]));
          if (payload.exp) {
            const expiryDate = new Date(payload.exp * 1000);
            const now = new Date();
            isExpired = expiryDate < now;
            expiryInfo = `<br>Expires: ${expiryDate.toLocaleString()} (${isExpired ? '<span style="color:red;font-weight:bold">EXPIRED</span>' : '<span style="color:green">Valid</span>'})`;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
      
      // Determine environment class for styling based on whether it's a dev route
      const envClass = entry.isDevRoute ? 'development' : 'production';
      
      tokenDiv.innerHTML = `
        <div class="environment-badge ${envClass}">
          ${entry.clientEnvironment || 'Unknown'}
          ${entry.isDevRoute ? '<span class="dev-route-indicator">DEV</span>' : ''}
        </div>
        <div class="token" style="${isExpired ? 'opacity:0.6;' : ''}">${entry.token}</div>
        <div class="meta">
          ${isExpired ? '<span style="color:red;font-weight:bold">⚠️ EXPIRED</span> - ' : '<span style="color:green;font-weight:bold">✓ VALID</span> - '}
          Captured: ${formattedDate}
          ${expiryInfo}
          <br>URL: ${entry.url}
          ${entry.source ? `<br>Source: ${entry.source}` : ''}
        </div>
        <div class="token-actions">
          <button class="copy-btn" data-token="${entry.token}" ${isExpired ? 'title="Warning: This token is expired"' : ''}>
            Copy Token${isExpired ? ' (Expired)' : ''}
          </button>
          <button class="delete-btn" data-token="${entry.token}" title="Delete this token">
            Delete
          </button>
        </div>
      `;
      
      tokensList.appendChild(tokenDiv);
    });
    
    // Add click handlers for copy buttons
    document.querySelectorAll('.copy-btn').forEach(button => {
      button.addEventListener('click', () => {
        const token = button.getAttribute('data-token');
        navigator.clipboard.writeText(token)
          .then(() => {
            // Change button text temporarily
            const originalText = button.textContent;
            button.textContent = "Copied!";
            setTimeout(() => {
              button.textContent = originalText;
            }, 1500);
          });
      });
    });
    
    // Add click handlers for delete buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
      button.addEventListener('click', () => {
        const token = button.getAttribute('data-token');
        if (confirm('Are you sure you want to delete this token?')) {
          chrome.runtime.sendMessage({
            action: "deleteToken",
            token: token
          }, (response) => {
            if (response && response.success) {
              // Refresh the token list
              fetchAndDisplayTokens();
            } else {
              alert('Failed to delete token: ' + (response?.error || 'Unknown error'));
            }
          });
        }
      });
    });
  });
  };
  
  // Initial fetch of tokens
  fetchAndDisplayTokens();
  
  // Function to extract and pre-fill card details from the active tab URL
  function fillCardDetailsFromActiveTab() {
    console.log('Attempting to fill card details from active tab');
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        const url = tabs[0].url;
        console.log('Current URL:', url);
        
        // Define all the URL patterns that might contain card information
        const patterns = [
          // Standard card URL
          { pattern: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/cards\/([^\/]+)(\/.*|$)/, name: 'standard' },
          // Proactive single card update URL
          { pattern: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/data\.card\/single_card_update\?id=([^&]+)/, name: 'proactive' },
          // Kasboek passen show URL
          { pattern: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/kasboek\.passen\/show\?id=([^&]+)/, name: 'kasboek' }
        ];
        
        // Try each pattern until we find a match
        let match = null;
        let matchType = null;
        
        for (const patternObj of patterns) {
          const result = url.match(patternObj.pattern);
          if (result) {
            match = result;
            matchType = patternObj.name;
            break;
          }
        }
        
        console.log('URL match result:', match, 'Type:', matchType);
        
        // Show or hide the card tab based on whether we're on a card page
        const cardTab = document.getElementById('card-tab');
        if (match) {
          cardTab.style.display = 'block';
          const customerDomain = match[1];
          const cardId = match[2];
          console.log(`Extracted customer domain: ${customerDomain}, card ID: ${cardId} from ${matchType} URL`);
          
          // Make sure the elements exist
          const domainInput = document.getElementById('customer-domain');
          const cardInput = document.getElementById('card-id');
          
          if (domainInput && cardInput) {
            // Fill the form fields
            domainInput.value = customerDomain;
            cardInput.value = cardId;
            console.log('Form fields populated successfully');
            
            // Auto-switch to the card tab if we're on a card page
            switchToTab('card');
          }
        } else {
          cardTab.style.display = 'none';
          // If we're not on a card page and the card tab is active, switch to tokens tab
          if (document.getElementById('card-section').style.display !== 'none') {
            switchToTab('tokens');
          }
        }
      }
    });
  }
  
  // Call this when the popup is opened with a slight delay to ensure DOM is ready
  setTimeout(fillCardDetailsFromActiveTab, 100);
  
  // Tab switching functionality
  function switchToTab(tabId) {
    // Hide all sections
    document.getElementById('tokens-section').style.display = 'none';
    document.getElementById('card-section').style.display = 'none';
    
    // Remove active class from all tabs
    document.getElementById('tokens-tab').classList.remove('active');
    document.getElementById('card-tab').classList.remove('active');
    
    // Show the selected section and activate the tab
    document.getElementById(tabId + '-section').style.display = 'block';
    document.getElementById(tabId + '-tab').classList.add('active');
  }
  
  document.getElementById('tokens-tab').addEventListener('click', () => switchToTab('tokens'));
  document.getElementById('card-tab').addEventListener('click', () => {
    // Only allow clicking the card tab if we're on a card page
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        const url = tabs[0].url;
        
        // Check all supported card URL patterns
        const cardUrlPatterns = [
          /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/cards\/([^\/]+)(\/.*|$)/,
          /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/data\.card\/single_card_update\?id=([^&]+)/,
          /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/kasboek\.passen\/show\?id=([^&]+)/
        ];
        
        // Check if any of the patterns match
        const isCardPage = cardUrlPatterns.some(pattern => pattern.test(url));
        
        if (isCardPage) {
          switchToTab('card');
        }
      }
    });
  });
  
  // Card details functionality
  document.getElementById('fetch-card-btn').addEventListener('click', () => {
    const customerDomain = document.getElementById('customer-domain').value.trim();
    const cardId = document.getElementById('card-id').value.trim();
    
    if (!customerDomain || !cardId) {
      showCardResult('Please enter both customer domain and card ID', false);
      return;
    }
    
    // Show loading state
    const button = document.getElementById('fetch-card-btn');
    const originalText = button.textContent;
    button.textContent = 'Loading...';
    button.disabled = true;
    
    // Request the card details and open Adyen in a single step
    chrome.runtime.sendMessage({
      action: "fetchCardDetails",
      customer: customerDomain,
      cardId: cardId
    }, (response) => {
      // Reset button
      button.textContent = originalText;
      button.disabled = false;
      
      if (!response) {
        showCardResult('No response from background script', false);
        return;
      }
      
      if (!response.success) {
        showCardResult(`Error: ${response.error || 'Failed to fetch card details'}`, false);
        return;
      }
      
      // Check if the card is from Adyen
      const vendor = response.vendor ? response.vendor.toLowerCase() : null;
      if (vendor && vendor !== 'adyen') {
        showCardResult(`This is a non-Adyen card (vendor: ${vendor}). Cannot view in Adyen dashboard.`, false);
        return;
      }
      
      const paymentInstrumentId = response.paymentInstrumentId;
      if (paymentInstrumentId) {
        // Open Adyen directly in a new tab
        const adyenUrl = `https://balanceplatform-live.adyen.com/balanceplatform/payment-instruments/${paymentInstrumentId}`;
        chrome.tabs.create({ url: adyenUrl });
        showCardResult(`Opening card in Adyen dashboard...`, true);
      } else {
        showCardResult('No payment instrument ID found for this card', false);
      }
    });
  });
  
  function showCardResult(message, isSuccess) {
    const resultBox = document.getElementById('card-result');
    const resultContent = document.getElementById('card-result-content');
    
    resultBox.style.display = 'block';
    
    // Allow HTML in error messages for better formatting
    if (message.includes('Error:')) {
      resultContent.innerHTML = `<div style="color: #d32f2f; font-weight: bold;">${message}</div>`;
    } else {
      resultContent.textContent = message;
    }
    
    resultContent.style.backgroundColor = isSuccess ? '#e8f5e9' : '#ffebee';
  }
});