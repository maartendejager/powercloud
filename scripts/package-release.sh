#!/bin/bash

###############################################################################
# PowerCloud Extension - Release Packaging Script
#
# Creates a distribution ZIP file ready to share with colleagues
#
# Usage:
#   ./scripts/package-release.sh
#   npm run package
###############################################################################

set -e  # Exit on error

# Colors for pretty output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  PowerCloud Extension - Release Packager${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Get version from package.json
VERSION=$(node -e "console.log(require('./package.json').version)")
OUTPUT_FILE="PowerCloud-v${VERSION}-dist.zip"

echo -e "${YELLOW}📦 Packaging version: ${VERSION}${NC}"
echo ""

# Step 1: Check versions match
echo -e "${BLUE}1/5${NC} Checking version consistency..."
npm run version:check > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} Versions match"
else
    echo -e "  ${RED}✗${NC} Version mismatch between manifest.json and package.json"
    exit 1
fi

# Step 2: Run tests (optional, comment out if you want to skip)
# echo -e "${BLUE}2/5${NC} Running tests..."
# npm test > /dev/null 2>&1
# if [ $? -eq 0 ]; then
#     echo -e "  ${GREEN}✓${NC} Tests passed"
# else
#     echo -e "  ${YELLOW}⚠${NC} Tests failed (continuing anyway)"
# fi

# Step 3: Clean old build
echo -e "${BLUE}2/5${NC} Cleaning old build..."
rm -rf dist/
echo -e "  ${GREEN}✓${NC} Cleaned"

# Step 4: Build production version
echo -e "${BLUE}3/5${NC} Building production version..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} Build complete"
else
    echo -e "  ${RED}✗${NC} Build failed"
    exit 1
fi

# Step 5: Create ZIP file
echo -e "${BLUE}4/5${NC} Creating ZIP archive..."
cd dist
zip -r -q "../${OUTPUT_FILE}" .
cd ..
echo -e "  ${GREEN}✓${NC} Archive created"

# Step 6: Display results
echo -e "${BLUE}5/5${NC} Calculating size..."
SIZE=$(du -h "${OUTPUT_FILE}" | cut -f1)
echo -e "  ${GREEN}✓${NC} Package size: ${SIZE}"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Release package ready!${NC}"
echo ""
echo -e "  📦 File: ${BLUE}${OUTPUT_FILE}${NC}"
echo -e "  📏 Size: ${BLUE}${SIZE}${NC}"
echo -e "  🔖 Version: ${BLUE}${VERSION}${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Test the extension:"
echo -e "     ${BLUE}unzip -d test-dist ${OUTPUT_FILE} && chrome://extensions${NC}"
echo -e "  2. Share with colleagues:"
echo -e "     ${BLUE}Upload to GitHub Releases / Email / File Share${NC}"
echo -e "  3. See SHARING_GUIDE.md for distribution instructions"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

