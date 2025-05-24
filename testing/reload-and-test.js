/**
 * Extension Reload and Test Script
 * 
 * This script helps reload the extension and run comprehensive tests.
 * Paste this into the browser console to reload and test the extension.
 */

(async function reloadAndTest() {
    console.log('%c🔄 PowerCloud Extension Reload and Test', 'color: blue; font-size: 16px; font-weight: bold;');
    console.log('==========================================');
    
    // Function to wait for extension reload
    function waitForExtensionReload() {
        return new Promise((resolve) => {
            // Clear any existing timers
            clearTimeout(window.powerCloudTestTimeout);
            
            // Set a timeout to wait for extension reload
            window.powerCloudTestTimeout = setTimeout(() => {
                console.log('✅ Extension reload timeout completed');
                resolve();
            }, 2000); // Wait 2 seconds for extension to reload
        });
    }
    
    // Function to check if extension is loaded
    function checkExtensionLoaded() {
        const indicators = {
            chromeRuntime: typeof chrome !== 'undefined' && !!chrome.runtime,
            powerCloudNamespace: typeof window.PowerCloudFeatures !== 'undefined',
            baseFeature: typeof window.BaseFeature !== 'undefined',
            featureManager: typeof window.FeatureManager !== 'undefined',
            safeFeatureManager: typeof window.PowerCloudSafeFeatureManager !== 'undefined'
        };
        
        console.log('🔍 Extension Load Status:', indicators);
        
        const isLoaded = Object.values(indicators).every(Boolean);
        console.log(isLoaded ? '✅ Extension appears to be loaded' : '⚠️ Extension may not be fully loaded');
        
        return { isLoaded, indicators };
    }
    
    try {
        console.log('\n📋 Step 1: Initial Extension Check');
        const initialCheck = checkExtensionLoaded();
        
        if (!initialCheck.isLoaded) {
            console.log('\n⚠️ Extension not fully loaded. Please:');
            console.log('1. Go to chrome://extensions/');
            console.log('2. Find PowerCloud extension');
            console.log('3. Click "Reload" button');
            console.log('4. Come back to this page and run this script again');
            return;
        }
        
        console.log('\n📋 Step 2: Current Page Analysis');
        const currentUrl = window.location.href;
        console.log('Current URL:', currentUrl);
        
        // Test URL patterns
        const patterns = {
            card: /^https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/cards\/([^\/]+)/,
            book: /^https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/book\/([^\/]+)/,
            entries: /^https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/entries\/([^\/]+)/
        };
        
        let matchedFeature = null;
        let matchData = null;
        
        for (const [feature, pattern] of Object.entries(patterns)) {
            const match = pattern.exec(currentUrl);
            if (match) {
                matchedFeature = feature;
                matchData = match;
                console.log(`✅ URL matches ${feature} pattern`);
                console.log(`   Customer: ${match[1]}`);
                console.log(`   ID: ${match[2]}`);
                break;
            }
        }
        
        if (!matchedFeature) {
            console.log('ℹ️ Current URL does not match any Adyen feature patterns');
            console.log('   This is normal if you\'re not on a card/book/entries page');
        }
        
        console.log('\n📋 Step 3: Feature Registration Check');
        if (window.PowerCloudFeatures) {
            const features = Object.keys(window.PowerCloudFeatures);
            console.log('✅ PowerCloudFeatures namespace exists');
            console.log('📋 Registered features:', features);
            
            // Check each Adyen feature
            ['card', 'book', 'entries'].forEach(feature => {
                if (window.PowerCloudFeatures[feature]) {
                    console.log(`✅ ${feature} feature registered`);
                    console.log(`   - Has init: ${typeof window.PowerCloudFeatures[feature].init === 'function'}`);
                    console.log(`   - Has cleanup: ${typeof window.PowerCloudFeatures[feature].cleanup === 'function'}`);
                } else {
                    console.log(`❌ ${feature} feature NOT registered`);
                }
            });
        } else {
            console.log('❌ PowerCloudFeatures namespace not found');
        }
        
        console.log('\n📋 Step 4: DOM Element Check');
        const shadowHost = document.getElementById('powercloud-shadow-host');
        if (shadowHost) {
            console.log('✅ PowerCloud shadow host found');
            console.log('   Visibility:', shadowHost.className);
            console.log('   Has shadow root:', !!shadowHost.shadowRoot);
        } else {
            console.log('❌ PowerCloud shadow host not found');
            if (matchedFeature) {
                console.log('   ⚠️ This is unexpected since URL matches a feature pattern');
            }
        }
        
        console.log('\n📋 Step 5: Storage Configuration Check');
        if (typeof chrome !== 'undefined' && chrome.storage) {
            try {
                const result = await new Promise((resolve) => {
                    chrome.storage.local.get(['showButtons', 'adyenCardConfig', 'adyenBookConfig', 'adyenEntriesConfig'], resolve);
                });
                
                console.log('✅ Storage accessible');
                console.log('📋 Configuration:', result);
                
                if (result.showButtons === false) {
                    console.log('⚠️ Buttons are disabled in configuration');
                }
            } catch (error) {
                console.log('❌ Storage check failed:', error);
            }
        } else {
            console.log('❌ Chrome storage not available');
        }
        
        console.log('\n📋 Step 6: Console Log Analysis');
        console.log('💡 Look for these messages in the console:');
        console.log('  - [PowerCloud] Main script loaded');
        console.log('  - [PowerCloud] Loading adyen-card.js...');
        console.log('  - [PowerCloud] adyen-card feature registered successfully');
        console.log('  - [PowerCloud] Starting extension initialization...');
        
        console.log('\n🎯 Test Results Summary');
        console.log('=======================');
        
        if (initialCheck.isLoaded && window.PowerCloudFeatures && Object.keys(window.PowerCloudFeatures).length > 0) {
            console.log('✅ Extension is loaded and features are registered');
            
            if (matchedFeature && shadowHost) {
                console.log('✅ Current page should show PowerCloud functionality');
            } else if (matchedFeature && !shadowHost) {
                console.log('⚠️ Page matches feature pattern but no button found');
                console.log('   Check console for initialization errors');
            } else {
                console.log('ℹ️ Current page does not require PowerCloud functionality');
            }
        } else {
            console.log('❌ Extension is not properly loaded');
            console.log('   Please reload the extension and try again');
        }
        
        console.log('\n💡 Next Steps:');
        if (!initialCheck.isLoaded) {
            console.log('1. Reload the extension in chrome://extensions/');
            console.log('2. Refresh this page');
            console.log('3. Run this test again');
        } else if (matchedFeature && !shadowHost) {
            console.log('1. Check browser console for JavaScript errors');
            console.log('2. Verify the feature initialization messages appear');
            console.log('3. Try refreshing the page');
        } else {
            console.log('1. Try navigating to a card/book/entries page to test features');
            console.log('2. Example URLs:');
            console.log('   - https://[customer].spend.cloud/cards/[id]/details');
            console.log('   - https://[customer].spend.cloud/book/[id]');
            console.log('   - https://[customer].spend.cloud/entries/[id]');
        }
        
    } catch (error) {
        console.error('❌ Test script failed:', error);
    }
})();

// Also provide individual test functions
window.PowerCloudDebugTest = {
    checkExtensionStatus: function() {
        console.log('Extension Status:', {
            chrome: typeof chrome !== 'undefined',
            powerCloudFeatures: typeof window.PowerCloudFeatures !== 'undefined',
            featuresCount: window.PowerCloudFeatures ? Object.keys(window.PowerCloudFeatures).length : 0,
            baseFeature: typeof window.BaseFeature !== 'undefined',
            featureManager: typeof window.FeatureManager !== 'undefined'
        });
    },
    
    testCurrentUrl: function() {
        const url = window.location.href;
        const patterns = {
            card: /^https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/cards\/([^\/]+)/,
            book: /^https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/book\/([^\/]+)/,
            entries: /^https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/entries\/([^\/]+)/
        };
        
        console.log('URL Test Results:');
        console.log('Current URL:', url);
        
        for (const [feature, pattern] of Object.entries(patterns)) {
            const match = pattern.exec(url);
            console.log(`${feature}:`, {
                pattern: pattern.toString(),
                matches: !!match,
                data: match
            });
        }
    },
    
    checkDOMElements: function() {
        console.log('DOM Elements:', {
            shadowHost: !!document.getElementById('powercloud-shadow-host'),
            resultHost: !!document.getElementById('powercloud-result-host'),
            allPowerCloudElements: document.querySelectorAll('[id*="powercloud"]').length
        });
    }
};

console.log('🛠️ Debug functions available: window.PowerCloudDebugTest');
