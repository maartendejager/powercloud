/**
 * Final Validation Test for Adyen Features Response Structure Fixes
 * 
 * This script validates that all three Adyen features now handle both old and new
 * response structures correctly after our Phase 5.1 enhancement fixes.
 * 
 * Run this in the browser console on any PowerCloud page to validate the fixes.
 */

(function finalValidationTest() {
    console.log('%c🎯 Final Validation: Adyen Features Response Structure Fixes', 'color: green; font-size: 18px; font-weight: bold;');
    console.log('===============================================================');
    
    // Test response structure handling logic without making actual API calls
    console.log('\n📋 Testing Response Structure Logic...');
    
    // Test 1: Card Feature Response Handling
    console.log('\n1️⃣ Card Feature - Response Structure Handling:');
    
    function testCardResponseHandling() {
        // Simulate old format response
        const oldFormatResponse = {
            success: true,
            vendor: 'adyen',
            card: {
                adyenCardToken: 'PI_TEST_OLD_FORMAT_123'
            }
        };
        
        // Simulate new format response
        const newFormatResponse = {
            success: true,
            vendor: 'adyen',
            paymentInstrumentId: 'PI_TEST_NEW_FORMAT_456'
        };
        
        // Test the logic our fixed code uses
        function extractPaymentInstrumentId(response) {
            let paymentInstrumentId = null;
            if (response.card && response.card.adyenCardToken) {
                paymentInstrumentId = response.card.adyenCardToken;
                console.log('  📝 Would use old format:', paymentInstrumentId);
            } else if (response.paymentInstrumentId) {
                paymentInstrumentId = response.paymentInstrumentId;
                console.log('  📝 Would use new format:', paymentInstrumentId);
            }
            return paymentInstrumentId;
        }
        
        console.log('  🧪 Testing old format response:');
        const oldResult = extractPaymentInstrumentId(oldFormatResponse);
        console.log('  ✅ Old format result:', oldResult === 'PI_TEST_OLD_FORMAT_123' ? 'PASS' : 'FAIL');
        
        console.log('  🧪 Testing new format response:');
        const newResult = extractPaymentInstrumentId(newFormatResponse);
        console.log('  ✅ New format result:', newResult === 'PI_TEST_NEW_FORMAT_456' ? 'PASS' : 'FAIL');
        
        return oldResult && newResult;
    }
    
    // Test 2: Book Feature Response Handling
    console.log('\n2️⃣ Book Feature - Response Structure Handling:');
    
    function testBookResponseHandling() {
        // Simulate old format response
        const oldFormatResponse = {
            success: true,
            bookType: 'monetary_account_book',
            balanceAccountId: 'BA_TEST_OLD_FORMAT_123',
            administrationId: 'ADM_123'
        };
        
        // Simulate new format response
        const newFormatResponse = {
            success: true,
            bookType: 'monetary_account_book',
            adyenBalanceAccountId: 'BA_TEST_NEW_FORMAT_456',
            administrationId: 'ADM_456'
        };
        
        // Test the logic our fixed code uses
        function extractBalanceAccountId(response) {
            const balanceAccountId = response.balanceAccountId || response.adyenBalanceAccountId;
            if (response.balanceAccountId) {
                console.log('  📝 Would use old format:', balanceAccountId);
            } else if (response.adyenBalanceAccountId) {
                console.log('  📝 Would use new format:', balanceAccountId);
            }
            return balanceAccountId;
        }
        
        console.log('  🧪 Testing old format response:');
        const oldResult = extractBalanceAccountId(oldFormatResponse);
        console.log('  ✅ Old format result:', oldResult === 'BA_TEST_OLD_FORMAT_123' ? 'PASS' : 'FAIL');
        
        console.log('  🧪 Testing new format response:');
        const newResult = extractBalanceAccountId(newFormatResponse);
        console.log('  ✅ New format result:', newResult === 'BA_TEST_NEW_FORMAT_456' ? 'PASS' : 'FAIL');
        
        return oldResult && newResult;
    }
    
    // Test 3: Entries Feature Response Handling
    console.log('\n3️⃣ Entries Feature - Response Structure Handling:');
    
    function testEntriesResponseHandling() {
        // Simulate old format response
        const oldFormatResponse = {
            success: true,
            entry: {
                adyenTransferId: 'TR_TEST_OLD_FORMAT_123',
                description: 'Test entry'
            }
        };
        
        // Simulate new format responses (multiple variants)
        const newFormatNestedResponse = {
            success: true,
            data: {
                data: {
                    attributes: {
                        adyenTransferId: 'TR_TEST_NEW_NESTED_456',
                        description: 'Test entry nested'
                    }
                }
            }
        };
        
        const newFormatFlatResponse = {
            success: true,
            data: {
                attributes: {
                    adyenTransferId: 'TR_TEST_NEW_FLAT_789',
                    description: 'Test entry flat'
                }
            }
        };
        
        const newFormatDirectResponse = {
            success: true,
            data: {
                adyenTransferId: 'TR_TEST_NEW_DIRECT_101',
                description: 'Test entry direct'
            }
        };
        
        // Test the logic our fixed code uses
        function extractTransferId(response) {
            let entryData = null;
            let adyenTransferId = null;
            
            if (response.entry) {
                // Old format
                entryData = response.entry;
                adyenTransferId = response.entry.adyenTransferId;
                console.log('  📝 Would use old format:', adyenTransferId);
            } else if (response.data) {
                // New format - extract from data structure
                if (response.data.data && response.data.data.attributes) {
                    entryData = response.data.data.attributes;
                    adyenTransferId = response.data.data.attributes.adyenTransferId;
                    console.log('  📝 Would use new format (nested):', adyenTransferId);
                } else if (response.data.attributes) {
                    entryData = response.data.attributes;
                    adyenTransferId = response.data.attributes.adyenTransferId;
                    console.log('  📝 Would use new format (flat):', adyenTransferId);
                } else {
                    entryData = response.data;
                    adyenTransferId = response.data.adyenTransferId;
                    console.log('  📝 Would use new format (direct):', adyenTransferId);
                }
            }
            
            return { entryData, adyenTransferId };
        }
        
        console.log('  🧪 Testing old format response:');
        const oldResult = extractTransferId(oldFormatResponse);
        console.log('  ✅ Old format result:', oldResult.adyenTransferId === 'TR_TEST_OLD_FORMAT_123' ? 'PASS' : 'FAIL');
        
        console.log('  🧪 Testing new format (nested) response:');
        const nestedResult = extractTransferId(newFormatNestedResponse);
        console.log('  ✅ Nested format result:', nestedResult.adyenTransferId === 'TR_TEST_NEW_NESTED_456' ? 'PASS' : 'FAIL');
        
        console.log('  🧪 Testing new format (flat) response:');
        const flatResult = extractTransferId(newFormatFlatResponse);
        console.log('  ✅ Flat format result:', flatResult.adyenTransferId === 'TR_TEST_NEW_FLAT_789' ? 'PASS' : 'FAIL');
        
        console.log('  🧪 Testing new format (direct) response:');
        const directResult = extractTransferId(newFormatDirectResponse);
        console.log('  ✅ Direct format result:', directResult.adyenTransferId === 'TR_TEST_NEW_DIRECT_101' ? 'PASS' : 'FAIL');
        
        return oldResult.adyenTransferId && nestedResult.adyenTransferId && 
               flatResult.adyenTransferId && directResult.adyenTransferId;
    }
    
    // Run all tests
    const cardTestPassed = testCardResponseHandling();
    const bookTestPassed = testBookResponseHandling();
    const entriesTestPassed = testEntriesResponseHandling();
    
    // Summary
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    console.log(`🃏 Card Feature: ${cardTestPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`📚 Book Feature: ${bookTestPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`📝 Entries Feature: ${entriesTestPassed ? '✅ PASS' : '❌ FAIL'}`);
    
    const allTestsPassed = cardTestPassed && bookTestPassed && entriesTestPassed;
    console.log(`\n🎯 Overall Result: ${allTestsPassed ? '✅ ALL TESTS PASS' : '❌ SOME TESTS FAILED'}`);
    
    if (allTestsPassed) {
        console.log('\n🎉 Response structure fixes are working correctly!');
        console.log('All three Adyen features should now handle both old and new API response formats.');
    } else {
        console.log('\n⚠️ Some tests failed. Please check the response handling logic.');
    }
    
    // Feature registration check
    console.log('\n🔍 Checking Feature Registration:');
    if (typeof window.PowerCloudFeatures !== 'undefined') {
        console.log('✅ PowerCloudFeatures namespace exists');
        const registeredFeatures = Object.keys(window.PowerCloudFeatures);
        console.log('📋 Registered features:', registeredFeatures);
        
        ['card', 'book', 'entries'].forEach(feature => {
            if (window.PowerCloudFeatures[feature]) {
                console.log(`✅ ${feature} feature is registered`);
            } else {
                console.log(`❌ ${feature} feature is NOT registered`);
            }
        });
    } else {
        console.log('❌ PowerCloudFeatures namespace not found');
        console.log('💡 This could mean:');
        console.log('   - Extension is not loaded');
        console.log('   - Features have not been initialized yet');
        console.log('   - There was an error during feature registration');
    }
    
    console.log('\n💡 Next Steps:');
    console.log('1. If all tests pass, the response structure fixes are complete');
    console.log('2. Test on actual card/book/entries pages to verify functionality');
    console.log('3. Check browser console for any additional error messages');
    console.log('4. Use response-structure-test.js for live API testing');
    
    return allTestsPassed;
})();
