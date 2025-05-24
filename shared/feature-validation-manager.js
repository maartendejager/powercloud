/**
 * Feature Validation Manager for PowerCloud Extension
 * Phase 2.2 - Feature Validation Implementation
 * 
 * Orchestrates feature validation, health checks, performance monitoring,
 * error tracking, and debugging utilities. Integrates with existing
 * FeatureManager and provides enhanced feature lifecycle management.
 */

/**
 * Feature Validation Manager - Central orchestrator for feature validation and monitoring
 */
class FeatureValidationManager {
  constructor() {
    this.validator = null;
    this.performanceMonitor = null;
    this.errorTracker = null;
    this.debugger = null;
    this.config = {
      enableValidation: true,
      enablePerformanceMonitoring: true,
      enableErrorTracking: true,
      enableDebugging: true,
      autoHealthChecks: true,
      healthCheckInterval: 30000, // 30 seconds
      performanceThresholds: {
        initializationTime: 500,
        cleanupTime: 100,
        memoryGrowth: 10 * 1024 * 1024
      }
    };
    
    // Initialize logger
    this.logger = window.PowerCloudLoggerFactory?.getLogger('FeatureValidationManager') || {
      debug: (...args) => console.log('[DEBUG][FeatureValidationManager]', ...args),
      info: (...args) => console.log('[INFO][FeatureValidationManager]', ...args),
      warn: (...args) => console.warn('[WARN][FeatureValidationManager]', ...args),
      error: (...args) => console.error('[ERROR][FeatureValidationManager]', ...args)
    };
    
    this._initialize();
  }

  /**
   * Initialize all validation components
   * @private
   */
  _initialize() {
    try {
      // Initialize components if their classes are available
      if (window.FeatureValidator && this.config.enableValidation) {
        this.validator = new window.FeatureValidator();
        this.logger.info('FeatureValidator initialized');
      }
      
      if (window.PerformanceMonitor && this.config.enablePerformanceMonitoring) {
        this.performanceMonitor = new window.PerformanceMonitor();
        this.performanceMonitor.setThresholds(this.config.performanceThresholds);
        this.logger.info('PerformanceMonitor initialized');
      }
      
      if (window.ErrorTracker && this.config.enableErrorTracking) {
        this.errorTracker = new window.ErrorTracker();
        this.logger.info('ErrorTracker initialized');
      }
      
      if (window.FeatureDebugger && this.config.enableDebugging) {
        this.debugger = new window.FeatureDebugger();
        this.logger.info('FeatureDebugger initialized');
      }
      
      // Set up automatic health checks
      if (this.config.autoHealthChecks) {
        this._setupAutoHealthChecks();
      }
      
      // Integrate with existing FeatureManager
      this._integrateWithFeatureManager();
      
      this.logger.info('FeatureValidationManager initialized successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize FeatureValidationManager:', error);
    }
  }

  /**
   * Validate and initialize a feature with comprehensive monitoring
   * @param {Object} feature - Feature object to initialize
   * @param {Object} match - URL match result
   * @returns {Promise<Object>} Enhanced initialization result
   */
  async validateAndInitializeFeature(feature, match) {
    const startTime = performance.now();
    const result = {
      featureName: feature.name,
      success: false,
      validation: null,
      performance: null,
      errors: [],
      debugSession: null
    };
    
    try {
      this.logger.info(`Starting enhanced initialization for feature: ${feature.name}`);
      
      // Step 1: Validate feature before initialization
      if (this.validator) {
        result.validation = this.validator.validateFeatureInitialization(feature, match);
        
        if (!result.validation.isValid) {
          result.errors.push('Feature validation failed');
          if (this.errorTracker) {
            this.errorTracker.trackValidationErrors(feature.name, result.validation);
          }
          return result;
        }
      }
      
      // Step 2: Start debug session if debugging is enabled
      if (this.debugger) {
        result.debugSession = this.debugger.startDebugSession(feature.name, {
          capturePerformance: true,
          trackStateChanges: true
        });
      }
      
      // Step 3: Monitor performance during initialization
      let initResult;
      if (this.performanceMonitor) {
        const monitorResult = await this.performanceMonitor.monitorInitialization(
          feature.name,
          feature.init.bind(feature),
          match
        );
        initResult = monitorResult.result;
        result.performance = monitorResult.metrics;
        
        // Track performance violations as errors
        if (this.errorTracker && result.performance.thresholdViolations.length > 0) {
          this.errorTracker.trackPerformanceViolations(feature.name, result.performance.thresholdViolations);
        }
      } else {
        // Fallback to direct initialization
        initResult = await feature.init(match);
      }
      
      // Step 4: Perform post-initialization health check
      if (this.validator) {
        const healthCheck = this.validator.performHealthCheck(feature);
        result.healthCheck = healthCheck;
        
        if (!healthCheck.isHealthy && this.errorTracker) {
          this.errorTracker.trackError(
            feature.name,
            new Error(`Health check failed: ${healthCheck.issues.join(', ')}`),
            'post-initialization'
          );
        }
      }
      
      result.success = true;
      result.initResult = initResult;
      
      const endTime = performance.now();
      this.logger.info(`Feature ${feature.name} initialized successfully in ${endTime - startTime}ms`);
      
    } catch (error) {
      result.success = false;
      result.error = error.message;
      
      // Track initialization error
      if (this.errorTracker) {
        this.errorTracker.trackError(feature.name, error, 'initialization');
      }
      
      this.logger.error(`Feature ${feature.name} initialization failed:`, error);
    }
    
    return result;
  }

  /**
   * Cleanup a feature with comprehensive monitoring
   * @param {Object} feature - Feature object to cleanup
   * @returns {Promise<Object>} Enhanced cleanup result
   */
  async validateAndCleanupFeature(feature) {
    const startTime = performance.now();
    const result = {
      featureName: feature.name,
      success: false,
      performance: null,
      errors: [],
      healthCheck: null
    };
    
    try {
      this.logger.info(`Starting enhanced cleanup for feature: ${feature.name}`);
      
      // Step 1: Monitor performance during cleanup
      let cleanupResult;
      if (this.performanceMonitor) {
        const monitorResult = await this.performanceMonitor.monitorCleanup(
          feature.name,
          feature.cleanup.bind(feature)
        );
        cleanupResult = monitorResult.result;
        result.performance = monitorResult.metrics;
        
        // Track performance violations
        if (this.errorTracker && result.performance.thresholdViolations.length > 0) {
          this.errorTracker.trackPerformanceViolations(feature.name, result.performance.thresholdViolations);
        }
      } else {
        cleanupResult = await feature.cleanup();
      }
      
      // Step 2: Perform post-cleanup health check
      if (this.validator) {
        const healthCheck = this.validator.performHealthCheck(feature);
        result.healthCheck = healthCheck;
        
        // After cleanup, we expect the feature to be inactive
        if (healthCheck.checks.isActive && this.errorTracker) {
          this.errorTracker.trackError(
            feature.name,
            new Error('Feature still active after cleanup'),
            'cleanup'
          );
        }
      }
      
      // Step 3: Stop debug session if active
      if (this.debugger) {
        const activeSessions = this.debugger.getAllDebugData().sessions
          .filter(session => session.featureName === feature.name && session.active);
        
        activeSessions.forEach(session => {
          this.debugger.stopDebugSession(session.id);
        });
      }
      
      result.success = true;
      result.cleanupResult = cleanupResult;
      
      const endTime = performance.now();
      this.logger.info(`Feature ${feature.name} cleaned up successfully in ${endTime - startTime}ms`);
      
    } catch (error) {
      result.success = false;
      result.error = error.message;
      
      // Track cleanup error
      if (this.errorTracker) {
        this.errorTracker.trackError(feature.name, error, 'cleanup');
      }
      
      this.logger.error(`Feature ${feature.name} cleanup failed:`, error);
    }
    
    return result;
  }

  /**
   * Perform comprehensive health check on a feature
   * @param {Object} feature - Feature object to check
   * @returns {Object} Comprehensive health report
   */
  performComprehensiveHealthCheck(feature) {
    const report = {
      featureName: feature.name,
      timestamp: new Date().toISOString(),
      overall: 'unknown',
      validation: null,
      performance: null,
      errors: null,
      debugging: null
    };
    
    try {
      // Validation health check
      if (this.validator) {
        report.validation = this.validator.performHealthCheck(feature);
      }
      
      // Performance metrics
      if (this.performanceMonitor) {
        report.performance = this.performanceMonitor.getFeaturePerformanceSummary(feature.name);
      }
      
      // Error statistics
      if (this.errorTracker) {
        report.errors = this.errorTracker.getFeatureErrorStats(feature.name);
      }
      
      // Debug information
      if (this.debugger) {
        report.debugging = this.debugger.getDebugInfo(feature.name);
      }
      
      // Determine overall health
      report.overall = this._determineOverallHealth(report);
      
      this.logger.debug(`Health check completed for ${feature.name}:`, report.overall);
      
    } catch (error) {
      report.overall = 'error';
      report.error = error.message;
      this.logger.error(`Health check failed for ${feature.name}:`, error);
    }
    
    return report;
  }

  /**
   * Get comprehensive dashboard data for all features
   * @returns {Object} Dashboard data
   */
  getDashboardData() {
    const dashboard = {
      timestamp: new Date().toISOString(),
      features: {},
      globalStats: {
        totalFeatures: 0,
        healthyFeatures: 0,
        featuresWithErrors: 0,
        featuresBeingDebugged: 0
      },
      systemHealth: 'unknown'
    };
    
    try {
      // Get list of known features
      const featureNames = this._getKnownFeatures();
      
      featureNames.forEach(featureName => {
        const featureData = {
          name: featureName,
          health: 'unknown',
          performance: null,
          errors: null,
          debugging: null
        };
        
        // Get health information
        if (this.validator) {
          const healthResult = this.validator.getHealthCheckResult(featureName);
          if (healthResult) {
            featureData.health = healthResult.isHealthy ? 'healthy' : 'unhealthy';
          }
        }
        
        // Get performance summary
        if (this.performanceMonitor) {
          featureData.performance = this.performanceMonitor.getFeaturePerformanceSummary(featureName);
        }
        
        // Get error statistics
        if (this.errorTracker) {
          featureData.errors = this.errorTracker.getFeatureErrorStats(featureName);
        }
        
        // Get debug information
        if (this.debugger) {
          featureData.debugging = this.debugger.getDebugInfo(featureName);
        }
        
        dashboard.features[featureName] = featureData;
        dashboard.globalStats.totalFeatures++;
        
        if (featureData.health === 'healthy') {
          dashboard.globalStats.healthyFeatures++;
        }
        
        if (featureData.errors && featureData.errors.unresolvedErrors > 0) {
          dashboard.globalStats.featuresWithErrors++;
        }
        
        if (featureData.debugging && featureData.debugging.activeSessions > 0) {
          dashboard.globalStats.featuresBeingDebugged++;
        }
      });
      
      // Determine system health
      dashboard.systemHealth = this._determineSystemHealth(dashboard.globalStats);
      
      this.logger.debug('Dashboard data compiled:', dashboard.globalStats);
      
    } catch (error) {
      dashboard.systemHealth = 'error';
      dashboard.error = error.message;
      this.logger.error('Failed to compile dashboard data:', error);
    }
    
    return dashboard;
  }

  /**
   * Configure the validation manager
   * @param {Object} newConfig - New configuration options
   */
  configure(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Update component configurations
    if (this.performanceMonitor && newConfig.performanceThresholds) {
      this.performanceMonitor.setThresholds(newConfig.performanceThresholds);
    }
    
    this.logger.info('FeatureValidationManager configuration updated:', this.config);
  }

  /**
   * Get current configuration
   * @returns {Object} Current configuration
   */
  getConfiguration() {
    return { ...this.config };
  }

  /**
   * Setup automatic health checks
   * @private
   */
  _setupAutoHealthChecks() {
    setInterval(() => {
      if (!this.config.autoHealthChecks) return;
      
      try {
        const features = this._getActiveFeatures();
        features.forEach(featureName => {
          // Get feature object
          const feature = this._getFeatureObject(featureName);
          if (feature && this.validator) {
            this.validator.performHealthCheck(feature);
          }
        });
      } catch (error) {
        this.logger.warn('Auto health check error:', error);
      }
    }, this.config.healthCheckInterval);
    
    this.logger.info(`Auto health checks enabled with ${this.config.healthCheckInterval}ms interval`);
  }

  /**
   * Integrate with existing FeatureManager
   * @private
   */
  _integrateWithFeatureManager() {
    if (window.FeatureManager) {
      // Store original methods
      const originalCheckPage = window.FeatureManager.prototype.checkPage;
      const originalCleanup = window.FeatureManager.prototype.cleanup;
      
      // Enhance checkPage method
      window.FeatureManager.prototype.checkPage = function() {
        // Call original method first
        const result = originalCheckPage.call(this);
        
        // Add validation manager integration
        if (window.featureValidationManager) {
          // This would integrate with feature loading process
          // Implementation depends on FeatureManager's internal structure
        }
        
        return result;
      };
      
      // Enhance cleanup method
      window.FeatureManager.prototype.cleanup = function() {
        // Call validation manager cleanup first
        if (window.featureValidationManager) {
          // Implementation for cleanup validation
        }
        
        // Call original cleanup
        return originalCleanup.call(this);
      };
      
      this.logger.info('Integrated with FeatureManager');
    }
  }

  /**
   * Get list of known features
   * @private
   */
  _getKnownFeatures() {
    const features = new Set();
    
    // Get from FeatureManager if available
    if (window.FeatureManager && window.FeatureManager.features) {
      window.FeatureManager.features.forEach(feature => {
        features.add(feature.name);
      });
    }
    
    // Get from validation results
    if (this.validator) {
      this.validator.getAllValidationResults().forEach((result, featureName) => {
        features.add(featureName);
      });
    }
    
    // Get from performance metrics
    if (this.performanceMonitor) {
      this.performanceMonitor.getAllMetrics().forEach(metric => {
        features.add(metric.featureName);
      });
    }
    
    // Get from error tracking
    if (this.errorTracker) {
      this.errorTracker.errors.forEach(error => {
        features.add(error.featureName);
      });
    }
    
    return Array.from(features);
  }

  /**
   * Get active features from FeatureManager
   * @private
   */
  _getActiveFeatures() {
    if (window.FeatureManager && window.FeatureManager.activeFeatures) {
      return Array.from(window.FeatureManager.activeFeatures);
    }
    return [];
  }

  /**
   * Get feature object by name
   * @private
   */
  _getFeatureObject(featureName) {
    if (window.FeatureManager && window.FeatureManager.features) {
      return window.FeatureManager.features.find(feature => feature.name === featureName);
    }
    return null;
  }

  /**
   * Determine overall health from report components
   * @private
   */
  _determineOverallHealth(report) {
    let score = 0;
    let factors = 0;
    
    // Validation health
    if (report.validation) {
      factors++;
      score += report.validation.isHealthy ? 1 : 0;
    }
    
    // Performance health
    if (report.performance) {
      factors++;
      // Consider healthy if no major performance issues
      const hasIssues = report.performance.overallStats.thresholdViolations > 0;
      score += hasIssues ? 0 : 1;
    }
    
    // Error health
    if (report.errors) {
      factors++;
      // Consider healthy if error rate is low
      score += report.errors.errorRate < 1 ? 1 : 0; // Less than 1 error per hour
    }
    
    if (factors === 0) return 'unknown';
    
    const healthRatio = score / factors;
    if (healthRatio >= 0.8) return 'healthy';
    if (healthRatio >= 0.5) return 'warning';
    return 'unhealthy';
  }

  /**
   * Determine system health from global stats
   * @private
   */
  _determineSystemHealth(stats) {
    if (stats.totalFeatures === 0) return 'unknown';
    
    const healthyRatio = stats.healthyFeatures / stats.totalFeatures;
    const errorRatio = stats.featuresWithErrors / stats.totalFeatures;
    
    if (healthyRatio >= 0.9 && errorRatio <= 0.1) return 'excellent';
    if (healthyRatio >= 0.8 && errorRatio <= 0.2) return 'good';
    if (healthyRatio >= 0.6 && errorRatio <= 0.4) return 'warning';
    return 'critical';
  }
}

// Create global instance
window.featureValidationManager = new FeatureValidationManager();

// Make class available globally
window.FeatureValidationManager = FeatureValidationManager;

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FeatureValidationManager;
}
