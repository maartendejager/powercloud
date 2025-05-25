/**
 * Book Processor Debug Test
 * This test specifically checks the book processor's two-step process
 */

console.log('🔍 Book Processor Debug Test Starting...');

// Mock chrome runtime for testing
if (typeof chrome === 'undefined') {
  global.chrome = {
    runtime: {
      sendMessage: async (message) => {
        console.log('📤 Chrome message would be sent:', JSON.stringify(message, null, 2));
        
        // Simulate the actual message handler response
        return new Promise((resolve) => {
          setTimeout(() => {
            // Mock response structure - this should trigger the two-step process
            resolve({
              success: true,
              bookType: 'monetary_account_book',
              balanceAccountId: 'test-internal-ba-id', // This should trigger second step
              adyenBalanceAccountId: null, // This should be null to trigger the fetch
              administrationId: 'test-admin-id',
              balanceAccountReference: 'test-ref',
              data: {
                attributes: {
                  bookType: 'monetary_account_book',
                  administrationId: 'test-admin-id'
                },
                relationships: {
                  balanceAccount: {
                    data: {
                      id: 'test-internal-ba-id'
                    }
                  }
                }
              }
            });
          }, 100);
        });
      }
    }
  };
}

// Test function to simulate feature behavior
async function testBookProcessorFlow() {
  console.log('\n📋 Test 1: Book processor two-step flow simulation');
  
  try {
    // Simulate the message that would be sent by adyen-book feature
    const message = {
      action: "fetchBookDetails",
      customer: "test-customer", 
      bookId: "test-book-id"
    };
    
    console.log('📤 Sending message:', message);
    const response = await chrome.runtime.sendMessage(message);
    console.log('📥 Received response:', JSON.stringify(response, null, 2));
    
    // Check if the response structure matches what we expect
    if (response.success) {
      console.log('✅ Success response received');
      console.log(`📊 Balance Account ID (internal): ${response.balanceAccountId}`);
      console.log(`📊 Adyen Balance Account ID: ${response.adyenBalanceAccountId}`);
      
      if (response.balanceAccountId && !response.adyenBalanceAccountId) {
        console.log('⚠️  This scenario should trigger a second API call for balance account details');
        console.log('🔄 Two-step process should have been executed');
      } else if (response.adyenBalanceAccountId) {
        console.log('✅ Adyen balance account ID found directly');
      } else {
        console.log('❌ No balance account information available');
      }
    } else {
      console.log('❌ Failed response:', response.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Test function to check async behavior
async function testAsyncBehavior() {
  console.log('\n📋 Test 2: Async behavior verification');
  
  // Create a test that shows what happens with async/await vs .then()
  console.log('🔄 Testing async function behavior...');
  
  const asyncFunction = async () => {
    console.log('  🔹 Async function started');
    await new Promise(resolve => setTimeout(resolve, 50));
    console.log('  🔹 Async function completed');
    return 'async-result';
  };
  
  // Test 1: Proper async/await
  console.log('  📝 Test A: Proper async/await');
  const result1 = await asyncFunction();
  console.log('  📤 Result A:', result1);
  
  // Test 2: Function without await (simulating the potential issue)
  console.log('  📝 Test B: Function called without await');
  const result2 = asyncFunction(); // Missing await
  console.log('  📤 Result B (should be Promise):', typeof result2, result2.constructor.name);
  
  console.log('✅ Async behavior test completed');
}

// Run the tests
async function runAllTests() {
  console.log('🚀 Starting Book Processor Debug Tests\n');
  
  await testAsyncBehavior();
  await testBookProcessorFlow();
  
  console.log('\n🏁 All tests completed');
  console.log('\n💡 If balance account requests are not being made in the real extension:');
  console.log('   1. Check browser console for the two-step process logs');
  console.log('   2. Verify that balanceAccountId is found but adyenBalanceAccountId is null');
  console.log('   3. Look for any errors in the second API call');
  console.log('   4. Ensure the async function is being properly awaited');
}

// Execute tests
runAllTests().catch(console.error);
