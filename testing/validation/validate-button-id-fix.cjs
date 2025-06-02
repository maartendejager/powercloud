/**
 * Simple validation script for the button ID conflict fix
 * Checks that the code change was implemented correctly
 */

const fs = require('fs');
const path = require('path');

function validateButtonIdFix() {
  console.log('🔍 Validating Button ID Conflict Fix\n');
  
  try {
    // Read the ui-components.js file
    const uiComponentsPath = path.join(__dirname, 'shared/ui-components.js');
    const content = fs.readFileSync(uiComponentsPath, 'utf8');
    
    // Check for the old problematic pattern
    const oldPattern = /const button = this\.container\.addButton\(\{\s*id: buttonId,\s*\.\.\.buttonConfig\s*\}\);/;
    const hasOldPattern = oldPattern.test(content);
    
    // Check for the new fixed pattern
    const newPattern = /const \{ id: originalId, \.\.\.configWithoutId \} = buttonConfig;\s*const button = this\.container\.addButton\(\{\s*id: buttonId,\s*\.\.\.configWithoutId\s*\}\);/;
    const hasNewPattern = newPattern.test(content);
    
    console.log('📋 Validation Results:');
    console.log(`   Old problematic pattern found: ${hasOldPattern ? '❌' : '✅'}`);
    console.log(`   New fixed pattern found: ${hasNewPattern ? '✅' : '❌'}`);
    
    if (!hasOldPattern && hasNewPattern) {
      console.log('\n✅ Button ID conflict fix is correctly implemented!');
      console.log('\nWhat was fixed:');
      console.log('- Removed spread of buttonConfig that was overwriting the namespaced button ID');
      console.log('- Now destructures to exclude the original ID from the spread');
      console.log('- This ensures buttonId (e.g., "adyen-card-card") is not overwritten by buttonConfig.id (e.g., "card")');
      
      return true;
    } else {
      console.log('\n❌ Fix not properly implemented!');
      if (hasOldPattern) {
        console.log('- Old problematic pattern still exists');
      }
      if (!hasNewPattern) {
        console.log('- New fixed pattern not found');
      }
      return false;
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    return false;
  }
}

// Additional check for the specific method in PowerCloudButtonManager
function validateImplementationDetails() {
  console.log('\n🔎 Checking Implementation Details...\n');
  
  try {
    const uiComponentsPath = path.join(__dirname, 'shared/ui-components.js');
    const content = fs.readFileSync(uiComponentsPath, 'utf8');
    
    // Check that the addButton method in PowerCloudButtonManager exists
    const addButtonMethodPattern = /addButton\(featureId, buttonConfig\)\s*\{[\s\S]*?\}/;
    const hasAddButtonMethod = addButtonMethodPattern.test(content);
    
    // Check that the method creates the proper buttonId
    const buttonIdCreationPattern = /const buttonId = `\$\{featureId\}-\$\{buttonConfig\.id \|\| 'button'\}`;/;
    const hasButtonIdCreation = buttonIdCreationPattern.test(content);
    
    console.log('📋 Implementation Details:');
    console.log(`   PowerCloudButtonManager.addButton method exists: ${hasAddButtonMethod ? '✅' : '❌'}`);
    console.log(`   Proper buttonId creation logic: ${hasButtonIdCreation ? '✅' : '❌'}`);
    
    if (hasAddButtonMethod && hasButtonIdCreation) {
      console.log('\n✅ Implementation details are correct!');
      return true;
    } else {
      console.log('\n❌ Implementation details missing!');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Implementation details check failed:', error.message);
    return false;
  }
}

// Run the validation
console.log('🧪 Button ID Conflict Fix Validation\n');

const fixValidated = validateButtonIdFix();
const implementationValidated = validateImplementationDetails();

if (fixValidated && implementationValidated) {
  console.log('\n🎉 All validations passed!');
  console.log('\n📝 Summary of the fix:');
  console.log('The issue was that when PowerCloudButtonManager.addButton() created a button,');
  console.log('it would:');
  console.log('1. Create a namespaced buttonId: "adyen-card-card"');
  console.log('2. Pass it to container.addButton({ id: buttonId, ...buttonConfig })');
  console.log('3. But buttonConfig also contained id: "card"');
  console.log('4. The spread operator would overwrite the namespaced ID with the original ID');
  console.log('5. Result: Two features could have buttons with the same ID "card"');
  console.log('');
  console.log('The fix destructures buttonConfig to exclude the original id property,');
  console.log('ensuring the namespaced button ID is preserved.');
} else {
  console.log('\n💥 Some validations failed!');
  process.exit(1);
}
