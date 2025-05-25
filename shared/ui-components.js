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
 * PowerCloud UI Styles - Central styling system
 */
class PowerCloudUIStyles {
    static getBaseStyles() {
        return `
            /* PowerCloud UI Base Styles */
            :host {
                --pc-primary-color: #0066cc;
                --pc-success-color: #28a745;
                --pc-error-color: #dc3545;
                --pc-warning-color: #ffc107;
                --pc-info-color: #17a2b8;
                --pc-secondary-color: #6c757d;
                
                --pc-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                --pc-border-radius: 6px;
                --pc-box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                --pc-transition: all 0.2s ease-in-out;
                
                --pc-spacing-xs: 4px;
                --pc-spacing-sm: 8px;
                --pc-spacing-md: 16px;
                --pc-spacing-lg: 24px;
                --pc-spacing-xl: 32px;
                
                font-family: var(--pc-font-family);
                box-sizing: border-box;
            }

            *, *::before, *::after {
                box-sizing: inherit;
            }

            /* Utility classes */
            .powercloud-container {
                font-family: var(--pc-font-family);
                color: #333;
            }

            .powercloud-hidden {
                display: none !important;
            }

            .powercloud-visible {
                display: block !important;
            }

            .powercloud-sr-only {
                position: absolute;
                width: 1px;
                height: 1px;
                padding: 0;
                margin: -1px;
                overflow: hidden;
                clip: rect(0, 0, 0, 0);
                white-space: nowrap;
                border: 0;
            }

            /* Focus management */
            .powercloud-focus-trap {
                outline: none;
            }

            /* Responsive utilities */
            @media (max-width: 480px) {
                .powercloud-container {
                    padding: var(--pc-spacing-sm);
                }
                
                .powercloud-button {
                    width: 100%;
                    margin-bottom: var(--pc-spacing-sm);
                }
            }
        `;
    }

    /**
     * Inject base styles into a document or shadow root
     * @param {Document|ShadowRoot} target - Where to inject styles
     */
    static injectBaseStyles(target = document) {
        const existingStyle = target.querySelector('#powercloud-base-styles');
        if (existingStyle) return; // Already injected

        const style = document.createElement('style');
        style.id = 'powercloud-base-styles';
        style.textContent = this.getBaseStyles();
        
        if (target === document) {
            document.head.appendChild(style);
        } else {
            target.appendChild(style);
        }
    }
}

/**
 * PowerCloud UI Factory - Simplified component creation
 */
class PowerCloudUI {
    /**
     * Create a button component
     */
    static createButton(options = {}) {
        return new PowerCloudButton(options);
    }

    /**
     * Create an alert component
     */
    static createAlert(options = {}) {
        return new PowerCloudAlert(options);
    }

    /**
     * Create a badge component
     */
    static createBadge(options = {}) {
        return new PowerCloudBadge(options);
    }

    /**
     * Initialize UI system with base styles
     * @param {Document|ShadowRoot} target - Where to inject base styles
     */
    static initialize(target = document) {
        PowerCloudUIStyles.injectBaseStyles(target);
    }

    /**
     * Create a shadow host element for content scripts
     * @param {string} id - ID for the host element
     * @returns {HTMLElement} The shadow host
     */
    static createShadowHost(id = 'powercloud-shadow-host') {
        let host = document.getElementById(id);
        
        if (!host) {
            host = document.createElement('div');
            host.id = id;
            host.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                pointer-events: none;
            `;
        }
        
        return host;
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
        PowerCloudUI
    };
} else if (typeof window !== 'undefined') {
    window.PowerCloudUI = PowerCloudUI;
    window.PowerCloudUIComponent = PowerCloudUIComponent;
    window.PowerCloudButton = PowerCloudButton;
    window.PowerCloudAlert = PowerCloudAlert;
    window.PowerCloudBadge = PowerCloudBadge;
    window.PowerCloudUIStyles = PowerCloudUIStyles;
}
