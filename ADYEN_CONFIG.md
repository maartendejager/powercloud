# Adyen Features Configuration

This document describes the configuration options available for the three Adyen features after the Phase 5.1 enhancements.

## Configuration Storage

All configurations are stored in Chrome's local storage under feature-specific keys:
- `adyenCardConfig` - Configuration for adyen-card.js
- `adyenBookConfig` - Configuration for adyen-book.js  
- `adyenEntriesConfig` - Configuration for adyen-entries.js

## Configuration Options

Each feature supports the following configuration options:

### Error Handling & Retry Configuration
```javascript
{
  retryAttempts: 3,           // Number of retry attempts for failed API calls
  retryDelay: 1000,          // Base delay in milliseconds between retries (with exponential backoff)
  timeout: 30000,            // Timeout in milliseconds for API calls
  showDetailedErrors: false, // Whether to show detailed error messages to users
  fallbackToDefaultBehavior: true // Whether to show fallback UI when APIs fail
}
```

### Example Configuration Setup

To configure the features, you can use the browser console on any PowerCloud page:

```javascript
// Configure adyen-card feature
chrome.storage.local.set({
  adyenCardConfig: {
    retryAttempts: 5,
    retryDelay: 2000,
    timeout: 45000,
    showDetailedErrors: true,
    fallbackToDefaultBehavior: true
  }
});

// Configure adyen-book feature  
chrome.storage.local.set({
  adyenBookConfig: {
    retryAttempts: 3,
    retryDelay: 1500,
    timeout: 30000,
    showDetailedErrors: false,
    fallbackToDefaultBehavior: true
  }
});

// Configure adyen-entries feature
chrome.storage.local.set({
  adyenEntriesConfig: {
    retryAttempts: 2,
    retryDelay: 1000,
    timeout: 20000,
    showDetailedErrors: false,
    fallbackToDefaultBehavior: true
  }
});
```

## Error Handling Features

### Retry Mechanism
- Automatic retry with exponential backoff
- Configurable number of attempts
- Configurable base delay between retries

### Timeout Handling
- Configurable timeout for all Chrome extension messaging
- Prevents indefinite waiting for unresponsive background script

### Error Tracking
- Each feature tracks API error patterns
- Error statistics available via `getApiErrorStats()` method
- Automatic error clearing on successful operations

### Fallback Behavior
- When `fallbackToDefaultBehavior` is true, features will show UI elements even if APIs fail
- Provides graceful degradation of functionality
- Users can still see buttons (though potentially disabled) and manual workarounds

### User Feedback
- Configurable error message detail level
- Detailed errors show technical information (for debugging)
- Simple errors show user-friendly messages
- Auto-dismissing result messages with manual close option

## Feature-Specific Behaviors

### Adyen Card (adyen-card.js)
- Handles card balance and verification API failures
- Falls back to disabled card info button on API failure
- Provides manual refresh option in error states

### Adyen Book (adyen-book.js)  
- Handles balance account fetching API failures
- Falls back to disabled book info button on API failure
- Graceful handling of missing balance account data

### Adyen Entries (adyen-entries.js)
- Handles entry details fetching API failures
- Falls back to disabled transfer button on API failure
- Graceful handling of missing transfer ID data
- Enhanced tab opening with retry logic

## Testing Error Scenarios

To test error handling, you can temporarily modify the background script or simulate network failures:

1. **Network Timeout**: Set very low timeout values (e.g., 100ms)
2. **API Failures**: Modify background script to return error responses
3. **Chrome Extension Errors**: Test with background script disabled

## Monitoring and Debugging

Each feature logs detailed information when debug logging is enabled. Error statistics can be accessed via browser console:

```javascript
// Access error stats for any feature (example for card feature)
window.PowerCloudFeatures.card.getApiErrorStats?.();
```
