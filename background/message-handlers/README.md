# Message Handlers

This directory contains handlers for messages received by the service worker.

## Structure

- `index.js` - Exports all message handlers for use in the service worker
- `token-handlers.js` - Handlers for token-related messages
- `entity-handlers.js` - Handlers for entity-related messages (card, book, administration, balance account)

## Adding New Handlers

When adding a new handler:

1. Create a function with the signature `function handleMessageName(message, sender, sendResponse)`
2. Export the function from the appropriate file
3. Add the export to `index.js`
4. Update the message listener in `service-worker.js` to use the new handler

## Handler Guidelines

- Each handler should have a clear, single responsibility
- Always return a boolean indicating whether to keep the message channel open
- For async responses, return `true` to keep the channel open
- For sync responses, return `false` to close the channel
- Use the consistent parameter names: `message`, `sender`, `sendResponse`
- Document the handler with JSDoc comments

### Defensive Programming for Data Validation

**IMPORTANT**: Always validate data parameters before using spread operators to prevent TypeError crashes.

When handling messages that include `data` or similar object parameters, use this defensive pattern:

```javascript
export function handleYourMessage(message, sender, sendResponse) {
    try {
        const { data, metadata } = message;
        
        // Defensive validation - REQUIRED for spread operations
        const safeData = data && typeof data === 'object' ? data : {};
        const safeMetadata = metadata && typeof metadata === 'object' ? metadata : {};
        
        const record = {
            timestamp: Date.now(),
            source: sender.tab?.id || 'unknown',
            ...safeData,  // Now safe to spread
            metadata: {
                ...safeMetadata  // Now safe to spread
            }
        };
        
        // Process the record...
        sendResponse({ success: true });
        
    } catch (error) {
        console.error('[handler] Error processing message:', error);
        sendResponse({ success: false, error: error.message });
    }
    
    return true;
}
```

This pattern prevents the TypeError "Cannot convert undefined or null to object" that occurs when content scripts send messages with null or undefined data properties.
