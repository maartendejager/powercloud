/**
 * Quick Console Test for Adyen Features
 * 
 * Copy and paste this directly into the browser console to quickly test
 * if the Adyen features are working correctly.
 */

// Quick test function
(function quickTest() {
    console.log('%c🧪 PowerCloud Adyen Features Quick Test', 'color: blue; font-size: 16px; font-weight: bold;');
    console.log('==========================================');
    
    // Test 1: Check namespace
    console.log('\n1️⃣ PowerCloudFeatures namespace:');
    if (typeof window.PowerCloudFeatures !== 'undefined') {
        console.log('✅ PowerCloudFeatures exists');
        console.log('📋 Available features:', Object.keys(window.PowerCloudFeatures));
    } else {
        console.log('❌ PowerCloudFeatures not found');
        return;
    }
    
    // Test 2: Check feature registration
    console.log('\n2️⃣ Feature registration:');
    const features = ['card', 'book', 'entries'];
    features.forEach(feature => {
        if (window.PowerCloudFeatures[feature]) {
            console.log(`✅ ${feature} feature registered`);
        } else {
            console.log(`❌ ${feature} feature missing`);
        }
    });
    
    // Test 3: Check BaseFeature
    console.log('\n3️⃣ BaseFeature class:');
    if (typeof window.BaseFeature !== 'undefined') {
        console.log('✅ BaseFeature available');
    } else {
        console.log('❌ BaseFeature not found');
    }
    
    // Test 4: Check current page
    console.log('\n4️⃣ Current page analysis:');
    const url = window.location.href;
    console.log('URL:', url);
    
    const patterns = {
        card: /^https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/cards\/([^\/]+)/,
        book: /^https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/book\/([^\/]+)/,
        entries: /^https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/entries\/([^\/]+)/
    };
    
    let matched = false;
    for (const [feature, pattern] of Object.entries(patterns)) {
        const match = pattern.exec(url);
        if (match) {
            console.log(`✅ Matches ${feature} pattern`);
            console.log(`   Customer: ${match[1]}, ID: ${match[2]}`);
            matched = true;
            break;
        }
    }
    
    if (!matched) {
        console.log('ℹ️  No Adyen feature pattern matched (normal if not on card/book/entries page)');
    }
    
    // Test 5: Check for button
    console.log('\n5️⃣ PowerCloud button check:');
    const shadowHost = document.getElementById('powercloud-shadow-host');
    if (shadowHost) {
        console.log('✅ PowerCloud shadow host found');
        console.log('   Visibility class:', shadowHost.className);
    } else {
        console.log('❌ PowerCloud shadow host not found');
    }
    
    // Test 6: Chrome APIs
    console.log('\n6️⃣ Chrome extension APIs:');
    if (typeof chrome !== 'undefined') {
        console.log('✅ Chrome APIs available');
        if (chrome.storage && chrome.storage.local) {
            console.log('✅ Chrome storage available');
        } else {
            console.log('❌ Chrome storage not available');
        }
        if (chrome.runtime && chrome.runtime.sendMessage) {
            console.log('✅ Chrome runtime messaging available');
        } else {
            console.log('❌ Chrome runtime messaging not available');
        }
    } else {
        console.log('❌ Chrome APIs not available');
    }
    
    console.log('\n🎯 Quick test completed!');
    console.log('💡 For detailed testing, run: AdyenFeaturesTest.runAll()');
})();
