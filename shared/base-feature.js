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
  }

  /**
   * Initialize the feature
   * This method should be overridden by subclasses
   * @param {Object} match - URL match result from FeatureManager
   * @returns {Promise<void>|void}
   */
  onInit(match) {
    this.log('Feature initialized', { match });
    this.isInitialized = true;
  }

  /**
   * Clean up the feature
   * This method should be overridden by subclasses
   * @returns {Promise<void>|void}
   */
  onCleanup() {
    this.log('Feature cleaned up');
    this.isInitialized = false;
    this.isActive = false;
  }

  /**
   * Activate the feature
   * Called when the feature becomes active on the current page
   * @returns {Promise<void>|void}
   */
  onActivate() {
    this.log('Feature activated');
    this.isActive = true;
  }

  /**
   * Deactivate the feature
   * Called when the feature becomes inactive (page change, etc.)
   * @returns {Promise<void>|void}
   */
  onDeactivate() {
    this.log('Feature deactivated');
    this.isActive = false;
  }

  /**
   * Handle errors that occur during feature operation
   * @param {Error} error - The error that occurred
   * @param {string} context - Context where the error occurred
   */
  onError(error, context = 'unknown') {
    console.error(`[${this.name}] Error in ${context}:`, error);
  }

  /**
   * Log a message if debug logging is enabled
   * @param {string} message - The message to log
   * @param {Object} [data] - Additional data to log
   */
  log(message, data = null) {
    if (this.enableDebugLogging) {
      const logMessage = `[${this.name}] ${message}`;
      if (data) {
        console.log(logMessage, data);
      } else {
        console.log(logMessage);
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
}

// Make BaseFeature available globally for use by feature scripts
window.BaseFeature = BaseFeature;

// Export for potential module usage in the future
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BaseFeature;
}
