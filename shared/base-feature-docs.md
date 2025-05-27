# BaseFeature Class Documentation

## Overview

The `BaseFeature` class provides a standardized foundation for PowerCloud extension features. It offers common functionality and lifecycle management while maintaining backward compatibility with existing feature implementations.

## Key Features

- **Standardized Lifecycle**: Consistent `onInit`, `onCleanup`, `onActivate`, and `onDeactivate` hooks
- **Error Handling**: Built-in error handling with context information
- **Debug Logging**: Optional debug logging for development and troubleshooting
- **Backward Compatibility**: Works seamlessly with existing FeatureManager and feature patterns
- **State Management**: Tracks initialization and activation state

## Basic Usage

### Creating a Feature Class

```javascript
// Example: Creating a new feature that extends BaseFeature
class MyNewFeature extends BaseFeature {
  constructor() {
    super('myNewFeature', {
      hostElementId: 'powercloud-mynewfeature-host', // Optional
      enableDebugLogging: false // Set to true for development
    });
    
    // Feature-specific properties
    this.customer = null;
    this.resourceId = null;
    
    // Feature configuration
    this.config = {
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 5000
    };
  }

  /**
   * Initialize the feature with URL match data
   * @param {object} match - The URL match result containing capture groups
   */
  async onInit(match) {
    await super.onInit(match); // Always call parent method first
    
    // Extract data from URL match
    this.customer = match[1];
    this.resourceId = match[2];
    
    // Load feature configuration
    await this.loadFeatureConfig();
  }

  /**
   * Activate the feature - setup UI and operations
   */
  async onActivate() {
    await super.onActivate(); // Always call parent method first
    
    // Check if feature should be enabled
    const result = await this.getStorageSettings();
    if (!result.showButtons) {
      this.log('Feature disabled, skipping activation');
      return;
    }
    
    // Setup feature UI
    await this.createUI();
  }

  /**
   * Deactivate the feature - hide UI but keep state
   */
  onDeactivate() {
    super.onDeactivate(); // Always call parent method first
    // Hide UI elements
    this.hideUI();
  }

  /**
   * Clean up the feature - remove all elements and reset state
   */
  async onCleanup() {
    // Cleanup feature-specific resources
    this.removeUI();
    
    await super.onCleanup(); // Always call parent method last
  }

  /**
   * Handle feature-specific errors
   */
  onError(error, context) {
    super.onError(error, context);
    // Additional error handling if needed
  }
  
  /**
   * Get storage settings as a Promise
   * @returns {Promise<Object>}
   */
  getStorageSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['showButtons', 'myFeatureConfig'], resolve);
    });
  }
}
```

### Registering with FeatureManager

```javascript
// Create feature instance
const myFeature = new MyNewFeature();

// Initialize logger for this feature
const featureLogger = (() => {
  if (window.PowerCloudLoggerFactory) {
    return window.PowerCloudLoggerFactory.createLogger('MyNewFeature');
  }
  return {
    info: (message, data) => console.log(`[INFO][MyNewFeature] ${message}`, data || ''),
    warn: (message, data) => console.warn(`[WARN][MyNewFeature] ${message}`, data || ''),
    error: (message, data) => console.error(`[ERROR][MyNewFeature] ${message}`, data || '')
  };
})();

// Create namespace for PowerCloud features if it doesn't exist
window.PowerCloudFeatures = window.PowerCloudFeatures || {};

featureLogger.info('Registering my-new-feature');

// Register feature with backward compatibility pattern
window.PowerCloudFeatures.myNewFeature = {
  init: async (match) => {
    featureLogger.info('my-new-feature init called with match:', match);
    try {
      await myFeature.onInit(match);
      await myFeature.onActivate();
    } catch (error) {
      featureLogger.error('my-new-feature initialization error:', error);
      myFeature.onError(error, 'initialization');
    }
  },
  cleanup: async () => {
    featureLogger.info('my-new-feature cleanup called');
    try {
      await myFeature.onDeactivate();
      await myFeature.onCleanup();
    } catch (error) {
      featureLogger.error('my-new-feature cleanup error:', error);
      myFeature.onError(error, 'cleanup');
    }
  }
};

featureLogger.info('my-new-feature registered successfully');
```

## Migration Strategy

The BaseFeature class is designed for **gradual adoption**. Existing features can continue to work without modification, while new features or refactored features can benefit from the standardized structure.

### Option 1: Extend BaseFeature (Recommended for new features)
```javascript
class AdyenCardFeature extends BaseFeature {
  // Implementation using BaseFeature
}
```

### Option 2: Use BaseFeature utilities (For existing features)
```javascript
// In existing feature files, you can use BaseFeature utilities without full refactoring
function initCardFeature(match) {
  const baseFeature = new BaseFeature('adyen-card', { enableDebugLogging: true });
  baseFeature.log('Initializing card feature', { match });
  
  // Existing implementation
  // ...
}
```

## Lifecycle Hooks

### onInit(match)
- Called when the feature is first initialized with URL match data
- Receives URL match result containing capture groups from the URL pattern
- Should extract necessary data from the match (customer, resource IDs, etc.)
- Should load feature-specific configuration
- Sets `isInitialized` to true when successful
- **Always call `await super.onInit(match)` first**

### onActivate()
- Called when the feature becomes active on the current page
- Should check feature settings/permissions before proceeding
- Should setup UI elements and start feature operations
- Sets `isActive` to true when successful
- **Always call `await super.onActivate()` first**

### onDeactivate()
- Called when the feature should become inactive (page change, settings change)
- Should hide UI elements but preserve state for potential reactivation
- Sets `isActive` to false
- **Always call `super.onDeactivate()` first**

### onCleanup()
- Called when the feature is completely removed/destroyed
- Should remove all UI elements and clean up resources
- Should reset all feature state
- Sets `isInitialized` and `isActive` to false
- **Always call `await super.onCleanup()` last**

### Error Handling

#### onError(error, context)
- Called when an error occurs during feature operation
- Provides enhanced error reporting with feature context
- Integrates with the enhanced debugging system if available

#### handleError(message, error, additionalContext)
- Enhanced error handling method with better context
- Automatically includes feature state and performance metrics
- Recommended for most error handling scenarios

```javascript
// Example error handling
try {
  await this.performComplexOperation();
} catch (error) {
  this.handleError('Complex operation failed', error, {
    operationType: 'data-fetch',
    customer: this.customer,
    retryAttempt: this.currentRetry
  });
}
```

## Utility Methods

### Logging and Debugging
```javascript
// Debug logging (only logs if enableDebugLogging is true)
this.log('Debug message', { additionalData });

// Direct logger access for all log levels
this.logger.info('Information message');
this.logger.warn('Warning message');
this.logger.error('Error message');
```

### State Management
```javascript
// Check feature state
const isActive = this.getIsActive();
const isInitialized = this.getIsInitialized();

// Performance and health monitoring
const metrics = this.getPerformanceMetrics();
const health = this.getHealthStatus();
```

### DOM Element Management
```javascript
// Work with host element (if hostElementId is configured)
const hostElement = this.getHostElement();
this.removeHostElement(); // Utility for cleanup
```

### Storage Access Pattern
```javascript
// Consistent storage access pattern used across features
getStorageSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['showButtons', 'featureConfig'], resolve);
  });
}

// Usage in feature methods
const settings = await this.getStorageSettings();
if (!settings.showButtons) {
  this.log('Feature disabled by settings');
  return;
}
```

## Configuration and Settings

### Feature Configuration Pattern
```javascript
class MyFeature extends BaseFeature {
  constructor() {
    super('my-feature', { enableDebugLogging: false });
    
    // Feature-specific configuration with defaults
    this.config = {
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 5000,
      autoRetryOnFailure: true
    };
  }
  
  async loadFeatureConfig() {
    try {
      const result = await this.getStorageSettings();
      
      // Merge with default config
      if (result.myFeatureConfig) {
        this.config = { ...this.config, ...result.myFeatureConfig };
      }
      
      this.log('Feature configuration loaded', { config: this.config });
    } catch (error) {
      this.handleError('Failed to load feature configuration', error);
    }
  }
}
```

## Performance and Monitoring

The BaseFeature class automatically tracks:
- Initialization time
- Activation time  
- Cleanup time
- Memory usage (if available)
- Error frequency and context

Access this data through:
```javascript
const metrics = this.getPerformanceMetrics();
const health = this.getHealthStatus();
```

## Best Practices

1. **Always call parent methods**: When overriding lifecycle hooks, call `super.methodName()` at the appropriate time (first for init/activate, last for cleanup)

2. **Use structured logging**: Include relevant context in log messages for better debugging

3. **Handle errors gracefully**: Use `handleError()` for consistent error reporting with context

4. **Feature instance management**: Create a single instance per feature and reuse it in the registration pattern

5. **Async/await patterns**: Use proper async/await patterns for all asynchronous operations

6. **Storage access**: Use the consistent storage access pattern for Chrome extension storage

## Testing and Validation

### Development Testing
1. Set `enableDebugLogging: true` during development
2. Monitor Chrome DevTools console for initialization and lifecycle logs
3. Verify performance metrics are reasonable
4. Test error scenarios to ensure proper error handling

### Integration Testing
```javascript
// Test feature lifecycle
const feature = new MyFeature();
await feature.onInit(mockMatch);
await feature.onActivate();
expect(feature.getIsActive()).toBe(true);
await feature.onCleanup();
expect(feature.getIsInitialized()).toBe(false);
```
