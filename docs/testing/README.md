# PowerCloud Extension Testing Documentation

This directory contains comprehensive testing guides, procedures, and tools for the PowerCloud Chrome extension.

## 📋 Testing Quick Reference

### For Immediate Testing
- **[Quick Test Guide](./QUICK_TEST_GUIDE.md)** - Fast validation procedures for Adyen features
- **[Manual Test Checklist](../testing/MANUAL_TEST_CHECKLIST.md)** - Step-by-step testing checklist

### For Feature-Specific Testing
- **[Page Actions Testing Guide](./PAGE_ACTIONS_TESTING_GUIDE.md)** - Testing page-specific functionality
- **[Health API Testing](./HEALTH_API_TESTING.md)** - Health monitoring and API validation

### For Comprehensive Testing
- **[Testing Pipeline](./TESTING_PIPELINE.md)** - Automated testing framework and procedures

## 🚀 Getting Started with Testing

### 1. Quick Validation (2 minutes)
```javascript
// Run this in browser console for instant validation
const script = document.createElement('script');
script.src = chrome.runtime.getURL('testing/final-validation-test.js');
document.head.appendChild(script);
```

### 2. Manual Feature Testing
1. **Card Features**: Navigate to `https://[customer].spend.cloud/cards/[card-id]`
2. **Book Features**: Navigate to `https://[customer].spend.cloud/books/[book-id]`
3. **Entry Features**: Navigate to `https://[customer].spend.cloud/proactive/kasboek.boekingen/show?id=[entry-id]`

### 3. Health Monitoring
Use the [Health API Testing](./HEALTH_API_TESTING.md) guide to validate system health and monitoring features.

## 📁 Testing File Locations

### In `/docs/testing/` (this directory):
- `QUICK_TEST_GUIDE.md` - Fast testing procedures
- `PAGE_ACTIONS_TESTING_GUIDE.md` - Feature-specific testing
- `HEALTH_API_TESTING.md` - Health monitoring tests
- `TESTING_PIPELINE.md` - Automated testing setup

### In `/testing/` (main testing directory):
- `test-framework.js` - Core testing framework
- `unit-tests.js` - Unit test suites
- `integration-tests.js` - Integration test suites
- `e2e-tests.js` - End-to-end test suites
- Various feature-specific test files

## 🔧 Testing Tools Available

### Console Testing Scripts
```javascript
// Run all tests
PowerCloudTesting.runAllTests();

// Run specific test categories
PowerCloudTesting.runUnitTests();
PowerCloudTesting.runIntegrationTests();
PowerCloudTesting.runE2ETests();

// Run feature-specific tests
PowerCloudTesting.runTestSuite('Adyen Features');
PowerCloudTesting.runTestSuite('Token Management');
```

### Validation Scripts
- **Final Validation**: `testing/final-validation-test.js`
- **Response Structure Testing**: `testing/response-structure-test.js`
- **Auth Error Handling**: `testing/auth-error-handling-validation.js`

## ✅ Test Coverage

### Core Features Tested
- [x] Authentication token capture and management
- [x] Adyen card, book, and entry features
- [x] Page detection and URL pattern matching
- [x] API request processing and error handling
- [x] Health monitoring and diagnostics

### Testing Categories
- **Unit Tests**: Individual component functionality
- **Integration Tests**: Component interaction and communication
- **End-to-End Tests**: Complete user workflows
- **Performance Tests**: Response times and resource usage
- **Error Handling Tests**: Edge cases and failure scenarios

## 🐛 Debugging Test Issues

### Common Issues
1. **Extension not loaded**: Check `chrome://extensions/`
2. **Console errors**: Check browser developer tools
3. **API failures**: Verify network connectivity and authentication
4. **Test timeouts**: Increase timeout values or check network speed

### Debug Tools
- Browser developer tools (F12)
- Extension service worker console
- Network tab for API request monitoring
- Chrome extension management page

## 📈 Test Results and Reporting

### Success Indicators
- ✅ Buttons appear on appropriate pages
- ✅ No false "no data" errors when data exists
- ✅ Console shows response structure detection
- ✅ Adyen URLs open correctly

### Failure Indicators
- ❌ Buttons missing on supported pages
- ❌ Generic errors when specific data is available
- ❌ Console shows API or network errors
- ❌ Incorrect or broken Adyen URLs

## 🔗 Related Documentation

- **[Main Testing Directory](../testing/)** - Core testing infrastructure
- **[Developer Onboarding](../DEVELOPER_ONBOARDING.md)** - Setup for new developers
- **[Development Notes](../../DEVELOPMENT_NOTES.md)** - Troubleshooting context
- **[Architecture Guide](../../ARCHITECTURE.md)** - Technical implementation details
