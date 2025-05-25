/**
 * PowerCloud Responsive Design System
 * 
 * Provides responsive design utilities and components that adapt to different
 * screen sizes, container contexts, and user preferences.
 */

/**
 * Responsive Manager - Handles responsive behavior across the extension
 */
class PowerCloudResponsive {
    constructor() {
        this.breakpoints = {
            xs: 0,
            sm: 576,
            md: 768,
            lg: 992,
            xl: 1200,
            xxl: 1400
        };
        
        this.observers = new Map();
        this.containerQueries = new Map();
        this.currentBreakpoint = this.getCurrentBreakpoint();
        
        this.setupMediaQueries();
    }

    /**
     * Initialize the responsive system
     */
    static initialize() {
        if (!window.PowerCloudResponsiveManager) {
            window.PowerCloudResponsiveManager = new PowerCloudResponsive();
        }
        return window.PowerCloudResponsiveManager;
    }

    /**
     * Get the current breakpoint
     * @returns {string} Current breakpoint name
     */
    getCurrentBreakpoint() {
        const width = window.innerWidth;
        const breakpointEntries = Object.entries(this.breakpoints).reverse();
        
        for (const [name, minWidth] of breakpointEntries) {
            if (width >= minWidth) {
                return name;
            }
        }
        
        return 'xs';
    }

    /**
     * Setup media query listeners
     * @private
     */
    setupMediaQueries() {
        Object.entries(this.breakpoints).forEach(([name, minWidth]) => {
            const mediaQuery = window.matchMedia(`(min-width: ${minWidth}px)`);
            
            mediaQuery.addEventListener('change', () => {
                const newBreakpoint = this.getCurrentBreakpoint();
                if (newBreakpoint !== this.currentBreakpoint) {
                    this.currentBreakpoint = newBreakpoint;
                    this.notifyBreakpointChange(newBreakpoint);
                }
            });
        });

        // Listen for orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                const newBreakpoint = this.getCurrentBreakpoint();
                if (newBreakpoint !== this.currentBreakpoint) {
                    this.currentBreakpoint = newBreakpoint;
                    this.notifyBreakpointChange(newBreakpoint);
                }
            }, 100);
        });
    }

    /**
     * Notify observers of breakpoint changes
     * @param {string} breakpoint - New breakpoint
     * @private
     */
    notifyBreakpointChange(breakpoint) {
        this.observers.forEach(callback => {
            try {
                callback(breakpoint);
            } catch (error) {
                console.error('PowerCloud Responsive: Error in breakpoint observer:', error);
            }
        });
    }

    /**
     * Add breakpoint change observer
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    onBreakpointChange(callback) {
        const id = Symbol('observer');
        this.observers.set(id, callback);
        
        return () => {
            this.observers.delete(id);
        };
    }

    /**
     * Check if current viewport matches a breakpoint
     * @param {string} breakpoint - Breakpoint to check
     * @returns {boolean} True if matches
     */
    matchesBreakpoint(breakpoint) {
        return this.currentBreakpoint === breakpoint;
    }

    /**
     * Check if current viewport is at least a certain breakpoint
     * @param {string} breakpoint - Minimum breakpoint
     * @returns {boolean} True if at least the breakpoint
     */
    isAtLeast(breakpoint) {
        const currentIndex = Object.keys(this.breakpoints).indexOf(this.currentBreakpoint);
        const targetIndex = Object.keys(this.breakpoints).indexOf(breakpoint);
        return currentIndex >= targetIndex;
    }

    /**
     * Check if current viewport is at most a certain breakpoint
     * @param {string} breakpoint - Maximum breakpoint
     * @returns {boolean} True if at most the breakpoint
     */
    isAtMost(breakpoint) {
        const currentIndex = Object.keys(this.breakpoints).indexOf(this.currentBreakpoint);
        const targetIndex = Object.keys(this.breakpoints).indexOf(breakpoint);
        return currentIndex <= targetIndex;
    }

    /**
     * Setup container-based responsive behavior
     * @param {HTMLElement} container - Container element
     * @param {Object} options - Configuration options
     */
    setupContainerQuery(container, options = {}) {
        const {
            breakpoints = { sm: 300, md: 500, lg: 700 },
            className = 'powercloud-container',
            onResize = null
        } = options;

        const resizeObserver = new ResizeObserver(entries => {
            entries.forEach(entry => {
                const width = entry.contentRect.width;
                const element = entry.target;
                
                // Remove existing breakpoint classes
                Object.keys(breakpoints).forEach(bp => {
                    element.classList.remove(`${className}--${bp}-up`);
                    element.classList.remove(`${className}--${bp}-down`);
                });

                // Add appropriate classes
                Object.entries(breakpoints).forEach(([name, minWidth]) => {
                    if (width >= minWidth) {
                        element.classList.add(`${className}--${name}-up`);
                    } else {
                        element.classList.add(`${className}--${name}-down`);
                    }
                });

                if (onResize) {
                    onResize(width, element);
                }
            });
        });

        resizeObserver.observe(container);
        
        // Store observer for cleanup
        const observerId = Symbol('containerQuery');
        this.containerQueries.set(observerId, resizeObserver);

        return () => {
            resizeObserver.disconnect();
            this.containerQueries.delete(observerId);
        };
    }

    /**
     * Get responsive styles based on current context
     * @param {Object} styleConfig - Style configuration
     * @returns {string} CSS styles
     */
    getResponsiveStyles(styleConfig) {
        let styles = '';

        Object.entries(styleConfig).forEach(([breakpoint, rules]) => {
            if (breakpoint === 'base') {
                // Base styles (no media query)
                styles += this.rulesToCSS(rules);
            } else if (this.breakpoints[breakpoint] !== undefined) {
                // Breakpoint-specific styles
                const minWidth = this.breakpoints[breakpoint];
                styles += `@media (min-width: ${minWidth}px) { ${this.rulesToCSS(rules)} }`;
            }
        });

        return styles;
    }

    /**
     * Convert style rules object to CSS string
     * @param {Object} rules - Style rules
     * @returns {string} CSS string
     * @private
     */
    rulesToCSS(rules) {
        return Object.entries(rules)
            .map(([property, value]) => `${this.kebabCase(property)}: ${value};`)
            .join(' ');
    }

    /**
     * Convert camelCase to kebab-case
     * @param {string} str - String to convert
     * @returns {string} Kebab-case string
     * @private
     */
    kebabCase(str) {
        return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
    }

    /**
     * Create responsive grid system
     * @param {HTMLElement} container - Grid container
     * @param {Object} config - Grid configuration
     */
    createResponsiveGrid(container, config = {}) {
        const {
            columns = { xs: 1, sm: 2, md: 3, lg: 4 },
            gap = '16px',
            className = 'powercloud-grid'
        } = config;

        container.classList.add(className);

        const styles = this.getResponsiveStyles({
            base: {
                display: 'grid',
                gap: gap,
                gridTemplateColumns: `repeat(${columns.xs || 1}, 1fr)`
            },
            sm: {
                gridTemplateColumns: `repeat(${columns.sm || columns.xs || 1}, 1fr)`
            },
            md: {
                gridTemplateColumns: `repeat(${columns.md || columns.sm || columns.xs || 1}, 1fr)`
            },
            lg: {
                gridTemplateColumns: `repeat(${columns.lg || columns.md || columns.sm || columns.xs || 1}, 1fr)`
            },
            xl: {
                gridTemplateColumns: `repeat(${columns.xl || columns.lg || columns.md || columns.sm || columns.xs || 1}, 1fr)`
            }
        });

        this.injectStyles(styles, `powercloud-grid-${Date.now()}`);
    }

    /**
     * Inject styles into the document
     * @param {string} styles - CSS styles
     * @param {string} id - Style element ID
     * @private
     */
    injectStyles(styles, id) {
        let styleElement = document.getElementById(id);
        
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = id;
            document.head.appendChild(styleElement);
        }

        styleElement.textContent = styles;
    }

    /**
     * Make an element responsive with adaptive sizing
     * @param {HTMLElement} element - Element to make responsive
     * @param {Object} config - Responsive configuration
     */
    makeResponsive(element, config = {}) {
        const {
            sizes = { xs: '100%', sm: '50%', md: '33.333%', lg: '25%' },
            property = 'width',
            className = 'powercloud-responsive'
        } = config;

        element.classList.add(className);

        const styleRules = {};
        Object.entries(sizes).forEach(([breakpoint, value]) => {
            styleRules[breakpoint] = { [property]: value };
        });

        const styles = `.${className} { ${this.getResponsiveStyles(styleRules)} }`;
        this.injectStyles(styles, `responsive-${className}-${Date.now()}`);
    }

    /**
     * Check if device is likely mobile
     * @returns {boolean} True if mobile device
     */
    isMobile() {
        return this.isAtMost('sm') || 
               /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Check if device is likely tablet
     * @returns {boolean} True if tablet device
     */
    isTablet() {
        return this.currentBreakpoint === 'md' || 
               /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
    }

    /**
     * Check if device is likely desktop
     * @returns {boolean} True if desktop device
     */
    isDesktop() {
        return this.isAtLeast('lg') && 
               !/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Get viewport dimensions
     * @returns {Object} Viewport width and height
     */
    getViewportDimensions() {
        return {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }

    /**
     * Cleanup all observers and listeners
     */
    destroy() {
        this.observers.clear();
        this.containerQueries.forEach(observer => observer.disconnect());
        this.containerQueries.clear();
    }
}

/**
 * Responsive UI Components
 */
class PowerCloudResponsiveComponents {
    /**
     * Create a responsive card component
     * @param {Object} options - Card options
     * @returns {HTMLElement} Card element
     */
    static createResponsiveCard(options = {}) {
        const {
            title = '',
            content = '',
            actions = [],
            variant = 'default',
            responsive = true
        } = options;

        const card = document.createElement('div');
        card.className = 'powercloud-card';
        
        if (variant !== 'default') {
            card.classList.add(`powercloud-card--${variant}`);
        }

        card.innerHTML = `
            ${title ? `<div class="powercloud-card__header"><h3 class="powercloud-card__title">${title}</h3></div>` : ''}
            <div class="powercloud-card__content">${content}</div>
            ${actions.length > 0 ? `<div class="powercloud-card__actions"></div>` : ''}
        `;

        // Add action buttons
        if (actions.length > 0) {
            const actionsContainer = card.querySelector('.powercloud-card__actions');
            actions.forEach(action => {
                const button = document.createElement('button');
                button.className = 'powercloud-card__action';
                button.textContent = action.text;
                if (action.onClick) {
                    button.addEventListener('click', action.onClick);
                }
                actionsContainer.appendChild(button);
            });
        }

        if (responsive) {
            PowerCloudResponsive.initialize().makeResponsive(card, {
                sizes: {
                    xs: '100%',
                    sm: 'calc(50% - 8px)',
                    md: 'calc(33.333% - 10.667px)',
                    lg: 'calc(25% - 12px)'
                },
                className: 'powercloud-card'
            });
        }

        return card;
    }

    /**
     * Create responsive navigation component
     * @param {Object} options - Navigation options
     * @returns {HTMLElement} Navigation element
     */
    static createResponsiveNav(options = {}) {
        const {
            items = [],
            variant = 'horizontal', // horizontal, vertical, auto
            collapseAt = 'md'
        } = options;

        const nav = document.createElement('nav');
        nav.className = 'powercloud-nav';
        nav.setAttribute('role', 'navigation');

        const list = document.createElement('ul');
        list.className = 'powercloud-nav__list';

        items.forEach(item => {
            const listItem = document.createElement('li');
            listItem.className = 'powercloud-nav__item';

            if (item.href) {
                const link = document.createElement('a');
                link.href = item.href;
                link.textContent = item.text;
                link.className = 'powercloud-nav__link';
                listItem.appendChild(link);
            } else {
                const button = document.createElement('button');
                button.textContent = item.text;
                button.className = 'powercloud-nav__button';
                if (item.onClick) {
                    button.addEventListener('click', item.onClick);
                }
                listItem.appendChild(button);
            }

            list.appendChild(listItem);
        });

        nav.appendChild(list);

        // Setup responsive behavior
        if (variant === 'auto') {
            const responsive = PowerCloudResponsive.initialize();
            const cleanup = responsive.onBreakpointChange(breakpoint => {
                if (responsive.isAtMost(collapseAt)) {
                    nav.classList.add('powercloud-nav--mobile');
                    nav.classList.remove('powercloud-nav--desktop');
                } else {
                    nav.classList.add('powercloud-nav--desktop');
                    nav.classList.remove('powercloud-nav--mobile');
                }
            });

            // Initial setup
            const currentResponsive = PowerCloudResponsive.initialize();
            if (currentResponsive.isAtMost(collapseAt)) {
                nav.classList.add('powercloud-nav--mobile');
            } else {
                nav.classList.add('powercloud-nav--desktop');
            }

            // Store cleanup function
            nav._responsiveCleanup = cleanup;
        }

        return nav;
    }

    /**
     * Create responsive layout component
     * @param {Object} options - Layout options
     * @returns {HTMLElement} Layout element
     */
    static createResponsiveLayout(options = {}) {
        const {
            type = 'flexbox', // flexbox, grid, sidebar
            direction = 'row', // row, column, responsive
            wrap = true,
            gap = '16px',
            justifyContent = 'flex-start',
            alignItems = 'flex-start'
        } = options;

        const layout = document.createElement('div');
        layout.className = 'powercloud-layout';

        if (type === 'flexbox') {
            layout.style.cssText = `
                display: flex;
                flex-direction: ${direction === 'responsive' ? 'column' : direction};
                flex-wrap: ${wrap ? 'wrap' : 'nowrap'};
                gap: ${gap};
                justify-content: ${justifyContent};
                align-items: ${alignItems};
            `;

            if (direction === 'responsive') {
                const responsive = PowerCloudResponsive.initialize();
                responsive.onBreakpointChange(breakpoint => {
                    layout.style.flexDirection = responsive.isAtLeast('md') ? 'row' : 'column';
                });

                // Initial setup
                layout.style.flexDirection = responsive.isAtLeast('md') ? 'row' : 'column';
            }
        } else if (type === 'grid') {
            PowerCloudResponsive.initialize().createResponsiveGrid(layout, {
                columns: { xs: 1, sm: 2, md: 3, lg: 4 },
                gap
            });
        }

        return layout;
    }
}

/**
 * Responsive utilities
 */
const PowerCloudResponsiveUtils = {
    /**
     * Get responsive CSS custom properties
     * @param {Object} values - Breakpoint values
     * @param {string} property - CSS property name
     * @returns {string} CSS custom properties
     */
    getResponsiveCSSProps(values, property) {
        const responsive = PowerCloudResponsive.initialize();
        let css = '';

        Object.entries(values).forEach(([breakpoint, value]) => {
            if (breakpoint === 'base') {
                css += `--${property}: ${value}; `;
            } else if (responsive.breakpoints[breakpoint] !== undefined) {
                const minWidth = responsive.breakpoints[breakpoint];
                css += `@media (min-width: ${minWidth}px) { --${property}: ${value}; } `;
            }
        });

        return css;
    },

    /**
     * Create media query string
     * @param {string} breakpoint - Breakpoint name
     * @param {string} direction - 'up' or 'down'
     * @returns {string} Media query string
     */
    createMediaQuery(breakpoint, direction = 'up') {
        const responsive = PowerCloudResponsive.initialize();
        const width = responsive.breakpoints[breakpoint];
        
        if (direction === 'up') {
            return `(min-width: ${width}px)`;
        } else {
            return `(max-width: ${width - 1}px)`;
        }
    },

    /**
     * Check if container is too small for content
     * @param {HTMLElement} container - Container element
     * @param {number} minWidth - Minimum required width
     * @returns {boolean} True if too small
     */
    isContainerTooSmall(container, minWidth = 300) {
        return container.offsetWidth < minWidth;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PowerCloudResponsive,
        PowerCloudResponsiveComponents,
        PowerCloudResponsiveUtils
    };
} else if (typeof window !== 'undefined') {
    window.PowerCloudResponsive = PowerCloudResponsive;
    window.PowerCloudResponsiveComponents = PowerCloudResponsiveComponents;
    window.PowerCloudResponsiveUtils = PowerCloudResponsiveUtils;
}
