/**
 * Test script to verify url-patterns module works in different contexts
 */

console.log('🧪 Testing url-patterns module...');

// Test 1: Check if traditional script loading works (content script context)
try {
  // Simulate content script context by checking window exports
  const hasWindowExports = typeof window !== 'undefined' && 
    typeof window.isApiRoute === 'function' &&
    typeof window.DOMAIN_PATTERN !== 'undefined';
  
  console.log('✅ Content script context support:', hasWindowExports);
  
  if (hasWindowExports) {
    console.log('📋 Available on window:', Object.keys(window).filter(k => 
      k.includes('DOMAIN_PATTERN') || 
      k.includes('isApiRoute') || 
      k.includes('URL_PATTERN')
    ));
  }
} catch (e) {
  console.error('❌ Content script context test failed:', e.message);
}

// Test 2: Check if globalThis export works (module context)
try {
  const hasGlobalExports = typeof globalThis !== 'undefined' && 
    globalThis.urlPatternsModule &&
    typeof globalThis.urlPatternsModule.isApiRoute === 'function';
  
  console.log('✅ ES6 module context support:', hasGlobalExports);
  
  if (hasGlobalExports) {
    console.log('📋 Available in globalThis.urlPatternsModule:', 
      Object.keys(globalThis.urlPatternsModule).slice(0, 5), '...');
  }
} catch (e) {
  console.error('❌ ES6 module context test failed:', e.message);
}

// Test 3: Test basic functionality
try {
  const testUrl = 'https://customer.spend.cloud/api/test';
  let isApi = false;
  
  if (typeof window !== 'undefined' && window.isApiRoute) {
    isApi = window.isApiRoute(testUrl);
  } else if (globalThis.urlPatternsModule?.isApiRoute) {
    isApi = globalThis.urlPatternsModule.isApiRoute(testUrl);
  }
  
  console.log('✅ Function test:', testUrl, '→', isApi ? 'API route' : 'not API route');
} catch (e) {
  console.error('❌ Function test failed:', e.message);
}

console.log('🎯 Test complete!');
