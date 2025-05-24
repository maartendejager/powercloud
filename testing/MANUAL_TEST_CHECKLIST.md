# Adyen Features Manual Testing Checklist

## Pre-Test Setup
- [ ] Extension is loaded in Chrome (`chrome://extensions/`)
- [ ] Extension is enabled
- [ ] You're logged into PowerCloud
- [ ] Browser console is open (F12 → Console tab)

## Quick Console Test
1. **Copy and paste this into the browser console:**
   ```javascript
   // Load the quick test from the extension
   fetch(chrome.runtime.getURL('testing/quick-console-test.js'))
     .then(response => response.text())
     .then(script => eval(script))
     .catch(() => {
       // Fallback inline test
       console.log('Testing PowerCloud features...');
       console.log('PowerCloudFeatures:', typeof window.PowerCloudFeatures);
       console.log('Available features:', window.PowerCloudFeatures ? Object.keys(window.PowerCloudFeatures) : 'None');
       console.log('BaseFeature:', typeof window.BaseFeature);
       console.log('Current URL:', window.location.href);
       console.log('Shadow host:', !!document.getElementById('powercloud-shadow-host'));
     });
   ```

2. **Look for these success indicators:**
   - ✅ PowerCloudFeatures exists
   - ✅ card, book, entries features registered
   - ✅ BaseFeature available
   - ✅ Chrome APIs available

## Feature-Specific Testing

### Card Feature Test
1. **Navigate to a card page:**
   - URL pattern: `https://[customer].spend.cloud/cards/[card-id]/*`
   - Example: `https://demo.spend.cloud/cards/card123/details`

2. **Expected results:**
   - Console shows: "PowerCloud: Adyen Card feature registered successfully"
   - Console shows: "PowerCloud: Initializing Adyen Card feature"
   - A button appears on the page (either "View in Adyen" or "Card not in Adyen")
   - No "no balance account" errors

3. **Test button functionality:**
   - If button says "View in Adyen", click it
   - Should open Adyen page in new tab OR show appropriate error message
   - Should NOT show generic "no balance account" error

### Book Feature Test
1. **Navigate to a book page:**
   - URL pattern: `https://[customer].spend.cloud/book/[book-id]`
   - Example: `https://demo.spend.cloud/book/book456`

2. **Expected results:**
   - Console shows: "PowerCloud: Adyen Book feature registered successfully"
   - Console shows: "PowerCloud: Adyen Book feature activated"
   - A book feature button appears
   - Should show balance account information (not "no balance account")

### Entries Feature Test
1. **Navigate to an entries page:**
   - URL pattern: `https://[customer].spend.cloud/entries/[entry-id]`
   - Example: `https://demo.spend.cloud/entries/entry789`

2. **Expected results:**
   - Console shows: "PowerCloud: Adyen Entries feature registered successfully"
   - Console shows: "PowerCloud: Adyen Entries feature activated"
   - An entries feature button appears
   - Should show transfer ID information (not "no transfer id")

## Troubleshooting

### If no features are registered:
1. Check if extension is loaded: `chrome://extensions/`
2. Reload the extension
3. Refresh the PowerCloud page
4. Check console for JavaScript errors

### If features are registered but buttons don't appear:
1. Check console for initialization errors
2. Verify you're on the correct URL pattern
3. Check if buttons are hidden: 
   ```javascript
   chrome.storage.local.get('showButtons', (result) => {
     console.log('Show buttons setting:', result.showButtons);
   });
   ```

### If buttons show error messages:
1. Check network connectivity
2. Verify PowerCloud authentication
3. Check console for API errors
4. Try refreshing the page

### If BaseFeature is not available:
1. Check if `shared/base-feature.js` is loaded
2. Verify manifest.json includes the base feature script
3. Check for JavaScript errors preventing script loading

## Expected Console Output (Normal Operation)

```
[PowerCloud] Loading adyen-card.js...
[PowerCloud] BaseFeature available: true
[PowerCloud] BaseFeature is available, proceeding with AdyenCardFeature creation
[PowerCloud] Registering adyen-card feature
[PowerCloud] adyen-card feature registered successfully

[PowerCloud] Loading adyen-book.js...
[PowerCloud] BaseFeature available: true
[PowerCloud] Registering adyen-book feature
[PowerCloud] adyen-book feature registered successfully

[PowerCloud] Loading adyen-entries.js...
[PowerCloud] BaseFeature available: true
[PowerCloud] Registering adyen-entries feature
[PowerCloud] adyen-entries feature registered successfully

[PowerCloud] PowerCloudFeatures namespace initialized
[PowerCloud] Available features: card,book,entries
```

## Success Criteria
- [ ] All three features register successfully
- [ ] Buttons appear on appropriate pages
- [ ] No "no balance account" or "no transfer id" errors
- [ ] Clicking buttons performs expected actions
- [ ] Console shows proper initialization messages
- [ ] No JavaScript errors in console

## Failure Indicators
- ❌ PowerCloudFeatures namespace undefined
- ❌ Features not registered
- ❌ BaseFeature not available
- ❌ JavaScript errors in console
- ❌ Buttons showing generic error messages
- ❌ Buttons not appearing on correct pages
