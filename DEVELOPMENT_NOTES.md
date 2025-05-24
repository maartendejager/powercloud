# PowerCloud Extension Development Notes

## Overview
This document contains consolidated development notes, debugging procedures, and historical context for the PowerCloud Chrome extension.

---

## Recent Major Changes & Bug Fixes

### ES6 Module System Implementation (May 2025)
- **Problem**: Chrome extension service worker couldn't handle mixed ES6/traditional module contexts
- **Solution**: Implemented dual module system:
  - Content scripts use `window.*` exports from `shared/*.js`
  - Background/popup use ES6 imports from `shared/*-module.js`
- **Files affected**: All shared modules now have dual implementations

### Authentication Token Capture Fix
- **Problem**: After ES6 refactoring, auth tokens were no longer being captured
- **Root cause**: Mismatched function signatures and storage keys between original and ES6 wrapper implementations
- **Solution**: Synchronized `auth.js` and `auth-module.js` implementations

---

## Extension Reload Instructions

When developing or testing the extension:

1. **Go to Chrome Extensions**: `chrome://extensions/`
2. **Enable Developer Mode**: Toggle in top-right corner
3. **Reload Extension**: Click reload button on PowerCloud extension
4. **Inspect Service Worker**: Click "Inspect views: service worker" for background debugging
5. **Test Functionality**: Navigate to spend.cloud pages and check popup for tokens

### Common Debug Checkpoints
- Background console should show: `[service-worker] Setting up web request listener...`
- Token capture logs: `[token-manager] Web request intercepted: [URL]`
- Popup should display captured tokens or appropriate messaging

---

## Testing & Debugging

### Local Testing
- Use browser developer tools on background page for service worker logs
- Use browser developer tools on any spend.cloud page for content script logs
- Popup logs appear in popup's own developer tools

### Key Log Patterns
```
[service-worker] - Background service worker messages
[token-manager] - Authentication token capture
[auth-module] - Token processing and storage
[popup] - Popup interface interactions
```

---

## File Architecture Notes

### Dual Module System
The extension uses a dual module system to handle Chrome's service worker limitations:

**Traditional Scripts** (for content scripts):
- `shared/auth.js` - Uses `window.*` exports
- `shared/api.js` - Uses `window.*` exports  
- `shared/url-patterns.js` - Uses `window.*` exports

**ES6 Modules** (for background/popup):
- `shared/auth-module.js` - ES6 wrapper around auth functionality
- `shared/api-module.js` - ES6 wrapper around API functionality
- `shared/url-patterns-module.js` - ES6 wrapper around URL patterns

### Storage Keys
- Authentication tokens: `authTokens` (array of token objects)
- Settings: `settings` (configuration object)
- Feature toggles: Individual keys per feature

---

## Known Issues & Solutions

### Issue: Extension doesn't load
**Symptoms**: Extension shows as inactive in chrome://extensions/
**Solution**: Check manifest.json syntax and reload extension

### Issue: No tokens captured
**Symptoms**: Popup shows "No authentication tokens captured yet"
**Causes**: 
1. Web request listener not properly set up
2. Not visiting actual spend.cloud API routes
3. API requests not including expected headers
**Debug**: Check background console for web request interception logs

### Issue: Content scripts not working
**Symptoms**: Features don't activate on spend.cloud pages
**Causes**:
1. URL patterns not matching current page
2. Feature registration errors
3. Content Security Policy issues
**Debug**: Check page console for content script errors

---

## Performance Considerations

### Memory Management
- Token storage limited to 10 most recent tokens
- Feature cleanup on page navigation
- Event listener management in BaseFeature class

### Loading Optimization  
- Manifest-only loading strategy (no dynamic imports in content scripts)
- Lazy feature initialization based on URL patterns
- Minimal DOM manipulation and efficient event handling

---

## Security Notes

### Token Handling
- Tokens stored in Chrome's secure storage API
- No token transmission outside of spend.cloud domains
- Automatic token expiry validation

### Content Security Policy
- Extension respects CSP headers
- No inline scripts or unsafe evaluations
- Secure message passing between contexts

---

## Development Workflow

### Adding New Features
1. Create feature class extending BaseFeature
2. Register feature in content_scripts/main.js
3. Add URL patterns in shared/url-patterns.js
4. Test thoroughly before deployment

### Code Quality Standards
- Follow JSDoc documentation standards
- Keep files under 350 lines when possible
- Use consistent error handling patterns
- Implement proper cleanup in feature lifecycle

### Testing Requirements
- Unit tests for shared utilities
- Integration tests for feature loading
- Manual testing on actual spend.cloud pages
- Validation of token capture functionality

---

## Troubleshooting Guide

### Extension Development Console Commands
```javascript
// Check extension storage
chrome.storage.local.get(null, console.log);

// Clear all stored data
chrome.storage.local.clear();

// Check active features
window.PowerCloudFeatures;

// Test URL pattern matching
window.isApiRoute('https://example.spend.cloud/api/test');
```

### Common Error Patterns
- `Uncaught ReferenceError: [function] is not defined` → Check module imports/exports
- `Service worker registration failed` → Check manifest.json and service worker syntax
- `Cannot read property of undefined` → Check for proper error handling and null checks

---

## Historical Context

This extension was originally built with a simple architecture and has been incrementally improved through structured phases:

1. **Phase 1**: Core architecture foundation with BaseFeature system
2. **Phase 2**: Testing infrastructure and validation systems  
3. **Phase 3**: Developer experience improvements and configuration management
4. **Current**: Enhanced debugging and code quality improvements

The extension maintains backward compatibility while implementing modern patterns and best practices.
