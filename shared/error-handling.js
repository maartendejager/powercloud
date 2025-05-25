/**
 * Enhanced Error Handling for PowerCloud Extension
 * 
 * Provides error boundaries and graceful degradation for feature loading.
 * This system ensures that if one feature fails, it doesn't break the entire extension.
 */

/**
 * Feature initialization error boundary
 * Safely initializes features with proper error handling and logging
 */
class FeatureErrorBoundary {
  constructor() {
    // Use improved fallback logger pattern
    this.logger = window.PowerCloudLoggerFactory?.getLogger('ErrorBoundary') || 
      window.LoggerFactory?.createFallbackLogger('ErrorBoundary') || 
      {
        debug: (message, data) => {
          // Only log debug info in debug mode
          if (window.PowerCloudDebug) {
            console.debug('[DEBUG][ErrorBoundary]', message, data || '');
          }
        },
        info: (message, data) => {
          // Reduce console noise - only log in debug mode
          if (window.PowerCloudDebug) {
            console.info('[INFO][ErrorBoundary]', message, data || '');
          }
        },
        warn: (...args) => console.warn('[WARN][ErrorBoundary]', ...args),
        error: (...args) => console.error('[ERROR][ErrorBoundary]', ...args)
      };
    
    this.failedFeatures = new Set();
    this.retryAttempts = new Map();
    this.maxRetries = 2;
  }

  /**
   * Safely initialize a feature with error boundary protection
   * @param {string} featureName - Name of the feature being initialized
   * @param {Function} initFunction - Function that initializes the feature
   * @param {Object} options - Options for error handling
   * @param {boolean} [options.allowRetry=true] - Allow retrying failed initialization
   * @param {number} [options.retryDelay=1000] - Delay before retry in milliseconds
   * @returns {Promise<boolean>} - Returns true if initialization succeeded, false otherwise
   */
  async safeInitialize(featureName, initFunction, options = {}) {
    const { allowRetry = true, retryDelay = 1000 } = options;
    
    try {
      this.logger.debug(`Initializing feature: ${featureName}`);
      
      // Execute the initialization function
      await initFunction();
      
      this.logger.info(`Feature initialized successfully: ${featureName}`);
      
      // Remove from failed features if it was previously failed
      this.failedFeatures.delete(featureName);
      this.retryAttempts.delete(featureName);
      
      return true;
      
    } catch (error) {
      this.logger.error(`Feature initialization failed: ${featureName}`, error);
      
      // Track the failure
      this.failedFeatures.add(featureName);
      
      // Handle retries
      if (allowRetry && this.shouldRetry(featureName)) {
        this.logger.warn(`Scheduling retry for feature: ${featureName}`);
        setTimeout(() => {
          this.safeInitialize(featureName, initFunction, { ...options, allowRetry: false });
        }, retryDelay);
      } else {
        this.logger.error(`Feature permanently failed: ${featureName}`);
        this.handlePermanentFailure(featureName, error);
      }
      
      return false;
    }
  }

  /**
   * Check if a feature should be retried
   * @param {string} featureName - Name of the feature
   * @returns {boolean}
   */
  shouldRetry(featureName) {
    const attempts = this.retryAttempts.get(featureName) || 0;
    if (attempts < this.maxRetries) {
      this.retryAttempts.set(featureName, attempts + 1);
      return true;
    }
    return false;
  }

  /**
   * Handle permanent feature failure
   * @param {string} featureName - Name of the failed feature
   * @param {Error} error - The error that caused the failure
   */
  handlePermanentFailure(featureName, error) {
    // Store failure information for debugging
    const failureInfo = {
      featureName,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };
    
    // Store in session storage for debugging
    try {
      const existingFailures = JSON.parse(sessionStorage.getItem('powercloud-failed-features') || '[]');
      existingFailures.push(failureInfo);
      sessionStorage.setItem('powercloud-failed-features', JSON.stringify(existingFailures));
    } catch (storageError) {
      this.logger.warn('Could not store failure information', storageError);
    }
    
    this.logger.error(`Permanent failure recorded for feature: ${featureName}`, failureInfo);
  }

  /**
   * Get the list of failed features
   * @returns {Set<string>}
   */
  getFailedFeatures() {
    return new Set(this.failedFeatures);
  }

  /**
   * Check if a feature has failed
   * @param {string} featureName - Name of the feature to check
   * @returns {boolean}
   */
  hasFeatureFailed(featureName) {
    return this.failedFeatures.has(featureName);
  }

  /**
   * Reset failure status for a feature (useful for manual retry)
   * @param {string} featureName - Name of the feature to reset
   */
  resetFeature(featureName) {
    this.failedFeatures.delete(featureName);
    this.retryAttempts.delete(featureName);
    this.logger.info(`Reset failure status for feature: ${featureName}`);
  }

  /**
   * Get failure statistics
   * @returns {Object} Statistics about feature failures
   */
  getFailureStats() {
    return {
      totalFailed: this.failedFeatures.size,
      failedFeatures: Array.from(this.failedFeatures),
      retryAttempts: Object.fromEntries(this.retryAttempts)
    };
  }
}

/**
 * Enhanced feature registration with error boundary protection
 */
class SafeFeatureManager {
  constructor() {
    this.errorBoundary = new FeatureErrorBoundary();
    this.features = new Map();
    // Use improved fallback logger pattern
    this.logger = window.PowerCloudLoggerFactory?.getLogger('SafeFeatureManager') || 
      window.LoggerFactory?.createFallbackLogger('SafeFeatureManager') || 
      {
        debug: (message, data) => {
          // Only log debug info in debug mode
          if (window.PowerCloudDebug) {
            console.debug('[DEBUG][SafeFeatureManager]', message, data || '');
          }
        },
        info: (message, data) => {
          // Reduce console noise - only log in debug mode
          if (window.PowerCloudDebug) {
            console.info('[INFO][SafeFeatureManager]', message, data || '');
          }
        },
        warn: (...args) => console.warn('[WARN][SafeFeatureManager]', ...args),
        error: (...args) => console.error('[ERROR][SafeFeatureManager]', ...args)
      };
  }

  /**
   * Register a feature with error boundary protection
   * @param {string} featureName - Name of the feature
   * @param {Function|Object} featureConfig - Feature function or configuration
   * @param {Object} options - Registration options
   * @returns {Promise<boolean>} - Returns true if registration succeeded
   */
  async registerFeature(featureName, featureConfig, options = {}) {
    const initFunction = () => {
      if (typeof featureConfig === 'function') {
        // Traditional function-based feature
        featureConfig();
      } else if (featureConfig && typeof featureConfig.init === 'function') {
        // Object-based feature with init method
        featureConfig.init();
      } else if (featureConfig instanceof BaseFeature) {
        // BaseFeature instance
        return featureConfig.initialize();
      } else {
        throw new Error(`Invalid feature configuration for ${featureName}`);
      }
    };

    const success = await this.errorBoundary.safeInitialize(featureName, initFunction, options);
    
    if (success) {
      this.features.set(featureName, featureConfig);
      this.logger.info(`Feature registered successfully: ${featureName}`);
    }
    
    return success;
  }

  /**
   * Get registered features
   * @returns {Map<string, *>}
   */
  getFeatures() {
    return new Map(this.features);
  }

  /**
   * Get feature status report
   * @returns {Object} Status report including successes and failures
   */
  getStatusReport() {
    return {
      registered: Array.from(this.features.keys()),
      failed: Array.from(this.errorBoundary.getFailedFeatures()),
      stats: this.errorBoundary.getFailureStats()
    };
  }
}

// Make classes available globally
window.PowerCloudFeatureErrorBoundary = FeatureErrorBoundary;
window.PowerCloudSafeFeatureManager = SafeFeatureManager;
