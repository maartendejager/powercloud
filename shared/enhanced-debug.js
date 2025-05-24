/**
 * Enhanced Debug Module for PowerCloud Extension
 * 
 * Provides advanced debugging capabilities including health monitoring,
 * performance tracking, feature usage analytics, and detailed error reporting.
 * 
 * @version 1.0.0
 */

/**
 * Debug modes for different levels of debugging output
 */
const DebugMode = {
  SILENT: 0,     // No debug output
  BASIC: 1,      // Basic debug information
  VERBOSE: 2,    // Detailed debug information
  EXTREME: 3     // All possible debug information
};

/**
 * Performance metrics tracking
 */
class PerformanceTracker {
  constructor() {
    this.metrics = new Map();
    this.startTimes = new Map();
    this.memorySnapshots = [];
    this.enabled = false;
  }

  /**
   * Enable performance tracking
   */
  enable() {
    this.enabled = true;
    this.startMemoryMonitoring();
  }

  /**
   * Disable performance tracking
   */
  disable() {
    this.enabled = false;
    this.stopMemoryMonitoring();
  }

  /**
   * Start timing an operation
   * @param {string} operation - Name of the operation
   */
  startTiming(operation) {
    if (!this.enabled) return;
    this.startTimes.set(operation, performance.now());
  }

  /**
   * End timing an operation and record the duration
   * @param {string} operation - Name of the operation
   * @returns {number} Duration in milliseconds
   */
  endTiming(operation) {
    if (!this.enabled) return 0;
    
    const startTime = this.startTimes.get(operation);
    if (!startTime) return 0;
    
    const duration = performance.now() - startTime;
    this.recordMetric(operation, duration);
    this.startTimes.delete(operation);
    
    return duration;
  }

  /**
   * Record a performance metric
   * @param {string} name - Metric name
   * @param {number} value - Metric value
   */
  recordMetric(name, value) {
    if (!this.enabled) return;
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        count: 0,
        total: 0,
        min: Infinity,
        max: -Infinity,
        avg: 0,
        history: []
      });
    }
    
    const metric = this.metrics.get(name);
    metric.count++;
    metric.total += value;
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);
    metric.avg = metric.total / metric.count;
    
    // Keep last 100 measurements
    metric.history.push({
      value,
      timestamp: Date.now()
    });
    
    if (metric.history.length > 100) {
      metric.history.shift();
    }
  }

  /**
   * Get performance metrics summary
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    const summary = {};
    for (const [name, metric] of this.metrics) {
      summary[name] = {
        count: metric.count,
        average: Math.round(metric.avg * 100) / 100,
        min: Math.round(metric.min * 100) / 100,
        max: Math.round(metric.max * 100) / 100,
        total: Math.round(metric.total * 100) / 100
      };
    }
    return summary;
  }

  /**
   * Start monitoring memory usage
   */
  startMemoryMonitoring() {
    if (!this.enabled || this.memoryInterval) return;
    
    this.memoryInterval = setInterval(() => {
      if (performance.memory) {
        this.memorySnapshots.push({
          timestamp: Date.now(),
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        });
        
        // Keep only last hour of snapshots (assuming 30s intervals)
        if (this.memorySnapshots.length > 120) {
          this.memorySnapshots.shift();
        }
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop monitoring memory usage
   */
  stopMemoryMonitoring() {
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }
  }

  /**
   * Get memory usage trends
   * @returns {Object} Memory usage information
   */
  getMemoryUsage() {
    if (this.memorySnapshots.length === 0) {
      return { error: 'No memory data available' };
    }
    
    const latest = this.memorySnapshots[this.memorySnapshots.length - 1];
    const oldest = this.memorySnapshots[0];
    
    return {
      current: {
        used: Math.round(latest.usedJSHeapSize / 1024 / 1024 * 100) / 100, // MB
        total: Math.round(latest.totalJSHeapSize / 1024 / 1024 * 100) / 100, // MB
        limit: Math.round(latest.jsHeapSizeLimit / 1024 / 1024 * 100) / 100 // MB
      },
      trend: {
        growthMB: Math.round((latest.usedJSHeapSize - oldest.usedJSHeapSize) / 1024 / 1024 * 100) / 100,
        timeSpanMinutes: Math.round((latest.timestamp - oldest.timestamp) / 1000 / 60 * 100) / 100
      },
      snapshots: this.memorySnapshots.length
    };
  }
}

/**
 * Feature usage tracker for privacy-focused analytics
 */
class FeatureUsageTracker {
  constructor() {
    this.usageData = new Map();
    this.sessionStart = Date.now();
    this.enabled = false;
  }

  /**
   * Enable usage tracking
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disable usage tracking
   */
  disable() {
    this.enabled = false;
  }

  /**
   * Track feature usage
   * @param {string} featureName - Name of the feature
   * @param {string} action - Action performed (e.g., 'activated', 'used', 'deactivated')
   * @param {Object} metadata - Additional non-sensitive metadata
   */
  trackUsage(featureName, action, metadata = {}) {
    if (!this.enabled) return;
    
    const key = `${featureName}:${action}`;
    
    if (!this.usageData.has(key)) {
      this.usageData.set(key, {
        count: 0,
        firstUse: Date.now(),
        lastUse: null,
        errors: 0,
        metadata: {}
      });
    }
    
    const usage = this.usageData.get(key);
    usage.count++;
    usage.lastUse = Date.now();
    
    // Merge non-sensitive metadata
    if (metadata.error) {
      usage.errors++;
    }
    
    // Track timing information only
    if (metadata.duration) {
      if (!usage.metadata.durations) {
        usage.metadata.durations = [];
      }
      usage.metadata.durations.push(metadata.duration);
      
      // Keep only last 50 durations
      if (usage.metadata.durations.length > 50) {
        usage.metadata.durations.shift();
      }
    }
  }

  /**
   * Get usage statistics
   * @returns {Object} Aggregated usage statistics
   */
  getUsageStats() {
    const stats = {
      sessionDurationMinutes: Math.round((Date.now() - this.sessionStart) / 1000 / 60 * 100) / 100,
      features: {},
      summary: {
        totalFeatures: 0,
        totalActions: 0,
        totalErrors: 0
      }
    };
    
    for (const [key, usage] of this.usageData) {
      const [feature, action] = key.split(':');
      
      if (!stats.features[feature]) {
        stats.features[feature] = {
          actions: {},
          totalCount: 0,
          totalErrors: 0
        };
        stats.summary.totalFeatures++;
      }
      
      stats.features[feature].actions[action] = {
        count: usage.count,
        errors: usage.errors,
        firstUse: new Date(usage.firstUse).toISOString(),
        lastUse: usage.lastUse ? new Date(usage.lastUse).toISOString() : null
      };
      
      if (usage.metadata.durations && usage.metadata.durations.length > 0) {
        const durations = usage.metadata.durations;
        stats.features[feature].actions[action].averageDuration = 
          Math.round(durations.reduce((a, b) => a + b, 0) / durations.length * 100) / 100;
      }
      
      stats.features[feature].totalCount += usage.count;
      stats.features[feature].totalErrors += usage.errors;
      stats.summary.totalActions += usage.count;
      stats.summary.totalErrors += usage.errors;
    }
    
    return stats;
  }

  /**
   * Clear usage data (for privacy)
   */
  clearData() {
    this.usageData.clear();
    this.sessionStart = Date.now();
  }
}

/**
 * Enhanced error message generator
 */
class ErrorMessageEnhancer {
  constructor() {
    this.errorPatterns = new Map();
    this.solutionDatabase = new Map();
    this.initializeErrorPatterns();
  }

  /**
   * Initialize common error patterns and solutions
   */
  initializeErrorPatterns() {
    // Feature initialization errors
    this.addErrorPattern(
      /Feature .* failed to initialize/,
      'Feature Initialization Error',
      'A feature failed to start properly. This might be due to missing dependencies or network issues.',
      [
        'Check if the page has finished loading',
        'Verify that all required DOM elements are present',
        'Check browser console for additional error details',
        'Try refreshing the page'
      ]
    );

    // URL pattern errors
    this.addErrorPattern(
      /URL pattern .* is not valid/,
      'URL Pattern Error',
      'The extension is trying to use an invalid URL pattern for feature activation.',
      [
        'Verify the current page URL matches expected patterns',
        'Check if you\'re on a supported spend.cloud domain',
        'Report this issue if you believe the URL should be supported'
      ]
    );

    // Storage errors
    this.addErrorPattern(
      /Cannot access chrome\.storage/,
      'Storage Access Error',
      'The extension cannot access Chrome storage. This might be due to permissions or browser issues.',
      [
        'Check if the extension has proper permissions',
        'Try restarting the browser',
        'Check if Chrome storage quota has been exceeded',
        'Reinstall the extension if the problem persists'
      ]
    );

    // Network errors
    this.addErrorPattern(
      /NetworkError|fetch failed|ERR_NETWORK/,
      'Network Connection Error',
      'The extension cannot connect to the required services.',
      [
        'Check your internet connection',
        'Verify that spend.cloud services are accessible',
        'Check if corporate firewall is blocking requests',
        'Try again in a few moments'
      ]
    );
  }

  /**
   * Add an error pattern and solution
   * @param {RegExp} pattern - Regular expression to match error messages
   * @param {string} title - Human-readable error title
   * @param {string} description - Error description
   * @param {Array<string>} solutions - Array of suggested solutions
   */
  addErrorPattern(pattern, title, description, solutions) {
    this.errorPatterns.set(pattern, {
      title,
      description,
      solutions
    });
  }

  /**
   * Enhance an error with additional context and solutions
   * @param {Error|string} error - The error to enhance
   * @param {Object} context - Additional context about the error
   * @returns {Object} Enhanced error information
   */
  enhanceError(error, context = {}) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : null;
    
    // Find matching pattern
    let matchedPattern = null;
    let patternInfo = null;
    
    for (const [pattern, info] of this.errorPatterns) {
      if (pattern.test(errorMessage)) {
        matchedPattern = pattern;
        patternInfo = info;
        break;
      }
    }
    
    const enhancedError = {
      originalMessage: errorMessage,
      originalStack: errorStack,
      timestamp: new Date().toISOString(),
      context: {
        url: window.location ? window.location.href : 'unknown',
        userAgent: navigator.userAgent,
        extensionContext: context.feature || 'unknown',
        ...context
      }
    };
    
    if (patternInfo) {
      enhancedError.enhanced = {
        title: patternInfo.title,
        description: patternInfo.description,
        solutions: patternInfo.solutions,
        severity: this.calculateSeverity(errorMessage, context)
      };
    } else {
      enhancedError.enhanced = {
        title: 'Unknown Error',
        description: 'An unexpected error occurred. Please check the details below.',
        solutions: [
          'Check the browser console for additional details',
          'Try refreshing the page',
          'Report this issue with the error details'
        ],
        severity: 'medium'
      };
    }
    
    return enhancedError;
  }

  /**
   * Calculate error severity based on message and context
   * @param {string} message - Error message
   * @param {Object} context - Error context
   * @returns {string} Severity level: 'low', 'medium', 'high', 'critical'
   */
  calculateSeverity(message, context) {
    // Critical errors
    if (message.includes('Cannot access chrome.') || 
        message.includes('Extension context invalidated')) {
      return 'critical';
    }
    
    // High severity errors
    if (message.includes('failed to initialize') || 
        message.includes('NetworkError') ||
        context.feature === 'core') {
      return 'high';
    }
    
    // Medium severity errors
    if (message.includes('timeout') || 
        message.includes('not found') ||
        message.includes('invalid')) {
      return 'medium';
    }
    
    // Low severity (default)
    return 'low';
  }
}

/**
 * Main Enhanced Debug class
 */
class EnhancedDebug {
  constructor() {
    this.mode = DebugMode.BASIC;
    this.logger = null;
    this.performanceTracker = new PerformanceTracker();
    this.usageTracker = new FeatureUsageTracker();
    this.errorEnhancer = new ErrorMessageEnhancer();
    this.debugLogs = [];
    this.maxLogs = 1000;
    this.enabled = false;
  }

  /**
   * Initialize the debug system
   * @param {Logger} logger - Logger instance to use
   * @param {Object} config - Debug configuration
   */
  initialize(logger, config = {}) {
    this.logger = logger;
    this.mode = config.mode || DebugMode.BASIC;
    this.enabled = config.enabled || false;
    this.maxLogs = config.maxLogs || 1000;
    
    if (config.enablePerformanceTracking) {
      this.performanceTracker.enable();
    }
    
    if (config.enableUsageTracking) {
      this.usageTracker.enable();
    }
    
    this.log('Enhanced debug system initialized', { mode: this.mode, enabled: this.enabled });
  }

  /**
   * Set debug mode
   * @param {number} mode - Debug mode from DebugMode enum
   */
  setMode(mode) {
    this.mode = mode;
    this.log(`Debug mode changed to: ${Object.keys(DebugMode)[mode]}`);
  }

  /**
   * Enable or disable debug system
   * @param {boolean} enabled - Whether to enable debugging
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    this.log(`Debug system ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Log a debug message with context
   * @param {string} message - Debug message
   * @param {Object} data - Additional debug data
   * @param {string} level - Log level (debug, info, warn, error)
   */
  log(message, data = {}, level = 'debug') {
    if (!this.enabled && level !== 'error') return;
    
    const logEntry = {
      timestamp: Date.now(),
      message,
      data,
      level,
      mode: this.mode
    };
    
    // Add to internal log buffer
    this.debugLogs.push(logEntry);
    if (this.debugLogs.length > this.maxLogs) {
      this.debugLogs.shift();
    }
    
    // Log using the provided logger if available
    if (this.logger) {
      this.logger[level](message, data);
    } else {
      console[level](`[EnhancedDebug] ${message}`, data);
    }
  }

  /**
   * Get debug statistics and health information
   * @returns {Object} Debug health information
   */
  getHealthInfo() {
    return {
      debugSystem: {
        enabled: this.enabled,
        mode: Object.keys(DebugMode)[this.mode],
        logsCollected: this.debugLogs.length,
        maxLogs: this.maxLogs
      },
      performance: this.performanceTracker.getMetrics(),
      memory: this.performanceTracker.getMemoryUsage(),
      usage: this.usageTracker.getUsageStats(),
      recentLogs: this.debugLogs.slice(-10) // Last 10 logs
    };
  }

  /**
   * Enhanced error reporting
   * @param {Error|string} error - The error to report
   * @param {Object} context - Additional context
   * @returns {Object} Enhanced error information
   */
  reportError(error, context = {}) {
    const enhancedError = this.errorEnhancer.enhanceError(error, context);
    this.log('Enhanced error reported', enhancedError, 'error');
    
    // Track error in usage statistics
    if (context.feature) {
      this.usageTracker.trackUsage(context.feature, 'error', { error: true });
    }
    
    return enhancedError;
  }

  /**
   * Clear all debug data
   */
  clearData() {
    this.debugLogs = [];
    this.usageTracker.clearData();
    this.log('Debug data cleared');
  }
}

// Create global enhanced debug instance
const enhancedDebug = new EnhancedDebug();

// Make classes available globally
window.EnhancedDebug = EnhancedDebug;
window.DebugMode = DebugMode;
window.PerformanceTracker = PerformanceTracker;
window.FeatureUsageTracker = FeatureUsageTracker;
window.ErrorMessageEnhancer = ErrorMessageEnhancer;
window.enhancedDebug = enhancedDebug;

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    EnhancedDebug,
    DebugMode,
    PerformanceTracker,
    FeatureUsageTracker,
    ErrorMessageEnhancer,
    enhancedDebug
  };
}
