# PowerCloud Extension Refactoring Notes

## Current Structure

As of version 1.1.0, the PowerCloud extension uses a single, consistent approach for loading content scripts:

1. **Via Manifest Direct Injection**:
   - All scripts are listed in the `content_scripts` section of `manifest.json` and are automatically injected by Chrome when the page loads.
   - No dynamic script loading is used, as noted in the May 21, 2025 audit.

## Improvements Made

### Web Accessible Resources
- Limited `web_accessible_resources` to only include resources that need to be dynamically accessible via URL:
  - `content_scripts/styles.css`: For styling dynamically created components or shadow DOM elements
- All scripts are now loaded via manifest.json and do not need to be web-accessible.

### Domain Support
- As of version 1.1.0, the extension now supports both standard domains (`https://[customer].spend.cloud/*`) and development domains (`https://[customer].dev.spend.cloud/*`)
- All URL patterns in the code have been updated to match both domain patterns
- The manifest.json has been updated to include permissions for both domain types

### URL Pattern Refactoring (May 21, 2025)
- Created a centralized URL pattern module (`shared/url-patterns.js`) with the following:
  - Common pattern definitions (DOMAIN_PATTERN, ANY_SPEND_CLOUD_DOMAIN, API_ROUTE_PATTERN)
  - Feature-specific patterns (CARD_PATTERNS, BOOK_PATTERN)
  - Helper functions (isApiRoute, extractCustomerDomain, extractCardInfo, extractBookInfo)
- Updated components to use these shared patterns:
  - Added direct imports in background/service worker scripts 
  - Implemented dynamic ESM imports in content scripts
  - Added updateFeatureRegistry function in main.js to dynamically update patterns
  - Implemented fallback logic for when patterns aren't loaded yet
- Updated documentation in ARCHITECTURE.md and README.md to reflect these changes
- All components now use consistent URL patterns that work with both domain formats

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

### Script Loading Strategy
Consider reviewing and updating the codebase with one of the following changes:

### URL Pattern Enhancement
Following the recent centralization of URL patterns:
1. **Performance Optimization**: Consider pre-loading URL patterns to avoid delays in pattern matching
2. **Pattern Extensions**: Update the URL patterns module as new features or domain formats are added
3. **Testing Coverage**: Add comprehensive tests for edge cases in URL pattern matching

1. ✅ Audit all feature scripts to ensure they support either loading method but not both simultaneously. (Implemented manifest-only loading on May 21, 2025)
2. ✅ Choose a single loading strategy (manifest or dynamic) for all feature scripts and apply it consistently. (Implemented manifest-only loading on May 21, 2025)
3. Add script loading detection to prevent duplicate initialization if a script is loaded twice.