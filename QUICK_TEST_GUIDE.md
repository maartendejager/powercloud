# Quick Test Guide - Adyen Features Fix Validation

## 🚀 How to Test the Fixes

### **1. Quick Console Test**
Copy and paste this into browser console on any PowerCloud page:
```javascript
// Load and run the final validation test
const script = document.createElement('script');
script.src = chrome.runtime.getURL('testing/final-validation-test.js');
document.head.appendChild(script);
```

### **2. Manual Feature Testing**

#### Test Card Feature
1. Navigate to: `https://[customer].spend.cloud/cards/[card-id]`
2. **Expected**: Button appears saying "View Card in Adyen"
3. **Click Button**: Should open Adyen payment instrument page
4. **Console Check**: Look for response structure detection logs

#### Test Book Feature  
1. Navigate to: `https://[customer].spend.cloud/books/[book-id]`
2. **Expected**: Button appears saying "View Book in Adyen" 
3. **Click Button**: Should open Adyen balance account page with correct BA_... ID
4. **Console Check**: Look for response structure detection logs and balance account ID separation
5. **Quick Console Test**: Copy and paste from `/testing/book-feature-console-test.js`

#### Test Entries Feature
1. Navigate to: `https://[customer].spend.cloud/proactive/kasboek.boekingen/show?id=[entry-id]`
2. **Expected**: Button appears (enabled if transfer ID exists, disabled if not)
3. **Click Button**: Should open Adyen transfer page (if enabled)
4. **Console Check**: Look for response structure detection logs

### **3. Response Structure Testing**
Use the response structure test script for detailed API analysis:
```javascript
// Copy contents of /testing/response-structure-test.js into console
// while on a card, book, or entries page
```

## 🔍 What to Look For

### **✅ Success Indicators**
- Buttons appear on appropriate pages
- No "no balance account" errors when data exists
- No "no transfer id" errors when data exists  
- Console logs show response structure detection
- Adyen URLs open correctly

### **🔍 Console Debug Messages**
Look for these console messages:

**Card Feature**:
- `[PowerCloud] Card API response structure: { hasPaymentInstrumentId: true, usingFallback: false }`
- `[PowerCloud] Opening Adyen payment instrument: PI_...`

**Book Feature**:  
- `[PowerCloud] Book API response structure: { hasAdyenBalanceAccountId: true, usingFallback: false }`
- `[PowerCloud] Opening Adyen balance account: { adyenBalanceAccountId: "BA_..." }`
- ⚠️ **Important**: Check that `adyenBalanceAccountId` starts with "BA_" not just "1" or another internal ID

**Entries Feature**:
- `[PowerCloud] Entries API response structure: { hasAdyenTransferId: true, transferIdLocation: "..." }`
- `[PowerCloud] Opening Adyen transfer: TR_...`
```
[PowerCloud] Using old format: [value]
[PowerCloud] Using new format: [value]  
[PowerCloud] Book API response structure: {...}
[PowerCloud] Entry details processing result: {...}
```

### **❌ Fixed Error Messages**
These should no longer appear when data is available:
- "No Adyen Balance Account ID found for this book"
- "No Adyen Transfer ID found for this entry"

## 📋 Quick Checklist

- [ ] Card buttons appear on card pages
- [ ] Book buttons appear on book pages  
- [ ] Entry buttons appear on entry pages
- [ ] Buttons have correct enabled/disabled state
- [ ] Clicking opens correct Adyen URLs
- [ ] Console shows response structure detection
- [ ] No false "no data" errors
- [ ] Features work on both dev and production environments

## 🆘 If Issues Persist

1. **Check Browser Console** for error messages
2. **Verify Extension Loaded** - check chrome://extensions/
3. **Test API Responses** using response-structure-test.js
4. **Enable Debug Logging** in feature configs
5. **Check Network Tab** for API call failures

## 📁 Test Scripts Available

- `/testing/final-validation-test.js` - Logic validation (no API calls)
- `/testing/response-structure-test.js` - Live API response testing  
- `/testing/quick-console-test.js` - Basic feature registration test
- `/testing/adyen-features-test.js` - Comprehensive feature testing

---

**Status**: All fixes implemented and validated ✅  
**Ready for**: Production testing and user validation

# Quick Test Guide - PowerCloud Extension

## 🚀 Latest Feature: Page Actions (Always Available Buttons)

### **NEW: Page Actions Tab Testing**
The extension now includes a **Page Actions** tab that provides access to all functionality regardless of the "Show buttons on pages" toggle.

#### Quick Test Steps:
1. **Load Extension**: Go to `chrome://extensions/` → Load unpacked → Select PowerCloud folder
2. **Navigate to any spend.cloud page** (card, book, or entries)
3. **Click PowerCloud extension icon**
4. **Verify**: Page Actions tab is active by default (leftmost tab)
5. **Test**: Action buttons work regardless of toggle setting

#### Expected Results:
- ✅ Page Actions tab is default and leftmost
- ✅ Page context auto-detected (shows customer and ID)
- ✅ Appropriate action buttons appear
- ✅ Buttons work when page toggle is OFF
- ✅ Success/error messages display properly

---

## 🔧 Legacy Testing (Adyen Features Fix Validation)

## 🚀 How to Test the Fixes

### **1. Quick Console Test**
Copy and paste this into browser console on any PowerCloud page:
```javascript
// Load and run the final validation test
const script = document.createElement('script');
script.src = chrome.runtime.getURL('testing/final-validation-test.js');
document.head.appendChild(script);
```

### **2. Manual Feature Testing**

#### Test Card Feature
1. Navigate to: `https://[customer].spend.cloud/cards/[card-id]`
2. **Expected**: Button appears saying "View Card in Adyen"
3. **Click Button**: Should open Adyen payment instrument page
4. **Console Check**: Look for response structure detection logs

#### Test Book Feature  
1. Navigate to: `https://[customer].spend.cloud/books/[book-id]`
2. **Expected**: Button appears saying "View Book in Adyen" 
3. **Click Button**: Should open Adyen balance account page with correct BA_... ID
4. **Console Check**: Look for response structure detection logs and balance account ID separation
5. **Quick Console Test**: Copy and paste from `/testing/book-feature-console-test.js`

#### Test Entries Feature
1. Navigate to: `https://[customer].spend.cloud/proactive/kasboek.boekingen/show?id=[entry-id]`
2. **Expected**: Button appears (enabled if transfer ID exists, disabled if not)
3. **Click Button**: Should open Adyen transfer page (if enabled)
4. **Console Check**: Look for response structure detection logs

### **3. Response Structure Testing**
Use the response structure test script for detailed API analysis:
```javascript
// Copy contents of /testing/response-structure-test.js into console
// while on a card, book, or entries page
```

## 🔍 What to Look For

### **✅ Success Indicators**
- Buttons appear on appropriate pages
- No "no balance account" errors when data exists
- No "no transfer id" errors when data exists  
- Console logs show response structure detection
- Adyen URLs open correctly

### **🔍 Console Debug Messages**
Look for these console messages:

**Card Feature**:
- `[PowerCloud] Card API response structure: { hasPaymentInstrumentId: true, usingFallback: false }`
- `[PowerCloud] Opening Adyen payment instrument: PI_...`

**Book Feature**:  
- `[PowerCloud] Book API response structure: { hasAdyenBalanceAccountId: true, usingFallback: false }`
- `[PowerCloud] Opening Adyen balance account: { adyenBalanceAccountId: "BA_..." }`
- ⚠️ **Important**: Check that `adyenBalanceAccountId` starts with "BA_" not just "1" or another internal ID

**Entries Feature**:
- `[PowerCloud] Entries API response structure: { hasAdyenTransferId: true, transferIdLocation: "..." }`
- `[PowerCloud] Opening Adyen transfer: TR_...`
```
[PowerCloud] Using old format: [value]
[PowerCloud] Using new format: [value]  
[PowerCloud] Book API response structure: {...}
[PowerCloud] Entry details processing result: {...}
```

### **❌ Fixed Error Messages**
These should no longer appear when data is available:
- "No Adyen Balance Account ID found for this book"
- "No Adyen Transfer ID found for this entry"

## 📋 Quick Checklist

- [ ] Card buttons appear on card pages
- [ ] Book buttons appear on book pages  
- [ ] Entry buttons appear on entry pages
- [ ] Buttons have correct enabled/disabled state
- [ ] Clicking opens correct Adyen URLs
- [ ] Console shows response structure detection
- [ ] No false "no data" errors
- [ ] Features work on both dev and production environments

## 🆘 If Issues Persist

1. **Check Browser Console** for error messages
2. **Verify Extension Loaded** - check chrome://extensions/
3. **Test API Responses** using response-structure-test.js
4. **Enable Debug Logging** in feature configs
5. **Check Network Tab** for API call failures

## 📁 Test Scripts Available

- `/testing/final-validation-test.js` - Logic validation (no API calls)
- `/testing/response-structure-test.js` - Live API response testing  
- `/testing/quick-console-test.js` - Basic feature registration test
- `/testing/adyen-features-test.js` - Comprehensive feature testing

---

**Status**: All fixes implemented and validated ✅  
**Ready for**: Production testing and user validation
