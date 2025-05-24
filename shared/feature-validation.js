/**
 * Feature Validation System for PowerCloud Extension
 * Phase 2.2 - Feature Validation Implementation
 * 
 * Provides comprehensive validation, health checking, performance monitoring,
 * and debugging utilities for extension features.
 */

/**
 * Feature Validator - Handles initialization validation and health checks
 */
class FeatureValidator {
  constructor() {
    this.validationResults = new Map();
    this.healthCheckResults = new Map();
    this.performanceMetrics = new Map();
    
    // Initialize logger
    this.logger = window.PowerCloudLoggerFactory?.getLogger('FeatureValidator') || {
      debug: (...args) => console.log('[DEBUG][FeatureValidator]', ...args),
      info: (...args) => console.log('[INFO][FeatureValidator]', ...args),
      warn: (...args) => console.warn('[WARN][FeatureValidator]', ...args),
      error: (...args) => console.error('[ERROR][FeatureValidator]', ...args)
    };
  }

  /**
   * Validate a feature before initialization
   * @param {Object} feature - Feature object to validate
   * @param {Object} match - URL match result
   * @returns {Object} Validation result
   */
  validateFeatureInitialization(feature, match) {
    const startTime = performance.now();
    const validationId = `${feature.name}-${Date.now()}`;
    
    this.logger.debug(`Starting validation for feature: ${feature.name}`);
    
    const result = {
      id: validationId,
      featureName: feature.name,
      timestamp: new Date().toISOString(),
      isValid: true,
      errors: [],
      warnings: [],
      checks: {
        hasRequiredProperties: false,
        hasValidUrlPattern: false,
        hasInitMethod: false,
        hasCleanupMethod: false,
        passesCustomValidation: false
      }
    };

    try {
      // Check required properties
      result.checks.hasRequiredProperties = this._validateRequiredProperties(feature, result);
      
      // Check URL pattern validity
      result.checks.hasValidUrlPattern = this._validateUrlPattern(feature, match, result);
      
      // Check required methods
      result.checks.hasInitMethod = this._validateInitMethod(feature, result);
      result.checks.hasCleanupMethod = this._validateCleanupMethod(feature, result);
      
      // Run custom validation if available
      result.checks.passesCustomValidation = this._validateCustomChecks(feature, match, result);
      
      // Determine overall validity
      result.isValid = Object.values(result.checks).every(check => check === true);
      
      if (result.isValid) {
        this.logger.info(`Feature ${feature.name} passed validation`);
      } else {
        this.logger.warn(`Feature ${feature.name} failed validation`, {
          errors: result.errors,
          warnings: result.warnings
        });
      }
      
    } catch (error) {
      result.isValid = false;
      result.errors.push(`Validation error: ${error.message}`);
      this.logger.error(`Validation failed for feature ${feature.name}:`, error);
    }
    
    const endTime = performance.now();
    result.validationDuration = endTime - startTime;
    
    // Store validation result
    this.validationResults.set(feature.name, result);
    
    return result;
  }

  /**
   * Perform health check on an active feature
   * @param {Object} feature - Feature object to check
   * @returns {Object} Health check result
   */
  performHealthCheck(feature) {
    const startTime = performance.now();
    const checkId = `${feature.name}-health-${Date.now()}`;
    
    this.logger.debug(`Performing health check for feature: ${feature.name}`);
    
    const result = {
      id: checkId,
      featureName: feature.name,
      timestamp: new Date().toISOString(),
      isHealthy: true,
      issues: [],
      metrics: {
        responseTime: 0,
        memoryUsage: 0,
        domElementCount: 0,
        eventListenerCount: 0
      },
      checks: {
        isInitialized: false,
        isActive: false,
        hasValidDomElements: false,
        hasNoMemoryLeaks: false,
        respondsToHealthCheck: false
      }
    };

    try {
      // Check if feature is properly initialized
      result.checks.isInitialized = this._checkFeatureInitialization(feature, result);
      
      // Check if feature is active
      result.checks.isActive = this._checkFeatureActivity(feature, result);
      
      // Check DOM elements
      result.checks.hasValidDomElements = this._checkDomElements(feature, result);
      
      // Check for memory leaks
      result.checks.hasNoMemoryLeaks = this._checkMemoryUsage(feature, result);
      
      // Test feature responsiveness
      result.checks.respondsToHealthCheck = this._checkFeatureResponsiveness(feature, result);
      
      // Determine overall health
      result.isHealthy = Object.values(result.checks).every(check => check === true);
      
      if (result.isHealthy) {
        this.logger.debug(`Feature ${feature.name} is healthy`);
      } else {
        this.logger.warn(`Feature ${feature.name} has health issues`, {
          issues: result.issues
        });
      }
      
    } catch (error) {
      result.isHealthy = false;
      result.issues.push(`Health check error: ${error.message}`);
      this.logger.error(`Health check failed for feature ${feature.name}:`, error);
    }
    
    const endTime = performance.now();
    result.metrics.responseTime = endTime - startTime;
    
    // Store health check result
    this.healthCheckResults.set(feature.name, result);
    
    return result;
  }

  /**
   * Validate required feature properties
   * @private
   */
  _validateRequiredProperties(feature, result) {
    const requiredProps = ['name', 'urlPattern'];
    const missingProps = requiredProps.filter(prop => !feature.hasOwnProperty(prop));
    
    if (missingProps.length > 0) {
      result.errors.push(`Missing required properties: ${missingProps.join(', ')}`);
      return false;
    }
    
    if (typeof feature.name !== 'string' || feature.name.trim().length === 0) {
      result.errors.push('Feature name must be a non-empty string');
      return false;
    }
    
    return true;
  }

  /**
   * Validate URL pattern
   * @private
   */
  _validateUrlPattern(feature, match, result) {
    try {
      if (!(feature.urlPattern instanceof RegExp)) {
        result.warnings.push('URL pattern is not a RegExp object');
        return false;
      }
      
      if (!match) {
        result.warnings.push('URL pattern did not match current page');
        return false;
      }
      
      // Test pattern with known valid URLs
      const testUrls = [
        'https://spend.cloud/test',
        'https://dev.spend.cloud/test'
      ];
      
      const matchesAny = testUrls.some(url => feature.urlPattern.test(url));
      if (!matchesAny) {
        result.warnings.push('URL pattern appears to be too restrictive');
      }
      
      return true;
    } catch (error) {
      result.errors.push(`URL pattern validation error: ${error.message}`);
      return false;
    }
  }

  /**
   * Validate init method
   * @private
   */
  _validateInitMethod(feature, result) {
    if (!feature.init || typeof feature.init !== 'function') {
      result.errors.push('Feature must have an init method');
      return false;
    }
    
    // Check function signature
    if (feature.init.length > 1) {
      result.warnings.push('Init method has more than 1 parameter, expected: (match)');
    }
    
    return true;
  }

  /**
   * Validate cleanup method
   * @private
   */
  _validateCleanupMethod(feature, result) {
    if (!feature.cleanup || typeof feature.cleanup !== 'function') {
      result.errors.push('Feature must have a cleanup method');
      return false;
    }
    
    if (feature.cleanup.length > 0) {
      result.warnings.push('Cleanup method should not require parameters');
    }
    
    return true;
  }

  /**
   * Run custom validation checks
   * @private
   */
  _validateCustomChecks(feature, match, result) {
    // Check if feature has custom validation
    if (feature.validate && typeof feature.validate === 'function') {
      try {
        const customResult = feature.validate(match);
        if (customResult === false) {
          result.warnings.push('Custom validation failed');
          return false;
        }
        if (typeof customResult === 'object' && customResult.errors) {
          result.errors.push(...customResult.errors);
          return false;
        }
      } catch (error) {
        result.errors.push(`Custom validation error: ${error.message}`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check feature initialization status
   * @private
   */
  _checkFeatureInitialization(feature, result) {
    // Check if feature is BaseFeature instance
    if (feature.isInitialized !== undefined) {
      if (!feature.isInitialized) {
        result.issues.push('Feature is not initialized');
        return false;
      }
      return true;
    }
    
    // For legacy features, check if init was called
    // This is harder to determine, so we'll assume it's initialized if it's active
    return true;
  }

  /**
   * Check feature activity status
   * @private
   */
  _checkFeatureActivity(feature, result) {
    // Check if feature is BaseFeature instance
    if (feature.isActive !== undefined) {
      if (!feature.isActive) {
        result.issues.push('Feature is not active');
        return false;
      }
      return true;
    }
    
    // For legacy features, check if isActive method exists
    if (feature.isActive && typeof feature.isActive === 'function') {
      try {
        const isActive = feature.isActive();
        if (!isActive) {
          result.issues.push('Feature reports as not active');
          return false;
        }
        return true;
      } catch (error) {
        result.issues.push(`Error checking feature activity: ${error.message}`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check DOM elements created by feature
   * @private
   */
  _checkDomElements(feature, result) {
    try {
      // Look for feature-specific elements
      const featureName = feature.name;
      const selectors = [
        `[id*="${featureName}"]`,
        `[class*="${featureName}"]`,
        `[data-feature="${featureName}"]`,
        `.powercloud-${featureName}`
      ];
      
      let elementCount = 0;
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elementCount += elements.length;
        
        // Check for orphaned elements
        elements.forEach(element => {
          if (!element.isConnected) {
            result.issues.push(`Found disconnected DOM element: ${selector}`);
          }
        });
      });
      
      result.metrics.domElementCount = elementCount;
      
      // If feature has hostElementId, check if it exists
      if (feature.hostElementId) {
        const hostElement = document.getElementById(feature.hostElementId);
        if (!hostElement) {
          result.issues.push(`Host element not found: ${feature.hostElementId}`);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      result.issues.push(`DOM element check error: ${error.message}`);
      return false;
    }
  }

  /**
   * Check for memory usage issues
   * @private
   */
  _checkMemoryUsage(feature, result) {
    try {
      // Basic memory usage check using performance.memory if available
      if (performance.memory) {
        result.metrics.memoryUsage = performance.memory.usedJSHeapSize;
      }
      
      // Check for potential memory leaks (event listeners, timers)
      if (feature.getEventListenerCount && typeof feature.getEventListenerCount === 'function') {
        const listenerCount = feature.getEventListenerCount();
        result.metrics.eventListenerCount = listenerCount;
        
        if (listenerCount > 50) {
          result.issues.push(`High number of event listeners: ${listenerCount}`);
        }
      }
      
      return true;
    } catch (error) {
      result.issues.push(`Memory usage check error: ${error.message}`);
      return false;
    }
  }

  /**
   * Check feature responsiveness
   * @private
   */
  _checkFeatureResponsiveness(feature, result) {
    try {
      // If feature has a health check method, call it
      if (feature.healthCheck && typeof feature.healthCheck === 'function') {
        const healthResult = feature.healthCheck();
        if (healthResult === false) {
          result.issues.push('Feature health check returned false');
          return false;
        }
        
        if (typeof healthResult === 'object' && healthResult.healthy === false) {
          result.issues.push(`Feature health check failed: ${healthResult.reason || 'Unknown reason'}`);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      result.issues.push(`Responsiveness check error: ${error.message}`);
      return false;
    }
  }

  /**
   * Get validation results for a feature
   * @param {string} featureName - Name of the feature
   * @returns {Object|null} Validation result or null if not found
   */
  getValidationResult(featureName) {
    return this.validationResults.get(featureName) || null;
  }

  /**
   * Get health check results for a feature
   * @param {string} featureName - Name of the feature
   * @returns {Object|null} Health check result or null if not found
   */
  getHealthCheckResult(featureName) {
    return this.healthCheckResults.get(featureName) || null;
  }

  /**
   * Get all validation results
   * @returns {Map} All validation results
   */
  getAllValidationResults() {
    return new Map(this.validationResults);
  }

  /**
   * Get all health check results
   * @returns {Map} All health check results
   */
  getAllHealthCheckResults() {
    return new Map(this.healthCheckResults);
  }

  /**
   * Clear validation and health check results
   * @param {string} [featureName] - Optional feature name to clear specific results
   */
  clearResults(featureName) {
    if (featureName) {
      this.validationResults.delete(featureName);
      this.healthCheckResults.delete(featureName);
    } else {
      this.validationResults.clear();
      this.healthCheckResults.clear();
    }
  }
}

// Make FeatureValidator available globally
window.FeatureValidator = FeatureValidator;

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FeatureValidator;
}
