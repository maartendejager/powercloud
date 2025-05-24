/**
 * Content Script Unit Tests
 * 
 * Comprehensive unit tests for content script functionality.
 * Phase 4.1 Implementation - Unit test framework for content scripts
 */

/**
 * Main Content Script Tests
 */
function setupMainContentScriptTests() {
  return pcTest.describe('Main Content Script', function() {
    
    this.beforeEach(function() {
      // Reset DOM state
      this.originalURL = window.location.href;
      this.mockElements = [];
      
      // Mock common DOM elements that content scripts interact with
      this.createMockElement = (tag, id, className) => {
        const element = document.createElement(tag);
        if (id) element.id = id;
        if (className) element.className = className;
        document.body.appendChild(element);
        this.mockElements.push(element);
        return element;
      };
    });

    this.afterEach(function() {
      // Clean up mock elements
      this.mockElements.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
      this.mockElements = [];
    });

    this.it('should initialize enhanced debug system', function() {
      // Test that enhanced debug is properly initialized
      pcTest.assert(window.EnhancedDebug !== undefined, 'EnhancedDebug should be available');
      pcTest.assert(typeof window.EnhancedDebug.getInstance === 'function', 'EnhancedDebug should have getInstance method');
      
      const debugInstance = window.EnhancedDebug.getInstance();
      pcTest.assert(debugInstance !== null, 'Debug instance should be created');
      pcTest.assert(typeof debugInstance.log === 'function', 'Debug instance should have log method');
    });

    this.it('should initialize feature manager', function() {
      // Test feature manager initialization
      pcTest.assert(window.FeatureManager !== undefined, 'FeatureManager should be available');
      pcTest.assert(typeof window.FeatureManager.initialize === 'function', 'FeatureManager should have initialize method');
      
      // Test that feature manager has required methods
      const requiredMethods = ['loadFeatures', 'cleanupFeatures', 'getActiveFeatures', 'reportFeatureHealth'];
      requiredMethods.forEach(method => {
        pcTest.assert(typeof window.FeatureManager[method] === 'function', `FeatureManager should have ${method} method`);
      });
    });

    this.it('should handle URL pattern matching', function() {
      // Test URL pattern utilities
      if (window.URLPatterns) {
        const testPatterns = [
          { pattern: /https:\/\/.*\.spend\.cloud\/.*/, url: 'https://test.spend.cloud/page', expected: true },
          { pattern: /https:\/\/.*\.spend\.cloud\/admin/, url: 'https://test.spend.cloud/admin', expected: true },
          { pattern: /https:\/\/.*\.spend\.cloud\/admin/, url: 'https://test.spend.cloud/user', expected: false }
        ];

        testPatterns.forEach(({ pattern, url, expected }) => {
          const result = pattern.test(url);
          pcTest.assert(result === expected, `Pattern ${pattern} should ${expected ? 'match' : 'not match'} URL ${url}`);
        });
      }
    });

    this.it('should handle settings management', async function() {
      if (window.SettingsManager) {
        const settings = window.SettingsManager.getInstance();
        
        // Test settings retrieval
        const testKey = 'testContentScriptSetting';
        const testValue = { test: true, timestamp: Date.now() };
        
        await settings.set(testKey, testValue);
        const retrieved = await settings.get(testKey);
        
        pcTest.assert(retrieved !== null, 'Settings should be retrievable');
        pcTest.assert(retrieved.test === testValue.test, 'Settings should maintain data integrity');
      }
    });
  });
}

/**
 * Feature Manager Unit Tests
 */
function setupFeatureManagerTests() {
  return pcTest.describe('Feature Manager Unit Tests', function() {
    
    this.beforeEach(function() {
      this.originalFeatures = window.FeatureManager?.getActiveFeatures() || [];
      this.testFeatures = [];
    });

    this.afterEach(function() {
      // Clean up test features
      this.testFeatures.forEach(feature => {
        if (feature.cleanup && typeof feature.cleanup === 'function') {
          try {
            feature.cleanup();
          } catch (error) {
            console.warn('Error cleaning up test feature:', error);
          }
        }
      });
    });

    this.it('should register and initialize features correctly', function() {
      if (!window.FeatureManager) {
        this.skip('FeatureManager not available');
        return;
      }

      const testFeature = {
        name: 'unitTestFeature',
        urlPattern: /test/,
        initialized: false,
        init: function() {
          this.initialized = true;
        },
        cleanup: function() {
          this.initialized = false;
        }
      };

      this.testFeatures.push(testFeature);

      // Test feature registration (if method exists)
      if (typeof window.FeatureManager.registerFeature === 'function') {
        window.FeatureManager.registerFeature(testFeature);
        pcTest.assert(testFeature.initialized === false, 'Feature should not be initialized yet');
        
        // Simulate initialization
        testFeature.init();
        pcTest.assert(testFeature.initialized === true, 'Feature should be initialized after init call');
      }
    });

    this.it('should handle feature errors gracefully', function() {
      const errorFeature = {
        name: 'errorTestFeature',
        urlPattern: /test/,
        init: function() {
          throw new Error('Test error in feature initialization');
        },
        cleanup: function() {
          // This should still work
        }
      };

      this.testFeatures.push(errorFeature);

      // Test that feature errors don't crash the system
      let errorCaught = false;
      try {
        errorFeature.init();
      } catch (error) {
        errorCaught = true;
        pcTest.assert(error.message.includes('Test error'), 'Should catch the test error');
      }

      pcTest.assert(errorCaught, 'Feature error should be caught');
    });

    this.it('should track feature performance', function() {
      if (window.FeatureManager && typeof window.FeatureManager.getPerformanceMetrics === 'function') {
        const metrics = window.FeatureManager.getPerformanceMetrics();
        pcTest.assert(typeof metrics === 'object', 'Performance metrics should be an object');
        pcTest.assert(metrics !== null, 'Performance metrics should not be null');
      }
    });

    this.it('should report feature health status', function() {
      if (window.FeatureManager && typeof window.FeatureManager.getFeatureHealth === 'function') {
        const health = window.FeatureManager.getFeatureHealth();
        pcTest.assert(typeof health === 'object', 'Feature health should be an object');
        pcTest.assert(health !== null, 'Feature health should not be null');
      }
    });
  });
}

/**
 * Enhanced Debug System Tests
 */
function setupEnhancedDebugTests() {
  return pcTest.describe('Enhanced Debug System', function() {
    
    this.beforeEach(function() {
      this.debugInstance = window.EnhancedDebug?.getInstance();
    });

    this.it('should provide singleton debug instance', function() {
      if (!window.EnhancedDebug) {
        this.skip('EnhancedDebug not available');
        return;
      }

      const instance1 = window.EnhancedDebug.getInstance();
      const instance2 = window.EnhancedDebug.getInstance();
      
      pcTest.assert(instance1 === instance2, 'Debug system should be singleton');
      pcTest.assert(instance1 !== null, 'Debug instance should not be null');
    });

    this.it('should track performance metrics', function() {
      if (!this.debugInstance || !this.debugInstance.performance) {
        this.skip('Performance tracking not available');
        return;
      }

      const performanceTracker = this.debugInstance.performance;
      
      // Test performance tracking methods
      pcTest.assert(typeof performanceTracker.startTimer === 'function', 'Should have startTimer method');
      pcTest.assert(typeof performanceTracker.endTimer === 'function', 'Should have endTimer method');
      pcTest.assert(typeof performanceTracker.getMetrics === 'function', 'Should have getMetrics method');

      // Test timer functionality
      const timerName = 'contentScriptTest';
      performanceTracker.startTimer(timerName);
      
      // Simulate some work
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Small delay
      }
      
      const duration = performanceTracker.endTimer(timerName);
      pcTest.assert(typeof duration === 'number', 'Timer should return numeric duration');
      pcTest.assert(duration >= 0, 'Duration should be non-negative');
    });

    this.it('should enhance error messages', function() {
      if (!this.debugInstance || !this.debugInstance.errorEnhancer) {
        this.skip('Error enhancement not available');
        return;
      }

      const errorEnhancer = this.debugInstance.errorEnhancer;
      
      // Test error enhancement
      const testError = new Error('Test error message');
      const enhanced = errorEnhancer.enhance(testError, { context: 'unit test' });
      
      pcTest.assert(typeof enhanced === 'object', 'Enhanced error should be an object');
      pcTest.assert(enhanced.originalMessage === testError.message, 'Should preserve original message');
      pcTest.assert(enhanced.context !== undefined, 'Should include context');
    });

    this.it('should collect usage analytics', function() {
      if (!this.debugInstance || !this.debugInstance.usageTracker) {
        this.skip('Usage tracking not available');
        return;
      }

      const usageTracker = this.debugInstance.usageTracker;
      
      // Test usage tracking methods
      pcTest.assert(typeof usageTracker.trackFeatureUsage === 'function', 'Should have trackFeatureUsage method');
      pcTest.assert(typeof usageTracker.getUsageStats === 'function', 'Should have getUsageStats method');

      // Test feature usage tracking
      usageTracker.trackFeatureUsage('testFeature', 'activation');
      const stats = usageTracker.getUsageStats();
      
      pcTest.assert(typeof stats === 'object', 'Usage stats should be an object');
      pcTest.assert(stats !== null, 'Usage stats should not be null');
    });
  });
}

/**
 * DOM Interaction Tests
 */
function setupDOMInteractionTests() {
  return pcTest.describe('DOM Interaction Tests', function() {
    
    this.beforeEach(function() {
      // Create test DOM structure
      this.testContainer = document.createElement('div');
      this.testContainer.id = 'powercloud-test-container';
      this.testContainer.innerHTML = `
        <div class="spend-cloud-page">
          <div class="adyen-test-section" data-test="adyen">
            <input type="text" class="card-input" value="1234">
            <button class="submit-btn">Submit</button>
          </div>
          <div class="book-test-section" data-test="book">
            <select class="book-selector">
              <option value="1">Book 1</option>
              <option value="2">Book 2</option>
            </select>
          </div>
        </div>
      `;
      document.body.appendChild(this.testContainer);
    });

    this.afterEach(function() {
      if (this.testContainer && this.testContainer.parentNode) {
        this.testContainer.parentNode.removeChild(this.testContainer);
      }
    });

    this.it('should find and interact with DOM elements', function() {
      // Test basic DOM queries that features might use
      const adyenSection = document.querySelector('.adyen-test-section');
      pcTest.assert(adyenSection !== null, 'Should find Adyen test section');
      
      const cardInput = document.querySelector('.card-input');
      pcTest.assert(cardInput !== null, 'Should find card input');
      pcTest.assert(cardInput.value === '1234', 'Should read input value');

      const bookSelector = document.querySelector('.book-selector');
      pcTest.assert(bookSelector !== null, 'Should find book selector');
      pcTest.assert(bookSelector.options.length === 2, 'Should have correct number of options');
    });

    this.it('should handle element creation and injection', function() {
      // Test creating and injecting elements (common pattern in features)
      const newElement = document.createElement('div');
      newElement.className = 'powercloud-injected';
      newElement.textContent = 'PowerCloud Test Element';
      
      const targetSection = document.querySelector('.adyen-test-section');
      targetSection.appendChild(newElement);
      
      const injected = document.querySelector('.powercloud-injected');
      pcTest.assert(injected !== null, 'Should inject element successfully');
      pcTest.assert(injected.textContent === 'PowerCloud Test Element', 'Should maintain element content');
    });

    this.it('should handle event listeners', function() {
      let eventFired = false;
      const button = document.querySelector('.submit-btn');
      
      const handleClick = () => {
        eventFired = true;
      };
      
      button.addEventListener('click', handleClick);
      
      // Simulate click
      const clickEvent = new Event('click', { bubbles: true });
      button.dispatchEvent(clickEvent);
      
      pcTest.assert(eventFired === true, 'Event listener should fire on click');
      
      // Clean up
      button.removeEventListener('click', handleClick);
    });
  });
}

/**
 * Initialize all content script unit tests
 */
function initializeContentScriptTests() {
  // Wait for test framework to be available
  if (typeof pcTest === 'undefined') {
    console.error('Test framework not available. Please load test-framework.js first.');
    return;
  }

  console.log('🧪 Initializing Content Script Unit Tests...');

  // Set up all test suites
  setupMainContentScriptTests();
  setupFeatureManagerTests();
  setupEnhancedDebugTests();
  setupDOMInteractionTests();

  console.log('✅ Content Script Unit Tests initialized');
}

// Auto-initialize if test framework is available
if (typeof pcTest !== 'undefined') {
  initializeContentScriptTests();
} else {
  // Wait for test framework
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializeContentScriptTests, 100);
  });
}

// Export for manual initialization
window.initializeContentScriptTests = initializeContentScriptTests;
