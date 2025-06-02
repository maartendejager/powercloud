/**
 * Test script for authentication token error handling improvements
 * 
 * This script tests the enhanced error messages for expired tokens
 */

// Mock chrome.storage.local for testing
global.chrome = {
  storage: {
    local: {
      get: (key, callback) => {
        // Mock expired tokens for testing
        const mockTokens = [
          {
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid', // Expired token
            clientEnvironment: 'testcustomer',
            isDevRoute: false,
            isValid: false,
            expiryDate: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            timestamp: new Date().toISOString()
          },
          {
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid2', // Expired token  
            clientEnvironment: 'testcustomer',
            isDevRoute: true,
            isValid: false,
            expiryDate: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
            timestamp: new Date().toISOString()
          }
        ];
        
        callback({ authTokens: mockTokens });
      }
    }
  }
};

// Import the module to test
const authModule = require('./shared/auth-module.js');

// Test function
async function testExpiredTokenError() {
  console.log('Testing enhanced authentication error messages...\n');
  
  try {
    // Test 1: Request token for production environment with only expired tokens
    console.log('Test 1: Production environment with expired token');
    await authModule.getToken('testcustomer', false);
    console.log('❌ ERROR: Should have thrown an error');
  } catch (error) {
    console.log('✅ Expected error:', error.message);
    
    if (error.message.includes('refresh the page')) {
      console.log('✅ Contains user-friendly refresh message');
    } else {
      console.log('❌ Missing refresh guidance');
    }
    
    if (error.message.includes('testcustomer')) {
      console.log('✅ Contains environment context');
    } else {
      console.log('❌ Missing environment context');
    }
    
    if (error.message.includes('production')) {
      console.log('✅ Contains development context');
    } else {
      console.log('❌ Missing development context');
    }
  }
  
  console.log('\n---\n');
  
  try {
    // Test 2: Request token for development environment with only expired tokens
    console.log('Test 2: Development environment with expired token');
    await authModule.getToken('testcustomer', true);
    console.log('❌ ERROR: Should have thrown an error');
  } catch (error) {
    console.log('✅ Expected error:', error.message);
    
    if (error.message.includes('development')) {
      console.log('✅ Contains development context');
    } else {
      console.log('❌ Missing development context');
    }
  }
  
  console.log('\n---\n');
  
  try {
    // Test 3: Request token for non-existent environment (should use old error)
    console.log('Test 3: Non-existent environment');
    await authModule.getToken('nonexistent', false);
    console.log('❌ ERROR: Should have thrown an error');
  } catch (error) {
    console.log('✅ Expected error:', error.message);
    
    if (error.message.includes('No valid authentication token found')) {
      console.log('✅ Uses old-style error for no matching tokens');
    } else {
      console.log('❌ Unexpected error format');
    }
  }
}

// Run the test
if (require.main === module) {
  testExpiredTokenError().catch(console.error);
}

module.exports = { testExpiredTokenError };
