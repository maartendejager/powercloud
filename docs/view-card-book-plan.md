# Plan for "View Card Book" Feature

This document outlines the steps to implement the "View Card Book" feature. This feature will be active on pages where card information is displayed and will allow users to navigate to the linked card book\'s current active period.

## [ ] 1. Create a New Feature File

*   [ ] Create a new JavaScript file named `view-card-book.js` in the `content_scripts/features/` directory.
*   [ ] This file will contain the logic for the "View Card Book" feature.
*   [ ] It should follow the structure of other feature files, potentially extending `BaseFeature` if applicable.

## [ ] 2. Implement Feature Logic in `view-card-book.js`

*   [ ] **Initialization (`init` function):**
    *   [ ] Accept the `match` object (from URL parsing) and `cardData` (fetched by `adyen-card.js`) as parameters.
    *   [ ] Extract the book ID from `cardData.data.relationships.books.data[0].id`.
    *   [ ] Handle cases where the book ID might not be present.
    *   [ ] Determine the current period in "MM-YYYY" format (e.g., "05-2025").
    *   [ ] Construct the redirection URL: `https://proactive.spend.cloud/proactive/kasboek.boekingen/[book-id]/[period]`. Note: The user asked for `[card-id]` in the URL, but the example URL uses `[book-id]`. Clarify this with the user. Assuming `[book-id]` for now.
    *   [ ] Create a UI element (e.g., a button) that, when clicked, redirects the user to the constructed URL.
    *   [ ] Add this UI element to the page.
*   [ ] **Cleanup (`cleanup` function):**
    *   [ ] Remove the UI element created during initialization.
*   [ ] **Error Handling:**
    *   [ ] Implement robust error handling for API calls and data extraction.
*   [ ] **Logging:**
    *   [ ] Add logging using the provided `loggerFactory`.

## [ ] 3. Modify `adyen-card.js` to Trigger the New Feature

*   [ ] In `adyen-card.js`, after successfully fetching card details (`fetchCardDetailsAndAddButton` function):
    *   [ ] Check if the `PowerCloudFeatures.viewCardBook.init` function exists.
    *   [ ] If it exists, call `PowerCloudFeatures.viewCardBook.init(this.match, response)`, passing the current URL match and the card details response.
*   [ ] Ensure the `cleanup` function in `adyen-card.js` also calls the cleanup function of `view-card-book.js` if it was initialized.

## [ ] 4. Register the New Feature in `manifest.json`

*   [ ] Add `content_scripts/features/view-card-book.js` to the `js` array for the relevant `content_scripts` entry in `manifest.json`. This ensures the script is loaded by the browser.

## [ ] 5. Update `main.js` (Feature Registration)

*   [ ] While the primary initialization will be triggered by `adyen-card.js`, consider if a separate feature entry in the `features` array in `main.js` is necessary for this new feature.
    *   [ ] If the "View Card Book" button should *only* appear when the "View Card at Adyen" button appears, then direct invocation from `adyen-card.js` is sufficient.
    *   [ ] If it could operate independently or has its own lifecycle tied to URL patterns (though it seems dependent on card data), then a separate registration might be cleaner. For now, assume it\'s dependent and triggered by `adyen-card.js`.

## [ ] 6. Documentation

*   [ ] Create/update `README.md` or `ARCHITECTURE.md` to include details about the new "View Card Book" feature.
*   [ ] Add JSDoc comments to the new functions and classes in `view-card-book.js`.

## [ ] 7. Testing

*   [ ] Manually test the feature on all relevant card pages:
    *   [ ] `https://[customer].spend.cloud/cards/[card-id]/*`
    *   [ ] `https://[customer].dev.spend.cloud/cards/[card-id]/*`
    *   [ ] `https://[customer].spend.cloud/proactive/data.card/single_card_update?id=[card-id]`
    *   [ ] `https://[customer].dev.spend.cloud/proactive/data.card/single_card_update?id=[card-id]`
    *   [ ] `https://[customer].spend.cloud/proactive/kasboek.passen/show?id=[card-id]`
    *   [ ] `https://[customer].dev.spend.cloud/proactive/kasboek.passen/show?id=[card-id]`
*   [ ] Test cases:
    *   [ ] Card with a linked book.
    *   [ ] Card without a linked book.
    *   [ ] API errors when fetching card details.
*   [ ] Consider adding automated tests if the project has a testing framework for content scripts.

## Clarification Needed:

*   **URL Structure for Redirection:** The user\'s request mentions redirecting to `https://proactive.spend.cloud/proactive/kasboek.boekingen/[card-id]/[period]`, but the example path for book information is typically `kasboek.boekingen/[book-id]/...`. Please confirm if it should be `[card-id]` or the extracted `[book-id]` in the final URL. The plan currently assumes `[book-id]`.
*   **"Current Active Period":** The definition of "current active period" needs to be precise. The plan assumes the current month and year (e.g., 05-2025). If it\'s derived from card data or another source, this needs to be specified.

This plan provides a structured approach to implementing the feature. Each step should be reviewed and tested upon completion.
