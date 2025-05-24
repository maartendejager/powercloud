/**
 * Unit Tests for Phase 2.2 - Feature Validation Components
 * Tests for FeatureValidator, PerformanceMonitor, ErrorTracker, FeatureDebugger, and FeatureValidationManager
 */

// Wait for test framework to be available
if (typeof window !== 'undefined' && window.PowerCloudTestFramework) {
  
  const framework = window.PowerCloudTestFramework;
  
  // FeatureValidator Tests
  const validatorTests = new TestSuite('FeatureValidator');
  
  validatorTests.test('validateFeatureInitialization - valid feature passes', async (test) => {
    if (!window.FeatureValidator) {
      test.assert(false, 'FeatureValidator not available');
      return;
    }
    
    const validator = new FeatureValidator();
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
  
  validatorTests.test('validateFeatureInitialization - invalid feature fails', async (test) => {
    if (!window.FeatureValidator) {
      test.assert(false, 'FeatureValidator not available');
      return;
    }
    
    const validator = new FeatureValidator();
    const feature = {
      // Missing name and init method
      urlPattern: /test/
    };
    const match = ['test'];
    
    const result = validator.validateFeatureInitialization(feature, match);
    
    test.assertTruthy(result, 'Should return validation result');
    test.assertFalsy(result.isValid, 'Invalid feature should fail validation');
    test.assert(result.errors.length > 0, 'Should have validation errors');
  });
  
  validatorTests.test('performHealthCheck - healthy feature passes', async (test) => {
    if (!window.FeatureValidator) {
      test.assert(false, 'FeatureValidator not available');
      return;
    }
    
    const validator = new FeatureValidator();
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
  const performanceTests = new TestSuite('PerformanceMonitor');
  
  performanceTests.test('startMeasurement and endMeasurement work correctly', async (test) => {
    if (!window.PerformanceMonitor) {
      test.assert(false, 'PerformanceMonitor not available');
      return;
    }
    
    const monitor = new PerformanceMonitor();
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
  
  performanceTests.test('monitorInitialization tracks performance correctly', async (test) => {
    if (!window.PerformanceMonitor) {
      test.assert(false, 'PerformanceMonitor not available');
      return;
    }
    
    const monitor = new PerformanceMonitor();
    const initFunction = async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return 'initialized';
    };
    
    const result = await monitor.monitorInitialization('test-feature', initFunction);
    
    test.assertTruthy(result, 'Should return result');
    test.assertTruthy(result.metrics, 'Should have metrics');
    test.assertEqual(result.result, 'initialized', 'Should return init result');
    test.assert(result.metrics.duration >= 40, 'Should measure reasonable duration');
  });
  
  performanceTests.test('getFeaturePerformanceSummary aggregates correctly', async (test) => {
    if (!window.PerformanceMonitor) {
      test.assert(false, 'PerformanceMonitor not available');
      return;
    }
    
    const monitor = new PerformanceMonitor();
    
    // Generate some test metrics
    const id1 = monitor.startMeasurement('test-feature', 'initialization');
    await new Promise(resolve => setTimeout(resolve, 10));
    monitor.endMeasurement(id1);
    
    const id2 = monitor.startMeasurement('test-feature', 'cleanup');
    await new Promise(resolve => setTimeout(resolve, 5));
    monitor.endMeasurement(id2);
    
    const summary = monitor.getFeaturePerformanceSummary('test-feature');
    
    test.assertTruthy(summary, 'Should return summary');
    test.assertEqual(summary.featureName, 'test-feature', 'Should have correct feature name');
    test.assertEqual(summary.totalMeasurements, 2, 'Should count all measurements');
    test.assertTruthy(summary.operations.initialization, 'Should have initialization operation');
    test.assertTruthy(summary.operations.cleanup, 'Should have cleanup operation');
  });
  
  // ErrorTracker Tests
  const errorTests = new TestSuite('ErrorTracker');
  
  errorTests.test('trackError stores error correctly', async (test) => {
    if (!window.ErrorTracker) {
      test.assert(false, 'ErrorTracker not available');
      return;
    }
    
    const tracker = new ErrorTracker();
    const error = new Error('Test error message');
    
    const errorId = tracker.trackError('test-feature', error, 'test-context');
    
    test.assertType(errorId, 'string', 'Should return error ID');
    test.assertContains(errorId, 'test-feature', 'ID should contain feature name');
    
    const errors = tracker.getFeatureErrors('test-feature');
    test.assertEqual(errors.length, 1, 'Should have one error');
    test.assertEqual(errors[0].message, 'Test error message', 'Should store correct message');
    test.assertEqual(errors[0].context, 'test-context', 'Should store correct context');
  });
  
  errorTests.test('getFeatureErrorStats calculates correctly', async (test) => {
    if (!window.ErrorTracker) {
      test.assert(false, 'ErrorTracker not available');
      return;
    }
    
    const tracker = new ErrorTracker();
    
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
  
  errorTests.test('resolveError marks error as resolved', async (test) => {
    if (!window.ErrorTracker) {
      test.assert(false, 'ErrorTracker not available');
      return;
    }
    
    const tracker = new ErrorTracker();
    const errorId = tracker.trackError('test-feature', new Error('Test error'), 'test');
    
    const resolved = tracker.resolveError(errorId, 'Fixed in testing');
    
    test.assertTruthy(resolved, 'Should resolve error successfully');
    
    const stats = tracker.getFeatureErrorStats('test-feature');
    test.assertEqual(stats.resolvedErrors, 1, 'Should count resolved error');
    test.assertEqual(stats.unresolvedErrors, 0, 'Should have no unresolved errors');
  });
  
  // FeatureDebugger Tests
  const debuggerTests = new TestSuite('FeatureDebugger');
  
  debuggerTests.test('startDebugSession creates session correctly', async (test) => {
    if (!window.FeatureDebugger) {
      test.assert(false, 'FeatureDebugger not available');
      return;
    }
    
    const featureDebugger = new FeatureDebugger();
    const sessionId = featureDebugger.startDebugSession('test-feature');
    
    test.assertType(sessionId, 'string', 'Should return session ID');
    test.assertContains(sessionId, 'test-feature', 'ID should contain feature name');
    
    const debugInfo = featureDebugger.getDebugInfo('test-feature');
    test.assertEqual(debugInfo.activeSessions, 1, 'Should have one active session');
  });
  
  debuggerTests.test('inspectFeature captures state correctly', async (test) => {
    if (!window.FeatureDebugger) {
      test.assert(false, 'FeatureDebugger not available');
      return;
    }
    
    const featureDebugger = new FeatureDebugger();
    const inspection = featureDebugger.inspectFeature('test-feature');
    
    test.assertTruthy(inspection, 'Should return inspection data');
    test.assertEqual(inspection.featureName, 'test-feature', 'Should have correct feature name');
    test.assertTruthy(inspection.state, 'Should capture state');
    test.assertTruthy(inspection.dom, 'Should capture DOM state');
    test.assertTruthy(inspection.performance, 'Should capture performance state');
  });
  
  debuggerTests.test('setBreakpoint and removeBreakpoint work correctly', async (test) => {
    if (!window.FeatureDebugger) {
      test.assert(false, 'FeatureDebugger not available');
      return;
    }
    
    const featureDebugger = new FeatureDebugger();
    const breakpointId = featureDebugger.setBreakpoint('test-feature', 'init');
    
    test.assertType(breakpointId, 'string', 'Should return breakpoint ID');
    
    const debugInfo = featureDebugger.getDebugInfo('test-feature');
    test.assertEqual(debugInfo.breakpoints, 1, 'Should have one breakpoint');
    
    const removed = featureDebugger.removeBreakpoint(breakpointId);
    test.assertTruthy(removed, 'Should remove breakpoint successfully');
    
    const updatedInfo = featureDebugger.getDebugInfo('test-feature');
    test.assertEqual(updatedInfo.breakpoints, 0, 'Should have no breakpoints');
  });
  
  // FeatureValidationManager Tests
  const validationManagerTests = new TestSuite('FeatureValidationManager');
  
  validationManagerTests.test('constructor initializes components correctly', async (test) => {
    if (!window.FeatureValidationManager) {
      test.assert(false, 'FeatureValidationManager not available');
      return;
    }
    
    const manager = new FeatureValidationManager();
    
    test.assertTruthy(manager.config, 'Should have configuration');
    test.assertTruthy(manager.config.enableValidation, 'Should enable validation by default');
    test.assertTruthy(manager.config.enablePerformanceMonitoring, 'Should enable performance monitoring by default');
  });
  
  validationManagerTests.test('validateAndInitializeFeature works end-to-end', async (test) => {
    if (!window.FeatureValidationManager || !window.FeatureValidator) {
      test.assert(false, 'FeatureValidationManager or dependencies not available');
      return;
    }
    
    const manager = new FeatureValidationManager();
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
  
  validationManagerTests.test('getDashboardData compiles correctly', async (test) => {
    if (!window.FeatureValidationManager) {
      test.assert(false, 'FeatureValidationManager not available');
      return;
    }
    
    const manager = new FeatureValidationManager();
    const dashboard = manager.getDashboardData();
    
    test.assertTruthy(dashboard, 'Should return dashboard data');
    test.assertTruthy(dashboard.timestamp, 'Should have timestamp');
    test.assertTruthy(dashboard.features, 'Should have features object');
    test.assertTruthy(dashboard.globalStats, 'Should have global stats');
    test.assertType(dashboard.globalStats.totalFeatures, 'number', 'Should count features');
  });
  
  validationManagerTests.test('configure updates settings correctly', async (test) => {
    if (!window.FeatureValidationManager) {
      test.assert(false, 'FeatureValidationManager not available');
      return;
    }
    
    const manager = new FeatureValidationManager();
    const originalInterval = manager.config.healthCheckInterval;
    
    manager.configure({ healthCheckInterval: 60000 });
    
    test.assertEqual(manager.config.healthCheckInterval, 60000, 'Should update health check interval');
    test.assertNotEqual(manager.config.healthCheckInterval, originalInterval, 'Should change from original value');
  });
  
  // Integration Tests for Phase 2.2
  const integrationTests = new TestSuite('Phase2.2Integration');
  
  integrationTests.test('all components work together', async (test) => {
    if (!window.FeatureValidationManager || !window.FeatureValidator || 
        !window.PerformanceMonitor || !window.ErrorTracker || !window.FeatureDebugger) {
      test.assert(false, 'Phase 2.2 components not fully available');
      return;
    }
    
    const manager = new FeatureValidationManager();
    
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
  
  integrationTests.test('error tracking integration works', async (test) => {
    if (!window.FeatureValidationManager || !window.ErrorTracker) {
      test.assert(false, 'Error tracking components not available');
      return;
    }
    
    const manager = new FeatureValidationManager();
    
    // Feature that will fail validation
    const failingFeature = {
      name: 'failing-feature',
      // Missing required properties
    };
    
    const result = await manager.validateAndInitializeFeature(failingFeature, ['test']);
    
    test.assertFalsy(result.success, 'Should fail for invalid feature');
    test.assertTruthy(result.errors.length > 0, 'Should have errors');
    
    // Check if errors were tracked
    if (manager.errorTracker) {
      const errorStats = manager.errorTracker.getFeatureErrorStats('failing-feature');
      test.assert(errorStats.totalErrors > 0, 'Should track validation errors');
    }
  });
  
  integrationTests.test('performance monitoring integration works', async (test) => {
    if (!window.FeatureValidationManager || !window.PerformanceMonitor) {
      test.assert(false, 'Performance monitoring components not available');
      return;
    }
    
    const manager = new FeatureValidationManager();
    
    // Feature with slow initialization
    const slowFeature = {
      name: 'slow-feature',
      urlPattern: /test/,
      init: async function() {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'slow-init-complete';
      },
      cleanup: function() { return true; }
    };
    
    const result = await manager.validateAndInitializeFeature(slowFeature, ['test']);
    
    test.assertTruthy(result.success, 'Should succeed despite being slow');
    test.assertTruthy(result.performance, 'Should have performance metrics');
    test.assert(result.performance.duration >= 90, 'Should measure slow initialization');
    
    // Check performance summary
    if (manager.performanceMonitor) {
      const summary = manager.performanceMonitor.getFeaturePerformanceSummary('slow-feature');
      test.assertTruthy(summary, 'Should have performance summary');
      test.assert(summary.operations.initialization.totalDuration >= 90, 'Should track initialization time');
    }
  });
  
  // Add all test suites to framework
  framework.addTestSuite(validatorTests);
  framework.addTestSuite(performanceTests);
  framework.addTestSuite(errorTests);
  framework.addTestSuite(debuggerTests);
  framework.addTestSuite(validationManagerTests);
  framework.addTestSuite(integrationTests);
  
  // Register as Phase 2.2 tests
  window.phase22Tests = {
    runAllTests: () => framework.runTests([
      'FeatureValidator',
      'PerformanceMonitor', 
      'ErrorTracker',
      'FeatureDebugger',
      'FeatureValidationManager',
      'Phase2.2Integration'
    ]),
    
    runComponentTests: (component) => {
      const testMap = {
        'validator': ['FeatureValidator'],
        'performance': ['PerformanceMonitor'],
        'error': ['ErrorTracker'],
        'debugger': ['FeatureDebugger'],
        'manager': ['FeatureValidationManager'],
        'integration': ['Phase2.2Integration']
      };
      
      const suites = testMap[component] || [component];
      return framework.runTests(suites);
    }
  };
  
} else {
  console.warn('PowerCloudTestFramework not available - Phase 2.2 tests not loaded');
}
