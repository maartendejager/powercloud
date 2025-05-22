# PowerCloud Extension Refactoring Notes

## Current Structure

As of version 1.1.0, the PowerCloud extension uses a single, consistent approach for loading content scripts:

1. **Via Manifest Direct Injection**:
   - All scripts are listed in the `content_scripts` section of `manifest.json` and are automatically injected by Chrome when the page loads.
   - No dynamic script loading is used, as noted in the May 21, 2025 audit.

## Recent Improvements

### API Processor Refactoring (May 22, 2025)
- Refactored the service worker to separate API processing logic into dedicated modules:
  - Created individual processor files for each entity type (cards, books, administrations, balance accounts)
  - Moved shared utility functions (like environment detection) to a utility module
  - Created an index.js to centralize processor exports
  - Reduced the size of service-worker.js to improve maintainability
  - Added clear documentation for each processor module

### API Environment Handling (May 22, 2025)
- Enhanced the `buildApiUrl` function in `shared/api.js` to properly handle both production and development environments
- Added `isDev` parameter to all API utility functions to ensure proper URL construction
- Updated service worker message handlers to detect environment from both content script and popup sources
- Fixed an issue where popup requests might use the wrong environment URL due to lack of sender tab information
- Refactored service worker with helper functions for API request handling to improve code organization

### Authentication Token Management (May, 2025)
- Refactored token detection and storage to improve modularity:
  - Moved token detection logic from service-worker.js to shared/auth.js
  - Created a new `handleAuthHeaderFromWebRequest` function in auth.js to encapsulate the logic of extracting tokens from web requests
  - Used the existing `isApiRoute` function from url-patterns.js for consistent URL pattern matching
  - Updated popup.js to use ES modules for proper importing of shared functions
  - Updated popup.html to use type="module" for the script tag
  - Ensured consistency in API route pattern usage across the codebase

## Potential Issues

### Duplicate Script Loading
- Some scripts (e.g., `adyen-book.js` and `token-detector.js`) are both listed in the manifest's `content_scripts` array AND dynamically loaded in `main.js`.
- This may cause scripts to be loaded twice, which could lead to:
  - Duplicate functionality execution
  - Potential conflicts or race conditions
  - Unnecessary resource usage

### Recommended Solutions for Further Refactoring

#### Option 1: Consistent Manifest-Only Loading
1. Remove dynamic script loading calls from `main.js` for scripts already in the manifest.
2. Update initialization code to expect scripts to be already loaded.

#### Option 2: Consistent Dynamic-Only Loading
1. Remove entries from manifest's `content_scripts` array that are dynamically loaded.
2. Keep all feature script paths in `web_accessible_resources`.
3. Dynamically load all feature scripts in `main.js`.

### Code Modularity Considerations

1. **Feature Independence**: Each feature script should be self-contained with clear entry/exit points.
2. **Initialization Consistency**: Consider using a unified approach to register features with the Feature Manager.
3. **Namespace Management**: The use of `window.PowerCloudFeatures` namespace should be consistent across all features.

## Next Steps

Consider reviewing and updating the codebase with one of the following changes:

1. ✅ Audit all feature scripts to ensure they support either loading method but not both simultaneously. (Implemented manifest-only loading on May 21, 2025)
2. ✅ Choose a single loading strategy (manifest or dynamic) for all feature scripts and apply it consistently. (Implemented manifest-only loading on May 21, 2025)
3. Add script loading detection to prevent duplicate initialization if a script is loaded twice.