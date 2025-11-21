# Sharing PowerCloud Extension with Colleagues

**Quick Reference:** How to distribute the extension to your team.

## 🎯 TL;DR

```bash
# 1. Build it
npm run build

# 2. Package it
cd dist && zip -r ../PowerCloud-v1.2.1-dist.zip . && cd ..

# 3. Share PowerCloud-v1.2.1-dist.zip with colleagues

# 4. They extract and load the dist/ folder in Chrome
```

---

## 📦 Method 1: Share Pre-Built Package (Easiest for Colleagues)

### For You (Maintainer):

**Step 1: Build the Extension**
```bash
cd /path/to/PowerCloud
npm install              # First time only
npm run build            # Creates dist/ folder
```

**Step 2: Create a ZIP File**
```bash
cd dist
zip -r ../PowerCloud-v1.2.1-dist.zip .
cd ..
```

You now have: `PowerCloud-v1.2.1-dist.zip` (~450KB)

**Step 3: Share the ZIP**

Choose one:
- **GitHub Releases**: Upload to [Releases page](../../releases/new)
- **File Share**: Upload to company SharePoint/Drive
- **Email**: Attach the ZIP file
- **Teams/Slack**: Share in your team channel

### For Your Colleagues:

Send them these instructions:

```
1. Download PowerCloud-v1.2.1-dist.zip
2. Extract to a permanent location (e.g., Desktop/PowerCloud/)
   ⚠️ Keep this folder - don't delete it!
3. Open Chrome: chrome://extensions/
4. Enable "Developer mode" (toggle top-right)
5. Click "Load unpacked"
6. Select the extracted 'dist' folder
7. Done! ✨
```

**To Update:**
```
1. Download new PowerCloud-vX.X.X-dist.zip
2. Replace the old dist/ folder
3. In chrome://extensions/, click the reload button
4. Done! ✨
```

---

## 🔄 Method 2: Share Repository (For Developers)

### Setup (One Time)

Your colleagues clone the repo:
```bash
git clone https://github.com/your-org/PowerCloud.git
cd PowerCloud
```

### Loading Options

**Option A: Load Source (Development Mode)**
```bash
# No build needed
# Just load the project root folder in chrome://extensions/
```
✅ Good for: Active development, making changes  
❌ Slower, larger, includes all source

**Option B: Load Built Version (Production Mode)**
```bash
npm install        # First time only
npm run build      # Build optimized version
# Then load dist/ folder in chrome://extensions/
```
✅ Good for: Using the extension, faster, smaller  
❌ Need to rebuild after pulling updates

### Updating

```bash
git pull origin main

# If using built version:
npm run build
# Then reload in chrome://extensions/
```

---

## 📋 Comparison

| Method | Colleague Setup | Updates | Best For |
|--------|----------------|---------|----------|
| **Pre-Built ZIP** | ⭐ Extract & load | Download new ZIP | Non-developers |
| **Repo - Source** | Clone & load root | `git pull` | Active developers |
| **Repo - Build** | Clone, build, load | `git pull && npm run build` | Testing |

---

## 💡 Pro Tips

### For You (Maintainer)

**Before Sharing:**
```bash
# Verify everything works
npm test                 # Run tests
npm run build            # Build production
npm run version:check    # Verify versions match
```

**Create GitHub Release:**
```bash
# 1. Build and package
npm run build
cd dist && zip -r ../PowerCloud-v1.2.1-dist.zip . && cd ..

# 2. Commit and tag
git add .
git commit -m "Release v1.2.1"
git tag -a v1.2.1 -m "Release version 1.2.1"
git push origin main --tags

# 3. Create release on GitHub
# Upload PowerCloud-v1.2.1-dist.zip as release asset
```

**Automated Script (Optional):**
Create `scripts/package-release.sh`:
```bash
#!/bin/bash
VERSION=$(node -e "console.log(require('./package.json').version)")
npm run build
cd dist
zip -r ../PowerCloud-v$VERSION-dist.zip .
cd ..
echo "✅ Created PowerCloud-v$VERSION-dist.zip"
```

### For Your Colleagues

**Permanent Location:**
```bash
# ✅ GOOD - Permanent locations:
~/Extensions/PowerCloud/
C:\Users\YourName\Extensions\PowerCloud\
/Applications/Extensions/PowerCloud/

# ❌ BAD - Temporary locations:
~/Downloads/PowerCloud/        # Don't keep it here!
~/Desktop/PowerCloud/           # Unless you never clean your desktop
/tmp/PowerCloud/               # Will be deleted!
```

**Extension Not Working?**
```bash
# Common issues:
1. Moved the folder after installing? Load it again from new location
2. Deleted the folder? Re-extract ZIP and load again
3. Getting errors? Check chrome://extensions/ for error messages
4. Old version? Click reload button in chrome://extensions/
```

---

## 🔍 Troubleshooting

### "Updates Required" Warning in Chrome

This is normal for unpacked extensions. Two options:

**Option 1: Ignore It**
- Click "Dismiss"
- Extension keeps working
- Appears every few weeks

**Option 2: Reload Extension**
- Click the reload button
- Warning goes away temporarily

**Not a Real Problem:** Chrome just reminds you it's unpacked. Ignore safely.

### Sharing Won't Load / Import Errors

**Problem:** Colleagues see import errors

**Solution:** They probably loaded the ZIP file itself, not the extracted folder
```bash
# ❌ Wrong: Load PowerCloud-v1.2.1-dist.zip
# ✅ Right: Extract first, then load the dist/ folder
```

### Different Versions

**Problem:** You updated but colleagues have old version

**Solution:** Share new ZIP with updated version number
```bash
# Clear naming helps:
PowerCloud-v1.2.1-dist.zip  ✅
PowerCloud-v1.2.2-dist.zip  ✅
PowerCloud-dist.zip         ❌ (confusing)
```

---

## 📧 Email Template

Copy-paste this to share with colleagues:

```
Subject: PowerCloud Extension - Installation

Hi team,

I've built the latest version of the PowerCloud extension for you to use.

📦 Download: [attach PowerCloud-v1.2.1-dist.zip]

Installation (2 minutes):
1. Extract the ZIP to a permanent folder on your computer
2. Open Chrome and go to: chrome://extensions/
3. Enable "Developer mode" (toggle at top-right)
4. Click "Load unpacked"
5. Select the extracted folder
6. Done! You should see PowerCloud in your extensions

⚠️ Important: Don't delete the extracted folder - Chrome needs it!

Questions? Check the README: [link to repo]

Thanks!
```

---

## 🎓 FAQ

**Q: Should I commit the `dist/` folder to git?**  
A: No, it's in `.gitignore`. Only commit source code.

**Q: Can colleagues use it without installing Node?**  
A: Yes! If you share the pre-built ZIP, they don't need Node/npm.

**Q: How do I handle updates?**  
A: Bump version in `manifest.json` and `package.json`, rebuild, share new ZIP.

**Q: Is the ZIP secure to share?**  
A: It's JavaScript code that colleagues can inspect. Fine for internal teams.

**Q: Can multiple people load the same folder?**  
A: No, each person needs their own copy. That's why you share the ZIP.

---

**Need Help?** See [BUILD_GUIDE.md](./BUILD_GUIDE.md) or [README.md](./README.md)

