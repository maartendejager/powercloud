# Chrome Extension Compatibility Notes

## Folder Naming Restrictions

**Issue Fixed:** November 21, 2025

Chrome extensions have specific requirements for folder names:

### ❌ Not Allowed
- Folders starting with underscore: `_dev-tools/`
- Folders starting with dot: `.hidden/`

**Error Message:**
```
"Cannot load extension with file or directory name _dev-tools. 
Filenames starting with "_" are reserved for use by the system."
```

### ✅ Allowed
- Regular names: `dev-tools/`
- Hyphens: `my-folder/`
- Numbers: `folder123/`
- Mixed: `dev-tools-2/`

## Our Solution

We renamed `_dev-tools/` → `dev-tools/` to comply with Chrome's requirements.

**Files affected:**
- ✅ Folder renamed
- ✅ `.gitignore` updated
- ✅ Documentation updated

## Loading the Extension

You can now load either:

### Option 1: Source (Development)
```
Load: /path/to/PowerCloud/
```
Includes `dev-tools/` but that's fine - it's not referenced in manifest.json

### Option 2: Built (Production)  
```
Load: /path/to/PowerCloud/dist/
```
The `dev-tools/` folder is not copied to `dist/`, so no issue.

## Other Chrome Extension Restrictions

### File Types
- ✅ `.js`, `.css`, `.html`, `.json` - Allowed
- ✅ `.png`, `.jpg`, `.svg` - Allowed
- ⚠️ `.exe`, `.dll`, `.so` - Not allowed (executable files)

### manifest.json
- Must be valid JSON
- Must include required fields: `name`, `version`, `manifest_version`
- File paths must use forward slashes: `content_scripts/main.js` ✅

### Content Security Policy
- Inline scripts not allowed by default
- `eval()` not allowed
- Remote scripts must be loaded via manifest

## Testing Checklist

Before loading in Chrome:
- [ ] No folders starting with `_` or `.` (except `.git`)
- [ ] `manifest.json` is valid JSON
- [ ] All paths in manifest use forward slashes
- [ ] No executable files included

---

**Reference:** [Chrome Extension File System Requirements](https://developer.chrome.com/docs/extensions/mv3/manifest/)

