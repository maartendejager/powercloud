# PowerCloud Extension Architecture

This document outlines the architecture of the PowerCloud Chrome extension.

## Overview

The PowerCloud extension enhances the user experience on `spend.cloud` websites by providing developer-focused tools and information. It operates by injecting content scripts into relevant pages, utilizing a background service worker for persistent tasks and communication, and offering a popup interface for user interaction.

## Key Components

### 0. Token Terminology

Throughout the codebase, we maintain a clear distinction between two important concepts:

- **Tenant Name**: The client organization or account, represented by the subdomain in URLs (e.g., "customer1", "acme-corp")
  - Stored as `clientEnvironment` in the code (for historical reasons)
  - Displayed prominently in the UI as the main identifier for each token
  - Extracted from URLs with pattern: `https://[tenant-name].spend.cloud/...`

- **Environment Type**: Whether the environment is development or production
  - Stored as `isDevRoute` boolean flag (true = development, false = production)
  - Displayed as a colored badge in the UI (orange for development, green for production)
  - Determined by checking for keywords like `.dev.`, `localhost`, etc. in URLs

This distinction is important for accurately tracking and displaying token metrics. For more details, see [Token Terminology Clarification](./docs/ui-improvements/token-terminology-clarification.md).

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

### 2. Background Service Worker and Modules (`background/`)

*   **Service Worker (`background/service-worker.js`)**:
    *   **Purpose**: Main entry point for background processing. Handles initialization and message routing.
    *   **Functionality**:
        *   Initializes token management on extension installation.
        *   Routes messages from popup and content scripts to appropriate handlers.
        *   Maintains a clean structure by delegating to specialized modules.

*   **Token Manager (`background/token-manager.js`)**:
    *   **Purpose**: Manages authentication tokens for API requests.
    *   **Functionality**:
        *   Stores, retrieves, and updates authentication tokens.
        *   Sets up web request listeners to capture tokens.
        *   Filters invalid or expired tokens.

*   **API Processors (`background/api-processors/`)**:
    *   **Purpose**: Process API requests and responses for different entity types.
    *   **Functionality**:
        *   Make requests to specific API endpoints via the shared API module.
        *   Extract relevant data from responses.
        *   Transform data into formats usable by the extension.
        *   Handle errors and edge cases consistently.

*   **Message Handlers (`background/message-handlers/`)**:
    *   **Purpose**: Handle messages from popup and content scripts.
    *   **Functionality**:
        *   Validate message parameters.
        *   Call appropriate API processors or token manager functions.
        *   Send responses back to callers.
        *   Maintain consistent error handling.

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
        *   `ui-visibility-manager.js`: Handles button visibility messaging on `spend.cloud` pages. Listens for messages from the popup to show or hide UI elements injected by the extension. Previously named `token-detector.js`.
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
    *   `api.js`: Contains functions for making API calls to both production and development environments (`*.spend.cloud` and `*.dev.spend.cloud`).
    *   `auth.js`: Contains functions for authentication token management, including storing, retrieving, and validating JWT tokens. The `getToken` function retrieves tokens appropriate for specific client environments and development statuses.
    *   `url-patterns.js`: Provides URL pattern matching utilities for consistent domain handling.

#### Core Infrastructure Modules

*   **BaseFeature (`base-feature.js`)**: Abstract base class providing standardized feature structure with lifecycle hooks, error handling, and logging integration.
*   **Logger (`logger.js`)**: Centralized logging system with configurable levels, error boundaries, and debug mode support.
*   **FeatureManager (`feature-manager.js`)**: Manages feature lifecycle, URL pattern matching, and safe feature loading with graceful degradation.

#### Testing and Validation Framework (Phase 2.2)

*   **FeatureValidator (`feature-validation.js`)**: Comprehensive validation framework for feature functionality including initialization validation, health checks, and property validation.
*   **PerformanceMonitor (`performance-monitor.js`)**: Performance monitoring system with timing measurements, memory tracking, and threshold violation detection.
*   **ErrorTracker (`error-tracker.js`)**: Error tracking and categorization system with pattern recognition and resolution management.
*   **FeatureDebugger (`feature-debugger.js`)**: Advanced debugging utilities with debug sessions, breakpoints, and state inspection capabilities.
*   **FeatureValidationManager (`feature-validation-manager.js`)**: Central orchestrator integrating all validation components for comprehensive feature testing.
*   **TestFramework (`test-framework.js`)**: Lightweight testing framework with assertion utilities and test result reporting.

#### Configuration Management (Phase 3.1)

*   **SettingsManager (`settings-manager.js`)**: Centralized configuration management system providing:
    *   User preference storage and retrieval with Chrome storage integration
    *   Feature toggle system for dynamic feature control
    *   Environment-specific configuration support (development, production, testing)
    *   Configuration validation with schema enforcement
    *   Import/export capabilities for settings backup and sharing
    *   Change listener system for real-time configuration updates

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

## Development Workflow and Architecture Patterns

### Feature Development Lifecycle

1. **Feature Planning**: Define feature requirements, URL patterns, and dependencies
2. **Development**: Implement feature using BaseFeature class and established patterns
3. **Validation**: Use FeatureValidator to ensure feature meets quality standards
4. **Testing**: Create comprehensive tests using the shared testing framework
5. **Configuration**: Add feature toggles and settings via SettingsManager
6. **Integration**: Register feature in FeatureManager and update manifest
7. **Documentation**: Add JSDoc documentation following established standards

### Code Quality Standards

*   **JSDoc Documentation**: All classes, methods, and functions must have comprehensive JSDoc documentation following the established standards
*   **Error Handling**: Use custom error classes and consistent error handling patterns
*   **Performance Monitoring**: Integrate with PerformanceMonitor for timing and memory tracking
*   **Configuration Management**: Use SettingsManager for all configurable options
*   **Testing**: Maintain test coverage for all new functionality

### Validation and Quality Assurance

The extension includes a comprehensive validation framework that ensures:

*   **Feature Initialization**: Validates that features initialize correctly with proper dependencies
*   **Performance Monitoring**: Tracks initialization time, memory usage, and response times
*   **Error Tracking**: Categorizes and tracks errors with pattern recognition
*   **Health Checks**: Ongoing monitoring of feature health and functionality
*   **Debug Capabilities**: Advanced debugging tools for development and troubleshooting

### Configuration Architecture

*   **Centralized Configuration**: All settings managed through SettingsManager
*   **Environment Support**: Different configurations for development, production, and testing
*   **User Preferences**: Persistent user settings with Chrome storage integration
*   **Feature Toggles**: Dynamic enable/disable of features without code changes
*   **Validation**: Schema-based validation of all configuration values
*   **Import/Export**: Configuration backup and sharing capabilities

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
    *   **Navigation Behavior**: Buttons implement differentiated navigation patterns - internal Spend Cloud buttons navigate in the same tab while external Adyen buttons open in new tabs. See [Navigation Behavior Implementation](./docs/NAVIGATION_BEHAVIOR_IMPLEMENTATION.md) for detailed implementation.

## Future Development Considerations

*   **Modularity**: Continue to keep features in separate modules within `content_scripts/features/`.
*   **Error Handling**: Implement robust error handling in all components.
*   **Testing**: Consider adding unit tests for shared logic and integration tests for key features.
*   **Code Clarity**: Ensure JSDoc comments or similar are used for all functions and modules, especially in `shared/` and `background/`.

This document should be updated as the extension evolves.

## 📖 Related Documentation

For comprehensive development information, see:

- **[Developer Documentation](./docs/)** - Complete developer guide collection
- **[Developer Onboarding](./docs/DEVELOPER_ONBOARDING.md)** - Setup guide for new developers
- **[Code Style Guide](./docs/CODE_STYLE_GUIDE.md)** - Coding standards and conventions
- **[Feature Development Guide](./docs/FEATURE_DEVELOPMENT_GUIDE.md)** - Comprehensive guide for creating new features
- **[Navigation Behavior Implementation](./docs/NAVIGATION_BEHAVIOR_IMPLEMENTATION.md)** - Button navigation behavior differentiation
- **[Testing Documentation](./docs/testing/)** - Comprehensive testing procedures
- **[Development Notes](./DEVELOPMENT_NOTES.md)** - Current development context

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
      "content_scripts/features/ui-visibility-manager.js",
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
