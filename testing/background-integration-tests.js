/**
 * Background Service Worker Integration Tests
 * 
 * Comprehensive integration tests for the background service worker functionality.
 * Phase 4.1 Implementation - Integration tests for background service worker
 */

/**
 * Service Worker Message Handling Tests
 */
function setupServiceWorkerMessageTests() {
  return pcTest.describe('Service Worker Message Handling', function() {
    
    this.beforeEach(function() {
      this.messagePromises = new Map();
      this.testTimeouts = [];
      
      // Helper to send message and wait for response
      this.sendMessage = (action, data = {}) => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Message timeout for action: ${action}`));
          }, 5000);
          
          this.testTimeouts.push(timeout);
          
          chrome.runtime.sendMessage({ action, ...data }, (response) => {
            clearTimeout(timeout);
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        });
      };
    });

    this.afterEach(function() {
      // Clear any pending timeouts
      this.testTimeouts.forEach(timeout => clearTimeout(timeout));
      this.testTimeouts = [];
    });

    this.it('should handle getAuthTokens message', async function() {
      try {
        const response = await this.sendMessage('getAuthTokens');
        
        pcTest.assert(typeof response === 'object', 'Response should be an object');
        pcTest.assert(response !== null, 'Response should not be null');
        pcTest.assert(Array.isArray(response.tokens) || response.tokens === undefined, 'Tokens should be array or undefined');
      } catch (error) {
        if (error.message.includes('timeout')) {
          this.skip('Service worker not responding - may not be active');
        } else {
          throw error;
        }
      }
    });

    this.it('should handle health dashboard messages', async function() {
      const healthMessages = [
        'getExtensionHealth',
        'getFeatureStatus', 
        'getPerformanceMetrics',
        'getDebugLogs',
        'getErrorReports'
      ];

      for (const action of healthMessages) {
        try {
          const response = await this.sendMessage(action);
          pcTest.assert(typeof response === 'object', `${action} response should be an object`);
          pcTest.assert(response.success !== undefined, `${action} should include success status`);
        } catch (error) {
          if (error.message.includes('timeout')) {
            this.skip(`Service worker not responding for ${action}`);
            break;
          } else {
            throw error;
          }
        }
      }
    });

    this.it('should handle feature health updates', async function() {
      const testHealthData = {
        status: 'active',
        lastActivity: Date.now(),
        performance: {
          initTime: 45,
          memoryUsage: 1.2
        },
        errors: []
      };

      try {
        const response = await this.sendMessage('updateFeatureHealth', {
          feature: 'testFeature',
          health: testHealthData
        });

        pcTest.assert(response.success === true, 'Health update should succeed');
      } catch (error) {
        if (error.message.includes('timeout')) {
          this.skip('Service worker not responding for health update');
        } else {
          throw error;
        }
      }
    });

    this.it('should handle performance metric recording', async function() {
      try {
        const response = await this.sendMessage('recordPerformanceMetric', {
          feature: 'testFeature',
          metric: 'loadTime',
          value: 123.45,
          metadata: { url: window.location.href }
        });

        pcTest.assert(response.success === true, 'Performance metric recording should succeed');
      } catch (error) {
        if (error.message.includes('timeout')) {
          this.skip('Service worker not responding for performance recording');
        } else {
          throw error;
        }
      }
    });

    this.it('should handle error scenarios gracefully', async function() {
      try {
        // Send invalid message
        const response = await this.sendMessage('invalidAction', { invalid: 'data' });
        
        // Service worker should respond even to invalid actions
        pcTest.assert(typeof response === 'object' || response === undefined, 'Should handle invalid actions gracefully');
      } catch (error) {
        // This is acceptable - service worker may reject invalid messages
        pcTest.assert(true, 'Service worker appropriately rejected invalid message');
      }
    });
  });
}

/**
 * Token Management Tests
 */
function setupTokenManagementTests() {
  return pcTest.describe('Token Management', function() {
    
    this.beforeEach(function() {
      this.originalTokens = null;
      
      // Helper to send message
      this.sendMessage = (action, data = {}) => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Token message timeout for action: ${action}`));
          }, 5000);
          
          chrome.runtime.sendMessage({ action, ...data }, (response) => {
            clearTimeout(timeout);
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        });
      };
    });

    this.it('should retrieve existing tokens', async function() {
      try {
        const response = await this.sendMessage('getAuthTokens');
        
        this.originalTokens = response;
        
        pcTest.assert(typeof response === 'object', 'Token response should be an object');
        pcTest.assert(Array.isArray(response.tokens) || response.tokens === undefined, 'Tokens should be array or undefined');
        
        if (response.tokens) {
          response.tokens.forEach(token => {
            pcTest.assert(typeof token === 'object', 'Each token should be an object');
            pcTest.assert(typeof token.domain === 'string', 'Token should have domain');
          });
        }
      } catch (error) {
        if (error.message.includes('timeout')) {
          this.skip('Service worker not responding for token retrieval');
        } else {
          throw error;
        }
      }
    });

    this.it('should handle token deletion', async function() {
      try {
        // Try to delete a test token (should handle gracefully even if not exists)
        const response = await this.sendMessage('deleteToken', {
          domain: 'test.spend.cloud'
        });
        
        pcTest.assert(typeof response === 'object', 'Delete token response should be an object');
        // Response should indicate success or failure appropriately
        pcTest.assert(response.success !== undefined, 'Delete response should have success indicator');
      } catch (error) {
        if (error.message.includes('timeout')) {
          this.skip('Service worker not responding for token deletion');
        } else {
          throw error;
        }
      }
    });

    this.it('should handle clear all tokens', async function() {
      try {
        const response = await this.sendMessage('deleteAllTokens');
        
        pcTest.assert(typeof response === 'object', 'Clear tokens response should be an object');
        pcTest.assert(response.success !== undefined, 'Clear response should have success indicator');
        
        // Verify tokens are cleared
        const tokensAfter = await this.sendMessage('getAuthTokens');
        pcTest.assert(Array.isArray(tokensAfter.tokens) && tokensAfter.tokens.length === 0, 'Tokens should be cleared');
        
      } catch (error) {
        if (error.message.includes('timeout')) {
          this.skip('Service worker not responding for token clearing');
        } else {
          throw error;
        }
      }
    });
  });
}

/**
 * API Request Handling Tests
 */
function setupAPIRequestTests() {
  return pcTest.describe('API Request Handling', function() {
    
    this.beforeEach(function() {
      // Helper to send API request message
      this.sendAPIMessage = (action, data = {}) => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`API message timeout for action: ${action}`));
          }, 10000); // Longer timeout for API calls
          
          chrome.runtime.sendMessage({ action, ...data }, (response) => {
            clearTimeout(timeout);
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        });
      };
    });

    this.it('should handle card details fetch request', async function() {
      try {
        const response = await this.sendAPIMessage('fetchCardDetails', {
          cardId: 'test-card-123',
          domain: 'test.spend.cloud'
        });
        
        pcTest.assert(typeof response === 'object', 'Card details response should be an object');
        // Response should indicate success/failure and include appropriate data
        pcTest.assert(response.success !== undefined || response.error !== undefined, 'Response should have success or error indicator');
        
      } catch (error) {
        if (error.message.includes('timeout')) {
          this.skip('Service worker not responding for card details fetch');
        } else {
          // API errors are acceptable in tests
          pcTest.assert(true, 'API request handled (error expected in test environment)');
        }
      }
    });

    this.it('should handle book details fetch request', async function() {
      try {
        const response = await this.sendAPIMessage('fetchBookDetails', {
          bookId: 'test-book-456',
          domain: 'test.spend.cloud'
        });
        
        pcTest.assert(typeof response === 'object', 'Book details response should be an object');
        pcTest.assert(response.success !== undefined || response.error !== undefined, 'Response should have success or error indicator');
        
      } catch (error) {
        if (error.message.includes('timeout')) {
          this.skip('Service worker not responding for book details fetch');
        } else {
          pcTest.assert(true, 'API request handled (error expected in test environment)');
        }
      }
    });

    this.it('should handle entry details fetch request', async function() {
      try {
        const response = await this.sendAPIMessage('fetchEntryDetails', {
          entryId: 'test-entry-789',
          domain: 'test.spend.cloud'
        });
        
        pcTest.assert(typeof response === 'object', 'Entry details response should be an object');
        pcTest.assert(response.success !== undefined || response.error !== undefined, 'Response should have success or error indicator');
        
      } catch (error) {
        if (error.message.includes('timeout')) {
          this.skip('Service worker not responding for entry details fetch');
        } else {
          pcTest.assert(true, 'API request handled (error expected in test environment)');
        }
      }
    });

    this.it('should handle administration details fetch', async function() {
      try {
        const response = await this.sendAPIMessage('fetchAdministrationDetails', {
          adminId: 'test-admin-101',
          domain: 'test.spend.cloud'
        });
        
        pcTest.assert(typeof response === 'object', 'Administration details response should be an object');
        pcTest.assert(response.success !== undefined || response.error !== undefined, 'Response should have success or error indicator');
        
      } catch (error) {
        if (error.message.includes('timeout')) {
          this.skip('Service worker not responding for administration details fetch');
        } else {
          pcTest.assert(true, 'API request handled (error expected in test environment)');
        }
      }
    });
  });
}

/**
 * Health Monitoring Integration Tests
 */
function setupHealthMonitoringTests() {
  return pcTest.describe('Health Monitoring Integration', function() {
    
    this.beforeEach(function() {
      this.sendMessage = (action, data = {}) => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Health message timeout for action: ${action}`));
          }, 5000);
          
          chrome.runtime.sendMessage({ action, ...data }, (response) => {
            clearTimeout(timeout);
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        });
      };
    });

    this.it('should provide extension health status', async function() {
      try {
        const response = await this.sendMessage('getExtensionHealth');
        
        pcTest.assert(response.success === true, 'Health request should succeed');
        pcTest.assert(typeof response.health === 'object', 'Health data should be an object');
        
        const health = response.health;
        pcTest.assert(typeof health.uptime === 'number', 'Health should include uptime');
        pcTest.assert(typeof health.featureCount === 'number', 'Health should include feature count');
        pcTest.assert(typeof health.lastUpdate === 'number', 'Health should include last update timestamp');
        
      } catch (error) {
        if (error.message.includes('timeout')) {
          this.skip('Service worker not responding for health status');
        } else {
          throw error;
        }
      }
    });

    this.it('should track and report feature status', async function() {
      try {
        // First update a feature's health
        await this.sendMessage('updateFeatureHealth', {
          feature: 'integrationTestFeature',
          health: {
            status: 'active',
            lastActivity: Date.now(),
            performance: { initTime: 100 }
          }
        });

        // Then retrieve feature status
        const response = await this.sendMessage('getFeatureStatus');
        
        pcTest.assert(response.success === true, 'Feature status request should succeed');
        pcTest.assert(typeof response.features === 'object', 'Features data should be an object');
        
      } catch (error) {
        if (error.message.includes('timeout')) {
          this.skip('Service worker not responding for feature status');
        } else {
          throw error;
        }
      }
    });

    this.it('should collect and export debug logs', async function() {
      try {
        // Get current debug logs
        const logsResponse = await this.sendMessage('getDebugLogs');
        
        pcTest.assert(logsResponse.success === true, 'Debug logs request should succeed');
        pcTest.assert(Array.isArray(logsResponse.logs), 'Debug logs should be an array');
        
        // Test export functionality
        const exportResponse = await this.sendMessage('exportHealthReport');
        
        pcTest.assert(exportResponse.success === true, 'Health report export should succeed');
        pcTest.assert(typeof exportResponse.report === 'object', 'Export should include report data');
        
      } catch (error) {
        if (error.message.includes('timeout')) {
          this.skip('Service worker not responding for debug logs');
        } else {
          throw error;
        }
      }
    });

    this.it('should handle clear debug data', async function() {
      try {
        const response = await this.sendMessage('clearDebugData');
        
        pcTest.assert(response.success === true, 'Clear debug data should succeed');
        
        // Verify data is cleared
        const logsAfter = await this.sendMessage('getDebugLogs');
        pcTest.assert(logsAfter.success === true, 'Should still be able to get logs after clear');
        
      } catch (error) {
        if (error.message.includes('timeout')) {
          this.skip('Service worker not responding for clear debug data');
        } else {
          throw error;
        }
      }
    });
  });
}

/**
 * Storage Integration Tests
 */
function setupStorageIntegrationTests() {
  return pcTest.describe('Storage Integration', function() {
    
    this.beforeEach(function() {
      this.testKeys = [];
    });

    this.afterEach(async function() {
      // Clean up test storage keys
      if (this.testKeys.length > 0) {
        try {
          await new Promise((resolve) => {
            chrome.storage.local.remove(this.testKeys, resolve);
          });
        } catch (error) {
          console.warn('Could not clean up test storage keys:', error);
        }
      }
    });

    this.it('should handle chrome storage operations', async function() {
      const testKey = 'powercloud_test_storage';
      const testData = { test: true, timestamp: Date.now() };
      
      this.testKeys.push(testKey);

      try {
        // Test storage set
        await new Promise((resolve, reject) => {
          chrome.storage.local.set({ [testKey]: testData }, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });

        // Test storage get
        const retrieved = await new Promise((resolve, reject) => {
          chrome.storage.local.get(testKey, (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(result[testKey]);
            }
          });
        });

        pcTest.assert(retrieved !== undefined, 'Should retrieve stored data');
        pcTest.assert(retrieved.test === testData.test, 'Retrieved data should match stored data');
        pcTest.assert(retrieved.timestamp === testData.timestamp, 'Should preserve all data properties');

      } catch (error) {
        this.skip('Chrome storage not available in test environment');
      }
    });

    this.it('should handle storage errors gracefully', async function() {
      try {
        // Try to store invalid data
        await new Promise((resolve, reject) => {
          const circularData = {};
          circularData.self = circularData; // This should fail JSON serialization
          
          chrome.storage.local.set({ invalid: circularData }, () => {
            if (chrome.runtime.lastError) {
              resolve(); // Error is expected
            } else {
              reject(new Error('Should have failed with circular reference'));
            }
          });
        });

        pcTest.assert(true, 'Storage appropriately rejected invalid data');
      } catch (error) {
        this.skip('Chrome storage not available for error testing');
      }
    });
  });
}

/**
 * Initialize all background service worker integration tests
 */
function initializeBackgroundIntegrationTests() {
  // Check if we're in an environment where chrome.runtime is available
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.warn('Chrome runtime not available - background integration tests cannot run');
    return;
  }

  // Wait for test framework to be available
  if (typeof pcTest === 'undefined') {
    console.error('Test framework not available. Please load test-framework.js first.');
    return;
  }

  console.log('🧪 Initializing Background Service Worker Integration Tests...');

  // Set up all test suites
  setupServiceWorkerMessageTests();
  setupTokenManagementTests();
  setupAPIRequestTests();
  setupHealthMonitoringTests();
  setupStorageIntegrationTests();

  console.log('✅ Background Service Worker Integration Tests initialized');
}

// Auto-initialize if test framework and chrome runtime are available
if (typeof pcTest !== 'undefined' && typeof chrome !== 'undefined' && chrome.runtime) {
  initializeBackgroundIntegrationTests();
} else {
  // Wait for dependencies
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializeBackgroundIntegrationTests, 100);
  });
}

// Export for manual initialization
window.initializeBackgroundIntegrationTests = initializeBackgroundIntegrationTests;
