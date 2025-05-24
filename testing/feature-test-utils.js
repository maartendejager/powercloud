/**
 * Feature Testing Utilities and Mocks
 * 
 * Comprehensive utilities for testing features with mocks, stubs, and helpers.
 * Phase 4.1 Implementation - Feature testing utilities and mocks
 */

/**
 * Mock Chrome Extension APIs
 */
class ChromeAPIMocks {
  constructor() {
    this.storage = new MockChromeStorage();
    this.runtime = new MockChromeRuntime();
    this.tabs = new MockChromeTabs();
    this.originalChrome = null;
  }

  /**
   * Install mocks to replace real Chrome APIs
   */
  install() {
    this.originalChrome = window.chrome;
    
    window.chrome = {
      storage: this.storage,
      runtime: this.runtime,
      tabs: this.tabs
    };
  }

  /**
   * Restore original Chrome APIs
   */
  restore() {
    if (this.originalChrome) {
      window.chrome = this.originalChrome;
    } else {
      delete window.chrome;
    }
  }

  /**
   * Reset all mocks to initial state
   */
  reset() {
    this.storage.reset();
    this.runtime.reset();
    this.tabs.reset();
  }
}

/**
 * Mock Chrome Storage API
 */
class MockChromeStorage {
  constructor() {
    this.data = new Map();
    this.lastError = null;
  }

  get local() {
    return {
      get: (keys, callback) => {
        setTimeout(() => {
          if (typeof keys === 'string') {
            const result = { [keys]: this.data.get(keys) };
            callback(result);
          } else if (Array.isArray(keys)) {
            const result = {};
            keys.forEach(key => {
              result[key] = this.data.get(key);
            });
            callback(result);
          } else if (keys === null || keys === undefined) {
            const result = {};
            this.data.forEach((value, key) => {
              result[key] = value;
            });
            callback(result);
          }
        }, 10);
      },

      set: (items, callback) => {
        setTimeout(() => {
          Object.entries(items).forEach(([key, value]) => {
            this.data.set(key, value);
          });
          if (callback) callback();
        }, 10);
      },

      remove: (keys, callback) => {
        setTimeout(() => {
          if (typeof keys === 'string') {
            this.data.delete(keys);
          } else if (Array.isArray(keys)) {
            keys.forEach(key => this.data.delete(key));
          }
          if (callback) callback();
        }, 10);
      },

      clear: (callback) => {
        setTimeout(() => {
          this.data.clear();
          if (callback) callback();
        }, 10);
      }
    };
  }

  reset() {
    this.data.clear();
    this.lastError = null;
  }

  // Helper for testing
  setMockData(key, value) {
    this.data.set(key, value);
  }

  getMockData(key) {
    return this.data.get(key);
  }
}

/**
 * Mock Chrome Runtime API
 */
class MockChromeRuntime {
  constructor() {
    this.messageHandlers = [];
    this.lastError = null;
    this.responses = new Map();
  }

  get onMessage() {
    return {
      addListener: (handler) => {
        this.messageHandlers.push(handler);
      },
      removeListener: (handler) => {
        const index = this.messageHandlers.indexOf(handler);
        if (index > -1) {
          this.messageHandlers.splice(index, 1);
        }
      }
    };
  }

  sendMessage(message, callback) {
    setTimeout(() => {
      // Check if we have a pre-configured response
      const responseKey = message.action || JSON.stringify(message);
      const response = this.responses.get(responseKey);
      
      if (response) {
        if (callback) callback(response);
      } else {
        // Simulate handlers
        let handled = false;
        for (const handler of this.messageHandlers) {
          const result = handler(message, { tab: { id: 1 } }, (response) => {
            if (callback) callback(response);
          });
          if (result === true) {
            handled = true;
            break;
          }
        }
        
        if (!handled && callback) {
          callback({ success: false, error: 'No handler found' });
        }
      }
    }, 10);
  }

  reset() {
    this.messageHandlers = [];
    this.lastError = null;
    this.responses.clear();
  }

  // Helper for testing
  setMockResponse(action, response) {
    this.responses.set(action, response);
  }

  addMockMessageHandler(handler) {
    this.messageHandlers.push(handler);
  }
}

/**
 * Mock Chrome Tabs API
 */
class MockChromeTabs {
  constructor() {
    this.tabs = [
      { id: 1, url: 'https://test.spend.cloud/', active: true }
    ];
  }

  query(queryInfo, callback) {
    setTimeout(() => {
      let results = [...this.tabs];
      
      if (queryInfo.active) {
        results = results.filter(tab => tab.active);
      }
      
      if (queryInfo.url) {
        results = results.filter(tab => tab.url.includes(queryInfo.url));
      }
      
      callback(results);
    }, 10);
  }

  get(tabId, callback) {
    setTimeout(() => {
      const tab = this.tabs.find(t => t.id === tabId);
      callback(tab);
    }, 10);
  }

  reset() {
    this.tabs = [
      { id: 1, url: 'https://test.spend.cloud/', active: true }
    ];
  }

  // Helper for testing
  addMockTab(tab) {
    this.tabs.push(tab);
  }

  setMockTabs(tabs) {
    this.tabs = tabs;
  }
}

/**
 * Feature Test Utilities
 */
class FeatureTestUtils {
  constructor() {
    this.chromeMocks = new ChromeAPIMocks();
    this.domMocks = new DOMTestUtils();
    this.testFeatures = [];
    this.originalGlobals = new Map();
  }

  /**
   * Set up test environment with mocks
   */
  async setup() {
    // Install Chrome API mocks
    this.chromeMocks.install();
    
    // Set up DOM utilities
    this.domMocks.setup();
    
    // Mock common globals if they exist
    this.mockGlobal('console', this.createConsoleMock());
    this.mockGlobal('fetch', this.createFetchMock());
  }

  /**
   * Clean up test environment
   */
  async teardown() {
    // Clean up test features
    for (const feature of this.testFeatures) {
      if (feature.cleanup && typeof feature.cleanup === 'function') {
        try {
          await feature.cleanup();
        } catch (error) {
          console.warn('Error cleaning up test feature:', error);
        }
      }
    }
    this.testFeatures = [];

    // Restore mocks
    this.chromeMocks.restore();
    this.domMocks.teardown();
    
    // Restore globals
    this.restoreGlobals();
  }

  /**
   * Create a test feature with common test patterns
   */
  createTestFeature(config = {}) {
    const defaultConfig = {
      name: 'testFeature' + Date.now(),
      urlPattern: /test/,
      initialized: false,
      active: false,
      errors: [],
      performance: {}
    };

    const feature = {
      ...defaultConfig,
      ...config,
      
      init: function() {
        this.initialized = true;
        this.performance.initTime = Date.now();
        if (config.init) {
          return config.init.call(this);
        }
        return true;
      },

      activate: function() {
        this.active = true;
        this.performance.activateTime = Date.now();
        if (config.activate) {
          return config.activate.call(this);
        }
        return true;
      },

      deactivate: function() {
        this.active = false;
        if (config.deactivate) {
          return config.deactivate.call(this);
        }
        return true;
      },

      cleanup: function() {
        this.initialized = false;
        this.active = false;
        if (config.cleanup) {
          return config.cleanup.call(this);
        }
        return true;
      },

      reportError: function(error) {
        this.errors.push({
          error,
          timestamp: Date.now()
        });
      }
    };

    this.testFeatures.push(feature);
    return feature;
  }

  /**
   * Create a mock BaseFeature instance
   */
  createMockBaseFeature(name = 'mockFeature') {
    return this.createTestFeature({
      name,
      // Mock BaseFeature methods
      getLogger: () => this.createConsoleMock(),
      reportHealth: function(additionalData = {}) {
        return {
          status: this.active ? 'active' : 'inactive',
          initialized: this.initialized,
          lastActivity: Date.now(),
          errors: this.errors,
          performance: this.performance,
          ...additionalData
        };
      }
    });
  }

  /**
   * Create console mock for testing
   */
  createConsoleMock() {
    const logs = [];
    return {
      log: (...args) => logs.push({ level: 'log', args }),
      warn: (...args) => logs.push({ level: 'warn', args }),
      error: (...args) => logs.push({ level: 'error', args }),
      info: (...args) => logs.push({ level: 'info', args }),
      debug: (...args) => logs.push({ level: 'debug', args }),
      getLogs: () => [...logs],
      clearLogs: () => logs.length = 0
    };
  }

  /**
   * Create fetch mock for API testing
   */
  createFetchMock() {
    const responses = new Map();
    
    const mockFetch = (url, options = {}) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const response = responses.get(url) || {
            ok: false,
            status: 404,
            statusText: 'Not Found',
            json: () => Promise.resolve({ error: 'Mock response not configured' })
          };
          resolve(response);
        }, 10);
      });
    };

    mockFetch.setMockResponse = (url, response) => {
      responses.set(url, {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(response),
        text: () => Promise.resolve(JSON.stringify(response))
      });
    };

    mockFetch.setMockError = (url, error) => {
      responses.set(url, {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(error),
        text: () => Promise.reject(error)
      });
    };

    return mockFetch;
  }

  /**
   * Mock a global variable
   */
  mockGlobal(name, mockValue) {
    if (window[name] !== undefined) {
      this.originalGlobals.set(name, window[name]);
    }
    window[name] = mockValue;
  }

  /**
   * Restore all mocked globals
   */
  restoreGlobals() {
    this.originalGlobals.forEach((value, name) => {
      window[name] = value;
    });
    this.originalGlobals.clear();
  }

  /**
   * Wait for a condition to be true
   */
  async waitFor(condition, timeout = 5000, interval = 100) {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Simulate async delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * DOM Testing Utilities
 */
class DOMTestUtils {
  constructor() {
    this.testElements = [];
    this.originalLocation = null;
  }

  setup() {
    this.originalLocation = window.location.href;
  }

  teardown() {
    // Clean up test elements
    this.testElements.forEach(element => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    this.testElements = [];
  }

  /**
   * Create and inject test DOM structure
   */
  createTestDOM(html, containerId = 'test-container') {
    const container = document.createElement('div');
    container.id = containerId;
    container.innerHTML = html;
    document.body.appendChild(container);
    this.testElements.push(container);
    return container;
  }

  /**
   * Create Adyen-like test DOM
   */
  createAdyenTestDOM() {
    return this.createTestDOM(`
      <div class="adyen-checkout">
        <div class="adyen-checkout__payment-method">
          <div class="adyen-checkout__card">
            <div class="adyen-checkout__input-wrapper">
              <input type="text" class="adyen-checkout__input" data-cse="encryptedCardNumber" placeholder="Card Number">
            </div>
            <div class="adyen-checkout__input-wrapper">
              <input type="text" class="adyen-checkout__input" data-cse="encryptedExpiryDate" placeholder="MM/YY">
            </div>
            <div class="adyen-checkout__input-wrapper">
              <input type="text" class="adyen-checkout__input" data-cse="encryptedSecurityCode" placeholder="CVC">
            </div>
          </div>
          <button class="adyen-checkout__button" type="submit">Pay Now</button>
        </div>
      </div>
    `, 'adyen-test-container');
  }

  /**
   * Create SpendCloud book selection test DOM
   */
  createBookTestDOM() {
    return this.createTestDOM(`
      <div class="spend-cloud-booking">
        <div class="book-selector-container">
          <label for="book-select">Select Book:</label>
          <select id="book-select" class="book-selector">
            <option value="">-- Select Book --</option>
            <option value="1">Administration Book 1</option>
            <option value="2">Project Book A</option>
            <option value="3">Department Book X</option>
          </select>
        </div>
        <div class="book-details" style="display: none;">
          <h3>Book Details</h3>
          <div class="book-info">
            <span class="book-name"></span>
            <span class="book-code"></span>
          </div>
        </div>
      </div>
    `, 'book-test-container');
  }

  /**
   * Simulate user interaction
   */
  simulateClick(element) {
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    return element.dispatchEvent(event);
  }

  simulateInput(element, value) {
    element.value = value;
    const event = new Event('input', {
      bubbles: true,
      cancelable: true
    });
    return element.dispatchEvent(event);
  }

  simulateChange(element, value) {
    if (value !== undefined) {
      element.value = value;
    }
    const event = new Event('change', {
      bubbles: true,
      cancelable: true
    });
    return element.dispatchEvent(event);
  }

  /**
   * Mock URL change
   */
  mockURLChange(newURL) {
    // Note: This is a simplified mock - real URL changes would trigger navigation
    window.history.pushState({}, '', newURL);
    
    // Trigger popstate event
    const event = new PopStateEvent('popstate', { state: {} });
    window.dispatchEvent(event);
  }

  /**
   * Wait for element to appear
   */
  async waitForElement(selector, timeout = 5000) {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Element ${selector} not found within ${timeout}ms`);
  }
}

/**
 * Performance Testing Utilities
 */
class PerformanceTestUtils {
  constructor() {
    this.measurements = new Map();
  }

  /**
   * Start timing an operation
   */
  startTimer(name) {
    this.measurements.set(name, {
      start: performance.now(),
      end: null,
      duration: null
    });
  }

  /**
   * End timing an operation
   */
  endTimer(name) {
    const measurement = this.measurements.get(name);
    if (!measurement) {
      throw new Error(`Timer '${name}' was not started`);
    }
    
    measurement.end = performance.now();
    measurement.duration = measurement.end - measurement.start;
    
    return measurement.duration;
  }

  /**
   * Get timing results
   */
  getResults() {
    const results = {};
    this.measurements.forEach((measurement, name) => {
      results[name] = {
        duration: measurement.duration,
        start: measurement.start,
        end: measurement.end
      };
    });
    return results;
  }

  /**
   * Reset all measurements
   */
  reset() {
    this.measurements.clear();
  }

  /**
   * Memory usage snapshot
   */
  getMemorySnapshot() {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
        timestamp: Date.now()
      };
    }
    return null;
  }
}

// Export utilities
window.FeatureTestingUtils = {
  ChromeAPIMocks,
  FeatureTestUtils,
  DOMTestUtils,
  PerformanceTestUtils
};

// Initialize global test utilities instance if test framework is available
if (typeof pcTest !== 'undefined') {
  window.testUtils = new FeatureTestUtils();
  window.domUtils = new DOMTestUtils();
  window.perfUtils = new PerformanceTestUtils();
  
  console.log('✅ Feature Testing Utilities initialized and available globally');
}
