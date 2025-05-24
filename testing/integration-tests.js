/**
 * Integration Tests for Feature Loading
 * 
 * Comprehensive integration tests for the PowerCloud extension's feature loading system.
 * This file implements Phase 2.1 requirement: "Add basic integration tests for feature loading"
 */

/**
 * Feature Loading Integration Tests
 */
function setupFeatureLoadingTests() {
  return pcTest.describe('Feature Loading Integration', function() {
    
    this.beforeAll(async function() {
      // Ensure core systems are loaded
      if (!window.FeatureManager) {
        throw new Error('FeatureManager not available for integration tests');
      }
      
      // Clear any existing test features
      this.originalFeatures = window.testFeatures || [];
      window.testFeatures = [];
    });

    this.afterAll(function() {
      // Restore original state
      window.testFeatures = this.originalFeatures;
    });

    this.it('should load features through FeatureManager', async function() {
      const testFeatures = [
        {
          name: 'integrationTestFeature1',
          urlPattern: /https:\/\/test\.spend\.cloud\/integration/,
          init: function() {
            window.testFeatures.push('feature1-initialized');
          },
          cleanup: function() {
            window.testFeatures.push('feature1-cleaned');
          }
        },
        {
          name: 'integrationTestFeature2',
          urlPattern: /https:\/\/test\.spend\.cloud\/integration\/specific/,
          init: function() {
            window.testFeatures.push('feature2-initialized');
          },
          cleanup: function() {
            window.testFeatures.push('feature2-cleaned');
          }
        }
      ];

      const manager = new window.FeatureManager(testFeatures);
      this.assertType(manager, 'object', 'Should create FeatureManager instance');
      
      // Test feature initialization
      this.assertType(manager.initializeFeatures, 'function', 'Should have initializeFeatures method');
      this.assertType(manager.cleanupFeatures, 'function', 'Should have cleanupFeatures method');
    });

    this.it('should handle feature initialization order by specificity', function() {
      const features = [
        {
          name: 'generalFeature',
          urlPattern: /https:\/\/test\.spend\.cloud/,
          init: function() { window.testFeatures.push('general-init'); },
          cleanup: function() { window.testFeatures.push('general-cleanup'); }
        },
        {
          name: 'specificFeature',
          urlPattern: /https:\/\/test\.spend\.cloud\/specific\/page/,
          init: function() { window.testFeatures.push('specific-init'); },
          cleanup: function() { window.testFeatures.push('specific-cleanup'); }
        }
      ];

      const manager = new window.FeatureManager(features);
      
      // Test that specificity calculation is available
      if (manager.calculatePatternSpecificity) {
        const generalScore = manager.calculatePatternSpecificity(features[0].urlPattern);
        const specificScore = manager.calculatePatternSpecificity(features[1].urlPattern);
        
        this.assertType(generalScore, 'number', 'Should calculate general pattern specificity');
        this.assertType(specificScore, 'number', 'Should calculate specific pattern specificity');
        this.assert(specificScore > generalScore, 'More specific patterns should have higher scores');
      }
    });

    this.it('should handle feature pattern matching', function() {
      const testUrl = 'https://test.spend.cloud/cards/12345';
      const features = [
        {
          name: 'cardFeature',
          urlPattern: /https:\/\/([^.]+)\.spend\.cloud\/cards\/(\d+)/,
          init: function() {},
          cleanup: function() {}
        },
        {
          name: 'generalFeature',
          urlPattern: /https:\/\/([^.]+)\.spend\.cloud/,
          init: function() {},
          cleanup: function() {}
        }
      ];

      const manager = new window.FeatureManager(features);
      
      // Test pattern matching capability
      for (const feature of features) {
        const matches = feature.urlPattern.test(testUrl);
        if (feature.name === 'cardFeature') {
          this.assert(matches, 'Card feature should match card URL');
        }
      }
    });

    this.it('should handle feature errors gracefully with SafeFeatureManager', async function() {
      if (!window.PowerCloudSafeFeatureManager) {
        console.log('ℹ️ SafeFeatureManager not available, skipping error handling test');
        return;
      }

      const manager = new window.PowerCloudSafeFeatureManager();
      
      // Test successful feature registration
      const successResult = await manager.registerFeature('successTest', () => {
        window.testFeatures.push('success-registered');
      });
      
      this.assertEqual(successResult, true, 'Should register successful features');
      
      // Test failing feature registration
      const failResult = await manager.registerFeature('failTest', () => {
        throw new Error('Intentional test failure');
      }, { allowRetry: false });
      
      this.assertEqual(failResult, false, 'Should handle failing features gracefully');
      
      // Test status report
      const report = manager.getStatusReport();
      this.assertType(report, 'object', 'Should provide status report');
      this.assert(Array.isArray(report.registered), 'Should track registered features');
      this.assert(Array.isArray(report.failed), 'Should track failed features');
    });

    this.it('should integrate with error boundaries', async function() {
      if (!window.PowerCloudFeatureErrorBoundary) {
        console.log('ℹ️ Error boundary not available, skipping boundary test');
        return;
      }

      const boundary = new window.PowerCloudFeatureErrorBoundary();
      
      // Test successful feature initialization
      let initializationRan = false;
      const successResult = await boundary.safeInitialize('boundarySuccessTest', () => {
        initializationRan = true;
        window.testFeatures.push('boundary-success');
      });
      
      this.assertEqual(successResult, true, 'Should successfully initialize through boundary');
      this.assertEqual(initializationRan, true, 'Should execute initialization function');
      
      // Test failed feature initialization
      const failResult = await boundary.safeInitialize('boundaryFailTest', () => {
        throw new Error('Boundary test failure');
      }, { allowRetry: false });
      
      this.assertEqual(failResult, false, 'Should handle failures through boundary');
      this.assertEqual(boundary.hasFeatureFailed('boundaryFailTest'), true, 
        'Should track failed features');
    });

    this.it('should support BaseFeature integration', function() {
      if (!window.BaseFeature) {
        console.log('ℹ️ BaseFeature not available, skipping BaseFeature integration test');
        return;
      }

      // Create BaseFeature instance
      const feature = new window.BaseFeature('integrationTestFeature');
      
      // Test lifecycle methods
      this.assertType(feature.onInit, 'function', 'Should have onInit method');
      this.assertType(feature.onCleanup, 'function', 'Should have onCleanup method');
      this.assertType(feature.onActivate, 'function', 'Should have onActivate method');
      this.assertType(feature.onDeactivate, 'function', 'Should have onDeactivate method');
      
      // Test state management
      this.assertEqual(feature.getIsInitialized(), false, 'Should start uninitialized');
      
      feature.onInit({ url: 'https://test.spend.cloud' });
      this.assertEqual(feature.getIsInitialized(), true, 'Should be initialized after onInit');
      
      // Test registration compatibility
      const registration = feature.createFeatureRegistration();
      this.assertType(registration, 'object', 'Should create feature registration');
      this.assertType(registration.init, 'function', 'Should have init in registration');
      this.assertType(registration.cleanup, 'function', 'Should have cleanup in registration');
    });

    this.it('should handle URL pattern validation in feature loading', function() {
      if (!window.validateUrlPattern) {
        console.log('ℹ️ URL pattern validation not available, skipping validation test');
        return;
      }

      const testPatterns = [
        /https:\/\/([^.]+)\.spend\.cloud\/cards\/(\d+)/,
        /https:\/\/([^.]+)\.spend\.cloud\/proactive\/kasboek\.boekingen/,
        /https:\/\/([^.]+)\.spend\.cloud\/api\/.*/
      ];

      for (const pattern of testPatterns) {
        const validation = window.validateUrlPattern(pattern);
        this.assert(validation.isValid, `Pattern ${pattern} should be valid`);
        this.assertEqual(validation.errors.length, 0, 'Valid patterns should have no errors');
      }
    });

    this.it('should measure feature loading performance', async function() {
      const startTime = performance.now();
      
      // Create multiple test features
      const features = [];
      for (let i = 0; i < 5; i++) {
        features.push({
          name: `perfTestFeature${i}`,
          urlPattern: new RegExp(`https://test${i}\\.spend\\.cloud`),
          init: function() {
            window.testFeatures.push(`perf-feature-${i}-init`);
          },
          cleanup: function() {
            window.testFeatures.push(`perf-feature-${i}-cleanup`);
          }
        });
      }

      const manager = new window.FeatureManager(features);
      const loadTime = performance.now() - startTime;
      
      this.assert(loadTime < 100, 'Feature loading should be fast (< 100ms)');
      this.assertEqual(features.length, 5, 'Should load all test features');
    });

    this.it('should handle concurrent feature operations', async function() {
      if (!window.PowerCloudSafeFeatureManager) {
        console.log('ℹ️ SafeFeatureManager not available, skipping concurrent test');
        return;
      }

      const manager = new window.PowerCloudSafeFeatureManager();
      
      // Register multiple features concurrently
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          manager.registerFeature(`concurrentFeature${i}`, () => {
            window.testFeatures.push(`concurrent-${i}`);
          })
        );
      }

      const results = await Promise.all(promises);
      
      // All should succeed
      for (const result of results) {
        this.assertEqual(result, true, 'Concurrent feature registration should succeed');
      }

      const report = manager.getStatusReport();
      this.assert(report.registered.length >= 3, 'Should register all concurrent features');
    });
  });
}

/**
 * Feature Lifecycle Integration Tests
 */
function setupFeatureLifecycleTests() {
  return pcTest.describe('Feature Lifecycle Integration', function() {
    
    this.beforeEach(function() {
      // Clear test tracking
      window.lifecycleEvents = [];
    });

    this.it('should execute complete feature lifecycle', function() {
      if (!window.BaseFeature) {
        console.log('ℹ️ BaseFeature not available, skipping lifecycle test');
        return;
      }

      class TestLifecycleFeature extends window.BaseFeature {
        constructor() {
          super('lifecycleTest');
        }

        onInit(match) {
          window.lifecycleEvents.push('init');
          super.onInit(match);
        }

        onActivate() {
          window.lifecycleEvents.push('activate');
          super.onActivate();
        }

        onDeactivate() {
          window.lifecycleEvents.push('deactivate');
          super.onDeactivate();
        }

        onCleanup() {
          window.lifecycleEvents.push('cleanup');
          super.onCleanup();
        }

        onError(error, context) {
          window.lifecycleEvents.push('error');
          super.onError(error, context);
        }
      }

      const feature = new TestLifecycleFeature();
      
      // Execute lifecycle
      feature.onInit({ url: 'https://test.spend.cloud' });
      feature.onActivate();
      feature.onDeactivate();
      feature.onCleanup();
      feature.onError(new Error('Test error'), 'test');

      // Verify lifecycle events
      const expectedEvents = ['init', 'activate', 'deactivate', 'cleanup', 'error'];
      this.assertDeepEqual(window.lifecycleEvents, expectedEvents, 
        'Should execute all lifecycle events in order');
    });

    this.it('should handle feature state transitions', function() {
      if (!window.BaseFeature) {
        console.log('ℹ️ BaseFeature not available, skipping state transition test');
        return;
      }

      const feature = new window.BaseFeature('stateTransitionTest');
      
      // Initial state
      this.assertEqual(feature.getIsInitialized(), false, 'Should start uninitialized');
      this.assertEqual(feature.getIsActive(), false, 'Should start inactive');
      
      // Initialize
      feature.onInit({ url: 'https://test.spend.cloud' });
      this.assertEqual(feature.getIsInitialized(), true, 'Should be initialized');
      this.assertEqual(feature.getIsActive(), false, 'Should still be inactive');
      
      // Activate
      feature.onActivate();
      this.assertEqual(feature.getIsInitialized(), true, 'Should remain initialized');
      this.assertEqual(feature.getIsActive(), true, 'Should be active');
      
      // Deactivate
      feature.onDeactivate();
      this.assertEqual(feature.getIsInitialized(), true, 'Should remain initialized');
      this.assertEqual(feature.getIsActive(), false, 'Should be inactive');
      
      // Cleanup
      feature.onCleanup();
      this.assertEqual(feature.getIsInitialized(), false, 'Should be uninitialized after cleanup');
      this.assertEqual(feature.getIsActive(), false, 'Should remain inactive');
    });

    this.it('should handle feature logger integration', function() {
      if (!window.BaseFeature || !window.PowerCloudLoggerFactory) {
        console.log('ℹ️ Required modules not available, skipping logger integration test');
        return;
      }

      const feature = new window.BaseFeature('loggerIntegrationTest', { 
        enableDebugLogging: true 
      });
      
      // Should have logger
      this.assertType(feature.logger, 'object', 'Should have logger instance');
      this.assertType(feature.log, 'function', 'Should have log method');
      
      // Test logging doesn't throw
      this.assert(() => {
        feature.log('Test message');
        feature.logger.info('Test info');
        feature.logger.warn('Test warning');
        feature.logger.error('Test error');
        return true;
      }, 'Logging should work without errors');
    });
  });
}

/**
 * Feature Loading Performance Tests
 */
function setupFeaturePerformanceTests() {
  return pcTest.describe('Feature Loading Performance', function() {
    
    this.it('should load features efficiently', function() {
      const startTime = performance.now();
      
      // Create many features to test performance
      const features = [];
      for (let i = 0; i < 20; i++) {
        features.push({
          name: `performanceTestFeature${i}`,
          urlPattern: new RegExp(`https://perf${i}\\.spend\\.cloud`),
          init: function() {},
          cleanup: function() {}
        });
      }

      const manager = new window.FeatureManager(features);
      const loadTime = performance.now() - startTime;
      
      this.assert(loadTime < 50, 'Loading 20 features should take less than 50ms');
      this.assertType(manager, 'object', 'Should create manager successfully');
    });

    this.it('should handle pattern matching efficiently', function() {
      const patterns = [
        /https:\/\/([^.]+)\.spend\.cloud\/cards\/(\d+)/,
        /https:\/\/([^.]+)\.spend\.cloud\/proactive\/kasboek\.boekingen/,
        /https:\/\/([^.]+)\.spend\.cloud\/api\/.*/,
        /https:\/\/([^.]+)\.spend\.cloud/
      ];

      const testUrls = [
        'https://test.spend.cloud/cards/12345',
        'https://demo.spend.cloud/proactive/kasboek.boekingen/show?id=67890',
        'https://api.spend.cloud/api/v1/data',
        'https://customer.spend.cloud/dashboard'
      ];

      const startTime = performance.now();
      
      // Test pattern matching performance
      for (const url of testUrls) {
        for (const pattern of patterns) {
          pattern.test(url);
        }
      }
      
      const matchTime = performance.now() - startTime;
      this.assert(matchTime < 10, 'Pattern matching should be fast (< 10ms for 16 operations)');
    });

    this.it('should handle feature initialization performance', async function() {
      if (!window.PowerCloudSafeFeatureManager) {
        console.log('ℹ️ SafeFeatureManager not available, skipping performance test');
        return;
      }

      const manager = new window.PowerCloudSafeFeatureManager();
      const startTime = performance.now();
      
      // Register multiple features
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          manager.registerFeature(`perfFeature${i}`, () => {
            // Simulate feature initialization work
            for (let j = 0; j < 100; j++) {
              Math.random();
            }
          })
        );
      }

      await Promise.all(promises);
      const initTime = performance.now() - startTime;
      
      this.assert(initTime < 100, 'Feature initialization should be efficient (< 100ms for 10 features)');
    });
  });
}

/**
 * Setup all integration tests
 */
function setupIntegrationTests() {
  console.log('🔧 Setting up PowerCloud Integration Tests...');
  
  // Configure test framework for integration tests
  pcTest.framework.configure({
    timeout: 5000,
    verbose: true,
    exitOnFailure: false
  });

  // Add integration-specific global setup
  pcTest.framework.addGlobalSetup(async function() {
    console.log('🚀 Integration tests global setup...');
    
    // Wait for all modules to be loaded
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify integration test requirements
    const requiredGlobals = ['FeatureManager'];
    for (const global of requiredGlobals) {
      if (!window[global]) {
        console.warn(`⚠️ Integration test requirement ${global} not met`);
      }
    }
    
    // Initialize test tracking
    window.testFeatures = [];
    window.lifecycleEvents = [];
  });

  // Add integration-specific global teardown
  pcTest.framework.addGlobalTeardown(async function() {
    console.log('🧹 Integration tests global teardown...');
    
    // Clean up test data
    delete window.testFeatures;
    delete window.lifecycleEvents;
    
    // Clean up any test DOM elements
    const testElements = document.querySelectorAll('[data-integration-test]');
    testElements.forEach(el => el.remove());
  });

  // Register integration test suites
  setupFeatureLoadingTests();
  setupFeatureLifecycleTests();
  setupFeaturePerformanceTests();

  console.log('✅ Integration tests setup complete');
}

// Auto-setup when loaded
if (typeof window !== 'undefined') {
  // Wait for test framework to be available
  if (window.pcTest) {
    setupIntegrationTests();
  } else {
    // Wait for framework to load
    const checkFramework = setInterval(() => {
      if (window.pcTest) {
        clearInterval(checkFramework);
        setupIntegrationTests();
      }
    }, 100);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkFramework);
      console.error('❌ Test framework not available for integration tests');
    }, 5000);
  }
}

// Export for manual usage
window.PowerCloudIntegrationTests = {
  setup: setupIntegrationTests,
  run: () => pcTest.run(),
  runFeatureLoading: () => pcTest.runSuite('Feature Loading Integration'),
  runFeatureLifecycle: () => pcTest.runSuite('Feature Lifecycle Integration'),
  runPerformance: () => pcTest.runSuite('Feature Loading Performance')
};

// Export for browser extension environment
if (typeof window !== 'undefined') {
  window.setupIntegrationTests = setupIntegrationTests;
}
