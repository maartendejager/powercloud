/**
 * Phase 1.2 Integration Test - Enhanced Error Handling & Logging
 * 
 * This test validates the new error handling, logging, and debug functionality
 * introduced in Phase 1.2 of the PowerCloud Extension improvement plan.
 */

/**
 * Phase 1.2 Integration Test Suite
 */
class Phase12IntegrationTest {
  constructor() {
    this.testResults = [];
    this.logger = window.PowerCloudLoggerFactory?.getLogger('Phase12Test') || console;
  }

  /**
   * Run all Phase 1.2 integration tests
   */
  async runTests() {
    console.log('🧪 Starting Phase 1.2 Integration Tests...');
    
    try {
      await this.testLoggerIntegration();
      await this.testErrorBoundaries();
      await this.testBaseFeatureLoggerIntegration();
      await this.testDebugMode();
      await this.testSafeFeatureManager();
      await this.testGracefulDegradation();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  /**
   * Test 1: Logger Integration
   */
  async testLoggerIntegration() {
    console.log('🔍 Testing Logger Integration...');
    
    try {
      // Test logger factory exists
      this.assert(typeof window.PowerCloudLoggerFactory === 'object', 'LoggerFactory should be available');
      
      // Test creating a logger
      const testLogger = window.PowerCloudLoggerFactory.getLogger('TestLogger');
      this.assert(typeof testLogger === 'object', 'Should be able to create logger');
      this.assert(typeof testLogger.debug === 'function', 'Logger should have debug method');
      this.assert(typeof testLogger.info === 'function', 'Logger should have info method');
      this.assert(typeof testLogger.warn === 'function', 'Logger should have warn method');
      this.assert(typeof testLogger.error === 'function', 'Logger should have error method');
      
      // Test logging functionality
      testLogger.debug('Test debug message');
      testLogger.info('Test info message');
      testLogger.warn('Test warn message');
      testLogger.error('Test error message');
      
      // Test logger configuration
      const stats = window.PowerCloudLoggerFactory.getStats();
      this.assert(typeof stats === 'object', 'Should provide stats');
      this.assert(typeof stats.totalLoggers === 'number', 'Should track logger count');
      
      this.recordTest('Logger Integration', true, 'All logger functionality working');
      
    } catch (error) {
      this.recordTest('Logger Integration', false, error.message);
    }
  }

  /**
   * Test 2: Error Boundaries
   */
  async testErrorBoundaries() {
    console.log('🔍 Testing Error Boundaries...');
    
    try {
      // Test error boundary exists
      this.assert(typeof window.PowerCloudFeatureErrorBoundary === 'function', 'FeatureErrorBoundary should be available');
      
      // Create error boundary instance
      const errorBoundary = new window.PowerCloudFeatureErrorBoundary();
      this.assert(typeof errorBoundary.safeInitialize === 'function', 'Should have safeInitialize method');
      
      // Test successful initialization
      let initSuccess = false;
      const result1 = await errorBoundary.safeInitialize('testFeature', () => {
        initSuccess = true;
      });
      
      this.assert(result1 === true, 'Should return true for successful initialization');
      this.assert(initSuccess === true, 'Should execute initialization function');
      
      // Test failed initialization
      const result2 = await errorBoundary.safeInitialize('failingFeature', () => {
        throw new Error('Test error');
      }, { allowRetry: false });
      
      this.assert(result2 === false, 'Should return false for failed initialization');
      this.assert(errorBoundary.hasFeatureFailed('failingFeature'), 'Should track failed features');
      
      this.recordTest('Error Boundaries', true, 'Error boundary functionality working');
      
    } catch (error) {
      this.recordTest('Error Boundaries', false, error.message);
    }
  }

  /**
   * Test 3: BaseFeature Logger Integration
   */
  async testBaseFeatureLoggerIntegration() {
    console.log('🔍 Testing BaseFeature Logger Integration...');
    
    try {
      // Test BaseFeature exists
      this.assert(typeof window.BaseFeature === 'function', 'BaseFeature should be available');
      
      // Create BaseFeature instance
      const feature = new window.BaseFeature('testFeature', { enableDebugLogging: true });
      this.assert(typeof feature.logger === 'object', 'BaseFeature should have logger property');
      this.assert(typeof feature.logger.debug === 'function', 'BaseFeature logger should have debug method');
      
      // Test logging methods work
      feature.log('Test debug message');
      feature.logger.info('Test info message');
      
      // Test lifecycle methods use logger
      feature.onActivate();
      feature.onDeactivate();
      
      this.recordTest('BaseFeature Logger Integration', true, 'BaseFeature integrated with logger successfully');
      
    } catch (error) {
      this.recordTest('BaseFeature Logger Integration', false, error.message);
    }
  }

  /**
   * Test 4: Debug Mode
   */
  async testDebugMode() {
    console.log('🔍 Testing Debug Mode...');
    
    try {
      // Test debug controller exists
      this.assert(typeof window.PowerCloudDebugController === 'object', 'DebugController should be available');
      
      // Test debug panel can be created
      const debugBtn = document.getElementById('powercloud-debug-toggle');
      this.assert(debugBtn !== null, 'Debug toggle button should exist');
      
      // Test debug panel
      const debugPanel = document.getElementById('powercloud-debug-panel');
      this.assert(debugPanel !== null, 'Debug panel should exist');
      
      // Test export functionality exists
      this.assert(typeof window.PowerCloudDebugController.exportDebugData === 'function', 'Should have export function');
      
      this.recordTest('Debug Mode', true, 'Debug mode functionality available');
      
    } catch (error) {
      this.recordTest('Debug Mode', false, error.message);
    }
  }

  /**
   * Test 5: SafeFeatureManager
   */
  async testSafeFeatureManager() {
    console.log('🔍 Testing SafeFeatureManager...');
    
    try {
      // Test SafeFeatureManager exists
      this.assert(typeof window.PowerCloudSafeFeatureManager === 'function', 'SafeFeatureManager should be available');
      
      // Test it was initialized in main.js
      this.assert(typeof window.PowerCloudFeatureManager === 'object', 'FeatureManager instance should be available');
      
      // Test registration functionality
      const manager = new window.PowerCloudSafeFeatureManager();
      const success = await manager.registerFeature('testFeature', () => {
        console.log('Test feature initialized');
      });
      
      this.assert(success === true, 'Should successfully register feature');
      
      // Test status report
      const report = manager.getStatusReport();
      this.assert(typeof report === 'object', 'Should provide status report');
      this.assert(Array.isArray(report.registered), 'Should track registered features');
      
      this.recordTest('SafeFeatureManager', true, 'SafeFeatureManager working correctly');
      
    } catch (error) {
      this.recordTest('SafeFeatureManager', false, error.message);
    }
  }

  /**
   * Test 6: Graceful Degradation
   */
  async testGracefulDegradation() {
    console.log('🔍 Testing Graceful Degradation...');
    
    try {
      // Test that the extension continues working even if features fail
      const manager = new window.PowerCloudSafeFeatureManager();
      
      // Register a failing feature
      const result1 = await manager.registerFeature('failingFeature', () => {
        throw new Error('Intentional test failure');
      }, { allowRetry: false });
      
      // Register a successful feature after the failure
      const result2 = await manager.registerFeature('successFeature', () => {
        console.log('Success feature initialized');
      });
      
      this.assert(result1 === false, 'Failing feature should fail gracefully');
      this.assert(result2 === true, 'Subsequent features should still work');
      
      const report = manager.getStatusReport();
      this.assert(report.failed.includes('failingFeature'), 'Should track failed features');
      this.assert(report.registered.includes('successFeature'), 'Should track successful features');
      
      this.recordTest('Graceful Degradation', true, 'Extension degrades gracefully on feature failures');
      
    } catch (error) {
      this.recordTest('Graceful Degradation', false, error.message);
    }
  }

  /**
   * Helper method to assert conditions
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  /**
   * Record test result
   */
  recordTest(testName, passed, message) {
    this.testResults.push({
      test: testName,
      passed,
      message,
      timestamp: new Date().toISOString()
    });
    
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testName}: ${message}`);
  }

  /**
   * Print final test results
   */
  printResults() {
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    
    console.log('\n📊 Phase 1.2 Integration Test Results:');
    console.log(`Passed: ${passed}/${total}`);
    
    if (passed === total) {
      console.log('🎉 All tests passed! Phase 1.2 implementation is ready.');
    } else {
      console.log('⚠️ Some tests failed. Please review the implementation.');
    }
    
    // Store results for debugging
    window.PowerCloudPhase12TestResults = this.testResults;
  }
}

// Auto-run tests when script loads
if (typeof window !== 'undefined') {
  // Wait a bit for all components to initialize
  setTimeout(() => {
    const testSuite = new Phase12IntegrationTest();
    testSuite.runTests();
  }, 1000);
}

// Make available globally for manual testing
window.PowerCloudPhase12Test = Phase12IntegrationTest;
