# PowerCloud Extension Developer Onboarding Guide

## Welcome to PowerCloud Extension Development

This guide will help you get started with developing features for the PowerCloud Chrome extension. The extension enhances the user experience on spend.cloud websites by providing developer-focused tools and functionality.

## Prerequisites

### Required Knowledge
- JavaScript ES6+ fundamentals
- Chrome Extension API basics
- HTML/CSS for UI components
- Asynchronous programming (Promises, async/await)
- Basic understanding of web development concepts

### Development Environment
- **Node.js**: Version 16+ for running tests and build tools
- **Chrome Browser**: Latest version for testing
- **Code Editor**: VS Code recommended with extensions:
  - ESLint for code linting
  - JSDoc support for documentation
  - Chrome Extension developer tools

### Repository Setup
1. Clone the repository and navigate to the project directory
2. Review the project structure and key files
3. Load the extension in Chrome developer mode
4. Verify all existing features work correctly

## Project Structure Overview

```
PowerCloud/
├── manifest.json              # Extension configuration
├── background/               # Background service worker
│   ├── service-worker.js     # Main background script
│   ├── token-manager.js      # Authentication token management
│   └── message-handlers/     # Message handling modules
├── content_scripts/          # Content scripts and features
│   ├── main.js              # Main content script entry point
│   ├── feature-manager.js   # Feature lifecycle management
│   └── features/            # Individual feature implementations
├── popup/                   # Extension popup interface
├── shared/                  # Shared utilities and modules
│   ├── base-feature.js      # Base class for all features
│   ├── logger.js            # Centralized logging system
│   ├── settings-manager.js  # Configuration management
│   ├── feature-validation.js # Feature validation framework
│   └── [other utilities]    # Additional shared modules
└── docs/                    # Project documentation
```

## Key Concepts

### 1. Feature Architecture

All features in the PowerCloud extension follow a consistent architecture based on the `BaseFeature` class:

```javascript
/**
 * Example feature implementation following PowerCloud standards.
 */
class ExampleFeature extends BaseFeature {
    constructor() {
        super('example-feature', {
            urlPatterns: ['*.spend.cloud/example/*'],
            dependencies: ['auth', 'api'],
            settings: {
                enabled: true,
                debugMode: false
            }
        });
    }

    /**
     * Feature initialization - called when feature is loaded.
     * @param {Object} match - URL match information
     */
    async onInit(match) {
        this.logger.info('Initializing example feature', { match });
        
        // Feature-specific initialization
        await this.setupUI();
        this.attachEventListeners();
        
        this.logger.info('Example feature initialized successfully');
    }

    /**
     * Feature cleanup - called when feature is unloaded.
     */
    async onCleanup() {
        this.logger.info('Cleaning up example feature');
        
        // Remove event listeners, UI elements, etc.
        this.removeEventListeners();
        this.cleanupUI();
    }

    /**
     * Feature activation - called when URL pattern matches.
     */
    async onActivate() {
        this.logger.debug('Activating example feature');
        // Activate feature functionality
    }

    /**
     * Feature deactivation - called when leaving matching URL.
     */
    async onDeactivate() {
        this.logger.debug('Deactivating example feature');
        // Deactivate feature functionality
    }
}
```

### 2. Configuration Management

Use the `SettingsManager` for all configuration needs:

```javascript
// Get user preferences
const preferences = await window.PowerCloudSettings.getUserPreferences();

// Get feature-specific settings
const featureEnabled = await window.PowerCloudSettings.getFeatureToggle('example-feature');

// Update settings with validation
await window.PowerCloudSettings.updateSetting('user.theme', 'dark');
```

### 3. Error Handling

Follow consistent error handling patterns:

```javascript
try {
    await this.performOperation();
} catch (error) {
    this.logger.error('Operation failed:', error);
    
    // Use specific error types
    throw new FeatureError(
        'Failed to perform operation',
        'example-feature',
        error
    );
}
```

### 4. Logging

Use the centralized logging system:

```javascript
// Different log levels
this.logger.debug('Detailed debugging information');
this.logger.info('General information');
this.logger.warn('Warning about potential issues');
this.logger.error('Error occurred:', error);

// Structured logging
this.logger.info('User action', {
    action: 'button_click',
    feature: 'example-feature',
    userId: 'user123'
});
```

## Development Workflow

### 1. Planning a New Feature

Before starting development:

1. **Define Requirements**: What should the feature do?
2. **Identify URL Patterns**: Which pages should activate the feature?
3. **List Dependencies**: What other features or APIs does it need?
4. **Plan Configuration**: What settings should be configurable?
5. **Consider Performance**: What are the performance requirements?

### 2. Feature Implementation Steps

#### Step 1: Create Feature File
Create a new file in `content_scripts/features/`:

```javascript
// content_scripts/features/my-new-feature.js

/**
 * @fileoverview Implementation of my new feature for PowerCloud extension.
 * @author Your Name
 * @version 1.0.0
 */

class MyNewFeature extends BaseFeature {
    constructor() {
        super('my-new-feature', {
            urlPatterns: ['*.spend.cloud/my-pattern/*'],
            dependencies: [],
            settings: {
                enabled: true
            }
        });
    }

    async onInit(match) {
        // Implementation here
    }
}

// Register feature
window.PowerCloudFeatures = window.PowerCloudFeatures || {};
window.PowerCloudFeatures.myNewFeature = new MyNewFeature();
```

#### Step 2: Register in Manifest
Add your feature script to `manifest.json`:

```json
{
  "content_scripts": [{
    "matches": ["*://*.spend.cloud/*"],
    "js": [
      "shared/logger.js",
      "shared/base-feature.js",
      "content_scripts/features/my-new-feature.js",
      "content_scripts/main.js"
    ]
  }]
}
```

#### Step 3: Add Feature Configuration
Update settings schema if needed:

```javascript
// In your feature or settings configuration
const featureSettings = {
    'my-new-feature': {
        type: 'object',
        properties: {
            enabled: { type: 'boolean', default: true },
            customOption: { type: 'string', default: 'default-value' }
        }
    }
};
```

#### Step 4: Write Tests
Create comprehensive tests for your feature:

```javascript
// Create test file: test-my-new-feature.js
describe('MyNewFeature', () => {
    let feature;

    beforeEach(() => {
        feature = new MyNewFeature();
    });

    afterEach(() => {
        if (feature) {
            feature.cleanup();
        }
    });

    it('should initialize correctly', async () => {
        await feature.init();
        expect(feature.isInitialized).toBe(true);
    });

    it('should handle URL pattern matching', () => {
        const testUrl = 'https://app.spend.cloud/my-pattern/test';
        expect(feature.matchesUrl(testUrl)).toBe(true);
    });
});
```

#### Step 5: Validate Feature
Use the validation framework to ensure quality:

```javascript
// Run feature validation
const validator = new FeatureValidator();
const result = await validator.validateFeature('my-new-feature', {
    checkDependencies: true,
    monitorPerformance: true,
    validateProperties: true
});

console.log(`Validation result: ${result.isValid ? 'PASS' : 'FAIL'}`);
if (!result.isValid) {
    console.error('Validation errors:', result.errors);
}
```

### 3. Testing and Debugging

#### Local Testing
1. Load extension in Chrome developer mode
2. Navigate to matching URL patterns
3. Open Chrome DevTools and check console for logs
4. Verify feature functionality works as expected

#### Automated Testing
```bash
# Run feature tests
node test-my-new-feature.js

# Run validation tests
node test-phase-2.2.js

# Run configuration tests
node test-phase-3.1.js
```

#### Debugging Tools
- Use the FeatureDebugger for advanced debugging
- Enable debug mode in feature configuration
- Use Chrome DevTools for breakpoints and inspection
- Check the extension's popup for health status

### 4. Documentation

#### JSDoc Documentation
Follow the established JSDoc standards:

```javascript
/**
 * Processes user payment information for Adyen integration.
 * 
 * @async
 * @method
 * @param {Object} paymentData - Payment information object
 * @param {string} paymentData.amount - Payment amount in cents
 * @param {string} paymentData.currency - Currency code (e.g., 'EUR')
 * @param {Object} paymentData.card - Card information
 * @param {Object} [options={}] - Processing options
 * @param {boolean} [options.validateCard=true] - Validate card before processing
 * @returns {Promise<PaymentResult>} Payment processing result
 * @throws {PaymentError} When payment processing fails
 * 
 * @example
 * const result = await feature.processPayment({
 *     amount: 10000, // €100.00
 *     currency: 'EUR',
 *     card: { number: '4111111111111111', cvv: '123' }
 * });
 */
async processPayment(paymentData, options = {}) {
    // Implementation
}
```

#### Update README
Add information about your feature to relevant documentation files.

## Best Practices

### 1. Code Quality
- Follow the established code style guide
- Use meaningful variable and function names
- Keep functions small and focused (max 50 lines)
- Add comprehensive error handling
- Include detailed JSDoc documentation

### 2. Performance
- Monitor feature initialization time
- Avoid memory leaks by cleaning up event listeners
- Use lazy loading for non-critical functionality
- Cache DOM queries when possible
- Set appropriate performance thresholds

### 3. User Experience
- Provide visual feedback for user actions
- Handle loading states gracefully
- Ensure accessibility compliance
- Test across different screen sizes
- Maintain consistency with existing UI patterns

### 4. Security
- Validate all user inputs
- Use secure communication patterns
- Follow Chrome extension security guidelines
- Sanitize data before DOM insertion
- Handle sensitive data appropriately

### 5. Maintainability
- Use consistent naming conventions
- Separate concerns appropriately
- Write testable code
- Document complex logic
- Follow the single responsibility principle

## Common Patterns and Examples

### 1. DOM Manipulation
```javascript
/**
 * Safely adds UI elements to the page.
 */
addUIElement() {
    // Create container
    const container = document.createElement('div');
    container.className = 'powercloud-feature-container';
    container.innerHTML = `
        <button class="powercloud-btn" data-action="process">
            Process Payment
        </button>
    `;

    // Find insertion point
    const targetElement = document.querySelector('.payment-section');
    if (targetElement) {
        targetElement.appendChild(container);
        
        // Track for cleanup
        this.createdElements.push(container);
    }
}
```

### 2. Event Handling
```javascript
/**
 * Sets up event listeners with proper cleanup tracking.
 */
attachEventListeners() {
    this.clickHandler = this.handleClick.bind(this);
    document.addEventListener('click', this.clickHandler);
    
    // Track for cleanup
    this.eventListeners.push({
        target: document,
        event: 'click',
        handler: this.clickHandler
    });
}

cleanupEventListeners() {
    this.eventListeners.forEach(({ target, event, handler }) => {
        target.removeEventListener(event, handler);
    });
    this.eventListeners.length = 0;
}
```

### 3. API Communication
```javascript
/**
 * Makes API requests with proper error handling.
 */
async makeAPIRequest(endpoint, data) {
    try {
        const token = await window.PowerCloudAuth.getToken();
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new APIError(`Request failed: ${response.status}`);
        }

        return await response.json();
        
    } catch (error) {
        this.logger.error('API request failed:', error);
        throw error;
    }
}
```

## Troubleshooting

### Common Issues

#### 1. Feature Not Loading
- Check manifest.json includes your script
- Verify URL patterns are correct
- Check for JavaScript errors in console
- Ensure dependencies are loaded first

#### 2. Settings Not Persisting
- Verify SettingsManager is properly initialized
- Check Chrome storage permissions
- Ensure setting keys follow naming conventions
- Validate setting values against schema

#### 3. Performance Issues
- Use PerformanceMonitor to identify bottlenecks
- Check for memory leaks in long-running features
- Optimize DOM queries and manipulation
- Consider lazy loading for heavy operations

#### 4. Chrome Extension API Issues
- Verify required permissions in manifest
- Check for deprecated API usage
- Ensure proper message passing patterns
- Test in different Chrome versions

### Debugging Tools

1. **Chrome DevTools**: Primary debugging tool
2. **FeatureDebugger**: Advanced feature-specific debugging
3. **PerformanceMonitor**: Performance analysis and optimization
4. **ErrorTracker**: Error pattern analysis and resolution
5. **Logger**: Centralized logging with filtering capabilities

## Getting Help

### Resources
- **ARCHITECTURE.md**: Detailed architecture documentation
- **CODE_STYLE_GUIDE.md**: Coding standards and conventions
- **JSDOC_STANDARDS.md**: Documentation requirements
- **Chrome Extension Documentation**: Official Chrome extension guides
- **Team Knowledge Base**: Internal documentation and examples

### Support Channels
- Team chat channels for quick questions
- Code review process for feedback
- Regular team meetings for complex issues
- Documentation updates for common problems

## Next Steps

After completing this onboarding:

1. Review existing features to understand patterns
2. Start with a simple feature implementation
3. Run the full test suite to ensure everything works
4. Get code review feedback on your first feature
5. Contribute to documentation improvements
6. Help onboard the next developer

Welcome to the PowerCloud Extension development team! We're excited to see what features you'll build.
