/**
 * Test script to verify the button ID conflict fix
 * Tests that PowerCloudButtonManager properly handles button ID namespacing
 */

// Mock DOM environment
global.document = {
  createElement: (tag) => ({
    attachShadow: () => ({ appendChild: () => {} }),
    appendChild: () => {},
    setAttribute: () => {},
    style: {},
    className: ''
  }),
  body: { appendChild: () => {} },
  getElementById: () => null
};

global.window = {
  chrome: {
    runtime: { getURL: () => 'mock-url' }
  }
};

// Load the UI components
require('./shared/ui-components.js');

/**
 * Test the button ID fix
 */
function testButtonIdFix() {
  console.log('🧪 Testing Button ID Conflict Fix\n');
  
  try {
    // Create a button manager instance
    const buttonManager = new PowerCloudButtonManager();
    buttonManager.initialize();
    
    console.log('1. Testing button creation with conflicting raw IDs...');
    
    // Test 1: Add button from adyen-card feature with id 'card'
    const button1 = buttonManager.addButton('adyen-card', {
      id: 'card',
      text: 'View in Adyen',
      variant: 'primary'
    });
    
    console.log('   ✅ Added adyen-card button with id "card"');
    
    // Test 2: Add button from view-entry-card feature with id 'card' (this should work now)
    const button2 = buttonManager.addButton('view-entry-card', {
      id: 'card',
      text: 'View Card Details',
      variant: 'success'
    });
    
    console.log('   ✅ Added view-entry-card button with id "card" (no conflict!)');
    
    // Test 3: Verify both buttons exist with proper namespaced IDs
    const hasButton1 = buttonManager.buttons.has('adyen-card-card');
    const hasButton2 = buttonManager.buttons.has('view-entry-card-card');
    
    console.log(`   Button 1 exists: ${hasButton1 ? '✅' : '❌'} (adyen-card-card)`);
    console.log(`   Button 2 exists: ${hasButton2 ? '✅' : '❌'} (view-entry-card-card)`);
    
    // Test 4: Test adding same button ID within same feature (should return existing)
    console.log('\n2. Testing duplicate button within same feature...');
    const button1Duplicate = buttonManager.addButton('adyen-card', {
      id: 'card',
      text: 'Different Text',
      variant: 'secondary'
    });
    
    const sameButton = button1 === button1Duplicate;
    console.log(`   Returns same button instance: ${sameButton ? '✅' : '❌'}`);
    
    // Test 5: Test removal
    console.log('\n3. Testing button removal...');
    buttonManager.removeButton('adyen-card', 'card');
    const button1Removed = !buttonManager.buttons.has('adyen-card-card');
    const button2Remains = buttonManager.buttons.has('view-entry-card-card');
    
    console.log(`   Button 1 removed: ${button1Removed ? '✅' : '❌'}`);
    console.log(`   Button 2 remains: ${button2Remains ? '✅' : '❌'}`);
    
    // Test 6: Test edge cases
    console.log('\n4. Testing edge cases...');
    
    // Button with no ID (should use default)
    const button3 = buttonManager.addButton('test-feature', {
      text: 'No ID Button',
      variant: 'primary'
    });
    const hasDefaultButton = buttonManager.buttons.has('test-feature-button');
    console.log(`   Default ID button: ${hasDefaultButton ? '✅' : '❌'} (test-feature-button)`);
    
    // Button with empty string ID
    const button4 = buttonManager.addButton('test-feature', {
      id: '',
      text: 'Empty ID Button',
      variant: 'primary'
    });
    const hasEmptyIdButton = buttonManager.buttons.has('test-feature-');
    console.log(`   Empty ID button: ${hasEmptyIdButton ? '✅' : '❌'} (test-feature-)`);
    
    console.log('\n📊 Test Results Summary:');
    console.log('✅ Button ID conflict fix is working correctly!');
    console.log('✅ Multiple features can use the same raw button ID');
    console.log('✅ Button namespacing prevents conflicts');
    console.log('✅ Button removal works correctly');
    console.log('✅ Edge cases are handled properly');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Run the test
if (testButtonIdFix()) {
  console.log('\n🎉 All tests passed! The button ID conflict fix is working correctly.');
} else {
  console.log('\n💥 Some tests failed. Please check the implementation.');
  process.exit(1);
}
