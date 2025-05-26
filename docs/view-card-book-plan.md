# Plan for "View Card Book" Feature

This document outlines the steps to implement the "View Card Book" feature. This feature will be active on pages where card information is displayed and will allow users to navigate to the linked card book\'s current active period.

## [x] 1. Create a New Feature File

*   [x] Create a new JavaScript file named `view-card-book.js` in the `content_scripts/features/` directory.
*   [x] This file will contain the logic for the "View Card Book" feature.
*   [x] It should follow the structure of other feature files, potentially extending `BaseFeature` if applicable.

## [x] 2. Implement Feature Logic in `view-card-book.js`

*   [x] **Initialization (`init` function):**
    *   [x] Accept the `match` object (from URL parsing) and `cardData` (fetched by `adyen-card.js`) as parameters.
    *   [x] Extract the book ID from `cardData.data.relationships.books.data[0].id`.
    *   [x] Handle cases where the book ID might not be present.
    *   [x] Determine the current period in "MM-YYYY" format (e.g., "05-2025").
    *   [x] Construct the redirection URL: `https://proactive.spend.cloud/proactive/kasboek.boekingen/[book-id]/[period]`. Note: The user asked for `[card-id]` in the URL, but the example URL uses `[book-id]`. Clarify this with the user. Assuming `[book-id]` for now.
    *   [x] Create a UI element (e.g., a button) that, when clicked, redirects the user to the constructed URL.
    *   [x] Add this UI element to the page.
*   [x] **Cleanup (`cleanup` function):**
    *   [x] Remove the UI element created during initialization.
*   [x] **Error Handling:**
    *   [x] Implement robust error handling for API calls and data extraction.
*   [x] **Logging:**
    *   [x] Add logging using the provided `loggerFactory`.

## [x] 3. Modify `adyen-card.js` to Trigger the New Feature

*   [x] In `adyen-card.js`, after successfully fetching card details (`fetchCardDetailsAndAddButton` function):
    *   [x] Check if the `PowerCloudFeatures.viewCardBook.init` function exists.
    *   [x] If it exists, call `PowerCloudFeatures.viewCardBook.init(this.match, response)`, passing the current URL match and the card details response.
*   [x] Ensure the `cleanup` function in `adyen-card.js` also calls the cleanup function of `view-card-book.js` if it was initialized.

## [x] 4. Register the New Feature in `manifest.json`

*   [x] Add `content_scripts/features/view-card-book.js` to the `js` array for the relevant `content_scripts` entry in `manifest.json`. This ensures the script is loaded by the browser.

## [x] 5. Update `main.js` (Feature Registration)

*   [x] While the primary initialization will be triggered by `adyen-card.js`, consider if a separate feature entry in the `features` array in `main.js` is necessary for this new feature.
    *   [x] If the "View Card Book" button should *only* appear when the "View Card at Adyen" button appears, then direct invocation from `adyen-card.js` is sufficient.
    *   [x] If it could operate independently or has its own lifecycle tied to URL patterns (though it seems dependent on card data), then a separate registration might be cleaner. For now, assume it\'s dependent and triggered by `adyen-card.js`.

**Decision:** The "View Card Book" feature is designed to be dependent on card data that's fetched by the `adyen-card.js` module. Since it should only be active when card information is available and displayed, we've chosen to trigger it directly from the `adyen-card.js` module rather than registering it as a separate feature in `main.js`. This approach ensures that the feature is only initialized when card data is successfully retrieved.

## [x] 6. Documentation

*   [x] Create/update `README.md` or `ARCHITECTURE.md` to include details about the new "View Card Book" feature.
*   [x] Add JSDoc comments to the new functions and classes in `view-card-book.js`.

## [x] 7. Testing

*   [x] Created a manual test plan document (`testing/VIEW_CARD_BOOK_TEST.md`) with detailed test cases:
    *   [x] `https://[customer].spend.cloud/cards/[card-id]/*`
    *   [x] `https://[customer].dev.spend.cloud/cards/[card-id]/*`
    *   [x] `https://[customer].spend.cloud/proactive/data.card/single_card_update?id=[card-id]`
    *   [x] `https://[customer].dev.spend.cloud/proactive/data.card/single_card_update?id=[card-id]`
    *   [x] `https://[customer].spend.cloud/proactive/kasboek.passen/show?id=[card-id]`
    *   [x] `https://[customer].dev.spend.cloud/proactive/kasboek.passen/show?id=[card-id]`
*   [x] Included test cases for:
    *   [x] Card with a linked book.
    *   [x] Card without a linked book.
    *   [x] API errors when fetching card details.
*   [x] Consideration for adding automated tests is included in the test plan document.

## Implementation Notes

### Clarifications

*   **URL Structure for Redirection:** The implementation uses the book ID from the card's relationships in the URL path, not the card ID. This is consistent with the existing book viewing functionality in the extension.
*   **"Current Active Period":** The implementation defines the current active period as the current month and year (e.g., "05-2025" for May 2025).

### Implementation Status

✅ All steps in the implementation plan have been completed:

1. Created the new feature file (`view-card-book.js`)
2. Implemented all required feature logic
3. Modified `adyen-card.js` to trigger the new feature
4. Registered the new feature in `manifest.json`
5. Made a conscious decision about feature registration in `main.js`
6. Updated documentation
7. Created comprehensive test plan

The feature is now ready for testing according to the test plan in `testing/VIEW_CARD_BOOK_TEST.md`.
