# PowerCloud Extension Code Style Guide

## Overview

This guide establishes consistent coding standards for the PowerCloud Chrome extension to improve maintainability, readability, and collaboration.

## JavaScript Standards

### File Organization

- **File Naming**: Use kebab-case for file names (e.g., `feature-manager.js`, `url-patterns.js`)
- **Directory Structure**: Follow the established pattern:
  ```
  /background/           # Background service worker and modules
  /content_scripts/      # Content scripts and features
  /popup/               # Popup UI components
  /shared/              # Shared utilities and modules
  /docs/                # Documentation files
  ```

### Code Structure

#### 1. File Header Comments
Every JavaScript file should start with a descriptive header:

```javascript
/**
 * @fileoverview Brief description of the file's purpose
 * @author PowerCloud Extension Team
 * @version 1.0.0
 */
```

#### 2. Class Definitions
Use ES6 classes with proper JSDoc documentation:

```javascript
/**
 * Manages feature lifecycle and dependencies.
 * @class
 */
class FeatureManager {
    /**
     * Creates a new FeatureManager instance.
     * @param {Object} options - Configuration options
     * @param {Logger} options.logger - Logger instance
     * @param {boolean} options.debug - Enable debug mode
     */
    constructor(options = {}) {
        this.logger = options.logger || new Logger();
        this.debug = options.debug || false;
        this.features = new Map();
    }

    /**
     * Initializes a feature with validation.
     * @param {string} featureName - Name of the feature to initialize
     * @param {Object} config - Feature configuration
     * @returns {Promise<boolean>} True if initialization successful
     * @throws {FeatureError} When feature initialization fails
     */
    async initializeFeature(featureName, config) {
        // Implementation here
    }
}
```

#### 3. Function Documentation
All functions should have comprehensive JSDoc comments:

```javascript
/**
 * Validates URL patterns against current page.
 * @param {string[]} patterns - Array of URL patterns to match
 * @param {string} currentUrl - Current page URL
 * @param {Object} options - Matching options
 * @param {boolean} options.caseSensitive - Enable case-sensitive matching
 * @param {boolean} options.strict - Enable strict pattern matching
 * @returns {Object} Match result with pattern and specificity
 * @example
 * const result = validateUrlPatterns(['*.spend.cloud/*'], 'https://app.spend.cloud/dashboard');
 * console.log(result.matched); // true
 */
function validateUrlPatterns(patterns, currentUrl, options = {}) {
    // Implementation here
}
```

### Naming Conventions

#### Variables and Functions
- Use camelCase for variables and functions
- Use descriptive names that explain purpose
- Avoid abbreviations unless commonly understood

```javascript
// Good
const featureManager = new FeatureManager();
const isUserAuthenticated = checkAuthStatus();
const apiResponseData = await fetchUserData();

// Avoid
const fm = new FeatureManager();
const isAuth = checkAuthStatus();
const data = await fetchUserData();
```

#### Constants
- Use UPPER_SNAKE_CASE for constants
- Group related constants in objects

```javascript
const API_ENDPOINTS = {
    USERS: '/api/users',
    TOKENS: '/api/auth/tokens',
    FEATURES: '/api/features'
};

const DEFAULT_TIMEOUT = 5000;
const MAX_RETRY_ATTEMPTS = 3;
```

#### Classes
- Use PascalCase for class names
- Use descriptive names that indicate purpose

```javascript
class FeatureValidator {
    // Implementation
}

class PerformanceMonitor {
    // Implementation
}
```

### Error Handling

#### Error Classes
Create specific error classes for different error types:

```javascript
/**
 * Base error class for PowerCloud extension.
 * @extends Error
 */
class PowerCloudError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Feature-specific error class.
 * @extends PowerCloudError
 */
class FeatureError extends PowerCloudError {
    constructor(message, featureName, originalError = null) {
        super(message, 'FEATURE_ERROR', { featureName, originalError });
    }
}
```

#### Error Handling Patterns
Use consistent error handling patterns:

```javascript
/**
 * Example of proper error handling with logging.
 */
async function initializeFeature(featureName) {
    try {
        this.logger.info(`Initializing feature: ${featureName}`);
        
        // Feature initialization logic
        const result = await this.loadFeature(featureName);
        
        this.logger.info(`Feature ${featureName} initialized successfully`);
        return result;
        
    } catch (error) {
        this.logger.error(`Failed to initialize feature ${featureName}:`, error);
        
        // Transform to specific error type
        throw new FeatureError(
            `Feature ${featureName} initialization failed`,
            featureName,
            error
        );
    }
}
```

### Code Formatting

#### Indentation and Spacing
- Use 4 spaces for indentation (no tabs)
- Add blank lines to separate logical sections
- Use consistent spacing around operators

```javascript
// Good
if (condition) {
    const result = performCalculation(
        parameter1,
        parameter2,
        parameter3
    );
    
    return result;
}

// Consistent operator spacing
const total = price + tax + shipping;
const isValid = (status === 'active') && (count > 0);
```

#### Line Length
- Keep lines under 100 characters
- Break long function calls and object definitions across multiple lines

```javascript
// Good - Multi-line function call
const result = await this.apiClient.makeRequest({
    endpoint: '/api/users',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
});

// Good - Multi-line object definition
const config = {
    debug: true,
    timeout: 5000,
    retries: 3,
    features: ['auth', 'monitoring', 'validation']
};
```

### Chrome Extension Specific Guidelines

#### Message Passing
Use consistent patterns for Chrome message passing:

```javascript
/**
 * Sends a message to the background script.
 * @param {string} action - Action type
 * @param {Object} data - Message data
 * @returns {Promise<Object>} Response from background script
 */
async function sendMessage(action, data = {}) {
    try {
        const response = await chrome.runtime.sendMessage({
            action,
            data,
            timestamp: Date.now()
        });
        
        if (response.error) {
            throw new Error(response.error);
        }
        
        return response;
        
    } catch (error) {
        this.logger.error(`Message sending failed:`, error);
        throw error;
    }
}
```

**Defensive Message Handler Pattern**
Always validate data parameters before using spread operators to prevent TypeError crashes:

```javascript
/**
 * Safe message handler with defensive data validation
 * @param {Object} message - Message object
 * @param {Object} sender - Sender information
 * @param {Function} sendResponse - Response callback
 */
export function handleRecordData(message, sender, sendResponse) {
    try {
        const { data, metadata } = message;
        
        // Defensive validation before spread operation
        const safeData = data && typeof data === 'object' ? data : {};
        const safeMetadata = metadata && typeof metadata === 'object' ? metadata : {};
        
        const record = {
            timestamp: Date.now(),
            source: sender.tab?.id || 'unknown',
            ...safeData,  // Safe to spread
            metadata: {
                ...safeMetadata  // Safe to spread
            }
        };
        
        // Process the record...
        sendResponse({ success: true });
        
    } catch (error) {
        console.error('[handler] Error processing message:', error);
        sendResponse({ success: false, error: error.message });
    }
    
    return true;
}
```

#### Storage Access
Use consistent patterns for Chrome storage:

```javascript
/**
 * Retrieves data from Chrome storage with error handling.
 * @param {string} key - Storage key
 * @param {*} defaultValue - Default value if key not found
 * @returns {Promise<*>} Retrieved value or default
 */
async function getStorageValue(key, defaultValue = null) {
    try {
        const result = await chrome.storage.local.get(key);
        return result[key] !== undefined ? result[key] : defaultValue;
        
    } catch (error) {
        this.logger.error(`Storage retrieval failed for key ${key}:`, error);
        return defaultValue;
    }
}
```

## Testing Standards

### Test File Organization
- Test files should be named with `.test.js` suffix
- Group tests by feature or module
- Use descriptive test names

```javascript
/**
 * Tests for FeatureManager class.
 * @fileoverview Comprehensive tests for feature management functionality.
 */

describe('FeatureManager', () => {
    describe('initializeFeature', () => {
        it('should successfully initialize a valid feature', async () => {
            // Test implementation
        });
        
        it('should throw FeatureError for invalid feature configuration', async () => {
            // Test implementation
        });
        
        it('should handle feature dependency resolution', async () => {
            // Test implementation
        });
    });
    
    describe('validateFeature', () => {
        it('should validate feature requirements correctly', () => {
            // Test implementation
        });
    });
});
```

### Test Documentation
Include comprehensive test documentation:

```javascript
/**
 * Test suite for URL pattern validation functionality.
 * Tests cover various URL matching scenarios including wildcards,
 * exact matches, and edge cases.
 */
describe('URL Pattern Validation', () => {
    /**
     * Test data for URL pattern matching.
     * Each test case includes pattern, URL, expected result, and description.
     */
    const testCases = [
        {
            pattern: '*.spend.cloud/*',
            url: 'https://app.spend.cloud/dashboard',
            expected: true,
            description: 'should match subdomain wildcard'
        }
        // More test cases...
    ];
    
    testCases.forEach(({ pattern, url, expected, description }) => {
        it(description, () => {
            const result = validateUrlPattern(pattern, url);
            expect(result).toBe(expected);
        });
    });
});
```

## Performance Guidelines

### Memory Management
- Clean up event listeners and observers
- Use WeakMap/WeakSet for object references when appropriate
- Avoid memory leaks in long-running content scripts

```javascript
class FeatureManager {
    constructor() {
        this.features = new Map();
        this.observers = new WeakMap();
        this.cleanup = [];
    }
    
    addEventListeners() {
        const handler = this.handleEvent.bind(this);
        document.addEventListener('click', handler);
        
        // Track for cleanup
        this.cleanup.push(() => {
            document.removeEventListener('click', handler);
        });
    }
    
    destroy() {
        // Clean up all registered listeners
        this.cleanup.forEach(fn => fn());
        this.cleanup.length = 0;
        this.features.clear();
    }
}
```

### DOM Manipulation
- Batch DOM updates when possible
- Use DocumentFragment for multiple insertions
- Cache DOM queries

```javascript
/**
 * Efficiently updates multiple DOM elements.
 * @param {Object[]} updates - Array of update objects
 */
function batchUpdateDOM(updates) {
    const fragment = document.createDocumentFragment();
    
    updates.forEach(update => {
        const element = document.createElement(update.tag);
        element.textContent = update.content;
        element.className = update.className;
        fragment.appendChild(element);
    });
    
    // Single DOM operation
    document.getElementById('container').appendChild(fragment);
}
```

## Code Review Guidelines

### Before Submitting Code
1. Run all tests and ensure they pass
2. Verify JSDoc documentation is complete
3. Check for console errors in browser
4. Test in both development and production environments
5. Validate code follows this style guide

### Review Checklist
- [ ] Code follows naming conventions
- [ ] Functions have proper JSDoc documentation
- [ ] Error handling is comprehensive
- [ ] Performance considerations are addressed
- [ ] Tests are included for new functionality
- [ ] Chrome extension APIs are used correctly
- [ ] Memory leaks are prevented

## Tools and Setup

### Recommended VS Code Extensions
- ESLint for code linting
- JSDoc support for documentation
- Chrome extension development tools

### ESLint Configuration
Create `.eslintrc.json` in project root:

```json
{
    "env": {
        "browser": true,
        "es2021": true,
        "webextensions": true
    },
    "extends": ["eslint:recommended"],
    "rules": {
        "indent": ["error", 4],
        "quotes": ["error", "single"],
        "semi": ["error", "always"],
        "no-unused-vars": "warn",
        "no-console": "warn"
    }
}
```

This style guide should be followed consistently across all PowerCloud extension development to maintain code quality and readability.
