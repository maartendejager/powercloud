# PowerCloud Extension Bug Fixes

## Bug: Duplicate URL Patterns Declaration

### Description
When running the extension on development domains such as `https://legerdesheils.dev.spend.cloud/cards/2821/settings`, the following error was encountered:

```
Uncaught SyntaxError: Identifier 'urlPatterns' has already been declared
```

The error occurred in `content_scripts/features/adyen-book.js`, indicating that the `urlPatterns` variable was being declared multiple times.

### Root Cause Analysis
The bug was occurring because multiple content scripts were loaded in the same global context, each declaring their own `let urlPatterns = null`. Since JavaScript variables declared with `let` have block scope, redeclaring the same variable name in the same scope causes a SyntaxError.

This was happening because:
1. All content scripts are loaded via manifest.json in the same context
2. Multiple scripts were using the same variable name in global scope
3. Each script was independently trying to import the shared URL patterns module

### Fix Applied
The fix was to namespace all URL pattern imports under the `window.PowerCloudFeatures` object to avoid conflicts:

1. In `adyen-book.js`, `adyen-card.js`, and `token-detector.js`:
   - Changed from using a global `let urlPatterns = null` to using `window.PowerCloudFeatures[feature].urlPatterns`
   - Added safety checks to prevent duplicate initialization

2. In `main.js`:
   - Namespaced the URL patterns under `window.PowerCloudFeatures.main.urlPatterns`
   - Added safety check to prevent duplicate initialization

3. In `popup.js`:
   - Changed to using a local object `popupUrlPatterns` instead of a global variable
   - Updated all references to use this new object

4. Added `shared/url-patterns.js` to the `web_accessible_resources` in `manifest.json` to ensure it can be dynamically imported by content scripts.

### Testing
The fix should be tested by:
1. Loading the extension on development domains (`https://[customer].dev.spend.cloud/*`)
2. Verifying no JavaScript errors appear in the console
3. Checking that all features (token detection, card info, book info) work correctly
4. Testing on both domain formats for complete coverage

### Future Prevention
To prevent similar issues in the future:

1. **Namespace Pattern**: Always namespace variables that might be shared across multiple content scripts.
2. **Module Pattern**: Consider using the module pattern or ES modules where possible.
3. **Import Management**: Be careful with dynamic imports and ensure they are properly namespaced.
4. **Web Accessible Resources**: Always include shared modules in the web_accessible_resources section of manifest.json.
5. **Content Script Isolation**: Consider isolating content scripts by using different matches patterns in manifest.json when appropriate.

Date: May 21, 2025
