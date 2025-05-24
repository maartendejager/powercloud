#!/usr/bin/env node

/**
 * Standalone Test Runner for Phase 2.2 Components
 * Tests the Feature Validation system components
 */

// Mock browser environment for Node.js testing
global.window = global;
global.console = console;

// Mock performance API
global.performance = {
  now: () => Date.now(),
  getEntriesByName: () => [],
  mark: () => {},
  measure: () => {}
};

// Mock DOM elements
global.document = {
  querySelectorAll: () => [],
  querySelector: () => null,
  createElement: () => ({
    style: {},
    appendChild: () => {},
    setAttribute: () => {},
    getAttribute: () => null
  }),
  body: {
    appendChild: () => {}
  }
};

// Simple test framework
class SimpleTestFramework {
  constructor() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      total: 0
    };
  }

  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async runTests() {
    console.log('\n🧪 Running Phase 2.2 Tests...\n');
    
    for (const test of this.tests) {
      try {
        const testHelper = {
          assert: (condition, message) => {
            if (!condition) throw new Error(message || 'Assertion failed');
          },
          assertEqual: (actual, expected, message) => {
            if (actual !== expected) {
              throw new Error(`${message || 'Values not equal'}: expected ${expected}, got ${actual}`);
            }
          },
          assertTruthy: (value, message) => {
            if (!value) throw new Error(message || 'Value is not truthy');
          },
          assertFalsy: (value, message) => {
            if (value) throw new Error(message || 'Value is not falsy');
          },
          assertType: (value, expectedType, message) => {
            if (typeof value !== expectedType) {
              throw new Error(`${message || 'Type mismatch'}: expected ${expectedType}, got ${typeof value}`);
            }
          },
          assertContains: (haystack, needle, message) => {
            if (!haystack.includes || !haystack.includes(needle)) {
              throw new Error(`${message || 'Value not contained'}: ${haystack} does not contain ${needle}`);
            }
          }
        };

        await test.testFn(testHelper);
        console.log(`✅ ${test.name}`);
        this.results.passed++;
      } catch (error) {
        console.log(`❌ ${test.name}: ${error.message}`);
        this.results.failed++;
      }
      this.results.total++;
    }

    this.printSummary();
  }

  printSummary() {
    console.log('\n📊 Test Results:');
    console.log(`   Total: ${this.results.total}`);
    console.log(`   Passed: ${this.results.passed} ✅`);
    console.log(`   Failed: ${this.results.failed} ❌`);
    
    if (this.results.failed === 0) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log(`\n⚠️  ${this.results.failed} test(s) failed`);
    }
  }
}

// Load Phase 2.2 components
try {
  require('./shared/feature-validation.js');
  require('./shared/performance-monitor.js');
  require('./shared/error-tracker.js');
  require('./shared/feature-debugger.js');
  require('./shared/feature-validation-manager.js');
} catch (error) {
  console.error('Failed to load Phase 2.2 components:', error.message);
  process.exit(1);
}

// Create test framework instance
const testFramework = new SimpleTestFramework();

// FeatureValidator Tests
testFramework.test('FeatureValidator - validates valid feature', async (test) => {
  const validator = new global.FeatureValidator();
  const feature = {
    name: 'test-feature',
    urlPattern: /test/,
    init: function(match) { return true; },
    cleanup: function() { return true; }
  };
  const match = ['test'];

  const result = validator.validateFeatureInitialization(feature, match);

  test.assertTruthy(result, 'Should return validation result');
  test.assertEqual(result.featureName, 'test-feature', 'Should have correct feature name');
  test.assertTruthy(result.isValid, 'Valid feature should pass validation');
  test.assertEqual(result.errors.length, 0, 'Should have no errors');
});

testFramework.test('FeatureValidator - rejects invalid feature', async (test) => {
  const validator = new global.FeatureValidator();
  const feature = {
    urlPattern: /test/
    // Missing name and init method
  };
  const match = ['test'];

  const result = validator.validateFeatureInitialization(feature, match);

  test.assertTruthy(result, 'Should return validation result');
  test.assertFalsy(result.isValid, 'Invalid feature should fail validation');
  test.assert(result.errors.length > 0, 'Should have validation errors');
});

testFramework.test('FeatureValidator - health check works', async (test) => {
  const validator = new global.FeatureValidator();
  const feature = {
    name: 'test-feature',
    isInitialized: true,
    isActive: true,
    healthCheck: () => true
  };

  const result = validator.performHealthCheck(feature);

  test.assertTruthy(result, 'Should return health check result');
  test.assertEqual(result.featureName, 'test-feature', 'Should have correct feature name');
  test.assertTruthy(result.isHealthy, 'Healthy feature should pass health check');
});

// PerformanceMonitor Tests
testFramework.test('PerformanceMonitor - measures duration', async (test) => {
  const monitor = new global.PerformanceMonitor();
  const measurementId = monitor.startMeasurement('test-feature', 'test-operation');

  test.assertType(measurementId, 'string', 'Should return measurement ID');
  test.assertContains(measurementId, 'test-feature', 'ID should contain feature name');

  // Wait a bit to ensure measurable duration
  await new Promise(resolve => setTimeout(resolve, 10));

  const metrics = monitor.endMeasurement(measurementId);

  test.assertTruthy(metrics, 'Should return metrics');
  test.assertEqual(metrics.featureName, 'test-feature', 'Should have correct feature name');
  test.assertEqual(metrics.operation, 'test-operation', 'Should have correct operation');
  test.assert(metrics.duration >= 0, 'Should have non-negative duration');
});

testFramework.test('PerformanceMonitor - monitors initialization', async (test) => {
  const monitor = new global.PerformanceMonitor();
  const initFunction = async () => {
    await new Promise(resolve => setTimeout(resolve, 20));
    return 'initialized';
  };

  const result = await monitor.monitorInitialization('test-feature', initFunction);

  test.assertTruthy(result, 'Should return result');
  test.assertTruthy(result.metrics, 'Should have metrics');
  test.assertEqual(result.result, 'initialized', 'Should return init result');
  test.assert(result.metrics.duration >= 15, 'Should measure reasonable duration');
});

// ErrorTracker Tests
testFramework.test('ErrorTracker - tracks errors', async (test) => {
  const tracker = new global.ErrorTracker();
  const error = new Error('Test error message');

  const errorId = tracker.trackError('test-feature', error, 'test-context');

  test.assertType(errorId, 'string', 'Should return error ID');
  test.assertContains(errorId, 'test-feature', 'ID should contain feature name');

  const errors = tracker.getFeatureErrors('test-feature');
  test.assertEqual(errors.length, 1, 'Should have one error');
  test.assertEqual(errors[0].message, 'Test error message', 'Should store correct message');
  test.assertEqual(errors[0].context, 'test-context', 'Should store correct context');
});

testFramework.test('ErrorTracker - calculates stats', async (test) => {
  const tracker = new global.ErrorTracker();

  // Track multiple errors
  tracker.trackError('test-feature', new Error('Error 1'), 'initialization');
  tracker.trackError('test-feature', new Error('Error 2'), 'runtime');
  tracker.trackError('test-feature', new Error('Error 3'), 'cleanup');

  const stats = tracker.getFeatureErrorStats('test-feature');

  test.assertTruthy(stats, 'Should return stats');
  test.assertEqual(stats.featureName, 'test-feature', 'Should have correct feature name');
  test.assertEqual(stats.totalErrors, 3, 'Should count all errors');
  test.assertEqual(stats.unresolvedErrors, 3, 'Should count unresolved errors');
  test.assertTruthy(stats.byContext.initialization, 'Should categorize by context');
});

// FeatureDebugger Tests
testFramework.test('FeatureDebugger - creates debug session', async (test) => {
  const featureDebugger = new global.FeatureDebugger();
  const sessionId = featureDebugger.startDebugSession('test-feature');

  test.assertType(sessionId, 'string', 'Should return session ID');
  test.assertContains(sessionId, 'test-feature', 'ID should contain feature name');

  const debugInfo = featureDebugger.getDebugInfo('test-feature');
  test.assertEqual(debugInfo.activeSessions, 1, 'Should have one active session');
});

testFramework.test('FeatureDebugger - inspects features', async (test) => {
  const featureDebugger = new global.FeatureDebugger();
  const inspection = featureDebugger.inspectFeature('test-feature');

  test.assertTruthy(inspection, 'Should return inspection data');
  test.assertEqual(inspection.featureName, 'test-feature', 'Should have correct feature name');
  test.assertTruthy(inspection.state, 'Should capture state');
  test.assertTruthy(inspection.dom, 'Should capture DOM state');
  test.assertTruthy(inspection.performance, 'Should capture performance state');
});

// FeatureValidationManager Tests
testFramework.test('FeatureValidationManager - initializes correctly', async (test) => {
  const manager = new global.FeatureValidationManager();

  test.assertTruthy(manager.config, 'Should have configuration');
  test.assertTruthy(manager.config.enableValidation, 'Should enable validation by default');
  test.assertTruthy(manager.config.enablePerformanceMonitoring, 'Should enable performance monitoring by default');
});

testFramework.test('FeatureValidationManager - validates and initializes', async (test) => {
  const manager = new global.FeatureValidationManager();
  const feature = {
    name: 'test-feature',
    urlPattern: /test/,
    init: async function(match) { 
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'initialized'; 
    },
    cleanup: function() { return true; }
  };
  const match = ['test'];

  const result = await manager.validateAndInitializeFeature(feature, match);

  test.assertTruthy(result, 'Should return result');
  test.assertEqual(result.featureName, 'test-feature', 'Should have correct feature name');
  test.assertTruthy(result.success, 'Should succeed for valid feature');
  test.assertTruthy(result.validation, 'Should have validation result');
  test.assertTruthy(result.validation.isValid, 'Should pass validation');
});

testFramework.test('FeatureValidationManager - compiles dashboard data', async (test) => {
  const manager = new global.FeatureValidationManager();
  const dashboard = manager.getDashboardData();

  test.assertTruthy(dashboard, 'Should return dashboard data');
  test.assertTruthy(dashboard.timestamp, 'Should have timestamp');
  test.assertTruthy(dashboard.features, 'Should have features object');
  test.assertTruthy(dashboard.globalStats, 'Should have global stats');
  test.assertType(dashboard.globalStats.totalFeatures, 'number', 'Should count features');
});

// Integration Tests
testFramework.test('Integration - all components work together', async (test) => {
  const manager = new global.FeatureValidationManager();

  // Test feature that will generate metrics
  const testFeature = {
    name: 'integration-test-feature',
    urlPattern: /test/,
    init: async function(match) {
      await new Promise(resolve => setTimeout(resolve, 20));
      return { initialized: true, match };
    },
    cleanup: function() {
      return { cleanedUp: true };
    }
  };

  // Initialize with validation
  const initResult = await manager.validateAndInitializeFeature(testFeature, ['test']);

  test.assertTruthy(initResult.success, 'Feature should initialize successfully');
  test.assertTruthy(initResult.validation, 'Should have validation results');
  test.assertTruthy(initResult.performance, 'Should have performance metrics');

  // Perform health check
  const healthReport = manager.performComprehensiveHealthCheck(testFeature);

  test.assertTruthy(healthReport, 'Should generate health report');
  test.assertEqual(healthReport.featureName, 'integration-test-feature', 'Should have correct feature name');

  // Clean up with validation
  const cleanupResult = await manager.validateAndCleanupFeature(testFeature);

  test.assertTruthy(cleanupResult.success, 'Feature should clean up successfully');
  test.assertTruthy(cleanupResult.performance, 'Should have cleanup performance metrics');

  // Get dashboard data
  const dashboard = manager.getDashboardData();

  test.assertTruthy(dashboard.features['integration-test-feature'], 'Should include test feature in dashboard');
});

// Run all tests
testFramework.runTests().then(() => {
  if (testFramework.results.failed > 0) {
    process.exit(1);
  }
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
