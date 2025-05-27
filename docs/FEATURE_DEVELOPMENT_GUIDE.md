# PowerCloud Extension - Feature Development Guide

This guide provides comprehensive instructions for developing new features for the PowerCloud Chrome extension. It consolidates all relevant information from across the project documentation to create a single reference for developers.

## Table of Contents

- [Overview](#overview)
- [Feature Architecture](#feature-architecture)
- [Development Workflow](#development-workflow)
  - [1. Planning a New Feature](#1-planning-a-new-feature)
  - [2. Feature Implementation Steps](#2-feature-implementation-steps)
  - [3. Testing and Validation](#3-testing-and-validation)
  - [4. Documentation](#4-documentation)
- [BaseFeature Class](#basefeature-class)
  - [Lifecycle Hooks](#lifecycle-hooks)
  - [Error Handling](#error-handling)
  - [Utility Methods](#utility-methods)
- [Script Creation and Organization](#script-creation-and-organization)
- [Script Loading Strategy](#script-loading-strategy)
- [Feature Communication](#feature-communication)
- [Testing Your Feature](#testing-your-feature)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Examples](#examples)

## Overview

The PowerCloud extension enhances the user experience on `spend.cloud` websites by providing developer-focused tools and functionality. Features are implemented as modular components that follow a standardized architecture based on the `BaseFeature` class.

## Feature Architecture

All features in the PowerCloud extension follow a consistent architecture based on the `BaseFeature` class, which provides:

- Standardized lifecycle management
- Built-in error handling with context
- Debug logging for troubleshooting
- State tracking (isInitialized, isActive)
- Performance monitoring

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

Create a new file in `content_scripts/features/` following the naming convention `feature-name.js`:

```javascript
/**
 * @fileoverview Implementation of my new feature for PowerCloud extension.
 * @author Your Name
 * @version 1.0.0
 */

// Initialize logger for this feature
const myFeatureLogger = (() => {
  if (window.PowerCloudLoggerFactory) {
    return window.PowerCloudLoggerFactory.createLogger('MyNewFeature');
  }
  return {
    info: (message, data) => console.log(`[INFO][MyNewFeature] ${message}`, data || ''),
    warn: (message, data) => console.warn(`[WARN][MyNewFeature] ${message}`, data || ''),
    error: (message, data) => console.error(`[ERROR][MyNewFeature] ${message}`, data || '')
  };
})();

/**
 * MyNewFeature class extending BaseFeature
 * Provides [describe functionality] for PowerCloud extension
 */
class MyNewFeature extends BaseFeature {
    constructor() {
        super('my-new-feature', {
            enableDebugLogging: false // Set to true for development
        });
        
        // Feature-specific properties
        this.customer = null;
        this.resourceId = null;
        
        // Feature configuration
        this.config = {
            retryAttempts: 3,
            retryDelay: 1000,
            timeout: 5000
        };
        
        // UI elements
        this.buttonManager = null;
    }

    /**
     * Initialize the feature with URL match data
     * @param {object} match - The URL match result containing capture groups
     */
    async onInit(match) {
        await super.onInit(match);
        
        if (!match || match.length < 3) {
            throw new Error('Invalid match data for my new feature');
        }

        // Extract data from URL match
        this.customer = match[1];
        this.resourceId = match[2];
        
        // Load feature-specific configuration
        await this.loadFeatureConfig();
        
        this.log('Initializing my new feature', { 
            customer: this.customer, 
            resourceId: this.resourceId,
            config: this.config 
        });
    }

    /**
     * Activate the feature - check settings and setup UI
     */
    async onActivate() {
        await super.onActivate();
        
        try {
            // Check if feature should be shown
            const result = await this.getStorageSettings();
            const showButtons = result.showButtons === undefined ? true : result.showButtons;

            if (!showButtons) {
                this.log('Buttons disabled, skipping feature activation');
                return;
            }

            // Initialize UI or other activation logic
            await this.setupFeatureUI();
            
        } catch (error) {
            this.handleError('Failed to activate my new feature', error);
        }
    }

    /**
     * Deactivate the feature
     */
    onDeactivate() {
        super.onDeactivate();
        // Feature-specific deactivation logic
        this.cleanupUI();
    }

    /**
     * Clean up the feature
     */
    async onCleanup() {
        this.cleanupUI();
        await super.onCleanup();
    }

    /**
     * Load feature-specific configuration from storage
     */
    async loadFeatureConfig() {
        try {
            const result = await this.getStorageSettings();
            
            // Merge with default config
            if (result.myFeatureConfig) {
                this.config = { ...this.config, ...result.myFeatureConfig };
            }
            
            this.log('Feature configuration loaded', { config: this.config });
        } catch (error) {
            this.handleError('Failed to load feature configuration', error);
        }
    }

    /**
     * Get storage settings as a Promise
     * @returns {Promise<Object>}
     */
    getStorageSettings() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['showButtons', 'myFeatureConfig'], resolve);
        });
    }

    /**
     * Setup feature UI
     */
    async setupFeatureUI() {
        // Implementation depends on your feature's UI needs
        this.log('Setting up feature UI');
    }

    /**
     * Clean up UI elements
     */
    cleanupUI() {
        // Clean up any UI elements created by this feature
        this.log('Cleaning up feature UI');
    }

    /**
     * Send message to background script with timeout handling
     * Required for features that communicate with background script
     * @param {Object} message - Message to send
     * @param {number} timeout - Timeout in milliseconds (default: 5000)
     * @returns {Promise<Object>} Response from background script
     */
    sendMessageWithTimeout(message, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Message timeout after ${timeout}ms`));
            }, timeout);

            chrome.runtime.sendMessage(message, (response) => {
                clearTimeout(timeoutId);
                
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
    }

    /**
     * Send message to background script without timeout
     * Required for features that communicate with background script
     * @param {Object} message - Message to send
     * @returns {Promise<Object>} Response from background script
     */
    sendMessage(message) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
    }
}

// Create feature instance
const myNewFeature = new MyNewFeature();

// Create namespace for PowerCloud features if it doesn't exist
window.PowerCloudFeatures = window.PowerCloudFeatures || {};

myFeatureLogger.info('Registering my-new-feature');

// Register feature with backward compatibility pattern
window.PowerCloudFeatures.myNewFeature = {
    init: async (match) => {
        myFeatureLogger.info('my-new-feature init called with match:', match);
        try {
            await myNewFeature.onInit(match);
            await myNewFeature.onActivate();
        } catch (error) {
            myFeatureLogger.error('my-new-feature initialization error:', error);
            myNewFeature.onError(error, 'initialization');
        }
    },
    cleanup: async () => {
        myFeatureLogger.info('my-new-feature cleanup called');
        try {
            await myNewFeature.onDeactivate();
            await myNewFeature.onCleanup();
        } catch (error) {
            myFeatureLogger.error('my-new-feature cleanup error:', error);
            myNewFeature.onError(error, 'cleanup');
        }
    }
};

myFeatureLogger.info('my-new-feature registered successfully');
```

#### Step 2: Register in Manifest

Add your feature script to `manifest.json` in the `content_scripts` section:

```json
{
  "content_scripts": [{
    "matches": ["*://*.spend.cloud/*"],
    "js": [
      "shared/logger.js",
      "shared/base-feature.js",
      "content_scripts/features/my-new-feature.js",
      "content_scripts/feature-manager.js",
      "content_scripts/main.js"
    ]
  }]
}
```

#### Step 3: Register Your Feature in main.js

Add your feature to the `features` array in `main.js`:

```javascript
const features = [
  // ...existing features
  {
    name: 'myNewFeature',
    urlPattern: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/my-feature-pattern\/([^\/]+)(\/.*|$)/,
    init: async function(match) {
      const logger = window.loggerFactory ? window.loggerFactory.createLogger('Main') : null;
      
      if (logger) {
        logger.info('myNewFeature init called', { match });
      }
      
      // Wait for feature to be available (with timeout)
      let attempts = 0;
      const maxAttempts = 10;
      const delay = 100; // 100ms between attempts
      
      while (attempts < maxAttempts) {
        if (window.PowerCloudFeatures?.myNewFeature?.init) {
          if (logger) {
            logger.info('Calling my-new-feature init', { attempt: attempts + 1 });
          }
          return await window.PowerCloudFeatures.myNewFeature.init(match);
        }
        
        attempts++;
        if (logger) {
          logger.debug('Waiting for my-new-feature to register', { 
            attempt: attempts, 
            maxAttempts 
          });
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      if (logger) {
        logger.error('my-new-feature failed to register', { maxAttempts });
      }
    },
    cleanup: function() {
      if (window.PowerCloudFeatures?.myNewFeature?.cleanup) {
        return window.PowerCloudFeatures.myNewFeature.cleanup();
      }
    }
  }
];
```

#### Step 4: Feature Configuration and Storage Integration

Features typically need to access Chrome storage for configuration and user preferences. Here's the recommended pattern based on existing implementations:

```javascript
class MyNewFeature extends BaseFeature {
    constructor() {
        super('my-new-feature', {
            enableDebugLogging: false
        });
        
        // Feature configuration with defaults
        this.config = {
            retryAttempts: 3,
            retryDelay: 1000,
            timeout: 5000,
            autoRetryOnFailure: true,
            showDetailedErrors: false
        };
    }

    /**
     * Load feature-specific configuration from Chrome storage
     */
    async loadFeatureConfig() {
        try {
            const result = await this.getStorageSettings();
            
            // Merge stored config with defaults
            if (result.myNewFeatureConfig) {
                this.config = { ...this.config, ...result.myNewFeatureConfig };
            }
            
            this.log('Feature configuration loaded', { config: this.config });
        } catch (error) {
            this.handleError('Failed to load feature configuration', error);
            // Continue with defaults if config loading fails
        }
    }

    /**
     * Get storage settings as a Promise (standard pattern)
     * @returns {Promise<Object>}
     */
    getStorageSettings() {
        return new Promise((resolve) => {
            chrome.storage.local.get([
                'showButtons',           // Global setting for button visibility
                'myNewFeatureConfig',   // Feature-specific configuration
                'debugMode'             // Global debug settings
            ], resolve);
        });
    }

    /**
     * Save feature configuration to storage
     */
    async saveFeatureConfig() {
        try {
            await new Promise((resolve) => {
                chrome.storage.local.set({
                    myNewFeatureConfig: this.config
                }, resolve);
            });
            
            this.log('Feature configuration saved');
        } catch (error) {
            this.handleError('Failed to save feature configuration', error);
        }
    }

    async onActivate() {
        await super.onActivate();
        
        // Always check global button visibility setting
        const settings = await this.getStorageSettings();
        
        if (!settings.showButtons) {
            this.log('Global button display disabled, skipping feature activation');
            return;
        }

        // Check feature-specific settings
        if (this.config.enabled === false) {
            this.log('Feature disabled by configuration');
            return;
        }

        // Proceed with feature activation
        await this.setupFeatureUI();
    }
}
```

#### Step 5: UI Integration with PowerCloud Button Manager

For features that need to add UI elements, use the PowerCloud button management system:

```javascript
class MyNewFeature extends BaseFeature {
    constructor() {
        super('my-new-feature', { enableDebugLogging: false });
        
        // UI management
        this.buttonManager = null;
        this.uiElements = new Map(); // Track created UI elements
    }

    async setupFeatureUI() {
        try {
            // Initialize button manager if available
            if (window.PowerCloudButtonManager) {
                this.buttonManager = window.PowerCloudButtonManager;
            }

            // Create feature-specific UI elements
            await this.createMainButton();
            await this.createStatusIndicator();
            
        } catch (error) {
            this.handleError('Failed to setup feature UI', error);
        }
    }

    async createMainButton() {
        if (!this.buttonManager) {
            this.log('Button manager not available, using fallback UI creation');
            this.createFallbackButton();
            return;
        }

        try {
            const buttonConfig = {
                text: 'My Feature',
                title: 'Activate my feature functionality',
                className: 'powercloud-my-feature-button',
                onClick: () => this.handleButtonClick()
            };

            const button = this.buttonManager.createButton(buttonConfig);
            this.uiElements.set('mainButton', button);
            
            this.log('Main button created successfully');
        } catch (error) {
            this.handleError('Failed to create main button', error);
            this.createFallbackButton();
        }
    }

    createFallbackButton() {
        // Fallback UI creation for when PowerCloudButtonManager is not available
        const button = document.createElement('button');
        button.textContent = 'My Feature';
        button.className = 'powercloud-my-feature-button';
        button.onclick = () => this.handleButtonClick();
        
        // Find appropriate container
        const container = document.querySelector('.button-container') || document.body;
        container.appendChild(button);
        
        this.uiElements.set('mainButton', button);
        this.log('Fallback button created');
    }

    handleButtonClick() {
        this.log('Feature button clicked');
        
        // Implement feature-specific functionality
        this.executeFeatureAction();
    }

    async executeFeatureAction() {
        try {
            // Example: Send message to background script
            const response = await this.sendMessageWithTimeout({
                action: 'myFeatureAction',
                customer: this.customer,
                resourceId: this.resourceId,
                config: this.config
            }, this.config.timeout);

            if (response && response.success) {
                this.showResult(response.data);
            } else {
                this.handleError('Feature action failed', new Error(response?.error || 'Unknown error'));
            }
            
        } catch (error) {
            this.handleError('Feature action error', error);
        }
    }

    /**
     * Send message with timeout (standard pattern from existing features)
     */
    sendMessageWithTimeout(message, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Message timeout after ${timeout}ms`));
            }, timeout);

            chrome.runtime.sendMessage(message, (response) => {
                clearTimeout(timeoutId);
                
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
    }

    cleanupUI() {
        // Remove all created UI elements
        for (const [name, element] of this.uiElements.entries()) {
            try {
                if (element && element.parentNode) {
                    element.parentNode.removeChild(element);
                    this.log(`Removed UI element: ${name}`);
                }
            } catch (error) {
                this.log(`Error removing UI element ${name}:`, error);
            }
        }
        
        this.uiElements.clear();
        this.buttonManager = null;
    }
}

### 3. Testing and Validation

#### Error Handling Patterns

Implement robust error handling with retry logic and graceful degradation:

```javascript
class MyNewFeature extends BaseFeature {
    constructor() {
        super('my-new-feature', { enableDebugLogging: false });
        
        // Error tracking
        this.apiErrors = new Map();
        this.lastErrorTime = null;
        this.retryCount = 0;
    }

    /**
     * Execute feature action with retry logic and error tracking
     */
    async executeFeatureActionWithRetry() {
        let attempt = 0;
        let lastError = null;
        
        while (attempt < this.config.retryAttempts) {
            try {
                attempt++;
                this.log(`Executing feature action (attempt ${attempt}/${this.config.retryAttempts})`);
                
                const response = await this.sendMessageWithTimeout({
                    action: 'myFeatureAction',
                    customer: this.customer,
                    resourceId: this.resourceId,
                    attempt: attempt
                }, this.config.timeout);

                if (response && response.success) {
                    // Reset retry count on success
                    this.retryCount = 0;
                    this.apiErrors.clear();
                    
                    this.showResult(response.data);
                    return response;
                }

                // Handle API errors
                const errorCode = response?.errorCode || 'UNKNOWN_ERROR';
                this.trackApiError(errorCode, response?.error);
                
                lastError = new Error(response?.error || 'API request failed');

            } catch (error) {
                lastError = error;
                this.trackApiError('NETWORK_ERROR', error.message);
                
                this.log(`Attempt ${attempt} failed:`, error.message);
                
                // Don't retry on certain error types
                if (this.isNonRetryableError(error)) {
                    break;
                }
                
                // Wait before retry
                if (attempt < this.config.retryAttempts) {
                    await this.delay(this.config.retryDelay * attempt);
                }
            }
        }

        // All retries failed
        this.handleError('Feature action failed after all retries', lastError, {
            attempts: attempt,
            apiErrors: Array.from(this.apiErrors.entries()),
            customer: this.customer,
            resourceId: this.resourceId
        });

        // Fallback behavior
        if (this.config.fallbackToDefaultBehavior) {
            this.showFallbackMessage();
        }
    }

    /**
     * Track API errors for debugging and monitoring
     */
    trackApiError(errorCode, errorMessage) {
        const errorCount = this.apiErrors.get(errorCode) || 0;
        this.apiErrors.set(errorCode, errorCount + 1);
        this.lastErrorTime = Date.now();
        
        this.log(`API error tracked: ${errorCode}`, {
            message: errorMessage,
            count: errorCount + 1,
            timestamp: this.lastErrorTime
        });
    }

    /**
     * Check if error should not be retried
     */
    isNonRetryableError(error) {
        const nonRetryableMessages = [
            'Authentication required',
            'Access denied',
            'Resource not found',
            'Invalid parameters'
        ];
        
        return nonRetryableMessages.some(msg => 
            error.message && error.message.includes(msg)
        );
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Show fallback message when primary action fails
     */
    showFallbackMessage() {
        this.log('Showing fallback message due to feature failure');
        
        // Create simple notification or message
        const message = document.createElement('div');
        message.className = 'powercloud-fallback-message';
        message.textContent = 'Feature temporarily unavailable. Please try again later.';
        
        document.body.appendChild(message);
        
        // Auto-remove after delay
        setTimeout(() => {
            if (message.parentNode) {
                message.parentNode.removeChild(message);
            }
        }, 3000);
    }
}
```

#### Local Testing and Development

1. **Enable Debug Logging**: Set `enableDebugLogging: true` during development
2. **Use Chrome DevTools**: Monitor console for feature lifecycle logs
3. **Test URL Patterns**: Verify feature activates on correct pages
4. **Test Error Scenarios**: Simulate network failures and API errors
5. **Validate UI Integration**: Ensure buttons appear correctly and function properly

```javascript
// Development testing setup
class MyNewFeature extends BaseFeature {
    constructor() {
        super('my-new-feature', {
            enableDebugLogging: true // Enable for development
        });
    }

    async onInit(match) {
        await super.onInit(match);
        
        // Development-only validation
        if (this.enableDebugLogging) {
            this.validateUrlMatch(match);
            this.validateDependencies();
            this.validateConfiguration();
        }
    }

    validateUrlMatch(match) {
        if (!match || match.length < 3) {
            this.logger.warn('Invalid URL match structure', { match });
            return false;
        }
        
        this.logger.debug('URL match validation passed', {
            customer: match[1],
            resourceId: match[2],
            fullMatch: match[0]
        });
        return true;
    }

    validateDependencies() {
        const requiredGlobals = [
            'window.PowerCloudFeatures',
            'window.PowerCloudLoggerFactory',
            'chrome.storage',
            'chrome.runtime'
        ];

        for (const dependency of requiredGlobals) {
            const exists = this.checkGlobalExists(dependency);
            this.logger.debug(`Dependency check: ${dependency}`, { exists });
            
            if (!exists) {
                this.logger.warn(`Missing dependency: ${dependency}`);
            }
        }
    }

    checkGlobalExists(path) {
        const parts = path.split('.');
        let current = window;
        
        for (const part of parts.slice(1)) { // Skip 'window'
            if (!current || typeof current[part] === 'undefined') {
                return false;
            }
            current = current[part];
        }
        return true;
    }

    validateConfiguration() {
        const requiredConfigKeys = ['retryAttempts', 'timeout', 'retryDelay'];
        const missingKeys = requiredConfigKeys.filter(key => 
            this.config[key] === undefined
        );

        if (missingKeys.length > 0) {
            this.logger.warn('Missing configuration keys', { missingKeys });
        } else {
            this.logger.debug('Configuration validation passed', { config: this.config });
        }
    }
}
```

#### Automated Testing Framework

Create comprehensive tests for your feature:

```javascript
// testing/my-new-feature-test.js
describe('MyNewFeature', () => {
    let feature;
    let mockChrome;
    let mockWindow;

    beforeEach(() => {
        // Mock Chrome APIs
        mockChrome = {
            storage: {
                local: {
                    get: jest.fn(),
                    set: jest.fn()
                }
            },
            runtime: {
                sendMessage: jest.fn(),
                lastError: null
            }
        };
        global.chrome = mockChrome;

        // Mock window globals
        mockWindow = {
            PowerCloudFeatures: {},
            PowerCloudLoggerFactory: {
                createLogger: jest.fn(() => ({
                    info: jest.fn(),
                    warn: jest.fn(),
                    error: jest.fn(),
                    debug: jest.fn()
                }))
            }
        };
        Object.assign(global.window, mockWindow);

        feature = new MyNewFeature();
    });

    afterEach(async () => {
        if (feature && feature.getIsInitialized()) {
            await feature.onCleanup();
        }
    });

    describe('Initialization', () => {
        it('should initialize with valid URL match', async () => {
            const match = ['https://app.spend.cloud/resource/123', 'app', '123'];
            
            await feature.onInit(match);
            
            expect(feature.getIsInitialized()).toBe(true);
            expect(feature.customer).toBe('app');
            expect(feature.resourceId).toBe('123');
        });

        it('should throw error with invalid URL match', async () => {
            const invalidMatch = ['incomplete'];
            
            await expect(feature.onInit(invalidMatch)).rejects.toThrow('Invalid match data');
        });

        it('should load configuration from storage', async () => {
            const storedConfig = { retryAttempts: 5, timeout: 10000 };
            mockChrome.storage.local.get.mockImplementation((keys, callback) => {
                callback({ myNewFeatureConfig: storedConfig });
            });

            const match = ['https://app.spend.cloud/resource/123', 'app', '123'];
            await feature.onInit(match);

            expect(feature.config.retryAttempts).toBe(5);
            expect(feature.config.timeout).toBe(10000);
        });
    });

    describe('Activation', () => {
        beforeEach(async () => {
            const match = ['https://app.spend.cloud/resource/123', 'app', '123'];
            await feature.onInit(match);
        });

        it('should skip activation when buttons disabled', async () => {
            mockChrome.storage.local.get.mockImplementation((keys, callback) => {
                callback({ showButtons: false });
            });

            await feature.onActivate();

            expect(feature.getIsActive()).toBe(true); // BaseFeature sets this
            // But feature-specific UI should not be created
        });

        it('should create UI when buttons enabled', async () => {
            mockChrome.storage.local.get.mockImplementation((keys, callback) => {
                callback({ showButtons: true });
            });

            // Mock DOM
            document.body.innerHTML = '<div class="button-container"></div>';

            await feature.onActivate();

            expect(feature.getIsActive()).toBe(true);
            expect(feature.uiElements.size).toBeGreaterThan(0);
        });
    });

    describe('Error Handling', () => {
        beforeEach(async () => {
            const match = ['https://app.spend.cloud/resource/123', 'app', '123'];
            await feature.onInit(match);
        });

        it('should retry failed API calls', async () => {
            let callCount = 0;
            mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
                callCount++;
                if (callCount < 3) {
                    callback({ success: false, error: 'Network error' });
                } else {
                    callback({ success: true, data: 'Success' });
                }
            });

            await feature.executeFeatureActionWithRetry();

            expect(callCount).toBe(3);
            expect(feature.retryCount).toBe(0); // Reset on success
        });

        it('should stop retrying on non-retryable errors', async () => {
            mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
                callback({ success: false, error: 'Access denied' });
            });

            await feature.executeFeatureActionWithRetry();

            // Should only try once for non-retryable errors
            expect(mockChrome.runtime.sendMessage).toHaveBeenCalledTimes(1);
        });

        it('should track API errors for monitoring', async () => {
            mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
                callback({ success: false, errorCode: 'TIMEOUT', error: 'Request timeout' });
            });

            await feature.executeFeatureActionWithRetry();

            expect(feature.apiErrors.get('TIMEOUT')).toBe(feature.config.retryAttempts);
            expect(feature.lastErrorTime).toBeDefined();
        });
    });

    describe('Cleanup', () => {
        it('should remove all UI elements', async () => {
            document.body.innerHTML = '<div class="button-container"></div>';
            
            const match = ['https://app.spend.cloud/resource/123', 'app', '123'];
            await feature.onInit(match);
            
            mockChrome.storage.local.get.mockImplementation((keys, callback) => {
                callback({ showButtons: true });
            });
            await feature.onActivate();

            const initialElementCount = feature.uiElements.size;
            expect(initialElementCount).toBeGreaterThan(0);

            await feature.onCleanup();

            expect(feature.uiElements.size).toBe(0);
            expect(feature.getIsInitialized()).toBe(false);
        });
    });
});
```

Run tests with:

```bash
# Install testing dependencies
npm install --save-dev jest

# Run tests
npm test testing/my-new-feature-test.js
```

#### Feature Validation and Health Monitoring

Use the built-in validation framework:

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

### 4. Documentation

Document your feature according to the project standards:

1. Add JSDoc comments to all classes, methods, and functions
2. Update README.md if adding user-visible functionality
3. Consider adding a feature-specific documentation file in the `docs/` directory

## BaseFeature Class

The `BaseFeature` class is the foundation for all features in the PowerCloud extension. It provides a standardized structure with lifecycle hooks, error handling, performance monitoring, and enhanced debugging capabilities.

### Constructor

```javascript
class MyFeature extends BaseFeature {
    constructor() {
        super('feature-name', {
            hostElementId: 'powercloud-feature-name-host', // Optional
            enableDebugLogging: false // Set to true for development
        });
        
        // Feature-specific properties
        this.customer = null;
        this.resourceId = null;
        
        // Feature configuration
        this.config = {
            retryAttempts: 3,
            retryDelay: 1000,
            timeout: 5000
        };
    }
}
```

### Lifecycle Hooks

The BaseFeature class provides four main lifecycle hooks that features should implement:

```javascript
class MyFeature extends BaseFeature {
    /**
     * Initialize the feature with URL match data
     * @param {object} match - The URL match result containing capture groups
     */
    async onInit(match) {
        await super.onInit(match); // Always call parent method first
        
        // Extract data from URL match
        this.customer = match[1];
        this.resourceId = match[2];
        
        // Feature-specific initialization
        await this.loadConfiguration();
    }
    
    /**
     * Activate the feature - setup UI and start operations
     */
    async onActivate() {
        await super.onActivate(); // Always call parent method first
        
        // Check if feature should be enabled
        const settings = await this.getStorageSettings();
        if (!settings.showButtons) {
            return;
        }
        
        // Setup feature UI and start operations
        await this.setupUI();
    }
    
    /**
     * Deactivate the feature - hide UI but keep state
     */
    onDeactivate() {
        super.onDeactivate(); // Always call parent method first
        
        // Hide UI elements but don't destroy them
        this.hideUI();
    }
    
    /**
     * Clean up the feature - remove all elements and reset state
     */
    async onCleanup() {
        // Cleanup feature-specific resources
        this.removeUI();
        
        await super.onCleanup(); // Always call parent method last
    }
}
```

### Error Handling

The BaseFeature class provides enhanced error handling with context:

```javascript
try {
    await this.performOperation();
} catch (error) {
    // Enhanced error handling with context
    this.handleError('Operation failed', error, {
        customer: this.customer,
        resourceId: this.resourceId,
        operationType: 'data-fetch'
    });
}

// Alternative: Use onError for custom error handling
this.onError(error, 'context-description');
```

### Utility Methods

```javascript
// Logging with feature context
this.log('Debug message', { additionalData }); // Only logs if debug enabled

// State checking
const isActive = this.getIsActive();
const isInitialized = this.getIsInitialized();

// Host element management
const hostElement = this.getHostElement();
this.removeHostElement(); // Utility for cleanup

// Performance and health monitoring
const metrics = this.getPerformanceMetrics();
const health = this.getHealthStatus();

// Storage access pattern
const settings = await this.getStorageSettings();

// Chrome runtime communication (must be implemented by features that need background communication)
// Note: These methods are NOT provided by BaseFeature and must be implemented by each feature
const response = await this.sendMessageWithTimeout(message, timeout);
const result = await this.sendMessage(message);
```

**⚠️ Important**: The `sendMessageWithTimeout()` and `sendMessage()` methods are **not provided by BaseFeature** and must be implemented by features that need Chrome runtime communication. See the "Chrome Runtime Communication" section for implementation details.

### Feature Registration Pattern

Features must register themselves in the PowerCloudFeatures namespace:

```javascript
// Create feature instance
const myFeature = new MyFeature();

// Register with PowerCloudFeatures namespace
window.PowerCloudFeatures = window.PowerCloudFeatures || {};
window.PowerCloudFeatures.myFeature = {
    init: async (match) => {
        try {
            await myFeature.onInit(match);
            await myFeature.onActivate();
        } catch (error) {
            myFeature.onError(error, 'initialization');
        }
    },
    cleanup: async () => {
        try {
            await myFeature.onDeactivate();
            await myFeature.onCleanup();
        } catch (error) {
            myFeature.onError(error, 'cleanup');
        }
    }
};
```

## Script Creation and Organization

1. **File Location**: Place all feature scripts in the `content_scripts/features/` directory.
2. **Naming Convention**: Use descriptive names that indicate the feature's functionality (e.g., `feature-name.js`).
3. **Structure**: Each feature script should be self-contained with well-defined entry points.

## Script Loading Strategy

All feature scripts in this extension are loaded via the manifest.json file. This approach ensures consistency and avoids potential issues with duplicate script loading.

1. Add the script path to the `content_scripts` section in `manifest.json`
2. Ensure your feature script exports necessary functions by attaching them to the `window` object with unique names
3. Register your feature in the `features` array in `main.js`
4. Use the `PowerCloudFeatures` namespace to organize all feature functions

## Chrome Runtime Communication (Essential Methods)

**⚠️ IMPORTANT**: Features that communicate with the background script must implement Chrome runtime communication methods. These are commonly forgotten but essential for API integration.

### Required Methods for Background Communication

```javascript
class MyFeature extends BaseFeature {
    /**
     * Send message to background script with timeout handling
     * @param {Object} message - Message to send
     * @param {number} timeout - Timeout in milliseconds (default: 5000)
     * @returns {Promise<Object>} Response from background script
     */
    sendMessageWithTimeout(message, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Message timeout after ${timeout}ms`));
            }, timeout);

            chrome.runtime.sendMessage(message, (response) => {
                clearTimeout(timeoutId);
                
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
    }

    /**
     * Send message to background script without timeout
     * @param {Object} message - Message to send
     * @returns {Promise<Object>} Response from background script
     */
    sendMessage(message) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
    }
}
```

### Common Usage Patterns

```javascript
// Example: API call through background script
async executeFeatureAction() {
    try {
        const response = await this.sendMessageWithTimeout({
            action: 'fetchData',
            customer: this.customer,
            resourceId: this.resourceId,
            config: this.config
        }, this.config.timeout);

        if (response && response.success) {
            this.handleSuccess(response.data);
        } else {
            this.handleError('API call failed', new Error(response?.error || 'Unknown error'));
        }
        
    } catch (error) {
        this.handleError('Background communication error', error);
    }
}

// Example: Configuration update
async saveConfiguration() {
    try {
        await this.sendMessage({
            action: 'saveConfiguration',
            featureName: this.featureName,
            config: this.config
        });
        
        this.log('Configuration saved successfully');
    } catch (error) {
        this.handleError('Failed to save configuration', error);
    }
}

// Example: Health dashboard logging with defensive data handling
recordFeatureEvent(event, level, message, data = {}) {
    try {
        // IMPORTANT: Always validate data before sending to prevent TypeError crashes
        const safeData = data && typeof data === 'object' ? data : {};
        
        chrome.runtime.sendMessage({
            action: 'recordFeatureEvent',
            featureName: this.featureName,
            event: event,
            level: level,
            logMessage: message,
            data: {
                ...safeData,  // Safe to spread - always an object
                timestamp: Date.now(),
                url: window.location.href
            }
        }).catch(() => {
            // Silently ignore messaging errors - health logging is not critical
        });
    } catch (error) {
        // Don't let health logging errors break the feature
        console.warn(`[${this.featureName}] Health logging failed:`, error);
    }
}
```

**⚠️ Defensive Programming for Message Data**: Always validate data objects before using spread operators in messages to prevent TypeError crashes when data is null or undefined.

### Essential Methods Checklist

When implementing a new feature that communicates with the background script, ensure you include:

- ✅ `sendMessageWithTimeout(message, timeout)` - For API calls with timeout handling
- ✅ `sendMessage(message)` - For simple background communication
- ✅ Proper error handling for `chrome.runtime.lastError`
- ✅ Timeout handling to prevent hanging operations
- ✅ Response validation and error categorization

### Background Script Message Handling

Ensure your background script (if used) properly handles feature messages:

```javascript
// In background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case 'fetchData':
            handleFetchData(message, sendResponse);
            return true; // Keep message channel open for async response
            
        case 'saveConfiguration':
            handleSaveConfiguration(message, sendResponse);
            return true;
            
        default:
            sendResponse({ error: 'Unknown action' });
    }
});
```

## Feature Communication

### Communication with Background Script

```javascript
// Send message to background script
chrome.runtime.sendMessage({ 
    action: "yourAction", 
    data: yourData 
}, response => {
    // Handle response
});
```

### Communication Between Features

Use the shared window functions or messaging through the background script:

```javascript
// Check if another feature is available
if (window.PowerCloudFeatures?.otherFeature) {
    // Use other feature's API
}
```

## Testing Your Feature

### Development Testing and Debugging

When developing features, follow these debugging best practices:

#### 1. Enable Debug Logging During Development

Always enable debug logging in your feature constructor during development:

```javascript
class MyNewFeature extends BaseFeature {
    constructor() {
        super('my-new-feature', {
            enableDebugLogging: true // Enable for development, disable for production
        });
    }
}
```

#### 2. Systematic Debugging Approach

When debugging data flow issues, add comprehensive logging at key points:

```javascript
// Example: Debugging API response processing
async processApiResponse(response) {
    // Log the complete response structure during debugging
    if (this.enableDebugLogging) {
        console.log('[DEBUG][MyFeature] API Response Structure:', JSON.stringify(response, null, 2));
        console.log('[DEBUG][MyFeature] Response Analysis:', {
            hasData: !!response.data,
            dataKeys: response.data ? Object.keys(response.data) : 'No data',
            hasNestedData: !!(response.data && response.data.data),
            responseType: typeof response
        });
    }
    
    // Process the response...
}

// Example: Debugging data extraction
extractDataFromResponse(responseData) {
    if (this.enableDebugLogging) {
        console.log('[DEBUG][MyFeature] Extracting data from:', typeof responseData);
        console.log('[DEBUG][MyFeature] Data structure:', JSON.stringify(responseData, null, 2));
        
        // Test each extraction path
        console.log('[DEBUG][MyFeature] Path 1 (responseData.field):', responseData.field);
        console.log('[DEBUG][MyFeature] Path 2 (responseData.nested?.field):', responseData.nested?.field);
        console.log('[DEBUG][MyFeature] Path 3 (responseData.data?.field):', responseData.data?.field);
    }
    
    // Extraction logic...
}
```

#### 3. Common JSON:API Response Patterns

PowerCloud APIs often use JSON:API format. Be prepared to handle these structures:

```javascript
// Typical JSON:API response structure
{
    "data": {
        "id": "123",
        "type": "entry",
        "attributes": {
            // Main data fields here
            "field1": "value1",
            "field2": "value2"
        },
        "relationships": {
            "relatedResource": {
                "data": {
                    "id": "456",
                    "type": "card"
                }
            }
        }
    }
}

// Extraction patterns for JSON:API
extractDataFromJsonApi(response) {
    // Main data is typically in response.data.attributes
    const mainData = response?.data?.attributes || {};
    
    // Related resource IDs are in response.data.relationships
    const relatedId = response?.data?.relationships?.relatedResource?.data?.id;
    
    // Always check multiple possible paths
    const possiblePaths = [
        response?.data?.attributes?.targetField,
        response?.data?.targetField,
        response?.targetField,
        response?.data?.relationships?.targetResource?.data?.id
    ];
    
    return possiblePaths.find(path => path !== undefined && path !== null);
}
```

#### 4. Validation Method Debugging

When validation fails, debug with detailed logging:

```javascript
validateData(data) {
    if (this.enableDebugLogging) {
        console.log('[DEBUG][MyFeature] Data validation:', {
            isObject: typeof data === 'object',
            isNull: data === null,
            keys: data ? Object.keys(data) : 'No keys',
            hasRequiredField1: !!data?.requiredField1,
            hasRequiredField2: !!data?.requiredField2
        });
    }
    
    if (!data || typeof data !== 'object') {
        this.logger.warn('Data validation failed: not an object');
        return false;
    }
    
    // Flexible validation that accepts multiple valid formats
    const isValid = data.requiredField1 || 
                   data.alternativeField || 
                   (data.nested && data.nested.field);
    
    if (!isValid) {
        this.logger.warn('Data validation failed: missing required fields', {
            availableKeys: Object.keys(data)
        });
    }
    
    return isValid;
}
```

#### 5. Remove Debug Logging Before Production

Always clean up debug logging before deployment:

```javascript
// Before production deployment, remove all console.log statements
// and set enableDebugLogging to false

class MyNewFeature extends BaseFeature {
    constructor() {
        super('my-new-feature', {
            enableDebugLogging: false // Always false for production
        });
    }
}
```

### Chrome Developer Tools Integration

1. **Console Monitoring**: Always keep DevTools console open during development
2. **Network Tab**: Monitor API calls to understand response structures
3. **Sources Tab**: Use breakpoints for complex debugging
4. **Extension Inspection**: Use `chrome://extensions` → "Inspect views" for background script debugging

### Local Testing Checklist

- [ ] Feature activates on correct URL patterns
- [ ] Feature handles missing data gracefully
- [ ] Feature handles API errors with retries
- [ ] Feature validates data formats correctly
- [ ] Feature extracts data from all supported response formats
- [ ] Feature cleans up UI elements properly
- [ ] Feature follows PowerCloud styling conventions
- [ ] Debug logging is removed for production
- [ ] Test with both production and development domains:
  - `https://[customer].spend.cloud/*`
  - `https://[customer].dev.spend.cloud/*`

## Best Practices

### Development Checklist

Before deploying a new feature, ensure:

- ✅ **Feature Registration**: Feature is properly registered in `PowerCloudFeatures` namespace
- ✅ **Manifest Integration**: Feature script is added to `manifest.json` content_scripts
- ✅ **Main.js Registration**: Feature is added to the features array in `main.js`
- ✅ **Chrome Communication**: If feature needs background communication, `sendMessageWithTimeout()` and `sendMessage()` methods are implemented
- ✅ **Error Handling**: Comprehensive error handling with proper context and user feedback
- ✅ **Storage Access**: Uses standardized `getStorageSettings()` pattern for configuration
- ✅ **Cleanup**: Implements proper cleanup in lifecycle methods to prevent memory leaks
- ✅ **Logging**: Uses feature-specific logger for debugging and monitoring
- ✅ **URL Patterns**: URL pattern correctly matches target pages
- ✅ **Testing**: Feature tested on both production and dev environments

### Code Quality Guidelines

- **Modularity**: Keep features in separate modules within `content_scripts/features/`
- **Size**: Keep JS files small and focused - no more than 350 lines of code
- **Documentation**: Use JSDoc comments for all functions and modules
- **Error Handling**: Implement robust error handling in all components
- **Performance**: Monitor and optimize feature performance
- **Cleanup**: Always implement proper cleanup in the feature lifecycle to prevent memory leaks
- **Testing**: Write tests for your feature to ensure it works as expected

## Troubleshooting

### Extension Development Console Commands

```javascript
// Check extension storage
chrome.storage.local.get(null, console.log);

// Clear all stored data
chrome.storage.local.clear();

// Check active features
window.PowerCloudFeatures;

// Test URL pattern matching
window.isApiRoute('https://example.spend.cloud/api/test');
```

### Common Issues

#### Issue: Content scripts not working
**Symptoms**: Features don't activate on spend.cloud pages
**Causes**:
1. URL patterns not matching current page
2. Feature registration errors
3. Content Security Policy issues
**Debug**: Check page console for content script errors

#### Issue: Extension doesn't load
**Symptoms**: Extension shows as inactive in chrome://extensions/
**Solution**: Check manifest.json syntax and reload extension

## Examples

### DOM Manipulation Example

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

### Complete Feature Example

```javascript
/**
 * @fileoverview Example feature for PowerCloud extension.
 * @author Your Name
 * @version 1.0.0
 */

class ExampleFeature extends BaseFeature {
    constructor() {
        super('example-feature', {
            enableDebugLogging: true
        });
        
        this.createdElements = [];
    }

    async onInit(match) {
        super.onInit(match);
        
        try {
            this.logger.info('Initializing example feature');
            
            // Extract tenant name from URL match
            const tenantName = match ? match[1] : null;
            
            // Feature-specific initialization
            await this.setupUI();
            this.attachEventListeners();
            
            this.logger.info('Example feature initialized successfully', { tenant: tenantName });
            
            return true;
        } catch (error) {
            this.handleError('Failed to initialize example feature', error);
            return false;
        }
    }
    
    setupUI() {
        const button = document.createElement('button');
        button.className = 'powercloud-feature-button';
        button.textContent = 'Example Action';
        button.addEventListener('click', this.handleButtonClick.bind(this));
        
        document.body.appendChild(button);
        this.createdElements.push(button);
    }
    
    attachEventListeners() {
        this.handleButtonClick = this.handleButtonClick.bind(this);
    }
    
    handleButtonClick(event) {
        this.logger.info('Button clicked', { event });
        // Implement button click functionality
    }

    async onCleanup() {
        try {
            // Remove created elements
            this.createdElements.forEach(element => {
                if (element && element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            });
            
            this.createdElements = [];
            
            super.onCleanup();
        } catch (error) {
            this.handleError('Failed to clean up example feature', error);
        }
    }
}

// Register feature
window.PowerCloudFeatures = window.PowerCloudFeatures || {};
window.PowerCloudFeatures.exampleFeature = {
    init: function(match) {
        const feature = new ExampleFeature();
        return feature.onInit(match);
    },
    cleanup: function() {
        const feature = new ExampleFeature();
        return feature.onCleanup();
    }
};
```
