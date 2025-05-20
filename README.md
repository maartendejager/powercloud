# PowerCloud Developer Chrome Extension

A Chrome extension that provides extra functionality for developers working with the spend.cloud platform. This extension captures and displays authentication tokens to assist with troubleshooting and development tasks.

For technical details on how the extension is structured and how to add new features, please see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Features

- **Authentication Token Capture**: Automatically captures JWT tokens sent in requests to spend.cloud domains
- **Token History**: Keeps a history of recent tokens for easy access
- **Token Information**: Parses JWT tokens to show expiration details
- **Copy Functionality**: One-click copying of tokens for use in API testing tools
- **Card Payment Instrument ID**: Retrieve Adyen Payment Instrument IDs for cards
- **Page-Specific Tools**: Automatically adds helpful buttons on relevant pages

## Installation

### Development Mode

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" using the toggle in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The PowerCloud extension should now appear in your browser toolbar

### From Chrome Web Store (Coming Soon)

1. Navigate to the Chrome Web Store (link to be added)
2. Click "Add to Chrome"
3. Confirm the installation

## Usage

### Token Management
1. Click the PowerCloud icon in your Chrome toolbar to open the popup
2. Navigate to any spend.cloud page while logged in
3. The extension will automatically capture authentication tokens sent in requests
4. View captured tokens in the popup window
5. Click the "Copy" button to copy a token to your clipboard

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

### Monetary Account Books
For monetary account books, the extension provides a feature to view the balance account at Adyen:

1. Navigate to a book page (https://[customer].spend.cloud/proactive/kasboek.boekingen/[book-id]/*)
2. If the book is a monetary account book, a button will appear in the bottom-right corner
3. The extension will automatically check for an administration ID and associated balance account ID
4. If a balance account ID is found, the button will be enabled, allowing you to view the account in Adyen

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