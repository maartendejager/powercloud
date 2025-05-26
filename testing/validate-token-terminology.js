/**
 * Validation tests for token terminology consistency
 * 
 * This test validates that we're processing the tenant name (clientEnvironment)
 * and environment type (isDevRoute) correctly when capturing and displaying tokens.
 */

// Test URLs to validate tenant extraction and environment type identification
const TEST_URLS = [
  {
    url: 'https://customer1.spend.cloud/api/v1/data',
    expectedTenant: 'customer1',
    expectedEnvironmentType: 'production'
  },
  {
    url: 'https://acme-corp.dev.spend.cloud/api/v1/data',
    expectedTenant: 'acme-corp',
    expectedEnvironmentType: 'development'
  },
  {
    url: 'https://test-tenant.spend.cloud/v2/transactions',
    expectedTenant: 'test-tenant',
    expectedEnvironmentType: 'production'
  },
  {
    url: 'https://tenant-with-complex-name.dev.spend.cloud/auth',
    expectedTenant: 'tenant-with-complex-name',
    expectedEnvironmentType: 'development'
  }
];

/**
 * Run the token terminology validation tests
 */
async function validateTokenTerminology() {
  console.log('🧪 Running token terminology validation tests...');
  
  // Get references to the extraction functions
  const extractClientEnvironment = window.extractClientEnvironment;
  const isDevelopmentRoute = window.isDevelopmentRoute;
  
  if (!extractClientEnvironment || !isDevelopmentRoute) {
    console.error('❌ Required functions not found in global scope');
    return false;
  }
  
  let allPassed = true;
  
  // Test each URL
  TEST_URLS.forEach((test, index) => {
    console.group(`Test URL ${index + 1}: ${test.url}`);
    
    // Test tenant extraction
    const extractedTenant = extractClientEnvironment(test.url);
    const tenantPass = extractedTenant === test.expectedTenant;
    console.log(
      `${tenantPass ? '✅' : '❌'} Tenant extraction: got "${extractedTenant}", expected "${test.expectedTenant}"`
    );
    
    // Test environment type identification
    const isDev = isDevelopmentRoute(test.url);
    const expectedIsDev = test.expectedEnvironmentType === 'development';
    const envTypePass = isDev === expectedIsDev;
    console.log(
      `${envTypePass ? '✅' : '❌'} Environment type: got "${isDev ? 'development' : 'production'}", expected "${test.expectedEnvironmentType}"`
    );
    
    if (!tenantPass || !envTypePass) {
      allPassed = false;
    }
    
    console.groupEnd();
  });
  
  console.log(`Overall validation result: ${allPassed ? '✅ Passed' : '❌ Failed'}`);
  return allPassed;
}

/**
 * Function to run in popup for validating display consistency
 */
async function validateTokenDisplay() {
  // This can be run within the popup to verify UI elements are using consistent terminology
  console.log('🧪 Validating token display terminology...');
  
  // Check that metric grid uses "Tenants" label
  const tenantMetricLabel = Array.from(document.querySelectorAll('.metric-label'))
    .find(el => el.textContent.trim().toLowerCase() === 'tenants');
  console.log(`Metric Grid: ${tenantMetricLabel ? '✅ Found "Tenants" label' : '❌ "Tenants" label not found'}`);
  
  // Check token cards display tenant name properly
  const clientEnvironmentElements = document.querySelectorAll('.client-environment');
  console.log(`Token Cards: ${clientEnvironmentElements.length > 0 ? 
    '✅ Found tenant name elements' : 
    '❌ Tenant name elements not found'}`);
  
  // Check environment badges
  const envBadges = document.querySelectorAll('.environment-badge');
  console.log(`Environment Badges: ${envBadges.length > 0 ? 
    '✅ Found environment type badges' : 
    '❌ Environment type badges not found'}`);
    
  return tenantMetricLabel && clientEnvironmentElements.length > 0 && envBadges.length > 0;
}

// Export for use in testing environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateTokenTerminology,
    validateTokenDisplay,
    TEST_URLS
  };
}

// For direct execution in browser console
if (typeof window !== 'undefined') {
  window.validateTokenTerminology = validateTokenTerminology;
  window.validateTokenDisplay = validateTokenDisplay;
}

console.log('Token terminology validation module loaded');
