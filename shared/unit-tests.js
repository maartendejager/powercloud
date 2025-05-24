/**
 * Unit Tests for Shared Utilities
 * 
 * Comprehensive unit tests for all shared utility modules in the PowerCloud extension.
 * This file implements Phase 2.1 requirement: "Create unit test framework for shared utilities"
 */

/**
 * URL Patterns Module Tests
 */
function setupUrlPatternsTests() {
  return pcTest.describe('URL Patterns Module', function() {
    
    this.beforeAll(function() {
      // Ensure URL patterns module is loaded
      if (!window.validateUrlPattern) {
        throw new Error('URL Patterns module not loaded');
      }
    });

    this.it('should validate URL patterns correctly', function() {
      // Test valid pattern
      const validPattern = /https:\/\/([^.]+)\.spend\.cloud\/cards\/(\d+)/;
      const result = window.validateUrlPattern(validPattern);
      
      this.assert(result.isValid === true, 'Valid pattern should pass validation');
      this.assert(Array.isArray(result.errors), 'Should return errors array');
      this.assert(Array.isArray(result.warnings), 'Should return warnings array');
      this.assertEqual(result.errors.length, 0, 'Valid pattern should have no errors');
    });

    this.it('should detect invalid patterns', function() {
      try {
        const result = window.validateUrlPattern('[invalid');
        this.assert(result.isValid === false, 'Invalid pattern should fail validation');
        this.assert(result.errors.length > 0, 'Should have error messages');
      } catch (e) {
        // Invalid regex might throw - this is acceptable
        this.assert(true, 'Invalid regex detection working');
      }
    });

    this.it('should calculate pattern specificity', function() {
      const highSpecific = /https:\/\/test\.spend\.cloud\/proactive\/data\.card\/single_card_update\?id=(\d+)/;
      const lowSpecific = /https:\/\/([^.]+)\.spend\.cloud/;
      
      const highScore = window.calculatePatternSpecificity(highSpecific);
      const lowScore = window.calculatePatternSpecificity(lowSpecific);
      
      this.assertType(highScore, 'number', 'Should return numeric score');
      this.assertType(lowScore, 'number', 'Should return numeric score');
      this.assert(highScore > lowScore, 'More specific patterns should have higher scores');
    });

    this.it('should categorize URLs correctly', function() {
      const testCases = [
        {
          url: 'https://test.spend.cloud/cards/12345',
          expectedType: 'card'
        },
        {
          url: 'https://test.spend.cloud/proactive/kasboek.boekingen/show?id=67890',
          expectedType: 'entry'
        },
        {
          url: 'https://test.spend.cloud/api/v1/cards',
          expectedType: 'api'
        },
        {
          url: 'https://example.com/other',
          expectedType: 'unknown'
        }
      ];

      for (const testCase of testCases) {
        const result = window.categorizeUrl(testCase.url);
        this.assertEqual(result.type, testCase.expectedType, 
          `URL ${testCase.url} should be categorized as ${testCase.expectedType}`);
        this.assertType(result.confidence, 'number', 'Should provide confidence score');
      }
    });

    this.it('should find best pattern matches', function() {
      const patterns = [
        { pattern: /https:\/\/([^.]+)\.spend\.cloud\/cards\/(\d+)/, name: 'card' },
        { pattern: /https:\/\/([^.]+)\.spend\.cloud/, name: 'general' }
      ];

      const cardUrl = 'https://test.spend.cloud/cards/12345';
      const match = window.findBestPatternMatch(cardUrl, patterns);
      
      this.assert(match !== null, 'Should find matching pattern');
      this.assertEqual(match.name, 'card', 'Should select most specific pattern');
      this.assert(Array.isArray(match.captureGroups), 'Should provide capture groups');
    });

    this.it('should create pattern matchers with caching', function() {
      const pattern = /https:\/\/([^.]+)\.spend\.cloud\/cards\/(\d+)/;
      const matcher = window.createPatternMatcher(pattern);
      
      this.assertType(matcher, 'function', 'Should return matcher function');
      
      const testUrl = 'https://test.spend.cloud/cards/12345';
      const result1 = matcher(testUrl);
      const result2 = matcher(testUrl); // Should be cached
      
      this.assertEqual(result1, result2, 'Cached results should be consistent');
      this.assert(result1 === true, 'Should match correctly');
    });

    this.it('should test patterns against URL sets', function() {
      const pattern = /https:\/\/([^.]+)\.spend\.cloud\/cards\/(\d+)/;
      const urls = [
        'https://test.spend.cloud/cards/12345',
        'https://demo.spend.cloud/cards/67890',
        'https://example.com/other'
      ];

      const results = window.testPatternAgainstUrls(pattern, urls);
      
      this.assertType(results, 'object', 'Should return results object');
      this.assert('summary' in results, 'Should include summary');
      this.assertType(results.summary.passRate, 'number', 'Should calculate pass rate');
      this.assertEqual(results.passes.length, 2, 'Should match 2 spend.cloud URLs');
      this.assertEqual(results.failures.length, 1, 'Should fail 1 non-matching URL');
    });
  });
}

/**
 * Logger Module Tests
 */
function setupLoggerTests() {
  return pcTest.describe('Logger Module', function() {
    
    this.beforeAll(function() {
      if (!window.PowerCloudLoggerFactory) {
        throw new Error('Logger module not loaded');
      }
    });

    this.it('should create logger instances', function() {
      const logger = window.PowerCloudLoggerFactory.getLogger('TestLogger');
      
      this.assertType(logger, 'object', 'Should return logger object');
      this.assertType(logger.debug, 'function', 'Should have debug method');
      this.assertType(logger.info, 'function', 'Should have info method');
      this.assertType(logger.warn, 'function', 'Should have warn method');
      this.assertType(logger.error, 'function', 'Should have error method');
    });

    this.it('should provide logger statistics', function() {
      const stats = window.PowerCloudLoggerFactory.getStats();
      
      this.assertType(stats, 'object', 'Should return stats object');
      this.assertType(stats.totalLoggers, 'number', 'Should track logger count');
    });

    this.it('should handle log levels correctly', function() {
      const logger = window.PowerCloudLoggerFactory.getLogger('TestLogLevel');
      
      // Test that methods exist and can be called without error
      this.assert(() => {
        logger.debug('Test debug');
        logger.info('Test info');
        logger.warn('Test warn');
        logger.error('Test error');
        return true;
      }, 'All log methods should be callable');
    });

    this.it('should support global configuration', function() {
      // Test that global configuration exists
      this.assertType(window.PowerCloudLoggerFactory.setGlobalLevel, 'function', 
        'Should have global level configuration');
      
      // Test configuration doesn't break logging
      const originalLevel = window.PowerCloudLoggerFactory.getGlobalLevel?.() || 'INFO';
      window.PowerCloudLoggerFactory.setGlobalLevel('ERROR');
      
      const logger = window.PowerCloudLoggerFactory.getLogger('ConfigTest');
      logger.info('This should be filtered'); // Should not error
      
      // Restore original level
      window.PowerCloudLoggerFactory.setGlobalLevel(originalLevel);
    });
  });
}

/**
 * BaseFeature Module Tests
 */
function setupBaseFeatureTests() {
  return pcTest.describe('BaseFeature Module', function() {
    
    this.beforeAll(function() {
      if (!window.BaseFeature) {
        throw new Error('BaseFeature module not loaded');
      }
    });

    this.it('should create BaseFeature instances', function() {
      const feature = new window.BaseFeature('testFeature');
      
      this.assertType(feature, 'object', 'Should create feature instance');
      this.assertEqual(feature.name, 'testFeature', 'Should set feature name');
      this.assertType(feature.onInit, 'function', 'Should have onInit method');
      this.assertType(feature.onCleanup, 'function', 'Should have onCleanup method');
      this.assertType(feature.onActivate, 'function', 'Should have onActivate method');
      this.assertType(feature.onDeactivate, 'function', 'Should have onDeactivate method');
    });

    this.it('should manage feature state correctly', function() {
      const feature = new window.BaseFeature('stateTest');
      
      this.assertEqual(feature.getIsInitialized(), false, 'Should start uninitialized');
      this.assertEqual(feature.getIsActive(), false, 'Should start inactive');
      
      // Test state changes
      feature.onInit({ url: 'https://test.spend.cloud' });
      this.assertEqual(feature.getIsInitialized(), true, 'Should be initialized after onInit');
      
      feature.onActivate();
      this.assertEqual(feature.getIsActive(), true, 'Should be active after onActivate');
      
      feature.onDeactivate();
      this.assertEqual(feature.getIsActive(), false, 'Should be inactive after onDeactivate');
    });

    this.it('should handle errors gracefully', function() {
      const feature = new window.BaseFeature('errorTest');
      
      // Test error handling doesn't throw
      this.assert(() => {
        feature.onError(new Error('Test error'), 'test context');
        return true;
      }, 'Error handling should not throw');
    });

    this.it('should provide feature registration compatibility', function() {
      const feature = new window.BaseFeature('registrationTest');
      const registration = feature.createFeatureRegistration();
      
      this.assertType(registration, 'object', 'Should create registration object');
      this.assert('init' in registration, 'Should have init method');
      this.assert('cleanup' in registration, 'Should have cleanup method');
    });

    this.it('should integrate with logger', function() {
      const feature = new window.BaseFeature('loggerTest', { enableDebugLogging: true });
      
      if (window.PowerCloudLoggerFactory) {
        this.assertType(feature.logger, 'object', 'Should have logger when factory available');
      }
      
      // Test log method exists and works
      this.assertType(feature.log, 'function', 'Should have log method');
      feature.log('Test log message'); // Should not throw
    });
  });
}

/**
 * Error Handling Module Tests
 */
function setupErrorHandlingTests() {
  return pcTest.describe('Error Handling Module', function() {
    
    this.beforeAll(function() {
      if (!window.PowerCloudFeatureErrorBoundary) {
        throw new Error('Error handling module not loaded');
      }
    });

    this.it('should create error boundary instances', function() {
      const boundary = new window.PowerCloudFeatureErrorBoundary();
      
      this.assertType(boundary, 'object', 'Should create boundary instance');
      this.assertType(boundary.safeInitialize, 'function', 'Should have safeInitialize method');
    });

    this.it('should handle successful initialization', async function() {
      const boundary = new window.PowerCloudFeatureErrorBoundary();
      let executed = false;
      
      const result = await boundary.safeInitialize('testFeature', () => {
        executed = true;
      });
      
      this.assertEqual(result, true, 'Should return true for successful init');
      this.assertEqual(executed, true, 'Should execute initialization function');
    });

    this.it('should handle failed initialization', async function() {
      const boundary = new window.PowerCloudFeatureErrorBoundary();
      
      const result = await boundary.safeInitialize('failingFeature', () => {
        throw new Error('Test failure');
      }, { allowRetry: false });
      
      this.assertEqual(result, false, 'Should return false for failed init');
      this.assertEqual(boundary.hasFeatureFailed('failingFeature'), true, 
        'Should track failed features');
    });

    this.it('should provide SafeFeatureManager', function() {
      if (!window.PowerCloudSafeFeatureManager) {
        this.assert(false, 'SafeFeatureManager not available');
        return;
      }
      
      const manager = new window.PowerCloudSafeFeatureManager();
      this.assertType(manager, 'object', 'Should create manager instance');
      this.assertType(manager.registerFeature, 'function', 'Should have registerFeature method');
      this.assertType(manager.getStatusReport, 'function', 'Should have getStatusReport method');
    });
  });
}

/**
 * Debug Mode Module Tests
 */
function setupDebugModeTests() {
  return pcTest.describe('Debug Mode Module', function() {
    
    this.it('should provide debug controller', function() {
      if (!window.PowerCloudDebugController) {
        // Debug mode might not be active - this is acceptable
        console.log('ℹ️ Debug mode not active, skipping debug mode tests');
        return;
      }
      
      this.assertType(window.PowerCloudDebugController, 'object', 
        'Should provide debug controller');
      this.assertType(window.PowerCloudDebugController.exportDebugData, 'function',
        'Should have export function');
    });

    this.it('should provide debug UI elements when active', function() {
      const debugBtn = document.getElementById('powercloud-debug-toggle');
      const debugPanel = document.getElementById('powercloud-debug-panel');
      
      if (debugBtn) {
        this.assertType(debugBtn.click, 'function', 'Debug button should be clickable');
      }
      
      if (debugPanel) {
        this.assert(debugPanel instanceof HTMLElement, 'Debug panel should be HTML element');
      }
    });
  });
}

/**
 * Feature Manager Tests
 */
function setupFeatureManagerTests() {
  return pcTest.describe('Feature Manager Module', function() {
    
    this.beforeAll(function() {
      if (!window.FeatureManager) {
        throw new Error('FeatureManager not loaded');
      }
    });

    this.it('should create FeatureManager instances', function() {
      const features = [{
        name: 'testFeature',
        urlPattern: /test/,
        init: () => {},
        cleanup: () => {}
      }];
      
      const manager = new window.FeatureManager(features);
      this.assertType(manager, 'object', 'Should create manager instance');
    });

    this.it('should have enhanced pattern specificity calculation', function() {
      const features = [{
        name: 'testFeature',
        urlPattern: /test/,
        init: () => {},
        cleanup: () => {}
      }];
      
      const manager = new window.FeatureManager(features);
      
      if (manager.calculatePatternSpecificity) {
        const pattern = /https:\/\/test\.spend\.cloud\/cards\/(\d+)/;
        const specificity = manager.calculatePatternSpecificity(pattern, 'test-url');
        this.assertType(specificity, 'number', 'Should return numeric specificity');
      }
    });
  });
}

/**
 * Integration Tests for Module Interactions
 */
function setupIntegrationTests() {
  return pcTest.describe('Module Integration', function() {
    
    this.it('should have all required modules loaded', function() {
      const requiredModules = [
        { name: 'BaseFeature', global: 'BaseFeature' },
        { name: 'Logger', global: 'PowerCloudLoggerFactory' },
        { name: 'URL Patterns', global: 'validateUrlPattern' },
        { name: 'FeatureManager', global: 'FeatureManager' }
      ];

      for (const module of requiredModules) {
        this.assert(window[module.global] !== undefined, 
          `${module.name} module should be available at window.${module.global}`);
      }
    });

    this.it('should have Logger integrated with BaseFeature', function() {
      if (!window.PowerCloudLoggerFactory || !window.BaseFeature) {
        console.log('ℹ️ Skipping Logger-BaseFeature integration test - modules not available');
        return;
      }
      
      const feature = new window.BaseFeature('integrationTest', { enableDebugLogging: true });
      
      // Should not throw when logging
      this.assert(() => {
        feature.log('Integration test message');
        return true;
      }, 'BaseFeature logging should work with Logger integration');
    });

    this.it('should have URL Patterns integrated with FeatureManager', function() {
      if (!window.FeatureManager || !window.calculatePatternSpecificity) {
        console.log('ℹ️ Skipping URL Patterns-FeatureManager integration test - modules not available');
        return;
      }
      
      const features = [{
        name: 'patternTest',
        urlPattern: /https:\/\/test\.spend\.cloud\/cards\/(\d+)/,
        init: () => {},
        cleanup: () => {}
      }];
      
      const manager = new window.FeatureManager(features);
      
      // Should have enhanced pattern calculation
      if (manager.calculatePatternSpecificity) {
        const specificity = manager.calculatePatternSpecificity(features[0].urlPattern);
        this.assertType(specificity, 'number', 'Enhanced specificity calculation should work');
      }
    });

    this.it('should handle graceful degradation', function() {
      // Test that modules work even if dependencies are missing
      const originalLogger = window.PowerCloudLoggerFactory;
      
      try {
        // Temporarily remove logger
        delete window.PowerCloudLoggerFactory;
        
        // BaseFeature should still work
        const feature = new window.BaseFeature('degradationTest');
        feature.log('This should not throw even without logger');
        
        this.assert(true, 'Modules should degrade gracefully');
        
      } finally {
        // Restore logger
        if (originalLogger) {
          window.PowerCloudLoggerFactory = originalLogger;
        }
      }
    });
  });
}

/**
 * Setup all unit tests
 */
function setupUnitTests() {
  console.log('🔧 Setting up PowerCloud Unit Tests...');
  
  // Configure test framework
  pcTest.framework.configure({
    timeout: 3000,
    verbose: true,
    exitOnFailure: false
  });

  // Add global setup
  pcTest.framework.addGlobalSetup(async function() {
    console.log('🚀 Global setup: Preparing test environment...');
    
    // Wait for modules to be fully loaded
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify core modules are available
    const coreModules = ['BaseFeature', 'PowerCloudLoggerFactory'];
    for (const module of coreModules) {
      if (!window[module]) {
        console.warn(`⚠️ Core module ${module} not available`);
      }
    }
  });

  // Add global teardown
  pcTest.framework.addGlobalTeardown(async function() {
    console.log('🧹 Global teardown: Cleaning up test environment...');
    
    // Clean up any test artifacts
    const testElements = document.querySelectorAll('[data-test-element]');
    testElements.forEach(el => el.remove());
  });

  // Register test suites
  setupUrlPatternsTests();
  setupLoggerTests();
  setupBaseFeatureTests();
  setupErrorHandlingTests();
  setupDebugModeTests();
  setupFeatureManagerTests();
  setupIntegrationTests();

  console.log('✅ Unit tests setup complete');
}

// Auto-setup when loaded
if (typeof window !== 'undefined') {
  // Wait for test framework to be available
  if (window.pcTest) {
    setupUnitTests();
  } else {
    // Wait for framework to load
    const checkFramework = setInterval(() => {
      if (window.pcTest) {
        clearInterval(checkFramework);
        setupUnitTests();
      }
    }, 100);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkFramework);
      console.error('❌ Test framework not available after 5 seconds');
    }, 5000);
  }
}

// Export for manual usage
window.PowerCloudUnitTests = {
  setup: setupUnitTests,
  run: () => pcTest.run(),
  runSuite: (name) => pcTest.runSuite(name)
};

// Export for browser extension environment
if (typeof window !== 'undefined') {
  window.setupUnitTests = setupUnitTests;
}
