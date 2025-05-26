# Popup.js DOM Event Listener Fix

## Issue
The PowerCloud extension was experiencing a JavaScript error in popup.js: 
```
Uncaught TypeError: Cannot read properties of null (reading 'addEventListener')
```

The error occurred at popup.js:315 where the code was attempting to add an event listener to the "delete-all-tokens-btn" element before the DOM was fully loaded.

## Root Cause
The event listeners for several DOM elements were being attached outside of the DOMContentLoaded event handler. This meant that the JavaScript was trying to access and add event listeners to DOM elements that didn't exist yet in the document.

Specifically, the following elements had event listeners attached outside of the DOMContentLoaded event:
- delete-all-tokens-btn
- tokens-tab
- actions-tab
- health-tab

## Fix Implemented
1. Moved all event listeners that were outside the DOMContentLoaded handler inside it to ensure they are only attached after the DOM is fully loaded.

2. Added null checks for each element before attaching event listeners to improve error handling:
   ```javascript
   const deleteAllTokensBtn = document.getElementById('delete-all-tokens-btn');
   if (deleteAllTokensBtn) {
     deleteAllTokensBtn.addEventListener('click', () => {
       // Event handler code
     });
   } else {
     console.error('Delete All Tokens button not found in the DOM');
   }
   ```

3. Similar checks were added for other tab navigation elements.

## Best Practices Applied
1. **Wait for DOM to Load**: Always attach event listeners inside the DOMContentLoaded event to ensure the DOM elements exist.

2. **Defensive Programming**: Added null checks before accessing DOM elements to prevent errors if elements don't exist.

3. **Error Logging**: Added console.error messages to log when elements are not found, which helps with debugging.

## Testing
After implementing these changes, the JavaScript error is no longer thrown and the "Delete All Tokens" button works as expected.
