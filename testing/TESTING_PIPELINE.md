# Automated Testing Pipeline Documentation

## Overview

This document outlines the comprehensive testing pipeline for the PowerCloud Chrome Extension. The pipeline includes unit tests, integration tests, end-to-end tests, and automated testing procedures to ensure code quality and reliability.

## Testing Framework Architecture

### Core Components

1. **Test Framework** (`test-framework.js`)
   - Main testing framework with test runner
   - Test suite management and reporting
   - Assertion utilities and test lifecycle hooks

2. **Unit Tests** (`content-script-tests.js`)
   - Content script functionality testing
   - Feature manager unit tests
   - Enhanced debug system testing
   - DOM interaction validation

3. **Integration Tests** (`background-integration-tests.js`)
   - Background service worker message handling
   - Token management integration
   - API request handling
   - Health monitoring system integration

4. **End-to-End Tests** (`e2e-tests.js`)
   - Complete user workflow testing
   - Feature activation and interaction
   - Popup functionality validation
   - Settings and configuration workflows

5. **Testing Utilities** (`feature-test-utils.js`)
   - Chrome API mocks and stubs
   - DOM testing utilities
   - Performance testing tools
   - Feature-specific test helpers

## Test Categories

### 1. Unit Tests

**Purpose**: Test individual components and functions in isolation

**Coverage**:
- Shared utilities (URL patterns, settings manager, auth)
- Content script components (feature manager, debug system)
- DOM manipulation and event handling
- Configuration and validation logic

**Location**: `testing/content-script-tests.js`

**Execution**:
```javascript
// In browser console on any spend.cloud page
PowerCloudTesting.runUnitTests();
```

### 2. Integration Tests

**Purpose**: Test component interactions and service integrations

**Coverage**:
- Background service worker message handling
- Chrome extension API integration
- Token management workflows
- Health monitoring data flow
- Storage operations

**Location**: `testing/background-integration-tests.js`

**Execution**:
```javascript
// In browser console (requires extension loaded)
PowerCloudTesting.runIntegrationTests();
```

### 3. End-to-End Tests

**Purpose**: Test complete user workflows and feature interactions

**Coverage**:
- Extension popup functionality
- Feature activation based on URL patterns
- Adyen integration workflows
- Settings and configuration management
- Error handling and recovery

**Location**: `testing/e2e-tests.js`

**Execution**:
```javascript
// In browser console on target pages
PowerCloudTesting.runE2ETests();
```

## Test Execution Procedures

### Manual Testing

1. **Load Extension in Development Mode**
   ```bash
   # Chrome → Extensions → Developer mode → Load unpacked
   # Select PowerCloud extension directory
   ```

2. **Navigate to Test Environment**
   ```
   https://test.spend.cloud/
   # or
   https://dev.spend.cloud/
   ```

3. **Open Developer Console**
   ```
   F12 → Console tab
   ```

4. **Run Test Suites**
   ```javascript
   // Run all tests
   PowerCloudTesting.runAllTests();
   
   // Run specific test categories
   PowerCloudTesting.runUnitTests();
   PowerCloudTesting.runIntegrationTests();
   PowerCloudTesting.runE2ETests();
   
   // Run specific test suite
   PowerCloudTesting.runTestSuite('Feature Manager Unit Tests');
   ```

### Automated Testing Script

Create a test automation script for continuous integration:

```javascript
// test-automation.js
async function runAutomatedTests() {
  console.log('🚀 Starting PowerCloud Automated Test Suite...');
  
  const results = {
    unit: null,
    integration: null,
    e2e: null,
    overall: { passed: 0, failed: 0, skipped: 0 }
  };
  
  try {
    // Unit Tests
    console.log('\n📋 Running Unit Tests...');
    results.unit = await PowerCloudTesting.runUnitTests();
    
    // Integration Tests  
    console.log('\n🔗 Running Integration Tests...');
    results.integration = await PowerCloudTesting.runIntegrationTests();
    
    // E2E Tests
    console.log('\n🎯 Running End-to-End Tests...');
    results.e2e = await PowerCloudTesting.runE2ETests();
    
    // Calculate overall results
    [results.unit, results.integration, results.e2e].forEach(result => {
      if (result) {
        results.overall.passed += result.passed;
        results.overall.failed += result.failed;
        results.overall.skipped += result.skipped;
      }
    });
    
    // Generate report
    generateTestReport(results);
    
  } catch (error) {
    console.error('❌ Test automation failed:', error);
    return false;
  }
  
  return results.overall.failed === 0;
}

function generateTestReport(results) {
  console.log('\n📊 Test Results Summary:');
  console.log('=====================================');
  console.log(`✅ Passed: ${results.overall.passed}`);
  console.log(`❌ Failed: ${results.overall.failed}`);
  console.log(`⏭️  Skipped: ${results.overall.skipped}`);
  console.log(`📈 Success Rate: ${(results.overall.passed / (results.overall.passed + results.overall.failed) * 100).toFixed(1)}%`);
  
  // Export results for CI/CD
  window.testResults = results;
}
```

## Test Environment Setup

### Prerequisites

1. **Chrome Browser** (Version 88+)
2. **PowerCloud Extension** loaded in developer mode
3. **Access to test domains**:
   - `https://test.spend.cloud/`
   - `https://dev.spend.cloud/`

### Environment Configuration

1. **Test Data Setup**
   ```javascript
   // Configure test environment
   PowerCloudTesting.configure({
     timeout: 10000,        // Test timeout in ms
     retries: 2,           // Retry failed tests
     verbose: true,        // Detailed logging
     parallel: false       // Sequential execution
   });
   ```

2. **Mock Configuration**
   ```javascript
   // Set up Chrome API mocks for isolated testing
   testUtils.setup();
   
   // Configure mock responses
   testUtils.chromeMocks.runtime.setMockResponse('getAuthTokens', {
     tokens: [{ domain: 'test.spend.cloud', token: 'mock-token' }]
   });
   ```

## Continuous Integration Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: PowerCloud Extension Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Chrome
      uses: browser-actions/setup-chrome@latest
      
    - name: Install Dependencies
      run: npm install
      
    - name: Run Extension Tests
      run: |
        # Start Chrome with extension loaded
        # Run automated test suite
        # Generate test reports
        npm run test:extension
        
    - name: Upload Test Results
      uses: actions/upload-artifact@v2
      with:
        name: test-results
        path: test-results/
```

### Test Scripts in package.json

```json
{
  "scripts": {
    "test": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "test:unit": "node scripts/run-unit-tests.js",
    "test:integration": "node scripts/run-integration-tests.js", 
    "test:e2e": "node scripts/run-e2e-tests.js",
    "test:watch": "node scripts/watch-tests.js",
    "test:coverage": "node scripts/generate-coverage.js"
  }
}
```

## Test Data Management

### Mock Data Sets

```javascript
// test-data.js
export const mockTokens = [
  { domain: 'test.spend.cloud', token: 'test-token-123', expires: Date.now() + 3600000 },
  { domain: 'dev.spend.cloud', token: 'dev-token-456', expires: Date.now() + 3600000 }
];

export const mockCards = [
  { id: 'card-123', number: '4111111111111111', type: 'visa' },
  { id: 'card-456', number: '5555555555554444', type: 'mastercard' }
];

export const mockBooks = [
  { id: 'book-1', name: 'Administration', code: 'ADM001' },
  { id: 'book-2', name: 'Project Alpha', code: 'PRJ002' }
];
```

### Test Environment Reset

```javascript
async function resetTestEnvironment() {
  // Clear extension storage
  await chrome.storage.local.clear();
  
  // Reset DOM to clean state
  document.querySelectorAll('.powercloud-test-element').forEach(el => el.remove());
  
  // Reset mocks
  testUtils.chromeMocks.reset();
  
  // Clear console logs
  console.clear();
  
  console.log('🧹 Test environment reset complete');
}
```

## Performance Testing

### Performance Benchmarks

```javascript
// Performance test thresholds
const PERFORMANCE_THRESHOLDS = {
  featureInitialization: 100,  // ms
  domManipulation: 50,         // ms
  apiResponse: 2000,           // ms
  memoryUsage: 5,              // MB
  storageOperations: 100       // ms
};

async function runPerformanceTests() {
  const perfUtils = new PerformanceTestUtils();
  
  // Test feature initialization time
  perfUtils.startTimer('featureInit');
  await initializeTestFeature();
  const initTime = perfUtils.endTimer('featureInit');
  
  assert(initTime < PERFORMANCE_THRESHOLDS.featureInitialization, 
    `Feature initialization too slow: ${initTime}ms`);
}
```

### Memory Leak Detection

```javascript
async function detectMemoryLeaks() {
  const beforeSnapshot = perfUtils.getMemorySnapshot();
  
  // Run test operations
  await runTestOperations();
  
  // Force garbage collection (in dev tools)
  if (window.gc) window.gc();
  
  const afterSnapshot = perfUtils.getMemorySnapshot();
  const memoryIncrease = afterSnapshot.used - beforeSnapshot.used;
  
  console.log(`Memory usage change: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
  
  // Flag potential memory leaks
  if (memoryIncrease > PERFORMANCE_THRESHOLDS.memoryUsage * 1024 * 1024) {
    console.warn('⚠️ Potential memory leak detected');
  }
}
```

## Error Handling and Debugging

### Test Failure Analysis

```javascript
function analyzeTestFailures(results) {
  const failures = results.filter(test => test.status === 'failed');
  
  failures.forEach(failure => {
    console.group(`❌ ${failure.name}`);
    console.log('Error:', failure.error);
    console.log('Stack:', failure.stack);
    console.log('Expected:', failure.expected);
    console.log('Actual:', failure.actual);
    console.groupEnd();
  });
  
  return {
    totalFailures: failures.length,
    categories: categorizeFailures(failures),
    recommendations: generateFixRecommendations(failures)
  };
}
```

### Debug Mode Testing

```javascript
// Enable debug mode for detailed test logging
PowerCloudTesting.configure({ 
  verbose: true,
  debugMode: true,
  logLevel: 'debug'
});

// Run tests with enhanced logging
await PowerCloudTesting.runAllTests();
```

## Coverage Reporting

### Code Coverage Analysis

```javascript
// Simple coverage tracking
const coverage = {
  files: new Map(),
  functions: new Map(),
  lines: new Map()
};

function trackExecution(file, func, line) {
  if (!coverage.files.has(file)) coverage.files.set(file, new Set());
  if (!coverage.functions.has(func)) coverage.functions.set(func, new Set());
  coverage.lines.set(`${file}:${line}`, true);
}

function generateCoverageReport() {
  return {
    filesCovered: coverage.files.size,
    functionsCovered: coverage.functions.size,
    linesCovered: coverage.lines.size,
    coveragePercentage: calculateCoveragePercentage()
  };
}
```

## Best Practices

### Test Writing Guidelines

1. **Test Naming**: Use descriptive names that explain what is being tested
2. **Test Isolation**: Each test should be independent and not rely on other tests
3. **Assertion Clarity**: Use clear assertions with meaningful error messages
4. **Setup/Teardown**: Always clean up after tests to prevent side effects
5. **Mock Usage**: Use mocks for external dependencies and Chrome APIs

### Maintenance Procedures

1. **Regular Test Review**: Review and update tests when features change
2. **Performance Monitoring**: Track test execution times and optimize slow tests
3. **Coverage Goals**: Maintain >80% code coverage across all modules
4. **Documentation Updates**: Keep test documentation current with code changes

## Troubleshooting

### Common Issues

1. **Chrome Extension API Not Available**
   ```javascript
   if (typeof chrome === 'undefined') {
     console.error('Tests must be run in Chrome extension context');
     return;
   }
   ```

2. **Service Worker Not Responding**
   ```javascript
   // Increase timeout for service worker tests
   PowerCloudTesting.configure({ timeout: 10000 });
   ```

3. **DOM Elements Not Found**
   ```javascript
   // Wait for DOM elements to load
   await testUtils.domUtils.waitForElement('.target-element');
   ```

4. **Asynchronous Test Timing**
   ```javascript
   // Use proper async/await patterns
   await testUtils.waitFor(() => condition, 5000);
   ```

## Future Enhancements

### Planned Improvements

1. **Visual Regression Testing**: Screenshot comparison for UI components
2. **Cross-Browser Testing**: Automated testing in multiple browsers
3. **Load Testing**: Performance testing under various loads
4. **Security Testing**: Automated security vulnerability scanning
5. **Accessibility Testing**: Automated accessibility compliance checks

This testing pipeline provides comprehensive coverage of the PowerCloud extension functionality while maintaining reliability and efficiency in the development workflow.
