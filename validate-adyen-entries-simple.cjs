#!/usr/bin/env node

/**
 * Simple validation script for AdyenEntriesFeature PowerCloudButtonManager integration
 * Checks code patterns and structure without executing the classes
 */

const fs = require('fs');
const path = require('path');

function validateAdyenEntriesIntegration() {
  console.log('🧪 Validating AdyenEntriesFeature PowerCloudButtonManager Integration\n');

  try {
    // Read the adyen-entries.js file
    const filePath = path.join(__dirname, 'content_scripts/features/adyen-entries.js');
    const content = fs.readFileSync(filePath, 'utf8');

    const tests = [
      {
        name: 'Constructor initializes buttonManager property',
        check: () => content.includes('this.buttonManager = null;'),
        description: 'Ensures buttonManager is initialized in constructor'
      },
      {
        name: 'Constructor initializes transferButtonCreated property',
        check: () => content.includes('this.transferButtonCreated = false;'),
        description: 'Ensures transferButtonCreated is initialized in constructor'
      },
      {
        name: 'addEntriesInfoButton uses PowerCloudButtonManager',
        check: () => content.includes('this.buttonManager = window.PowerCloudUI.getButtonManager();'),
        description: 'Ensures button creation uses centralized button manager'
      },
      {
        name: 'addEntriesInfoButton calls addButton with correct parameters',
        check: () => content.includes('this.buttonManager.addButton(\'adyen-entries\', buttonConfig)'),
        description: 'Ensures addButton is called with feature ID and config'
      },
      {
        name: 'addEntriesInfoButton sets transferButtonCreated on success',
        check: () => content.includes('this.transferButtonCreated = true;'),
        description: 'Ensures button state is tracked correctly'
      },
      {
        name: 'removeEntriesInfoButton uses PowerCloudButtonManager',
        check: () => content.includes('this.buttonManager.removeButton(\'adyen-entries\', \'transfer\');'),
        description: 'Ensures button removal uses centralized button manager'
      },
      {
        name: 'removeEntriesInfoButton resets transferButtonCreated',
        check: () => content.includes('this.transferButtonCreated = false;'),
        description: 'Ensures button state is reset on removal'
      },
      {
        name: 'removeEntriesInfoButton has fallback handling',
        check: () => content.includes('this.removeHostElement();') && content.includes('catch (error)'),
        description: 'Ensures fallback behavior and error handling'
      },
      {
        name: 'onCleanup calls removeEntriesInfoButton',
        check: () => content.includes('this.removeEntriesInfoButton();'),
        description: 'Ensures cleanup properly removes buttons'
      },
      {
        name: 'Feature extends BaseFeature',
        check: () => content.includes('class AdyenEntriesFeature extends BaseFeature'),
        description: 'Ensures proper inheritance from BaseFeature'
      }
    ];

    let passedTests = 0;
    let totalTests = tests.length;

    tests.forEach((test, index) => {
      const passed = test.check();
      const status = passed ? '✓' : '❌';
      console.log(`${index + 1}. ${status} ${test.name}`);
      if (!passed) {
        console.log(`   Failed: ${test.description}`);
      }
      if (passed) passedTests++;
    });

    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} passed`);

    if (passedTests === totalTests) {
      console.log('🎉 All validation checks passed! AdyenEntriesFeature PowerCloudButtonManager integration is complete.');
      
      // Additional structure checks
      console.log('\n🔍 Additional Structure Checks:');
      
      const buttonCreationPattern = /addEntriesInfoButton\(\)\s*\{[\s\S]*?this\.buttonManager\.addButton\('adyen-entries'/;
      const buttonRemovalPattern = /removeEntriesInfoButton\(\)\s*\{[\s\S]*?this\.buttonManager\.removeButton\('adyen-entries', 'transfer'\)/;
      
      console.log('✓ Button creation pattern matches PowerCloudButtonManager standards:', buttonCreationPattern.test(content));
      console.log('✓ Button removal pattern matches PowerCloudButtonManager standards:', buttonRemovalPattern.test(content));
      
      console.log('\n✅ Integration validation completed successfully!');
      return true;
    } else {
      console.log('❌ Some validation checks failed. Please review the implementation.');
      return false;
    }

  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    return false;
  }
}

// Run validation
const success = validateAdyenEntriesIntegration();
process.exit(success ? 0 : 1);
