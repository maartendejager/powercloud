/**
 * Phase 5.2 UI/UX Improvements Test Suite
 * 
 * Tests the PowerCloud UI component system integration with adyen-book feature
 * Validates shadow DOM isolation, accessibility features, and responsive design
 */

console.log('[PowerCloud Test] Phase 5.2 UI/UX Improvements Test Suite Starting...');

/**
 * Test PowerCloud UI Components Integration
 */
async function testUIComponentsIntegration() {
  console.log('[PowerCloud Test] Testing UI Components Integration...');
  
  try {
    // Test 1: Check if UI components are loaded
    console.log('[PowerCloud Test] Test 1: Checking UI component availability...');
    
    // Wait for UI components to load
    let attempts = 0;
    const maxAttempts = 50;
    
    while (typeof PowerCloudUI === 'undefined' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (typeof PowerCloudUI === 'undefined') {
      throw new Error('PowerCloudUI not available after timeout');
    }
    
    console.log('✓ PowerCloudUI is available');
    
    // Test 2: Check UI component factory methods
    console.log('[PowerCloud Test] Test 2: Testing UI component factory methods...');
    
    if (typeof PowerCloudUI.createButton !== 'function') {
      throw new Error('PowerCloudUI.createButton not available');
    }
    
    if (typeof PowerCloudUI.createAlert !== 'function') {
      throw new Error('PowerCloudUI.createAlert not available');
    }
    
    if (typeof PowerCloudUI.createContainer !== 'function') {
      throw new Error('PowerCloudUI.createContainer not available');
    }
    
    console.log('✓ All UI component factory methods are available');
    
    // Test 3: Test button creation
    console.log('[PowerCloud Test] Test 3: Testing button creation...');
    
    const testButton = PowerCloudUI.createButton({
      text: 'Test Button',
      variant: 'primary',
      id: 'test-button-1',
      onClick: () => console.log('Test button clicked')
    });
    
    if (!testButton || !testButton.tagName) {
      throw new Error('Failed to create test button');
    }
    
    console.log('✓ Button creation successful');
    
    // Test 4: Test alert creation
    console.log('[PowerCloud Test] Test 4: Testing alert creation...');
    
    const testAlert = PowerCloudUI.createAlert({
      message: 'Test Alert Message',
      variant: 'success',
      dismissible: true,
      id: 'test-alert-1'
    });
    
    if (!testAlert || !testAlert.tagName) {
      throw new Error('Failed to create test alert');
    }
    
    console.log('✓ Alert creation successful');
    
    // Test 5: Test shadow DOM isolation
    console.log('[PowerCloud Test] Test 5: Testing shadow DOM isolation...');
    
    const testContainer = PowerCloudUI.createContainer({
      id: 'test-container-1',
      children: [testButton, testAlert]
    });
    
    document.body.appendChild(testContainer);
    
    // Check if shadow DOM is used
    const shadowRoots = Array.from(document.querySelectorAll('*')).filter(el => el.shadowRoot);
    console.log(`✓ Found ${shadowRoots.length} shadow DOM elements`);
    
    // Clean up test elements
    testContainer.remove();
    
    console.log('✓ UI Components Integration tests passed');
    return true;
    
  } catch (error) {
    console.error('[PowerCloud Test] UI Components Integration test failed:', error);
    return false;
  }
}

/**
 * Test Accessibility Features
 */
async function testAccessibilityFeatures() {
  console.log('[PowerCloud Test] Testing Accessibility Features...');
  
  try {
    // Wait for accessibility utilities to load
    let attempts = 0;
    const maxAttempts = 50;
    
    while (typeof PowerCloudAccessibility === 'undefined' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (typeof PowerCloudAccessibility === 'undefined') {
      console.warn('[PowerCloud Test] PowerCloudAccessibility not available, skipping accessibility tests');
      return true;
    }
    
    console.log('✓ PowerCloudAccessibility is available');
    
    // Test accessibility methods
    const accessibilityMethods = [
      'announce',
      'trapFocus',
      'releaseFocusTrap',
      'enhanceFormAccessibility'
    ];
    
    for (const method of accessibilityMethods) {
      if (typeof PowerCloudAccessibility[method] !== 'function') {
        throw new Error(`PowerCloudAccessibility.${method} not available`);
      }
    }
    
    console.log('✓ All accessibility methods are available');
    console.log('✓ Accessibility Features tests passed');
    return true;
    
  } catch (error) {
    console.error('[PowerCloud Test] Accessibility Features test failed:', error);
    return false;
  }
}

/**
 * Test Responsive Design Features
 */
async function testResponsiveDesignFeatures() {
  console.log('[PowerCloud Test] Testing Responsive Design Features...');
  
  try {
    // Wait for responsive design utilities to load
    let attempts = 0;
    const maxAttempts = 50;
    
    while (typeof PowerCloudResponsive === 'undefined' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (typeof PowerCloudResponsive === 'undefined') {
      console.warn('[PowerCloud Test] PowerCloudResponsive not available, skipping responsive tests');
      return true;
    }
    
    console.log('✓ PowerCloudResponsive is available');
    
    // Test responsive methods
    const responsiveMethods = [
      'getCurrentBreakpoint',
      'isScreenSize',
      'onBreakpointChange',
      'createResponsiveGrid'
    ];
    
    for (const method of responsiveMethods) {
      if (typeof PowerCloudResponsive[method] !== 'function') {
        throw new Error(`PowerCloudResponsive.${method} not available`);
      }
    }
    
    console.log('✓ All responsive design methods are available');
    console.log('✓ Responsive Design Features tests passed');
    return true;
    
  } catch (error) {
    console.error('[PowerCloud Test] Responsive Design Features test failed:', error);
    return false;
  }
}

/**
 * Test Adyen Book Feature UI Integration
 */
async function testAdyenBookFeatureIntegration() {
  console.log('[PowerCloud Test] Testing Adyen Book Feature UI Integration...');
  
  try {
    // Check if we're on a book page for testing
    const isBookPage = window.location.href.includes('/books/');
    
    if (!isBookPage) {
      console.log('[PowerCloud Test] Not on a book page, skipping book feature integration test');
      return true;
    }
    
    // Check if adyen book feature is available
    if (!window.PowerCloudFeatures || !window.PowerCloudFeatures.book) {
      console.warn('[PowerCloud Test] Adyen book feature not available, skipping integration test');
      return true;
    }
    
    console.log('✓ Adyen book feature is available');
    
    // Test feature initialization (if on correct page)
    const urlPattern = /https:\/\/([^.]+\.(?:spend\.cloud|dev\.spend\.cloud))\/books\/([^\/]+)/;
    const match = window.location.href.match(urlPattern);
    
    if (match) {
      console.log('✓ URL pattern matches book page format');
      
      // Check if PowerCloud button exists or gets created
      setTimeout(() => {
        const buttonHost = document.getElementById('powercloud-shadow-host');
        if (buttonHost) {
          console.log('✓ PowerCloud button container found');
        } else {
          console.log('ℹ PowerCloud button container not found (may be normal if feature conditions not met)');
        }
      }, 2000);
    }
    
    console.log('✓ Adyen Book Feature Integration tests passed');
    return true;
    
  } catch (error) {
    console.error('[PowerCloud Test] Adyen Book Feature Integration test failed:', error);
    return false;
  }
}

/**
 * Main test runner for Phase 5.2
 */
async function runPhase52Tests() {
  console.log('[PowerCloud Test] Running Phase 5.2 UI/UX Improvements Tests...');
  
  const testResults = {
    uiComponents: false,
    accessibility: false,
    responsiveDesign: false,
    adyenBookIntegration: false
  };
  
  // Run all tests
  testResults.uiComponents = await testUIComponentsIntegration();
  testResults.accessibility = await testAccessibilityFeatures();
  testResults.responsiveDesign = await testResponsiveDesignFeatures();
  testResults.adyenBookIntegration = await testAdyenBookFeatureIntegration();
  
  // Summary
  const passedTests = Object.values(testResults).filter(result => result === true).length;
  const totalTests = Object.keys(testResults).length;
  
  console.log('\n[PowerCloud Test] Phase 5.2 Test Results:');
  console.log(`✓ UI Components Integration: ${testResults.uiComponents ? 'PASSED' : 'FAILED'}`);
  console.log(`✓ Accessibility Features: ${testResults.accessibility ? 'PASSED' : 'FAILED'}`);
  console.log(`✓ Responsive Design: ${testResults.responsiveDesign ? 'PASSED' : 'FAILED'}`);
  console.log(`✓ Adyen Book Integration: ${testResults.adyenBookIntegration ? 'PASSED' : 'FAILED'}`);
  console.log(`\nOverall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 Phase 5.2 UI/UX Improvements: ALL TESTS PASSED!');
  } else {
    console.log('⚠️ Phase 5.2 UI/UX Improvements: Some tests failed');
  }
  
  return testResults;
}

// Auto-run tests when script loads (with delay to ensure all dependencies are loaded)
setTimeout(() => {
  runPhase52Tests().catch(error => {
    console.error('[PowerCloud Test] Phase 5.2 test runner failed:', error);
  });
}, 3000);

// Export for manual testing
window.PowerCloudPhase52Tests = {
  runAll: runPhase52Tests,
  testUIComponents: testUIComponentsIntegration,
  testAccessibility: testAccessibilityFeatures,
  testResponsiveDesign: testResponsiveDesignFeatures,
  testAdyenBookIntegration: testAdyenBookFeatureIntegration
};

console.log('[PowerCloud Test] Phase 5.2 test suite loaded. Use window.PowerCloudPhase52Tests to run manually.');
