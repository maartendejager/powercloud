# PowerCloud Extension Testing

This directory contains test files and testing utilities for the PowerCloud extension.

## Testing Framework

### Core Testing Files
- **`test-framework.js`** - Main testing framework with utilities for unit and integration tests
- **`unit-tests.js`** - Unit tests for shared utilities and modules
- **`integration-tests.js`** - Integration tests for feature loading and interaction

### Feature-Specific Tests
- **`base-feature-test.js`** - Tests for the BaseFeature class and feature lifecycle
- **`phase-1.2-test.js`** - Tests for error handling and logging improvements (Phase 1.2)
- **`phase-1.3-test.js`** - Tests for URL pattern enhancements (Phase 1.3)
- **`phase-2.2-tests.js`** - Tests for feature validation and health monitoring (Phase 2.2)

## Running Tests

### Manual Testing
Most tests are designed to be run manually in the browser console:

1. Load the extension in Chrome
2. Open developer tools on any spend.cloud page
3. Load and run test files as needed

### Test Framework Usage
```javascript
// Example: Running unit tests
// Load test-framework.js first, then:
PowerCloudTesting.runAllTests();

// Running specific test suites
PowerCloudTesting.runUnitTests();
PowerCloudTesting.runIntegrationTests();
```

### Test Categories

#### Unit Tests
- Shared utility functions
- URL pattern matching
- Token validation
- Configuration management

#### Integration Tests  
- Feature loading and initialization
- Error handling across components
- Settings manager integration
- Performance monitoring

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
