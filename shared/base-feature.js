/**
 * Base Feature Class for PowerCloud Extension
 * 
 * Provides a standardized structure for extension features while maintaining
 * backward compatibility with existing feature implementations.
 * 
 * This class is designed to be gradually adopted by existing features without
 * requiring immediate refactoring of the entire codebase.
 */

/**
 * Base class for PowerCloud extension features
 * Provides common functionality and standardized lifecycle management
 */
class BaseFeature {
  /**
   * Create a new BaseFeature instance
   * @param {string} name - The name of the feature
   * @param {Object} options - Configuration options for the feature
   * @param {string} [options.hostElementId] - ID for the feature's host element
   * @param {boolean} [options.enableDebugLogging=false] - Enable debug logging
   */
  constructor(name, options = {}) {
    this.name = name;
    this.hostElementId = options.hostElementId || `powercloud-${name}-host`;
    this.enableDebugLogging = options.enableDebugLogging || false;
    this.isInitialized = false;
    this.isActive = false;
    this.initStartTime = null;
    this.performanceMetrics = {
      initializationTime: 0,
      activationTime: 0,
      cleanupTime: 0
    };
    
    // Initialize logger with feature-specific context
    this.logger = window.loggerFactory?.createLogger(`Feature.${name}`) || {
      debug: (...args) => console.log(`[DEBUG][Feature.${name}]`, ...args),
      info: (...args) => console.log(`[INFO][Feature.${name}]`, ...args),
      warn: (...args) => console.warn(`[WARN][Feature.${name}]`, ...args),
      error: (...args) => console.error(`[ERROR][Feature.${name}]`, ...args)
    };
    
    // Initialize enhanced debugging if available
    this.enhancedDebug = window.enhancedDebug || null;
  }

  /**
   * Initialize the feature
   * This method should be overridden by subclasses
   * @param {Object} match - URL match result from FeatureManager
   * @returns {Promise<void>|void}
   */
  async onInit(match) {
    this.initStartTime = performance.now();
    
    // Track initialization start
    if (this.enhancedDebug) {
      this.enhancedDebug.performanceTracker.startTiming(`${this.name}-init`);
      this.enhancedDebug.usageTracker.trackUsage(this.name, 'initialization-start');
    }
    
    try {
      this.log('Feature initialized', { match });
      this.isInitialized = true;
      
      // Record initialization time
      this.performanceMetrics.initializationTime = performance.now() - this.initStartTime;
      
      if (this.enhancedDebug) {
        const duration = this.enhancedDebug.performanceTracker.endTiming(`${this.name}-init`);
        this.enhancedDebug.usageTracker.trackUsage(this.name, 'initialization-complete', { 
          duration 
        });
      }
      
    } catch (error) {
      this.handleError('Feature initialization failed', error);
      throw error;
    }
  }

  /**
   * Clean up the feature
   * This method should be overridden by subclasses
   * @returns {Promise<void>|void}
   */
  async onCleanup() {
    const cleanupStartTime = performance.now();
    
    if (this.enhancedDebug) {
      this.enhancedDebug.performanceTracker.startTiming(`${this.name}-cleanup`);
      this.enhancedDebug.usageTracker.trackUsage(this.name, 'cleanup-start');
    }
    
    try {
      this.log('Feature cleaned up');
      this.isInitialized = false;
      this.isActive = false;
      
      // Record cleanup time
      this.performanceMetrics.cleanupTime = performance.now() - cleanupStartTime;
      
      if (this.enhancedDebug) {
        const duration = this.enhancedDebug.performanceTracker.endTiming(`${this.name}-cleanup`);
        this.enhancedDebug.usageTracker.trackUsage(this.name, 'cleanup-complete', { 
          duration 
        });
      }
      
    } catch (error) {
      this.handleError('Feature cleanup failed', error);
      throw error;
    }
  }

  /**
   * Activate the feature
   * Called when the feature becomes active on the current page
   * @returns {Promise<void>|void}
   */
  async onActivate() {
    const activationStartTime = performance.now();
    
    if (this.enhancedDebug) {
      this.enhancedDebug.performanceTracker.startTiming(`${this.name}-activate`);
      this.enhancedDebug.usageTracker.trackUsage(this.name, 'activation-start');
    }
    
    try {
      this.logger.info('Feature activated');
      this.isActive = true;
      
      // Record activation time
      this.performanceMetrics.activationTime = performance.now() - activationStartTime;
      
      if (this.enhancedDebug) {
        const duration = this.enhancedDebug.performanceTracker.endTiming(`${this.name}-activate`);
        this.enhancedDebug.usageTracker.trackUsage(this.name, 'activation-complete', { 
          duration 
        });
      }
      
    } catch (error) {
      this.handleError('Feature activation failed', error);
      throw error;
    }
  }

  /**
   * Deactivate the feature
   * Called when the feature becomes inactive (page change, etc.)
   * @returns {Promise<void>|void}
   */
  onDeactivate() {
    this.logger.info('Feature deactivated');
    this.isActive = false;
  }

  /**
   * Handle errors that occur during feature operation
   * @param {Error} error - The error that occurred
   * @param {string} context - Context where the error occurred
   */
  onError(error, context = 'unknown') {
    this.logger.error(`Error in ${context}:`, error);
    
    // Use enhanced error reporting if available
    if (this.enhancedDebug) {
      const enhancedError = this.enhancedDebug.reportError(error, {
        feature: this.name,
        context: context,
        isInitialized: this.isInitialized,
        isActive: this.isActive,
        performanceMetrics: this.performanceMetrics
      });
      
      // Log enhanced error details in debug mode
      if (this.enableDebugLogging) {
        this.logger.debug('Enhanced error details:', enhancedError);
      }
    }
  }

  /**
   * Enhanced error handling method with better context
   * @param {string} message - Error message
   * @param {Error|string} error - The error object or message
   * @param {Object} additionalContext - Additional context for debugging
   */
  handleError(message, error, additionalContext = {}) {
    const fullContext = {
      feature: this.name,
      message: message,
      isInitialized: this.isInitialized,
      isActive: this.isActive,
      performanceMetrics: this.performanceMetrics,
      ...additionalContext
    };
    
    this.logger.error(message, error);
    
    if (this.enhancedDebug) {
      this.enhancedDebug.reportError(error, fullContext);
    }
  }

  /**
   * Log a message if debug logging is enabled
   * @param {string} message - The message to log
   * @param {Object} [data] - Additional data to log
   */
  log(message, data = null) {
    if (this.enableDebugLogging) {
      if (data) {
        this.logger.debug(message, data);
      } else {
        this.logger.debug(message);
      }
    }
  }

  /**
   * Check if the feature is currently active
   * @returns {boolean}
   */
  getIsActive() {
    return this.isActive;
  }

  /**
   * Check if the feature is initialized
   * @returns {boolean}
   */
  getIsInitialized() {
    return this.isInitialized;
  }

  /**
   * Get the feature's host element
   * @returns {HTMLElement|null}
   */
  getHostElement() {
    return document.getElementById(this.hostElementId);
  }

  /**
   * Remove the feature's host element
   * Utility method for cleanup operations
   */
  removeHostElement() {
    const hostElement = this.getHostElement();
    if (hostElement) {
      hostElement.remove();
      this.log('Host element removed');
    }
  }

  /**
   * Create and return feature registration object for FeatureManager
   * This method provides backward compatibility with existing feature patterns
   * @returns {Object} Feature registration object
   */
  createFeatureRegistration() {
    return {
      init: (match) => {
        try {
          this.onInit(match);
          this.onActivate();
        } catch (error) {
          this.onError(error, 'initialization');
        }
      },
      cleanup: () => {
        try {
          this.onDeactivate();
          this.onCleanup();
        } catch (error) {
          this.onError(error, 'cleanup');
        }
      },
      isActive: () => this.getIsActive()
    };
  }

  /**
   * Get performance metrics for this feature
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      name: this.name,
      isInitialized: this.isInitialized,
      isActive: this.isActive
    };
  }

  /**
   * Get feature health status
   * @returns {Object} Health status information
   */
  getHealthStatus() {
    const status = {
      name: this.name,
      isHealthy: this.isInitialized && !this.hasErrors,
      isInitialized: this.isInitialized,
      isActive: this.isActive,
      performanceMetrics: this.performanceMetrics,
      timestamp: Date.now()
    };
    
    // Add memory usage if available
    if (performance.memory) {
      status.memoryUsage = {
        usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100,
        totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024 * 100) / 100
      };
    }
    
    return status;
  }
}

// Make BaseFeature available globally for use by feature scripts
window.BaseFeature = BaseFeature;

// Export for potential module usage in the future
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BaseFeature;
}
