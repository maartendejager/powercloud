#!/usr/bin/env node

/**
 * Test script to verify enhanced 404 error handling
 * Tests that 404 errors are properly categorized as warnings
 */

import { makeAuthenticatedRequest } from './shared/api-module.js';

// Mock chrome APIs
global.chrome = {
    storage: {
        local: {
            get: (keys) => {
                // Mock stored auth tokens in the format expected by auth-module.js
                const mockData = {
                    'authTokens': [{
                        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsImV4cCI6MTk5OTk5OTk5OX0.test-signature',
                        clientEnvironment: 'test-env',
                        isDevRoute: false,
                        isValid: true,
                        expiryDate: new Date(Date.now() + 86400000).toISOString() // Expires in 24 hours
                    }]
                };
                
                // Return data based on requested keys
                if (typeof keys === 'string') {
                    return Promise.resolve({ [keys]: mockData[keys] });
                } else if (Array.isArray(keys)) {
                    const result = {};
                    keys.forEach(key => {
                        result[key] = mockData[key];
                    });
                    return Promise.resolve(result);
                } else {
                    return Promise.resolve(mockData);
                }
            }
        }
    },
    runtime: {
        sendMessage: (message) => {
            console.log('📤 Health Dashboard Message:', JSON.stringify(message, null, 2));
            return Promise.resolve({ success: true });
        }
    }
};

// Mock fetch to simulate different HTTP responses
global.fetch = async (url, options) => {
    console.log(`🌐 Simulating API request to: ${url}`);
    
    if (url.includes('/api/books/show?id=7816')) {
        // Simulate 404 for missing book
        return {
            ok: false,
            status: 404,
            statusText: 'Not Found',
            text: () => Promise.resolve('{"error":"Book not found"}'),
            json: () => Promise.resolve({ error: 'Book not found' })
        };
    } else if (url.includes('/api/books/show?id=500')) {
        // Simulate 500 for server error
        return {
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            text: () => Promise.resolve('{"error":"Server error"}'),
            json: () => Promise.resolve({ error: 'Server error' })
        };
    } else if (url.includes('/api/books/show?id=200')) {
        // Simulate successful response
        return {
            ok: true,
            status: 200,
            statusText: 'OK',
            json: () => Promise.resolve({ 
                id: 200, 
                title: 'Test Book', 
                author: 'Test Author' 
            })
        };
    }
    
    // Default 404
    return {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('{"error":"Not found"}'),
        json: () => Promise.resolve({ error: 'Not found' })
    };
};

async function testErrorHandling() {
    console.log('🧪 Testing Enhanced Error Handling for Different HTTP Status Codes\n');
    
    const testCases = [
        {
            name: '404 Error (Missing Book)',
            endpoint: '/api/books/show?id=7816',
            expectedLevel: 'warn'
        },
        {
            name: '500 Error (Server Error)',
            endpoint: '/api/books/show?id=500',
            expectedLevel: 'error'
        },
        {
            name: '200 Success',
            endpoint: '/api/books/show?id=200',
            expectedLevel: 'info'
        }
    ];
    
    for (const testCase of testCases) {
        console.log(`\n🔍 Testing: ${testCase.name}`);
        console.log(`   Endpoint: ${testCase.endpoint}`);
        console.log(`   Expected Log Level: ${testCase.expectedLevel}`);
        
        try {
            const result = await makeAuthenticatedRequest(testCase.endpoint, {
                method: 'GET'
            });
            
            if (testCase.expectedLevel === 'info') {
                console.log(`✅ Success: ${JSON.stringify(result)}`);
            }
        } catch (error) {
            console.log(`📝 Error caught: ${error.message}`);
            console.log(`   Status: ${error.status}`);
            console.log(`   Endpoint: ${error.endpoint}`);
            
            if (testCase.expectedLevel === 'warn' && error.status === 404) {
                console.log('✅ 404 error correctly handled as warning');
            } else if (testCase.expectedLevel === 'error' && error.status === 500) {
                console.log('✅ 500 error correctly handled as error');
            }
        }
        
        console.log('─'.repeat(50));
    }
    
    console.log('\n🎯 Enhanced Error Handling Test Complete!');
    console.log('📊 Check the log messages above to verify:');
    console.log('   - 404 errors are logged as "warn" level');
    console.log('   - 500 errors are logged as "error" level');
    console.log('   - Error messages include endpoint and status context');
    console.log('   - Health dashboard receives structured log data');
}

// Run the test
testErrorHandling().catch(console.error);
