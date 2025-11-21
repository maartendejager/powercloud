# Shared Module Architecture

## Overview

The `shared/` directory contains utility modules used by different parts of the extension. Due to the differences between Content Scripts and Service Workers in Chrome extensions, some modules exist in two versions.

## Module Pairs

### Why Two Versions?

**Content Scripts:**
- Loaded via `manifest.json` content_scripts configuration
- Cannot use ES6 `import/export` syntax
- Use `window` object exports for cross-script communication

**Background Service Worker:**
- Requires ES6 modules (`type: "module"`)
- Uses `import/export` syntax
- Cannot access the `window` object

### Active Module Pairs

| Content Scripts (window exports) | Background/Service Worker (ES6) | Purpose |
|----------------------------------|----------------------------------|---------|
| `api.js` | `api-module.js` | API requests to spend.cloud |
| `auth.js` | `auth-module.js` | Authentication token management |
| `url-patterns.js` | `url-patterns-module.js` | URL pattern matching utilities |

## Usage Guidelines

### For Content Scripts
```javascript
// In content_scripts/features/my-feature.js
// Access via window globals (loaded from manifest)
const token = await window.PowerCloudAuth.getToken(customer, isDev);
const data = await window.PowerCloudAPI.makeAuthenticatedRequest(url);
```

### For Background Scripts
```javascript
// In background/api-processors/my-processor.js
// Use ES6 imports
import { getToken } from '../../shared/auth-module.js';
import { getCardDetails } from '../../shared/api-module.js';
```

### For Popup
```javascript
// popup.js can use either approach since it's not in service worker context
// Currently uses ES6 imports where possible
```

## Module Loading

### Content Scripts (via manifest.json)
```json
{
  "content_scripts": [{
    "js": [
      "shared/auth.js",          // ← Loaded first
      "shared/api.js",           // ← Can use auth.js
      "shared/url-patterns.js",
      ...
    ]
  }]
}
```

### Background (ES6 modules)
```javascript
// background/service-worker.js
import { handleFetchCardDetails } from './message-handlers/index.js';
// → imports from background/api-processors/card-processor.js
//   → imports from shared/api-module.js
//     → imports from shared/auth-module.js
```

## Code Synchronization

⚠️ **Important:** Changes to functionality must be replicated in both versions:

1. Update primary version (e.g., `api.js`)
2. Replicate changes to module version (e.g., `api-module.js`)
3. Test both content script AND background script usage

## Future Consideration

If Chrome extensions eventually support ES6 modules in content scripts uniformly, we could consolidate to single versions. Until then, both versions are necessary.

## Module Status

### ✅ Active Pairs (Both Used)
- `api.js` ↔ `api-module.js`
- `auth.js` ↔ `auth-module.js`
- `url-patterns.js` ↔ `url-patterns-module.js`

### 🔍 Single-Use Modules (No Pair Needed)
- `logger.js` - Used everywhere (loaded in content scripts, no service worker import)
- `base-feature.js` - Only for content scripts
- `ui-components.js` - Only for content scripts
- `error-handling.js` - Only for content scripts
- `settings-manager.js` - Only for content scripts
- All validation/monitoring modules - Only for content scripts

### 📝 Documentation Files
- `base-feature-docs.md`
- `base-feature-example.js`

---

**Last Updated:** November 21, 2025  
**Maintainer:** PowerCloud Team

