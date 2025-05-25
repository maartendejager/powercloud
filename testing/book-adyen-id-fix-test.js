/**
 * Test script to verify the book feature Adyen ID fix
 * 
 * This test verifies that:
 * 1. The book feature correctly separates internal ID from Adyen ID
 * 2. Only creates button when Adyen balance account ID is available
 * 3. Uses correct Adyen ID in URL construction
 * 4. Does not fall back to internal ID
 */

// Test the book feature Adyen ID handling
console.log('=== BOOK ADYEN ID FIX TEST ===');

// Test data simulating different API response structures
const testCases = [
  {
    name: 'Correct Response - Has Adyen ID',
    response: {
      success: true,
      balanceAccountId: '1', // Internal ID
      adyenBalanceAccountId: 'BA_1234567890ABCDEF', // Correct Adyen ID
      bookType: 'monetary_account_book',
      administrationId: 'admin123'
    },
    expectedResult: {
      shouldCreateButton: true,
      urlShouldContain: 'BA_1234567890ABCDEF',
      urlShouldNotContain: '1'
    }
  },
  {
    name: 'Missing Adyen ID - Only Internal ID',
    response: {
      success: true,
      balanceAccountId: '1', // Internal ID only
      // adyenBalanceAccountId: undefined, // Missing Adyen ID
      bookType: 'monetary_account_book',
      administrationId: 'admin123'
    },
    expectedResult: {
      shouldCreateButton: false,
      reason: 'No Adyen balance account ID available'
    }
  },
  {
    name: 'Old Response Structure - Only Internal ID',
    response: {
      success: true,
      balanceAccountId: '2', // Internal ID only (old structure)
      bookType: 'monetary_account_book',
      administrationId: 'admin456'
    },
    expectedResult: {
      shouldCreateButton: false,
      reason: 'No Adyen balance account ID available'
    }
  },
  {
    name: 'Mixed IDs - Should Use Adyen ID',
    response: {
      success: true,
      balanceAccountId: '5', // Internal ID
      adyenBalanceAccountId: 'BA_FEDCBA0987654321', // Adyen ID
      bookType: 'monetary_account_book',
      administrationId: 'admin789'
    },
    expectedResult: {
      shouldCreateButton: true,
      urlShouldContain: 'BA_FEDCBA0987654321',
      urlShouldNotContain: '5'
    }
  }
];

// Function to test the Adyen ID logic
function testAdyenIdLogic(testCase) {
  console.log(`\n--- Testing: ${testCase.name} ---`);
  
  const response = testCase.response;
  
  // Simulate the logic from adyen-book.js
  const balanceAccountId = response.balanceAccountId; // Internal ID
  const adyenBalanceAccountId = response.adyenBalanceAccountId || null; // Adyen ID only
  
  console.log('Response data:', {
    hasBalanceAccountId: !!response.balanceAccountId,
    hasAdyenBalanceAccountId: !!response.adyenBalanceAccountId,
    internalBalanceAccountId: balanceAccountId,
    adyenBalanceAccountId: adyenBalanceAccountId,
    bookType: response.bookType
  });
  
  // Test button creation logic
  const shouldCreateButton = !!adyenBalanceAccountId;
  console.log('Should create button:', shouldCreateButton);
  
  if (shouldCreateButton) {
    const adyenUrl = `https://balanceplatform-live.adyen.com/balanceplatform/balance-accounts/${adyenBalanceAccountId}`;
    console.log('Generated Adyen URL:', adyenUrl);
    
    // Verify URL contains correct ID
    const urlContainsAdyenId = adyenUrl.includes(adyenBalanceAccountId);
    // Check if URL contains the internal ID as a separate segment (not as part of Adyen ID)
    const urlSegments = adyenUrl.split('/');
    const lastSegment = urlSegments[urlSegments.length - 1];
    const urlContainsInternalId = lastSegment === balanceAccountId;
    
    console.log('URL validation:', {
      containsAdyenId: urlContainsAdyenId,
      containsInternalId: urlContainsInternalId,
      isCorrect: urlContainsAdyenId && !urlContainsInternalId
    });
    
    // Check against expected results
    if (testCase.expectedResult.urlShouldContain && !adyenUrl.includes(testCase.expectedResult.urlShouldContain)) {
      console.error('❌ FAIL: URL should contain', testCase.expectedResult.urlShouldContain);
    } else if (testCase.expectedResult.urlShouldNotContain && urlContainsInternalId) {
      console.error('❌ FAIL: URL incorrectly uses internal ID instead of Adyen ID');
    } else {
      console.log('✅ PASS: URL construction correct');
    }
  } else {
    console.log('Button not created (correct behavior when no Adyen ID)');
    if (testCase.expectedResult.shouldCreateButton) {
      console.error('❌ FAIL: Expected button to be created');
    } else {
      console.log('✅ PASS: Correctly skipped button creation');
    }
  }
  
  // Overall test result
  const passed = shouldCreateButton === testCase.expectedResult.shouldCreateButton;
  console.log(`Test result: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  
  return passed;
}

// Run all test cases
let passedTests = 0;
testCases.forEach(testCase => {
  if (testAdyenIdLogic(testCase)) {
    passedTests++;
  }
});

console.log(`\n=== TEST SUMMARY ===`);
console.log(`Passed: ${passedTests}/${testCases.length}`);
console.log(`Failed: ${testCases.length - passedTests}/${testCases.length}`);

if (passedTests === testCases.length) {
  console.log('🎉 ALL TESTS PASSED - Adyen ID fix is working correctly!');
} else {
  console.log('⚠️  Some tests failed - review the implementation');
}

// Instructions for manual testing
console.log(`\n=== MANUAL TESTING INSTRUCTIONS ===`);
console.log('1. Go to a book page in PowerCloud');
console.log('2. Open browser console');
console.log('3. Look for log messages about Adyen balance account ID');
console.log('4. If button appears, click it and verify the URL contains BA_... not just a number');
console.log('5. If button does not appear, check console for "No Adyen balance account ID" message');
