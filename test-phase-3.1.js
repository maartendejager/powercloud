#!/usr/bin/env node

/**
 * Phase 3.1 Configuration Management - Standalone Test Runner
 * 
 * Tests the SettingsManager functionality in a Node.js environment
 * to validate the configuration management system before browser integration.
 * 
 * Usage: node test-phase-3.1.js
 */

// Mock Chrome storage API for Node.js testing
global.chrome = {
  storage: {
    local: {
      data: {},
      get: function(keys, callback) {
        const result = {};
        if (Array.isArray(keys)) {
          keys.forEach(key => {
            if (this.data.hasOwnProperty(key)) {
              result[key] = this.data[key];
            }
          });
        } else if (typeof keys === 'string') {
          if (this.data.hasOwnProperty(keys)) {
            result[keys] = this.data[keys];
          }
        } else if (typeof keys === 'object' && keys !== null) {
          Object.keys(keys).forEach(key => {
            result[key] = this.data.hasOwnProperty(key) ? this.data[key] : keys[key];
          });
        }
        if (callback) setTimeout(() => callback(result), 0);
        return Promise.resolve(result);
      },
      set: function(items, callback) {
        Object.keys(items).forEach(key => {
          this.data[key] = items[key];
        });
        if (callback) setTimeout(callback, 0);
        return Promise.resolve();
      },
      remove: function(keys, callback) {
        if (Array.isArray(keys)) {
          keys.forEach(key => delete this.data[key]);
        } else {
          delete this.data[keys];
        }
        if (callback) setTimeout(callback, 0);
        return Promise.resolve();
      },
      clear: function(callback) {
        this.data = {};
        if (callback) setTimeout(callback, 0);
        return Promise.resolve();
      }
    },
    sync: {
      data: {},
      get: function(keys, callback) {
        // Same implementation as local for testing
        return chrome.storage.local.get.call(this, keys, callback);
      },
      set: function(items, callback) {
        return chrome.storage.local.set.call(this, items, callback);
      },
      remove: function(keys, callback) {
        return chrome.storage.local.remove.call(this, keys, callback);
      },
      clear: function(callback) {
        return chrome.storage.local.clear.call(this, callback);
      }
    },
    onChanged: {
      listeners: [],
      addListener: function(listener) {
        this.listeners.push(listener);
      },
      removeListener: function(listener) {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
          this.listeners.splice(index, 1);
        }
      },
      trigger: function(changes, namespace) {
        this.listeners.forEach(listener => {
          try {
            listener(changes, namespace);
          } catch (error) {
            console.error('Error in storage listener:', error);
          }
        });
      }
    }
  }
};

// Mock window for Node.js
global.window = {
  PowerCloudLogger: class MockLogger {
    constructor(name) {
      this.name = name;
    }
    
    debug(...args) {
      console.log(`[DEBUG][${this.name}]`, ...args);
    }
    
    info(...args) {
      console.log(`[INFO][${this.name}]`, ...args);
    }
    
    warn(...args) {
      console.log(`[WARN][${this.name}]`, ...args);
    }
    
    error(...args) {
      console.log(`[ERROR][${this.name}]`, ...args);
    }
  }
};

// Load SettingsManager
require('./shared/settings-manager.js');

const SettingsManager = window.PowerCloudSettingsManager;

/**
 * Simple test framework for Node.js testing
 */
class SimpleTestRunner {
  constructor() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      total: 0
    };
  }

  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async run() {
    console.log('🚀 Starting Phase 3.1 Configuration Management Tests\n');
    
    for (const test of this.tests) {
      try {
        await test.testFn();
        console.log(`✅ ${test.name}`);
        this.results.passed++;
      } catch (error) {
        console.log(`❌ ${test.name}`);
        console.log(`   Error: ${error.message}`);
        this.results.failed++;
      }
      this.results.total++;
    }

    console.log('\n📊 Test Results:');
    console.log(`   Total: ${this.results.total}`);
    console.log(`   Passed: ${this.results.passed}`);
    console.log(`   Failed: ${this.results.failed}`);
    console.log(`   Success Rate: ${Math.round((this.results.passed / this.results.total) * 100)}%`);

    if (this.results.failed > 0) {
      process.exit(1);
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  assertDeepEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }
}

const runner = new SimpleTestRunner();

// Test 1: SettingsManager Initialization
runner.test('SettingsManager should initialize with default configuration', async () => {
  const settings = new SettingsManager({ environment: 'testing' }); // Use testing env to avoid production overrides
  await settings.initialize();
  
  runner.assert(settings.initialized, 'SettingsManager should be initialized');
  runner.assertEqual(settings.get('core.debugMode'), true, 'Debug mode should be true in testing'); // Testing env enables debug
  runner.assertEqual(settings.get('core.logLevel'), 'debug', 'Log level should be debug in testing'); // Testing env sets debug
});

// Test 2: Setting and Getting Values
runner.test('SettingsManager should set and get values correctly', async () => {
  const settings = new SettingsManager();
  await settings.initialize();
  
  await settings.set('core.debugMode', true);
  runner.assertEqual(settings.get('core.debugMode'), true, 'Debug mode should be set to true');
  
  await settings.set('ui.theme', 'dark');
  runner.assertEqual(settings.get('ui.theme'), 'dark', 'Theme should be set to dark');
});

// Test 3: Validation System
runner.test('SettingsManager should validate configuration values', async () => {
  const settings = new SettingsManager();
  await settings.initialize();
  
  // Test valid values
  const validResult = await settings.set('core.logLevel', 'debug');
  runner.assert(validResult, 'Valid log level should be accepted');
  
  // Test invalid values - should return false, not throw
  const invalidResult = await settings.set('core.logLevel', 'invalid');
  runner.assert(!invalidResult, 'Invalid log level should be rejected');
});

// Test 4: Feature Toggles
runner.test('SettingsManager should manage feature toggles', async () => {
  const settings = new SettingsManager();
  await settings.initialize();
  
  runner.assertEqual(settings.isFeatureEnabled('adyenCard'), true, 'AdyenCard should be enabled by default');
  
  await settings.toggleFeature('adyenCard');
  runner.assertEqual(settings.isFeatureEnabled('adyenCard'), false, 'AdyenCard should be disabled after toggle');
  
  await settings.toggleFeature('adyenCard');
  runner.assertEqual(settings.isFeatureEnabled('adyenCard'), true, 'AdyenCard should be enabled after toggle');
});

// Test 5: Environment Configuration
runner.test('SettingsManager should handle environment-specific configuration', async () => {
  const settings = new SettingsManager();
  await settings.initialize();
  
  // Test setting environment
  await settings.setEnvironment('development');
  
  runner.assertEqual(settings.get('core.debugMode'), true, 'Debug mode should be enabled in development');
  runner.assertEqual(settings.get('core.logLevel'), 'debug', 'Log level should be debug in development');
});

// Test 6: Configuration Export/Import
runner.test('SettingsManager should export and import configuration', async () => {
  // Clear storage first
  chrome.storage.local.data = {};
  
  const settings1 = new SettingsManager({ environment: 'testing' });
  await settings1.initialize();
  
  // Test with UI theme which isn't affected by environment config
  await settings1.set('ui.theme', 'dark');
  await settings1.set('ui.compactMode', true);
  
  const exportedConfig = settings1.exportSettings(true);
  runner.assert(exportedConfig.settings, 'Exported config should have settings property');
  
  // Clear storage to simulate fresh start
  chrome.storage.local.data = {};
  
  const settings2 = new SettingsManager({ environment: 'testing' });
  await settings2.initialize();
  
  const importResult = await settings2.importSettings(exportedConfig);
  runner.assert(importResult, 'Configuration import should succeed');
  
  runner.assertEqual(settings2.get('ui.theme'), 'dark', 'Theme should be imported correctly');
  runner.assertEqual(settings2.get('ui.compactMode'), true, 'Compact mode should be imported correctly');
});

// Test 7: Configuration Reset
runner.test('SettingsManager should reset configuration to defaults', async () => {
  const settings = new SettingsManager();
  await settings.initialize();
  
  await settings.set('core.debugMode', true);
  await settings.set('ui.theme', 'dark');
  
  await settings.resetAll();
  
  runner.assertEqual(settings.get('core.debugMode'), false, 'Debug mode should be reset to default');
  runner.assertEqual(settings.get('ui.theme'), 'auto', 'Theme should be reset to default');
});

// Test 8: Configuration Schema Validation
runner.test('SettingsManager should validate against schema', async () => {
  const settings = new SettingsManager();
  await settings.initialize();
  
  // Test number validation - should return false for invalid values
  const result1 = await settings.set('performance.initializationTimeout', 500); // Below minimum
  runner.assert(!result1, 'Should reject value below minimum');
  
  // Test enum validation
  const result2 = await settings.set('ui.theme', 'rainbow');
  runner.assert(!result2, 'Should reject invalid enum value');
});

// Test 9: Storage Integration
runner.test('SettingsManager should persist data to storage', async () => {
  // Clear storage first
  chrome.storage.local.data = {};
  
  const settings = new SettingsManager({ environment: 'testing' });
  await settings.initialize();
  
  // Use a setting not affected by environment config
  await settings.set('ui.compactMode', true);
  
  // Wait a bit for async save
  await new Promise(resolve => setTimeout(resolve, 10));
  
  // Check that data was actually saved to mock storage
  runner.assert(chrome.storage.local.data.powerCloudSettings, 'Settings should be saved to storage');
  
  // Simulate a new instance loading from storage
  const settings2 = new SettingsManager({ environment: 'testing' });
  await settings2.initialize();
  
  runner.assertEqual(settings2.get('ui.compactMode'), true, 'Settings should persist across instances');
});

// Test 10: Configuration Listeners
runner.test('SettingsManager should support change listeners', async () => {
  const settings = new SettingsManager();
  await settings.initialize();
  
  let listenerCalled = false;
  let receivedValue = null;
  
  // Add a listener
  const unsubscribe = settings.addListener('core.debugMode', (newValue, oldValue, path) => {
    listenerCalled = true;
    receivedValue = newValue;
  });
  
  await settings.set('core.debugMode', true);
  
  runner.assert(listenerCalled, 'Listener should be called when setting changes');
  runner.assertEqual(receivedValue, true, 'Listener should receive correct new value');
  
  // Clean up
  unsubscribe();
});

// Run all tests
(async () => {
  try {
    await runner.run();
    console.log('\n🎉 Phase 3.1 Configuration Management tests completed successfully!');
  } catch (error) {
    console.error('\n💥 Test runner failed:', error);
    process.exit(1);
  }
})();
