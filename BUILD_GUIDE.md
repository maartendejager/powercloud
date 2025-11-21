# PowerCloud Extension - Build Guide

**Version:** 1.2.1  
**Last Updated:** November 21, 2025

## Overview

The PowerCloud extension uses a modern build system powered by [esbuild](https://esbuild.github.io/) for production optimization. The build process creates minified, optimized versions of all extension files suitable for distribution.

## Build Modes

### Development Build
```bash
npm run build:dev
```

**Features:**
- ✅ Keeps all console.log statements
- ✅ Includes inline source maps for debugging
- ✅ No minification (readable code)
- ✅ Fast build time (~0.3s)

**Use for:**
- Local development
- Debugging
- Testing new features

### Production Build
```bash
npm run build
```

**Features:**
- ✅ Removes console.log/debug/info (keeps warn/error)
- ✅ Full JavaScript minification
- ✅ No source maps (smaller files)
- ✅ Optimized for distribution
- ✅ Version check before build

**Use for:**
- Releases
- Sharing with colleagues
- Performance-critical deployments

### Watch Mode
```bash
npm run build:watch
```

**Features:**
- Rebuilds on file changes (planned)
- Currently requires manual rebuild

## Build Output

All builds output to the `dist/` directory:

```
dist/
├── background/          # Service worker & processors
├── content_scripts/     # Features and managers
├── popup/              # Extension popup
├── shared/             # Shared utilities
├── images/             # Extension icons
├── manifest.json       # Extension manifest
└── *.css              # Stylesheets
```

## File Size Comparison

| Build Type | Size | Console Logs | Source Maps | Min |
|------------|------|--------------|-------------|-----|
| **Source** | ~736KB | ✅ Yes | N/A | ❌ No |
| **Dev Build** | ~950KB | ✅ Yes | ✅ Yes | ❌ No |
| **Prod Build** | ~450KB | ❌ No | ❌ No | ✅ Yes |

**Production savings:** ~40% smaller than source

## Installation

### Install Build Dependencies

```bash
npm install
```

This installs:
- `esbuild` - Fast JavaScript bundler and minifier

### First Build

```bash
# Production build
npm run build

# Or development build  
npm run build:dev
```

## Loading Built Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `dist/` folder from this project
5. The extension is now installed!

## Build Process Details

### What Gets Processed

#### Background Service Worker
- ✅ Bundled (imports resolved)
- ✅ Minified in production
- ✅ Console statements stripped in production
- ✅ ES6 modules supported

#### Content Scripts
- ✅ Individually processed (not bundled)
- ✅ Minified in production
- ✅ Console statements stripped in production
- ⚠️ Cannot be bundled (Chrome loads them individually)

#### Popup
- ✅ Processed but not bundled
- ✅ Minified in production
- ✅ Console statements stripped in production

#### Static Files
- ✅ Copied as-is
- Images, CSS, HTML unchanged

### Console Statement Handling

**Development builds keep:**
- ✅ `console.log()`
- ✅ `console.debug()`
- ✅ `console.info()`
- ✅ `console.warn()`
- ✅ `console.error()`

**Production builds remove:**
- ❌ `console.log()`
- ❌ `console.debug()`  
- ❌ `console.info()`
- ✅ `console.warn()` (kept)
- ✅ `console.error()` (kept)

## npm Scripts Reference

```json
{
  "build":        "node build.js",           // Production build
  "build:dev":    "node build.js --dev",     // Development build
  "build:watch":  "node build.js --watch",   // Watch mode
  "clean":        "rm -rf dist",             // Clean build output
  "prebuild":     "npm run version:check"    // Auto-check versions
}
```

## Development Workflow

### Typical Development Cycle

```bash
# 1. Make changes to source files
vim content_scripts/features/my-feature.js

# 2. Build development version
npm run build:dev

# 3. Reload extension in Chrome
# Click the reload button on chrome://extensions

# 4. Test your changes
# Navigate to spend.cloud and test

# 5. Repeat steps 1-4 as needed
```

### Before Committing

```bash
# 1. Run tests
npm test

# 2. Build production version to check for errors
npm run build

# 3. Manually test with production build
# Load dist/ in Chrome and verify everything works
```

### Before Releasing

```bash
# 1. Update version in manifest.json and package.json
# (build will verify they match)

# 2. Update README.md changelog

# 3. Build production
npm run build

# 4. Test the production build thoroughly

# 5. Create git tag
git tag -a v1.2.1 -m "Release 1.2.1"
git push origin v1.2.1

# 6. Distribute the dist/ folder
# (zip it up or share via repository releases)
```

## Troubleshooting

### Build Fails with Syntax Error

**Problem:** esbuild reports JavaScript syntax errors

**Solution:**
1. Check the reported file and line number
2. Fix syntax error in source file
3. Rebuild

### Extension Doesn't Work After Building

**Problem:** Built extension doesn't load or crashes

**Solution:**
1. Check Chrome's extension error console
2. Try development build (has source maps)
3. Look for console.error messages (kept in production)
4. Verify manifest.json was copied correctly

### Build is Slow

**Problem:** Build takes longer than ~0.5s

**Solution:**
1. Normal build time is 0.2-0.5s
2. If slower, check if antivirus is scanning files
3. Try cleaning: `npm run clean && npm run build`

### "Version Mismatch" Error

**Problem:** `npm run build` fails with version mismatch

**Solution:**
```bash
# Check versions
npm run version:check

# If mismatched, sync them manually:
# Update both manifest.json and package.json to same version
```

## Advanced Topics

### Customizing the Build

Edit `build.js` to customize:

```javascript
// Change minification settings
function getBuildOptions(baseOptions = {}) {
  const options = {
    ...baseOptions,
    minify: !isDev,
    minifyWhitespace: true,    // Add this
    minifySyntax: true,         // Add this
    target: 'es2020',           // Change this
  };
  
  return options;
}
```

### Adding Build Steps

Add new steps to `build.js`:

```javascript
async function build() {
  await clean();
  await copyStatic();
  await buildBackground();
  await myCustomStep();  // Add here
  await printSummary();
}

async function myCustomStep() {
  console.log('Running custom step...');
  // Your code here
}
```

### Build Performance

Current build performance:
- **Development:** ~0.3s
- **Production:** ~0.2s (faster due to no source maps)

Tips for faster builds:
- Use `--watch` mode (when implemented)
- Don't run antivirus on project folder
- Use SSD storage

## FAQ

**Q: Do I need to build for local development?**  
A: No! You can load the source directory directly. The build is optional for development.

**Q: Should I commit the `dist/` folder?**  
A: No, it's in `.gitignore`. Only commit source files.

**Q: Can I use the extension without building?**  
A: Yes! Load the project root directory in Chrome. The build is for optimization only.

**Q: Why can't content scripts be bundled?**  
A: Chrome extension content scripts must be loaded individually as listed in manifest.json. Bundling them together would break the loading mechanism.

**Q: Do I lose debugging ability in production builds?**  
A: Partially. console.warn/error are kept, but console.log is removed. Use development builds for full debugging.

---

## Related Documentation

- [Development Notes](./DEVELOPMENT_NOTES.md) - Development workflow
- [Testing Guide](./testing/README.md) - Running tests
- [Architecture](./ARCHITECTURE.md) - Extension architecture
- [Phase 1 Improvements](./PHASE_1_IMPROVEMENTS.md) - Recent improvements

---

**Maintained by:** PowerCloud Team  
**Build System:** esbuild v0.27+  
**Node Version:** 18+ required

