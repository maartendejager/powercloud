# Token Detector Feature

## Overview

The Token Detector feature is responsible for identifying authentication tokens in spend.cloud websites. It scans the localStorage and sessionStorage for common token patterns and reports them to the extension's background script.

## How It Works

1. The feature initializes on any spend.cloud page by calling `initTokenDetection()`
2. It runs an immediate check for tokens via `checkForTokensInStorage()`
3. It sets up a periodic check (every 30 seconds) for new tokens
4. It registers message listeners to respond to requests for token detection or UI updates

## Token Detection Logic

The detector focuses primarily on API routes (`https://[customer].spend.cloud/api/`) where tokens are most likely to be found. It looks for common token key patterns including:

- `token`
- `authToken`
- `jwt`
- `accessToken`
- `auth_token`
- `id_token`
- `x_authorization_token`

When tokens are found, they're reported to the background script with the action `foundTokensInPage` along with the source (which storage and key), URL, and timestamp.

## Usage in Main Extension

This feature is registered in the main.js features array with:

```javascript
{
  name: 'tokenDetection',
  urlPattern: /.*\.spend\.cloud.*/,  // Run on all spend.cloud pages
  init: window.tokenDetector.init,
  cleanup: null  // No cleanup needed
}
```

## Integration

The feature is designed to be loaded via manifest.json's content_scripts section and will make its functions available through the global `window.tokenDetector` object.