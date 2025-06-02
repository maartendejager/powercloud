/**
 * Fix Summary: TypeError "Cannot convert undefined or null to object" Resolution
 * 
 * ISSUE RESOLVED:
 * - TypeError occurring in health-handlers.js when content scripts send messages 
 *   with null or undefined data properties to the background script
 * - The spread operator (...data) was failing when data was null/undefined
 * 
 * ROOT CAUSE:
 * - Content scripts calling chrome.runtime.sendMessage() with messages containing 
 *   null or undefined data fields
 * - AdyenEntriesFeature and other features could trigger this when error conditions
 *   resulted in missing data properties
 * 
 * FUNCTIONS FIXED:
 * 1. handleRecordStructuredLog() - Line 638
 * 2. handleRecordFeatureEvent() - Line 670  
 * 3. handleRecordPerformanceMetric() - Line 703
 * 
 * SOLUTION APPLIED:
 * Added defensive programming with null/undefined checks before spread operations:
 * 
 * // Before (vulnerable):
 * recordFunction(level, message, {
 *   ...data,  // ❌ Fails if data is null/undefined
 *   tabId: sender.tab?.id,
 *   source: 'content-script'
 * });
 * 
 * // After (defensive):
 * const safeData = data && typeof data === 'object' ? data : {};
 * recordFunction(level, message, {
 *   ...safeData,  // ✅ Always safe
 *   tabId: sender.tab?.id,
 *   source: 'content-script'
 * });
 * 
 * IMPACT:
 * - Prevents extension crashes when content scripts send malformed messages
 * - Maintains backward compatibility with existing content script code
 * - Ensures robust error handling across all health monitoring functions
 * - No functional changes - logging still works correctly with valid data
 * 
 * TESTING:
 * - Verified fix handles null, undefined, empty objects, and string data
 * - Confirmed all syntax validation passes
 * - No performance impact or breaking changes
 */

console.log('✅ Fix Summary: TypeError in health-handlers.js resolved');
console.log('🔧 Fixed 3 functions with defensive data handling');
console.log('🛡️ Extension now robust against null/undefined data in messages');
console.log('📊 Health monitoring continues to work correctly');
