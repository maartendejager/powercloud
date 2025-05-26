# Manual Test Procedure for "View Card Book" Feature

This document provides a manual testing procedure for the "View Card Book" feature implemented in the PowerCloud Chrome extension.

## Prerequisites

1. PowerCloud Chrome extension installed
2. Access to spend.cloud accounts with valid credentials
3. Access to both production and development environments
4. Cards with and without linked books for testing

## Test Cases

### 1. Basic Functionality - Standard Card Page

- **URL**: `https://[customer].spend.cloud/cards/[card-id]/*`
- **Expected**: "View Card Book" button appears next to "View in Adyen" button
- **Steps**:
  1. Navigate to a card page
  2. Verify both buttons appear in the bottom-right corner
  3. Click "View Card Book" button
  4. Verify it opens a new tab with the correct book URL for the current month/year
  5. Verify URL format is `https://[customer].spend.cloud/proactive/kasboek.boekingen/[book-id]/MM-YYYY`

### 2. Basic Functionality - Development Environment

- **URL**: `https://[customer].dev.spend.cloud/cards/[card-id]/*`
- **Expected**: Same as above but for development environment
- **Steps**: Same as Test Case 1 but on development environment

### 3. Card with No Linked Book

## Troubleshooting Guide

If the "View Card Book" button doesn't appear, here are steps to diagnose and fix the issue:

### 1. Verify Feature Loading

- Open Chrome DevTools (F12)
- Check the console for `[DEBUG][ViewCardBook]` messages
- Verify the message "ViewCardBook feature registered with PowerCloudFeatures" appears
- If not, there might be a script loading or initialization issue

### 2. Inspect Card Data

- Look for messages containing "Card data structure"
- Check if any of these messages show a successful book ID extraction
- The message "Book ID found: [id]" should appear if extraction was successful
- If not, the card data structure might not contain book information in the expected format

### 3. Examine Button Creation

- Check for "Button creation completed successfully" message
- If the button should exist but isn't visible, inspect the DOM:
  - Check for element with ID `powercloud-book-shadow-host`
  - Verify it has the correct positioning styles

### 4. Common Issues and Solutions

1. **Book ID not found in card data**: 
   - Add console.log to view raw card data structure
   - Update `extractBookId` method to handle the actual data structure

2. **Button created but not visible**:
   - Check z-index (should be 9999)
   - Check position values (fixed, right: 85px, bottom: 20px)

3. **BaseFeature not loaded**:
   - Check script loading order in manifest.json

4. **Initialization errors**:
   - Look for error messages with the format: `[ERROR][ViewCardBook]`
   - Follow the stack trace to identify the source of the error

- **URL**: Any card page with a card that doesn't have a linked book
- **Expected**: No "View Card Book" button appears
- **Steps**:
  1. Navigate to a card page where the card has no linked book
  2. Verify only the "View in Adyen" button appears (if applicable)
  3. Verify no "View Card Book" button is present

### 4. Alternative Card Pages

Test on these URL patterns:
- `https://[customer].spend.cloud/proactive/data.card/single_card_update?id=[card-id]`
- `https://[customer].spend.cloud/proactive/kasboek.passen/show?id=[card-id]`

### 5. Error Cases

- **Scenario**: API fails to return card data or returns incomplete data
- **Expected**: No errors shown to user, button doesn't appear
- **Steps**:
  1. Simulate API failure (by temporarily disabling network, if possible)
  2. Navigate to card page
  3. Verify the application doesn't show errors
  4. Verify extension works normally after network restoration

### 6. Current Period Format

- **Expected**: URL should contain the current month and year in format `MM-YYYY`
- **Steps**:
  1. Navigate to a card with a linked book
  2. Click "View Card Book"
  3. Verify the opened URL contains the current month and year in the expected format
  4. For May 2025, it should be `05-2025` in the URL path

### 7. UI Tests

- **Expected**: Button should be green, properly styled, and positioned near the "View in Adyen" button
- **Steps**:
  1. Verify button has consistent styling with other extension buttons
  2. Verify button is positioned correctly
  3. Verify button text is clearly visible
  4. Test on different screen sizes/resolutions if possible

## Reporting Issues

If any issues are discovered during testing, please document:

1. The test case where the issue was found
2. Steps to reproduce
3. Expected vs. actual behavior
4. Environment details (browser version, OS, etc.)
5. Screenshots if applicable

Submit issues to the project's issue tracking system.
