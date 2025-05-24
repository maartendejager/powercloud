/**
 * Feature Manager
 * Handles loading and unloading features based on page URL
 * Enhanced in Phase 1.3 with improved pattern specificity calculation
 */
class FeatureManager {
  /**
   * Create a new FeatureManager instance
   * @param {Array} features - Array of feature objects with name, urlPattern, init, and cleanup properties
   */
  constructor(features) {
    this.features = features;
    this.activeFeatures = new Set();
    this.lastUrl = window.location.href;
    this.featurePerformance = new Map();
    
    // Initialize logger if available (Phase 1.2 integration)
    this.logger = window.loggerFactory?.createLogger('FeatureManager') || {
      debug: (...args) => console.log('[DEBUG][FeatureManager]', ...args),
      info: (...args) => console.log('[INFO][FeatureManager]', ...args),
      warn: (...args) => console.warn('[WARN][FeatureManager]', ...args),
      error: (...args) => console.error('[ERROR][FeatureManager]', ...args)
    };
    
    // Initialize enhanced debugging if available
    this.enhancedDebug = window.enhancedDebug || null;
    if (this.enhancedDebug) {
      this.enhancedDebug.log('FeatureManager initialized', { featureCount: features.length });
    }
  }
  
  /**
   * Check current page and load appropriate features
   */
  checkPage() {
    const url = window.location.href;
    this.logger.debug(`Checking page: ${url}`);
    
    // Clean up features if URL changed
    if (url !== this.lastUrl) {
      this.logger.debug(`URL changed from ${this.lastUrl} to ${url}`);
      this.cleanup();
      this.lastUrl = url;
    }
    
    // First, collect all features that match the current URL
    const matchingFeatures = [];
    this.features.forEach(feature => {
      const match = url.match(feature.urlPattern);
      if (match && !this.activeFeatures.has(feature.name)) {
        const specificity = this.calculatePatternSpecificity(feature.urlPattern, url);
        matchingFeatures.push({
          feature,
          match,
          specificity
        });
        this.logger.debug(`Feature ${feature.name} matches with specificity ${specificity}`);
      }
    });
    
    // Sort by specificity (higher is more specific)
    matchingFeatures.sort((a, b) => b.specificity - a.specificity);
    this.logger.debug(`Found ${matchingFeatures.length} matching features (sorted by specificity)`);
    
    // Handle feature exclusions and priorities
    const excludedFeatures = new Set();
    matchingFeatures.forEach(({ feature, match, specificity }) => {
      // Skip features that have been excluded by more specific features
      if (excludedFeatures.has(feature.name)) {
        this.logger.debug(`Skipping excluded feature: ${feature.name}`);
        return;
      }
      
      // Check if this feature excludes other features
      if (feature.excludes) {
        feature.excludes.forEach(excludedFeature => {
          excludedFeatures.add(excludedFeature);
          this.logger.debug(`Feature ${feature.name} excludes ${excludedFeature}`);
        });
      }
      
      // Initialize the feature
      try {
        this.logger.info(`Initializing feature: ${feature.name}`);
        
        // Track initialization performance
        const startTime = performance.now();
        if (this.enhancedDebug) {
          this.enhancedDebug.performanceTracker.startTiming(`feature-init-${feature.name}`);
          this.enhancedDebug.usageTracker.trackUsage(feature.name, 'initialization-start');
        }
        
        feature.init(match);
        this.activeFeatures.add(feature.name);
        
        // Record performance metrics
        const initTime = performance.now() - startTime;
        this.featurePerformance.set(feature.name, {
          initTime,
          lastInit: Date.now(),
          errorCount: 0
        });
        
        if (this.enhancedDebug) {
          const duration = this.enhancedDebug.performanceTracker.endTiming(`feature-init-${feature.name}`);
          this.enhancedDebug.usageTracker.trackUsage(feature.name, 'initialization-complete', { 
            duration 
          });
          
          // Report to background for health monitoring
          this.reportFeatureHealth(feature.name, true, { initTime });
        }
        
        this.logger.info(`Successfully initialized feature: ${feature.name} (${Math.round(initTime)}ms)`);
      } catch (error) {
        this.logger.error(`Failed to initialize feature ${feature.name}:`, error);
        
        // Track error in performance metrics
        const perfData = this.featurePerformance.get(feature.name) || { errorCount: 0 };
        perfData.errorCount++;
        this.featurePerformance.set(feature.name, perfData);
        
        if (this.enhancedDebug) {
          this.enhancedDebug.reportError(error, {
            feature: feature.name,
            action: 'initialization',
            url: window.location.href
          });
          
          this.enhancedDebug.usageTracker.trackUsage(feature.name, 'initialization-error', { 
            error: true 
          });
          
          // Report error to background
          this.reportFeatureHealth(feature.name, false, { error: error.message });
        }
      }
    });
  }
  
  /**
   * Calculate a specificity score for a pattern match
   * Enhanced in Phase 1.3 to use shared URL pattern utilities
   * @param {RegExp} pattern - The URL pattern
   * @param {string} url - The URL being matched
   * @returns {number} - The specificity score
   */
  calculatePatternSpecificity(pattern, url) {
    // Use the enhanced calculation from url-patterns.js if available
    if (typeof window.calculatePatternSpecificity === 'function') {
      return window.calculatePatternSpecificity(pattern, url);
    }
    
    // Fallback to original implementation
    const patternStr = pattern.toString();
    let score = 0;
    
    // More segments/parts = more specific
    score += (patternStr.match(/\//g) || []).length;
    
    // Query parameters make a pattern more specific
    if (patternStr.includes('\\?')) {
      score += 10;
    }
    
    // Exact matches (less wildcards) are more specific
    score -= (patternStr.match(/\.\*/g) || []).length * 2;
    score -= (patternStr.match(/[^\\]\+/g) || []).length;
    
    // The longer the pattern, generally the more specific it is
    score += patternStr.length / 20;
    
    return score;
  }
  
  /**
   * Clean up active features
   */
  cleanup() {
    this.logger.debug(`Cleaning up ${this.activeFeatures.size} active features`);
    this.features.forEach(feature => {
      if (this.activeFeatures.has(feature.name) && feature.cleanup) {
        try {
          this.logger.debug(`Cleaning up feature: ${feature.name}`);
          
          // Track cleanup performance
          const startTime = performance.now();
          if (this.enhancedDebug) {
            this.enhancedDebug.performanceTracker.startTiming(`feature-cleanup-${feature.name}`);
            this.enhancedDebug.usageTracker.trackUsage(feature.name, 'cleanup-start');
          }
          
          feature.cleanup();
          this.activeFeatures.delete(feature.name);
          
          // Record cleanup performance
          const cleanupTime = performance.now() - startTime;
          const perfData = this.featurePerformance.get(feature.name) || {};
          perfData.cleanupTime = cleanupTime;
          this.featurePerformance.set(feature.name, perfData);
          
          if (this.enhancedDebug) {
            const duration = this.enhancedDebug.performanceTracker.endTiming(`feature-cleanup-${feature.name}`);
            this.enhancedDebug.usageTracker.trackUsage(feature.name, 'cleanup-complete', { 
              duration 
            });
          }
          
          this.logger.debug(`Successfully cleaned up feature: ${feature.name} (${Math.round(cleanupTime)}ms)`);
        } catch (error) {
          this.logger.error(`Failed to cleanup feature ${feature.name}:`, error);
          
          if (this.enhancedDebug) {
            this.enhancedDebug.reportError(error, {
              feature: feature.name,
              action: 'cleanup',
              url: window.location.href
            });
            
            this.enhancedDebug.usageTracker.trackUsage(feature.name, 'cleanup-error', { 
              error: true 
            });
          }
          
          // Still remove from active features even if cleanup failed
          this.activeFeatures.delete(feature.name);
        }
      }
    });
  }

  /**
   * Report feature health status to background for monitoring
   * @param {string} featureName - Name of the feature
   * @param {boolean} isHealthy - Whether the feature is healthy
   * @param {Object} additionalData - Additional health data
   */
  reportFeatureHealth(featureName, isHealthy, additionalData = {}) {
    try {
      const healthData = {
        name: featureName,
        isHealthy,
        isActive: this.activeFeatures.has(featureName),
        url: window.location.href,
        timestamp: Date.now(),
        performance: this.featurePerformance.get(featureName) || {},
        ...additionalData
      };
      
      // Send to background for health monitoring
      chrome.runtime.sendMessage({
        action: 'updateFeatureHealth',
        feature: featureName,
        health: healthData
      }).catch(error => {
        // Ignore messaging errors as they're not critical
        this.logger.debug('Could not report feature health to background:', error);
      });
    } catch (error) {
      this.logger.debug('Error reporting feature health:', error);
    }
  }
  
  /**
   * Get current health status of all features
   * @returns {Object} Health status object
   */
  getHealthStatus() {
    const status = {
      activeFeatures: Array.from(this.activeFeatures),
      featureCount: this.activeFeatures.size,
      performance: Object.fromEntries(this.featurePerformance),
      url: window.location.href,
      timestamp: Date.now()
    };
    
    // Add enhanced debug health if available
    if (this.enhancedDebug) {
      status.debugHealth = this.enhancedDebug.getHealthInfo();
    }
    
    return status;
  }

  /**
   * Set up URL change detection
   */
  setupUrlChangeDetection() {
    // Use MutationObserver for SPA detection
    const urlChangeObserver = new MutationObserver(() => {
      const currentUrl = window.location.href;
      if (this.lastUrl !== currentUrl) {
        this.checkPage();
      }
    });
    
    // Observe the entire document for changes
    urlChangeObserver.observe(document, { 
      subtree: true, 
      childList: true,
      attributes: true, 
      characterData: false 
    });
    
    // Additional fallback check for SPAs that don't trigger DOM mutations
    setInterval(() => {
      const currentUrl = window.location.href;
      if (this.lastUrl !== currentUrl) {
        this.checkPage();
      }
    }, 1000);
  }
  
  /**
   * Initialize the feature manager
   */
  init() {
    this.checkPage();
    this.setupUrlChangeDetection();
    return this; // Enable method chaining
  }
}

// Make FeatureManager available globally
window.FeatureManager = FeatureManager;
