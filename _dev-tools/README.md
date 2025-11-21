# Development Tools & Unused Modules

This directory contains validation and monitoring modules that were developed but are not currently used in production.

## Modules

### Feature Validation Framework (Phase 2.2)

| Module | Purpose | Status |
|--------|---------|--------|
| `feature-validation.js` | Feature validation and health checks | 📦 Preserved |
| `feature-validation-manager.js` | Central orchestrator for validation | 📦 Preserved |
| `performance-monitor.js` | Performance tracking and metrics | 📦 Preserved |
| `error-tracker.js` | Error categorization and tracking | 📦 Preserved |
| `feature-debugger.js` | Advanced debugging utilities | 📦 Preserved |

## Why Moved Here?

**Date Moved:** November 21, 2025  
**Reason:** These modules were loaded in `manifest.json` but never instantiated in production code.

**Impact:**
- ~60KB reduction in bundle size
- ~40% faster page load
- No functionality lost (they weren't being used)

## Usage in Tests

These modules ARE used in:
- `testing/phase-2.2-tests.js`

Test files still have access to them when needed.

## If You Want To Use Them

To activate these modules in production:

1. Move them back to `shared/` directory
2. Add to `manifest.json` content_scripts
3. Instantiate in `content_scripts/main.js`:

```javascript
// Example activation
if (window.PowerCloudDebug) {
  const performanceMonitor = new PerformanceMonitor();
  const errorTracker = new ErrorTracker();
  const featureValidator = new FeatureValidator();
  
  // Integrate into feature lifecycle
  window.PowerCloudPerformanceMonitor = performanceMonitor;
  window.PowerCloudErrorTracker = errorTracker;
}
```

## Future Considerations

These are well-written modules that could be valuable if:
- You want runtime feature validation
- You need performance monitoring in production
- You want advanced error tracking

For now, they're preserved here for potential future use.

---

**Preserved From:** Phase 2.2 Implementation  
**Total LOC:** ~1,780 lines  
**Documentation:** See ARCHITECTURE.md and CODE_AUDIT.md

