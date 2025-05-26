# PowerCloud Extension - Page Actions Testing Guide

## 🎯 Implementation Summary

The PowerCloud extension has been successfully updated with the **Page Actions** feature that ensures extension buttons are always available in the popup, regardless of the "Show buttons on pages" toggle setting.

### ✅ Completed Features

1. **Page Actions Tab**: Now the default leftmost tab in the popup
2. **Always Available Buttons**: Extension functionality accessible regardless of toggle state
3. **Smart Page Detection**: Automatically detects card, book, and entries pages
4. **Real-time Results**: Shows success/error messages for all actions
5. **Independent Operation**: Popup buttons work independently from page-embedded buttons

## 🧪 Testing Instructions

### Step 1: Load the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **"Load unpacked"**
4. Select the `/home/maarten/projects/Extensions/PowerCloud` directory
5. Verify the PowerCloud extension appears in the list with no errors

### Step 2: Test Page Actions Tab

#### Navigate to Different Page Types:

**Card Pages:**
- `https://[customer].spend.cloud/cards/12345`
- `https://[customer].spend.cloud/proactive/data.card/single_card_update?id=67890`
- `https://[customer].spend.cloud/proactive/kasboek.passen/show?id=54321`

**Book Pages:**
- `https://[customer].spend.cloud/book/overview/12345`
- `https://[customer].spend.cloud/book/details/67890`

**Entries Pages:**
- `https://[customer].spend.cloud/entries/12345`
- `https://[customer].spend.cloud/entries/view/67890`

**Non-supported Pages:**
- `https://[customer].spend.cloud/dashboard`
- `https://[customer].spend.cloud/settings`

#### Expected Behavior:

1. **Click PowerCloud extension icon** → Popup opens
2. **Page Actions tab is active by default** (leftmost tab)
3. **Page context is detected automatically**:
   - Card pages show "Card page detected" with customer and card ID
   - Book pages show "Book page detected" with customer and book ID
   - Entries pages show "Entries page detected" with customer and entry ID
   - Other pages show "No supported page detected"

### Step 3: Test Button Functionality

#### On Card Pages:
1. Verify **"View Card in Adyen"** button appears
2. Click the button
3. Expected results:
   - Button shows "Loading..." temporarily
   - Success: Opens Adyen dashboard in new tab + "Opening card in Adyen dashboard..." message
   - Error: Shows appropriate error message (non-Adyen card, missing ID, etc.)

#### On Book Pages:
1. Verify **"View Balance Account in Adyen"** button appears
2. Click the button
3. Expected results:
   - Button shows "Loading..." temporarily
   - Success: Opens Adyen balance account in new tab
   - Error: Shows "No balance account ID found" message

#### On Entries Pages:
1. Verify **"View Transfer in Adyen"** button appears
2. Click the button
3. Expected results:
   - Button shows "Loading..." temporarily  
   - Success: Opens Adyen transfer details in new tab
   - Error: Shows "No transfer ID found" message

### Step 4: Test Toggle Independence

This is the **key feature** - buttons should work regardless of the toggle setting:

1. Go to **Auth Tokens** tab in popup
2. **Toggle OFF** "Show buttons on pages" 
3. **Return to Page Actions tab**
4. **Verify buttons still appear and work**
5. Navigate to different page types
6. **Confirm Page Actions functionality is unaffected**

### Step 5: Test Error Handling

#### Test Network Issues:
1. Disable internet connection temporarily
2. Try clicking action buttons
3. Verify appropriate error messages appear

#### Test Invalid Pages:
1. Navigate to non-existent card/book/entry IDs
2. Try clicking action buttons  
3. Verify proper error handling with user-friendly messages

## 🔍 What to Look For

### ✅ Success Indicators:
- Page Actions tab is leftmost and active by default
- Page context detection works automatically
- Action buttons appear based on page type
- Buttons work regardless of toggle state
- Success messages appear when actions complete
- Adyen links open in new tabs correctly

### ❌ Issues to Report:
- Page Actions tab not appearing or not default
- Page detection not working
- Buttons not appearing on supported pages
- Buttons affected by "Show buttons on pages" toggle
- Error messages not appearing
- Adyen links not opening
- JavaScript console errors

## 🐛 Debugging Tips

### Check Browser Console:
1. Open Developer Tools (F12)
2. Go to **Console** tab
3. Look for PowerCloud-related messages
4. Report any errors or warnings

### Check Extension Console:
1. Go to `chrome://extensions/`
2. Find PowerCloud extension
3. Click **"Inspect views: service worker"**
4. Check for background script errors

### Test Different Customers:
Try with different customer subdomains to ensure URL patterns work correctly.

## 📋 Test Results Checklist

Please test each item and mark as ✅ or ❌:

- [ ] Extension loads without errors
- [ ] Page Actions is default active tab
- [ ] Page Actions is leftmost tab
- [ ] Card page detection works
- [ ] Book page detection works
- [ ] Entries page detection works
- [ ] "No actions" message shows on unsupported pages
- [ ] Card action button works
- [ ] Book action button works
- [ ] Entries action button works
- [ ] Success messages appear correctly
- [ ] Error messages appear for failures
- [ ] Buttons work with toggle OFF
- [ ] Buttons work with toggle ON
- [ ] Loading states show during processing
- [ ] Adyen URLs open in new tabs

## 🎯 Key Success Criteria

The implementation is successful if:

1. **Page Actions tab is the default and leftmost tab**
2. **Extension buttons always work in popup regardless of toggle setting**
3. **Page context is automatically detected and displayed**
4. **All action buttons work and show appropriate feedback**
5. **Error handling provides clear user feedback**

---

**Ready to test!** Follow the steps above and report any issues you encounter. The implementation should provide a seamless experience where extension functionality is always accessible through the popup interface.
