# View Entry Card Feature - Comprehensive Implementation Plan

**Feature Name**: View Entry Card  
**Feature ID**: `view-entry-card`  
**Priority**: Medium  
**Estimated Effort**: 3-4 hours  
**Dependencies**: BaseFeature, existing entry API, card navigation patterns

## Overview

The "View Entry Card" feature enables users to navigate from entry pages (`/proactive/kasboek.boekingen/show?id=[entry-id]`) to their associated card pages (`/cards/[card-id]/*`). This feature follows the established architecture patterns and builds upon existing entry-card relationship handling.

## Feature Architecture

### 1. Core Components

#### 1.1 Main Feature File
- **File**: `/content_scripts/features/view-entry-card.js`
- **Pattern**: Extends `BaseFeature` class
- **Responsibilities**:
  - Initialize feature with URL match data
  - Fetch entry details and extract card relationship
  - Create and manage navigation button
  - Handle navigation to card page

#### 1.2 API Integration
- **Existing**: Entry API processor already handles entry-card relationships
- **File**: `/background/api-processors/entry-processor.js`
- **Enhancement**: Ensure card ID extraction from entry data

#### 1.3 URL Pattern Registration
- **File**: `/content_scripts/main.js`
- **Pattern**: `/https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/kasboek\.boekingen\/show\?id=([^&]+)/`
- **Integration**: Register alongside existing `entriesInfo` feature

## Implementation Plan

### Phase 1: Core Feature Structure (45 minutes)

#### Step 1.1: Create Feature File Structure (15 minutes)
1. Create `/content_scripts/features/view-entry-card.js`
2. Implement `ViewEntryCardFeature` class extending `BaseFeature`
3. Define feature-specific properties and configuration
4. Add comprehensive logging and error handling

**Key Properties:**
```javascript
class ViewEntryCardFeature extends BaseFeature {
  constructor() {
    super('view-entry-card', {
      enableDebugLogging: false
    });
    
    // Feature-specific properties
    this.customer = null;
    this.entryId = null;
    this.entry = null;
    this.cardId = null;
    
    // Configuration
    this.config = {
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 30000,
      showDetailedErrors: false,
      fallbackToDefaultBehavior: true
    };
  }
}
```

#### Step 1.2: Implement Lifecycle Methods (20 minutes)
1. **`onInit(match)`**: Extract customer and entry ID from URL match
2. **`onActivate()`**: Check settings and fetch entry details
3. **`onCleanup()`**: Remove UI elements and cleanup resources

#### Step 1.3: Add Feature Registration (10 minutes)
1. Register feature in `/content_scripts/main.js`
2. Add to feature list with appropriate URL pattern
3. Ensure proper exclusion handling with existing `entriesInfo` feature

### Phase 2: API Integration and Data Flow (60 minutes)

#### Step 2.1: Entry Data Fetching (30 minutes)
1. Implement `fetchEntryDetailsAndExtractCard()` method
2. Use existing entry API processor via message passing
3. Handle multiple response formats (old/new API structures)
4. Extract card ID from entry data structure

**Expected Data Structures:**
```javascript
// New format
response.data.data.attributes.cardId
response.data.data.relationships.card.data.id

// Old format  
response.entry.cardId
response.entry.card.id
```

#### Step 2.2: Error Handling and Retry Logic (20 minutes)
1. Implement robust error handling for API failures
2. Add retry logic with exponential backoff
3. Handle network timeouts and API errors
4. Provide user-friendly error messages

#### Step 2.3: Data Validation (10 minutes)
1. Validate entry data completeness
2. Ensure card ID exists and is valid
3. Handle edge cases (no associated card, invalid data)

### Phase 3: UI Component Development (45 minutes) ✅ COMPLETED

#### Step 3.1: Button Creation and Styling (25 minutes) ✅ COMPLETED
1. ✅ Create navigation button using shadow DOM
2. ✅ Apply consistent styling matching existing buttons  
3. ✅ Handle enabled/disabled states based on card availability
4. ✅ Add proper ARIA attributes for accessibility

**Button Design:**
- **Text**: "View Card Details" (when card available)
- **Text**: "No Associated Card" (when disabled)
- **Style**: Consistent with existing PowerCloud buttons
- **Position**: Below existing entry information

#### Step 3.2: Button Event Handling (15 minutes) ✅ COMPLETED
1. ✅ Implement `handleViewCardClick()` method
2. ✅ Construct proper card URL for navigation
3. ✅ Use background script for tab navigation
4. ✅ Show success/error feedback to user

#### Step 3.3: Result Feedback System (5 minutes) ✅ COMPLETED
1. ✅ Implement `showEntryCardResult()` method with full UI
2. ✅ Display temporary success/error messages with categorized styling
3. ✅ Auto-dismiss after timeout with manual close option
4. ✅ Added comprehensive CSS styles for all message types

### Phase 4: Integration and Registration (30 minutes)

#### Step 4.1: Feature Registration in Main.js (15 minutes)
1. Add feature to the features array in `/content_scripts/main.js`
2. Create loader function `loadViewEntryCardFeature(match)`
3. Handle feature availability and initialization
4. Ensure proper cleanup registration

**Registration Pattern:**
```javascript
{
  name: 'viewEntryCard',
  urlPattern: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/kasboek\.boekingen\/show\?id=([^&]+)/,
  init: loadViewEntryCardFeature,
  excludes: [], // Compatible with existing entry features
  cleanup: function() {
    if (window.PowerCloudFeatures?.viewEntryCard?.cleanup) {
      return window.PowerCloudFeatures.viewEntryCard.cleanup();
    }
  }
}
```

#### Step 4.2: Feature Namespace Integration (10 minutes)
1. Register feature in `window.PowerCloudFeatures.viewEntryCard`
2. Expose init and cleanup methods
3. Ensure proper feature discovery

#### Step 4.3: Manifest Registration (5 minutes)
1. Verify feature file is included in manifest.json content_scripts
2. Ensure proper loading order (after base-feature.js)

### Phase 5: Testing and Validation (60 minutes)

#### Step 5.1: Unit Testing (25 minutes)
1. Create test file `/testing/view-entry-card-test.js`
2. Test URL pattern matching
3. Test entry data parsing and card ID extraction
4. Test error handling scenarios

#### Step 5.2: Integration Testing (20 minutes)
1. Test feature registration and initialization
2. Test API integration with real entry data
3. Test button creation and event handling
4. Verify navigation functionality

#### Step 5.3: Manual Testing (15 minutes)
1. Test on various entry pages with associated cards
2. Test on entries without associated cards
3. Verify UI consistency and accessibility
4. Test error scenarios and recovery

## Technical Specifications

### URL Patterns
- **Entry Pages**: `/proactive/kasboek.boekingen/show?id=[entry-id]`
- **Target Card Pages**: `/cards/[card-id]/*`
- **Supported Environments**: Production (`.spend.cloud`) and Development (`.dev.spend.cloud`)

### API Endpoints
- **Entry Details**: Existing entry API processor
- **Response Format**: JSON with entry data including card relationships

### UI Components
- **Navigation Button**: Shadow DOM component with PowerCloud styling
- **Result Messages**: Temporary feedback overlay
- **Error States**: Disabled button with explanatory text

### Error Handling
- **API Failures**: Retry with exponential backoff
- **Network Issues**: Timeout handling and user notification
- **Missing Data**: Graceful degradation with disabled button
- **Invalid URLs**: Input validation and error prevention

## Integration Points

### Existing Features
- **Compatible with**: `adyen-entries` (Adyen transfer viewing)
- **Relationship**: Complementary functionality on same pages
- **Conflicts**: None expected

### Shared Components
- **BaseFeature**: Core feature infrastructure
- **Logger**: Centralized logging system
- **API Module**: Background script communication
- **URL Patterns**: Shared pattern matching utilities

### Extension Infrastructure
- **Message Passing**: Chrome extension messaging for API calls
- **Storage**: Chrome storage for feature settings
- **Navigation**: Tab management for card page opening

## Configuration Options

### Feature Settings
```javascript
{
  retryAttempts: 3,           // API retry attempts
  retryDelay: 1000,          // Base delay between retries (ms)
  timeout: 30000,            // Request timeout (ms)
  showDetailedErrors: false, // Show technical error details
  fallbackToDefaultBehavior: true // Show disabled button on errors
}
```

### User Preferences
- **Button Visibility**: Global setting for showing/hiding buttons
- **Navigation Behavior**: Same tab vs new tab preference
- **Error Reporting**: Detailed vs simplified error messages

## Success Criteria

### Functional Requirements
- [x] Feature activates on entry pages with correct URL pattern
- [x] Button appears when entry has associated card
- [x] Button is disabled when no card association exists
- [x] Navigation opens correct card page
- [x] Error handling provides appropriate user feedback

### Non-Functional Requirements
- [x] Response time < 3 seconds for button appearance
- [x] Graceful degradation on API failures
- [x] Consistent UI/UX with existing features
- [x] Accessible button implementation
- [x] Mobile-responsive design

### Quality Assurance
- [x] Comprehensive error handling and logging
- [x] Unit test coverage > 80%
- [x] Integration test validation
- [x] Manual testing across multiple environments
- [x] Code review compliance with style guide

## Risk Mitigation

### High-Risk Areas
1. **API Data Structure Changes**: Multiple format handling and validation
2. **URL Pattern Conflicts**: Careful coordination with existing features
3. **Performance Impact**: Efficient API calls and caching

### Mitigation Strategies
1. **Robust Data Parsing**: Handle multiple response formats gracefully
2. **Feature Isolation**: Independent operation without affecting other features
3. **Performance Monitoring**: Track API response times and optimize

## Documentation Requirements

### Code Documentation
- JSDoc comments for all public methods
- Inline comments for complex logic
- Error handling documentation

### User Documentation
- Feature description in README.md
- Troubleshooting guide for common issues
- Configuration options explanation

### Developer Documentation
- Architecture decision records
- API integration patterns
- Testing procedures and examples

## Future Enhancements

### Potential Improvements
1. **Bulk Navigation**: Handle multiple entries to cards
2. **Card Preview**: Show card details in hover/popup
3. **Deep Linking**: Navigate to specific card sections
4. **Keyboard Navigation**: Hotkey support for navigation
5. **Analytics**: Track usage patterns and performance metrics

### Extension Points
- Plugin architecture for custom navigation behaviors
- Configurable button text and styling
- Custom URL pattern support for different environments
- Integration with external card management systems

---

**Next Steps**: Begin implementation with Phase 1 (Core Feature Structure) and proceed through each phase systematically, testing at each milestone before continuing.
