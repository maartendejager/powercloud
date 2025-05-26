/**
 * PowerCloud UI Components Library
 * 
 * Provides a consistent set of UI components that can be used across
 * popup, content scripts, and other parts of the extension.
 * 
 * Features:
 * - Consistent styling and theming
 * - Accessibility support (ARIA labels, keyboard navigation)
 * - Shadow DOM isolation for content scripts
 * - Responsive design patterns
 */

/**
 * Base UI Component class with common functionality
 */
class PowerCloudUIComponent {
    constructor(options = {}) {
        this.options = {
            theme: 'default',
            accessibility: true,
            animations: true,
            ...options
        };
        this.element = null;
        this.shadowRoot = null;
    }

    /**
     * Create the component with optional shadow DOM isolation
     * @param {boolean} useShadowDOM - Whether to use shadow DOM
     * @returns {HTMLElement} The created element
     */
    create(useShadowDOM = false) {
        this.element = this.createElement();
        
        if (useShadowDOM && this.element.attachShadow) {
            this.shadowRoot = this.element.attachShadow({ mode: 'open' });
            this.setupShadowContent();
        } else {
            this.setupContent();
        }
        
        this.attachEvents();
        this.applyAccessibility();
        
        return this.element;
    }

    /**
     * Abstract method - must be implemented by subclasses
     */
    createElement() {
        throw new Error('createElement must be implemented by subclass');
    }

    /**
     * Setup content for regular DOM
     */
    setupContent() {
        // For regular DOM, inject component styles if they don't exist
        if (!document.querySelector('#powercloud-component-styles')) {
            const style = document.createElement('style');
            style.id = 'powercloud-component-styles';
            style.textContent = this.getComponentStyles();
            document.head.appendChild(style);
        }
        
        // Default implementation - override in subclasses
    }

    /**
     * Setup content for shadow DOM
     */
    setupShadowContent() {
        // Include styles in shadow DOM
        const style = document.createElement('style');
        style.textContent = this.getComponentStyles();
        this.shadowRoot.appendChild(style);
        
        // Setup content
        this.setupContent();
    }

    /**
     * Get component-specific styles
     */
    getComponentStyles() {
        return PowerCloudUIStyles.getBaseStyles() + this.getCustomStyles();
    }

    /**
     * Get custom styles for this component - override in subclasses
     */
    getCustomStyles() {
        return '';
    }

    /**
     * Attach event listeners - override in subclasses
     */
    attachEvents() {
        // Default implementation
    }

    /**
     * Apply accessibility features
     */
    applyAccessibility() {
        if (!this.options.accessibility || !this.element) return;
        
        // Ensure focusable elements have proper focus management
        const focusableElements = this.element.querySelectorAll(
            'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        focusableElements.forEach(el => {
            if (!el.getAttribute('role') && el.tagName === 'BUTTON') {
                el.setAttribute('role', 'button');
            }
        });
    }

    /**
     * Destroy the component and clean up
     */
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
        this.shadowRoot = null;
    }
}

/**
 * PowerCloud UI Styles - Centralized styling system
 */
class PowerCloudUIStyles {
static getBaseStyles() {
    return `
        /* CSS Reset for PowerCloud components */
        .powercloud-component, .powercloud-component * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        /* Design tokens */
        :root {
            --pc-primary-color: #0066cc;
            --pc-secondary-color: #6c757d;
            --pc-success-color: #28a745;
            --pc-error-color: #dc3545;
            --pc-warning-color: #ffc107;
            --pc-info-color: #17a2b8;
            --pc-light-color: #f8f9fa;
            --pc-dark-color: #343a40;
            
            --pc-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            --pc-font-size-sm: 12px;
            --pc-font-size-md: 14px;
            --pc-font-size-lg: 16px;
            
            --pc-border-radius: 6px;
            --pc-spacing-sm: 8px;
            --pc-spacing-md: 16px;
            --pc-spacing-lg: 24px;
            
            --pc-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
            --pc-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
            --pc-shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
            
            --pc-z-index-dropdown: 1000;
            --pc-z-index-modal: 1050;
            --pc-z-index-tooltip: 1100;
            --pc-z-index-extension: 9999;
        }
        
        /* Screen reader only content */
        .powercloud-sr-only {
            position: absolute !important;
            width: 1px !important;
            height: 1px !important;
            padding: 0 !important;
            margin: -1px !important;
            overflow: hidden !important;
            clip: rect(0, 0, 0, 0) !important;
            white-space: nowrap !important;
            border: 0 !important;
        }
        
        /* Focus styles */
        .powercloud-component:focus-visible {
            outline: 2px solid var(--pc-primary-color);
            outline-offset: 2px;
        }
    `;
}

static getComponentStyles(componentName) {
    const baseStyles = this.getBaseStyles();
    
    // Return component-specific styles if needed
    switch (componentName) {
        case 'button':
            return baseStyles + this.getButtonStyles();
        case 'alert':
            return baseStyles + this.getAlertStyles();
        case 'badge':
            return baseStyles + this.getBadgeStyles();
        default:
            return baseStyles;
    }
}

static getButtonStyles() {
    return `
        .powercloud-button {
            font-family: var(--pc-font-family);
            font-size: var(--pc-font-size-md);
            border-radius: var(--pc-border-radius);
            transition: all 0.2s ease-in-out;
            border: none;
            cursor: pointer;
            font-weight: 500;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            position: relative;
            overflow: hidden;
        }

        .powercloud-button:focus {
            outline: 2px solid var(--pc-primary-color);
            outline-offset: 2px;
        }

        .powercloud-button:active {
            transform: translateY(1px);
        }

        /* Sizes */
        .powercloud-button--small {
            padding: 6px 12px;
            font-size: var(--pc-font-size-sm);
        }

        .powercloud-button--medium {
            padding: 8px 16px;
            font-size: var(--pc-font-size-md);
        }

        .powercloud-button--large {
            padding: 12px 24px;
            font-size: var(--pc-font-size-lg);
        }

        /* Variants */
        .powercloud-button--primary {
            background-color: var(--pc-primary-color);
            color: white;
        }

        .powercloud-button--primary:hover:not(:disabled) {
            background-color: #0052a3;
        }

        .powercloud-button--secondary {
            background-color: var(--pc-secondary-color);
            color: white;
        }

        .powercloud-button--secondary:hover:not(:disabled) {
            background-color: #5a6268;
        }

        .powercloud-button--success {
            background-color: var(--pc-success-color);
            color: white;
        }

        .powercloud-button--success:hover:not(:disabled) {
            background-color: #218838;
        }

        .powercloud-button--error {
            background-color: var(--pc-error-color);
            color: white;
        }

        .powercloud-button--error:hover:not(:disabled) {
            background-color: #c82333;
        }

        .powercloud-button--warning {
            background-color: var(--pc-warning-color);
            color: var(--pc-dark-color);
        }

        .powercloud-button--warning:hover:not(:disabled) {
            background-color: #e0a800;
        }

        .powercloud-button--disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        /* Button container styles */
        .powercloud-button-container {
            position: fixed;
            z-index: var(--pc-z-index-extension);
            pointer-events: none;
        }

        .powercloud-buttons-wrapper {
            display: flex;
            gap: var(--pc-spacing-sm);
            pointer-events: auto;
        }

        .powercloud-button-container[data-position*="bottom"] .powercloud-buttons-wrapper {
            flex-direction: column-reverse;
        }

        .powercloud-button-container[data-position*="top"] .powercloud-buttons-wrapper {
            flex-direction: column;
        }

        .powercloud-button-container[data-position*="center"] .powercloud-buttons-wrapper {
            flex-direction: row;
        }
    `;
}

static getAlertStyles() {
    return `
        .powercloud-alert {
            font-family: var(--pc-font-family);
            border-radius: var(--pc-border-radius);
            box-shadow: var(--pc-shadow-sm);
        }
    `;
}

static getBadgeStyles() {
    return `
        .powercloud-badge {
            font-family: var(--pc-font-family);
            border-radius: calc(var(--pc-border-radius) * 2);
        }
    `;
}
}

/**
 * PowerCloud UI - Main utility class and factory for creating UI components
 */
class PowerCloudUI {
/**
 * Create a button component
 * @param {Object} options - Button options
 * @returns {HTMLElement} Button element
 */
static createButton(options = {}) {
    const button = new PowerCloudButton(options);
    return button.create();
}

/**
 * Create an alert component
 * @param {Object} options - Alert options
 * @returns {HTMLElement} Alert element
 */
static createAlert(options = {}) {
    const alert = new PowerCloudAlert(options);
    return alert.create();
}

/**
 * Create a badge component
 * @param {Object} options - Badge options
 * @returns {HTMLElement} Badge element
 */
static createBadge(options = {}) {
    const badge = new PowerCloudBadge(options);
    return badge.create();
}

/**
 * Create a button container
 * @param {Object} options - Container options
 * @returns {HTMLElement} Container element
 */
static createContainer(options = {}) {
    const container = new PowerCloudButtonContainer(options);
    return container.create(true); // Use shadow DOM for isolation
}

/**
 * Get or create the global button manager instance
 * @returns {PowerCloudButtonManager} Button manager instance
 */
static getButtonManager() {
    if (!window.PowerCloudButtonManagerInstance) {
        window.PowerCloudButtonManagerInstance = new PowerCloudButtonManager();
    }
    return window.PowerCloudButtonManagerInstance;
}

/**
 * Initialize PowerCloud UI system
 */
static initialize() {
    // Inject base styles into the page
    if (!document.querySelector('#powercloud-ui-styles')) {
        const style = document.createElement('style');
        style.id = 'powercloud-ui-styles';
        style.textContent = PowerCloudUIStyles.getBaseStyles();
        document.head.appendChild(style);
    }
    
    console.log('[PowerCloudUI] Initialized');
}
}

/**
 * PowerCloud Button Component
 */
class PowerCloudButton extends PowerCloudUIComponent {
    constructor(options = {}) {
        super({
            text: 'Button',
            variant: 'primary', // primary, secondary, success, error, warning
            size: 'medium', // small, medium, large
            disabled: false,
            onClick: null,
            ...options
        });
    }

    createElement() {
        const button = document.createElement('button');
        button.className = this.getButtonClasses();
        button.textContent = this.options.text;
        button.disabled = this.options.disabled;
        
        return button;
    }

    getButtonClasses() {
        const classes = ['powercloud-button'];
        classes.push(`powercloud-button--${this.options.variant}`);
        classes.push(`powercloud-button--${this.options.size}`);
        
        if (this.options.disabled) {
            classes.push('powercloud-button--disabled');
        }
        
        return classes.join(' ');
    }

    attachEvents() {
        if (this.options.onClick) {
            this.element.addEventListener('click', this.options.onClick);
        }
    }

    getCustomStyles() {
        return `
            .powercloud-button {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s ease-in-out;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                text-decoration: none;
                position: relative;
                overflow: hidden;
            }

            .powercloud-button:focus {
                outline: 2px solid #0066cc;
                outline-offset: 2px;
            }

            .powercloud-button:active {
                transform: translateY(1px);
            }

            /* Variants */
            .powercloud-button--primary {
                background-color: #0066cc;
                color: white;
            }

            .powercloud-button--primary:hover:not(:disabled) {
                background-color: #0052a3;
            }

            .powercloud-button--secondary {
                background-color: #6c757d;
                color: white;
            }

            .powercloud-button--secondary:hover:not(:disabled) {
                background-color: #5a6268;
            }

            .powercloud-button--success {
                background-color: #28a745;
                color: white;
            }

            .powercloud-button--success:hover:not(:disabled) {
                background-color: #218838;
            }

            .powercloud-button--error {
                background-color: #dc3545;
                color: white;
            }

            .powercloud-button--error:hover:not(:disabled) {
                background-color: #c82333;
            }

            .powercloud-button--warning {
                background-color: #ffc107;
                color: #212529;
            }

            .powercloud-button--warning:hover:not(:disabled) {
                background-color: #e0a800;
            }

            /* Sizes */
            .powercloud-button--small {
                padding: 6px 12px;
                font-size: 12px;
                min-height: 28px;
            }

            .powercloud-button--medium {
                padding: 8px 16px;
                font-size: 14px;
                min-height: 36px;
            }

            .powercloud-button--large {
                padding: 12px 24px;
                font-size: 16px;
                min-height: 44px;
            }

            /* States */
            .powercloud-button--disabled {
                opacity: 0.6;
                cursor: not-allowed;
                pointer-events: none;
            }
        `;
    }
}

/**
 * PowerCloud Alert Component
 */
class PowerCloudAlert extends PowerCloudUIComponent {
    constructor(options = {}) {
        super({
            message: '',
            type: 'info', // success, error, warning, info
            dismissible: true,
            autoHide: false,
            hideDelay: 5000,
            onDismiss: null,
            ...options
        });
    }

    createElement() {
        const alert = document.createElement('div');
        alert.className = this.getAlertClasses();
        alert.setAttribute('role', 'alert');
        alert.setAttribute('aria-live', 'polite');
        
        return alert;
    }

    setupContent() {
        const container = this.shadowRoot || this.element;
        
        const content = document.createElement('div');
        content.className = 'powercloud-alert__content';
        content.textContent = this.options.message;
        
        if (this.shadowRoot) {
            this.shadowRoot.appendChild(content);
        } else {
            this.element.appendChild(content);
        }

        if (this.options.dismissible) {
            const closeButton = document.createElement('button');
            closeButton.className = 'powercloud-alert__close';
            closeButton.innerHTML = '&times;';
            closeButton.setAttribute('aria-label', 'Close alert');
            closeButton.addEventListener('click', () => this.dismiss());
            
            if (this.shadowRoot) {
                this.shadowRoot.appendChild(closeButton);
            } else {
                this.element.appendChild(closeButton);
            }
        }

        if (this.options.autoHide) {
            setTimeout(() => this.dismiss(), this.options.hideDelay);
        }
    }

    getAlertClasses() {
        const classes = ['powercloud-alert'];
        classes.push(`powercloud-alert--${this.options.type}`);
        
        if (this.options.dismissible) {
            classes.push('powercloud-alert--dismissible');
        }
        
        return classes.join(' ');
    }

    dismiss() {
        if (this.options.onDismiss) {
            this.options.onDismiss();
        }
        
        this.element.style.opacity = '0';
        setTimeout(() => this.destroy(), 300);
    }

    getCustomStyles() {
        return `
            .powercloud-alert {
                padding: 12px 16px;
                border-radius: 6px;
                margin-bottom: 16px;
                position: relative;
                display: flex;
                align-items: flex-start;
                gap: 8px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                transition: opacity 0.3s ease-in-out;
            }

            .powercloud-alert__content {
                flex: 1;
                font-size: 14px;
                line-height: 1.4;
            }

            .powercloud-alert__close {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: inherit;
                opacity: 0.7;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .powercloud-alert__close:hover {
                opacity: 1;
            }

            .powercloud-alert__close:focus {
                outline: 2px solid currentColor;
                outline-offset: 2px;
            }

            /* Alert types */
            .powercloud-alert--success {
                background-color: #d1edff;
                border: 1px solid #9fdbff;
                color: #0c5aa6;
            }

            .powercloud-alert--error {
                background-color: #ffe6e6;
                border: 1px solid #ffb3b3;
                color: #d63384;
            }

            .powercloud-alert--warning {
                background-color: #fff3cd;
                border: 1px solid #ffe69c;
                color: #856404;
            }

            .powercloud-alert--info {
                background-color: #e7f3ff;
                border: 1px solid #b3d9ff;
                color: #0c5aa6;
            }
        `;
    }
}

/**
 * PowerCloud Badge Component
 */
class PowerCloudBadge extends PowerCloudUIComponent {
    constructor(options = {}) {
        super({
            text: '',
            variant: 'default', // default, primary, success, error, warning, info
            size: 'medium', // small, medium, large
            ...options
        });
    }

    createElement() {
        const badge = document.createElement('span');
        badge.className = this.getBadgeClasses();
        badge.textContent = this.options.text;
        
        return badge;
    }

    getBadgeClasses() {
        const classes = ['powercloud-badge'];
        classes.push(`powercloud-badge--${this.options.variant}`);
        classes.push(`powercloud-badge--${this.options.size}`);
        
        return classes.join(' ');
    }

    getCustomStyles() {
        return `
            .powercloud-badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-weight: 500;
                border-radius: 12px;
                white-space: nowrap;
            }

            /* Sizes */
            .powercloud-badge--small {
                padding: 2px 6px;
                font-size: 10px;
                min-height: 16px;
            }

            .powercloud-badge--medium {
                padding: 4px 8px;
                font-size: 12px;
                min-height: 20px;
            }

            .powercloud-badge--large {
                padding: 6px 12px;
                font-size: 14px;
                min-height: 24px;
            }

            /* Variants */
            .powercloud-badge--default {
                background-color: #e9ecef;
                color: #495057;
            }

            .powercloud-badge--primary {
                background-color: #0066cc;
                color: white;
            }

            .powercloud-badge--success {
                background-color: #28a745;
                color: white;
            }

            .powercloud-badge--error {
                background-color: #dc3545;
                color: white;
            }

            .powercloud-badge--warning {
                background-color: #ffc107;
                color: #212529;
            }

            .powercloud-badge--info {
                background-color: #17a2b8;
                color: white;
            }
        `;
    }
}

/**
 * PowerCloud Button Container Component
 * Manages multiple buttons in a flex layout with consistent positioning
 */
class PowerCloudButtonContainer extends PowerCloudUIComponent {
    constructor(options = {}) {
        super({
            position: 'bottom-right', // bottom-right, bottom-left, top-right, top-left, bottom-center
            gap: '10px',
            maxButtons: 10,
            responsive: true,
            ...options
        });
        
        this.buttons = new Map();
        this.container = null;
        this.wrapper = null;
    }

    createElement() {
        const container = document.createElement('div');
        container.id = 'powercloud-button-container';
        container.className = 'powercloud-button-container';
        
        return container;
    }

    setupContent() {
        const container = this.shadowRoot || this.element;
        
        // Create wrapper for buttons
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'powercloud-buttons-wrapper';
        
        container.appendChild(this.wrapper);
        
        // Apply positioning
        this.updatePosition();
    }

    setupShadowContent() {
        // Include styles in shadow DOM
        const style = document.createElement('style');
        style.textContent = this.getComponentStyles();
        this.shadowRoot.appendChild(style);
        
        // Setup content
        this.setupContent();
    }

    updatePosition() {
        if (!this.element) return;
        
        const positions = {
            'bottom-right': { bottom: '20px', right: '20px', flexDirection: 'column-reverse' },
            'bottom-left': { bottom: '20px', left: '20px', flexDirection: 'column-reverse' },
            'top-right': { top: '20px', right: '20px', flexDirection: 'column' },
            'top-left': { top: '20px', left: '20px', flexDirection: 'column' },
            'bottom-center': { bottom: '20px', left: '50%', transform: 'translateX(-50%)', flexDirection: 'row-reverse' }
        };
        
        const pos = positions[this.options.position] || positions['bottom-right'];
        
        // Set data attribute for CSS styling
        this.element.setAttribute('data-position', this.options.position);
        
        // Apply container positioning
        Object.assign(this.element.style, {
            position: 'fixed',
            zIndex: '9999',
            ...pos
        });
        
        // Apply wrapper styling
        if (this.wrapper) {
            Object.assign(this.wrapper.style, {
                display: 'flex',
                flexDirection: pos.flexDirection,
                gap: this.options.gap,
                alignItems: 'center'
            });
        }
    }

    /**
     * Add a button to the container
     * @param {Object} buttonConfig - Button configuration
     * @returns {PowerCloudButton} The created button component
     */
    addButton(buttonConfig) {
        const { id, ...buttonOptions } = buttonConfig;
        
        if (this.buttons.has(id)) {
            console.warn(`[PowerCloudButtonContainer] Button with id '${id}' already exists`);
            return this.buttons.get(id);
        }
        
        // Create button using PowerCloudButton component
        const button = new PowerCloudButton({
            size: 'medium',
            ...buttonOptions
        });
        
        const buttonElement = button.create();
        buttonElement.setAttribute('data-button-id', id);
        
        // Add to wrapper
        if (this.wrapper) {
            this.wrapper.appendChild(buttonElement);
        }
        
        // Store reference
        this.buttons.set(id, button);
        
        return button;
    }

    /**
     * Remove a button from the container
     * @param {string} id - Button ID to remove
     */
    removeButton(id) {
        const button = this.buttons.get(id);
        if (button && button.element) {
            button.destroy();
            this.buttons.delete(id);
        }
    }

    /**
     * Clear all buttons
     */
    clearButtons() {
        this.buttons.forEach((button, id) => {
            this.removeButton(id);
        });
    }

    /**
     * Get the number of buttons in the container
     */
    getButtonCount() {
        return this.buttons.size;
    }

    getCustomStyles() {
        return `
            .powercloud-button-container {
                pointer-events: none;
                font-family: var(--pc-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
            }
            
            .powercloud-buttons-wrapper {
                pointer-events: auto;
            }
            
            .powercloud-buttons-wrapper .powercloud-button {
                pointer-events: auto;
                margin: 0; /* Reset any external margins */
            }
            
            /* Responsive adjustments */
            @media (max-width: 768px) {
                .powercloud-button-container {
                    bottom: 10px !important;
                    right: 10px !important;
                    left: 10px !important;
                }
                
                .powercloud-buttons-wrapper {
                    flex-direction: row !important;
                    flex-wrap: wrap;
                    justify-content: flex-end;
                    gap: 8px !important;
                }
                
                .powercloud-buttons-wrapper .powercloud-button {
                    flex: 0 1 auto;
                    min-width: 120px;
                }
            }
            
            @media (max-width: 480px) {
                .powercloud-buttons-wrapper {
                    flex-direction: column !important;
                    align-items: stretch;
                }
                
                .powercloud-buttons-wrapper .powercloud-button {
                    width: 100%;
                    margin-bottom: 8px;
                }
            }
        `;
    }

    /**
     * Override getComponentStyles to include button styles in shadow DOM
     */
    getComponentStyles() {
        return PowerCloudUIStyles.getBaseStyles() + 
               PowerCloudUIStyles.getButtonStyles() + 
               this.getCustomStyles();
    }
}

/**
 * PowerCloud Button Manager - Singleton for managing extension buttons
 */
class PowerCloudButtonManager {
    constructor() {
        if (PowerCloudButtonManager.instance) {
            return PowerCloudButtonManager.instance;
        }
        
        this.container = null;
        this.initialized = false;
        this.buttons = new Map();
        this.features = new Set();
        
        PowerCloudButtonManager.instance = this;
    }

    /**
     * Initialize the button manager
     * @param {Object} options - Configuration options
     */
    initialize(options = {}) {
        if (this.initialized) {
            return;
        }
        
        try {
            // Create button container
            this.container = new PowerCloudButtonContainer({
                position: 'bottom-right',
                responsive: true,
                ...options
            });
            
            // Create and attach to DOM
            const containerElement = this.container.create(true); // Use shadow DOM
            document.body.appendChild(containerElement);
            
            this.initialized = true;
            
            console.log('[PowerCloudButtonManager] Initialized successfully');
        } catch (error) {
            console.error('[PowerCloudButtonManager] Failed to initialize:', error);
        }
    }

    /**
     * Add a button from a feature
     * @param {string} featureId - ID of the feature adding the button
     * @param {Object} buttonConfig - Button configuration
     */
    addButton(featureId, buttonConfig) {
        if (!this.initialized) {
            this.initialize();
        }
        
        const buttonId = `${featureId}-${buttonConfig.id || 'button'}`;
        
        try {
            if (this.buttons.has(buttonId)) {
                console.log(`[PowerCloudButtonManager] Button '${buttonId}' already exists, returning existing button`);
                return this.buttons.get(buttonId).button;
            }
            
            const button = this.container.addButton({
                id: buttonId,
                ...buttonConfig
            });
            
            this.buttons.set(buttonId, {
                feature: featureId,
                button: button,
                config: buttonConfig
            });
            
            this.features.add(featureId);
            
            console.log(`[PowerCloudButtonManager] Added button '${buttonId}' for feature '${featureId}'`);
            return button;
        } catch (error) {
            console.error(`[PowerCloudButtonManager] Failed to add button '${buttonId}':`, error);
            return null;
        }
    }

    /**
     * Remove a specific button
     * @param {string} featureId - Feature ID
     * @param {string} buttonId - Button ID (optional, removes all feature buttons if not provided)
     */
    removeButton(featureId, buttonId = null) {
        if (!this.initialized || !this.container) {
            return;
        }
        
        if (buttonId) {
            const fullButtonId = `${featureId}-${buttonId}`;
            if (this.buttons.has(fullButtonId)) {
                this.container.removeButton(fullButtonId);
                this.buttons.delete(fullButtonId);
                console.log(`[PowerCloudButtonManager] Removed button '${fullButtonId}'`);
            }
        } else {
            // Remove all buttons for the feature
            this.removeFeatureButtons(featureId);
        }
    }

    /**
     * Remove all buttons for a feature
     * @param {string} featureId - Feature ID
     */
    removeFeatureButtons(featureId) {
        const featureButtons = Array.from(this.buttons.keys()).filter(buttonId => 
            buttonId.startsWith(`${featureId}-`)
        );
        
        featureButtons.forEach(buttonId => {
            this.container.removeButton(buttonId);
            this.buttons.delete(buttonId);
        });
        
        this.features.delete(featureId);
        console.log(`[PowerCloudButtonManager] Removed ${featureButtons.length} buttons for feature '${featureId}'`);
    }

    /**
     * Clean up all buttons and reset
     */
    cleanup() {
        if (this.container) {
            this.container.clearButtons();
            this.container.destroy();
        }
        
        this.container = null;
        this.buttons.clear();
        this.features.clear();
        this.initialized = false;
        
        console.log('[PowerCloudButtonManager] Cleaned up all buttons');
    }

    /**
     * Get button count for debugging
     */
    getStatus() {
        return {
            initialized: this.initialized,
            buttonCount: this.buttons.size,
            featureCount: this.features.size,
            features: Array.from(this.features),
            buttons: Array.from(this.buttons.keys())
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PowerCloudUIComponent,
        PowerCloudButton,
        PowerCloudAlert,
        PowerCloudBadge,
        PowerCloudUIStyles,
        PowerCloudUI,
        PowerCloudButtonContainer,
        PowerCloudButtonManager
    };
} else if (typeof window !== 'undefined') {
    window.PowerCloudUI = PowerCloudUI;
    window.PowerCloudUIComponent = PowerCloudUIComponent;
    window.PowerCloudButton = PowerCloudButton;
    window.PowerCloudAlert = PowerCloudAlert;
    window.PowerCloudBadge = PowerCloudBadge;
    window.PowerCloudUIStyles = PowerCloudUIStyles;
    window.PowerCloudButtonContainer = PowerCloudButtonContainer;
    window.PowerCloudButtonManager = PowerCloudButtonManager;
}
