/**
 * Performance Monitor for PowerCloud Extension Features
 * Phase 2.2 - Feature Validation Implementation
 * 
 * Provides comprehensive performance monitoring and metrics collection
 * for extension features including timing, memory usage, and resource tracking.
 */

/**
 * Performance Monitor - Tracks and analyzes feature performance
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.performanceObserver = null;
    this.measurementPoints = new Map();
    this.thresholds = {
      initializationTime: 500, // ms
      cleanupTime: 100,        // ms
      memoryGrowth: 10 * 1024 * 1024, // 10MB
      domElementLimit: 100,
      eventListenerLimit: 50
    };
    
    // Initialize logger with improved fallback
    this.logger = window.PowerCloudLoggerFactory?.getLogger('PerformanceMonitor') || 
      window.LoggerFactory?.createFallbackLogger('PerformanceMonitor') || 
      {
        debug: (message, data) => {
          // Only log performance debug info in debug mode
          if (window.PowerCloudDebug) {
            console.debug('[DEBUG][PerformanceMonitor]', message, data || '');
          }
        },
        info: (message, data) => {
          // Reduce console noise - only log in debug mode
          if (window.PowerCloudDebug) {
            console.info('[INFO][PerformanceMonitor]', message, data || '');
          }
        },
        warn: (...args) => console.warn('[WARN][PerformanceMonitor]', ...args),
        error: (...args) => console.error('[ERROR][PerformanceMonitor]', ...args)
      };
    
    this._initializePerformanceObserver();
  }

  /**
   * Start monitoring a feature operation
   * @param {string} featureName - Name of the feature
   * @param {string} operation - Operation being performed (init, cleanup, etc.)
   * @returns {string} Measurement ID
   */
  startMeasurement(featureName, operation) {
    const measurementId = `${featureName}-${operation}-${Date.now()}`;
    const startTime = performance.now();
    
    this.measurementPoints.set(measurementId, {
      featureName,
      operation,
      startTime,
      startMemory: this._getMemoryUsage(),
      startDomCount: this._getDomElementCount(featureName)
    });
    
    this.logger.debug(`Started measuring ${operation} for ${featureName}`, { measurementId });
    
    return measurementId;
  }

  /**
   * End a feature operation measurement
   * @param {string} measurementId - ID returned from startMeasurement
   * @returns {Object} Performance metrics for the operation
   */
  endMeasurement(measurementId) {
    const measurement = this.measurementPoints.get(measurementId);
    if (!measurement) {
      this.logger.warn(`Measurement not found: ${measurementId}`);
      return null;
    }
    
    const endTime = performance.now();
    const endMemory = this._getMemoryUsage();
    const endDomCount = this._getDomElementCount(measurement.featureName);
    
    const metrics = {
      measurementId,
      featureName: measurement.featureName,
      operation: measurement.operation,
      timestamp: new Date().toISOString(),
      duration: endTime - measurement.startTime,
      memoryDelta: endMemory - measurement.startMemory,
      domElementDelta: endDomCount - measurement.startDomCount,
      thresholdViolations: []
    };
    
    // Check thresholds
    this._checkThresholds(metrics);
    
    // Store metrics
    this._storeMetrics(metrics);
    
    // Clean up measurement point
    this.measurementPoints.delete(measurementId);
    
    this.logger.debug(`Completed measurement for ${measurement.featureName}:${measurement.operation}`, metrics);
    
    return metrics;
  }

  /**
   * Monitor feature initialization performance
   * @param {string} featureName - Name of the feature
   * @param {Function} initFunction - Initialization function to monitor
   * @param {any} initArgs - Arguments to pass to init function
   * @returns {Promise<Object>} Initialization result with performance metrics
   */
  async monitorInitialization(featureName, initFunction, ...initArgs) {
    const measurementId = this.startMeasurement(featureName, 'initialization');
    
    try {
      const startTime = performance.now();
      const result = await initFunction(...initArgs);
      const endTime = performance.now();
      
      const metrics = this.endMeasurement(measurementId);
      
      // Add additional initialization-specific metrics
      if (metrics) {
        metrics.initializationResult = 'success';
        metrics.actualDuration = endTime - startTime;
      }
      
      this.logger.info(`Feature ${featureName} initialized in ${metrics?.duration || 0}ms`);
      
      return { result, metrics };
    } catch (error) {
      const metrics = this.endMeasurement(measurementId);
      if (metrics) {
        metrics.initializationResult = 'error';
        metrics.error = error.message;
      }
      
      this.logger.error(`Feature ${featureName} initialization failed:`, error);
      throw error;
    }
  }

  /**
   * Monitor feature cleanup performance
   * @param {string} featureName - Name of the feature
   * @param {Function} cleanupFunction - Cleanup function to monitor
   * @returns {Promise<Object>} Cleanup result with performance metrics
   */
  async monitorCleanup(featureName, cleanupFunction) {
    const measurementId = this.startMeasurement(featureName, 'cleanup');
    
    try {
      const startTime = performance.now();
      const result = await cleanupFunction();
      const endTime = performance.now();
      
      const metrics = this.endMeasurement(measurementId);
      
      // Add cleanup-specific metrics
      if (metrics) {
        metrics.cleanupResult = 'success';
        metrics.actualDuration = endTime - startTime;
        
        // Check for proper cleanup
        const remainingElements = this._getDomElementCount(featureName);
        if (remainingElements > 0) {
          metrics.thresholdViolations.push({
            type: 'cleanup_incomplete',
            message: `${remainingElements} DOM elements remaining after cleanup`
          });
        }
      }
      
      this.logger.info(`Feature ${featureName} cleaned up in ${metrics?.duration || 0}ms`);
      
      return { result, metrics };
    } catch (error) {
      const metrics = this.endMeasurement(measurementId);
      if (metrics) {
        metrics.cleanupResult = 'error';
        metrics.error = error.message;
      }
      
      this.logger.error(`Feature ${featureName} cleanup failed:`, error);
      throw error;
    }
  }

  /**
   * Get performance summary for a feature
   * @param {string} featureName - Name of the feature
   * @returns {Object} Performance summary
   */
  getFeaturePerformanceSummary(featureName) {
    const featureMetrics = Array.from(this.metrics.values())
      .filter(metric => metric.featureName === featureName);
    
    if (featureMetrics.length === 0) {
      return null;
    }
    
    const summary = {
      featureName,
      totalMeasurements: featureMetrics.length,
      operations: {},
      overallStats: {
        totalDuration: 0,
        averageDuration: 0,
        maxDuration: 0,
        minDuration: Infinity,
        totalMemoryDelta: 0,
        totalDomElementDelta: 0,
        thresholdViolations: 0
      }
    };
    
    // Group by operation
    featureMetrics.forEach(metric => {
      if (!summary.operations[metric.operation]) {
        summary.operations[metric.operation] = {
          count: 0,
          totalDuration: 0,
          averageDuration: 0,
          maxDuration: 0,
          minDuration: Infinity,
          successCount: 0,
          errorCount: 0
        };
      }
      
      const op = summary.operations[metric.operation];
      op.count++;
      op.totalDuration += metric.duration;
      op.maxDuration = Math.max(op.maxDuration, metric.duration);
      op.minDuration = Math.min(op.minDuration, metric.duration);
      
      if (metric.initializationResult === 'success' || metric.cleanupResult === 'success') {
        op.successCount++;
      } else if (metric.initializationResult === 'error' || metric.cleanupResult === 'error') {
        op.errorCount++;
      } else {
        op.successCount++; // Assume success if no specific result
      }
      
      // Update overall stats
      summary.overallStats.totalDuration += metric.duration;
      summary.overallStats.maxDuration = Math.max(summary.overallStats.maxDuration, metric.duration);
      summary.overallStats.minDuration = Math.min(summary.overallStats.minDuration, metric.duration);
      summary.overallStats.totalMemoryDelta += metric.memoryDelta || 0;
      summary.overallStats.totalDomElementDelta += metric.domElementDelta || 0;
      summary.overallStats.thresholdViolations += metric.thresholdViolations?.length || 0;
    });
    
    // Calculate averages
    Object.keys(summary.operations).forEach(op => {
      const operation = summary.operations[op];
      operation.averageDuration = operation.totalDuration / operation.count;
    });
    
    summary.overallStats.averageDuration = summary.overallStats.totalDuration / featureMetrics.length;
    
    return summary;
  }

  /**
   * Get all performance metrics
   * @returns {Array} All performance metrics
   */
  getAllMetrics() {
    return Array.from(this.metrics.values());
  }

  /**
   * Get metrics for specific operation type
   * @param {string} operation - Operation type (init, cleanup, etc.)
   * @returns {Array} Metrics for the operation
   */
  getMetricsByOperation(operation) {
    return Array.from(this.metrics.values())
      .filter(metric => metric.operation === operation);
  }

  /**
   * Clear performance metrics
   * @param {string} [featureName] - Optional feature name to clear specific metrics
   */
  clearMetrics(featureName) {
    if (featureName) {
      for (const [id, metric] of this.metrics.entries()) {
        if (metric.featureName === featureName) {
          this.metrics.delete(id);
        }
      }
    } else {
      this.metrics.clear();
    }
  }

  /**
   * Set performance thresholds
   * @param {Object} newThresholds - New threshold values
   */
  setThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    this.logger.info('Performance thresholds updated:', this.thresholds);
  }

  /**
   * Get current performance thresholds
   * @returns {Object} Current thresholds
   */
  getThresholds() {
    return { ...this.thresholds };
  }

  /**
   * Initialize Performance Observer for advanced metrics
   * @private
   */
  _initializePerformanceObserver() {
    if (typeof PerformanceObserver === 'undefined') {
      this.logger.debug('PerformanceObserver not available');
      return;
    }
    
    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.name.includes('powercloud')) {
            this.logger.debug('Performance entry:', entry);
          }
        });
      });
      
      this.performanceObserver.observe({ entryTypes: ['measure', 'mark'] });
    } catch (error) {
      this.logger.warn('Failed to initialize PerformanceObserver:', error);
    }
  }

  /**
   * Get current memory usage
   * @private
   */
  _getMemoryUsage() {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Get DOM element count for a feature
   * @private
   */
  _getDomElementCount(featureName) {
    try {
      const selectors = [
        `[id*="${featureName}"]`,
        `[class*="${featureName}"]`,
        `[data-feature="${featureName}"]`,
        `.powercloud-${featureName}`
      ];
      
      let count = 0;
      selectors.forEach(selector => {
        count += document.querySelectorAll(selector).length;
      });
      
      return count;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Check performance thresholds
   * @private
   */
  _checkThresholds(metrics) {
    const violations = [];
    
    // Check duration thresholds
    if (metrics.operation === 'initialization' && metrics.duration > this.thresholds.initializationTime) {
      violations.push({
        type: 'slow_initialization',
        threshold: this.thresholds.initializationTime,
        actual: metrics.duration,
        message: `Initialization took ${metrics.duration}ms, threshold is ${this.thresholds.initializationTime}ms`
      });
    }
    
    if (metrics.operation === 'cleanup' && metrics.duration > this.thresholds.cleanupTime) {
      violations.push({
        type: 'slow_cleanup',
        threshold: this.thresholds.cleanupTime,
        actual: metrics.duration,
        message: `Cleanup took ${metrics.duration}ms, threshold is ${this.thresholds.cleanupTime}ms`
      });
    }
    
    // Check memory growth
    if (metrics.memoryDelta > this.thresholds.memoryGrowth) {
      violations.push({
        type: 'excessive_memory_growth',
        threshold: this.thresholds.memoryGrowth,
        actual: metrics.memoryDelta,
        message: `Memory grew by ${metrics.memoryDelta} bytes, threshold is ${this.thresholds.memoryGrowth} bytes`
      });
    }
    
    // Check DOM element growth
    if (metrics.domElementDelta > this.thresholds.domElementLimit) {
      violations.push({
        type: 'excessive_dom_elements',
        threshold: this.thresholds.domElementLimit,
        actual: metrics.domElementDelta,
        message: `Created ${metrics.domElementDelta} DOM elements, threshold is ${this.thresholds.domElementLimit}`
      });
    }
    
    metrics.thresholdViolations = violations;
    
    if (violations.length > 0) {
      this.logger.warn(`Performance threshold violations for ${metrics.featureName}:`, violations);
      
      // Record performance threshold violations in health dashboard
      if (chrome?.runtime?.sendMessage) {
        violations.forEach(violation => {
          chrome.runtime.sendMessage({
            action: 'recordStructuredLog',
            level: 'warn',
            feature: 'performance',
            category: 'performance',
            message: `Performance threshold violation: ${violation.type}`,
            data: {
              featureName: metrics.featureName,
              operation: metrics.operation,
              violationType: violation.type,
              threshold: violation.threshold,
              actual: violation.actual,
              message: violation.message,
              measurementId: metrics.measurementId,
              timestamp: metrics.timestamp,
              duration: metrics.duration,
              memoryDelta: metrics.memoryDelta,
              domElementDelta: metrics.domElementDelta
            }
          }).catch(() => {});
        });
      }
    }
  }

  /**
   * Store performance metrics
   * @private
   */
  _storeMetrics(metrics) {
    this.metrics.set(metrics.measurementId, metrics);
    
    // Keep only last 100 measurements per feature to prevent memory growth
    const featureMetrics = Array.from(this.metrics.entries())
      .filter(([id, metric]) => metric.featureName === metrics.featureName)
      .sort(([, a], [, b]) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (featureMetrics.length > 100) {
      const toDelete = featureMetrics.slice(100);
      toDelete.forEach(([id]) => this.metrics.delete(id));
    }
  }
}

// Make PerformanceMonitor available globally
window.PerformanceMonitor = PerformanceMonitor;

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceMonitor;
}
