/**
 * PowerCloud Accessibility Utilities
 * 
 * Provides comprehensive accessibility support for the PowerCloud extension,
 * including ARIA labels, keyboard navigation, focus management, and screen reader support.
 */

/**
 * Accessibility Manager - Main class for handling accessibility features
 */
class PowerCloudAccessibility {
    constructor() {
        this.trapStack = [];
        this.announceQueue = [];
        this.isAnnouncing = false;
    }

    /**
     * Initialize accessibility features
     */
    static initialize() {
        if (!window.PowerCloudAccessibilityManager) {
            window.PowerCloudAccessibilityManager = new PowerCloudAccessibility();
        }
        return window.PowerCloudAccessibilityManager;
    }

    /**
     * Create a live region for announcements
     * @param {string} politeness - 'polite' or 'assertive'
     * @returns {HTMLElement} The live region element
     */
    createLiveRegion(politeness = 'polite') {
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', politeness);
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'powercloud-sr-only';
        liveRegion.id = `powercloud-live-region-${politeness}`;
        
        document.body.appendChild(liveRegion);
        return liveRegion;
    }

    /**
     * Announce a message to screen readers
     * @param {string} message - Message to announce
     * @param {string} priority - 'polite' or 'assertive'
     */
    announce(message, priority = 'polite') {
        this.announceQueue.push({ message, priority });
        this.processAnnounceQueue();
    }

    /**
     * Process the announcement queue
     * @private
     */
    processAnnounceQueue() {
        if (this.isAnnouncing || this.announceQueue.length === 0) return;

        this.isAnnouncing = true;
        const { message, priority } = this.announceQueue.shift();

        let liveRegion = document.getElementById(`powercloud-live-region-${priority}`);
        if (!liveRegion) {
            liveRegion = this.createLiveRegion(priority);
        }

        // Clear previous message
        liveRegion.textContent = '';
        
        // Small delay to ensure screen readers notice the change
        setTimeout(() => {
            liveRegion.textContent = message;
            
            // Clear the message after announcement
            setTimeout(() => {
                liveRegion.textContent = '';
                this.isAnnouncing = false;
                this.processAnnounceQueue(); // Process next message
            }, 1000);
        }, 100);
    }

    /**
     * Set up focus trap for modal dialogs
     * @param {HTMLElement} container - Container to trap focus within
     * @returns {Object} Focus trap instance with release method
     */
    trapFocus(container) {
        const focusableElements = this.getFocusableElements(container);
        
        if (focusableElements.length === 0) return { release: () => {} };

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const handleTabKey = (e) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                // Tab
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };

        const handleEscapeKey = (e) => {
            if (e.key === 'Escape') {
                this.releaseFocusTrap();
            }
        };

        container.addEventListener('keydown', handleTabKey);
        container.addEventListener('keydown', handleEscapeKey);

        // Focus the first element
        firstElement.focus();

        const trapInstance = {
            release: () => {
                container.removeEventListener('keydown', handleTabKey);
                container.removeEventListener('keydown', handleEscapeKey);
                this.trapStack = this.trapStack.filter(trap => trap !== trapInstance);
            }
        };

        this.trapStack.push(trapInstance);
        return trapInstance;
    }

    /**
     * Release the most recent focus trap
     */
    releaseFocusTrap() {
        const trap = this.trapStack.pop();
        if (trap) {
            trap.release();
        }
    }

    /**
     * Get all focusable elements within a container
     * @param {HTMLElement} container - Container to search within
     * @returns {HTMLElement[]} Array of focusable elements
     */
    getFocusableElements(container) {
        const focusableSelectors = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
            '[contenteditable="true"]'
        ].join(', ');

        return Array.from(container.querySelectorAll(focusableSelectors))
            .filter(el => {
                // Check if element is visible and not hidden
                const style = window.getComputedStyle(el);
                return style.display !== 'none' && 
                       style.visibility !== 'hidden' && 
                       el.offsetParent !== null;
            });
    }

    /**
     * Set up keyboard navigation for a set of elements
     * @param {HTMLElement[]} elements - Elements to navigate between
     * @param {Object} options - Navigation options
     */
    setupKeyboardNavigation(elements, options = {}) {
        const {
            wrap = true,
            orientation = 'horizontal', // 'horizontal' or 'vertical'
            onActivate = null
        } = options;

        const keys = orientation === 'horizontal' 
            ? { next: 'ArrowRight', prev: 'ArrowLeft' }
            : { next: 'ArrowDown', prev: 'ArrowUp' };

        elements.forEach((element, index) => {
            element.addEventListener('keydown', (e) => {
                let targetIndex = -1;

                switch (e.key) {
                    case keys.next:
                        targetIndex = index + 1;
                        if (wrap && targetIndex >= elements.length) {
                            targetIndex = 0;
                        }
                        break;
                    case keys.prev:
                        targetIndex = index - 1;
                        if (wrap && targetIndex < 0) {
                            targetIndex = elements.length - 1;
                        }
                        break;
                    case 'Home':
                        targetIndex = 0;
                        break;
                    case 'End':
                        targetIndex = elements.length - 1;
                        break;
                    case 'Enter':
                    case ' ':
                        if (onActivate) {
                            e.preventDefault();
                            onActivate(element, index);
                        }
                        break;
                }

                if (targetIndex !== -1 && elements[targetIndex]) {
                    e.preventDefault();
                    elements[targetIndex].focus();
                }
            });
        });
    }

    /**
     * Add ARIA labels and descriptions to an element
     * @param {HTMLElement} element - Element to add ARIA attributes to
     * @param {Object} options - ARIA options
     */
    addAriaLabels(element, options = {}) {
        const {
            label,
            labelledBy,
            describedBy,
            role,
            expanded,
            controls,
            hasPopup,
            live,
            atomic
        } = options;

        if (label) {
            element.setAttribute('aria-label', label);
        }

        if (labelledBy) {
            element.setAttribute('aria-labelledby', labelledBy);
        }

        if (describedBy) {
            element.setAttribute('aria-describedby', describedBy);
        }

        if (role) {
            element.setAttribute('role', role);
        }

        if (expanded !== undefined) {
            element.setAttribute('aria-expanded', expanded.toString());
        }

        if (controls) {
            element.setAttribute('aria-controls', controls);
        }

        if (hasPopup) {
            element.setAttribute('aria-haspopup', hasPopup);
        }

        if (live) {
            element.setAttribute('aria-live', live);
        }

        if (atomic !== undefined) {
            element.setAttribute('aria-atomic', atomic.toString());
        }
    }

    /**
     * Create a skip link for keyboard navigation
     * @param {string} targetId - ID of the target element to skip to
     * @param {string} text - Text for the skip link
     * @returns {HTMLElement} The skip link element
     */
    createSkipLink(targetId, text = 'Skip to main content') {
        const skipLink = document.createElement('a');
        skipLink.href = `#${targetId}`;
        skipLink.textContent = text;
        skipLink.className = 'powercloud-skip-link';
        
        // Style the skip link
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 6px;
            background: #000;
            color: #fff;
            padding: 8px;
            text-decoration: none;
            border-radius: 4px;
            z-index: 10000;
            transition: top 0.3s;
        `;

        // Show on focus
        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '6px';
        });

        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });

        return skipLink;
    }

    /**
     * Enhance form accessibility
     * @param {HTMLFormElement} form - Form to enhance
     */
    enhanceFormAccessibility(form) {
        const inputs = form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            // Associate labels with inputs
            const label = form.querySelector(`label[for="${input.id}"]`);
            if (!label && input.id) {
                // Look for label by proximity
                const possibleLabel = input.previousElementSibling;
                if (possibleLabel && possibleLabel.tagName === 'LABEL') {
                    possibleLabel.setAttribute('for', input.id);
                }
            }

            // Add aria-required for required fields
            if (input.required) {
                input.setAttribute('aria-required', 'true');
            }

            // Add aria-invalid for fields with validation errors
            if (input.validity && !input.validity.valid) {
                input.setAttribute('aria-invalid', 'true');
            }

            // Listen for validation changes
            input.addEventListener('invalid', () => {
                input.setAttribute('aria-invalid', 'true');
            });

            input.addEventListener('input', () => {
                if (input.validity.valid) {
                    input.removeAttribute('aria-invalid');
                }
            });
        });

        // Add form validation announcements
        form.addEventListener('submit', (e) => {
            const invalidInputs = form.querySelectorAll(':invalid');
            if (invalidInputs.length > 0) {
                this.announce(`Form has ${invalidInputs.length} validation error${invalidInputs.length > 1 ? 's' : ''}`, 'assertive');
            }
        });
    }

    /**
     * Check if reduced motion is preferred
     * @returns {boolean} True if reduced motion is preferred
     */
    prefersReducedMotion() {
        return window.matchMedia && 
               window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * Check if high contrast is preferred
     * @returns {boolean} True if high contrast is preferred
     */
    prefersHighContrast() {
        return window.matchMedia && 
               window.matchMedia('(prefers-contrast: high)').matches;
    }

    /**
     * Apply accessibility enhancements to an existing element
     * @param {HTMLElement} element - Element to enhance
     * @param {Object} options - Enhancement options
     */
    enhanceElement(element, options = {}) {
        const {
            focusable = false,
            skipLink = false,
            announceChanges = false,
            keyboardNavigation = false
        } = options;

        if (focusable && !element.hasAttribute('tabindex')) {
            element.setAttribute('tabindex', '0');
        }

        if (skipLink && element.id) {
            const skipLinkElement = this.createSkipLink(element.id);
            element.parentNode.insertBefore(skipLinkElement, element);
        }

        if (announceChanges) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    if (mutation.type === 'childList' || mutation.type === 'characterData') {
                        const text = element.textContent.trim();
                        if (text) {
                            this.announce(text, 'polite');
                        }
                    }
                });
            });

            observer.observe(element, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }

        if (keyboardNavigation) {
            element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    element.click();
                }
            });
        }
    }
}

/**
 * Utility functions for common accessibility patterns
 */
const PowerCloudA11yUtils = {
    /**
     * Create an accessible button with proper ARIA attributes
     * @param {Object} options - Button options
     * @returns {HTMLElement} The button element
     */
    createAccessibleButton(options = {}) {
        const {
            text = 'Button',
            onClick = null,
            ariaLabel = null,
            ariaDescribedBy = null,
            disabled = false
        } = options;

        const button = document.createElement('button');
        button.textContent = text;
        button.disabled = disabled;

        if (ariaLabel) {
            button.setAttribute('aria-label', ariaLabel);
        }

        if (ariaDescribedBy) {
            button.setAttribute('aria-describedby', ariaDescribedBy);
        }

        if (onClick) {
            button.addEventListener('click', onClick);
        }

        return button;
    },

    /**
     * Create an accessible dialog/modal
     * @param {Object} options - Dialog options
     * @returns {HTMLElement} The dialog element
     */
    createAccessibleDialog(options = {}) {
        const {
            title = 'Dialog',
            content = '',
            onClose = null
        } = options;

        const dialog = document.createElement('div');
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', 'dialog-title');

        const titleId = 'dialog-title-' + Date.now();
        
        dialog.innerHTML = `
            <h2 id="${titleId}" class="dialog-title">${title}</h2>
            <div class="dialog-content">${content}</div>
            <button class="dialog-close" aria-label="Close dialog">&times;</button>
        `;

        dialog.setAttribute('aria-labelledby', titleId);

        const closeButton = dialog.querySelector('.dialog-close');
        closeButton.addEventListener('click', () => {
            if (onClose) onClose();
        });

        return dialog;
    },

    /**
     * Create an accessible tooltip
     * @param {HTMLElement} trigger - Element that triggers the tooltip
     * @param {string} text - Tooltip text
     * @returns {HTMLElement} The tooltip element
     */
    createAccessibleTooltip(trigger, text) {
        const tooltipId = 'tooltip-' + Date.now();
        
        const tooltip = document.createElement('div');
        tooltip.id = tooltipId;
        tooltip.textContent = text;
        tooltip.setAttribute('role', 'tooltip');
        tooltip.className = 'powercloud-tooltip';
        tooltip.style.cssText = `
            position: absolute;
            background: #333;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 1000;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s;
        `;

        trigger.setAttribute('aria-describedby', tooltipId);
        trigger.appendChild(tooltip);

        let showTimeout, hideTimeout;

        const showTooltip = () => {
            clearTimeout(hideTimeout);
            showTimeout = setTimeout(() => {
                tooltip.style.opacity = '1';
            }, 500);
        };

        const hideTooltip = () => {
            clearTimeout(showTimeout);
            hideTimeout = setTimeout(() => {
                tooltip.style.opacity = '0';
            }, 100);
        };

        trigger.addEventListener('mouseenter', showTooltip);
        trigger.addEventListener('mouseleave', hideTooltip);
        trigger.addEventListener('focus', showTooltip);
        trigger.addEventListener('blur', hideTooltip);

        return tooltip;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PowerCloudAccessibility,
        PowerCloudA11yUtils
    };
} else if (typeof window !== 'undefined') {
    window.PowerCloudAccessibility = PowerCloudAccessibility;
    window.PowerCloudA11yUtils = PowerCloudA11yUtils;
}
