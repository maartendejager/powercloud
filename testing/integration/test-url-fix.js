#!/usr/bin/env node

/**
 * Test script to verify the URL pattern fix
 */

// Test patterns (simulating the fixed patterns)
const BOOK_PATTERN = /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/kasboek\.boekingen\/(\d+)(\/.*|$)/;
const BOOK_ENTRY_PATTERN = /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/kasboek\.boekingen\/show\?id=([^&]+)/;

// Test URLs
const testUrls = [
    // This should match BOOK_ENTRY_PATTERN but NOT BOOK_PATTERN
    'https://proactive.dev.spend.cloud/proactive/kasboek.boekingen/show?id=7816',
    
    // This should match BOOK_PATTERN
    'https://proactive.dev.spend.cloud/proactive/kasboek.boekingen/123',
    'https://proactive.dev.spend.cloud/proactive/kasboek.boekingen/456/',
    'https://proactive.dev.spend.cloud/proactive/kasboek.boekingen/789/edit',
    
    // This should NOT match BOOK_PATTERN (non-numeric ID)
    'https://proactive.dev.spend.cloud/proactive/kasboek.boekingen/show',
    'https://proactive.dev.spend.cloud/proactive/kasboek.boekingen/edit?id=123'
];

console.log('🧪 Testing URL Pattern Fix\n');
console.log('='.repeat(60));

testUrls.forEach(url => {
    console.log(`\n📍 Testing: ${url}`);
    
    const bookMatch = url.match(BOOK_PATTERN);
    const entryMatch = url.match(BOOK_ENTRY_PATTERN);
    
    console.log(`   📖 Book Pattern Match: ${bookMatch ? `✅ YES (customer: ${bookMatch[1]}, bookId: ${bookMatch[2]})` : '❌ NO'}`);
    console.log(`   📝 Entry Pattern Match: ${entryMatch ? `✅ YES (customer: ${entryMatch[1]}, entryId: ${entryMatch[2]})` : '❌ NO'}`);
    
    // Check for the problematic case
    if (url.includes('show?id=7816')) {
        if (bookMatch) {
            console.log('   ⚠️  ERROR: This should NOT match book pattern!');
        } else {
            console.log('   ✅ GOOD: Correctly does not match book pattern');
        }
    }
});

console.log('\n' + '='.repeat(60));
console.log('🏁 Test Complete');
