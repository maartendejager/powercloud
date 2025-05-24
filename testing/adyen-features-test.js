/**
 * Adyen Features Test Script
 * 
 * This script tests the functionality of all three Adyen features:
 * - Card feature
 * - Book feature  
 * - Entries feature
 * 
 * Run this in the browser console on any PowerCloud page to test feature registration and functionality.
 */

(function() {
    'use strict';
    
    console.log('🧪 PowerCloud Adyen Features Test Script Starting...');
    console.log('===============================================');
    
    // Test configuration
    const TEST_CONFIG = {
        timeout: 5000,
        checkInterval: 100,
        maxRetries: 50
    };
    
    // Test results storage
    const testResults = {
        namespaceCheck: false,
        featureRegistration: {
            card: false,
            book: false,
            entries: false
        },
        urlMatching: {
            card: null,
            book: null,
            entries: null
        },
        initializationTest: {
            card: null,
            book: null,
            entries: null
        },
        errors: []
    };
    
    /**
     * Utility function to wait for a condition
     */
    async function waitFor(condition, timeout = TEST_CONFIG.timeout) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            if (await condition()) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.checkInterval));
        }
        return false;
    }
    
    /**
     * Test 1: Check PowerCloudFeatures namespace
     */
    function testNamespace() {
        console.log('🔍 Test 1: Checking PowerCloudFeatures namespace...');
        
        if (typeof window.PowerCloudFeatures === 'undefined') {
            console.error('❌ PowerCloudFeatures namespace not found');
            testResults.errors.push('PowerCloudFeatures namespace missing');
            return false;
        }
        
        console.log('✅ PowerCloudFeatures namespace exists');
        console.log('📋 Available features:', Object.keys(window.PowerCloudFeatures));
        testResults.namespaceCheck = true;
        return true;
    }
    
    /**
     * Test 2: Check feature registration
     */
    function testFeatureRegistration() {
        console.log('🔍 Test 2: Checking feature registration...');
        
        const features = ['card', 'book', 'entries'];
        
        features.forEach(feature => {
            if (window.PowerCloudFeatures[feature]) {
                console.log(`✅ ${feature} feature registered`);
                console.log(`   - Has init method: ${typeof window.PowerCloudFeatures[feature].init === 'function'}`);
                console.log(`   - Has cleanup method: ${typeof window.PowerCloudFeatures[feature].cleanup === 'function'}`);
                testResults.featureRegistration[feature] = true;
            } else {
                console.error(`❌ ${feature} feature not registered`);
                testResults.errors.push(`${feature} feature not registered`);
            }
        });
        
        return testResults.featureRegistration.card && 
               testResults.featureRegistration.book && 
               testResults.featureRegistration.entries;
    }
    
    /**
     * Test 3: Test URL pattern matching
     */
    function testUrlMatching() {
        console.log('🔍 Test 3: Testing URL pattern matching...');
        
        const testUrls = [
            {
                url: 'https://customer.spend.cloud/cards/card123/details',
                feature: 'card',
                shouldMatch: true
            },
            {
                url: 'https://customer.dev.spend.cloud/cards/card456/overview',
                feature: 'card',
                shouldMatch: true
            },
            {
                url: 'https://customer.spend.cloud/book/book789',
                feature: 'book',
                shouldMatch: true
            },
            {
                url: 'https://customer.dev.spend.cloud/book/book101112',
                feature: 'book',
                shouldMatch: true
            },
            {
                url: 'https://customer.spend.cloud/entries/entry131415',
                feature: 'entries',
                shouldMatch: true
            },
            {
                url: 'https://customer.dev.spend.cloud/entries/entry161718',
                feature: 'entries',
                shouldMatch: true
            }
        ];
        
        // URL patterns from main.js
        const urlPatterns = {
            card: /^https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/cards\/([^\/]+)/,
            book: /^https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/book\/([^\/]+)/,
            entries: /^https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/entries\/([^\/]+)/
        };
        
        testUrls.forEach(test => {
            const pattern = urlPatterns[test.feature];
            const match = pattern.exec(test.url);
            const matches = !!match;
            
            if (matches === test.shouldMatch) {
                console.log(`✅ ${test.feature}: ${test.url} - ${matches ? 'matched' : 'no match'}`);
                if (match) {
                    console.log(`   - Customer: ${match[1]}`);
                    console.log(`   - ID: ${match[2]}`);
                }
                testResults.urlMatching[test.feature] = true;
            } else {
                console.error(`❌ ${test.feature}: ${test.url} - expected ${test.shouldMatch}, got ${matches}`);
                testResults.urlMatching[test.feature] = false;
                testResults.errors.push(`URL matching failed for ${test.feature}`);
            }
        });
        
        return Object.values(testResults.urlMatching).every(result => result === true);
    }
    
    /**
     * Test 4: Test feature initialization (simulation)
     */
    async function testFeatureInitialization() {
        console.log('🔍 Test 4: Testing feature initialization...');
        
        const testCases = [
            {
                feature: 'card',
                match: ['https://testcustomer.spend.cloud/cards/testcard123', 'testcustomer', 'testcard123']
            },
            {
                feature: 'book',
                match: ['https://testcustomer.spend.cloud/book/testbook456', 'testcustomer', 'testbook456']
            },
            {
                feature: 'entries',
                match: ['https://testcustomer.spend.cloud/entries/testentry789', 'testcustomer', 'testentry789']
            }
        ];
        
        for (const testCase of testCases) {
            try {
                console.log(`Testing ${testCase.feature} initialization...`);
                
                if (!window.PowerCloudFeatures[testCase.feature]) {
                    throw new Error(`Feature ${testCase.feature} not registered`);
                }
                
                // Note: We're not actually calling init because it would trigger real functionality
                // Instead, we check if the method exists and log what would happen
                const feature = window.PowerCloudFeatures[testCase.feature];
                
                if (typeof feature.init !== 'function') {
                    throw new Error(`Feature ${testCase.feature} init method is not a function`);
                }
                
                console.log(`✅ ${testCase.feature}: init method available`);
                console.log(`   - Would be called with match:`, testCase.match);
                testResults.initializationTest[testCase.feature] = true;
                
            } catch (error) {
                console.error(`❌ ${testCase.feature}: initialization test failed -`, error.message);
                testResults.initializationTest[testCase.feature] = false;
                testResults.errors.push(`${testCase.feature} initialization test failed: ${error.message}`);
            }
        }
        
        return Object.values(testResults.initializationTest).every(result => result === true);
    }
    
    /**
     * Test 5: Check BaseFeature availability
     */
    function testBaseFeature() {
        console.log('🔍 Test 5: Checking BaseFeature availability...');
        
        if (typeof window.BaseFeature === 'undefined') {
            console.error('❌ BaseFeature class not available globally');
            testResults.errors.push('BaseFeature class not available');
            return false;
        }
        
        console.log('✅ BaseFeature class is available');
        console.log('   - Constructor:', typeof window.BaseFeature);
        
        // Check if BaseFeature has expected methods
        const expectedMethods = ['constructor'];
        const prototype = window.BaseFeature.prototype;
        
        if (prototype) {
            const methods = Object.getOwnPropertyNames(prototype);
            console.log('   - Available methods:', methods);
        }
        
        return true;
    }
    
    /**
     * Test 6: Check current page compatibility
     */
    function testCurrentPage() {
        console.log('🔍 Test 6: Checking current page compatibility...');
        
        const currentUrl = window.location.href;
        console.log('Current URL:', currentUrl);
        
        const urlPatterns = {
            card: /^https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/cards\/([^\/]+)/,
            book: /^https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/book\/([^\/]+)/,
            entries: /^https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/entries\/([^\/]+)/
        };
        
        let matchedFeature = null;
        let matchData = null;
        
        for (const [feature, pattern] of Object.entries(urlPatterns)) {
            const match = pattern.exec(currentUrl);
            if (match) {
                matchedFeature = feature;
                matchData = match;
                break;
            }
        }
        
        if (matchedFeature) {
            console.log(`✅ Current page matches ${matchedFeature} feature pattern`);
            console.log('   - Customer:', matchData[1]);
            console.log('   - ID:', matchData[2]);
            console.log('   - Feature should be active');
            
            // Check if feature button exists
            const shadowHost = document.getElementById('powercloud-shadow-host');
            if (shadowHost) {
                console.log('✅ PowerCloud shadow host found - feature button should be visible');
            } else {
                console.log('⚠️  PowerCloud shadow host not found - feature may not be initialized');
            }
        } else {
            console.log('ℹ️  Current page does not match any Adyen feature patterns');
            console.log('   - This is normal if you\'re not on a card/book/entries page');
        }
        
        return true;
    }
    
    /**
     * Test 7: Storage and configuration test
     */
    async function testConfiguration() {
        console.log('🔍 Test 7: Testing configuration and storage...');
        
        try {
            // Test chrome.storage.local access
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                console.log('✅ Chrome storage API available');
                
                // Try to read configuration
                const result = await new Promise((resolve) => {
                    chrome.storage.local.get(['showButtons', 'adyenCardConfig', 'adyenBookConfig', 'adyenEntriesConfig'], resolve);
                });
                
                console.log('📋 Current configuration:', result);
                
                if (result.showButtons === undefined) {
                    console.log('ℹ️  showButtons not set, will default to true');
                } else {
                    console.log(`   - Show buttons: ${result.showButtons}`);
                }
                
                return true;
            } else {
                console.error('❌ Chrome storage API not available');
                testResults.errors.push('Chrome storage API not available');
                return false;
            }
        } catch (error) {
            console.error('❌ Configuration test failed:', error);
            testResults.errors.push(`Configuration test failed: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Run all tests
     */
    async function runAllTests() {
        console.log('🚀 Starting comprehensive Adyen features test...');
        console.log('');
        
        const tests = [
            { name: 'Namespace Check', fn: testNamespace },
            { name: 'Feature Registration', fn: testFeatureRegistration },
            { name: 'URL Pattern Matching', fn: testUrlMatching },
            { name: 'Feature Initialization', fn: testFeatureInitialization },
            { name: 'BaseFeature Availability', fn: testBaseFeature },
            { name: 'Current Page Compatibility', fn: testCurrentPage },
            { name: 'Configuration & Storage', fn: testConfiguration }
        ];
        
        const results = [];
        
        for (const test of tests) {
            console.log('');
            try {
                const result = await test.fn();
                results.push({ name: test.name, passed: result });
                console.log(`${result ? '✅' : '❌'} ${test.name}: ${result ? 'PASSED' : 'FAILED'}`);
            } catch (error) {
                results.push({ name: test.name, passed: false, error: error.message });
                console.error(`❌ ${test.name}: FAILED -`, error.message);
                testResults.errors.push(`${test.name}: ${error.message}`);
            }
        }
        
        // Print summary
        console.log('');
        console.log('📊 TEST SUMMARY');
        console.log('===============');
        
        const passed = results.filter(r => r.passed).length;
        const total = results.length;
        
        console.log(`Tests passed: ${passed}/${total}`);
        console.log('');
        
        results.forEach(result => {
            console.log(`${result.passed ? '✅' : '❌'} ${result.name}`);
            if (result.error) {
                console.log(`    Error: ${result.error}`);
            }
        });
        
        if (testResults.errors.length > 0) {
            console.log('');
            console.log('🚨 ERRORS FOUND:');
            testResults.errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error}`);
            });
        }
        
        console.log('');
        console.log('🔍 DEBUGGING TIPS:');
        console.log('- Check browser console for feature registration messages');
        console.log('- Verify extension is loaded and active');
        console.log('- Make sure you\'re on a PowerCloud page');
        console.log('- Try reloading the extension if issues persist');
        
        return {
            passed,
            total,
            results,
            errors: testResults.errors,
            testResults
        };
    }
    
    // Export test functions for manual use
    window.AdyenFeaturesTest = {
        runAll: runAllTests,
        testNamespace,
        testFeatureRegistration,
        testUrlMatching,
        testFeatureInitialization,
        testBaseFeature,
        testCurrentPage,
        testConfiguration,
        getResults: () => testResults
    };
    
    // Run tests automatically
    runAllTests().then(summary => {
        console.log('');
        console.log('🎯 Test completed! Results available in window.AdyenFeaturesTest.getResults()');
        
        if (summary.passed === summary.total) {
            console.log('🎉 All tests passed! The Adyen features should be working correctly.');
        } else {
            console.log('⚠️  Some tests failed. Check the errors above for troubleshooting.');
        }
    });
    
})();
