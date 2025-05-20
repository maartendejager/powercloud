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
    console.log(`Checking page: ${url}`);
    
    // Clean up features if URL changed
    if (url !== this.lastUrl) {
      this.cleanup();
      this.lastUrl = url;
    }
    
    // Load features that match the current URL
    this.features.forEach(feature => {
      const match = url.match(feature.urlPattern);
      if (match && !this.activeFeatures.has(feature.name)) {
        console.log(`Initializing feature: ${feature.name}`);
        feature.init(match);
        this.activeFeatures.add(feature.name);
      }
    });
  }
  
  /**
   * Clean up active features
   */
  cleanup() {
    this.features.forEach(feature => {
      if (this.activeFeatures.has(feature.name) && feature.cleanup) {
        console.log(`Cleaning up feature: ${feature.name}`);
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
        console.log(`URL changed from ${this.lastUrl} to ${currentUrl}`);
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
        console.log(`URL change detected by interval: ${this.lastUrl} to ${currentUrl}`);
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
    console.log('PowerCloud feature manager initialized');
    return this; // Enable method chaining
  }
}

// Make FeatureManager available globally
window.FeatureManager = FeatureManager;
