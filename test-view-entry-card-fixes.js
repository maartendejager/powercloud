#!/usr/bin/env node

/**
 * Test View Entry Card Fixes
 * 
 * This script validates that the ViewEntryCard feature has been properly updated to:
 * 1. Use PowerCloudButtonManager instead of manual shadow DOM creation
 * 2. Use the correct URL format for card navigation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 View Entry Card Fixes Validation\n');

// Test 1: Verify PowerCloudButtonManager usage
console.log('📋 Test 1: Checking PowerCloudButtonManager integration...');
const viewEntryCardPath = path.join(__dirname, 'content_scripts/features/view-entry-card.js');
const viewEntryCardContent = fs.readFileSync(viewEntryCardPath, 'utf8');

if (viewEntryCardContent.includes('window.PowerCloudUI.getButtonManager()')) {
    console.log('✅ PASS: view-entry-card.js uses PowerCloudUI.getButtonManager()');
} else {
    console.log('❌ FAIL: view-entry-card.js does not use PowerCloudUI.getButtonManager()');
    process.exit(1);
}

if (viewEntryCardContent.includes('this.buttonManager.addButton(\'view-entry-card\'')) {
    console.log('✅ PASS: view-entry-card.js uses buttonManager.addButton() with correct feature ID');
} else {
    console.log('❌ FAIL: view-entry-card.js does not use buttonManager.addButton() correctly');
    process.exit(1);
}

if (viewEntryCardContent.includes('this.buttonManager.removeButton(\'view-entry-card\', \'card\')')) {
    console.log('✅ PASS: view-entry-card.js uses buttonManager.removeButton() correctly');
} else {
    console.log('❌ FAIL: view-entry-card.js does not use buttonManager.removeButton() correctly');
    process.exit(1);
}

// Test 2: Verify correct URL format
console.log('\n📋 Test 2: Checking URL format...');
if (viewEntryCardContent.includes('/proactive/data.card/single_card_update?id=')) {
    console.log('✅ PASS: view-entry-card.js uses correct URL format for card navigation');
} else {
    console.log('❌ FAIL: view-entry-card.js does not use correct URL format');
    process.exit(1);
}

// Test 3: Verify fallback method exists
console.log('\n📋 Test 3: Checking fallback button creation...');
if (viewEntryCardContent.includes('createFallbackButton()')) {
    console.log('✅ PASS: view-entry-card.js has fallback button creation method');
} else {
    console.log('❌ FAIL: view-entry-card.js missing fallback button creation');
    process.exit(1);
}

// Test 4: Check that shadow DOM is used appropriately
console.log('\n📋 Test 4: Checking shadow DOM usage...');
const shadowDomMatches = viewEntryCardContent.match(/attachShadow/g);
if (shadowDomMatches && shadowDomMatches.length === 2) {
    console.log('✅ PASS: Shadow DOM used appropriately (fallback button + result feedback)');
} else if (!shadowDomMatches) {
    console.log('❌ FAIL: No shadow DOM usage found (fallback method should still have it)');
    process.exit(1);
} else {
    console.log(`❌ FAIL: Unexpected shadow DOM usage count: ${shadowDomMatches.length} (expected 2)`);
    process.exit(1);
}

// Test 5: Verify button configuration
console.log('\n📋 Test 5: Checking button configuration...');
if (viewEntryCardContent.includes('variant: \'primary\'') && 
    viewEntryCardContent.includes('variant: \'secondary\'')) {
    console.log('✅ PASS: view-entry-card.js uses correct button variants');
} else {
    console.log('❌ FAIL: view-entry-card.js missing proper button variants');
    process.exit(1);
}

console.log('\n🎉 All tests passed! View Entry Card fixes are properly implemented.');
console.log('\n📄 Summary of Changes:');
console.log('  • ✅ Button creation now uses PowerCloudButtonManager');
console.log('  • ✅ Button removal uses PowerCloudButtonManager.removeButton()');
console.log('  • ✅ URL format updated to /proactive/data.card/single_card_update?id=');
console.log('  • ✅ Fallback method preserved for compatibility');
console.log('  • ✅ Proper button variants and accessibility features maintained');
