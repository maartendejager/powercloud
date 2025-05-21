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
        *   Initializes the Feature Manager (`content_scripts/feature-manager.js`) to handle loading/unloading of features.
        *   Communicates with the background service worker (`chrome.runtime.sendMessage`).
        *   Manipulates the DOM of the web page to add UI elements or extract information.
        *   Uses the styles defined in `content_scripts/styles.css`, which are loaded automatically via the manifest.
        *   Defines features and registers them with the Feature Manager.

*   **Feature Manager (`content_scripts/feature-manager.js`)**:
    *   **Purpose**: Manages the loading and unloading of features based on URL patterns. It is instantiated in `main.js`.
    *   **Functionality**:
        *   Tracks active features on the current page.
        *   Handles URL change detection for single-page applications (SPAs) by observing `popstate` and `hashchange` events, as well as `history.pushState` and `history.replaceState` via monkey-patching if necessary.
        *   Initializes appropriate features when URLs match their patterns by calling their `init` function.
        *   Cleans up features by calling their `cleanup` function when navigating away from matched URLs.
        *   Provides a consistent API for feature management.
        *   Key methods include `checkPage()` to analyze the current URL and manage features, and `init()` to set up listeners.

*   **Feature Scripts (`content_scripts/features/*.js`)**:
    *   **Purpose**: Implement specific functionalities on certain pages. Each feature script should be self-contained.
    *   **Structure**:
        *   Export public functions by attaching them to the `window` object (e.g., `window.myFeatureInit = () => { ... };`).
        *   Include debugging logs for troubleshooting.
        *   Focus on a single concern.
    *   **Examples**:
        *   `adyen-book.js`: Adds functionality related to Adyen booking on specific book pages.
        *   `adyen-card.js`: Adds functionality related to Adyen card details on card settings pages.
        *   `token-detector.js`: Scans `localStorage` and `sessionStorage` for authentication tokens (JWTs) on `spend.cloud` pages. It looks for common key patterns like `token`, `authToken`, `jwt`, etc. Found tokens are reported to the background script. It runs an initial check and then periodically checks for new tokens. It is registered in `main.js` to run on all `spend.cloud` pages.
    *   **Loading**: 
        *   All scripts are loaded via manifest declaration - specified in the `content_scripts` section of manifest.json, loaded before main.js executes.
        *   As of May 21, 2025, only manifest loading is supported for consistency. See AUDIT.md for details.
        *   Feature scripts must register themselves with the `window.PowerCloudFeatures` namespace to provide a consistent API for main.js.

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

### 2. Script Loading Strategy

All feature scripts in this extension are loaded via the manifest.json file. This approach ensures consistency and avoids potential issues with duplicate script loading.

1. Add the script path to the `content_scripts` section in `manifest.json`:

```json
"content_scripts": [
  {
    "matches": ["*://*.spend.cloud/*"],
    "js": [
      "content_scripts/features/adyen-card.js",
      "content_scripts/features/adyen-book.js",
      "content_scripts/features/token-detector.js",
      "content_scripts/feature-manager.js",
      "content_scripts/main.js"
    ]
  }
]
```

2. Ensure your feature script exports necessary functions by attaching them to the `window` object with unique names:

```javascript
// Use a unique name to avoid collisions with functions in main.js
window.yourFeatureInit = yourFeatureInitFunction;
window.yourFeatureCleanup = yourFeatureCleanupFunction;
```

3. Register your feature in the `features` array in `main.js`:

```javascript
const features = [
  // ...existing features
  {
    name: 'yourFeature',
    urlPattern: /https:\/\/([^.]+)\.spend\.cloud\/your-feature-pattern/,
    init: function() {
      if (window.PowerCloudFeatures?.yourFeature?.init) {
        return window.PowerCloudFeatures.yourFeature.init();
      }
    },
    cleanup: function() {
      if (window.PowerCloudFeatures?.yourFeature?.cleanup) {
        return window.PowerCloudFeatures.yourFeature.cleanup();
      }
    }
  }
];
```

4. It's recommended to use the `PowerCloudFeatures` namespace to organize all feature functions:

```javascript
// In your feature script (e.g., content_scripts/features/your-feature.js)
window.PowerCloudFeatures = window.PowerCloudFeatures || {};
window.PowerCloudFeatures.yourFeature = {
  init: function() {
    // Your initialization code here
  },
  cleanup: function() {
    // Your cleanup code here
  }
};
```

```json
"web_accessible_resources": [
  {
    "resources": ["content_scripts/styles.css"],
    "matches": ["*://*.spend.cloud/*"]
  }
]
```

Note: The `web_accessible_resources` section now only includes CSS files as all JS files are loaded via the manifest.

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
