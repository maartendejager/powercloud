# PowerCloud Extension Testing

This directory contains test files and testing utilities for the PowerCloud extension.

## Directory Structure

### Organized Test Categories
- **`integration/`** - Integration tests for component interactions and API endpoints
- **`manual/`** - HTML test pages and manual testing utilities  
- **`ui/`** - User interface testing files and visual validation
- **`validation/`** - Validation scripts for specific functionality and bug fixes

### Core Testing Files

### Core Testing Files
- **`test-framework.js`** - Main testing framework with utilities for unit and integration tests
- **`unit-tests.js`** - Unit tests for shared utilities and modules
- **`integration-tests.js`** - Integration tests for feature loading and interaction

### Feature-Specific Tests
- **`base-feature-test.js`** - Tests for the BaseFeature class and feature lifecycle
- **`phase-1.2-test.js`** - Tests for error handling and logging improvements (Phase 1.2)
- **`phase-1.3-test.js`** - Tests for URL pattern enhancements (Phase 1.3)
- **`phase-2.2-tests.js`** - Tests for feature validation and health monitoring (Phase 2.2)

### Phase 4.1 Testing Infrastructure
- **`content-script-tests.js`** - Comprehensive unit tests for content script functionality
- **`background-integration-tests.js`** - Integration tests for background service worker
- **`e2e-tests.js`** - End-to-end tests for critical user flows
- **`feature-test-utils.js`** - Testing utilities, mocks, and helpers for feature testing
- **`TESTING_PIPELINE.md`** - Comprehensive documentation for automated testing pipeline
- **`validate-phase-4.1.js`** - Comprehensive validation script for Phase 4.1 testing infrastructure

## Running Tests

### Manual Testing
Most tests are designed to be run manually in the browser console:

1. Load the extension in Chrome
2. Open developer tools on any spend.cloud page
3. Load and run test files as needed

### Test Framework Usage
```javascript
// Example: Running all test categories
PowerCloudTesting.runAllTests();

// Running specific test suites (Phase 4.1)
PowerCloudTesting.runUnitTests();           // Content script unit tests
PowerCloudTesting.runIntegrationTests();    // Background integration tests  
PowerCloudTesting.runE2ETests();            // End-to-end workflow tests

// Running legacy test suites
PowerCloudTesting.runTestSuite('Base Feature Tests');
PowerCloudTesting.runTestSuite('Feature Loading Integration');
```

### Testing Utilities (Phase 4.1)
```javascript
// Set up test environment with mocks
await testUtils.setup();

// Create test features
const testFeature = testUtils.createTestFeature({
  name: 'myTestFeature',
  init: () => console.log('Feature initialized')
});

// Create mock DOM structures
const adyenDOM = domUtils.createAdyenTestDOM();
const bookDOM = domUtils.createBookTestDOM();

// Performance testing
perfUtils.startTimer('operation');
// ... run operation ...
const duration = perfUtils.endTimer('operation');

// Clean up after tests
await testUtils.teardown();
```

### Phase 4.1 Validation

To validate that all Phase 4.1 testing components are working properly:

```javascript
// Load the validation script in browser console
// Then run:
validatePhase41Testing();
```

This will check:
- Test framework availability and functionality
- Content script unit tests setup
- Background integration tests configuration
- E2E testing infrastructure
- Feature testing utilities and mocks
- Testing pipeline documentation completeness

## Test Categories

#### Unit Tests
- Shared utility functions (URL patterns, settings, auth)
- Content script components (feature manager, debug system)
- DOM manipulation and event handling
- Configuration management and validation

#### Integration Tests  
- Background service worker message handling
- Chrome extension API integration
- Token management workflows
- Health monitoring system integration
- Storage operations and data persistence

#### End-to-End Tests
- Complete user workflows and feature interactions
- Extension popup functionality validation
- Feature activation based on URL patterns
- Adyen integration workflows
- Settings and configuration management
- Error handling and recovery scenarios

#### Feature Tests
- BaseFeature lifecycle
- Error boundary functionality
- Feature cleanup and memory management

## Test Coverage

Current test coverage focuses on:
- ✅ Core shared utilities
- ✅ Feature loading mechanism
- ✅ Error handling and recovery
- ✅ URL pattern matching
- ✅ Configuration management

## Adding New Tests

When adding new features or modifying existing ones:

1. Add unit tests for new utility functions
2. Add integration tests for feature interactions
3. Test error conditions and edge cases
4. Validate performance impact
5. Ensure cleanup and memory management

## Notes

- Tests are designed to work within the Chrome extension environment
- Some tests require actual spend.cloud pages to be loaded
- Performance tests monitor real extension behavior
- All tests should clean up after themselves to avoid affecting extension functionality
