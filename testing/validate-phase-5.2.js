#!/usr/bin/env node

/**
 * Phase 5.2 UI/UX Improvements Test Runner
 * 
 * Run this script to validate the Phase 5.2 implementation
 * Usage: node testing/validate-phase-5.2.js
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 PowerCloud Extension - Phase 5.2 UI/UX Improvements Validation\n');

/**
 * Check if file exists and log result
 */
function checkFile(filePath, description) {
  const fullPath = path.join(__dirname, '..', filePath);
  const exists = fs.existsSync(fullPath);
  console.log(`${exists ? '✓' : '✗'} ${description}: ${filePath}`);
  return exists;
}

/**
 * Check file content for specific patterns
 */
function checkFileContent(filePath, patterns, description) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`✗ ${description}: File not found - ${filePath}`);
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const results = patterns.map(pattern => {
    const found = pattern.test ? pattern.test(content) : content.includes(pattern);
    return { pattern: pattern.toString(), found };
  });
  
  const allFound = results.every(r => r.found);
  console.log(`${allFound ? '✓' : '✗'} ${description}`);
  
  if (!allFound) {
    results.forEach(r => {
      if (!r.found) {
        console.log(`  - Missing: ${r.pattern}`);
      }
    });
  }
  
  return allFound;
}

/**
 * Main validation function
 */
function validatePhase52() {
  console.log('📋 Checking Phase 5.2 Implementation Files...\n');
  
  let allChecks = [];
  
  // Check core UI component files exist
  console.log('1. Core UI Component System:');
  allChecks.push(checkFile('shared/ui-components.js', 'PowerCloud UI Components Library'));
  allChecks.push(checkFile('shared/accessibility-utils.js', 'Accessibility Utilities'));
  allChecks.push(checkFile('shared/responsive-design.js', 'Responsive Design System'));
  
  // Check UI component content
  console.log('\n2. UI Component Implementation:');
  allChecks.push(checkFileContent(
    'shared/ui-components.js',
    [
      'class PowerCloudUIComponent',
      'class PowerCloudButton',
      'class PowerCloudAlert',
      'class PowerCloudBadge',
      'PowerCloudUIStyles',
      'PowerCloudUI'
    ],
    'UI Components - Core classes and factory'
  ));
  
  // Check accessibility implementation
  console.log('\n3. Accessibility Implementation:');
  allChecks.push(checkFileContent(
    'shared/accessibility-utils.js',
    [
      'class PowerCloudAccessibility',
      'announce',
      'trapFocus',
      'enhanceFormAccessibility',
      'createSkipLink'
    ],
    'Accessibility - Core functionality'
  ));
  
  // Check responsive design implementation
  console.log('\n4. Responsive Design Implementation:');
  allChecks.push(checkFileContent(
    'shared/responsive-design.js',
    [
      'class PowerCloudResponsive',
      'getCurrentBreakpoint',
      'onBreakpointChange',
      'createResponsiveGrid',
      'setupContainerQuery'
    ],
    'Responsive Design - Core functionality'
  ));
  
  // Check adyen-book feature integration
  console.log('\n5. Adyen Book Feature Integration:');
  allChecks.push(checkFileContent(
    'content_scripts/features/adyen-book.js',
    [
      'PowerCloudUI.createButton',
      'PowerCloudUI.createAlert',
      'waitForPowerCloudUI',
      /showBookInfoResult\([^,]+,\s*['"](?:success|error|warning|info)['"]/,
      'loadPowerCloudUI'
    ],
    'Adyen Book - PowerCloud UI integration'
  ));
  
  // Check manifest updates
  console.log('\n6. Manifest Configuration:');
  allChecks.push(checkFileContent(
    'manifest.json',
    [
      'shared/ui-components.js',
      'shared/accessibility-utils.js',
      'shared/responsive-design.js'
    ],
    'Manifest - UI component files included'
  ));
  
  // Check test file
  console.log('\n7. Test Implementation:');
  allChecks.push(checkFile('testing/phase-5.2-ui-test.js', 'Phase 5.2 Test Suite'));
  
  // Summary
  const passedChecks = allChecks.filter(check => check).length;
  const totalChecks = allChecks.length;
  
  console.log('\n📊 Validation Summary:');
  console.log(`✓ Passed: ${passedChecks}/${totalChecks} checks`);
  
  if (passedChecks === totalChecks) {
    console.log('\n🎉 Phase 5.2 UI/UX Improvements: VALIDATION PASSED!');
    console.log('\n📝 Next Steps:');
    console.log('1. Load the extension in Chrome for testing');
    console.log('2. Navigate to a book page (e.g., *.spend.cloud/books/*)');
    console.log('3. Check browser console for Phase 5.2 test results');
    console.log('4. Verify UI components are working with shadow DOM isolation');
    console.log('5. Test accessibility features and responsive behavior');
  } else {
    console.log('\n⚠️ Phase 5.2 UI/UX Improvements: VALIDATION FAILED');
    console.log('Please review the failed checks above and fix the issues.');
  }
  
  return passedChecks === totalChecks;
}

// Additional file analysis
function analyzeImplementation() {
  console.log('\n🔍 Implementation Analysis:\n');
  
  // Count lines of code in new files
  const newFiles = [
    'shared/ui-components.js',
    'shared/accessibility-utils.js',
    'shared/responsive-design.js'
  ];
  
  let totalLines = 0;
  newFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, '..', filePath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n').length;
      console.log(`📄 ${filePath}: ${lines} lines`);
      totalLines += lines;
    }
  });
  
  console.log(`📊 Total new code: ${totalLines} lines`);
  
  // Check component types implemented
  console.log('\n🧩 UI Components Implemented:');
  const uiFile = path.join(__dirname, '..', 'shared/ui-components.js');
  if (fs.existsSync(uiFile)) {
    const content = fs.readFileSync(uiFile, 'utf8');
    const components = ['PowerCloudButton', 'PowerCloudAlert', 'PowerCloudBadge'];
    components.forEach(component => {
      const hasComponent = content.includes(`class ${component}`);
      console.log(`${hasComponent ? '✓' : '✗'} ${component}`);
    });
  }
}

// Run validation
if (require.main === module) {
  const success = validatePhase52();
  analyzeImplementation();
  process.exit(success ? 0 : 1);
}

module.exports = { validatePhase52, analyzeImplementation };
