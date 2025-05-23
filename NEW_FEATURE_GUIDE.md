# Guide: Implementing New Browser Extension Features

This document outlines the process for creating new features for the PowerCloud browser extension. These features typically involve interacting with web pages, potentially fetching data from a backend, and providing new UI elements or functionality to the user.

## Table of Contents

1.  [Core Concepts](#core-concepts)
2.  [Prerequisites](#prerequisites)
3.  [Step-by-Step Implementation Guide](#step-by-step-implementation-guide)
    *   [1. Define the Feature](#1-define-the-feature)
    *   [2. Create Feature File (Content Script)](#2-create-feature-file-content-script)
    *   [3. URL Matching & Initialization](#3-url-matching--initialization)
    *   [4. Backend Communication (via Background Script)](#4-backend-communication-via-background-script)
    *   [5. Develop the UI](#5-develop-the-ui)
    *   [6. Implement Feature Logic](#6-implement-feature-logic)
    *   [7. Implement Cleanup](#7-implement-cleanup)
    *   [8. Register and Test](#8-register-and-test)
4.  [Best Practices](#best-practices)
5.  [Code Structure Example](#code-structure-example)

## Core Concepts

*   **Content Scripts:** JavaScript files that run in the context of web pages. They can read and modify the DOM of the pages they are injected into.
*   **Background Script:** A script that runs in the background of the extension. It can listen for browser events, manage state, and perform tasks that content scripts cannot (e.g., making cross-origin API calls, accessing certain `chrome.*` APIs).
*   **Message Passing:** Content scripts and background scripts communicate using `chrome.runtime.sendMessage` and `chrome.runtime.onMessage`. This is essential for tasks like triggering API calls from a content script.
*   **Shadow DOM:** Used to encapsulate UI elements (like buttons or panels) added by the feature. This prevents CSS conflicts between the feature's UI and the host page's styles.
*   **`chrome.storage`:** Used for persisting user settings or feature configurations.
*   **Feature Dispatcher:** A central content script (e.g., `content.js`) that determines which feature(s) to initialize based on the current URL. Features register themselves with this dispatcher.

## Prerequisites

*   Solid understanding of JavaScript (ES6+).
*   Familiarity with Chrome Extension development basics (manifest.json, content scripts, background scripts, message passing).
*   Knowledge of DOM manipulation.
*   Basic CSS.

## Step-by-Step Implementation Guide

### 1. Define the Feature

*   **Purpose:** What problem does the feature solve? What value does it add?
*   **Target Pages:** On which specific URLs or URL patterns should this feature be active?
*   **Functionality:**
    *   What UI elements will it add (buttons, links, information panels)?
    *   Will it need to fetch data from our backend?
    *   Will it navigate the user to other URLs?
    *   What are the different states (e.g., loading, success, error, disabled)?

### 2. Create Feature File (Content Script)

*   Create a new JavaScript file in the `content_scripts/features/` directory (e.g., `new-feature-name.js`).
*   Follow the established pattern of initializing a namespace for your feature:

    ```javascript
    // filepath: /home/maarten/projects/Extensions/PowerCloud/content_scripts/features/new-feature-name.js
    window.PowerCloudFeatures = window.PowerCloudFeatures || {};
    window.PowerCloudFeatures.newFeatureName = window.PowerCloudFeatures.newFeatureName || {};
    ```

*   Define the core functions for your feature: `init`, `cleanup`, and any UI helper functions.

### 3. URL Matching & Initialization

*   The main content script (`content.js` or similar, not detailed here) will be responsible for matching URLs and calling your feature's `init` function.
*   Your `init` function will receive a `match` object from the URL regex.

    ```javascript
    // filepath: /home/maarten/projects/Extensions/PowerCloud/content_scripts/features/new-feature-name.js
    // ...
    /**
     * Initializes the New Feature.
     * @param {object} match - The URL match result (e.g., from regex groups).
     */
    function initNewFeature(match) {
      if (!match || match.length < 2) { // Adjust based on expected match groups
        console.log('New Feature: Invalid URL match, exiting.');
        return;
      }
      const relevantId = match[1]; // Example: extract an ID from the URL

      // Check any prerequisite conditions (e.g., user settings from chrome.storage)
      chrome.storage.local.get(['showNewFeatureButton'], (result) => {
        const showButton = result.showNewFeatureButton === undefined ? true : result.showNewFeatureButton;
        if (!showButton) {
          return;
        }
        // Proceed with feature setup...
        addFeatureUI(relevantId);
      });
    }
    // ...
    ```

### 4. Backend Communication (via Background Script)

If your feature needs to fetch data from or send data to your backend:

1.  **Define Message Action(s):** In your feature script, use `chrome.runtime.sendMessage`.

    ```javascript
    // filepath: /home/maarten/projects/Extensions/PowerCloud/content_scripts/features/new-feature-name.js
    // ...
    function fetchDataForFeature(id, callback) {
      chrome.runtime.sendMessage(
        {
          action: "fetchFeatureData", // Unique action name
          featureId: id
          // any other necessary parameters
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error fetching feature data:", chrome.runtime.lastError.message);
            callback({ success: false, error: chrome.runtime.lastError.message });
            return;
          }
          callback(response);
        }
      );
    }
    // ...
    ```

2.  **Handle in Background Script:** Add a case to the message listener in your background script (`background.js` or similar) to handle this action. The background script will make the authenticated API call.

    ```javascript
    // Example structure for background.js (simplified)
    // filepath: /home/maarten/projects/Extensions/PowerCloud/background.js
    // ...
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "fetchFeatureData") {
        // Assume getAuthToken and makeApiRequest are defined elsewhere
        getAuthToken().then(token => {
          makeApiRequest(`/api/feature-endpoint/${request.featureId}`, token)
            .then(data => sendResponse({ success: true, data: data }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        });
        return true; // Indicates you will send a response asynchronously
      }
      // ... other actions
    });
    // ...
    ```

### 5. Develop the UI

*   **Shadow DOM:** Always create UI elements within a Shadow DOM to ensure style isolation.
*   **Styling:** Link the shared `content_scripts/styles.css` or create feature-specific styles if necessary.
*   **Dynamic States:** Update UI text, classes, or attributes based on data fetched or user interaction (e.g., "Loading...", "Error", disabled states).

    ```javascript
    // filepath: /home/maarten/projects/Extensions/PowerCloud/content_scripts/features/new-feature-name.js
    // ...
    function addFeatureUI(relevantId) {
      if (document.getElementById('powercloud-newfeature-host')) return; // Prevent duplicates

      const shadowHost = document.createElement('div');
      shadowHost.id = 'powercloud-newfeature-host';
      document.body.appendChild(shadowHost);

      const shadowRoot = shadowHost.attachShadow({ mode: 'closed' }); // 'closed' is often preferred

      const linkElem = document.createElement('link');
      linkElem.rel = 'stylesheet';
      linkElem.href = chrome.runtime.getURL('content_scripts/styles.css');
      shadowRoot.appendChild(linkElem);

      const container = document.createElement('div');
      container.className = 'powercloud-container powercloud-button-container'; // Use shared styles

      const button = document.createElement('button');
      button.id = 'powercloud-newfeature-btn';
      button.className = 'powercloud-button';
      button.textContent = 'Do New Feature Action';

      button.addEventListener('click', () => handleFeatureAction(relevantId, button));

      container.appendChild(button);
      shadowRoot.appendChild(container);
    }
    // ...
    ```

### 6. Implement Feature Logic

*   Handle user interactions (e.g., button clicks).
*   Perform actions like:
    *   Fetching data (as described in Step 4).
    *   Updating the UI based on responses.
    *   Navigating to new URLs (`window.open(url, '_blank');`).
    *   Displaying temporary messages or results (consider a shared `showResult` utility or one specific to your feature).

    ```javascript
    // filepath: /home/maarten/projects/Extensions/PowerCloud/content_scripts/features/new-feature-name.js
    // ...
    function handleFeatureAction(id, buttonElement) {
      const originalText = buttonElement.textContent;
      buttonElement.textContent = '⏳ Processing...';
      buttonElement.disabled = true;

      fetchDataForFeature(id, (response) => {
        buttonElement.textContent = originalText;
        buttonElement.disabled = false;

        if (response && response.success) {
          // Example: Open a link based on fetched data
          // window.open(response.data.targetUrl, '_blank');
          PowerCloudFeatures.card.showResult('New feature action successful!'); // Use shared result display
        } else {
          PowerCloudFeatures.card.showResult(`Error: ${response.error || 'Failed to process feature action.'}`);
        }
      });
    }
    // ...
    ```

### 7. Implement Cleanup

*   Provide a `cleanup` function to remove any UI elements your feature added. This is crucial for Single Page Applications (SPAs) where the DOM changes without full page reloads.

    ```javascript
    // filepath: /home/maarten/projects/Extensions/PowerCloud/content_scripts/features/new-feature-name.js
    // ...
    function cleanupNewFeature() {
      const shadowHost = document.getElementById('powercloud-newfeature-host');
      if (shadowHost) {
        shadowHost.remove();
      }
      // Remove any other elements created by this feature
    }
    // ...
    ```

### 8. Register and Test

1.  **Register with Dispatcher:**
    *   Export your `init` and `cleanup` functions by assigning them to the feature's namespace.

        ```javascript
        // filepath: /home/maarten/projects/Extensions/PowerCloud/content_scripts/features/new-feature-name.js
        // ... (all function definitions above)

        window.PowerCloudFeatures.newFeatureName.init = initNewFeature;
        window.PowerCloudFeatures.newFeatureName.cleanup = cleanupNewFeature;
        // Optionally export other utilities if they need to be globally accessible
        // window.PowerCloudFeatures.newFeatureName.showSpecificMessage = showSpecificMessage;
        ```

    *   Ensure your main content script (e.g., `content.js`) knows about this new feature, its URL patterns, and calls `window.PowerCloudFeatures.newFeatureName.init(match)` and `window.PowerCloudFeatures.newFeatureName.cleanup()` at appropriate times. (The specifics of the dispatcher are outside this guide but involve URL matching and iterating over registered features).

2.  **Manifest:**
    *   If your feature script is not dynamically injected by another script, ensure it's listed in the `content_scripts` section of `manifest.json` if it needs to run on its own based on manifest URL matches. However, the current pattern seems to favor a central dispatcher loading features.

3.  **Testing:**
    *   Thoroughly test on all target pages and edge cases.
    *   Test different states (loading, success, various error conditions).
    *   Verify cleanup works correctly, especially in SPAs.
    *   Check for console errors.

## Best Practices

*   **Follow Coding Instructions:** Adhere to the project's established coding standards and instructions (e.g., file size limits, CSS usage, documentation).
*   **Small, Focused Files:** Keep feature files concise and focused on their specific task.
*   **Error Handling:** Implement robust error handling for API calls and other operations. Provide clear feedback to the user.
*   **Asynchronous Operations:** Use Promises or async/await for cleaner asynchronous code, especially when dealing with `chrome.runtime.sendMessage` and `chrome.storage.local.get`.
*   **User Feedback:** Always provide feedback for actions (loading indicators, success/error messages).
*   **Idempotency:** Ensure that re-running the `init` function (if possible due to SPA navigation) doesn't create duplicate UI elements. Check if elements already exist before adding them.
*   **Permissions:** Only request necessary permissions in `manifest.json`.
*   **Security:** Be mindful of security implications, especially when dealing with user data or making API requests. Sanitize data where appropriate.

## Code Structure Example

```javascript
// filepath: /home/maarten/projects/Extensions/PowerCloud/content_scripts/features/example-feature.js

// Initialize namespace
window.PowerCloudFeatures = window.PowerCloudFeatures || {};
window.PowerCloudFeatures.exampleFeature = window.PowerCloudFeatures.exampleFeature || {};

const FEATURE_HOST_ID = 'powercloud-example-feature-host';

/**
 * Initializes the Example Feature.
 * @param {object} match - The URL match result.
 */
function initExampleFeature(match) {
  if (!match || !match[1]) {
    console.log("ExampleFeature: No relevant ID found in URL match.");
    return;
  }
  const entityId = match[1];

  // Optional: Check a setting from chrome.storage
  chrome.storage.local.get(['enableExampleFeature'], (settings) => {
    if (settings.enableExampleFeature === false) { // Explicitly check for false
      return;
    }
    addExampleFeatureUI(entityId);
  });
}

/**
 * Adds the UI elements for the Example Feature.
 * @param {string} entityId - The ID of the entity this feature relates to.
 */
function addExampleFeatureUI(entityId) {
  if (document.getElementById(FEATURE_HOST_ID)) {
    return; // UI already exists
  }

  const shadowHost = document.createElement('div');
  shadowHost.id = FEATURE_HOST_ID;
  document.body.appendChild(shadowHost); // Or a more specific target element

  const shadowRoot = shadowHost.attachShadow({ mode: 'closed' });

  // Link shared stylesheet
  const linkElem = document.createElement('link');
  linkElem.rel = 'stylesheet';
  linkElem.href = chrome.runtime.getURL('content_scripts/styles.css');
  shadowRoot.appendChild(linkElem);

  const container = document.createElement('div');
  container.className = 'powercloud-container'; // Use shared styles

  const button = document.createElement('button');
  button.className = 'powercloud-button';
  button.textContent = `Action for ${entityId}`;
  button.addEventListener('click', () => handleExampleAction(entityId, button));

  container.appendChild(button);
  shadowRoot.appendChild(container);
}

/**
 * Handles the primary action of the Example Feature.
 * @param {string} entityId - The ID of the entity.
 * @param {HTMLButtonElement} buttonElement - The button that was clicked.
 */
function handleExampleAction(entityId, buttonElement) {
  const originalText = buttonElement.textContent;
  buttonElement.textContent = '⏳ Loading...';
  buttonElement.disabled = true;

  chrome.runtime.sendMessage(
    { action: "getExampleData", id: entityId },
    (response) => {
      buttonElement.textContent = originalText;
      buttonElement.disabled = false;

      if (response && response.success) {
        PowerCloudFeatures.card.showResult(`Data: ${JSON.stringify(response.data)}`); // Use shared showResult
      } else {
        PowerCloudFeatures.card.showResult(`Error: ${response.error || 'Failed to get example data.'}`);
      }
    }
  );
}

/**
 * Cleans up UI elements added by the Example Feature.
 */
function cleanupExampleFeature() {
  const shadowHost = document.getElementById(FEATURE_HOST_ID);
  if (shadowHost) {
    shadowHost.remove();
  }
}

// Register functions in the global namespace
window.PowerCloudFeatures.exampleFeature.init = initExampleFeature;
window.PowerCloudFeatures.exampleFeature.cleanup = cleanupExampleFeature;
