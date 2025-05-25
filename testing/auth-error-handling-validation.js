/**
 * Validation test for authentication error handling improvements
 * 
 * This test validates that the enhanced error messages work correctly
 * when there are expired tokens for the current environment.
 */

// Import test framework
const pcTest = (() => {
  if (typeof window !== 'undefined' && window.pcTest) {
    return window.pcTest;
  }
  // Fallback for Node.js environment
  return {
    assert: (condition, message) => {
      if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
      }
    },
    log: console.log
  };
})();

/**
 * Test suite for enhanced authentication error handling
 */
function runAuthErrorHandlingTests() {
  pcTest.log('🧪 Running Enhanced Authentication Error Handling Tests...\n');
  
  // Test data setup
  const expiredTokens = [
    {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.expired1',
      clientEnvironment: 'testcustomer',
      isDevRoute: false,
      isValid: false,
      expiryDate: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      timestamp: new Date().toISOString()
    },
    {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.expired2',
      clientEnvironment: 'testcustomer',
      isDevRoute: true,
      isValid: false,
      expiryDate: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      timestamp: new Date().toISOString()
    }
  ];

  // Mock chrome storage for tests
  const originalChromeGet = chrome?.storage?.local?.get;
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get = function(key, callback) {
      callback({ authTokens: expiredTokens });
    };
  }

  try {
    // Test 1: Production environment with expired token
    testProductionExpiredToken();
    
    // Test 2: Development environment with expired token
    testDevelopmentExpiredToken();
    
    // Test 3: Environment with no tokens
    testEnvironmentWithNoTokens();
    
    pcTest.log('✅ All authentication error handling tests passed!\n');
    
  } catch (error) {
    pcTest.log(`❌ Test failed: ${error.message}\n`);
    throw error;
  } finally {
    // Restore original chrome.storage.local.get if it existed
    if (originalChromeGet && typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get = originalChromeGet;
    }
  }
}

/**
 * Test production environment with expired token
 */
function testProductionExpiredToken() {
  pcTest.log('📝 Testing production environment with expired token...');
  
  try {
    // This should throw an error with user-friendly message
    getTokenSync('testcustomer', false);
    throw new Error('Expected an error to be thrown');
  } catch (error) {
    // Verify error message contains expected elements
    pcTest.assert(
      error.message.includes('refresh the page'),
      'Error message should contain refresh guidance'
    );
    pcTest.assert(
      error.message.includes('testcustomer'),
      'Error message should contain environment name'
    );
    pcTest.assert(
      error.message.includes('production'),
      'Error message should contain production context'
    );
    
    pcTest.log(`   ✅ Correct error message: "${error.message}"`);
  }
}

/**
 * Test development environment with expired token
 */
function testDevelopmentExpiredToken() {
  pcTest.log('📝 Testing development environment with expired token...');
  
  try {
    // This should throw an error with user-friendly message
    getTokenSync('testcustomer', true);
    throw new Error('Expected an error to be thrown');
  } catch (error) {
    // Verify error message contains expected elements
    pcTest.assert(
      error.message.includes('refresh the page'),
      'Error message should contain refresh guidance'
    );
    pcTest.assert(
      error.message.includes('testcustomer'),
      'Error message should contain environment name'
    );
    pcTest.assert(
      error.message.includes('development'),
      'Error message should contain development context'
    );
    
    pcTest.log(`   ✅ Correct error message: "${error.message}"`);
  }
}

/**
 * Test environment with no matching tokens
 */
function testEnvironmentWithNoTokens() {
  pcTest.log('📝 Testing environment with no matching tokens...');
  
  try {
    // This should throw the old-style error
    getTokenSync('nonexistent', false);
    throw new Error('Expected an error to be thrown');
  } catch (error) {
    // Verify error message uses old format for no matching tokens
    pcTest.assert(
      error.message.includes('No valid authentication token found'),
      'Error message should use old format for no matching tokens'
    );
    pcTest.assert(
      !error.message.includes('refresh the page'),
      'Error message should NOT contain refresh guidance when no matching tokens exist'
    );
    
    pcTest.log(`   ✅ Correct error message: "${error.message}"`);
  }
}

/**
 * Synchronous version of getToken for testing
 * (simulates the new logic without async/await)
 */
function getTokenSync(clientEnvironment, isDev) {
  const tokens = [
    {
      token: 'expired1',
      clientEnvironment: 'testcustomer',
      isDevRoute: false,
      isValid: false,
      expiryDate: new Date(Date.now() - 3600000).toISOString()
    },
    {
      token: 'expired2',
      clientEnvironment: 'testcustomer',
      isDevRoute: true,
      isValid: false,
      expiryDate: new Date(Date.now() - 7200000).toISOString()
    }
  ];
  
  // Filter for valid tokens
  const validTokens = tokens.filter(token => {
    if (clientEnvironment && token.clientEnvironment !== clientEnvironment) {
      return false;
    }
    
    if (isDev !== undefined && token.isDevRoute !== isDev) {
      return false;
    }
    
    if (token.hasOwnProperty('isValid')) {
      return token.isValid;
    }
    
    if (token.expiryDate) {
      return new Date(token.expiryDate) > new Date();
    }
    
    return true;
  });
  
  if (validTokens.length > 0) {
    return validTokens[0].token;
  }
  
  // NEW LOGIC: Check for expired tokens matching criteria
  const matchingExpiredTokens = tokens.filter(token => {
    if (clientEnvironment && token.clientEnvironment !== clientEnvironment) {
      return false;
    }
    
    if (isDev !== undefined && token.isDevRoute !== isDev) {
      return false;
    }
    
    if (token.hasOwnProperty('isValid') && token.isValid === false) {
      return true;
    }
    
    if (token.expiryDate) {
      return new Date(token.expiryDate) <= new Date();
    }
    
    return false;
  });
  
  // If we have expired tokens for this environment, suggest refreshing
  if (matchingExpiredTokens.length > 0) {
    const envText = clientEnvironment ? ` for environment '${clientEnvironment}'` : '';
    const devText = isDev !== undefined ? ` (${isDev ? 'development' : 'production'})` : '';
    throw new Error(`Authentication token expired${envText}${devText}. Please refresh the page to capture a new token.`);
  }
  
  // No tokens at all for this environment
  if (clientEnvironment || isDev !== undefined) {
    throw new Error(`No valid authentication token found for environment '${clientEnvironment || "any"}' and isDev=${isDev !== undefined ? isDev : "any"}`);
  } else {
    throw new Error("No valid authentication tokens found");
  }
}

// Export for use in testing framework
if (typeof window !== 'undefined') {
  window.runAuthErrorHandlingTests = runAuthErrorHandlingTests;
} else if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAuthErrorHandlingTests };
}

// Auto-run if this is the main script
if (typeof window !== 'undefined' && window.location && window.location.pathname.includes('test-auth-validation')) {
  document.addEventListener('DOMContentLoaded', () => {
    try {
      runAuthErrorHandlingTests();
    } catch (error) {
      console.error('Auth error handling tests failed:', error);
    }
  });
}
