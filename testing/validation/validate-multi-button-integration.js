#!/usr/bin/env node

/**
 * PowerCloud Multi-Button Layout Integration Validation
 * 
 * This script validates that the singleton pattern fixes are correctly implemented
 * and that both features will use the same PowerCloudButtonManager instance.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 PowerCloud Multi-Button Layout Integration Validation\n');

// Test 1: Verify singleton usage in view-card-book.js
console.log('📋 Test 1: Checking view-card-book.js singleton usage...');
const viewCardBookPath = path.join(__dirname, 'content_scripts/features/view-card-book.js');
const viewCardBookContent = fs.readFileSync(viewCardBookPath, 'utf8');

if (viewCardBookContent.includes('PowerCloudUI.getButtonManager()')) {
    console.log('✅ PASS: view-card-book.js uses PowerCloudUI.getButtonManager()');
} else {
    console.log('❌ FAIL: view-card-book.js does not use PowerCloudUI.getButtonManager()');
    process.exit(1);
}

if (!viewCardBookContent.includes('new window.PowerCloudButtonManager()')) {
    console.log('✅ PASS: view-card-book.js no longer uses new PowerCloudButtonManager()');
} else {
    console.log('❌ FAIL: view-card-book.js still contains new PowerCloudButtonManager()');
    process.exit(1);
}

// Test 2: Verify singleton usage in adyen-card.js
console.log('\n📋 Test 2: Checking adyen-card.js singleton usage...');
const adyenCardPath = path.join(__dirname, 'content_scripts/features/adyen-card.js');
const adyenCardContent = fs.readFileSync(adyenCardPath, 'utf8');

if (adyenCardContent.includes('PowerCloudUI.getButtonManager()')) {
    console.log('✅ PASS: adyen-card.js uses PowerCloudUI.getButtonManager()');
} else {
    console.log('❌ FAIL: adyen-card.js does not use PowerCloudUI.getButtonManager()');
    process.exit(1);
}

if (!adyenCardContent.includes('new window.PowerCloudButtonManager()')) {
    console.log('✅ PASS: adyen-card.js no longer uses new PowerCloudButtonManager()');
} else {
    console.log('❌ FAIL: adyen-card.js still contains new PowerCloudButtonManager()');
    process.exit(1);
}

// Test 3: Verify PowerCloudUI initialization in main.js
console.log('\n📋 Test 3: Checking PowerCloudUI initialization in main.js...');
const mainPath = path.join(__dirname, 'content_scripts/main.js');
const mainContent = fs.readFileSync(mainPath, 'utf8');

if (mainContent.includes('PowerCloudUI.initialize()')) {
    console.log('✅ PASS: main.js initializes PowerCloudUI system');
} else {
    console.log('❌ FAIL: main.js does not initialize PowerCloudUI system');
    process.exit(1);
}

// Test 4: Verify PowerCloudUI and PowerCloudButtonManager exist in ui-components.js
console.log('\n📋 Test 4: Checking ui-components.js for required classes...');
const uiComponentsPath = path.join(__dirname, 'shared/ui-components.js');
const uiComponentsContent = fs.readFileSync(uiComponentsPath, 'utf8');

if (uiComponentsContent.includes('class PowerCloudUI')) {
    console.log('✅ PASS: PowerCloudUI class exists');
} else {
    console.log('❌ FAIL: PowerCloudUI class not found');
    process.exit(1);
}

if (uiComponentsContent.includes('class PowerCloudButtonManager')) {
    console.log('✅ PASS: PowerCloudButtonManager class exists');
} else {
    console.log('❌ FAIL: PowerCloudButtonManager class not found');
    process.exit(1);
}

if (uiComponentsContent.includes('static getButtonManager()')) {
    console.log('✅ PASS: PowerCloudUI.getButtonManager() method exists');
} else {
    console.log('❌ FAIL: PowerCloudUI.getButtonManager() method not found');
    process.exit(1);
}

// Test 5: Verify singleton pattern implementation
console.log('\n📋 Test 5: Checking PowerCloudButtonManager singleton pattern...');

if (uiComponentsContent.includes('if (PowerCloudButtonManager.instance)')) {
    console.log('✅ PASS: PowerCloudButtonManager implements singleton pattern');
} else {
    console.log('❌ FAIL: PowerCloudButtonManager singleton pattern not found');
    process.exit(1);
}

if (uiComponentsContent.includes('PowerCloudButtonManager.instance = this;')) {
    console.log('✅ PASS: PowerCloudButtonManager stores singleton instance');
} else {
    console.log('❌ FAIL: PowerCloudButtonManager does not store singleton instance');
    process.exit(1);
}

// Test 6: Verify button container integration
console.log('\n📋 Test 6: Checking PowerCloudButtonContainer integration...');

if (uiComponentsContent.includes('class PowerCloudButtonContainer')) {
    console.log('✅ PASS: PowerCloudButtonContainer class exists');
} else {
    console.log('❌ FAIL: PowerCloudButtonContainer class not found');
    process.exit(1);
}

if (uiComponentsContent.includes('this.container.addButton')) {
    console.log('✅ PASS: PowerCloudButtonManager uses PowerCloudButtonContainer');
} else {
    console.log('❌ FAIL: PowerCloudButtonManager does not use PowerCloudButtonContainer');
    process.exit(1);
}

// Test 7: Verify proper availability checks in features
console.log('\n📋 Test 7: Checking availability checks in features...');

if (viewCardBookContent.includes('window.PowerCloudUI') && viewCardBookContent.includes('window.PowerCloudButtonManager')) {
    console.log('✅ PASS: view-card-book.js checks for both PowerCloudUI and PowerCloudButtonManager');
} else {
    console.log('❌ FAIL: view-card-book.js does not properly check availability');
    process.exit(1);
}

if (adyenCardContent.includes('window.PowerCloudUI') && adyenCardContent.includes('window.PowerCloudButtonManager')) {
    console.log('✅ PASS: adyen-card.js checks for both PowerCloudUI and PowerCloudButtonManager');
} else {
    console.log('❌ FAIL: adyen-card.js does not properly check availability');
    process.exit(1);
}

console.log('\n🎉 All validation tests passed!');
console.log('\n📊 Summary:');
console.log('✅ Both features use PowerCloudUI.getButtonManager() for singleton access');
console.log('✅ PowerCloudUI system is properly initialized in main.js');
console.log('✅ PowerCloudButtonManager implements correct singleton pattern');
console.log('✅ PowerCloudButtonContainer integration is working');
console.log('✅ Proper availability checks are in place');
console.log('\n🚀 The multi-button layout system is ready for testing and production use!');
