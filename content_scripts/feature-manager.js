/**
 * Feature Manager
 * Handles loading and unloading features based on page URL
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
  }
  
  /**
   * Check current page and load appropriate features
   */
  checkPage() {
    const url = window.location.href;
    
    // Clean up features if URL changed
    if (url !== this.lastUrl) {
      this.cleanup();
      this.lastUrl = url;
    }
    
    // First, collect all features that match the current URL
    const matchingFeatures = [];
    this.features.forEach(feature => {
      const match = url.match(feature.urlPattern);
      if (match && !this.activeFeatures.has(feature.name)) {
        matchingFeatures.push({
          feature,
          match,
          specificity: this.calculatePatternSpecificity(feature.urlPattern, url)
        });
      }
    });
    
    // Sort by specificity (higher is more specific)
    matchingFeatures.sort((a, b) => b.specificity - a.specificity);
    
    // Handle feature exclusions and priorities
    const excludedFeatures = new Set();
    matchingFeatures.forEach(({ feature, match }) => {
      // Skip features that have been excluded by more specific features
      if (excludedFeatures.has(feature.name)) {
        return;
      }
      
      // Check if this feature excludes other features
      if (feature.excludes) {
        feature.excludes.forEach(excludedFeature => {
          excludedFeatures.add(excludedFeature);
        });
      }
      
      // Initialize the feature
      feature.init(match);
      this.activeFeatures.add(feature.name);
    });
  }
  
  /**
   * Calculate a specificity score for a pattern match
   * Higher scores mean more specific matches
   * @param {RegExp} pattern - The URL pattern
   * @param {string} url - The URL being matched
   * @returns {number} - The specificity score
   */
  calculatePatternSpecificity(pattern, url) {
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
    this.features.forEach(feature => {
      if (this.activeFeatures.has(feature.name) && feature.cleanup) {
        feature.cleanup();
        this.activeFeatures.delete(feature.name);
      }
    });
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
