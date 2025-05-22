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
