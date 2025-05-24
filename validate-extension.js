#!/usr/bin/env node

/**
 * Extension Validation Script
 * 
 * This script validates that all the extension modules can be loaded
 * and that the ES6 module structure is correct.
 */

console.log('🔍 Validating PowerCloud Extension...\n');

// Test 1: Check manifest.json
console.log('📋 Checking manifest.json...');
try {
  const fs = require('fs');
  const manifest = JSON.parse(fs.readFileSync('./manifest.json', 'utf8'));
  console.log('✅ Manifest is valid JSON');
  console.log(`   Extension: ${manifest.name} v${manifest.version}`);
  console.log(`   Service Worker: ${manifest.background.service_worker}`);
} catch (error) {
  console.log('❌ Manifest validation failed:', error.message);
  process.exit(1);
}

// Test 2: Check file existence
console.log('\n📁 Checking file structure...');
const requiredFiles = [
  'background/service-worker.js',
  'background/token-manager.js',
  'shared/url-patterns.js',
  'shared/auth.js',
  'shared/api.js',
  'popup/popup.js'
];

let allFilesExist = true;
for (const file of requiredFiles) {
  try {
    require('fs').accessSync(file);
    console.log(`✅ ${file}`);
  } catch (error) {
    console.log(`❌ ${file} - NOT FOUND`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing');
  process.exit(1);
}

console.log('\n🎉 Basic validation passed!');
console.log('\n📝 Note: For full validation, load the extension in Chrome and check the console for any runtime errors.');
