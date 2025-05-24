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
      hostElementId: 'powercloud-mynewfeature-host',
      enableDebugLogging: true // Enable for development
    });
  }

  onInit(match) {
    super.onInit(match); // Call parent method
    // Your initialization code here
    this.extractDataFromMatch(match);
  }

  onActivate() {
    super.onActivate();
    // Your activation code here
    this.createUI();
  }

  onDeactivate() {
    super.onDeactivate();
    // Your deactivation code here
    this.hideUI();
  }

  onCleanup() {
    super.onCleanup();
    // Your cleanup code here
    this.removeHostElement(); // Utility method from BaseFeature
  }

  onError(error, context) {
    super.onError(error, context);
    // Additional error handling if needed
  }
}
```

### Registering with FeatureManager

```javascript
// Create feature instance
const myFeature = new MyNewFeature();

// Register with PowerCloudFeatures namespace (maintains compatibility)
window.PowerCloudFeatures = window.PowerCloudFeatures || {};
window.PowerCloudFeatures.myNewFeature = myFeature.createFeatureRegistration();
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
- Called when the feature is first initialized
- Receives URL match data from FeatureManager
- Sets `isInitialized` to true

### onActivate()
- Called when the feature becomes active on the current page
- Sets `isActive` to true
- Good place to create UI elements

### onDeactivate()
- Called when the feature becomes inactive (page change, etc.)
- Sets `isActive` to false
- Good place to hide UI elements

### onCleanup()
- Called when the feature is being cleaned up
- Sets both `isInitialized` and `isActive` to false
- Good place to remove UI elements and event listeners

### onError(error, context)
- Called when an error occurs during feature operation
- Provides consistent error logging
- Can be overridden for custom error handling

## Utility Methods

### Logging
- `log(message, data)` - Logs messages when debug logging is enabled
- Helps with development and troubleshooting

### State Checking
- `getIsActive()` - Returns whether the feature is currently active
- `getIsInitialized()` - Returns whether the feature has been initialized

### Element Management
- `getHostElement()` - Returns the feature's host DOM element
- `removeHostElement()` - Safely removes the feature's host element

## Best Practices

1. **Always call parent methods**: When overriding lifecycle hooks, call `super.methodName()` to maintain state consistency

2. **Use debug logging during development**: Enable `enableDebugLogging` option during development for better visibility

3. **Handle errors gracefully**: Override `onError` method for custom error handling specific to your feature

4. **Maintain backward compatibility**: Use `createFeatureRegistration()` to ensure compatibility with existing FeatureManager

## Testing the Implementation

After implementing this BaseFeature class:

1. **Load the extension** and verify no console errors appear
2. **Navigate to feature pages** and confirm existing functionality works
3. **Check browser console** for any loading issues
4. **Test feature activation/deactivation** by navigating between pages

The BaseFeature class is designed to be **non-breaking**. Existing features should continue to work exactly as before, while providing a foundation for future improvements.
