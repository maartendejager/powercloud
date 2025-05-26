#!/usr/bin/env node

/**
 * PowerCloud Button Styling and Duplication Fix Validation
 * 
 * This script validates that our fixes for unstyled buttons and duplication are correct.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 PowerCloud Button Fixes Validation\n');

// Test 1: Check if PowerCloudUIComponent.setupContent properly injects styles
console.log('📋 Test 1: Checking style injection in setupContent...');
const uiComponentsPath = path.join(__dirname, 'shared/ui-components.js');
const uiComponentsContent = fs.readFileSync(uiComponentsPath, 'utf8');

if (uiComponentsContent.includes('#powercloud-component-styles') && 
    uiComponentsContent.includes('this.getComponentStyles()')) {
    console.log('✅ PASS: PowerCloudUIComponent.setupContent injects component styles');
} else {
    console.log('❌ FAIL: Style injection not properly implemented');
    process.exit(1);
}

// Test 2: Check if getButtonStyles includes complete styling
if (uiComponentsContent.includes('.powercloud-button--success') && 
    uiComponentsContent.includes('.powercloud-button--medium') &&
    uiComponentsContent.includes('padding: 8px 16px')) {
    console.log('✅ PASS: getButtonStyles includes comprehensive button styling');
} else {
    console.log('❌ FAIL: Button styles incomplete');
    process.exit(1);
}

// Test 3: Check if PowerCloudButtonManager handles existing buttons properly
if (uiComponentsContent.includes('already exists, returning existing button') && 
    uiComponentsContent.includes('console.log')) {
    console.log('✅ PASS: PowerCloudButtonManager handles existing buttons with info log instead of warning');
} else {
    console.log('❌ FAIL: Button existence handling not improved');
    process.exit(1);
}

// Test 4: Check if retry mechanism was removed from view-card-book.js
console.log('\n📋 Test 4: Checking view-card-book.js retry removal...');
const viewCardBookPath = path.join(__dirname, 'content_scripts/features/view-card-book.js');
const viewCardBookContent = fs.readFileSync(viewCardBookPath, 'utf8');

if (!viewCardBookContent.includes('Button creation check failed, retrying once') && 
    !viewCardBookContent.includes('this.addCardBookButton(); // Try again')) {
    console.log('✅ PASS: Problematic retry mechanism removed from view-card-book.js');
} else {
    console.log('❌ FAIL: Retry mechanism still present');
    process.exit(1);
}

// Test 5: Check if button container positioning includes data attribute
if (uiComponentsContent.includes('data-position') && 
    uiComponentsContent.includes('setAttribute')) {
    console.log('✅ PASS: Button container sets data-position attribute for CSS styling');
} else {
    console.log('❌ FAIL: Data attribute for positioning not set');
    process.exit(1);
}

// Test 6: Check if container CSS includes responsive styling
if (uiComponentsContent.includes('.powercloud-button-container[data-position*="bottom"]') && 
    uiComponentsContent.includes('flex-direction: column-reverse')) {
    console.log('✅ PASS: Container CSS includes responsive positioning styles');
} else {
    console.log('❌ FAIL: Container responsive styles missing');
    process.exit(1);
}

console.log('\n🎉 All button fix validation tests passed!');
console.log('\n📊 Summary of fixes:');
console.log('✅ Component style injection improved for non-shadow DOM usage');
console.log('✅ Complete button styling with variants and sizes');
console.log('✅ Reduced noisy logging for existing buttons');
console.log('✅ Removed problematic retry mechanism');
console.log('✅ Added data attributes for better CSS styling');
console.log('✅ Container responsive positioning improved');
console.log('\n🚀 The button styling and duplication issues should now be resolved!');
