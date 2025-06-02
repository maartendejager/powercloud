/**
 * Test script to validate the health-handlers.js fix for null/undefined data
 */

// Mock the recordFeatureEvent function for testing
let recordedEvents = [];
function mockRecordFeatureEvent(featureName, event, level, logMessage, data) {
  recordedEvents.push({ featureName, event, level, logMessage, data });
  console.log('✅ Event recorded:', { featureName, event, level, logMessage, data });
}

// Test function that mimics the fixed handleRecordFeatureEvent logic
function testHandleRecordFeatureEvent(message, sender) {
  try {
    const { featureName, event, level, logMessage, data } = message;
    
    if (!featureName || !event || !level || !logMessage) {
      return { success: false, error: 'Missing required feature event data' };
    }
    
    // Ensure data is always an object to prevent spread operator errors
    const safeData = data && typeof data === 'object' ? data : {};
    
    // Record feature event with content script source
    mockRecordFeatureEvent(featureName, event, level, logMessage, {
      ...safeData,
      tabId: sender.tab?.id,
      tabUrl: sender.tab?.url,
      source: 'content-script'
    });
    
    return { success: true };
  } catch (error) {
    console.error('[health] Error recording feature event:', error);
    return { success: false, error: error.message };
  }
}

// Test cases
console.log('🧪 Testing health-handlers.js fix...\n');

// Mock sender object
const mockSender = {
  tab: {
    id: 123,
    url: 'https://example.com'
  }
};

// Test 1: Normal case with valid data
console.log('Test 1: Normal case with valid data');
const result1 = testHandleRecordFeatureEvent({
  featureName: 'AdyenEntriesFeature',
  event: 'action_performed',
  level: 'info',
  logMessage: 'Test action',
  data: { actionType: 'click', elementId: 'button1' }
}, mockSender);
console.log('Result:', result1);
console.log();

// Test 2: Case with null data (the bug scenario)
console.log('Test 2: Case with null data (the bug scenario)');
const result2 = testHandleRecordFeatureEvent({
  featureName: 'AdyenEntriesFeature',
  event: 'action_performed',
  level: 'info',
  logMessage: 'Test action',
  data: null
}, mockSender);
console.log('Result:', result2);
console.log();

// Test 3: Case with undefined data
console.log('Test 3: Case with undefined data');
const result3 = testHandleRecordFeatureEvent({
  featureName: 'AdyenEntriesFeature',
  event: 'action_performed',
  level: 'info',
  logMessage: 'Test action',
  data: undefined
}, mockSender);
console.log('Result:', result3);
console.log();

// Test 4: Case with empty object data
console.log('Test 4: Case with empty object data');
const result4 = testHandleRecordFeatureEvent({
  featureName: 'AdyenEntriesFeature',
  event: 'action_performed',
  level: 'info',
  logMessage: 'Test action',
  data: {}
}, mockSender);
console.log('Result:', result4);
console.log();

// Test 5: Case with string data (non-object)
console.log('Test 5: Case with string data (non-object)');
const result5 = testHandleRecordFeatureEvent({
  featureName: 'AdyenEntriesFeature',
  event: 'action_performed',
  level: 'info',
  logMessage: 'Test action',
  data: 'string-data'
}, mockSender);
console.log('Result:', result5);
console.log();

// Test 6: Missing required fields
console.log('Test 6: Missing required fields');
const result6 = testHandleRecordFeatureEvent({
  featureName: 'AdyenEntriesFeature',
  event: 'action_performed',
  // Missing level and logMessage
  data: { test: 'data' }
}, mockSender);
console.log('Result:', result6);
console.log();

console.log('📊 Summary of recorded events:');
recordedEvents.forEach((event, index) => {
  console.log(`${index + 1}. ${event.featureName} - ${event.event} (${event.level})`);
  console.log(`   Data keys: ${Object.keys(event.data).join(', ')}`);
});
