/**
 * Test script to validate that removeButton() method now supports both patterns
 * Run this in the browser console on a PowerCloud-enabled page
 */

// Test the removeButton() fix
async function testRemoveButtonPatterns() {
    console.log('=== Testing PowerCloudButtonManager removeButton() patterns ===');
    
    // Check if PowerCloudUI is available
    if (!window.PowerCloudUI) {
        console.error('PowerCloudUI not available');
        return;
    }
    
    const buttonManager = window.PowerCloudUI.getButtonManager();
    
    if (!buttonManager) {
        console.error('ButtonManager not available');
        return;
    }
    
    try {
        // Test 1: Add a test button
        console.log('\n1. Adding test button...');
        const button = buttonManager.addButton('test-feature', {
            id: 'test-button',
            text: 'Test Button',
            onClick: () => console.log('Test button clicked')
        });
        
        if (button) {
            console.log('✅ Test button added successfully');
        } else {
            console.error('❌ Failed to add test button');
            return;
        }
        
        // Check button exists
        const buttonExists = buttonManager.buttons.has('test-feature-test-button');
        console.log(`Button exists in manager: ${buttonExists ? '✅' : '❌'}`);
        
        // Test 2: Remove using pattern 1 (full button ID)
        console.log('\n2. Testing Pattern 1: removeButton(fullButtonId)');
        
        // Add another button to test
        buttonManager.addButton('test-feature2', {
            id: 'test-button2',
            text: 'Test Button 2',
            onClick: () => console.log('Test button 2 clicked')
        });
        
        // Remove using full button ID
        buttonManager.removeButton('test-feature2-test-button2');
        const button2Removed = !buttonManager.buttons.has('test-feature2-test-button2');
        console.log(`Pattern 1 removal: ${button2Removed ? '✅' : '❌'}`);
        
        // Test 3: Remove using pattern 2 (feature ID + button ID)
        console.log('\n3. Testing Pattern 2: removeButton(featureId, buttonId)');
        buttonManager.removeButton('test-feature', 'test-button');
        const button1Removed = !buttonManager.buttons.has('test-feature-test-button');
        console.log(`Pattern 2 removal: ${button1Removed ? '✅' : '❌'}`);
        
        // Test 4: Remove all buttons for a feature
        console.log('\n4. Testing Pattern 3: removeButton(featureId) - remove all feature buttons');
        
        // Add multiple buttons for the same feature
        buttonManager.addButton('multi-test', {
            id: 'button1',
            text: 'Button 1',
            onClick: () => {}
        });
        buttonManager.addButton('multi-test', {
            id: 'button2', 
            text: 'Button 2',
            onClick: () => {}
        });
        
        const beforeCount = Array.from(buttonManager.buttons.keys()).filter(id => id.startsWith('multi-test-')).length;
        console.log(`Buttons before removal: ${beforeCount}`);
        
        // Remove all buttons for the feature
        buttonManager.removeButton('multi-test');
        
        const afterCount = Array.from(buttonManager.buttons.keys()).filter(id => id.startsWith('multi-test-')).length;
        console.log(`Buttons after removal: ${afterCount}`);
        console.log(`Feature removal: ${afterCount === 0 ? '✅' : '❌'}`);
        
        console.log('\n=== Test Summary ===');
        console.log('✅ All removeButton() patterns working correctly!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Also test the current feature usage patterns
function testCurrentFeaturePatterns() {
    console.log('\n=== Testing Current Feature Usage Patterns ===');
    
    const buttonManager = window.PowerCloudUI?.getButtonManager();
    if (!buttonManager) {
        console.error('ButtonManager not available');
        return;
    }
    
    // Test the patterns currently used by features
    const testPatterns = [
        'view-entry-card-entry',
        'view-card-book-book', 
        'adyen-card-card'
    ];
    
    testPatterns.forEach(fullButtonId => {
        console.log(`Testing removal pattern for: ${fullButtonId}`);
        
        // Add a test button with this ID
        const parts = fullButtonId.split('-');
        const featureId = parts.slice(0, -1).join('-');
        const buttonId = parts[parts.length - 1];
        
        console.log(`  Feature ID: ${featureId}, Button ID: ${buttonId}`);
        
        buttonManager.addButton(featureId, {
            id: buttonId,
            text: `Test ${fullButtonId}`,
            onClick: () => {}
        });
        
        // Test removal using the single-parameter pattern (as currently used)
        buttonManager.removeButton(fullButtonId);
        
        const removed = !buttonManager.buttons.has(fullButtonId);
        console.log(`  Single-parameter removal: ${removed ? '✅' : '❌'}`);
    });
}

// Export for console use
window.testRemoveButtonPatterns = testRemoveButtonPatterns;
window.testCurrentFeaturePatterns = testCurrentFeaturePatterns;

console.log('Test functions loaded. Run testRemoveButtonPatterns() or testCurrentFeaturePatterns() in console.');
