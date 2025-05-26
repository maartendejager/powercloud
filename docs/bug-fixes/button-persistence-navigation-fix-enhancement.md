# Button Persistence During Navigation - Enhanced Fix

## Problem Description

Even after implementing the initial fix for button persistence during page navigation (documented in `button-persistence-navigation-fix.md`), buttons were still not being properly removed when navigating from supported pages to unsupported pages. Two key issues were identified:

1. The `uiVisibilityManager` feature's URL pattern (`/.*\.spend\.cloud.*|.*\.dev\.spend\.cloud.*/`) matches ALL spend.cloud domains, causing `runFeatureCheck()` to always find a matching feature, preventing button cleanup.

2. Potential conflicts between the UI visibility toggle mechanism and the navigation-based cleanup mechanism, as they use different approaches to handle button visibility.

## Solution Enhancements

### 1. Exclude Non-Button Features from Feature Matching

Modified `runFeatureCheck()` to filter out the `uiVisibilityManager` feature when checking for supported features:

```javascript
// Check if any feature (excluding uiVisibilityManager) matches the current URL
const matchesAnyButtonFeature = features.some(feature => {
  // Skip uiVisibilityManager when checking for features that add buttons
  if (feature.name === 'uiVisibilityManager') {
    return false;
  }
  return feature.urlPattern.test(currentUrl);
});

if (!matchesAnyButtonFeature) {
  // Clean up any UI elements if we're not on a supported page
  cleanupButtonContainer();
}
```

### 2. Enhanced SPA Navigation Detection

Extended the SPA navigation observer to detect more types of navigation changes:

```javascript
// Store multiple URL components to detect different types of navigation
let lastUrl = window.location.href;
let lastPathname = window.location.pathname;
let lastSearch = window.location.search;

// Check for various types of URL changes
const urlChanged = lastUrl !== currentUrl;
const pathnameChanged = lastPathname !== currentPathname;
const searchChanged = lastSearch !== currentSearch;

if (urlChanged || pathnameChanged || searchChanged) {
  // Navigation detected, update URL tracking and run cleanup check
  // ...
}
```

### 3. More Robust Button Container Cleanup

Improved the `cleanupButtonContainer()` function with multiple cleanup strategies:

```javascript
// Method 1: Use PowerCloudButtonManager cleanup
if (window.PowerCloudButtonManager?.instance) {
  window.PowerCloudButtonManager.instance.cleanup();
  // Force instance reset to null to prevent singleton persistence issues
  if (window.PowerCloudButtonManagerInstance) {
    window.PowerCloudButtonManagerInstance = null;
  }
}

// Method 2: Direct DOM removal (try multiple container types)
const containers = [
  document.getElementById('powercloud-button-container'),
  document.getElementById('powercloud-shadow-host'),
  document.querySelector('.powercloud-button-container')
].filter(Boolean);

// Method 3: Clean up global PowerCloud references
if (window.PowerCloudUI?.getButtonManager) {
  try {
    const manager = window.PowerCloudUI.getButtonManager();
    if (manager && manager.cleanup) {
      manager.cleanup();
    }
  } catch (err) {
    // Ignore errors with manager cleanup
  }
}
```

### 4. Better Integration with UI Visibility Manager

Updated the UI visibility manager to work more cooperatively with the navigation cleanup mechanism:

```javascript
// If hiding buttons completely (isVisible = false), simply call the main cleanup function
if (!isVisible && typeof window.cleanupButtonContainer === 'function') {
  try {
    // Use the main cleanup function for complete removal
    window.cleanupButtonContainer();
    return true;
  } catch (err) {
    // Fall through to traditional visibility methods
  }
}
```

## Benefits

1. Buttons now properly disappear when navigating from supported to unsupported pages
2. The UI visibility toggle and navigation cleanup systems work together instead of conflicting
3. Enhanced navigation detection handles more edge cases and SPA frameworks
4. More robust cleanup logic with multiple strategies increases reliability

## Testing

Test by:
1. Navigate to a supported page (e.g., card page) where buttons appear
2. Navigate to an unsupported page and verify buttons disappear
3. Test with both normal navigation and SPA-style navigation
4. Test with the visibility toggle feature (buttons should remain hidden if they were hidden before navigation)
