# Quick Test Guide for Button ID Conflict Fix

## Issue Fixed
**Error**: `[PowerCloudButtonContainer] Button with id 'card' already exists`
**When**: Navigating from entry page to card page via "View Card Details" button

## Root Cause
The PowerCloudButtonManager was accidentally overwriting namespaced button IDs due to incorrect use of the spread operator.

## Fix Applied
Modified `shared/ui-components.js` line ~1141 to properly exclude the original button ID from the spread operation, ensuring namespaced IDs are preserved.

## Testing Steps

### 1. Test the Original Issue
1. Navigate to an entry page: `https://[customer].spend.cloud/proactive/kasboek.boekingen/show?id=[entry-id]`
2. Click "View Card Details" button (if available)
3. Navigate to the card page
4. **Expected**: No error in console, buttons should appear correctly

### 2. Test Multiple Buttons
1. Navigate to a card page that has both:
   - "View in Adyen" button (from adyen-card feature)
   - "View Card Book" button (from view-card-book feature)
2. **Expected**: Both buttons should appear without conflicts

### 3. Test Navigation Flow
1. Start on entry page → navigate to card page → navigate back/forward
2. **Expected**: Clean navigation without button persistence errors

## Success Criteria
- ✅ No "[PowerCloudButtonContainer] Button with id 'card' already exists" errors
- ✅ All buttons function correctly
- ✅ Clean navigation between pages
- ✅ No duplicate or conflicting buttons

## If Issues Persist
Check browser console for any new errors and compare with the documentation in:
- `docs/bug-fixes/button-id-conflict-fix.md`
- `validate-button-id-fix.cjs` output
