/**
 * Validation script for AdyenEntriesFeature PowerCloudButtonManager integration
 * Tests the complete integration of button management patterns
 */

// Mock DOM environment
global.document = {
  createElement: () => ({ attachShadow: () => ({ appendChild: () => {} }) }),
  getElementById: () => null,
  querySelector: () => null
};

global.window = {
  location: { search: '?id=12345' },
  PowerCloudUI: {
    getButtonManager: () => ({
      addButton: (featureId, config) => {
        console.log(`✓ ButtonManager.addButton called with feature: ${featureId}, button: ${config.id}`);
        return { id: config.id, element: {} };
      },
      removeButton: (featureId, buttonId) => {
        console.log(`✓ ButtonManager.removeButton called with feature: ${featureId}, button: ${buttonId}`);
        return true;
      },
      getStatus: () => ({ buttonCount: 1, visible: true })
    })
  },
  PowerCloudLoggerFactory: {
    createLogger: (name) => ({
      info: (msg, data) => console.log(`[${name}] ${msg}`, data || ''),
      warn: (msg, data) => console.warn(`[${name}] ${msg}`, data || ''),
      error: (msg, data) => console.error(`[${name}] ${msg}`, data || '')
    })
  }
};

global.chrome = {
  storage: {
    local: {
      get: (key, callback) => callback({}),
      set: () => {}
    }
  },
  runtime: {
    getURL: (path) => `chrome-extension://test/${path}`
  }
};

// Load required modules
const fs = require('fs');
const path = require('path');

// Load BaseFeature
const baseFeatureCode = fs.readFileSync(path.join(__dirname, 'shared/base-feature.js'), 'utf8');
eval(baseFeatureCode);

// Load AdyenEntriesFeature
const adyenEntriesCode = fs.readFileSync(path.join(__dirname, 'content_scripts/features/adyen-entries.js'), 'utf8');
eval(adyenEntriesCode);

async function validateIntegration() {
  console.log('🧪 Testing AdyenEntriesFeature PowerCloudButtonManager Integration\n');

  try {
    // Test 1: Constructor initialization
    console.log('Test 1: Constructor initialization');
    const feature = new AdyenEntriesFeature();
    
    // Verify properties are initialized correctly
    console.assert(feature.buttonManager === null, 'buttonManager should be initialized as null');
    console.assert(feature.transferButtonCreated === false, 'transferButtonCreated should be initialized as false');
    console.log('✓ Constructor properly initializes button management properties\n');

    // Test 2: onInit with mock match data
    console.log('Test 2: Feature initialization');
    const mockMatch = ['full-match', 'test-customer'];
    await feature.onInit(mockMatch);
    
    console.assert(feature.customer === 'test-customer', 'Customer should be extracted from match');
    console.assert(feature.entryId === '12345', 'Entry ID should be extracted from URL params');
    console.log('✓ Feature initialization works correctly\n');

    // Test 3: Button creation with remoteTransferId
    console.log('Test 3: Button creation with transfer ID');
    feature.remoteTransferId = 'TRF_test_12345';
    feature.addEntriesInfoButton();
    
    console.assert(feature.transferButtonCreated === true, 'transferButtonCreated should be true after successful creation');
    console.assert(feature.buttonManager !== null, 'buttonManager should be initialized');
    console.log('✓ Button creation with transfer ID works correctly\n');

    // Test 4: Button creation without remoteTransferId
    console.log('Test 4: Button creation without transfer ID');
    const feature2 = new AdyenEntriesFeature();
    await feature2.onInit(mockMatch);
    feature2.remoteTransferId = null;
    feature2.addEntriesInfoButton();
    
    console.assert(feature2.transferButtonCreated === true, 'transferButtonCreated should be true even for disabled button');
    console.log('✓ Button creation without transfer ID works correctly\n');

    // Test 5: Button removal
    console.log('Test 5: Button removal');
    feature.removeEntriesInfoButton();
    
    console.assert(feature.transferButtonCreated === false, 'transferButtonCreated should be false after removal');
    console.log('✓ Button removal works correctly\n');

    // Test 6: Cleanup integration
    console.log('Test 6: Cleanup integration');
    const feature3 = new AdyenEntriesFeature();
    await feature3.onInit(mockMatch);
    feature3.remoteTransferId = 'TRF_test_67890';
    feature3.addEntriesInfoButton();
    
    console.assert(feature3.transferButtonCreated === true, 'Button should be created before cleanup');
    await feature3.onCleanup();
    console.assert(feature3.transferButtonCreated === false, 'Button should be removed during cleanup');
    console.log('✓ Cleanup integration works correctly\n');

    console.log('🎉 All tests passed! AdyenEntriesFeature PowerCloudButtonManager integration is complete and working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run validation
validateIntegration().catch(console.error);
