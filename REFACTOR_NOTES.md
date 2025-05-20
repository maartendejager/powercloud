# PowerCloud Extension Refactoring Notes

## Current Structure

The PowerCloud extension uses a hybrid approach for loading content scripts:

1. **Via Manifest Direct Injection**:
   - Scripts listed in the `content_scripts` section of `manifest.json` are automatically injected by Chrome when the page loads.

2. **Via Dynamic Loading**:
   - Some scripts are dynamically loaded using the `loadScript` function in `main.js` which uses `chrome.runtime.getURL()`.

## Improvements Made

### Web Accessible Resources
- Limited `web_accessible_resources` to only include resources that need to be dynamically accessible via URL:
  - `content_scripts/features/*.js`: For feature scripts that are dynamically loaded
  - `content_scripts/styles.css`: For styling dynamically created components or shadow DOM elements
- Removed `content_scripts/feature-manager.js` from web_accessible_resources as it is directly injected via the manifest and does not need to be web-accessible.

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

1. Audit all feature scripts to ensure they support either loading method but not both simultaneously.
2. Choose a single loading strategy (manifest or dynamic) for all feature scripts and apply it consistently.
3. Add script loading detection to prevent duplicate initialization if a script is loaded twice.