/**
 * Error Tracker for PowerCloud Extension Features
 * Phase 2.2 - Feature Validation Implementation
 * 
 * Provides comprehensive error tracking, categorization, and reporting
 * for extension features with integration into existing error handling.
 */

/**
 * Error Tracker - Tracks and analyzes feature errors
 */
class ErrorTracker {
  constructor() {
    this.errors = new Map();
    this.errorPatterns = new Map();
    this.errorCategories = {
      INITIALIZATION: 'initialization',
      CLEANUP: 'cleanup',
      RUNTIME: 'runtime',
      VALIDATION: 'validation',
      PERFORMANCE: 'performance',
      NETWORK: 'network',
      DOM: 'dom',
      UNKNOWN: 'unknown'
    };
    
    // Initialize logger with improved fallback pattern
    this.logger = window.PowerCloudLoggerFactory?.getLogger('ErrorTracker') || 
      window.PowerCloudLoggerFactory?.createFallbackLogger('ErrorTracker');
    
    this._initializeErrorPatterns();
  }

  /**
   * Track an error for a specific feature
   * @param {string} featureName - Name of the feature where error occurred
   * @param {Error|string} error - Error object or error message
   * @param {string} context - Context where error occurred (init, cleanup, etc.)
   * @param {Object} metadata - Additional metadata about the error
   * @returns {string} Error ID
   */
  trackError(featureName, error, context = 'runtime', metadata = {}) {
    const errorId = `${featureName}-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const errorRecord = {
      id: errorId,
      featureName,
      timestamp: new Date().toISOString(),
      context,
      message: this._extractErrorMessage(error),
      stack: this._extractErrorStack(error),
      category: this._categorizeError(error, context),
      severity: this._determineSeverity(error, context),
      metadata: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        featureState: this._getFeatureState(featureName),
        ...metadata
      },
      resolved: false,
      occurredAt: Date.now()
    };
    
    // Store the error
    this.errors.set(errorId, errorRecord);
    
    // Update error patterns
    this._updateErrorPatterns(errorRecord);
    
    // Log the error
    this._logError(errorRecord);
    
    this.logger.info(`Tracked error ${errorId} for feature ${featureName} in context ${context}`);
    
    return errorId;
  }

  /**
   * Track validation error
   * @param {string} featureName - Name of the feature
   * @param {Object} validationResult - Validation result containing errors
   * @returns {Array<string>} Array of error IDs
   */
  trackValidationErrors(featureName, validationResult) {
    const errorIds = [];
    
    if (validationResult.errors && validationResult.errors.length > 0) {
      validationResult.errors.forEach(errorMessage => {
        const errorId = this.trackError(featureName, new Error(errorMessage), 'validation', {
          validationId: validationResult.id,
          checks: validationResult.checks
        });
        errorIds.push(errorId);
      });
    }
    
    return errorIds;
  }

  /**
   * Track performance threshold violations as errors
   * @param {string} featureName - Name of the feature
   * @param {Array} violations - Array of threshold violations
   * @returns {Array<string>} Array of error IDs
   */
  trackPerformanceViolations(featureName, violations) {
    const errorIds = [];
    
    violations.forEach(violation => {
      const errorMessage = `Performance violation: ${violation.message}`;
      const errorId = this.trackError(featureName, new Error(errorMessage), 'performance', {
        violationType: violation.type,
        threshold: violation.threshold,
        actual: violation.actual
      });
      errorIds.push(errorId);
    });
    
    return errorIds;
  }

  /**
   * Mark an error as resolved
   * @param {string} errorId - ID of the error to resolve
   * @param {string} resolution - Description of how the error was resolved
   * @returns {boolean} True if error was found and marked as resolved
   */
  resolveError(errorId, resolution = 'Manual resolution') {
    const error = this.errors.get(errorId);
    if (!error) {
      this.logger.warn(`Error not found: ${errorId}`);
      return false;
    }
    
    error.resolved = true;
    error.resolvedAt = Date.now();
    error.resolution = resolution;
    
    this.logger.info(`Error ${errorId} marked as resolved: ${resolution}`);
    return true;
  }

  /**
   * Get error statistics for a feature
   * @param {string} featureName - Name of the feature
   * @param {Object} options - Options for filtering
   * @returns {Object} Error statistics
   */
  getFeatureErrorStats(featureName, options = {}) {
    const { timeRange = 24 * 60 * 60 * 1000, includeResolved = false } = options; // Default 24 hours
    const cutoffTime = Date.now() - timeRange;
    
    const featureErrors = Array.from(this.errors.values())
      .filter(error => 
        error.featureName === featureName &&
        error.occurredAt >= cutoffTime &&
        (includeResolved || !error.resolved)
      );
    
    const stats = {
      featureName,
      totalErrors: featureErrors.length,
      resolvedErrors: featureErrors.filter(e => e.resolved).length,
      unresolvedErrors: featureErrors.filter(e => !e.resolved).length,
      byCategory: {},
      bySeverity: {},
      byContext: {},
      mostCommonPatterns: [],
      errorRate: 0,
      timeRange: timeRange
    };
    
    // Group by category
    featureErrors.forEach(error => {
      stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      stats.byContext[error.context] = (stats.byContext[error.context] || 0) + 1;
    });
    
    // Get most common patterns
    stats.mostCommonPatterns = this._getMostCommonPatterns(featureName, 5);
    
    // Calculate error rate (errors per hour)
    const hoursInRange = timeRange / (60 * 60 * 1000);
    stats.errorRate = featureErrors.length / hoursInRange;
    
    return stats;
  }

  /**
   * Get all errors for a feature
   * @param {string} featureName - Name of the feature
   * @param {Object} options - Filtering options
   * @returns {Array} Array of error records
   */
  getFeatureErrors(featureName, options = {}) {
    const { 
      limit = 50, 
      includeResolved = false, 
      category = null, 
      severity = null,
      context = null 
    } = options;
    
    let featureErrors = Array.from(this.errors.values())
      .filter(error => error.featureName === featureName);
    
    // Apply filters
    if (!includeResolved) {
      featureErrors = featureErrors.filter(error => !error.resolved);
    }
    
    if (category) {
      featureErrors = featureErrors.filter(error => error.category === category);
    }
    
    if (severity) {
      featureErrors = featureErrors.filter(error => error.severity === severity);
    }
    
    if (context) {
      featureErrors = featureErrors.filter(error => error.context === context);
    }
    
    // Sort by timestamp (newest first) and limit
    return featureErrors
      .sort((a, b) => b.occurredAt - a.occurredAt)
      .slice(0, limit);
  }

  /**
   * Get global error statistics
   * @param {Object} options - Options for filtering
   * @returns {Object} Global error statistics
   */
  getGlobalErrorStats(options = {}) {
    const { timeRange = 24 * 60 * 60 * 1000 } = options;
    const cutoffTime = Date.now() - timeRange;
    
    const recentErrors = Array.from(this.errors.values())
      .filter(error => error.occurredAt >= cutoffTime);
    
    const stats = {
      totalErrors: recentErrors.length,
      resolvedErrors: recentErrors.filter(e => e.resolved).length,
      unresolvedErrors: recentErrors.filter(e => !e.resolved).length,
      byFeature: {},
      byCategory: {},
      bySeverity: {},
      byContext: {},
      timeRange: timeRange
    };
    
    recentErrors.forEach(error => {
      stats.byFeature[error.featureName] = (stats.byFeature[error.featureName] || 0) + 1;
      stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      stats.byContext[error.context] = (stats.byContext[error.context] || 0) + 1;
    });
    
    return stats;
  }

  /**
   * Clear errors
   * @param {string} [featureName] - Optional feature name to clear specific errors
   * @param {boolean} [onlyResolved=false] - Only clear resolved errors
   */
  clearErrors(featureName, onlyResolved = false) {
    if (featureName) {
      for (const [id, error] of this.errors.entries()) {
        if (error.featureName === featureName && 
            (!onlyResolved || error.resolved)) {
          this.errors.delete(id);
        }
      }
    } else {
      if (onlyResolved) {
        for (const [id, error] of this.errors.entries()) {
          if (error.resolved) {
            this.errors.delete(id);
          }
        }
      } else {
        this.errors.clear();
        this.errorPatterns.clear();
      }
    }
  }

  /**
   * Extract error message from error object or string
   * @private
   */
  _extractErrorMessage(error) {
    if (typeof error === 'string') {
      return error;
    }
    if (error instanceof Error) {
      return error.message;
    }
    if (error && typeof error.toString === 'function') {
      return error.toString();
    }
    return 'Unknown error';
  }

  /**
   * Extract error stack from error object
   * @private
   */
  _extractErrorStack(error) {
    if (error instanceof Error && error.stack) {
      return error.stack;
    }
    return null;
  }

  /**
   * Categorize error based on message and context
   * @private
   */
  _categorizeError(error, context) {
    const message = this._extractErrorMessage(error).toLowerCase();
    
    // Check against known patterns
    for (const [pattern, category] of this.errorPatterns.entries()) {
      if (message.includes(pattern)) {
        return category;
      }
    }
    
    // Categorize by context
    if (context === 'initialization' || context === 'init') {
      return this.errorCategories.INITIALIZATION;
    }
    if (context === 'cleanup') {
      return this.errorCategories.CLEANUP;
    }
    if (context === 'validation') {
      return this.errorCategories.VALIDATION;
    }
    if (context === 'performance') {
      return this.errorCategories.PERFORMANCE;
    }
    
    // Categorize by error content
    if (message.includes('network') || message.includes('fetch') || message.includes('xhr')) {
      return this.errorCategories.NETWORK;
    }
    if (message.includes('element') || message.includes('dom') || message.includes('node')) {
      return this.errorCategories.DOM;
    }
    
    return this.errorCategories.RUNTIME;
  }

  /**
   * Determine error severity
   * @private
   */
  _determineSeverity(error, context) {
    const message = this._extractErrorMessage(error).toLowerCase();
    
    // Critical errors that prevent feature from working
    if (context === 'initialization' || 
        message.includes('cannot read property') ||
        message.includes('is not a function') ||
        message.includes('is not defined')) {
      return 'critical';
    }
    
    // High severity errors that impact functionality
    if (context === 'validation' ||
        message.includes('failed to') ||
        message.includes('timeout') ||
        message.includes('network error')) {
      return 'high';
    }
    
    // Medium severity for performance and cleanup issues
    if (context === 'performance' || context === 'cleanup') {
      return 'medium';
    }
    
    // Low severity for minor issues
    return 'low';
  }

  /**
   * Get current feature state for error context
   * @private
   */
  _getFeatureState(featureName) {
    // Try to get state from global feature registry or manager
    if (window.FeatureManager && window.FeatureManager.getFeatureState) {
      return window.FeatureManager.getFeatureState(featureName);
    }
    
    return 'unknown';
  }

  /**
   * Update error patterns for common error detection
   * @private
   */
  _updateErrorPatterns(errorRecord) {
    const message = errorRecord.message.toLowerCase();
    const words = message.split(/\s+/).filter(word => word.length > 3);
    
    words.forEach(word => {
      const key = `${errorRecord.category}:${word}`;
      const pattern = this.errorPatterns.get(key) || { count: 0, category: errorRecord.category };
      pattern.count++;
      this.errorPatterns.set(key, pattern);
    });
  }

  /**
   * Get most common error patterns for a feature
   * @private
   */
  _getMostCommonPatterns(featureName, limit = 5) {
    const featureErrors = Array.from(this.errors.values())
      .filter(error => error.featureName === featureName);
    
    const patterns = new Map();
    
    featureErrors.forEach(error => {
      const key = `${error.category}:${error.message.split(' ').slice(0, 5).join(' ')}`;
      patterns.set(key, (patterns.get(key) || 0) + 1);
    });
    
    return Array.from(patterns.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([pattern, count]) => ({ pattern, count }));
  }

  /**
   * Initialize common error patterns
   * @private
   */
  _initializeErrorPatterns() {
    const patterns = {
      'cannot read property': this.errorCategories.RUNTIME,
      'is not a function': this.errorCategories.RUNTIME,
      'is not defined': this.errorCategories.RUNTIME,
      'network error': this.errorCategories.NETWORK,
      'fetch failed': this.errorCategories.NETWORK,
      'timeout': this.errorCategories.NETWORK,
      'element not found': this.errorCategories.DOM,
      'invalid selector': this.errorCategories.DOM,
      'validation failed': this.errorCategories.VALIDATION,
      'initialization failed': this.errorCategories.INITIALIZATION,
      'cleanup failed': this.errorCategories.CLEANUP,
      'performance': this.errorCategories.PERFORMANCE
    };
    
    for (const [pattern, category] of Object.entries(patterns)) {
      this.errorPatterns.set(pattern, category);
    }
  }

  /**
   * Log error using appropriate log level
   * @private
   */
  _logError(errorRecord) {
    const logMessage = `[${errorRecord.context}] ${errorRecord.featureName}: ${errorRecord.message}`;
    
    switch (errorRecord.severity) {
      case 'critical':
        this.logger.error(logMessage, errorRecord);
        break;
      case 'high':
        this.logger.error(logMessage, errorRecord);
        break;
      case 'medium':
        this.logger.warn(logMessage, errorRecord);
        break;
      case 'low':
        this.logger.info(logMessage, errorRecord);
        break;
      default:
        this.logger.warn(logMessage, errorRecord);
    }
  }
}

// Make ErrorTracker available globally
window.ErrorTracker = ErrorTracker;

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorTracker;
}
