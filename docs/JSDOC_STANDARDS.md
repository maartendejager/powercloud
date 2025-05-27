# JSDoc Standards for PowerCloud Extension

## Overview

This document establishes comprehensive JSDoc documentation standards for the PowerCloud Chrome extension. Proper documentation improves code maintainability, enables better IDE support, and facilitates team collaboration.

## JSDoc Basics

### Required Elements

Every JavaScript file, class, and function should have appropriate JSDoc comments using the `/** */` syntax.

#### File-Level Documentation

```javascript
/**
 * @fileoverview Manages feature validation and health monitoring for PowerCloud extension.
 * Provides comprehensive validation framework including initialization checks,
 * performance monitoring, and error tracking capabilities.
 * 
 * @author PowerCloud Extension Team
 * @version 1.2.0
 * @since 1.0.0
 * @requires Logger
 * @requires PerformanceMonitor
 * @requires ErrorTracker
 * 
 * @example
 * // Basic usage
 * const validator = new FeatureValidator();
 * await validator.validateFeature('adyen-card');
 * 
 * @see {@link https://github.com/powercloud/extension/docs/validation.md}
 */
```

#### Class Documentation

```javascript
/**
 * Validates feature functionality and monitors performance metrics.
 * 
 * The FeatureValidator class provides comprehensive validation capabilities
 * for PowerCloud extension features, including initialization validation,
 * health checks, performance monitoring, and error tracking.
 * 
 * @class
 * @classdesc Main validator for extension features with health monitoring
 * @memberof PowerCloud.Validation
 * @since 1.0.0
 * 
 * @example
 * // Create validator with custom configuration
 * const validator = new FeatureValidator({
 *     logger: new Logger('validation'),
 *     performanceThresholds: {
 *         initTime: 1000,
 *         memoryUsage: 50 * 1024 * 1024
 *     }
 * });
 * 
 * // Validate a feature
 * const result = await validator.validateFeature('adyen-card', {
 *     checkPerformance: true,
 *     validateDependencies: true
 * });
 * 
 * if (result.isValid) {
 *     console.log('Feature validation passed');
 * }
 */
class FeatureValidator {
    /**
     * Creates a new FeatureValidator instance.
     * 
     * @param {Object} [options={}] - Configuration options for the validator
     * @param {Logger} [options.logger] - Logger instance for validation messages
     * @param {boolean} [options.debug=false] - Enable debug mode for verbose logging
     * @param {Object} [options.performanceThresholds] - Performance monitoring thresholds
     * @param {number} [options.performanceThresholds.initTime=2000] - Max initialization time (ms)
     * @param {number} [options.performanceThresholds.memoryUsage=100MB] - Max memory usage (bytes)
     * @param {Object} [options.validationRules] - Custom validation rules
     * @param {string[]} [options.validationRules.required=[]] - Required feature properties
     * @param {string[]} [options.validationRules.optional=[]] - Optional feature properties
     * 
     * @throws {ValidationError} When invalid configuration is provided
     * 
     * @example
     * // Basic initialization
     * const validator = new FeatureValidator();
     * 
     * @example
     * // Advanced configuration
     * const validator = new FeatureValidator({
     *     logger: new Logger('feature-validation'),
     *     debug: true,
     *     performanceThresholds: {
     *         initTime: 1500,
     *         memoryUsage: 75 * 1024 * 1024
     *     },
     *     validationRules: {
     *         required: ['name', 'version', 'init'],
     *         optional: ['cleanup', 'config']
     *     }
     * });
     */
    constructor(options = {}) {
        // Implementation
    }
}
```

#### Method Documentation

```javascript
/**
 * Validates a feature's initialization and functionality.
 * 
 * Performs comprehensive validation including dependency checking,
 * initialization testing, performance monitoring, and health verification.
 * The validation process is non-destructive and will not affect the
 * feature's current state.
 * 
 * @async
 * @method
 * @memberof FeatureValidator
 * @since 1.0.0
 * 
 * @param {string} featureName - Name of the feature to validate
 * @param {Object} [options={}] - Validation options
 * @param {boolean} [options.checkDependencies=true] - Validate feature dependencies
 * @param {boolean} [options.testInitialization=true] - Test feature initialization
 * @param {boolean} [options.monitorPerformance=false] - Monitor performance metrics
 * @param {boolean} [options.validateProperties=true] - Validate required properties
 * @param {number} [options.timeout=5000] - Validation timeout in milliseconds
 * @param {Object} [options.customRules] - Custom validation rules to apply
 * @param {Function[]} [options.customRules.validators] - Custom validator functions
 * @param {Object} [options.customRules.thresholds] - Custom performance thresholds
 * 
 * @returns {Promise<ValidationResult>} Comprehensive validation result
 * @returns {Promise<ValidationResult.isValid>} - Overall validation status
 * @returns {Promise<ValidationResult.score>} - Validation score (0-100)
 * @returns {Promise<ValidationResult.errors>} - Array of validation errors
 * @returns {Promise<ValidationResult.warnings>} - Array of validation warnings
 * @returns {Promise<ValidationResult.performance>} - Performance metrics
 * @returns {Promise<ValidationResult.timestamp>} - Validation completion time
 * 
 * @throws {ValidationError} When validation cannot be performed
 * @throws {FeatureNotFoundError} When specified feature doesn't exist
 * @throws {TimeoutError} When validation exceeds timeout limit
 * 
 * @example
 * // Basic validation
 * const result = await validator.validateFeature('adyen-card');
 * console.log(`Validation ${result.isValid ? 'passed' : 'failed'}`);
 * 
 * @example
 * // Advanced validation with custom options
 * const result = await validator.validateFeature('user-auth', {
 *     checkDependencies: true,
 *     monitorPerformance: true,
 *     timeout: 10000,
 *     customRules: {
 *         validators: [
 *             (feature) => feature.hasValidToken(),
 *             (feature) => feature.isUserLoggedIn()
 *         ],
 *         thresholds: {
 *             responseTime: 500
 *         }
 *     }
 * });
 * 
 * if (!result.isValid) {
 *     console.error('Validation errors:', result.errors);
 *     console.warn('Validation warnings:', result.warnings);
 * }
 * 
 * @see {@link ValidationResult} For detailed result structure
 * @see {@link FeatureValidator#validateFeatureHealth} For health-specific validation
 */
async validateFeature(featureName, options = {}) {
    // Implementation
}
```

#### Function Documentation

```javascript
/**
 * Calculates URL pattern specificity for feature matching.
 * 
 * Determines how specific a URL pattern is by analyzing wildcards,
 * path depth, and exact matches. Higher specificity scores indicate
 * more precise patterns that should take precedence during feature
 * selection.
 * 
 * @function
 * @since 1.1.0
 * 
 * @param {string} pattern - URL pattern to analyze (supports wildcards)
 * @param {Object} [options={}] - Calculation options
 * @param {boolean} [options.caseSensitive=false] - Enable case-sensitive matching
 * @param {number} [options.wildcardPenalty=10] - Penalty points per wildcard
 * @param {number} [options.pathDepthBonus=5] - Bonus points per path segment
 * @param {boolean} [options.exactMatchBonus=true] - Bonus for exact matches
 * 
 * @returns {number} Specificity score (higher = more specific)
 * 
 * @throws {InvalidPatternError} When pattern format is invalid
 * 
 * @example
 * // Basic usage
 * const score1 = calculatePatternSpecificity('*.spend.cloud/*');
 * const score2 = calculatePatternSpecificity('app.spend.cloud/dashboard');
 * console.log(score2 > score1); // true - exact match is more specific
 * 
 * @example
 * // With custom options
 * const score = calculatePatternSpecificity('*.spend.cloud/admin/*', {
 *     caseSensitive: true,
 *     wildcardPenalty: 15,
 *     pathDepthBonus: 8
 * });
 * 
 * @see {@link validateUrlPattern} For pattern validation
 * @see {@link matchUrlPattern} For pattern matching
 */
function calculatePatternSpecificity(pattern, options = {}) {
    // Implementation
}
```

## Advanced JSDoc Features

### Custom Types and Interfaces

```javascript
/**
 * Validation result returned by feature validation operations.
 * 
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Overall validation status
 * @property {number} score - Validation score from 0-100
 * @property {ValidationError[]} errors - Array of validation errors
 * @property {ValidationWarning[]} warnings - Array of validation warnings
 * @property {PerformanceMetrics} performance - Performance measurement data
 * @property {string} timestamp - ISO timestamp of validation completion
 * @property {Object} details - Detailed validation breakdown
 * @property {boolean} details.dependenciesValid - Dependency validation status
 * @property {boolean} details.initializationValid - Initialization test status
 * @property {boolean} details.propertiesValid - Property validation status
 * @property {Object} details.customValidation - Custom validation results
 * 
 * @example
 * // Example ValidationResult structure
 * const result = {
 *     isValid: true,
 *     score: 87,
 *     errors: [],
 *     warnings: [
 *         { code: 'PERF_WARN', message: 'Initialization time above recommended threshold' }
 *     ],
 *     performance: {
 *         initTime: 1200,
 *         memoryUsage: 2048576,
 *         responseTime: 45
 *     },
 *     timestamp: '2024-01-15T10:30:00.000Z',
 *     details: {
 *         dependenciesValid: true,
 *         initializationValid: true,
 *         propertiesValid: true,
 *         customValidation: {}
 *     }
 * };
 */

/**
 * Performance metrics collected during feature operations.
 * 
 * @typedef {Object} PerformanceMetrics
 * @property {number} initTime - Feature initialization time in milliseconds
 * @property {number} memoryUsage - Memory usage in bytes
 * @property {number} responseTime - Average response time in milliseconds
 * @property {number} cpuUsage - CPU usage percentage during operation
 * @property {Object} timing - Detailed timing breakdown
 * @property {number} timing.loadTime - Script loading time
 * @property {number} timing.parseTime - Script parsing time
 * @property {number} timing.executeTime - Script execution time
 */

/**
 * Configuration options for feature initialization.
 * 
 * @typedef {Object} FeatureConfig
 * @property {string} name - Feature name (required)
 * @property {string} version - Feature version (required)
 * @property {string[]} [dependencies=[]] - Feature dependencies
 * @property {Object} [settings={}] - Feature-specific settings
 * @property {boolean} [enabled=true] - Feature enabled status
 * @property {number} [priority=0] - Feature loading priority
 * @property {string[]} [urlPatterns=[]] - URL patterns for feature activation
 * @property {Object} [performance] - Performance configuration
 * @property {number} [performance.timeout=5000] - Operation timeout
 * @property {number} [performance.maxMemory] - Maximum memory usage
 */
```

### Enums and Constants

```javascript
/**
 * Feature validation error codes.
 * 
 * @readonly
 * @enum {string}
 * @since 1.0.0
 * 
 * @example
 * // Using error codes
 * if (error.code === ValidationErrorCodes.MISSING_DEPENDENCY) {
 *     console.log('Feature has missing dependencies');
 * }
 */
const ValidationErrorCodes = {
    /** Feature initialization failed */
    INIT_FAILED: 'INIT_FAILED',
    
    /** Required dependency not found */
    MISSING_DEPENDENCY: 'MISSING_DEPENDENCY',
    
    /** Feature configuration invalid */
    INVALID_CONFIG: 'INVALID_CONFIG',
    
    /** Performance threshold exceeded */
    PERFORMANCE_THRESHOLD: 'PERFORMANCE_THRESHOLD',
    
    /** Required property missing */
    MISSING_PROPERTY: 'MISSING_PROPERTY',
    
    /** Feature timeout occurred */
    TIMEOUT: 'TIMEOUT'
};

/**
 * Default performance thresholds for feature validation.
 * 
 * @readonly
 * @type {Object}
 * @property {number} INIT_TIME_MS - Maximum initialization time in milliseconds
 * @property {number} MEMORY_USAGE_BYTES - Maximum memory usage in bytes
 * @property {number} RESPONSE_TIME_MS - Maximum response time in milliseconds
 * @property {number} CPU_USAGE_PERCENT - Maximum CPU usage percentage
 * 
 * @since 1.0.0
 */
const DEFAULT_PERFORMANCE_THRESHOLDS = {
    INIT_TIME_MS: 2000,
    MEMORY_USAGE_BYTES: 100 * 1024 * 1024, // 100MB
    RESPONSE_TIME_MS: 1000,
    CPU_USAGE_PERCENT: 50
};
```

### Events and Callbacks

```javascript
/**
 * Event handler callback for validation completion.
 * 
 * @callback ValidationCompleteCallback
 * @param {ValidationResult} result - Validation result object
 * @param {string} featureName - Name of validated feature
 * @param {Error|null} error - Error object if validation failed
 * 
 * @example
 * // Using validation callback
 * validator.onValidationComplete = (result, featureName, error) => {
 *     if (error) {
 *         console.error(`Validation failed for ${featureName}:`, error);
 *         return;
 *     }
 *     
 *     console.log(`${featureName} validation score: ${result.score}`);
 * };
 */

/**
 * Custom validator function for feature validation.
 * 
 * @callback CustomValidator
 * @param {Object} feature - Feature object to validate
 * @param {FeatureConfig} config - Feature configuration
 * @param {Object} context - Validation context
 * @returns {boolean|Promise<boolean>} Validation result
 * 
 * @example
 * // Custom validator for authentication features
 * const authValidator = (feature, config, context) => {
 *     return feature.hasValidToken() && feature.isUserLoggedIn();
 * };
 * 
 * // Async custom validator
 * const asyncValidator = async (feature, config, context) => {
 *     const response = await feature.testConnection();
 *     return response.status === 200;
 * };
 */
```

### Inheritance and Mixins

```javascript
/**
 * Base class for all PowerCloud extension features.
 * 
 * Provides common functionality including lifecycle management,
 * error handling, logging, and configuration management that
 * all features should inherit.
 * 
 * @abstract
 * @class
 * @classdesc Abstract base class for extension features
 * @memberof PowerCloud.Features
 * @since 1.0.0
 * 
 * @example
 * // Extending BaseFeature  
 * class AdyenCardFeature extends BaseFeature {
 *     constructor() {
 *         super('adyen-card', {
 *             enableDebugLogging: false
 *         });
 *         
 *         this.customer = null;
 *         this.cardId = null;
 *     }
 *     
 *     async onInit(match) {
 *         await super.onInit(match);
 *         this.customer = match[1];
 *         this.cardId = match[2];
 *     }
 * }
 */
class BaseFeature {
    /**
     * Creates a new BaseFeature instance.
     * 
     * @param {string} name - Unique feature name for identification
     * @param {Object} [options={}] - Configuration options
     * @param {string} [options.hostElementId] - Host element ID
     * @param {boolean} [options.enableDebugLogging=false] - Enable debug logging
     * 
     * @throws {TypeError} When name is not provided or invalid
     */
    constructor(name, options = {}) {
        // Implementation
    }
    
    /**
     * Initialize the feature with URL match data.
     * 
     * @abstract
     * @async
     * @method
     * @param {Object} match - URL match result with capture groups
     * @returns {Promise<void>}
     * @throws {Error} When initialization fails
     */
    async onInit(match) {
        throw new NotImplementedError('onInit must be implemented by subclass');
    }
}

/**
 * Adyen card feature implementation for PowerCloud extension.
 * 
 * Extends BaseFeature to provide card information viewing functionality
 * including vendor detection, UI management, and integration with
 * Chrome storage for configuration.
 * 
 * @class
 * @extends BaseFeature
 * @classdesc Adyen card viewing feature for PowerCloud extension
 * @memberof PowerCloud.Features.Adyen
 * @since 1.0.0
 * 
 * @example
 * // Feature registration pattern
 * const adyenCardFeature = new AdyenCardFeature();
 * 
 * window.PowerCloudFeatures = window.PowerCloudFeatures || {};
 * window.PowerCloudFeatures.card = {
 *     init: async (match) => {
 *         try {
 *             await adyenCardFeature.onInit(match);
 *             await adyenCardFeature.onActivate();
 *         } catch (error) {
 *             adyenCardFeature.onError(error, 'initialization');
 *         }
 *     },
 *     cleanup: async () => {
 *         await adyenCardFeature.onCleanup();
 *     }
 * };
 */
class AdyenCardFeature extends BaseFeature {
    /**
     * Creates a new AdyenCardFeature instance.
     */
    constructor() {
        super('adyen-card', {
            enableDebugLogging: false
        });
        
        // Feature-specific properties
        this.customer = null;
        this.cardId = null;
        this.vendor = null;
        
        // Configuration with defaults
        this.config = {
            retryAttempts: 3,
            retryDelay: 1000,
            timeout: 5000
        };
    }
    
    /**
     * @inheritdoc
     * @override
     * @param {Object} match - URL match with customer and card ID
     * @param {string} match[1] - Customer identifier  
     * @param {string} match[2] - Card ID
     */
    async onInit(match) {
        await super.onInit(match);
        
        // Extract card-specific data
        this.customer = match[1];
        this.cardId = match[2];
        
        // Load feature configuration
        await this.loadFeatureConfig();
    }
}
```

## Chrome Extension Specific Documentation

### Message Handling

```javascript
/**
 * Chrome extension message handler for background script communication.
 * 
 * @function
 * @param {Object} message - Message object from content script or popup
 * @param {string} message.action - Action type to perform
 * @param {Object} message.data - Action-specific data payload
 * @param {number} message.timestamp - Message timestamp
 * @param {chrome.runtime.MessageSender} sender - Message sender information
 * @param {Function} sendResponse - Response callback function
 * @returns {boolean|Promise<boolean>} True if response will be sent asynchronously
 * 
 * @example
 * // Register message handler
 * chrome.runtime.onMessage.addListener(handleMessage);
 * 
 * // Example message structure
 * const message = {
 *     action: 'validateFeature',
 *     data: {
 *         featureName: 'adyen-card',
 *         options: { checkDependencies: true }
 *     },
 *     timestamp: Date.now()
 * };
 */
function handleMessage(message, sender, sendResponse) {
    // Implementation
}
```

### Storage Operations

```javascript
/**
 * Retrieves configuration data from Chrome storage with fallback.
 * 
 * @async
 * @function
 * @param {string} key - Storage key to retrieve
 * @param {*} [defaultValue=null] - Default value if key not found
 * @param {Object} [options={}] - Storage options
 * @param {boolean} [options.useSync=false] - Use chrome.storage.sync instead of local
 * @param {number} [options.timeout=5000] - Operation timeout in milliseconds
 * 
 * @returns {Promise<*>} Retrieved value or default value
 * @throws {StorageError} When storage operation fails
 * 
 * @example
 * // Get user preferences
 * const preferences = await getStorageValue('userPreferences', {
 *     theme: 'light',
 *     notifications: true
 * });
 * 
 * @example
 * // Get synced settings
 * const settings = await getStorageValue('appSettings', {}, {
 *     useSync: true,
 *     timeout: 3000
 * });
 */
async function getStorageValue(key, defaultValue = null, options = {}) {
    // Implementation
}
```

## Documentation Best Practices

### 1. Be Descriptive and Clear
- Write documentation that explains **why**, not just **what**
- Use clear, concise language
- Provide context and background when necessary

### 2. Include Comprehensive Examples
- Show both basic and advanced usage
- Include error handling examples
- Demonstrate real-world scenarios

### 3. Keep Documentation Updated
- Update JSDoc when changing function signatures
- Add version information for new features
- Mark deprecated functionality appropriately

### 4. Use Consistent Formatting
- Follow the established JSDoc tag order
- Use consistent parameter naming
- Maintain uniform description styles

### 5. Link Related Documentation
- Use `@see` tags to reference related functions
- Link to external documentation when relevant
- Cross-reference between classes and methods

## Tools and Validation

### JSDoc Generation
Generate HTML documentation using JSDoc:

```bash
# Install JSDoc globally
npm install -g jsdoc

# Generate documentation
jsdoc -c jsdoc.conf.json -R README.md -r shared/ background/ content_scripts/ popup/
```

### JSDoc Configuration
Example `jsdoc.conf.json`:

```json
{
    "source": {
        "include": ["./shared", "./background", "./content_scripts", "./popup"],
        "includePattern": "\\.(js|jsx)$",
        "exclude": ["node_modules/", "docs/", "test/"]
    },
    "opts": {
        "destination": "./docs/api/",
        "recurse": true
    },
    "plugins": [
        "plugins/markdown"
    ],
    "templates": {
        "cleverLinks": false,
        "monospaceLinks": false
    }
}
```

This comprehensive JSDoc standard ensures consistent, high-quality documentation across the PowerCloud extension codebase.
