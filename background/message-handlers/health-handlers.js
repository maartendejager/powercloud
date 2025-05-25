/**
 * Health Dashboard Message Handlers
 * 
 * Handles health monitoring and debugging requests from the popup dashboard.
 * Provides extension health status, performance metrics, debug logs, and error reports.
 * Enhanced in Phase 2.1 with structured logging, feature-specific channels, and advanced filtering.
 */

// Global health data store - Enhanced with feature channels and categories
let healthData = {
  features: {},
  performance: {},
  debugLogs: [],
  errorReports: [],
  memory: null,
  lastUpdate: Date.now(),
  // Phase 2.1 enhancements
  logChannels: {}, // Feature-specific log channels
  logCategories: {
    'auth': { count: 0, logs: [] },
    'api': { count: 0, logs: [] },
    'feature': { count: 0, logs: [] },
    'performance': { count: 0, logs: [] },
    'system': { count: 0, logs: [] },
    'ui': { count: 0, logs: [] },
    'error': { count: 0, logs: [] }
  },
  performanceThresholds: {
    initTime: 1000,     // 1 second
    apiResponse: 5000,  // 5 seconds
    renderTime: 100,    // 100ms
    memoryUsage: 50     // 50MB
  }
};

// Enhanced configuration
const MAX_DEBUG_LOGS = 100;
const MAX_ERROR_REPORTS = 50;
const MAX_LOGS_PER_CHANNEL = 50;
const MAX_LOGS_PER_CATEGORY = 30;

// Log level constants
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

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
 * Record a debug log entry (legacy method - use recordStructuredLog for new implementations)
 * @param {string} level - Log level (debug, info, warn, error)
 * @param {string} message - Log message
 * @param {Object} data - Additional log data
 */
export function recordDebugLog(level, message, data = {}) {
  // Use new structured logging method with backward compatibility
  recordStructuredLog(level, message, data, null, 'system');
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
 * Record performance metric (legacy method - use recordEnhancedPerformanceMetric for new implementations)
 * @param {string} metricName - Name of the metric
 * @param {number} value - Metric value
 */
export function recordPerformanceMetric(metricName, value) {
  // Use enhanced performance metric recording for backward compatibility
  recordEnhancedPerformanceMetric('legacy', metricName, value);
}

/**
 * Enhanced structured logging with feature channels and categories
 * @param {string} level - Log level (debug, info, warn, error)
 * @param {string} message - Log message
 * @param {Object} data - Additional log data
 * @param {string} feature - Feature name for channel logging
 * @param {string} category - Log category (auth, api, feature, performance, system, ui, error)
 */
export function recordStructuredLog(level, message, data = {}, feature = null, category = 'system') {
  const timestamp = Date.now();
  const logEntry = {
    timestamp,
    level,
    message,
    data,
    feature,
    category,
    source: 'background',
    id: `log_${timestamp}_${Math.random().toString(36).substr(2, 9)}`
  };

  // Add to main debug logs
  healthData.debugLogs.push(logEntry);

  // Add to feature-specific channel if specified
  if (feature) {
    if (!healthData.logChannels[feature]) {
      healthData.logChannels[feature] = {
        logs: [],
        count: 0,
        levels: { debug: 0, info: 0, warn: 0, error: 0 }
      };
    }
    
    healthData.logChannels[feature].logs.push(logEntry);
    healthData.logChannels[feature].count++;
    healthData.logChannels[feature].levels[level]++;
    
    // Limit logs per channel
    if (healthData.logChannels[feature].logs.length > MAX_LOGS_PER_CHANNEL) {
      healthData.logChannels[feature].logs.shift();
    }
  }

  // Add to category
  if (healthData.logCategories[category]) {
    healthData.logCategories[category].logs.push(logEntry);
    healthData.logCategories[category].count++;
    
    // Limit logs per category
    if (healthData.logCategories[category].logs.length > MAX_LOGS_PER_CATEGORY) {
      healthData.logCategories[category].logs.shift();
    }
  }

  // Trigger cleanup if needed
  if (healthData.debugLogs.length > MAX_DEBUG_LOGS) {
    cleanupOldData();
  }
}

/**
 * Record feature-specific logging event
 * @param {string} featureName - Name of the feature
 * @param {string} event - Event type (init, activate, deactivate, error, performance)
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} data - Additional event data
 */
export function recordFeatureEvent(featureName, event, level, message, data = {}) {
  const category = event === 'error' ? 'error' : 'feature';
  
  recordStructuredLog(level, `[${featureName}] ${message}`, {
    ...data,
    event,
    featureName
  }, featureName, category);
  
  // Update feature status based on event
  if (event === 'error') {
    updateFeatureStatus(featureName, {
      hasErrors: true,
      lastError: { message, timestamp: Date.now(), data }
    });
  } else if (event === 'activate') {
    updateFeatureStatus(featureName, {
      isActive: true,
      lastActivation: Date.now()
    });
  } else if (event === 'deactivate') {
    updateFeatureStatus(featureName, {
      isActive: false,
      lastDeactivation: Date.now()
    });
  }
}

/**
 * Record performance metric with threshold checking
 * @param {string} featureName - Feature name
 * @param {string} metricType - Type of metric (initTime, apiResponse, renderTime, memoryUsage)
 * @param {number} value - Metric value
 * @param {Object} metadata - Additional metadata
 */
export function recordEnhancedPerformanceMetric(featureName, metricType, value, metadata = {}) {
  const timestamp = Date.now();
  
  // Initialize feature performance data
  if (!healthData.performance[featureName]) {
    healthData.performance[featureName] = {};
  }
  
  if (!healthData.performance[featureName][metricType]) {
    healthData.performance[featureName][metricType] = {
      values: [],
      stats: { min: Infinity, max: -Infinity, avg: 0, count: 0, total: 0 },
      thresholdViolations: 0
    };
  }
  
  const metric = healthData.performance[featureName][metricType];
  
  // Add new value
  metric.values.push({
    value,
    timestamp,
    metadata
  });
  
  // Update statistics
  metric.stats.count++;
  metric.stats.total += value;
  metric.stats.min = Math.min(metric.stats.min, value);
  metric.stats.max = Math.max(metric.stats.max, value);
  metric.stats.avg = metric.stats.total / metric.stats.count;
  
  // Check threshold violation
  const threshold = healthData.performanceThresholds[metricType];
  if (threshold && value > threshold) {
    metric.thresholdViolations++;
    
    // Log performance violation
    recordStructuredLog('warn', `Performance threshold exceeded for ${featureName}`, {
      metricType,
      value,
      threshold,
      metadata
    }, featureName, 'performance');
  }
  
  // Limit stored values
  if (metric.values.length > 100) {
    metric.values.shift();
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
 * Handle structured log recording from content script
 */
export function handleRecordStructuredLog(message, sender, sendResponse) {
  try {
    const { level, logMessage, data, feature, category } = message;
    
    if (!level || !logMessage) {
      sendResponse({ success: false, error: 'Missing required log data' });
      return true;
    }
    
    // Record structured log with content script source
    recordStructuredLog(level, logMessage, {
      ...data,
      tabId: sender.tab?.id,
      tabUrl: sender.tab?.url,
      source: 'content-script'
    }, feature, category || 'system');
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('[health] Error recording structured log:', error);
    sendResponse({ success: false, error: error.message });
  }
  
  return true;
}

/**
 * Handle feature event recording from content script
 */
export function handleRecordFeatureEvent(message, sender, sendResponse) {
  try {
    const { featureName, event, level, logMessage, data } = message;
    
    if (!featureName || !event || !level || !logMessage) {
      sendResponse({ success: false, error: 'Missing required feature event data' });
      return true;
    }
    
    // Record feature event with content script source
    recordFeatureEvent(featureName, event, level, logMessage, {
      ...data,
      tabId: sender.tab?.id,
      tabUrl: sender.tab?.url,
      source: 'content-script'
    });
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('[health] Error recording feature event:', error);
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
    
    // Use enhanced performance metric recording
    recordEnhancedPerformanceMetric(feature, metric, value, {
      ...metadata,
      tabId: sender.tab?.id,
      source: 'content-script'
    });
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('[health] Error recording performance metric:', error);
    sendResponse({ success: false, error: error.message });
  }
  
  return true;
}

/**
 * Handle get filtered logs request with enhanced filtering options
 * @param {Object} message - Message object with filtering options
 * @param {Object} sender - Sender information
 * @param {Function} sendResponse - Response callback
 */
export function handleGetFilteredLogs(message, sender, sendResponse) {
  try {
    const {
      limit = 50,
      level = null,        // Filter by log level
      feature = null,      // Filter by feature
      category = null,     // Filter by category
      startTime = null,    // Filter by time range
      endTime = null,
      search = null        // Search in message text
    } = message;

    let logs = [];

    if (feature && healthData.logChannels[feature]) {
      // Get logs from specific feature channel
      logs = [...healthData.logChannels[feature].logs];
    } else if (category && healthData.logCategories[category]) {
      // Get logs from specific category
      logs = [...healthData.logCategories[category].logs];
    } else {
      // Get all logs
      logs = [...healthData.debugLogs];
    }

    // Apply filters
    if (level) {
      const levelValue = LOG_LEVELS[level.toUpperCase()];
      if (levelValue !== undefined) {
        logs = logs.filter(log => LOG_LEVELS[log.level.toUpperCase()] >= levelValue);
      }
    }

    if (startTime) {
      logs = logs.filter(log => log.timestamp >= startTime);
    }

    if (endTime) {
      logs = logs.filter(log => log.timestamp <= endTime);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      logs = logs.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        (log.feature && log.feature.toLowerCase().includes(searchLower))
      );
    }

    // Sort by timestamp (newest first) and limit
    logs.sort((a, b) => b.timestamp - a.timestamp);
    logs = logs.slice(0, limit);

    sendResponse({
      success: true,
      logs,
      totalCount: logs.length,
      filters: { level, feature, category, startTime, endTime, search }
    });

  } catch (error) {
    console.error('[health] Error getting filtered logs:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
  
  return true;
}

/**
 * Handle get feature channels request
 * @param {Object} message - Message object
 * @param {Object} sender - Sender information
 * @param {Function} sendResponse - Response callback
 */
export function handleGetFeatureChannels(message, sender, sendResponse) {
  try {
    const channels = Object.keys(healthData.logChannels).map(featureName => ({
      name: featureName,
      logCount: healthData.logChannels[featureName].count,
      levels: healthData.logChannels[featureName].levels,
      lastActivity: healthData.logChannels[featureName].logs.length > 0 
        ? healthData.logChannels[featureName].logs[healthData.logChannels[featureName].logs.length - 1].timestamp
        : null
    }));

    sendResponse({
      success: true,
      channels,
      categories: Object.keys(healthData.logCategories).map(categoryName => ({
        name: categoryName,
        count: healthData.logCategories[categoryName].count
      }))
    });

  } catch (error) {
    console.error('[health] Error getting feature channels:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
  
  return true;
}

/**
 * Handle get performance summary request
 * @param {Object} message - Message object
 * @param {Object} sender - Sender information
 * @param {Function} sendResponse - Response callback
 */
export function handleGetPerformanceSummary(message, sender, sendResponse) {
  try {
    const { feature = null } = message;
    
    let performanceData;
    
    if (feature && healthData.performance[feature]) {
      // Get specific feature performance
      performanceData = {
        [feature]: healthData.performance[feature]
      };
    } else {
      // Get all performance data
      performanceData = healthData.performance;
    }
    
    // Calculate summary statistics
    const summary = {
      features: Object.keys(performanceData).length,
      totalMetrics: 0,
      thresholdViolations: 0,
      averagePerformance: {},
      worstPerformers: [],
      thresholds: healthData.performanceThresholds
    };
    
    Object.entries(performanceData).forEach(([featureName, featureMetrics]) => {
      Object.entries(featureMetrics).forEach(([metricType, metric]) => {
        summary.totalMetrics++;
        summary.thresholdViolations += metric.thresholdViolations || 0;
        
        if (!summary.averagePerformance[metricType]) {
          summary.averagePerformance[metricType] = [];
        }
        
        summary.averagePerformance[metricType].push({
          feature: featureName,
          average: metric.stats.avg,
          violations: metric.thresholdViolations || 0
        });
      });
    });
    
    // Sort worst performers
    Object.keys(summary.averagePerformance).forEach(metricType => {
      summary.averagePerformance[metricType].sort((a, b) => b.average - a.average);
      
      // Add to worst performers if above threshold
      const threshold = healthData.performanceThresholds[metricType];
      if (threshold) {
        summary.averagePerformance[metricType].forEach(item => {
          if (item.average > threshold) {
            summary.worstPerformers.push({
              feature: item.feature,
              metricType,
              value: item.average,
              threshold,
              violations: item.violations
            });
          }
        });
      }
    });
    
    sendResponse({
      success: true,
      performance: performanceData,
      summary
    });

  } catch (error) {
    console.error('[health] Error getting performance summary:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
  
  return true;
}

/**
 * Handle update performance thresholds request
 * @param {Object} message - Message object with new thresholds
 * @param {Object} sender - Sender information
 * @param {Function} sendResponse - Response callback
 */
export function handleUpdatePerformanceThresholds(message, sender, sendResponse) {
  try {
    const { thresholds } = message;
    
    if (!thresholds || typeof thresholds !== 'object') {
      sendResponse({ success: false, error: 'Invalid thresholds provided' });
      return true;
    }
    
    // Validate threshold values
    const validKeys = ['initTime', 'apiResponse', 'renderTime', 'memoryUsage'];
    const updatedThresholds = {};
    
    Object.entries(thresholds).forEach(([key, value]) => {
      if (validKeys.includes(key) && typeof value === 'number' && value > 0) {
        updatedThresholds[key] = value;
      }
    });
    
    // Update thresholds
    healthData.performanceThresholds = {
      ...healthData.performanceThresholds,
      ...updatedThresholds
    };
    
    recordStructuredLog('info', 'Performance thresholds updated', {
      oldThresholds: healthData.performanceThresholds,
      newThresholds: updatedThresholds,
      updatedBy: sender.tab?.id || 'popup'
    }, null, 'system');
    
    sendResponse({
      success: true,
      thresholds: healthData.performanceThresholds
    });

  } catch (error) {
    console.error('[health] Error updating performance thresholds:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
  
  return true;
}
