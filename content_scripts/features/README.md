# Feature Scripts

This directory contains modular features that are used by the PowerCloud extension.

## Script Loading

Feature scripts are loaded in one of two ways:

1. **Via manifest.json** (preferred method) - Scripts are declared in the `content_scripts` section of manifest.json, which ensures they're loaded before main.js runs.
   - Example: `adyen-card.js` is loaded this way

2. **Dynamically loaded** - Scripts can be loaded dynamically by main.js using the `loadScript()` function.
   - Example: `adyen-book.js` is loaded this way as a fallback

## Feature Registration

Features are registered in the `features` array within `main.js`. Each feature:

1. Has an identifying name
2. Includes a URL pattern to match where the feature should be activated
3. Specifies an initialization function
4. Optionally provides a cleanup function

## Feature Structure

Feature modules should:

1. Export their public functions by attaching them to the window object:

```javascript
window.initCardFeature = initCardFeature;
window.removeCardInfoButton = removeCardInfoButton;
```

2. Include debugging logs to help troubleshoot loading issues
3. Be focused on a single concern or area of functionality
4. Minimize dependencies on other features when possible

## Current Features

- **adyen-card.js**: 
  - Handles card information display and actions for Adyen cards
  - Provides functionality to view cards directly in Adyen platform
  - Includes UI components for displaying card data

- **adyen-book.js**: 
  - Handles book (monetary account) features
  - Provides functionality to view balance accounts in Adyen

## Note on Feature Isolation

In the May 2025 refactoring, the Adyen card functionality was moved from `main.js` to the dedicated `adyen-card.js` file to maintain separation of concerns and improve code organization. 

The main.js file now acts as a coordinator, delegating to specialized feature modules rather than implementing feature logic directly.
