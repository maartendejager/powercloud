/**
 * Test script to verify PowerCloudButtonManager singleton functionality
 */

// Simulate the browser environment
global.window = {};
global.document = {
  createElement: () => ({ appendChild: () => {} }),
  body: { appendChild: () => {} },
  querySelector: () => null
};

// Load the ui-components.js file
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uiComponentsPath = path.join(__dirname, 'shared', 'ui-components.js');
const uiComponentsCode = fs.readFileSync(uiComponentsPath, 'utf8');

// Execute the code in our simulated environment
eval(uiComponentsCode);

// Test 1: Verify singleton behavior
console.log('🧪 Testing PowerCloudButtonManager singleton behavior...');

try {
  // First instance
  const manager1 = new PowerCloudButtonManager();
  console.log('✅ Created first PowerCloudButtonManager instance');
  
  // Second instance should return the same instance
  const manager2 = new PowerCloudButtonManager();
  console.log('✅ Created second PowerCloudButtonManager instance');
  
  // Test if they are the same instance
  if (manager1 === manager2) {
    console.log('✅ PASS: Both instances are the same (singleton working)');
  } else {
    console.log('❌ FAIL: Instances are different (singleton not working)');
    process.exit(1);
  }
  
  // Test 2: Verify PowerCloudUI.getButtonManager() returns the same instance
  console.log('\n🧪 Testing PowerCloudUI.getButtonManager() singleton access...');
  
  const manager3 = PowerCloudUI.getButtonManager();
  console.log('✅ Retrieved manager via PowerCloudUI.getButtonManager()');
  
  if (manager1 === manager3) {
    console.log('✅ PASS: PowerCloudUI.getButtonManager() returns the same singleton instance');
  } else {
    console.log('❌ FAIL: PowerCloudUI.getButtonManager() returns different instance');
    process.exit(1);
  }
  
  // Test 3: Verify global instance storage
  console.log('\n🧪 Testing global instance storage...');
  
  if (window.PowerCloudButtonManagerInstance === manager1) {
    console.log('✅ PASS: Global instance is correctly stored and matches singleton');
  } else {
    console.log('❌ FAIL: Global instance mismatch');
    process.exit(1);
  }
  
  console.log('\n🎉 All PowerCloudButtonManager singleton tests passed!');
  console.log('✅ Multiple new PowerCloudButtonManager() calls return same instance');
  console.log('✅ PowerCloudUI.getButtonManager() returns the singleton instance');
  console.log('✅ Global instance storage is working correctly');
  
} catch (error) {
  console.error('❌ Test failed with error:', error.message);
  process.exit(1);
}
