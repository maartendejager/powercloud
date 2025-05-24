/**
 * Example: How to migrate an existing feature to use BaseFeature
 * This shows the before/after comparison and migration pattern
 */

// BEFORE: Traditional feature pattern (example from existing codebase)
/*
const MyFeature = {
  init: function(match) {
    console.log('MyFeature initialized');
    this.setupUI();
  },
  
  cleanup: function() {
    console.log('MyFeature cleaned up');
    this.removeUI();
  },
  
  setupUI: function() {
    // UI setup code
  },
  
  removeUI: function() {
    // UI cleanup code
  }
};
*/

// AFTER: Using BaseFeature class
class MyFeature extends BaseFeature {
  constructor() {
    super('myFeature', {
      hostElementId: 'powercloud-myfeature-host',
      enableDebugLogging: false // Set to true for development
    });
  }

  onInit(match) {
    super.onInit(match); // Call parent method for logging and state management
    this.setupUI();
  }

  onCleanup() {
    this.removeUI();
    super.onCleanup(); // Call parent method for state management
  }

  onActivate() {
    super.onActivate(); // Call parent method for state management
    // Additional activation logic if needed
  }

  onDeactivate() {
    super.onDeactivate(); // Call parent method for state management
    // Additional deactivation logic if needed
  }

  setupUI() {
    // UI setup code (same as before)
    // Now with automatic error handling via createFeatureRegistration()
  }

  removeUI() {
    // UI cleanup code (same as before)
    // Now with automatic error handling via createFeatureRegistration()
  }
}

// Usage in FeatureManager (backward compatible)
const myFeatureInstance = new MyFeature();

// Register with FeatureManager using the compatibility method
FeatureManager.register(
  'myFeature',
  ['*://*.spend.cloud/*'],
  myFeatureInstance.createFeatureRegistration()
);

// OR: For gradual migration, you can still use object syntax:
// FeatureManager.register('myFeature', ['*://*.spend.cloud/*'], {
//   init: (match) => myFeatureInstance.onInit(match),
//   cleanup: () => myFeatureInstance.onCleanup()
// });

/**
 * Migration Benefits:
 * 
 * 1. Standardized structure and lifecycle
 * 2. Built-in error handling with context
 * 3. Debug logging capabilities
 * 4. State tracking (isInitialized, isActive)
 * 5. Utility methods (getHostElement, removeHostElement)
 * 6. Full backward compatibility with existing FeatureManager
 * 7. Easy testing with createFeatureRegistration()
 * 
 * Migration Strategy:
 * 
 * 1. Start with new features using BaseFeature
 * 2. Gradually migrate existing features one at a time
 * 3. Test thoroughly after each migration
 * 4. Keep existing features working during transition
 */
