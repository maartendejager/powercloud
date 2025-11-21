# PowerCloud Developer Chrome Extension

A Chrome extension that provides extra functionality for developers working with the spend.cloud platform. This extension captures and displays authentication tokens to assist with troubleshooting and development tasks.

The extension works on both production (`https://[customer].spend.cloud/*`) and development environments (`https://[customer].dev.spend.cloud/*`).

## 📖 Documentation

- **[Architecture Guide](./ARCHITECTURE.md)** - Technical architecture and design patterns
- **[Development Notes](./DEVELOPMENT_NOTES.md)** - Current development context and troubleshooting
- **[Improvement Plan](./IMPROVEMENT_PLAN.md)** - Development roadmap and planned features
- **[Feature Development Guide](./docs/FEATURE_DEVELOPMENT_GUIDE.md)** - Comprehensive guide for creating new features
- **[Developer Documentation](./docs/)** - Comprehensive guides for developers
- **[UI Improvements](./docs/ui-improvements/)** - UI enhancement documentation including:
  - [Metrics Grid Styling](./docs/ui-improvements/enhanced-metrics-grid.md)
  - [Token Tenant Display](./docs/ui-improvements/token-tenant-display-fix.md)
  - [Token UI Enhancements](./docs/ui-improvements/token-ui-enhancements.md)
- **[Navigation Behavior Implementation](./docs/NAVIGATION_BEHAVIOR_IMPLEMENTATION.md)** - Button navigation behavior differentiation

### For New Developers
Start with the [Developer Onboarding Guide](./docs/DEVELOPER_ONBOARDING.md) for a complete setup and development guide.

### For Testing
See the [Testing Documentation](./docs/testing/) for comprehensive testing procedures and guides.

## Token Terminology

To maintain clarity in the codebase and UI, we use the following terminology:

- **Tenant Name**: The client organization name, stored as `clientEnvironment` in the code (e.g., "customer1", "acme-corp")
- **Environment Type**: Whether the environment is development or production, stored as `isDevRoute` (true/false)

For detailed clarification, see [Token Terminology Clarification](./docs/ui-improvements/token-terminology-clarification.md).

## Project Structure

```
PowerCloud/
├── manifest.json                    # Extension configuration
├── README.md                       # Project overview (this file)
├── ARCHITECTURE.md                 # Technical architecture documentation
├── IMPROVEMENT_PLAN.md             # Development roadmap
├── DEVELOPMENT_NOTES.md            # Development context & troubleshooting
│
├── popup/                          # Extension popup interface
├── background/                     # Service worker & API processing
├── content_scripts/                # Page interaction & features
├── shared/                         # Shared utilities & modules
├── images/                         # Extension icons & assets
├── testing/                        # Testing framework & test files
│
└── docs/                           # Developer documentation
    ├── README.md                   # Documentation index
    ├── DEVELOPER_ONBOARDING.md     # New developer guide
    ├── CODE_STYLE_GUIDE.md        # Coding standards
    ├── testing/                    # Testing guides
    ├── configuration/              # Configuration guides
    └── history/                    # Historical documentation
```

## Features

- **Authentication Token Capture**: Automatically captures JWT tokens from network requests to spend.cloud domains
- **Token History**: Keeps a history of recent tokens for easy access
- **Environment-Specific Tokens**: Automatically uses the correct token for each client environment and development/production context
- **Token Information**: Parses JWT tokens to show expiration details
- **Copy Functionality**: One-click copying of tokens for use in API testing tools
- **Card Payment Instrument ID**: Retrieve Adyen Payment Instrument IDs for cards
- **Page-Specific Tools**: Automatically adds helpful buttons on relevant pages

## Installation

The extension can be installed in several ways, depending on your needs.

### Quick Install (Pre-Built Version) ⭐ Recommended for Most Users

If you just want to **use** the extension (not develop it), use the pre-built version:

**1. Download the Pre-Built Extension**

*   Get the latest release from the [Releases page](../../releases) (look for the `PowerCloud-v1.2.1-dist.zip` file)
*   Or ask your colleague who built it for the `dist.zip` file

**2. Extract the ZIP file**

*   Unzip the downloaded file to a permanent location (e.g., `~/PowerCloud-Extension/`)
*   ⚠️ Don't delete this folder after installation - Chrome needs it to stay there!

**3. Install in Chrome**

1.  Open Chrome and go to `chrome://extensions/`
2.  Enable **"Developer mode"** (toggle in top-right corner)
3.  Click **"Load unpacked"**
4.  Select the `dist/` folder from the extracted files
5.  Done! The extension is now installed ✨

**Updates:** When a new version is shared, just replace the `dist/` folder and click the reload button in `chrome://extensions/`.

---

### Developer Installation (From Source)

If you want to **modify** or **debug** the extension:

**1. Clone the Repository**

```bash
git clone https://github.com/your-username/your-repository-name.git
cd PowerCloud
```

**2. Choose Your Installation Method**

**Option A: Load Source Directly** (for active development)
```bash
# No build needed! Load the project root in Chrome
# Good for: Making changes and testing immediately
```

1.  Go to `chrome://extensions/`
2.  Enable "Developer mode"
3.  Click "Load unpacked"
4.  Select the **project root folder** (not `dist/`)
5.  Extension loaded from source ✅

**Option B: Build and Load** (for testing production version)
```bash
# Build optimized version first
npm install          # First time only
npm run build        # or 'npm run build:dev' for development

# Then load dist/ folder in Chrome
```

1.  Go to `chrome://extensions/`
2.  Enable "Developer mode"  
3.  Click "Load unpacked"
4.  Select the **`dist/` folder**
5.  Extension loaded from build ✅

**Which to use?**
- **Source**: Active development, need hot-reloading of changes
- **Build**: Testing the production version before sharing

---

### For Maintainers: Creating a Release

To share with colleagues:

**1. Build the Production Version**

```bash
npm install          # First time only
npm run build        # Creates optimized dist/ folder
```

**2. Create Distribution Package**

```bash
# From project root
cd dist
zip -r ../PowerCloud-v1.2.1-dist.zip .
cd ..

# Now you have PowerCloud-v1.2.1-dist.zip ready to share!
```

**3. Share the ZIP**

*   Upload to GitHub Releases
*   Share via company file sharing
*   Email to colleagues
*   Or commit and push (colleagues can clone and load `dist/`)

**Why build?**
- 40% smaller file size
- Console logs removed (cleaner)
- Minified code (faster)
- Professional distribution

### From Chrome Web Store (Coming Soon)

1.  Navigate to the Chrome Web Store (link to be added)
2.  Click "Add to Chrome"
3.  Confirm the installation

## Usage

### Token Management
1. Click the PowerCloud icon in your Chrome toolbar to open the popup
2. Navigate to any spend.cloud page while logged in
3. The extension will automatically capture authentication tokens sent in requests
4. View captured tokens in the popup window
5. Click the "Copy" button to copy a token to your clipboard
6. The extension automatically uses the correct token for each client environment (tenant) and for development/production contexts

### Card Payment Instrument ID
There are two ways to get a card's Adyen Payment Instrument ID:

#### From Card Settings Page
1. Navigate to a card settings page with ID 265 (https://[customer].spend.cloud/cards/265/*)
2. A green button will appear in the bottom-right corner
3. Click the "View Card at Adyen" button to open the card details directly in Adyen's dashboard

#### From Extension Popup
1. Click the PowerCloud icon in your Chrome toolbar
2. Click on the "Card Info" tab
3. Enter the customer domain and card ID
4. Click "View Card at Adyen" button
5. The card details will open directly in Adyen's dashboard in a new tab

### View Card Book
For cards that have an associated book, the extension provides a feature to view the card book:

1. Navigate to a card page (https://[customer].spend.cloud/cards/[card-id]/* or other supported card pages)
2. A green "View Card Book" button will appear in the bottom-right corner next to the "View in Adyen" button
3. The extension will automatically check if the card has a relationship to a book
4. If a book ID is found, the button will be enabled
5. Click the button to view the card's associated book for the current month/year directly in a new tab

### Monetary Account Books
For monetary account books, the extension provides a feature to view the balance account at Adyen:

1. Navigate to a book page (https://[customer].spend.cloud/proactive/kasboek.boekingen/[book-id]/*)
2. If the book is a monetary account book, a button will appear in the bottom-right corner
3. The extension will automatically check if the book has a direct relationship to an Adyen balance account
4. If a balance account ID is found, the button will be enabled, showing either the balance account reference or ID
5. Click the button to view the account directly in Adyen's dashboard

## Permissions

This extension requires the following permissions:
- `activeTab`: To interact with the current tab
- `storage`: To store captured tokens
- `scripting`: To inject scripts into pages
- `tabs`: To access tab information
- `alarms`: For scheduled tasks
- `webRequest`: To observe network requests

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Security Note

This extension is intended for development and troubleshooting purposes only. JWT tokens provide access to authenticated resources, so handle them with care and never share them with unauthorized individuals.

## Testing

### Testing with Development Domains

You can test the extension with both standard and development domains:

1. **Standard domain**: `https://[customer].spend.cloud/*`
2. **Development domain**: `https://[customer].dev.spend.cloud/*`

To verify functionality on development domains:

1. Install the extension in developer mode
2. Navigate to a supported development domain (e.g., `https://example.dev.spend.cloud/cards/123`)
3. Confirm that the extension features appear and work correctly
4. Test token capture by making API requests on the development domain

## Development

### Feature Development with BaseFeature

Starting with version 1.2.0, new features can be built using the BaseFeature foundation for standardized structure and enhanced reliability:

```javascript
class MyNewFeature extends BaseFeature {
  constructor() {
    super('myNewFeature', {
      enableDebugLogging: true // Enable for development
    });
  }

  onInit(match) {
    super.onInit(match);
    // Your initialization code here
  }

  onCleanup() {
    // Your cleanup code here
    super.onCleanup();
  }
}
```

**Benefits:**
- Standardized lifecycle management
- Built-in error handling with context
- Debug logging for troubleshooting  
- State tracking (isInitialized, isActive)
- Backward compatibility with existing features

See `shared/base-feature-docs.md` for complete documentation and migration examples.

## Changelog

### 1.2.1 - May 25, 2025
- **IMPROVED**: Enhanced authentication token error handling with user-friendly messages
- Now shows specific "refresh the page" guidance when expired tokens exist for the current environment
- Improved error messages indicate environment and development context for better troubleshooting
- Maintains existing error behavior for cases with no tokens at all

### 1.2.0 - May 24, 2025
- **NEW**: BaseFeature foundation for standardized feature development
- Added BaseFeature class with lifecycle hooks (onInit, onCleanup, onActivate, onDeactivate)
- Implemented error handling with context information for all features
- Added debug logging capabilities for development
- Enhanced architecture foundation for future improvements
- Full backward compatibility maintained - no breaking changes

### 1.1.1 - May 22, 2025
- Enhanced API handling to properly support development environment API requests
- Improved detection of development vs. production environments in requests from popup
- Fixed issue where popup requests might use incorrect API endpoints

### 1.1.0 - May 21, 2025
- Added support for dev environments (`https://[customer].dev.spend.cloud/*`)
- All features now work on both production and development environments 
- Uses regex patterns to match dev subdomain URLs

### 1.0.0 - Initial Release
- Authentication token capture and management
- Card Payment Instrument ID retrieval
- Page-specific tools for spend.cloud