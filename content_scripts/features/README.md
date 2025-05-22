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
  - Uses direct relationships from the book resource to find Adyen balance accounts.

- **`ui-visibility-manager.js`**:
  - Handles button visibility messaging on `spend.cloud` pages.
  - Listens for messages from the popup to show or hide UI elements injected by the extension.
  - For more details, see the [UI Visibility Manager section in ARCHITECTURE.md](../../ARCHITECTURE.md#feature-scripts).

## Adding New Features

Refer to the ["Adding New Feature Scripts" section in ARCHITECTURE.md](../../ARCHITECTURE.md#adding-new-feature-scripts) for guidelines on creating and integrating new features.
