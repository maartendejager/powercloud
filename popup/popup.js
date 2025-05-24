import { isApiRoute } from '../shared/url-patterns-module.js';

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
    console.log('[popup] Requesting auth tokens from background...');
    chrome.runtime.sendMessage({action: "getAuthTokens"}, (response) => {
    console.log('[popup] Received response from background:', response);
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
      });
    });
  });
  };
  
  // Initial fetch of tokens
  fetchAndDisplayTokens();
  
  // Add event listener for the "Delete All Tokens" button
  document.getElementById('delete-all-btn').addEventListener('click', () => {
    chrome.runtime.sendMessage({
      action: "deleteAllTokens"
    }, (response) => {
      if (response && response.success) {
        // Refresh the token list
        fetchAndDisplayTokens();
      } else {
        alert('Failed to delete all tokens: ' + (response?.error || 'Unknown error'));
      }
    });
  });
  
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
    document.getElementById('health-section').style.display = 'none';
    
    // Remove active class from all tabs
    document.getElementById('tokens-tab').classList.remove('active');
    document.getElementById('card-tab').classList.remove('active');
    document.getElementById('health-tab').classList.remove('active');
    
    // Show the selected section and activate the tab
    document.getElementById(tabId + '-section').style.display = 'block';
    document.getElementById(tabId + '-tab').classList.add('active');
    
    // Load health data when health tab is activated
    if (tabId === 'health') {
      loadHealthDashboard();
    }
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
  
  // Health tab event listener
  document.getElementById('health-tab').addEventListener('click', () => switchToTab('health'));
  
  // Health dashboard functionality
  function loadHealthDashboard() {
    updateSystemStatus();
    loadFeatureStatus();
    loadPerformanceMetrics();
    loadDebugLogs();
    loadErrorReports();
  }
  
  function updateSystemStatus() {
    // Get overall system status
    chrome.runtime.sendMessage({action: "getExtensionHealth"}, (response) => {
      const statusDot = document.querySelector('#system-status .status-dot');
      const statusText = document.querySelector('#system-status .status-text');
      
      if (!response || !response.success) {
        statusDot.className = 'status-dot error';
        statusText.textContent = 'Extension Error';
        return;
      }
      
      const health = response.health;
      const featureCount = health.features ? Object.keys(health.features).length : 0;
      const errorCount = health.errors ? health.errors.length : 0;
      
      // Update status based on health data
      if (errorCount > 0) {
        statusDot.className = 'status-dot error';
        statusText.textContent = `${errorCount} Error(s)`;
      } else if (featureCount === 0) {
        statusDot.className = 'status-dot warning';
        statusText.textContent = 'No Features Active';
      } else {
        statusDot.className = 'status-dot healthy';
        statusText.textContent = 'All Systems Operational';
      }
      
      // Update metric cards
      document.getElementById('feature-count').textContent = featureCount;
      
      if (health.memory && health.memory.current) {
        document.getElementById('memory-usage').textContent = health.memory.current.used;
      }
      
      if (health.performance && Object.keys(health.performance).length > 0) {
        const avgPerf = Object.values(health.performance)
          .reduce((sum, metric) => sum + (metric.average || 0), 0) / Object.keys(health.performance).length;
        document.getElementById('avg-performance').textContent = Math.round(avgPerf * 100) / 100;
      }
    });
  }
  
  function loadFeatureStatus() {
    chrome.runtime.sendMessage({action: "getFeatureStatus"}, (response) => {
      const statusList = document.getElementById('feature-status-list');
      
      if (!response || !response.success || !response.features) {
        statusList.innerHTML = '<div class="empty-state">No feature status available</div>';
        return;
      }
      
      const features = response.features;
      if (Object.keys(features).length === 0) {
        statusList.innerHTML = '<div class="empty-state">No features currently active</div>';
        return;
      }
      
      statusList.innerHTML = '';
      Object.entries(features).forEach(([name, status]) => {
        const item = document.createElement('div');
        item.className = 'feature-status-item';
        
        const healthClass = status.isHealthy ? 'healthy' : 
                           status.hasErrors ? 'error' : 'warning';
        
        item.innerHTML = `
          <span class="feature-name">${name}</span>
          <span class="feature-health ${healthClass}">
            ${status.isHealthy ? 'Healthy' : status.hasErrors ? 'Error' : 'Warning'}
          </span>
        `;
        
        statusList.appendChild(item);
      });
    });
  }
  
  function loadPerformanceMetrics() {
    chrome.runtime.sendMessage({action: "getPerformanceMetrics"}, (response) => {
      const metricsDisplay = document.getElementById('performance-metrics');
      
      if (!response || !response.success || !response.metrics) {
        metricsDisplay.innerHTML = '<div class="empty-state">No performance data available</div>';
        return;
      }
      
      const metrics = response.metrics;
      if (Object.keys(metrics).length === 0) {
        metricsDisplay.innerHTML = '<div class="empty-state">No performance metrics collected</div>';
        return;
      }
      
      metricsDisplay.innerHTML = '';
      Object.entries(metrics).forEach(([name, metric]) => {
        const item = document.createElement('div');
        item.className = 'performance-metric';
        
        item.innerHTML = `
          <span class="performance-metric-name">${name}</span>
          <span class="performance-metric-value">${metric.average || 0}ms (${metric.count || 0}x)</span>
        `;
        
        metricsDisplay.appendChild(item);
      });
    });
  }
  
  function loadDebugLogs() {
    chrome.runtime.sendMessage({action: "getDebugLogs"}, (response) => {
      const logsDisplay = document.getElementById('debug-logs');
      
      if (!response || !response.success || !response.logs) {
        logsDisplay.innerHTML = '<div class="empty-state">No debug logs available</div>';
        return;
      }
      
      const logs = response.logs;
      if (logs.length === 0) {
        logsDisplay.innerHTML = '<div class="empty-state">No debug logs collected</div>';
        return;
      }
      
      logsDisplay.innerHTML = '';
      logs.slice(-20).forEach(log => { // Show last 20 logs
        const entry = document.createElement('div');
        entry.className = 'debug-log-entry';
        
        const timestamp = new Date(log.timestamp).toLocaleTimeString();
        
        entry.innerHTML = `
          <span class="log-timestamp">${timestamp}</span>
          <span class="log-level ${log.level}">${log.level.toUpperCase()}</span>
          <span class="log-message">${log.message}</span>
        `;
        
        logsDisplay.appendChild(entry);
      });
    });
  }
  
  function loadErrorReports() {
    chrome.runtime.sendMessage({action: "getErrorReports"}, (response) => {
      const errorDisplay = document.getElementById('error-reports');
      
      if (!response || !response.success || !response.errors) {
        errorDisplay.innerHTML = '<div class="empty-state">No error reports available</div>';
        return;
      }
      
      const errors = response.errors;
      if (errors.length === 0) {
        errorDisplay.innerHTML = '<div class="empty-state">No errors reported</div>';
        return;
      }
      
      errorDisplay.innerHTML = '';
      errors.slice(-10).forEach(error => { // Show last 10 errors
        const item = document.createElement('div');
        item.className = 'error-report-item';
        
        const timestamp = new Date(error.timestamp).toLocaleString();
        
        item.innerHTML = `
          <div class="error-title">${error.enhanced ? error.enhanced.title : 'Unknown Error'}</div>
          <div class="error-description">${error.enhanced ? error.enhanced.description : error.originalMessage}</div>
          <div class="error-timestamp">${timestamp}</div>
        `;
        
        errorDisplay.appendChild(item);
      });
    });
  }
  
  // Health dashboard controls
  document.getElementById('refresh-health-btn').addEventListener('click', () => {
    loadHealthDashboard();
  });
  
  document.getElementById('clear-debug-btn').addEventListener('click', () => {
    chrome.runtime.sendMessage({action: "clearDebugData"}, (response) => {
      if (response && response.success) {
        loadHealthDashboard(); // Refresh the display
      }
    });
  });
  
  document.getElementById('export-health-btn').addEventListener('click', () => {
    chrome.runtime.sendMessage({action: "exportHealthReport"}, (response) => {
      if (response && response.success && response.report) {
        // Create and download the health report
        const blob = new Blob([JSON.stringify(response.report, null, 2)], 
                             { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `powercloud-health-report-${new Date().toISOString().slice(0, 19)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  });

});