/**
 * Health Dashboard Message Handlers
 * 
 * Handles health monitoring and debugging requests from the popup dashboard.
 * Provides extension health status, performance metrics, debug logs, and error reports.
 */

// Global health data store
let healthData = {
  features: {},
  performance: {},
  debugLogs: [],
  errorReports: [],
  memory: null,
  lastUpdate: Date.now()
};

// Maximum number of logs and errors to keep
const MAX_DEBUG_LOGS = 100;
const MAX_ERROR_REPORTS = 50;

/**
 * Initialize health monitoring
 */
export function initializeHealthMonitoring() {
  console.log('[health] Initializing health monitoring system...');
  
  // Set up periodic health checks
  setInterval(() => {
    updateMemoryUsage();
    cleanupOldData();
  }, 30000); // Every 30 seconds
  
  // Initial memory snapshot
  updateMemoryUsage();
}

/**
 * Update memory usage information
 */
function updateMemoryUsage() {
  if (performance.memory) {
    healthData.memory = {
      current: {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100,
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024 * 100) / 100,
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024 * 100) / 100
      },
      timestamp: Date.now()
    };
  }
}

/**
 * Clean up old debug data
 */
function cleanupOldData() {
  // Remove old debug logs
  if (healthData.debugLogs.length > MAX_DEBUG_LOGS) {
    healthData.debugLogs = healthData.debugLogs.slice(-MAX_DEBUG_LOGS);
  }
  
  // Remove old error reports
  if (healthData.errorReports.length > MAX_ERROR_REPORTS) {
    healthData.errorReports = healthData.errorReports.slice(-MAX_ERROR_REPORTS);
  }
  
  // Remove logs older than 24 hours
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  healthData.debugLogs = healthData.debugLogs.filter(log => log.timestamp > oneDayAgo);
  healthData.errorReports = healthData.errorReports.filter(error => error.timestamp > oneDayAgo);
}

/**
 * Record a debug log entry
 * @param {string} level - Log level (debug, info, warn, error)
 * @param {string} message - Log message
 * @param {Object} data - Additional log data
 */
export function recordDebugLog(level, message, data = {}) {
  healthData.debugLogs.push({
    timestamp: Date.now(),
    level,
    message,
    data,
    source: 'background'
  });
  
  // Trigger cleanup if needed
  if (healthData.debugLogs.length > MAX_DEBUG_LOGS) {
    cleanupOldData();
  }
}

/**
 * Record an error report
 * @param {Object} errorReport - Enhanced error report
 */
export function recordErrorReport(errorReport) {
  healthData.errorReports.push({
    ...errorReport,
    timestamp: errorReport.timestamp || Date.now(),
    source: 'background'
  });
  
  // Trigger cleanup if needed
  if (healthData.errorReports.length > MAX_ERROR_REPORTS) {
    cleanupOldData();
  }
}

/**
 * Update feature status
 * @param {string} featureName - Name of the feature
 * @param {Object} status - Feature status information
 */
export function updateFeatureStatus(featureName, status) {
  healthData.features[featureName] = {
    ...status,
    lastUpdate: Date.now()
  };
}

/**
 * Record performance metric
 * @param {string} metricName - Name of the metric
 * @param {number} value - Metric value
 */
export function recordPerformanceMetric(metricName, value) {
  if (!healthData.performance[metricName]) {
    healthData.performance[metricName] = {
      count: 0,
      total: 0,
      min: Infinity,
      max: -Infinity,
      average: 0,
      history: []
    };
  }
  
  const metric = healthData.performance[metricName];
  metric.count++;
  metric.total += value;
  metric.min = Math.min(metric.min, value);
  metric.max = Math.max(metric.max, value);
  metric.average = metric.total / metric.count;
  
  // Keep limited history
  metric.history.push({
    value,
    timestamp: Date.now()
  });
  
  if (metric.history.length > 50) {
    metric.history.shift();
  }
}

/**
 * Handle get extension health request
 * @param {Object} message - Message object
 * @param {Object} sender - Sender information
 * @param {Function} sendResponse - Response callback
 */
export function handleGetExtensionHealth(message, sender, sendResponse) {
  try {
    updateMemoryUsage();
    
    const health = {
      ...healthData,
      systemStatus: {
        healthy: healthData.errorReports.length === 0,
        featureCount: Object.keys(healthData.features).length,
        errorCount: healthData.errorReports.length,
        lastUpdate: healthData.lastUpdate
      }
    };
    
    recordDebugLog('debug', 'Health data requested', { requester: sender.tab?.id || 'popup' });
    
    sendResponse({
      success: true,
      health: health
    });
  } catch (error) {
    console.error('[health] Error getting extension health:', error);
    recordErrorReport({
      originalMessage: error.message,
      context: { action: 'getExtensionHealth' }
    });
    
    sendResponse({
      success: false,
      error: error.message
    });
  }
  
  return true;
}

/**
 * Handle get feature status request
 * @param {Object} message - Message object
 * @param {Object} sender - Sender information
 * @param {Function} sendResponse - Response callback
 */
export function handleGetFeatureStatus(message, sender, sendResponse) {
  try {
    recordDebugLog('debug', 'Feature status requested');
    
    sendResponse({
      success: true,
      features: healthData.features
    });
  } catch (error) {
    console.error('[health] Error getting feature status:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
  
  return true;
}

/**
 * Handle get performance metrics request
 * @param {Object} message - Message object
 * @param {Object} sender - Sender information
 * @param {Function} sendResponse - Response callback
 */
export function handleGetPerformanceMetrics(message, sender, sendResponse) {
  try {
    recordDebugLog('debug', 'Performance metrics requested');
    
    sendResponse({
      success: true,
      metrics: healthData.performance
    });
  } catch (error) {
    console.error('[health] Error getting performance metrics:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
  
  return true;
}

/**
 * Handle get debug logs request
 * @param {Object} message - Message object
 * @param {Object} sender - Sender information
 * @param {Function} sendResponse - Response callback
 */
export function handleGetDebugLogs(message, sender, sendResponse) {
  try {
    const limit = message.limit || 50;
    const logs = healthData.debugLogs.slice(-limit);
    
    sendResponse({
      success: true,
      logs: logs
    });
  } catch (error) {
    console.error('[health] Error getting debug logs:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
  
  return true;
}

/**
 * Handle get error reports request
 * @param {Object} message - Message object
 * @param {Object} sender - Sender information
 * @param {Function} sendResponse - Response callback
 */
export function handleGetErrorReports(message, sender, sendResponse) {
  try {
    const limit = message.limit || 20;
    const errors = healthData.errorReports.slice(-limit);
    
    sendResponse({
      success: true,
      errors: errors
    });
  } catch (error) {
    console.error('[health] Error getting error reports:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
  
  return true;
}

/**
 * Handle clear debug data request
 * @param {Object} message - Message object
 * @param {Object} sender - Sender information
 * @param {Function} sendResponse - Response callback
 */
export function handleClearDebugData(message, sender, sendResponse) {
  try {
    healthData.debugLogs = [];
    healthData.errorReports = [];
    healthData.performance = {};
    
    recordDebugLog('info', 'Debug data cleared', { requester: sender.tab?.id || 'popup' });
    
    sendResponse({
      success: true,
      message: 'Debug data cleared successfully'
    });
  } catch (error) {
    console.error('[health] Error clearing debug data:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
  
  return true;
}

/**
 * Handle export health report request
 * @param {Object} message - Message object
 * @param {Object} sender - Sender information
 * @param {Function} sendResponse - Response callback
 */
export function handleExportHealthReport(message, sender, sendResponse) {
  try {
    updateMemoryUsage();
    
    const report = {
      timestamp: new Date().toISOString(),
      extension: {
        name: 'PowerCloud Extension',
        version: chrome.runtime.getManifest().version
      },
      system: {
        userAgent: navigator.userAgent,
        memory: healthData.memory
      },
      health: {
        features: healthData.features,
        performance: healthData.performance,
        recentLogs: healthData.debugLogs.slice(-20),
        recentErrors: healthData.errorReports.slice(-10)
      }
    };
    
    recordDebugLog('info', 'Health report exported');
    
    sendResponse({
      success: true,
      report: report
    });
  } catch (error) {
    console.error('[health] Error exporting health report:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
  
  return true;
}

/**
 * Handle feature health update from content script
 */
export function handleUpdateFeatureHealth(message, sender, sendResponse) {
  try {
    const { feature, health } = message;
    
    if (!feature || !health) {
      sendResponse({ success: false, error: 'Missing feature or health data' });
      return true;
    }
    
    // Update feature health data
    healthData.features[feature] = {
      ...healthData.features[feature],
      ...health,
      lastUpdate: Date.now(),
      tabId: sender.tab?.id
    };
    
    healthData.lastUpdate = Date.now();
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('[health] Error updating feature health:', error);
    sendResponse({ success: false, error: error.message });
  }
  
  return true;
}

/**
 * Handle performance metric recording from content script
 */
export function handleRecordPerformanceMetric(message, sender, sendResponse) {
  try {
    const { feature, metric, value, metadata } = message;
    
    if (!feature || !metric || value === undefined) {
      sendResponse({ success: false, error: 'Missing required performance data' });
      return true;
    }
    
    // Initialize performance data for feature if needed
    if (!healthData.performance[feature]) {
      healthData.performance[feature] = {};
    }
    
    if (!healthData.performance[feature][metric]) {
      healthData.performance[feature][metric] = [];
    }
    
    // Add performance metric
    healthData.performance[feature][metric].push({
      value,
      timestamp: Date.now(),
      metadata: metadata || {},
      tabId: sender.tab?.id
    });
    
    // Keep only last 50 metrics per feature/metric
    if (healthData.performance[feature][metric].length > 50) {
      healthData.performance[feature][metric] = healthData.performance[feature][metric].slice(-50);
    }
    
    healthData.lastUpdate = Date.now();
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('[health] Error recording performance metric:', error);
    sendResponse({ success: false, error: error.message });
  }
  
  return true;
}
