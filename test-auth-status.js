/**
 * Test Authentication Status Integration - Step 3.2
 * Tests the new authentication status display in the health dashboard
 */

console.log('🔐 Testing Authentication Status Integration...\n');

// Test getAuthStatus API
chrome.runtime.sendMessage({
  action: 'getAuthStatus'
}, (response) => {
  console.log('📊 Authentication Status Response:', response);
  
  if (response && response.success) {
    console.log('✅ Authentication status API working');
    console.log('📈 Token Summary:', response.tokenSummary);
    console.log('🌍 Environments:', Object.keys(response.authStatus.environments || {}));
    console.log('⚠️ Auth Errors:', response.authStatus.authErrors?.length || 0);
    console.log('🛡️ Cascading Errors Prevented:', response.authStatus.cascadingErrorsPrevented || 0);
  } else {
    console.log('❌ Authentication status API failed:', response?.error);
  }
});

// Test reportAuthError API (with fake data)
chrome.runtime.sendMessage({
  action: 'reportAuthError',
  endpoint: '/api/test/endpoint',
  error: 'Authentication failed - test error',
  clientEnvironment: 'testenv',
  isDev: true
}, (response) => {
  console.log('📊 Report Auth Error Response:', response);
  
  if (response && response.success) {
    if (response.suppressed) {
      console.log('🛡️ Auth error was suppressed (cascading prevention)');
    } else {
      console.log('✅ Auth error reported successfully');
    }
  } else {
    console.log('❌ Report auth error API failed:', response?.error);
  }
});

console.log('\n🧪 Test commands sent. Check the console for responses.');
console.log('💡 Open the popup health dashboard to see the authentication status display.');
