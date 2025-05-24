# URL Pattern Best Practices for PowerCloud Extension

## Overview
This document provides guidelines and best practices for creating, maintaining, and optimizing URL patterns in the PowerCloud extension. These practices are based on the enhancements made in Phase 1.3 of the improvement plan.

## Pattern Design Principles

### 1. Specificity First
- **More specific patterns should be preferred** over general ones
- Use query parameters when available to increase specificity
- Include path segments that uniquely identify the feature's context

**Example:**
```javascript
// Good - Specific pattern for card updates
/https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/data\.card\/single_card_update\?id=([^&]+)/

// Avoid - Too general
/https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/.*/
```

### 2. Capture What You Need
- Use capture groups `()` to extract useful information from URLs
- Name your capture groups conceptually (customer, cardId, bookId, etc.)
- Avoid capturing unnecessary parts of the URL

**Example:**
```javascript
// Good - Captures customer and card ID
/https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/cards\/([^\/]+)/

// Customer: match[1], Card ID: match[2]
```

### 3. Environment Consistency
- **Always support both production and dev environments**
- Use the pattern `(?:dev\.)?` to optionally match dev subdomain
- Test patterns against both environment types

**Standard Domain Pattern:**
```javascript
/https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud/
```

## Pattern Validation

### Using the Validation Helper
Always validate your patterns using the built-in validation function:

```javascript
import { validateUrlPattern } from '../shared/url-patterns.js';

const pattern = /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/cards\/([^\/]+)/;
const validation = validateUrlPattern(pattern);

if (!validation.isValid) {
  console.error('Pattern validation errors:', validation.errors);
}

if (validation.warnings.length > 0) {
  console.warn('Pattern validation warnings:', validation.warnings);
}
```

### Common Validation Issues

#### 1. Unescaped Dots
```javascript
// Wrong - dots match any character
/https://([^.]+).spend.cloud/

// Correct - escaped dots match literal dots
/https:\/\/([^.]+)\.spend\.cloud/
```

#### 2. Overly Broad Patterns
```javascript
// Avoid - matches everything
/.*/

// Better - specific to spend.cloud
/.*\.spend\.cloud.*/

// Best - specific to feature context
/https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/cards/
```

## Specificity Calculation

### Understanding Specificity Scores
The pattern specificity system uses weighted scoring:

- **Path Segments**: +3 points per forward slash
- **Query Parameters**: +10 points for `\?` presence
- **Exact Matches**: +5 points for spend.cloud domain
- **Wildcards**: -2 points per `.*` or `+` quantifier
- **Length Bonus**: +0.05 points per exact character

### Testing Specificity
```javascript
import { calculatePatternSpecificity } from '../shared/url-patterns.js';

const pattern = /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/cards\/([^\/]+)/;
const url = 'https://test.spend.cloud/cards/12345';

const score = calculatePatternSpecificity(pattern, url);
console.log(`Pattern specificity: ${score}`);
```

### Specificity Examples
```javascript
// High specificity (score: ~28)
/https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/data\.card\/single_card_update\?id=([^&]+)/

// Medium specificity (score: ~18)
/https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/cards\/([^\/]+)/

// Low specificity (score: ~8)
/https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud/
```

## Pattern Categories

### 1. Card Patterns
For features that work with card data:

```javascript
const CARD_PATTERNS = {
  // Standard card page
  standard: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/cards\/([^\/]+)(\/.*|$)/,
  
  // Proactive card update
  proactive: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/data\.card\/single_card_update\?id=([^&]+)/,
  
  // Kasboek card view
  kasboek: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/kasboek\.passen\/show\?id=([^&]+)/
};
```

### 2. Book Patterns
For features that work with book/journal data:

```javascript
// Book listing/management
const BOOK_PATTERN = /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/kasboek\.boekingen\/([^\/]+)(\/.*|$)/;

// Specific book entry
const BOOK_ENTRY_PATTERN = /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/kasboek\.boekingen\/show\?id=([^&]+)/;
```

### 3. API Patterns
For features that intercept API calls:

```javascript
const API_ROUTE_PATTERN = /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/api\//;
```

## Feature Registration Best Practices

### 1. Use Descriptive Names
```javascript
const features = [
  {
    name: 'cardInfoStandard',  // Not just 'card'
    urlPattern: CARD_PATTERNS.standard,
    init: initCardFeature,
    cleanup: cleanupCardFeature
  }
];
```

### 2. Handle Exclusions Properly
```javascript
{
  name: 'entriesInfo',
  urlPattern: BOOK_ENTRY_PATTERN,
  init: loadEntriesFeature,
  excludes: ['bookInfo'], // Prevent conflicts
  cleanup: cleanupEntriesFeature
}
```

### 3. Implement Proper Cleanup
```javascript
{
  name: 'myFeature',
  urlPattern: /pattern/,
  init: function(match) {
    // Initialize feature
  },
  cleanup: function() {
    // Clean up DOM elements, event listeners, etc.
    // Always implement cleanup to prevent memory leaks
  }
}
```

## Testing Patterns

### 1. Unit Testing URLs
```javascript
import { testPatternAgainstUrls } from '../shared/url-patterns.js';

const pattern = /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/cards\/([^\/]+)/;
const testUrls = [
  'https://test.spend.cloud/cards/12345',
  'https://test.dev.spend.cloud/cards/67890',
  'https://example.spend.cloud/other/page'  // Should not match
];

const results = testPatternAgainstUrls(pattern, testUrls);
console.log(`Pass rate: ${results.summary.passRate}%`);
```

### 2. Testing in Browser Console
When developing, test patterns in the browser console:

```javascript
// Test current URL against pattern
const pattern = /your-pattern-here/;
const match = window.location.href.match(pattern);
console.log('Match result:', match);

// Test specificity
const specificity = window.PowerCloudLoggerFactory?.getLogger('Test')?.debug ? 
  window.calculatePatternSpecificity(pattern, window.location.href) : 
  'Debug mode not available';
console.log('Specificity:', specificity);
```

## Common Pitfalls

### 1. Forgetting Dev Environment
```javascript
// Wrong - only matches production
/https:\/\/([^.]+)\.spend\.cloud/

// Correct - matches both prod and dev
/https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud/
```

### 2. Overly Greedy Patterns
```javascript
// Wrong - too greedy, matches too much
/https:\/\/.*\.spend\.cloud.*/

// Better - more specific to your use case
/https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/specific\/path/
```

### 3. Not Handling URL Parameters
```javascript
// Consider if your pattern needs to handle URLs like:
// https://test.spend.cloud/cards/123?tab=details&view=full

// Pattern should account for trailing parameters:
/https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/cards\/([^\/\?]+)/
```

## Performance Considerations

### 1. Pattern Ordering
- More specific patterns should be listed first in feature arrays
- The FeatureManager sorts by specificity, but initial ordering helps

### 2. Caching
- Use `createPatternMatcher()` for frequently tested patterns
- The system includes built-in caching for better performance

```javascript
import { createPatternMatcher } from '../shared/url-patterns.js';

const cardMatcher = createPatternMatcher(CARD_PATTERNS.standard);

// This will be cached for subsequent calls
if (cardMatcher(window.location.href)) {
  // Handle card page
}
```

### 3. Avoiding RegExp Recreation
```javascript
// Good - define pattern once
const CARD_PATTERN = /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/cards\/([^\/]+)/;

function checkCardPage(url) {
  return CARD_PATTERN.test(url);
}

// Avoid - creates new RegExp each time
function checkCardPage(url) {
  return /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/cards\/([^\/]+)/.test(url);
}
```

## Migration Guide

### From Simple Patterns to Enhanced System

1. **Validate existing patterns** using `validateUrlPattern()`
2. **Test specificity** with `calculatePatternSpecificity()`
3. **Categorize URLs** with `categorizeUrl()` for better understanding
4. **Update feature registration** to use enhanced FeatureManager

### Example Migration
```javascript
// Before (Phase 1.2 and earlier)
const features = [
  {
    name: 'cardFeature',
    urlPattern: /simple-pattern/,
    init: function() { /* ... */ }
  }
];

// After (Phase 1.3+)
import { validateUrlPattern, CARD_PATTERNS } from '../shared/url-patterns.js';

// Validate the pattern first
const validation = validateUrlPattern(CARD_PATTERNS.standard);
if (validation.isValid) {
  const features = [
    {
      name: 'cardFeatureStandard',
      urlPattern: CARD_PATTERNS.standard,
      init: function(match) {
        const customer = match[1];
        const cardId = match[2];
        // Use extracted data
      },
      cleanup: function() {
        // Proper cleanup
      }
    }
  ];
}
```

## Debug Tools

### Enable Debug Mode
Set any of these to enable pattern debugging:
- URL parameter: `?powercloud-debug=true`
- Session storage: `sessionStorage.setItem('powercloud-debug', 'true')`
- Console: `window.PowerCloudDebug = true`

### Debug Panel Features
- Real-time URL categorization
- Pattern match testing
- Specificity calculation
- Feature status monitoring

### Console Helpers
When debug mode is enabled:
```javascript
// Check current URL category
window.PowerCloudURLHelper.categorize(window.location.href);

// Test pattern specificity
window.PowerCloudURLHelper.testSpecificity(pattern, url);

// Validate pattern
window.PowerCloudURLHelper.validate(pattern);
```

---

## Summary

Following these best practices will ensure:
- **Reliable pattern matching** across all spend.cloud environments
- **Optimal performance** through proper specificity and caching
- **Maintainable code** with clear pattern organization
- **Robust testing** through validation and testing utilities
- **Better debugging** through enhanced tooling

For more technical details, see the implementation in `shared/url-patterns.js` and examples in the feature files.
