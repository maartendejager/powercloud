# Feature Scripts

This directory contains modular features that are used by the PowerCloud extension. Detailed information about how features are structured, loaded, and managed can be found in the main [ARCHITECTURE.md](../../ARCHITECTURE.md#3-content-scripts) document.

## Current Features

- **`adyen-card.js`**: 
  - Handles card information display and actions for Adyen cards.
  - Provides functionality to view cards directly in Adyen platform.
  - Includes UI components for displaying card data.

- **`adyen-book.js`**: 
  - Handles book (monetary account) features.
  - Provides functionality to view balance accounts in Adyen.

- **`token-detector.js`**:
  - Scans `localStorage` and `sessionStorage` for authentication tokens (JWTs) on `spend.cloud` pages.
  - Environment-aware: Only uses tokens from matching environments (same customer subdomain and same dev/non-dev status).
  - Reports found tokens to the background script.
  - For more details, see the [Token Detector section in ARCHITECTURE.md](../../ARCHITECTURE.md#feature-scripts).

## Adding New Features

Refer to the ["Adding New Feature Scripts" section in ARCHITECTURE.md](../../ARCHITECTURE.md#adding-new-feature-scripts) for guidelines on creating and integrating new features.
