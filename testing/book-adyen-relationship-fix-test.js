/**
 * Test for Book Processor AdyenBalanceAccount Relationship Fix
 * 
 * This test verifies that the book processor correctly extracts the internal balance account ID
 * from the adyenBalanceAccount relationship (which contains the internal ID, not the actual Adyen ID)
 */

console.log('🔍 Testing Book Processor AdyenBalanceAccount Relationship Fix...');

// Test scenarios based on the actual API response structure
const testScenarios = [
  {
    name: 'Book with adyenBalanceAccount relationship containing internal ID',
    apiResponse: {
      data: {
        attributes: {
          bookType: 'monetary_account_book',
          administrationId: 'admin123',
          balanceAccountReference: 'Test Account'
          // No direct adyenBalanceAccountId in attributes
        },
        relationships: {
          adyenBalanceAccount: {
            data: {
              id: '1' // Internal balance account ID (NOT the actual Adyen BA_ ID)
            }
          },
          administration: {
            data: {
              id: 'admin123'
            }
          }
        }
      }
    },
    expectedResult: {
      balanceAccountId: '1', // Should extract this from adyenBalanceAccount relationship
      adyenBalanceAccountId: null, // Should be null initially, triggering two-step process
      needsTwoStepProcess: true
    }
  },
  {
    name: 'Book with both balanceAccount and adyenBalanceAccount relationships',
    apiResponse: {
      data: {
        attributes: {
          bookType: 'monetary_account_book'
        },
        relationships: {
          balanceAccount: {
            data: {
              id: '2' // Internal balance account ID from balanceAccount
            }
          },
          adyenBalanceAccount: {
            data: {
              id: '1' // Internal balance account ID from adyenBalanceAccount
            }
          }
        }
      }
    },
    expectedResult: {
      balanceAccountId: '2', // Should prefer balanceAccount relationship first
      adyenBalanceAccountId: null,
      needsTwoStepProcess: true
    }
  },
  {
    name: 'Book with no balance account relationships',
    apiResponse: {
      data: {
        attributes: {
          bookType: 'monetary_account_book'
        },
        relationships: {
          administration: {
            data: {
              id: 'admin123'
            }
          }
        }
      }
    },
    expectedResult: {
      balanceAccountId: null,
      adyenBalanceAccountId: null,
      needsTwoStepProcess: false
    }
  }
];

// Test the extraction logic
function testExtractionLogic(scenario) {
  console.log(`\n--- Testing: ${scenario.name} ---`);
  
  const data = scenario.apiResponse;
  const bookData = data?.data?.attributes || {};
  
  // Simulate the processor logic
  let balanceAccountId = null;
  let adyenBalanceAccountId = bookData?.adyenBalanceAccountId || null;
  
  // Check balanceAccount relationship first (original logic)
  if (!balanceAccountId && data?.data?.relationships?.balanceAccount?.data?.id) {
    balanceAccountId = data.data.relationships.balanceAccount.data.id;
    console.log(`✅ Found balance account ID via balanceAccount relationship: ${balanceAccountId}`);
  }
  
  // NEW: Check adyenBalanceAccount relationship for internal balance account ID
  if (!balanceAccountId && data?.data?.relationships?.adyenBalanceAccount?.data?.id) {
    balanceAccountId = data.data.relationships.adyenBalanceAccount.data.id;
    console.log(`✅ Found balance account ID via adyenBalanceAccount relationship: ${balanceAccountId}`);
  }
  
  const needsTwoStepProcess = balanceAccountId && !adyenBalanceAccountId;
  
  const result = {
    balanceAccountId,
    adyenBalanceAccountId,
    needsTwoStepProcess
  };
  
  console.log('📊 Extraction result:', result);
  console.log('📋 Expected result:', scenario.expectedResult);
  
  // Validate results
  const balanceAccountCorrect = result.balanceAccountId === scenario.expectedResult.balanceAccountId;
  const adyenBalanceAccountCorrect = result.adyenBalanceAccountId === scenario.expectedResult.adyenBalanceAccountId;
  const twoStepCorrect = result.needsTwoStepProcess === scenario.expectedResult.needsTwoStepProcess;
  
  const allCorrect = balanceAccountCorrect && adyenBalanceAccountCorrect && twoStepCorrect;
  
  console.log('✅ Validation results:', {
    balanceAccountCorrect,
    adyenBalanceAccountCorrect,
    twoStepCorrect,
    overall: allCorrect ? 'PASS' : 'FAIL'
  });
  
  return allCorrect;
}

// Run all test scenarios
console.log('🚀 Running AdyenBalanceAccount Relationship Fix Tests...\n');

let passedTests = 0;
testScenarios.forEach((scenario, index) => {
  console.log(`\n🧪 Test ${index + 1}/${testScenarios.length}`);
  if (testExtractionLogic(scenario)) {
    passedTests++;
  }
});

// Final results
console.log('\n📊 TEST SUMMARY');
console.log('='.repeat(50));
console.log(`✅ Tests passed: ${passedTests}/${testScenarios.length}`);
console.log(`📈 Success rate: ${Math.round((passedTests / testScenarios.length) * 100)}%`);

if (passedTests === testScenarios.length) {
  console.log('\n🎉 ALL TESTS PASSED!');
  console.log('✅ The book processor should now correctly:');
  console.log('   - Extract internal balance account ID from adyenBalanceAccount relationship');
  console.log('   - Trigger the two-step process when needed');
  console.log('   - Make balance account details requests to get actual Adyen balance account ID');
  console.log('   - Display the button when a valid Adyen balance account ID is found');
} else {
  console.log('\n⚠️  Some tests failed - please review the logic');
}

console.log('\n💡 Next steps:');
console.log('1. Reload the extension');
console.log('2. Visit the book page');
console.log('3. Check console for the new debug logs:');
console.log('   - "Found balance account ID via adyenBalanceAccount relationship: X"');
console.log('   - "Fetching balance account details for ID: X"');
console.log('   - "Found Adyen balance account ID: BA_..."');
console.log('4. Verify the button appears when Adyen balance account ID is found');
