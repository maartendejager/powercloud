/**
 * Response Structure Test for Adyen Features
 * 
 * This script helps debug the response structures from the API
 * to ensure our fixes handle both old and new formats correctly.
 * 
 * Copy and paste this into the browser console while on:
 * - A card page (to test card responses)
 * - A book page (to test book responses) 
 * - An entries page (to test entry responses)
 */

(function responseStructureTest() {
    console.log('%c🔍 Response Structure Test', 'color: purple; font-size: 16px; font-weight: bold;');
    console.log('==============================');
    
    // Get current URL info
    const url = window.location.href;
    console.log('Current URL:', url);
    
    // Determine what type of page we're on
    let pageType = 'unknown';
    let customer = null;
    let id = null;
    
    // Card page pattern
    const cardMatch = url.match(/^https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/cards\/([^\/]+)/);
    if (cardMatch) {
        pageType = 'card';
        customer = cardMatch[1];
        id = cardMatch[2];
    }
    
    // Book page pattern
    const bookMatch = url.match(/^https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/books\/([^\/]+)/);
    if (bookMatch) {
        pageType = 'book';
        customer = bookMatch[1];
        id = bookMatch[2];
    }
    
    // Entries page pattern  
    const entriesMatch = url.match(/^https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/kasboek\.boekingen\/show\?id=([^&]+)/);
    if (entriesMatch) {
        pageType = 'entries';
        customer = entriesMatch[1];
        id = entriesMatch[2];
    }
    
    console.log(`📄 Page Type: ${pageType}`);
    console.log(`🏢 Customer: ${customer}`);
    console.log(`🆔 ID: ${id}`);
    
    if (pageType === 'unknown') {
        console.log('❌ This page type is not supported for testing');
        return;
    }
    
    // Test API calls based on page type
    console.log(`\n🧪 Testing ${pageType} API...`);
    
    function testAPI(action, params) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: action,
                ...params
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
    }
    
    async function runTests() {
        try {
            let response = null;
            
            switch (pageType) {
                case 'card':
                    console.log('🃏 Testing card API...');
                    response = await testAPI('fetchCardDetails', {
                        customer: customer,
                        cardId: id
                    });
                    
                    console.log('📊 Card API Response:', response);
                    
                    if (response && response.success) {
                        console.log('✅ Card API successful');
                        console.log('🔍 Response structure analysis:');
                        console.log('  - Has card.adyenCardToken:', !!(response.card && response.card.adyenCardToken));
                        console.log('  - Has paymentInstrumentId:', !!response.paymentInstrumentId);
                        console.log('  - Vendor:', response.vendor);
                        
                        // Test the actual logic our fixed code uses
                        let paymentInstrumentId = null;
                        if (response.card && response.card.adyenCardToken) {
                            paymentInstrumentId = response.card.adyenCardToken;
                            console.log('📝 Would use old format:', paymentInstrumentId);
                        } else if (response.paymentInstrumentId) {
                            paymentInstrumentId = response.paymentInstrumentId;
                            console.log('📝 Would use new format:', paymentInstrumentId);
                        }
                        
                        if (paymentInstrumentId) {
                            console.log('✅ Card feature should work - has payment instrument ID');
                        } else {
                            console.log('❌ Card feature will fail - no payment instrument ID found');
                        }
                    } else {
                        console.log('❌ Card API failed:', response);
                    }
                    break;
                    
                case 'book':
                    console.log('📚 Testing book API...');
                    response = await testAPI('fetchBookDetails', {
                        customer: customer,
                        bookId: id
                    });
                    
                    console.log('📊 Book API Response:', response);
                    
                    if (response && response.success) {
                        console.log('✅ Book API successful');
                        console.log('🔍 Response structure analysis:');
                        console.log('  - Has balanceAccountId:', !!response.balanceAccountId);
                        console.log('  - Has adyenBalanceAccountId:', !!response.adyenBalanceAccountId);
                        console.log('  - Book type:', response.bookType);
                        
                        // Test the actual logic our fixed code uses
                        const balanceAccountId = response.balanceAccountId || response.adyenBalanceAccountId;
                        console.log('📝 Final balance account ID:', balanceAccountId);
                        
                        if (balanceAccountId) {
                            console.log('✅ Book feature should work - has balance account ID');
                        } else {
                            console.log('❌ Book feature will fail - no balance account ID found');
                        }
                    } else {
                        console.log('❌ Book API failed:', response);
                    }
                    break;
                    
                case 'entries':
                    console.log('📝 Testing entries API...');
                    response = await testAPI('fetchEntryDetails', {
                        customer: customer,
                        entryId: id
                    });
                    
                    console.log('📊 Entries API Response:', response);
                    
                    if (response && response.success) {
                        console.log('✅ Entries API successful');
                        console.log('🔍 Response structure analysis:');
                        console.log('  - Has entry.adyenTransferId:', !!(response.entry && response.entry.adyenTransferId));
                        console.log('  - Has data.data.attributes.adyenTransferId:', !!(response.data && response.data.data && response.data.data.attributes && response.data.data.attributes.adyenTransferId));
                        console.log('  - Has data.attributes.adyenTransferId:', !!(response.data && response.data.attributes && response.data.attributes.adyenTransferId));
                        console.log('  - Has data.adyenTransferId:', !!(response.data && response.data.adyenTransferId));
                        
                        // Test the actual logic our fixed code uses
                        let adyenTransferId = null;
                        if (response.entry) {
                            adyenTransferId = response.entry.adyenTransferId;
                            console.log('📝 Would use old format:', adyenTransferId);
                        } else if (response.data) {
                            if (response.data.data && response.data.data.attributes) {
                                adyenTransferId = response.data.data.attributes.adyenTransferId;
                                console.log('📝 Would use new format (nested):', adyenTransferId);
                            } else if (response.data.attributes) {
                                adyenTransferId = response.data.attributes.adyenTransferId;
                                console.log('📝 Would use new format (flat):', adyenTransferId);
                            } else {
                                adyenTransferId = response.data.adyenTransferId;
                                console.log('📝 Would use new format (direct):', adyenTransferId);
                            }
                        }
                        
                        if (adyenTransferId) {
                            console.log('✅ Entries feature should work - has transfer ID');
                        } else {
                            console.log('❌ Entries feature will fail - no transfer ID found');
                        }
                    } else {
                        console.log('❌ Entries API failed:', response);
                    }
                    break;
            }
            
        } catch (error) {
            console.error('❌ Test failed:', error);
        }
    }
    
    runTests();
})();

console.log('\n💡 Instructions:');
console.log('1. Navigate to a card, book, or entries page');
console.log('2. Copy and paste this script into the console');
console.log('3. Check the output to see if the response structures are handled correctly');
console.log('4. Look for "✅ Feature should work" or "❌ Feature will fail" messages');
