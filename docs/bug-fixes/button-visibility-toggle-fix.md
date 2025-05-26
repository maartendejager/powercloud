# Button Visibility Toggle Fix

## Issues
### Issue 1: Connection Error
The "Show buttons on page" toggle in the extension popup was triggering an error when toggled:
```
Uncaught (in promise) Error: Could not establish connection. Receiving end does not exist.
```

This happened because the toggle was trying to send a message to tabs that didn't have the content script running yet, or to tabs that didn't match the URL patterns where the extension should run.

### Issue 2: Visibility Not Updating
After fixing the error message, a second issue was discovered: toggling the button didn't immediately affect button visibility on the page. This was caused by the new architecture where buttons now live inside a `PowerCloudButtonContainer` with shadow DOM rather than directly in the `powercloud-shadow-host` element.

## Fix Implemented

### 1. Error Handling in Popup Toggle
Added robust error handling to the toggle button's event listener in `popup.js`:
- Wrapped the `sendMessage` calls in try-catch blocks
- Added callback handling for `chrome.runtime.lastError`
- Added console logging for better debugging
- Added visual feedback when toggling visibility

### 2. Enhanced UI Visibility Manager
Improved the UI visibility manager in the content script:
- Created a shared `updateButtonVisibility()` function to handle multiple container types
- Added a MutationObserver to detect when containers are added to the DOM
- Added better error handling in the message listener
- Added state storage to handle cases when DOM elements aren't ready
- Enhanced CSS selectors to target both legacy and new container elements

### 3. PowerCloudButtonManager Updates
Added visibility handling to the PowerCloudButtonManager:
- Added `applyVisibilitySettings()` method to check and apply current settings
- Added `updateVisibility()` method to toggle container visibility
- Enhanced initialization to respect stored visibility settings
- Added visibility styles to the shadow DOM

### 4. CSS Improvements
Enhanced visibility CSS rules:
- Added `!important` to ensure visibility rules take precedence
- Added selectors to target shadow DOM content
- Added rules to handle parent-child visibility inheritance

## Code Examples

### UI Visibility Manager Update
```javascript
/**
 * Update button visibility for all container types
 * @param {boolean} isVisible - Whether buttons should be visible
 * @returns {boolean} Whether any containers were updated
 */
function updateButtonVisibility(isVisible) {
  let updated = false;
  
  // 1. Legacy container
  const buttonHost = document.getElementById('powercloud-shadow-host');
  if (buttonHost) {
    buttonHost.className = isVisible ? 'powercloud-visible' : 'powercloud-hidden';
    updated = true;
  }
  
  // 2. New container (direct element)
  const buttonContainer = document.getElementById('powercloud-button-container');
  if (buttonContainer) {
    buttonContainer.className = isVisible ? 'powercloud-button-container powercloud-visible' : 'powercloud-button-container powercloud-hidden';
    updated = true;
  }
  
  // 3. If PowerCloudButtonManager is available, use its updateVisibility method
  if (window.PowerCloudButtonManager?.instance) {
    if (typeof window.PowerCloudButtonManager.instance.updateVisibility === 'function') {
      const managerUpdated = window.PowerCloudButtonManager.instance.updateVisibility(isVisible);
      if (managerUpdated) updated = true;
    }
  }
  
  return updated;
}
```

### PowerCloudButtonManager Visibility Method
```javascript
/**
 * Update the visibility of all buttons
 * @param {boolean} isVisible - Whether buttons should be visible
 * @returns {boolean} Whether the update was successful
 */
updateVisibility(isVisible) {
    if (!this.initialized || !this.container || !this.container.element) {
        return false;
    }
    
    try {
        this.container.element.className = isVisible ? 
            'powercloud-button-container powercloud-visible' : 
            'powercloud-button-container powercloud-hidden';
            
        console.log(`[PowerCloudButtonManager] Visibility updated: ${isVisible ? 'visible' : 'hidden'}`);
        return true;
    } catch (error) {
        console.error('[PowerCloudButtonManager] Error updating visibility:', error);
        return false;
    }
}
```

### Enhanced CSS Rules
```css
/* Visibility classes */
.powercloud-visible {
    display: block !important;
}

.powercloud-hidden {
    display: none !important;
}

/* Target buttons inside the container when container is hidden/visible */
.powercloud-button-container.powercloud-visible {
    display: block !important;
}

.powercloud-button-container.powercloud-hidden {
    display: none !important;
}

/* Make sure shadow DOM buttons respect visibility */
.powercloud-button-container.powercloud-hidden .powercloud-buttons-wrapper,
.powercloud-hidden .powercloud-button-container {
    display: none !important;
}
```

## Testing Notes

To verify the fix:
1. Toggle "Show buttons on page" in the popup
2. No errors should appear in the console
3. The toggle state should be saved properly
4. Buttons should appear/disappear on valid pages
5. The toggle should work without errors even on non-spend.cloud pages

## Technical Implementation Detail

The key improvements are:
1. Error handling around message sending
2. State persistence in the UI visibility manager
3. Graceful degradation when elements aren't available
4. Proper initialization sequence with defensive coding

This ensures that the toggle works reliably and doesn't throw errors regardless of which page the user is currently viewing.
