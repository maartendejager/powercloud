/**
 * Simple test script for BaseFeature class
 * This file can be run in a browser console to verify BaseFeature functionality
 */

(function testBaseFeature() {
  console.log('🧪 Testing BaseFeature class...');
  
  // Test 1: Basic instantiation
  try {
    const testFeature = new BaseFeature('testFeature', {
      enableDebugLogging: true
    });
    console.log('✅ BaseFeature instantiation successful');
    
    // Test 2: Lifecycle methods
    testFeature.onInit({ url: 'https://test.spend.cloud/page' });
    console.log('✅ onInit method works');
    
    testFeature.onActivate();
    console.log('✅ onActivate method works');
    console.log('  isActive:', testFeature.getIsActive());
    console.log('  isInitialized:', testFeature.getIsInitialized());
    
    testFeature.onDeactivate();
    console.log('✅ onDeactivate method works');
    
    testFeature.onCleanup();
    console.log('✅ onCleanup method works');
    
    // Test 3: Error handling
    testFeature.onError(new Error('Test error'), 'testing');
    console.log('✅ Error handling works');
    
    // Test 4: Feature registration
    const registration = testFeature.createFeatureRegistration();
    console.log('✅ Feature registration creation works');
    console.log('  Registration keys:', Object.keys(registration));
    
    console.log('🎉 All BaseFeature tests passed!');
    
  } catch (error) {
    console.error('❌ BaseFeature test failed:', error);
  }
})();
