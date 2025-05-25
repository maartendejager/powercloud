# 📋 PowerCloud Extension Logging Guidelines

## **Overview**
This document establishes consistent logging patterns and standards for the PowerCloud Extension. Following these guidelines ensures proper debugging capabilities, performance optimization, and maintainable code.

**Version:** 1.0  
**Last Updated:** May 25, 2025  
**Status:** ✅ Active

---

## **🎯 Logging Strategy**

### **Dual Logging System**
The PowerCloud Extension uses a **dual logging approach**:

1. **Console Logging** - For development and immediate debugging
2. **Health Dashboard Logging** - For production monitoring and user diagnostics

---

## **📊 When to Use Each System**

### **Use Console Logging For:**
- ❌ **NEVER for production releases**
- ✅ Development debugging only
- ✅ Temporary troubleshooting (remove before commit)
- ✅ Critical errors that need immediate attention
- ✅ Fallback when Health Dashboard is unavailable

### **Use Health Dashboard Logging For:**
- ✅ **ALL production logging**
- ✅ Feature lifecycle events (init, success, failure)
- ✅ Performance threshold violations
- ✅ Authentication events and errors
- ✅ API request failures and retries
- ✅ User interaction tracking
- ✅ Error reporting and analytics

---

## **🏷️ Log Level Conventions**

### **DEBUG** - Development Information
```javascript
// Use for: Development insights, variable states, flow tracking
// Production: NEVER logged to console, optional in health dashboard
recordStructuredLog({
  level: 'debug',
  feature: 'feature-name',
  category: 'development',
  message: 'Token validation flow started',
  data: { clientEnvironment, isDev }
});
```

### **INFO** - Normal Operations
```javascript
// Use for: Successful operations, milestone events, user actions
// Production: Health dashboard only
recordStructuredLog({
  level: 'info',
  feature: 'auth',
  category: 'lifecycle',
  message: 'User authentication successful',
  data: { environment: 'customer', tokenCount: 3 }
});
```

### **WARN** - Potential Issues
```javascript
// Use for: Recoverable errors, deprecated usage, performance concerns
// Production: Both systems (with rate limiting)
recordStructuredLog({
  level: 'warn',
  feature: 'api',
  category: 'performance',
  message: 'API response time exceeded threshold',
  data: { endpoint, responseTime: 3500, threshold: 3000 }
});
```

### **ERROR** - Critical Failures
```javascript
// Use for: Unrecoverable errors, system failures, security issues
// Production: Both systems (immediate attention required)
recordStructuredLog({
  level: 'error',
  feature: 'auth',
  category: 'security',
  message: 'Authentication token validation failed',
  data: { endpoint, error: error.message, stack: error.stack }
});
```

---

## **📋 Standard Error Reporting Formats**

### **Authentication Errors**
```javascript
// Use reportAuthError for 401/authentication failures
chrome.runtime.sendMessage({
  action: 'reportAuthError',
  endpoint: '/api/users/profile',
  error: 'Token expired',
  clientEnvironment: 'customer',
  isDev: false
});
```

### **API Failures**
```javascript
recordStructuredLog({
  level: 'error',
  feature: 'api',
  category: 'request',
  message: 'API request failed',
  data: {
    endpoint: endpoint,
    method: method,
    status: response.status,
    error: error.message,
    timestamp: Date.now(),
    retryCount: retryCount || 0
  }
});
```

### **Feature Initialization Errors**
```javascript
recordStructuredLog({
  level: 'error',
  feature: featureName,
  category: 'lifecycle',
  message: 'Feature initialization failed',
  data: {
    feature: featureName,
    error: error.message,
    stack: error.stack,
    context: initContext,
    retryAttempt: attemptNumber
  }
});
```

### **Performance Violations**
```javascript
recordStructuredLog({
  level: 'warn',
  feature: 'performance',
  category: 'threshold',
  message: 'Performance threshold exceeded',
  data: {
    metric: metricName,
    value: actualValue,
    threshold: thresholdValue,
    feature: affectedFeature,
    timestamp: Date.now()
  }
});
```

---

## **✅ Best Practices**

### **DO: Structured Data**
```javascript
// ✅ Good - Structured, searchable data
recordStructuredLog({
  level: 'info',
  feature: 'adyen-book',
  category: 'user-interaction',
  message: 'Book entry created successfully',
  data: {
    entryId: 'ABC123',
    amount: 150.00,
    currency: 'EUR',
    duration: 250
  }
});
```

### **DON'T: String Concatenation**
```javascript
// ❌ Bad - Hard to parse and search
console.log('Book entry ABC123 created with amount 150.00 EUR in 250ms');
```

### **DO: Context-Rich Logging**
```javascript
// ✅ Good - Includes context for debugging
recordStructuredLog({
  level: 'error',
  feature: 'api',
  category: 'request',
  message: 'Failed to fetch user data',
  data: {
    endpoint: '/api/users/profile',
    method: 'GET',
    error: error.message,
    userAgent: navigator.userAgent,
    url: window.location.href,
    timestamp: Date.now()
  }
});
```

### **DO: Performance-Conscious Logging**
```javascript
// ✅ Good - Conditional detailed logging
if (window.PowerCloudDebug) {
  recordStructuredLog({
    level: 'debug',
    feature: 'api',
    category: 'performance',
    message: 'Request timing breakdown',
    data: { /* detailed timing data */ }
  });
}
```

### **DON'T: Excessive Logging**
```javascript
// ❌ Bad - Too verbose, impacts performance
for (let item of largeArray) {
  console.log('Processing item:', item.id);
}
```

---

## **🚀 Feature-Specific Guidelines**

### **Authentication Features**
- Always use `reportAuthError()` for 401 responses
- Log token expiration events as `WARN` level
- Include `clientEnvironment` and `isDev` in all auth logs
- Never log actual token values (use `token.substring(0, 10) + '...'`)

### **API Features**
- Log all failed requests as `ERROR` level
- Log slow responses (>3s) as `WARN` level
- Include endpoint, method, and response time
- Use cascading error prevention for authentication failures

### **UI Features**
- Log user interactions as `INFO` level
- Log render performance issues as `WARN` level
- Include feature name and interaction type
- Track error recovery attempts

### **Background Processing**
- Log processing start/completion as `DEBUG` level
- Log processing errors as `ERROR` level
- Include batch size and processing duration
- Log memory usage for large operations

---

## **🔧 Implementation Patterns**

### **Feature Initialization**
```javascript
class MyFeature extends BaseFeature {
  async initialize() {
    try {
      recordStructuredLog({
        level: 'debug',
        feature: this.name,
        category: 'lifecycle',
        message: 'Feature initialization started',
        data: { feature: this.name }
      });
      
      // ... initialization logic ...
      
      recordStructuredLog({
        level: 'info',
        feature: this.name,
        category: 'lifecycle',
        message: 'Feature initialized successfully',
        data: { feature: this.name, duration: Date.now() - startTime }
      });
    } catch (error) {
      recordStructuredLog({
        level: 'error',
        feature: this.name,
        category: 'lifecycle',
        message: 'Feature initialization failed',
        data: { 
          feature: this.name, 
          error: error.message, 
          stack: error.stack 
        }
      });
      throw error;
    }
  }
}
```

### **API Request Wrapper**
```javascript
async function makeApiRequest(endpoint, options = {}) {
  const startTime = Date.now();
  
  try {
    recordStructuredLog({
      level: 'debug',
      feature: 'api',
      category: 'request',
      message: 'API request started',
      data: { endpoint, method: options.method || 'GET' }
    });
    
    const response = await fetch(endpoint, options);
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      if (response.status === 401) {
        // Use specialized auth error reporting
        chrome.runtime.sendMessage({
          action: 'reportAuthError',
          endpoint: endpoint,
          error: `HTTP ${response.status}`,
          clientEnvironment: extractClientEnvironment(endpoint),
          isDev: isDevelopmentRoute(endpoint)
        });
      } else {
        recordStructuredLog({
          level: 'error',
          feature: 'api',
          category: 'request',
          message: 'API request failed',
          data: { endpoint, status: response.status, duration }
        });
      }
      throw new Error(`HTTP ${response.status}`);
    }
    
    recordStructuredLog({
      level: 'info',
      feature: 'api',
      category: 'request',
      message: 'API request successful',
      data: { endpoint, duration }
    });
    
    return response;
  } catch (error) {
    recordStructuredLog({
      level: 'error',
      feature: 'api',
      category: 'request',
      message: 'API request error',
      data: { 
        endpoint, 
        error: error.message, 
        duration: Date.now() - startTime 
      }
    });
    throw error;
  }
}
```

---

## **📈 Performance Guidelines**

### **Log Level Filtering**
```javascript
// Implement source-level filtering for performance
const LOG_LEVEL_PRIORITY = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LOG_LEVEL = window.PowerCloudDebug ? 0 : 2; // warn+ in production

function shouldLog(level) {
  return LOG_LEVEL_PRIORITY[level] >= MIN_LOG_LEVEL;
}

// Use conditional logging for expensive operations
if (shouldLog('debug')) {
  recordStructuredLog({
    level: 'debug',
    feature: 'performance',
    message: 'Detailed performance metrics',
    data: getExpensiveDebugData() // Only computed when needed
  });
}
```

### **Data Sanitization**
```javascript
// Sanitize sensitive data before logging
function sanitizeLogData(data) {
  const sanitized = { ...data };
  
  // Remove or mask sensitive fields
  if (sanitized.token) {
    sanitized.token = sanitized.token.substring(0, 10) + '...';
  }
  if (sanitized.password) {
    sanitized.password = '[REDACTED]';
  }
  if (sanitized.authHeader) {
    sanitized.authHeader = '[REDACTED]';
  }
  
  return sanitized;
}

recordStructuredLog({
  level: 'info',
  feature: 'auth',
  category: 'security',
  message: 'Authentication attempt',
  data: sanitizeLogData(authData)
});
```

---

## **🛡️ Security Considerations**

### **Never Log:**
- ❌ Complete authentication tokens
- ❌ User passwords or credentials
- ❌ Personal identifiable information (PII)
- ❌ API keys or secrets
- ❌ Payment card information

### **Always Sanitize:**
- ✅ Truncate tokens (first 10 characters + '...')
- ✅ Hash or mask sensitive identifiers
- ✅ Remove headers containing auth information
- ✅ Validate data before logging

### **Secure Logging Example:**
```javascript
function secureLog(level, feature, message, data = {}) {
  const sanitizedData = {
    ...data,
    // Sanitize tokens
    token: data.token ? `${data.token.substring(0, 10)}...` : undefined,
    // Remove sensitive headers
    headers: data.headers ? 
      Object.fromEntries(
        Object.entries(data.headers).filter(([key]) => 
          !key.toLowerCase().includes('auth')
        )
      ) : undefined,
    // Hash user IDs for privacy
    userId: data.userId ? `user_${btoa(data.userId).substring(0, 8)}` : undefined
  };
  
  recordStructuredLog({
    level,
    feature,
    category: 'secure',
    message,
    data: sanitizedData
  });
}
```

---

## **🧪 Testing and Validation**

### **Log Testing Pattern**
```javascript
// Test that important events are logged correctly
async function testFeatureLogging() {
  const logSpy = [];
  
  // Mock logging function
  const originalLog = window.recordStructuredLog;
  window.recordStructuredLog = (entry) => logSpy.push(entry);
  
  try {
    // Execute feature
    await myFeature.initialize();
    
    // Validate logging
    assert(logSpy.some(log => 
      log.level === 'info' && 
      log.feature === 'myFeature' &&
      log.category === 'lifecycle'
    ), 'Feature initialization should be logged');
    
  } finally {
    // Restore original logging
    window.recordStructuredLog = originalLog;
  }
}
```

---

## **📚 Migration Guide**

### **Converting Existing Console Logs**

#### **Before (Console Logging):**
```javascript
console.log('User clicked submit button');
console.error('API request failed:', error);
console.warn('Token expiring soon');
```

#### **After (Health Dashboard Logging):**
```javascript
recordStructuredLog({
  level: 'info',
  feature: 'ui',
  category: 'user-interaction',
  message: 'User clicked submit button',
  data: { element: 'submit-button', timestamp: Date.now() }
});

recordStructuredLog({
  level: 'error',
  feature: 'api',
  category: 'request',
  message: 'API request failed',
  data: { error: error.message, stack: error.stack, endpoint: '/api/submit' }
});

recordStructuredLog({
  level: 'warn',
  feature: 'auth',
  category: 'security',
  message: 'Token expiring soon',
  data: { expiresIn: 300000, environment: 'production' }
});
```

---

## **🔍 Monitoring and Alerts**

### **Health Dashboard Integration**
- All logs are automatically captured in the health dashboard
- Use the popup health interface for real-time monitoring
- Implement log level filtering for focused debugging
- Export health reports for analysis

### **Alert Thresholds**
- **ERROR logs:** Immediate attention required
- **WARN logs:** Monitor for patterns
- **High-frequency logs:** May indicate performance issues
- **Authentication errors:** Check for security concerns

---

## **📋 Quick Reference**

### **Essential Commands**
```javascript
// Structured logging
recordStructuredLog({ level, feature, category, message, data });

// Authentication errors
chrome.runtime.sendMessage({ action: 'reportAuthError', ... });

// Performance violations
chrome.runtime.sendMessage({ action: 'recordPerformanceViolation', ... });

// Feature events
chrome.runtime.sendMessage({ action: 'recordFeatureEvent', ... });
```

### **Common Categories**
- `lifecycle` - Feature initialization, shutdown
- `user-interaction` - Button clicks, form submissions
- `request` - API calls, data fetching
- `performance` - Timing, memory usage
- `security` - Authentication, authorization
- `error` - Exception handling, failures

---

## **🎓 Training Resources**

### **Documentation Links**
- [Health Dashboard API](../HEALTH_API_TESTING.md)
- [Architecture Guidelines](../ARCHITECTURE.md)
- [Code Style Guide](./CODE_STYLE_GUIDE.md)

### **Examples Repository**
- See `/testing/` directory for logging examples
- Check existing features for implementation patterns
- Review health dashboard integration tests

---

**🎯 Remember:** Consistent logging leads to better debugging, improved user experience, and maintainable code. When in doubt, prefer health dashboard logging over console logging for production code.
