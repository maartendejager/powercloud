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
        updateTokenMetrics(0, 0, 0, 0);
        updateTokensOverview('No tokens found', 'warning');
        tokensList.innerHTML = '<div class="no-tokens-message">No authentication tokens captured yet. Browse spend.cloud or dev.spend.cloud API routes to capture tokens.</div>';
        return;
      }
      
      // Additional filtering in case any non-API tokens are still present
      const apiTokens = response.authTokens.filter(token => 
        token.url && isApiRoute(token.url)
      );
      
      if (apiTokens.length === 0) {
        updateTokenMetrics(0, 0, 0, 0);
        updateTokensOverview('No API tokens found', 'warning');
        tokensList.innerHTML = '<div class="no-tokens-message">No API authentication tokens captured yet. Browse spend.cloud or dev.spend.cloud API routes to capture tokens.</div>';
        return;
      }
      
      // Calculate token metrics
      const totalTokens = apiTokens.length;
      let validTokens = 0;
      let expiredTokens = 0;
      const tenants = new Set(); // Set of unique tenant names (clientEnvironment)
      
      apiTokens.forEach(token => {
        const isExpired = checkTokenExpiry(token);
        if (isExpired) {
          expiredTokens++;
        } else {
          validTokens++;
        }
        tenants.add(token.clientEnvironment || 'Unknown');
      });
      
      // Update metrics cards (tenants count is shown as "Tenants" in the UI)
      updateTokenMetrics(totalTokens, validTokens, expiredTokens, tenants.size);
      
      // Update overview status
      if (expiredTokens > 0) {
        updateTokensOverview(`${expiredTokens} expired token(s)`, 'warning');
      } else if (validTokens > 0) {
        updateTokensOverview('All tokens valid', 'healthy');
      } else {
        updateTokensOverview('No valid tokens', 'error');
      }
      
      // Clear the loading message
      tokensList.innerHTML = '';
      
      // Add each token as a modern card
      apiTokens.forEach((entry, index) => {
        const tokenCard = createTokenCard(entry);
        tokensList.appendChild(tokenCard);
      });
      
      // Add event handlers for all token actions
      addTokenEventHandlers();
    });
  };
  
  // Helper function to check token expiry
  function checkTokenExpiry(token) {
    if (token.hasOwnProperty('isValid') && token.isValid === false) {
      return true;
    }
    
    if (token.expiryDate) {
      const expiryDate = new Date(token.expiryDate);
      return expiryDate < new Date();
    }
    
    // Try to parse JWT
    try {
      const payload = JSON.parse(atob(token.token.split('.')[1]));
      if (payload.exp) {
        const expiryDate = new Date(payload.exp * 1000);
        return expiryDate < new Date();
      }
    } catch (e) {
      // Ignore parsing errors
    }
    
    return false;
  }
  
  // Helper function to get token expiry info
  function getTokenExpiryInfo(token) {
    if (token.expiryDate) {
      const expiryDate = new Date(token.expiryDate);
      return expiryDate;
    }
    
    try {
      const payload = JSON.parse(atob(token.token.split('.')[1]));
      if (payload.exp) {
        return new Date(payload.exp * 1000);
      }
    } catch (e) {
      // Ignore parsing errors
    }
    
    return null;
  }
  
  // Helper function to extract tenant name from token payload
  function getTenantName(token) {
    if (!token || !token.token) {
      return token.clientEnvironment || 'Unknown';
    }
    
    // Try to extract client/tenant name from the JWT payload
    try {
      const parts = token.token.split('.');
      if (parts.length !== 3) {
        return token.clientEnvironment || 'Unknown';
      }
      
      const payload = JSON.parse(atob(parts[1]));
      // Check for client field in the payload
      if (payload.client) {
        return payload.client;
      }
      
      // Fall back to stored clientEnvironment value
      return token.clientEnvironment || 'Unknown';
    } catch (e) {
      // If there's an error parsing, fall back to the stored value
      return token.clientEnvironment || 'Unknown';
    }
  }
  
  // Helper function to update token metrics
  function updateTokenMetrics(total, valid, expired, tenantCount) {
    document.getElementById('tokens-total').textContent = total;
    document.getElementById('tokens-valid').textContent = valid;
    document.getElementById('tokens-expired').textContent = expired;
    document.getElementById('tokens-environments').textContent = tenantCount; // ID remains for backward compatibility, but represents tenant count
  }
  
  // Helper function to update tokens overview
  function updateTokensOverview(statusText, statusType) {
    const statusDot = document.querySelector('#tokens-overview .status-dot');
    const statusTextEl = document.querySelector('#tokens-overview .status-text');
    
    statusDot.className = `status-dot ${statusType}`;
    statusTextEl.textContent = statusText;
  }
  
  // Helper function to create a token card
  function createTokenCard(token) {
    const tokenCard = document.createElement('div');
    tokenCard.className = 'token-card';
    
    const isExpired = checkTokenExpiry(token);
    const expiryDate = getTokenExpiryInfo(token);
    const formattedTimestamp = new Date(token.timestamp).toLocaleString();
    const envClass = token.isDevRoute ? 'development' : 'production';
    
    if (isExpired) {
      tokenCard.classList.add('expired');
    }
    
    let expiryInfo = '';
    if (expiryDate) {
      const formattedExpiry = expiryDate.toLocaleString();
      expiryInfo = `<div class="token-expiry">Expires: ${formattedExpiry}</div>`;
    }
    
    // Extract tenant name from JWT payload if possible
    const tenantName = getTenantName(token);
    
    // Make the tenant name prominent and show environment type (dev/prod) as a badge
    tokenCard.innerHTML = `
      <!-- Prominent tenant name with environment type badge -->
      <div class="token-header">
        <div class="token-header-line">
          <div class="tenant-label">Tenant</div>
          <div class="client-environment">${tenantName}</div>
        </div>
        <div class="environment-type-line">
          <div class="environment-badge ${envClass}">
            ${token.isDevRoute ? 'Development' : 'Production'}
          </div>
        </div>
      </div>
      
      <!-- Token status -->
      <div class="token-status ${isExpired ? 'expired' : 'valid'}">
        <span class="status-icon">${isExpired ? '⚠️' : '✓'}</span>
        <span class="status-text">${isExpired ? 'Expired' : 'Valid'}</span>
      </div>
      
      <!-- Token content with improved text handling -->
      <div class="token-content">
        <div class="token-value">${token.token}</div>
      </div>
      
      <!-- Token metadata -->
      <div class="token-meta">
        <div class="token-captured">Captured: ${formattedTimestamp}</div>
        ${expiryInfo}
        <div class="token-url">URL: ${token.url}</div>
        ${token.source ? `<div class="token-source">Source: ${token.source}</div>` : ''}
        <div class="token-tenant-info">
          <div class="token-tenant">Tenant: <strong>${tenantName}</strong></div>
          <div class="token-env-type">Environment Type: <strong>${token.isDevRoute ? 'Development' : 'Production'}</strong></div>
        </div>
      </div>
      
      <!-- Fixed-height action buttons -->
      <div class="token-actions">
        <button class="action-btn copy-btn" data-token="${token.token}" title="${isExpired ? 'Warning: This token is expired' : 'Copy token to clipboard'}">
          <span class="btn-icon">📋</span>
          Copy${isExpired ? ' (Expired)' : ''}
        </button>
        <button class="action-btn delete-btn" data-token="${token.token}" title="Delete this token">
          <span class="btn-icon">🗑️</span>
          Delete
        </button>
      </div>
    `;
    
    return tokenCard;
  }
  
  // Helper function to add event handlers for token actions
  function addTokenEventHandlers() {
    // Copy button handlers
    document.querySelectorAll('.copy-btn').forEach(button => {
      button.addEventListener('click', () => {
        const token = button.getAttribute('data-token');
        navigator.clipboard.writeText(token)
          .then(() => {
            const originalHTML = button.innerHTML;
            button.innerHTML = '<span class="btn-icon">✓</span>Copied!';
            button.classList.add('success');
            setTimeout(() => {
              button.innerHTML = originalHTML;
              button.classList.remove('success');
            }, 1500);
          })
          .catch(err => {
            console.error('Failed to copy token:', err);
            button.innerHTML = '<span class="btn-icon">❌</span>Failed';
            setTimeout(() => {
              button.innerHTML = originalHTML;
            }, 1500);
          });
      });
    });
    
    // Delete button handlers
    document.querySelectorAll('.delete-btn').forEach(button => {
      button.addEventListener('click', () => {
        const token = button.getAttribute('data-token');
        if (confirm('Are you sure you want to delete this token?')) {
          chrome.runtime.sendMessage({
            action: "deleteToken",
            token: token
          }, (response) => {
            if (response && response.success) {
              fetchAndDisplayTokens();
            } else {
              alert('Failed to delete token: ' + (response?.error || 'Unknown error'));
            }
          });
        }
      });
    });
  }
  
  // Initial fetch of tokens
  fetchAndDisplayTokens();
  
  // Load page actions since it's the default active tab
  loadPageActions();
  
  // Add event listener for the "Refresh Tokens" button
  document.getElementById('refresh-tokens-btn').addEventListener('click', () => {
    fetchAndDisplayTokens();
  });
  
  // Add event listener for the "Export Tokens" button
  document.getElementById('export-tokens-btn').addEventListener('click', () => {
    chrome.runtime.sendMessage({action: "getAuthTokens"}, (response) => {
      if (!response || !response.authTokens || response.authTokens.length === 0) {
        alert('No tokens to export');
        return;
      }
      
      // Filter API tokens
      const apiTokens = response.authTokens.filter(token => 
        token.url && isApiRoute(token.url)
      );
      
      if (apiTokens.length === 0) {
        alert('No API tokens to export');
        return;
      }
      
      // Create export data
      const exportData = {
        exportDate: new Date().toISOString(),
        totalTokens: apiTokens.length,
        tokens: apiTokens.map(token => ({
          token: token.token,
          url: token.url,
          tenantName: token.clientEnvironment || 'Unknown', // Renamed from environment to tenantName for clarity
          environmentType: token.isDevRoute ? 'development' : 'production', // Added explicit environment type
          isDevRoute: token.isDevRoute, // Kept for backward compatibility
          timestamp: token.timestamp,
          expiryDate: token.expiryDate,
          source: token.source,
          isExpired: checkTokenExpiry(token)
        }))
      };
      
      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `powercloud-tokens-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  });

  // Tab switching functionality
  function switchToTab(tabId) {
    // Hide all sections
    document.getElementById('tokens-section').style.display = 'none';
    document.getElementById('actions-section').style.display = 'none';
    document.getElementById('health-section').style.display = 'none';
    
    // Remove active class from all tabs
    document.getElementById('tokens-tab').classList.remove('active');
    document.getElementById('actions-tab').classList.remove('active');
    document.getElementById('health-tab').classList.remove('active');
    
    // Show the selected section and activate the tab
    document.getElementById(tabId + '-section').style.display = 'block';
    document.getElementById(tabId + '-tab').classList.add('active');
    
    // Load health data when health tab is activated
    if (tabId === 'health') {
      loadHealthDashboard();
    }
    
    // Load page actions when actions tab is activated
    if (tabId === 'actions') {
      loadPageActions();
    }
  }
  
  // Tab event listeners are moved inside the DOMContentLoaded event handler
  
  // Health dashboard functionality
  function loadHealthDashboard() {
    updateSystemStatus();
    loadAuthenticationStatus();
    loadFeatureHealthCards(); // Enhanced feature cards instead of loadFeatureStatus
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
      const errorCount = health.errorReports ? health.errorReports.length : 0;
      
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

  function loadAuthenticationStatus() {
    chrome.runtime.sendMessage({action: "getAuthStatus"}, (response) => {
      const authStatusDot = document.querySelector('#auth-status .status-dot');
      const authStatusText = document.querySelector('#auth-status .status-text');
      const validTokenCount = document.getElementById('valid-token-count');
      const expiredTokenCount = document.getElementById('expired-token-count');
      const environmentCount = document.getElementById('environment-count');
      const environmentsList = document.getElementById('auth-environments');

      if (!response || !response.success) {
        authStatusDot.className = 'status-dot error';
        authStatusText.textContent = 'Authentication Check Failed';
        validTokenCount.textContent = '?';
        expiredTokenCount.textContent = '?';
        environmentCount.textContent = '?';
        environmentsList.innerHTML = '<div class="auth-error">Failed to check authentication status</div>';
        return;
      }

      const authStatus = response.authStatus;
      const tokenSummary = response.tokenSummary;

      // Update status indicator based on authentication health
      if (tokenSummary.expired > 0 && tokenSummary.valid === 0) {
        authStatusDot.className = 'status-dot error';
        authStatusText.textContent = 'All Tokens Expired';
      } else if (tokenSummary.expired > 0) {
        authStatusDot.className = 'status-dot warning';
        authStatusText.textContent = `${tokenSummary.expired} Token(s) Expired`;
      } else if (tokenSummary.valid > 0) {
        authStatusDot.className = 'status-dot healthy';
        authStatusText.textContent = 'Authentication Healthy';
      } else {
        authStatusDot.className = 'status-dot unknown';
        authStatusText.textContent = 'No Tokens Available';
      }

      // Update metric counters
      validTokenCount.textContent = tokenSummary.valid || 0;
      expiredTokenCount.textContent = tokenSummary.expired || 0;
      environmentCount.textContent = tokenSummary.environments || 0; // Represents tenant count

      // Display tenant-specific status
      environmentsList.innerHTML = '';
      if (authStatus.environments && Object.keys(authStatus.environments).length > 0) {
        Object.entries(authStatus.environments).forEach(([envKey, envData]) => {
          const envItem = document.createElement('div');
          envItem.className = 'auth-environment-item';
          
          const statusClass = envData.hasValidToken ? 'valid' : 'expired';
          const statusText = envData.hasValidToken ? 'Valid' : 'Expired';
          // Format as "tenant-name (development)" or just "tenant-name" for production
          const envDisplayName = `${envData.environment}${envData.isDev ? ' (development)' : ''}`;
          
          envItem.innerHTML = `
            <span class="auth-environment-name">${envDisplayName}</span>
            <span class="auth-environment-status ${statusClass}">${statusText}</span>
          `;
          
          environmentsList.appendChild(envItem);
        });
      } else {
        environmentsList.innerHTML = '<div class="auth-empty-state">No tenants detected</div>';
      }

      // Show authentication error information if there are recent auth failures
      if (authStatus.authErrors && authStatus.authErrors.length > 0) {
        const recentErrors = authStatus.authErrors.slice(0, 3); // Show last 3 errors
        const errorInfo = document.createElement('div');
        errorInfo.className = 'auth-errors-info';
        errorInfo.innerHTML = `
          <div class="auth-errors-title">Recent Auth Failures:</div>
          ${recentErrors.map(error => `
            <div class="auth-error-item">
              <span class="auth-error-time">${new Date(error.timestamp).toLocaleTimeString()}</span>
              <span class="auth-error-endpoint">${error.endpoint || 'Unknown endpoint'}</span>
            </div>
          `).join('')}
        `;
        environmentsList.appendChild(errorInfo);
      }

      // Show cascading error prevention info
      if (authStatus.cascadingErrorsPrevented > 0) {
        const preventionInfo = document.createElement('div');
        preventionInfo.className = 'auth-prevention-info';
        preventionInfo.innerHTML = `
          <div class="auth-prevention-text">
            🛡️ Prevented ${authStatus.cascadingErrorsPrevented} cascading error(s)
          </div>
        `;
        environmentsList.appendChild(preventionInfo);
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

  // Enhanced Health Dashboard Variables
  let realtimeStreamActive = false;
  let streamPaused = false;
  let streamInterval = null;
  let logFilters = {
    level: '',
    feature: '',
    category: ''
  };

  // Real-time log streaming controls
  document.getElementById('toggle-realtime-btn').addEventListener('click', () => {
    toggleRealtimeStreaming();
  });

  document.getElementById('pause-stream').addEventListener('click', () => {
    toggleStreamPause();
  });

  document.getElementById('clear-log-stream').addEventListener('click', () => {
    clearLogStream();
  });

  // Filter controls
  document.getElementById('log-level-filter').addEventListener('change', (e) => {
    logFilters.level = e.target.value;
    if (realtimeStreamActive) {
      updateLogStream();
    }
  });

  document.getElementById('feature-filter').addEventListener('change', (e) => {
    logFilters.feature = e.target.value;
    if (realtimeStreamActive) {
      updateLogStream();
    }
  });

  document.getElementById('category-filter').addEventListener('change', (e) => {
    logFilters.category = e.target.value;
    if (realtimeStreamActive) {
      updateLogStream();
    }
  });

  // Enhanced Health Dashboard Functions
  function toggleRealtimeStreaming() {
    const button = document.getElementById('toggle-realtime-btn');
    const statusDiv = document.querySelector('.stream-status');
    
    if (!realtimeStreamActive) {
      // Start streaming
      realtimeStreamActive = true;
      streamPaused = false;
      button.textContent = 'Disable Real-time';
      button.classList.add('active');
      statusDiv.textContent = 'Real-time streaming active';
      statusDiv.classList.add('active');
      
      // Update feature filter options
      updateFeatureFilterOptions();
      
      // Start streaming interval
      streamInterval = setInterval(updateLogStream, 2000); // Update every 2 seconds
      updateLogStream(); // Initial load
    } else {
      // Stop streaming
      realtimeStreamActive = false;
      button.textContent = 'Enable Real-time';
      button.classList.remove('active');
      statusDiv.textContent = 'Real-time streaming disabled';
      statusDiv.classList.remove('active', 'paused');
      
      if (streamInterval) {
        clearInterval(streamInterval);
        streamInterval = null;
      }
    }
  }

  function toggleStreamPause() {
    const button = document.getElementById('pause-stream');
    const statusDiv = document.querySelector('.stream-status');
    
    if (!realtimeStreamActive) return;
    
    streamPaused = !streamPaused;
    
    if (streamPaused) {
      button.textContent = 'Resume';
      statusDiv.textContent = 'Real-time streaming paused';
      statusDiv.classList.add('paused');
      statusDiv.classList.remove('active');
    } else {
      button.textContent = 'Pause';
      statusDiv.textContent = 'Real-time streaming active';
      statusDiv.classList.add('active');
      statusDiv.classList.remove('paused');
    }
  }

  function clearLogStream() {
    const container = document.getElementById('realtime-logs');
    const entries = container.querySelectorAll('.realtime-log-entry');
    entries.forEach(entry => entry.remove());
  }

  function updateLogStream() {
    if (!realtimeStreamActive || streamPaused) return;

    // Get filtered logs from health dashboard
    chrome.runtime.sendMessage({
      action: "getFilteredLogs",
      limit: 50,
      level: logFilters.level || null,
      feature: logFilters.feature || null,
      category: logFilters.category || null
    }, (response) => {
      if (response && response.success && response.logs) {
        displayRealtimeLogs(response.logs);
      }
    });
  }

  function displayRealtimeLogs(logs) {
    const container = document.getElementById('realtime-logs');
    const statusDiv = container.querySelector('.stream-status');
    
    if (statusDiv) {
      statusDiv.remove();
    }

    // Clear old entries if too many
    const existingEntries = container.querySelectorAll('.realtime-log-entry');
    if (existingEntries.length > 100) {
      for (let i = 0; i < 20; i++) {
        existingEntries[i].remove();
      }
    }

    // Add new log entries (only show last 20 for performance)
    const recentLogs = logs.slice(-20);
    const existingIds = new Set(Array.from(existingEntries).map(e => e.dataset.logId));

    recentLogs.forEach(log => {
      if (!existingIds.has(log.id)) {
        const entry = createRealtimeLogEntry(log);
        container.appendChild(entry);
        
        // Add animation for new entries
        entry.classList.add('new-entry');
        setTimeout(() => entry.classList.remove('new-entry'), 1000);
      }
    });

    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  function createRealtimeLogEntry(log) {
    const entry = document.createElement('div');
    entry.className = `realtime-log-entry ${log.level}`;
    entry.dataset.logId = log.id;

    const timestamp = new Date(log.timestamp).toLocaleTimeString();
    
    entry.innerHTML = `
      <span class="log-timestamp-realtime">${timestamp}</span>
      <span class="log-level-realtime">${log.level}</span>
      <span class="log-feature-realtime">${log.feature || 'sys'}</span>
      <span class="log-message-realtime">${log.message}</span>
    `;

    return entry;
  }

  function updateFeatureFilterOptions() {
    chrome.runtime.sendMessage({action: "getFeatureChannels"}, (response) => {
      if (response && response.success && response.channels) {
        const select = document.getElementById('feature-filter');
        
        // Clear existing options except "All Features"
        const options = select.querySelectorAll('option');
        for (let i = 1; i < options.length; i++) {
          options[i].remove();
        }

        // Add feature options
        Object.keys(response.channels).forEach(feature => {
          const option = document.createElement('option');
          option.value = feature;
          option.textContent = feature;
          select.appendChild(option);
        });
      }
    });
  }

  // Enhanced feature health cards
  function loadFeatureHealthCards() {
    chrome.runtime.sendMessage({action: "getFeatureStatus"}, (response) => {
      if (!response || !response.success || !response.features) {
        document.getElementById('feature-health-cards').innerHTML = 
          '<div class="empty-state">No feature health data available</div>';
        return;
      }

      const container = document.getElementById('feature-health-cards');
      container.innerHTML = '';

      Object.entries(response.features).forEach(([name, status]) => {
        const card = createFeatureHealthCard(name, status);
        container.appendChild(card);
      });
    });
  }

  function createFeatureHealthCard(name, status) {
    const card = document.createElement('div');
    
    // Determine card health status
    let healthClass = 'unknown';
    let healthText = 'Unknown';
    
    if (status.hasErrors) {
      healthClass = 'error';
      healthText = 'Error';
    } else if (!status.isActive) {
      healthClass = 'warning';
      healthText = 'Inactive';
    } else if (status.isHealthy !== false) {
      healthClass = 'healthy';
      healthText = 'Healthy';
    }

    card.className = `feature-health-card ${healthClass}`;
    
    // Get metrics for this feature
    const errorCount = status.lastError ? 1 : 0;
    const lastUpdate = status.lastUpdate ? new Date(status.lastUpdate).toLocaleTimeString() : 'Never';
    const performance = status.averagePerformance || 0;

    card.innerHTML = `
      <div class="feature-card-header">
        <span class="feature-card-name">${name}</span>
        <div class="feature-card-status">
          <span class="status-dot ${healthClass}"></span>
          <span>${healthText}</span>
        </div>
      </div>
      <div class="feature-card-metrics">
      </div>
      <div class="feature-card-metrics">
        <div class="feature-metric">
          <div class="feature-metric-value">${errorCount}</div>
          <div class="feature-metric-label">Errors</div>
        </div>
        <div class="feature-metric">
          <div class="feature-metric-value">${Math.round(performance)}ms</div>
          <div class="feature-metric-label">Avg Performance</div>
        </div>
        <div class="feature-metric">
          <div class="feature-metric-value">${lastUpdate}</div>
          <div class="feature-metric-label">Last Update</div>
        </div>
      </div>
    `;

    return card;
  }

  // Enhanced system status with error count
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
      const errorCount = health.errorReports ? health.errorReports.length : 0;
      
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
      document.getElementById('error-count').textContent = errorCount;
      
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

  // Page Actions tab functionality
  function updatePageActions() {
    const actionsList = document.getElementById('page-actions-list');
    actionsList.innerHTML = ''; // Clear existing actions
    
    // Get the active tab's URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url;
      if (!url) {
        actionsList.innerHTML = '<div class="empty-state">No active tab detected</div>';
        return;
      }
      
      // Define your page-specific actions here
      const pageActions = [
        {
          // Card actions
          urlPattern: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/cards\/([^\/]+)(\/.*|$)/,
          action: () => {
            const customer = RegExp.$1;
            const cardId = RegExp.$2;
            return `
              <div class="action-item">
                <span class="action-label">Card ID:</span>
                <span class="action-value">${cardId}</span>
              </div>
              <div class="action-item">
                <span class="action-label">Customer:</span>
                <span class="action-value">${customer}</span>
              </div>
              <button class="action-button" id="popup-card-btn">
                View in Adyen
              </button>
            `;
          }
        },
        {
          // Book actions
          urlPattern: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/kasboek\.boekingen\/(\d+)(\/.*|$)/,
          action: () => {
            const customer = RegExp.$1;
            const bookId = RegExp.$2;
            return `
              <div class="action-item">
                <span class="action-label">Book ID:</span>
                <span class="action-value">${bookId}</span>
              </div>
              <div class="action-item">
                <span class="action-label">Customer:</span>
                <span class="action-value">${customer}</span>
              </div>
              <button class="action-button" id="popup-book-btn">
                View in Adyen
              </button>
            `;
          }
        },
        {
          // Entry actions
          urlPattern: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/kasboek\.boekingen\/show\?id=([^&]+)/,
          action: () => {
            const customer = RegExp.$1;
            const entryId = RegExp.$2;
            return `
              <div class="action-item">
                <span class="action-label">Entry ID:</span>
                <span class="action-value">${entryId}</span>
              </div>
              <div class="action-item">
                <span class="action-label">Customer:</span>
                <span class="action-value">${customer}</span>
              </div>
              <button class="action-button" id="popup-entries-btn">
                View in Adyen
              </button>
            `;
          }
        }
      ];
      
      // Check each action and add to the list if it matches the URL
      pageActions.forEach(pageAction => {
        const { urlPattern, action } = pageAction;
        if (urlPattern.test(url)) {
          const actionHtml = action();
          actionsList.innerHTML = actionHtml;
        }
      });
    });
  }
  
  // Load page actions when the tab is updated
  function loadPageActions() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        const url = tabs[0].url;
        const pageInfo = detectPageType(url);
        updatePageActionsUI(pageInfo);
      } else {
        showNoPageActions();
      }
    });
  }

  function detectPageType(url) {
    // URL patterns matching those in main.js
    const patterns = {
      card: [
        { pattern: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/cards\/([^\/]+)(\/.*|$)/, type: 'standard' },
        { pattern: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/data\.card\/single_card_update\?id=([^&]+)/, type: 'proactive' },
        { pattern: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/kasboek\.passen\/show\?id=([^&]+)/, type: 'kasboek' }
      ],
      book: [
        { pattern: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/kasboek\.boekingen\/(\d+)(\/.*|$)/, type: 'kasboek' },
        { pattern: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/book\/([^\/]+)(\/.*|$)/, type: 'adyen' }
      ],
      entries: [
        { pattern: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/kasboek\.boekingen\/show\?id=([^&]+)/, type: 'kasboek' },
        { pattern: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/entries\/([^\/]+)(\/.*|$)/, type: 'adyen' }
      ]
    };

    // Check each pattern type
    for (const [pageType, pagePatterns] of Object.entries(patterns)) {
      for (const patternObj of pagePatterns) {
        const match = url.match(patternObj.pattern);
        if (match) {
          return {
            type: pageType,
            subtype: patternObj.type,
            customer: match[1],
            id: match[2],
            url: url
          };
        }
      }
    }

    return null; // No matching page type
  }

  // Function to check if card has associated book and show/hide card book button
  function checkCardBookAvailability(customer, cardId) {
    const cardBookBtn = document.getElementById('popup-card-book-btn');
    
    // Hide button by default
    cardBookBtn.style.display = 'none';
    
    // Fetch card details to check for book
    chrome.runtime.sendMessage({
      action: "fetchCardDetails",
      customer: customer,
      cardId: cardId
    }, (response) => {
      if (response && response.success) {
        const bookId = extractBookIdFromCardData(response);
        if (bookId) {
          // Show the card book button if book is available
          cardBookBtn.style.display = 'inline-block';
          console.log('[popup] Card book button shown - book ID found:', bookId);
        } else {
          console.log('[popup] Card book button hidden - no book ID found');
        }
      } else {
        console.log('[popup] Card book button hidden - failed to fetch card details');
      }
    });
  }

  function updatePageActionsUI(pageInfo) {
    const pageTypeElement = document.getElementById('page-type');
    const cardActions = document.getElementById('card-actions');
    const bookActions = document.getElementById('book-actions');
    const entriesActions = document.getElementById('entries-actions');
    const noActions = document.getElementById('no-actions');

    // Hide all action groups initially
    cardActions.style.display = 'none';
    bookActions.style.display = 'none';
    entriesActions.style.display = 'none';
    noActions.style.display = 'none';

    if (!pageInfo) {
      showNoPageActions();
      return;
    }

    // Update page context display
    pageTypeElement.textContent = `${pageInfo.type.charAt(0).toUpperCase() + pageInfo.type.slice(1)} page detected (${pageInfo.subtype})`;

    // Show appropriate action group and populate data
    switch (pageInfo.type) {
      case 'card':
        cardActions.style.display = 'block';
        document.getElementById('card-customer').textContent = pageInfo.customer;
        document.getElementById('card-id-display').textContent = pageInfo.id;
        
        // Check if card has associated book to show/hide card book button
        checkCardBookAvailability(pageInfo.customer, pageInfo.id);
        break;
      case 'book':
        bookActions.style.display = 'block';
        document.getElementById('book-customer').textContent = pageInfo.customer;
        document.getElementById('book-id-display').textContent = pageInfo.id;
        break;
      case 'entries':
        entriesActions.style.display = 'block';
        document.getElementById('entries-customer').textContent = pageInfo.customer;
        document.getElementById('entry-id-display').textContent = pageInfo.id;
        break;
    }
  }

  function showNoPageActions() {
    const pageTypeElement = document.getElementById('page-type');
    const noActions = document.getElementById('no-actions');

    pageTypeElement.textContent = 'No supported page detected';
    
    // Hide all action groups
    document.getElementById('card-actions').style.display = 'none';
    document.getElementById('book-actions').style.display = 'none';
    document.getElementById('entries-actions').style.display = 'none';
    
    // Show no actions message
    noActions.style.display = 'block';
  }

  // Action button event listeners
  document.getElementById('popup-card-btn').addEventListener('click', () => {
    const customer = document.getElementById('card-customer').textContent;
    const cardId = document.getElementById('card-id-display').textContent;
    
    if (customer === '-' || cardId === '-') return;

    // Show loading state
    const button = document.getElementById('popup-card-btn');
    const resultDiv = document.getElementById('card-action-result');
    const originalText = button.textContent;
    
    button.textContent = 'Loading...';
    button.disabled = true;
    resultDiv.style.display = 'none';

    // Send message to fetch card details and open Adyen
    chrome.runtime.sendMessage({
      action: "fetchCardDetails",
      customer: customer,
      cardId: cardId
    }, (response) => {
      // Reset button
      button.textContent = originalText;
      button.disabled = false;
      
      showActionResult(resultDiv, response, 'card');
    });
  });

  document.getElementById('popup-card-book-btn').addEventListener('click', () => {
    const customer = document.getElementById('card-customer').textContent;
    const cardId = document.getElementById('card-id-display').textContent;
    
    if (customer === '-' || cardId === '-') return;

    // Show loading state
    const button = document.getElementById('popup-card-book-btn');
    const resultDiv = document.getElementById('card-book-action-result');
    const originalText = button.textContent;
    
    button.textContent = 'Loading...';
    button.disabled = true;
    resultDiv.style.display = 'none';

    // Send message to fetch card details and extract book information
    chrome.runtime.sendMessage({
      action: "fetchCardDetails",
      customer: customer,
      cardId: cardId
    }, (response) => {
      // Reset button
      button.textContent = originalText;
      button.disabled = false;
      
      showActionResult(resultDiv, response, 'cardbook');
    });
  });

  document.getElementById('popup-book-btn').addEventListener('click', () => {
    const customer = document.getElementById('book-customer').textContent;
    const bookId = document.getElementById('book-id-display').textContent;
    
    if (customer === '-' || bookId === '-') return;

    // Show loading state
    const button = document.getElementById('popup-book-btn');
    const resultDiv = document.getElementById('book-action-result');
    const originalText = button.textContent;
    
    button.textContent = 'Loading...';
    button.disabled = true;
    resultDiv.style.display = 'none';

    // Send message to fetch book details and open Adyen
    chrome.runtime.sendMessage({
      action: "fetchBookDetails",
      customer: customer,
      bookId: bookId
    }, (response) => {
      // Reset button
      button.textContent = originalText;
      button.disabled = false;
      
      showActionResult(resultDiv, response, 'book');
    });
  });

  document.getElementById('popup-entries-btn').addEventListener('click', () => {
    const customer = document.getElementById('entries-customer').textContent;
    const entryId = document.getElementById('entry-id-display').textContent;
    
    if (customer === '-' || entryId === '-') return;

    // Show loading state
    const button = document.getElementById('popup-entries-btn');
    const resultDiv = document.getElementById('entries-action-result');
    const originalText = button.textContent;
    
    button.textContent = 'Loading...';
    button.disabled = true;
    resultDiv.style.display = 'none';

    // Send message to fetch entry details and open Adyen
    chrome.runtime.sendMessage({
      action: "fetchEntryDetails",
      customer: customer,
      entryId: entryId
    }, (response) => {
      // Reset button
      button.textContent = originalText;
      button.disabled = false;
      
      // Debug logging to see what we're receiving
      console.log('[popup] Entries response received:', response);
      if (response && response.success) {
        console.log('[popup] Response has remoteTransferId:', response.remoteTransferId);
        console.log('[popup] Response data:', response.data);
      }
      
      showActionResult(resultDiv, response, 'entries');
    });
  });

  // Helper function to extract book ID from card data response
  function extractBookIdFromCardData(cardData) {
    try {
      console.log('[popup] Extracting book ID from card data');
      
      // Handle wrapped response structure
      let data = cardData;
      if (cardData?.success === true && cardData?.data) {
        data = cardData.data;
      }
      
      // Define paths to check for book ID (based on view-card-book.js logic)
      const pathsToCheck = [
        { path: 'data.relationships.books.data[0].id', value: data?.data?.relationships?.books?.data?.[0]?.id },
        { path: 'relationships.books.data[0].id', value: data?.relationships?.books?.data?.[0]?.id },
        { path: 'data.attributes.books[0].id', value: data?.data?.attributes?.books?.[0]?.id },
        { path: 'attributes.books[0].id', value: data?.attributes?.books?.[0]?.id },
        { path: 'data.books[0].id', value: data?.data?.books?.[0]?.id },
        { path: 'books[0].id', value: data?.books?.[0]?.id },
        { path: 'data.book_id', value: data?.data?.book_id },
        { path: 'book_id', value: data?.book_id }
      ];
      
      // Try each path in order
      for (const { path, value } of pathsToCheck) {
        if (value) {
          console.log('[popup] Book ID found via path:', path, 'value:', value);
          return value;
        }
      }
      
      // Check for book data in included section
      if (data?.included) {
        const bookDataInIncluded = data.included.find(item => item.type === 'books');
        if (bookDataInIncluded?.id) {
          console.log('[popup] Book ID found in included data:', bookDataInIncluded.id);
          return bookDataInIncluded.id;
        }
      }
      
      console.log('[popup] No book ID found in card data');
      return null;
    } catch (error) {
      console.error('[popup] Error extracting book ID:', error);
      return null;
    }
  }

  function showActionResult(resultDiv, response, actionType) {
    resultDiv.style.display = 'block';
    
    if (!response) {
      resultDiv.textContent = 'No response from background script';
      resultDiv.className = 'action-result error';
      return;
    }

    if (!response.success) {
      resultDiv.textContent = `Error: ${response.error || 'Failed to fetch details'}`;
      resultDiv.className = 'action-result error';
      return;
    }

    // Handle success based on action type
    switch (actionType) {
      case 'card':
        if (response.vendor && response.vendor.toLowerCase() !== 'adyen') {
          resultDiv.textContent = `Non-Adyen card (vendor: ${response.vendor}). Cannot view in Adyen dashboard.`;
          resultDiv.className = 'action-result warning';
        } else if (response.paymentInstrumentId) {
          const adyenUrl = `https://balanceplatform-live.adyen.com/balanceplatform/payment-instruments/${response.paymentInstrumentId}`;
          chrome.tabs.create({ url: adyenUrl });
          resultDiv.textContent = 'Opening card in Adyen dashboard...';
          resultDiv.className = 'action-result success';
        } else {
          resultDiv.textContent = 'No payment instrument ID found for this card';
          resultDiv.className = 'action-result error';
        }
        break;
        
      case 'book':
        if (response.balanceAccountId) {
          const adyenUrl = `https://balanceplatform-live.adyen.com/balanceplatform/balance-accounts/${response.balanceAccountId}`;
          chrome.tabs.create({ url: adyenUrl });
          resultDiv.textContent = 'Opening balance account in Adyen dashboard...';
          resultDiv.className = 'action-result success';
        } else {
          resultDiv.textContent = 'No balance account ID found for this book';
          resultDiv.className = 'action-result error';
        }
        break;
        
      case 'entries':
        if (response.remoteTransferId) {
          const adyenUrl = `https://balanceplatform-live.adyen.com/balanceplatform/transfers/${response.remoteTransferId}`;
          chrome.tabs.create({ url: adyenUrl });
          resultDiv.textContent = 'Opening transfer in Adyen dashboard...';
          resultDiv.className = 'action-result success';
        } else {
          resultDiv.textContent = 'No transfer ID found for this entry';
          resultDiv.className = 'action-result error';
        }
        break;
        
      case 'cardbook':
        // Extract book ID from card data response
        const bookId = extractBookIdFromCardData(response);
        if (bookId) {
          // Generate current period in MM-YYYY format
          const now = new Date();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const year = now.getFullYear();
          const currentPeriod = `${month}-${year}`;
          
          // Get customer from the card customer display
          const customer = document.getElementById('card-customer').textContent;
          
          // Determine if this is dev environment
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const currentUrl = tabs[0]?.url || '';
            const isDev = currentUrl.includes('.dev.spend.cloud');
            
            // Construct book URL
            const baseUrl = `https://${customer}${isDev ? '.dev' : ''}.spend.cloud`;
            const bookUrl = `${baseUrl}/proactive/kasboek.boekingen/${bookId}/${currentPeriod}`;
            
            // Open book URL
            chrome.tabs.create({ url: bookUrl });
          });
          
          resultDiv.textContent = 'Opening card book in new tab...';
          resultDiv.className = 'action-result success';
        } else {
          resultDiv.textContent = 'No book found for this card';
          resultDiv.className = 'action-result error';
        }
        break;
    }
  }

  // Load page actions when popup opens with a slight delay
  setTimeout(() => {
    loadPageActions();
  }, 150);

  // Listen for tab updates to refresh page actions
  if (chrome.tabs && chrome.tabs.onUpdated) {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
      if (changeInfo.url) {
        // Only update if the actions tab is currently active
        const actionsSection = document.getElementById('actions-section');
        if (actionsSection && actionsSection.style.display !== 'none') {
          loadPageActions();
        }
      }
    });
  }
  
  // Add event listener for the "Delete All Tokens" button
  const deleteAllTokensBtn = document.getElementById('delete-all-tokens-btn');
  if (deleteAllTokensBtn) {
    deleteAllTokensBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete ALL tokens? This action cannot be undone.')) {
        chrome.runtime.sendMessage({
          action: "deleteAllTokens"
        }, (response) => {
          if (response && response.success) {
            fetchAndDisplayTokens();
          } else {
            alert('Failed to delete all tokens: ' + (response?.error || 'Unknown error'));
          }
        });
      }
    });
  } else {
    console.error('Delete All Tokens button not found in the DOM');
  }
  
  // Tab event listeners
  const tokensTab = document.getElementById('tokens-tab');
  const actionsTab = document.getElementById('actions-tab');
  const healthTab = document.getElementById('health-tab');
  
  if (tokensTab) {
    tokensTab.addEventListener('click', () => switchToTab('tokens'));
  } else {
    console.error('Tokens tab element not found');
  }
  
  if (actionsTab) {
    actionsTab.addEventListener('click', () => {
      switchToTab('actions');
      // Load page actions when the tab is activated
      loadPageActions();
    });
  } else {
    console.error('Actions tab element not found');
  }
  
  if (healthTab) {
    healthTab.addEventListener('click', () => switchToTab('health'));
  } else {
    console.error('Health tab element not found');
  }

});