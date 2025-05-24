/**
 * PowerCloud Extension Testing Framework
 * 
 * A comprehensive unit and integration testing framework for the PowerCloud extension.
 * This framework provides utilities for testing shared modules, features, and integration points.
 * 
 * Phase 2.1 Implementation - Basic Testing Framework
 */

/**
 * Test runner and framework core
 */
class PowerCloudTestFramework {
  constructor() {
    this.testSuites = new Map();
    this.testResults = new Map();
    this.globalSetup = [];
    this.globalTeardown = [];
    this.logger = window.PowerCloudLoggerFactory?.getLogger('TestFramework') || console;
    this.startTime = null;
    this.config = {
      timeout: 5000,
      retries: 0,
      verbose: true,
      exitOnFailure: false,
      parallel: false
    };
  }

  /**
   * Configure the test framework
   */
  configure(options = {}) {
    this.config = { ...this.config, ...options };
    return this;
  }

  /**
   * Add global setup function
   */
  addGlobalSetup(setupFn) {
    this.globalSetup.push(setupFn);
    return this;
  }

  /**
   * Add global teardown function
   */
  addGlobalTeardown(teardownFn) {
    this.globalTeardown.push(teardownFn);
    return this;
  }

  /**
   * Register a test suite
   */
  describe(suiteName, suiteDefinition) {
    if (this.testSuites.has(suiteName)) {
      throw new Error(`Test suite '${suiteName}' already exists`);
    }

    const suite = new TestSuite(suiteName, this.logger, this.config);
    this.testSuites.set(suiteName, suite);
    
    // Execute the suite definition to register tests
    suiteDefinition.call(suite, suite);
    
    return suite;
  }

  /**
   * Run all registered test suites
   */
  async runAll() {
    this.startTime = Date.now();
    this.logger.info('🧪 Starting PowerCloud Test Framework');
    
    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    try {
      // Run global setup
      await this.runGlobalSetup();

      // Run test suites
      for (const [suiteName, suite] of this.testSuites) {
        this.logger.info(`\n📋 Running test suite: ${suiteName}`);
        
        const results = await suite.run();
        this.testResults.set(suiteName, results);
        
        totalPassed += results.passed;
        totalFailed += results.failed;
        totalSkipped += results.skipped;

        if (this.config.exitOnFailure && results.failed > 0) {
          this.logger.error(`❌ Test suite '${suiteName}' failed, stopping execution`);
          break;
        }
      }

      // Run global teardown
      await this.runGlobalTeardown();

    } catch (error) {
      this.logger.error('❌ Test framework error:', error);
      return this.generateReport(0, 1, 0, error);
    }

    return this.generateReport(totalPassed, totalFailed, totalSkipped);
  }

  /**
   * Run specific test suite by name
   */
  async runSuite(suiteName) {
    const suite = this.testSuites.get(suiteName);
    if (!suite) {
      throw new Error(`Test suite '${suiteName}' not found`);
    }

    this.startTime = Date.now();
    this.logger.info(`🧪 Running test suite: ${suiteName}`);

    try {
      await this.runGlobalSetup();
      const results = await suite.run();
      await this.runGlobalTeardown();
      
      this.testResults.set(suiteName, results);
      return results;

    } catch (error) {
      this.logger.error('❌ Test suite error:', error);
      throw error;
    }
  }

  /**
   * Get test results for all suites
   */
  getResults() {
    return this.testResults;
  }

  /**
   * Get test results for specific suite
   */
  getSuiteResults(suiteName) {
    return this.testResults.get(suiteName);
  }

  /**
   * Generate coverage report (basic implementation)
   */
  generateCoverageReport() {
    const coverage = {
      totalModules: 0,
      testedModules: 0,
      coverage: 0
    };

    // Basic coverage based on which modules have tests
    const testedModules = new Set();
    
    for (const [suiteName, results] of this.testResults) {
      if (results.passed > 0) {
        testedModules.add(suiteName);
      }
    }

    // Count available modules (simplified)
    const knownModules = [
      'url-patterns', 'logger', 'base-feature', 'error-handling',
      'debug-mode', 'auth', 'api', 'feature-manager'
    ];

    coverage.totalModules = knownModules.length;
    coverage.testedModules = testedModules.size;
    coverage.coverage = Math.round((coverage.testedModules / coverage.totalModules) * 100);

    return coverage;
  }

  /**
   * Run global setup functions
   */
  async runGlobalSetup() {
    for (const setupFn of this.globalSetup) {
      try {
        await setupFn();
      } catch (error) {
        this.logger.error('❌ Global setup failed:', error);
        throw error;
      }
    }
  }

  /**
   * Run global teardown functions
   */
  async runGlobalTeardown() {
    for (const teardownFn of this.globalTeardown) {
      try {
        await teardownFn();
      } catch (error) {
        this.logger.warn('⚠️ Global teardown warning:', error);
      }
    }
  }

  /**
   * Generate test report
   */
  generateReport(passed, failed, skipped, error = null) {
    const duration = Date.now() - this.startTime;
    const total = passed + failed + skipped;
    
    const report = {
      summary: {
        total,
        passed,
        failed,
        skipped,
        duration,
        success: failed === 0 && !error
      },
      suites: {},
      coverage: this.generateCoverageReport(),
      error
    };

    // Add suite details
    for (const [suiteName, results] of this.testResults) {
      report.suites[suiteName] = results;
    }

    this.printReport(report);
    return report;
  }

  /**
   * Print formatted test report
   */
  printReport(report) {
    const { summary, coverage } = report;
    
    console.log('\n🏆 PowerCloud Test Framework Report');
    console.log('=====================================');
    console.log(`Total Tests: ${summary.total}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`⏭️ Skipped: ${summary.skipped}`);
    console.log(`⏱️ Duration: ${summary.duration}ms`);
    console.log(`📊 Coverage: ${coverage.coverage}% (${coverage.testedModules}/${coverage.totalModules} modules)`);
    
    if (summary.success) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log('\n⚠️ Some tests failed. See details above.');
    }

    if (report.error) {
      console.log('\n❌ Framework Error:', report.error.message);
    }
  }
}

/**
 * Individual test suite
 */
class TestSuite {
  constructor(name, logger, config) {
    this.name = name;
    this.logger = logger;
    this.config = config;
    this.tests = [];
    this.beforeEach = null;
    this.afterEach = null;
    this.beforeAll = null;
    this.afterAll = null;
  }

  /**
   * Add a test to this suite
   */
  it(testName, testFn) {
    this.tests.push({
      name: testName,
      fn: testFn,
      skip: false,
      only: false
    });
    return this;
  }

  /**
   * Add a skipped test
   */
  skip(testName, testFn) {
    this.tests.push({
      name: testName,
      fn: testFn,
      skip: true,
      only: false
    });
    return this;
  }

  /**
   * Add an exclusive test (only this test will run)
   */
  only(testName, testFn) {
    this.tests.push({
      name: testName,
      fn: testFn,
      skip: false,
      only: true
    });
    return this;
  }

  /**
   * Set beforeEach hook
   */
  beforeEach(fn) {
    this.beforeEach = fn;
    return this;
  }

  /**
   * Set afterEach hook
   */
  afterEach(fn) {
    this.afterEach = fn;
    return this;
  }

  /**
   * Set beforeAll hook
   */
  beforeAll(fn) {
    this.beforeAll = fn;
    return this;
  }

  /**
   * Set afterAll hook
   */
  afterAll(fn) {
    this.afterAll = fn;
    return this;
  }

  /**
   * Run all tests in this suite
   */
  async run() {
    const results = {
      suite: this.name,
      tests: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0
    };

    const startTime = Date.now();

    try {
      // Run beforeAll hook
      if (this.beforeAll) {
        await this.beforeAll();
      }

      // Filter tests (handle 'only' flag)
      let testsToRun = this.tests;
      const onlyTests = this.tests.filter(t => t.only);
      if (onlyTests.length > 0) {
        testsToRun = onlyTests;
      }

      // Run each test
      for (const test of testsToRun) {
        const testResult = await this.runSingleTest(test);
        results.tests.push(testResult);
        
        if (testResult.status === 'passed') results.passed++;
        else if (testResult.status === 'failed') results.failed++;
        else if (testResult.status === 'skipped') results.skipped++;
      }

      // Run afterAll hook
      if (this.afterAll) {
        await this.afterAll();
      }

    } catch (error) {
      this.logger.error(`❌ Test suite '${this.name}' setup/teardown error:`, error);
      results.failed++;
    }

    results.duration = Date.now() - startTime;
    return results;
  }

  /**
   * Run a single test
   */
  async runSingleTest(test) {
    const testResult = {
      name: test.name,
      status: 'unknown',
      duration: 0,
      error: null
    };

    // Skip test if marked
    if (test.skip) {
      testResult.status = 'skipped';
      this.logger.info(`⏭️ ${test.name} (skipped)`);
      return testResult;
    }

    const startTime = Date.now();

    try {
      // Run beforeEach hook
      if (this.beforeEach) {
        await this.beforeEach();
      }

      // Create test context with assertion helpers
      const context = new TestContext(this.logger);

      // Run the test with timeout
      await this.runWithTimeout(test.fn.bind(context, context), this.config.timeout);
      
      testResult.status = 'passed';
      this.logger.info(`✅ ${test.name}`);

    } catch (error) {
      testResult.status = 'failed';
      testResult.error = error.message;
      this.logger.error(`❌ ${test.name}: ${error.message}`);
      
      if (this.config.verbose) {
        console.error(error);
      }

    } finally {
      try {
        // Run afterEach hook
        if (this.afterEach) {
          await this.afterEach();
        }
      } catch (error) {
        this.logger.warn(`⚠️ afterEach hook failed for ${test.name}:`, error);
      }
      
      testResult.duration = Date.now() - startTime;
    }

    return testResult;
  }

  /**
   * Run function with timeout
   */
  async runWithTimeout(fn, timeout) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Test timed out after ${timeout}ms`));
      }, timeout);

      Promise.resolve(fn())
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeoutId));
    });
  }
}

/**
 * Test context with assertion helpers
 */
class TestContext {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Assert that condition is true
   */
  assert(condition, message = 'Assertion failed') {
    if (!condition) {
      throw new Error(message);
    }
  }

  /**
   * Assert equality
   */
  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      const msg = message || `Expected ${expected}, got ${actual}`;
      throw new Error(msg);
    }
  }

  /**
   * Assert deep equality (basic implementation)
   */
  assertDeepEqual(actual, expected, message) {
    if (!this.deepEqual(actual, expected)) {
      const msg = message || `Deep equality failed`;
      throw new Error(msg);
    }
  }

  /**
   * Assert that function throws
   */
  assertThrows(fn, expectedError, message) {
    let threw = false;
    let actualError = null;

    try {
      fn();
    } catch (error) {
      threw = true;
      actualError = error;
    }

    if (!threw) {
      throw new Error(message || 'Expected function to throw');
    }

    if (expectedError && actualError.message !== expectedError) {
      throw new Error(message || `Expected error "${expectedError}", got "${actualError.message}"`);
    }
  }

  /**
   * Assert that value is truthy
   */
  assertTruthy(value, message) {
    if (!value) {
      throw new Error(message || `Expected truthy value, got ${value}`);
    }
  }

  /**
   * Assert that value is falsy
   */
  assertFalsy(value, message) {
    if (value) {
      throw new Error(message || `Expected falsy value, got ${value}`);
    }
  }

  /**
   * Assert type equality
   */
  assertType(value, expectedType, message) {
    const actualType = typeof value;
    if (actualType !== expectedType) {
      throw new Error(message || `Expected type ${expectedType}, got ${actualType}`);
    }
  }

  /**
   * Assert array contains value
   */
  assertContains(array, value, message) {
    if (!Array.isArray(array) || !array.includes(value)) {
      throw new Error(message || `Array does not contain ${value}`);
    }
  }

  /**
   * Basic deep equality check
   */
  deepEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;
    
    if (typeof a === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      
      if (keysA.length !== keysB.length) return false;
      
      for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!this.deepEqual(a[key], b[key])) return false;
      }
      
      return true;
    }
    
    return false;
  }
}

/**
 * Mock utilities for testing
 */
class MockUtils {
  static createMockFunction(returnValue) {
    const mock = function(...args) {
      mock.calls.push(args);
      mock.lastCall = args;
      return mock.returnValue;
    };
    
    mock.calls = [];
    mock.lastCall = null;
    mock.returnValue = returnValue;
    mock.isMock = true;
    
    mock.mockReturnValue = function(value) {
      mock.returnValue = value;
      return mock;
    };
    
    mock.mockImplementation = function(fn) {
      mock.implementation = fn;
      return mock;
    };
    
    return mock;
  }

  static createMockObject(methods = {}) {
    const mock = {};
    
    for (const [name, returnValue] of Object.entries(methods)) {
      mock[name] = this.createMockFunction(returnValue);
    }
    
    return mock;
  }

  static spyOn(object, methodName) {
    const original = object[methodName];
    const spy = this.createMockFunction();
    
    spy.original = original;
    spy.restore = function() {
      object[methodName] = original;
    };
    
    object[methodName] = spy;
    return spy;
  }
}

// Global test framework instance
window.PowerCloudTestFramework = PowerCloudTestFramework;
window.PowerCloudMockUtils = MockUtils;

// Convenience functions
window.pcTest = {
  framework: new PowerCloudTestFramework(),
  describe: function(name, fn) {
    return window.pcTest.framework.describe(name, fn);
  },
  run: function() {
    return window.pcTest.framework.runAll();
  },
  runSuite: function(name) {
    return window.pcTest.framework.runSuite(name);
  },
  mock: MockUtils
};

export { PowerCloudTestFramework, TestSuite, TestContext, MockUtils };
