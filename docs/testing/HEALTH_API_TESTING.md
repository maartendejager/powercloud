# 🧪 Health Dashboard API Testing Guide

## Overview
This guide provides instructions for testing the enhanced Health Dashboard API implemented in **Step 2.1** and **Step 3.2** of the PowerCloud Extension Logging Cleanup Plan.

## Enhanced API Endpoints

### 1. Structured Logging API
```javascript
// Record structured logs with levels, features, and categories
chrome.runtime.sendMessage({
  action: 'recordStructuredLog',
  level: 'info|debug|warn|error',
  feature: 'auth|api|ui|download|upload',
  category: 'auth|api|feature|performance|system|ui|error',
  message: 'Your log message',
  data: { key: 'value' } // Optional additional data
});
```

### 2. Feature Event Logging
```javascript
// Track feature lifecycle events
chrome.runtime.sendMessage({
  action: 'recordFeatureEvent',
  feature: 'downloadManager',
  event: 'init|activate|deactivate|error|performance',
  data: { version: '1.0', config: {} }
});
```

### 3. Enhanced Performance Metrics
```javascript
// Record performance metrics with threshold checking
chrome.runtime.sendMessage({
  action: 'recordEnhancedPerformanceMetric',
  feature: 'api',
  metric: 'response_time',
  value: 1200,
  unit: 'ms'
});
```

### 4. Advanced Log Filtering
```javascript
// Get filtered logs with multiple criteria
chrome.runtime.sendMessage({
  action: 'getFilteredLogs',
  filters: {
    level: 'error',
    feature: 'api',
    category: 'auth',
    timeRange: { start: Date.now() - 3600000, end: Date.now() },
    searchTerm: 'authentication',
    limit: 50
  }
});
```

### 5. Feature Channel Management
```javascript
// Get available feature channels and categories
chrome.runtime.sendMessage({
  action: 'getFeatureChannels'
});
```

### 6. Performance Summary
```javascript
// Get comprehensive performance statistics
chrome.runtime.sendMessage({
  action: 'getPerformanceSummary',
  timeRange: { start: Date.now() - 86400000, end: Date.now() }
});
```

### 7. Threshold Configuration
```javascript
// Update performance thresholds dynamically
chrome.runtime.sendMessage({
  action: 'updatePerformanceThresholds',
  thresholds: {
    api: { response_time: 2000 },
    ui: { render_time: 100 },
    memory: { usage: 100 }
  }
});
```

### 8. Authentication Status (Step 3.2)
```javascript
// Get comprehensive authentication status
chrome.runtime.sendMessage({
  action: 'getAuthStatus'
}, response => {
  console.log('Auth Status:', response.authStatus);
  console.log('Token Summary:', response.tokenSummary);
});
```

### 9. Authentication Error Reporting (Step 3.2)
```javascript
// Report authentication errors with cascading prevention
chrome.runtime.sendMessage({
  action: 'reportAuthError',
  endpoint: '/api/users/profile',
  error: 'Token expired',
  clientEnvironment: 'customer',
  isDev: false
}, response => {
  if (response.suppressed) {
    console.log('Error suppressed to prevent cascading failures');
  } else {
    console.log('Auth error recorded:', response.authError);
  }
});
```

## Browser Console Testing

Open the extension popup or any extension page and run these tests in the browser console:

### Test 1: Basic Structured Logging
```javascript
// Test different log levels
chrome.runtime.sendMessage({
  action: 'recordStructuredLog',
  level: 'info',
  feature: 'auth',
  category: 'auth',
  message: 'User login successful',
  data: { userId: '12345' }
}, response => console.log('Logged:', response));
```

### Test 2: Feature Event Tracking
```javascript
// Test feature lifecycle tracking
chrome.runtime.sendMessage({
  action: 'recordFeatureEvent',
  feature: 'downloadManager',
  event: 'init',
  data: { version: '1.0' }
}, response => console.log('Event recorded:', response));
```

### Test 3: Performance Monitoring
```javascript
// Test performance metric recording
chrome.runtime.sendMessage({
  action: 'recordEnhancedPerformanceMetric',
  feature: 'api',
  metric: 'response_time',
  value: 850,
  unit: 'ms'
}, response => console.log('Metric recorded:', response));
```

### Test 4: Log Retrieval
```javascript
// Test log filtering and retrieval
chrome.runtime.sendMessage({
  action: 'getFilteredLogs',
  filters: { level: 'info', limit: 10 }
}, response => console.log('Filtered logs:', response));
```

### Test 5: Feature Channels
```javascript
// Test channel management
chrome.runtime.sendMessage({
  action: 'getFeatureChannels'
}, response => console.log('Feature channels:', response));
```

### Test 6: Authentication Status (Step 3.2)
```javascript
// Test authentication status retrieval
chrome.runtime.sendMessage({
  action: 'getAuthStatus'
}, response => {
  console.log('Auth Status:', response);
  if (response.success) {
    console.log('Token Summary:', response.tokenSummary);
    console.log('Environments:', Object.keys(response.authStatus.environments || {}));
  }
});
```

### Test 7: Authentication Error Reporting (Step 3.2)
```javascript
// Test auth error reporting with cascading prevention
chrome.runtime.sendMessage({
  action: 'reportAuthError',
  endpoint: '/api/test/auth-failure',
  error: 'Invalid token',
  clientEnvironment: 'testenv',
  isDev: true
}, response => {
  console.log('Auth Error Report:', response);
  if (response.suppressed) {
    console.log('✅ Cascading error prevention working');
  }
});
```

## Expected Responses

All API calls should return responses in this format:
```javascript
{
  success: true|false,
  data: {...}, // Response data
  error: "Error message" // Only present if success is false
}
```

## Health Data Structure

The enhanced health monitoring stores data in this structure:
```javascript
{
  lastHealthCheck: timestamp,
  version: "1.0.0",
  features: {...},
  performance: {...},
  debugLogs: [...],
  errorReports: [...],
  // New enhanced features:
  logChannels: {
    auth: [...],
    api: [...],
    ui: [...],
    download: [...],
    upload: [...]
  },
  logCategories: [
    'auth', 'api', 'feature', 'performance', 'system', 'ui', 'error'
  ],
  performanceThresholds: {
    api: { response_time: 1000 },
    ui: { render_time: 50 },
    memory: { usage: 80 }
  }
}
```

## Testing Checklist

- [ ] ✅ Structured logging accepts all log levels
- [ ] ✅ Feature events track lifecycle properly  
- [ ] ✅ Performance metrics record with threshold checking
- [ ] ✅ Log filtering works with multiple criteria
- [ ] ✅ Feature channels return available channels
- [ ] ✅ Performance summary provides statistics
- [ ] ✅ Threshold configuration updates successfully
- [ ] ✅ **Step 3.2**: Authentication status retrieval works
- [ ] ✅ **Step 3.2**: Auth error reporting with cascading prevention
- [ ] ✅ **Step 3.2**: Popup displays authentication status correctly
- [ ] ✅ All APIs return proper response format
- [ ] ✅ No console errors during API calls
- [ ] ✅ Health data structure is maintained correctly

## Next Steps

After confirming all tests pass:
1. ✅ **Step 2.2**: Migrate critical logging points to use the health dashboard
2. ✅ **Step 2.3**: Enhance popup UI to display the new health features  
3. ✅ **Step 3.2**: Implement graceful authentication recovery flows
4. **Step 3.3**: Integrate API modules with auth error reporting
5. **Phase 4**: Complete remaining cleanup tasks

## Troubleshooting

If tests fail:
1. Check browser console for JavaScript errors
2. Verify service worker is running properly
3. Ensure all message handlers are properly exported
4. Check that health data structure is initialized correctly
