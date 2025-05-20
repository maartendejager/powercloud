# Feature Manager

The Feature Manager is a core component of the PowerCloud extension architecture that handles dynamic loading and unloading of features based on URL patterns.

## Purpose

The Feature Manager provides a centralized mechanism to:

1. Track active features on the current page
2. Detect URL changes in single-page applications (SPAs)
3. Initialize appropriate features when matching URLs are detected
4. Clean up features when navigating away from their relevant pages

## Usage

The Feature Manager is instantiated in `main.js` with the feature registry:

```javascript
const featureManager = new window.FeatureManager(features).init();
```

## Key Methods

- **checkPage()**: Analyzes the current URL and loads matching features
- **cleanup()**: Cleans up active features when navigating away
- **setupUrlChangeDetection()**: Configures detection mechanisms for URL changes
- **init()**: Sets up the Feature Manager and begins monitoring the page

## Benefits of Separation

Extracting the Feature Manager into its own file:

1. **Reduces Main.js Size**: Makes main.js more focused on feature definition rather than management
2. **Improves Reusability**: Can be reused across different extensions with similar feature-based architecture
3. **Better Separation of Concerns**: Cleanly separates feature management from feature implementation
4. **Easier Testing**: Module can be tested independently from the rest of the extension

## Integration with Feature Scripts

The Feature Manager works hand-in-hand with the feature scripts in `content_scripts/features/` by:

1. Ensuring features are loaded only on matching pages
2. Calling proper cleanup functions when navigating away
3. Preventing duplicate feature initialization

This architecture allows developers to focus on creating individual features without worrying about the complexities of when to load, unload, or manage features based on URL patterns.
