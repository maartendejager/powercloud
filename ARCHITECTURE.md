# PowerCloud Extension Architecture

This document outlines the architecture of the PowerCloud Chrome extension.

## Overview

The PowerCloud extension enhances the user experience on `spend.cloud` websites by providing developer-focused tools and information. It operates by injecting content scripts into relevant pages, utilizing a background service worker for persistent tasks and communication, and offering a popup interface for user interaction.

## Key Components

### 1. Manifest (`manifest.json`)

*   **Purpose**: Defines the extension's properties, permissions, and entry points.
*   **Key Sections**:
    *   `name`, `version`, `description`: Basic extension information.
    *   `permissions`: Specifies what browser features the extension can access (e.g., `activeTab`, `storage`, `scripting`, `webRequest`).
    *   `host_permissions`: Defines the websites the extension can interact with (e.g., `*://*.spend.cloud/*`).
    *   `background`: Configures the background service worker.
    *   `content_scripts`: Declares scripts to be injected into web pages matching specific URL patterns.
    *   `web_accessible_resources`: Lists resources (like CSS or JS files) that can be accessed by web pages.
    *   `action`: Defines the popup HTML and icons for the browser toolbar button.

### 2. Background Service Worker (`background/service-worker.js`)

*   **Purpose**: Handles background tasks, manages extension state, and listens for browser events (e.g., network requests, tab updates, alarms).
*   **Functionality**:
    *   **API Interaction**: May make authenticated requests to `spend.cloud` APIs (details in `js/api.js` and `shared/api.js`).
    *   **Authentication Management**: Likely handles authentication token storage and retrieval (details in `js/auth.js` and `shared/auth.js`).
    *   **Event Handling**: Responds to events like `chrome.webRequest.onBeforeSendHeaders` to capture tokens or `chrome.runtime.onMessage` for communication with content scripts or the popup.
    *   **Alarm Management**: Uses `chrome.alarms` for scheduled tasks if any.

### 3. Content Scripts

*   **Main Content Script (`content_scripts/main.js`)**:
    *   **Purpose**: Injected into all `spend.cloud` pages. Acts as the primary bridge between the web page and the extension's background/popup.
    *   **Functionality**:
        *   Loads feature-specific modules from `content_scripts/features/`.
        *   Communicates with the background service worker (`chrome.runtime.sendMessage`).
        *   Manipulates the DOM of the web page to add UI elements or extract information.
        *   Loads shared styles from `content_scripts/styles.css`.

*   **Feature Scripts (`content_scripts/features/*.js`)**:
    *   **Purpose**: Implement specific functionalities on certain pages.
    *   **Examples**:
        *   `adyen-book.js`: Adds functionality related to Adyen booking on specific book pages.
        *   `adyen-card.js`: Adds functionality related to Adyen card details on card settings pages.
        *   `token-detector.js`: Likely involved in detecting and extracting JWT tokens from the page or network requests.
    *   **Loading**: Dynamically loaded by `content_scripts/main.js` based on the current page URL or content.

### 4. Popup (`popup/`)

*   **Purpose**: Provides a user interface when the extension icon in the browser toolbar is clicked.
*   **Components**:
    *   `popup.html`: The HTML structure of the popup.
    *   `popup.css`: Styles for the popup.
    *   `popup.js`: Handles the logic and interactivity of the popup.
        *   Displays information (e.g., captured tokens).
        *   Allows user actions (e.g., copying tokens, navigating to other tabs).
        *   Communicates with the background service worker and content scripts.

### 5. Shared Modules (`shared/`)

*   **Purpose**: Contains JavaScript modules with common logic used by different parts of the extension (e.g., background, popup).
*   **Examples**:
    *   `api.js`: Contains functions for making API calls.
    *   `auth.js`: Contains functions for authentication token management.

## Communication Flow

*   **Content Script to Background**: `chrome.runtime.sendMessage()` from content script, `chrome.runtime.onMessage.addListener()` in background.
*   **Popup to Background**: `chrome.runtime.sendMessage()` from popup script, `chrome.runtime.onMessage.addListener()` in background.
*   **Background to Content Script/Popup**:
    *   If initiated by a message from content/popup: Send response directly via the `sendResponse` callback.
    *   Proactive messages from background: `chrome.tabs.sendMessage()` (to a specific tab's content script) or managing shared state that popup/content scripts can read.
*   **Content Script to Page**: DOM manipulation, `window.postMessage()` (if interacting with page's own JavaScript).
*   **Page to Content Script**: `window.addEventListener('message', ...)` (if page uses `postMessage`).

## Data Storage

*   `chrome.storage.local` or `chrome.storage.sync`: Used for persisting extension settings, captured tokens, or other data.
    *   `local`: For larger data, or data that shouldn't be synced across devices.
    *   `sync`: For user settings that should be available across their synced browsers.

## Key Functionalities & Their Likely Implementation

*   **Token Capture**:
    *   `background/service-worker.js` listens to `chrome.webRequest.onBeforeSendHeaders` or `onSendHeaders` for requests to `*://*.spend.cloud/*`.
    *   It inspects request headers for `Authorization` (Bearer tokens) or other token-carrying headers.
    *   Captured tokens are stored using `chrome.storage`.
    *   The popup (`popup/popup.js`) reads from `chrome.storage` to display tokens.
*   **Page-Specific Tools (e.g., Adyen buttons)**:
    *   `content_scripts/main.js` detects the current page URL.
    *   If the URL matches a pattern for a specific feature, it dynamically loads the corresponding script from `content_scripts/features/`.
    *   The feature script (e.g., `adyen-card.js`) manipulates the DOM to add buttons or other UI elements.
    *   These buttons, when clicked, might trigger actions within the content script or send messages to the background script for more complex operations (like opening a new tab to Adyen).

## Future Development Considerations

*   **Modularity**: Continue to keep features in separate modules within `content_scripts/features/`.
*   **Error Handling**: Implement robust error handling in all components.
*   **Testing**: Consider adding unit tests for shared logic and integration tests for key features.
*   **Code Clarity**: Ensure JSDoc comments or similar are used for all functions and modules, especially in `shared/` and `background/`.

This document should be updated as the extension evolves.

## Adding New Feature Scripts

When adding new feature scripts to the extension, follow these guidelines to ensure proper integration:

### 1. Script Creation and Organization

1. **File Location**: Place all feature scripts in the `content_scripts/features/` directory.
2. **Naming Convention**: Use descriptive names that indicate the feature's functionality (e.g., `feature-name.js`).
3. **Structure**: Each feature script should be self-contained with well-defined entry points.

### 2. Script Loading Options

There are two ways to load feature scripts in this extension:

#### Option A: Direct Loading via Manifest (Recommended)

1. Add the script path to the `content_scripts` section in `manifest.json`:

```json
"content_scripts": [
  {
    "matches": ["*://*.spend.cloud/*"],
    "js": [
      "content_scripts/main.js",
      "content_scripts/features/your-new-feature.js"
    ]
  }
]
```

2. Ensure your feature script exports necessary functions by attaching them to the `window` object:

```javascript
// Make functions available globally
window.yourFeatureInitFunction = yourFeatureInitFunction;
window.yourFeatureCleanupFunction = yourFeatureCleanupFunction;
```

3. Register your feature in the `features` array in `main.js`:

```javascript
const features = [
  // ...existing features
  {
    name: 'yourFeature',
    urlPattern: /https:\/\/([^.]+)\.spend\.cloud\/your-feature-pattern/,
    init: window.yourFeatureInitFunction,
    cleanup: window.yourFeatureCleanupFunction
  }
];
```

#### Option B: Dynamic Loading (Alternative)

1. Add the script path to the `web_accessible_resources` section in `manifest.json` if not already included:

```json
"web_accessible_resources": [
  {
    "resources": ["content_scripts/styles.css", "content_scripts/features/*.js"],
    "matches": ["*://*.spend.cloud/*"]
  }
]
```

2. Use the `loadScript` function in `main.js` to dynamically load your feature:

```javascript
// In main.js
function initYourFeature(match) {
  loadScript('content_scripts/features/your-new-feature.js')
    .then(() => {
      if (window.yourFeatureInitFunction) {
        window.yourFeatureInitFunction(match);
      }
    })
    .catch(error => console.error('Failed to load feature script:', error));
}
```

3. Register your feature in the `features` array using this init function.

### 3. Testing Your Feature Script

1. Add console logs to verify loading:

```javascript
console.log('Feature script loaded:', 'your-new-feature.js');
```

2. Verify in the browser console that your script is loaded when visiting matching URLs.
3. Look for potential conflicts with existing features or scripts.

### 4. Script Communication

1. For communication with the background script, use:

```javascript
chrome.runtime.sendMessage({ action: "yourAction", data: yourData }, response => {
  // Handle response
});
```

2. For communication between features, use the shared window functions or messaging through the background script.
