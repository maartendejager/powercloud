/**
 * Shared URL Pattern Utilities for PowerCloud Chrome Extension
 * 
 * This module provides centralized URL pattern matching functionality used across
 * different parts of the extension for consistent domain handling.
 */

/**
 * RegExp pattern that matches spend.cloud domains, including both
 * standard domains (https://[customer].spend.cloud/*) and 
 * development domains (https://[customer].dev.spend.cloud/*)
 * @type {RegExp}
 */
const DOMAIN_PATTERN = /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud/;

/**
 * RegExp pattern that matches any spend.cloud or dev.spend.cloud domain
 * @type {RegExp}
 */
const ANY_SPEND_CLOUD_DOMAIN = /.*\.spend\.cloud.*|.*\.dev\.spend\.cloud.*/;

/**
 * RegExp pattern that matches API routes on spend.cloud domains
 * @type {RegExp}
 */
const API_ROUTE_PATTERN = /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/api\//;

/**
 * Card-related URL patterns
 * @type {Object}
 */
const CARD_PATTERNS = {
  // Standard card URL
  standard: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/cards\/([^\/]+)(\/.*|$)/,
  // Proactive single card update URL
  proactive: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/data\.card\/single_card_update\?id=([^&]+)/,
  // Kasboek passen show URL
  kasboek: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/kasboek\.passen\/show\?id=([^&]+)/
};

/**
 * Book-related URL pattern
 * @type {RegExp}
 */
const BOOK_PATTERN = /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/kasboek\.boekingen\/([^\/]+)(\/.*|$)/;

/**
 * Book entry URL pattern for kasboek.boekingen/show?id=
 * @type {RegExp}
 */
const BOOK_ENTRY_PATTERN = /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/kasboek\.boekingen\/show\?id=([^&]+)/;

/**
 * Checks if a URL is an API route
 * @param {string} url - URL to check
 * @returns {boolean} True if the URL is an API route
 */
function isApiRoute(url) {
  return API_ROUTE_PATTERN.test(url);
}

/**
 * Checks if a URL matches any spend.cloud domain
 * @param {string} url - URL to check
 * @returns {boolean} True if the URL matches any spend.cloud domain
 */
function isSpendCloudDomain(url) {
  return ANY_SPEND_CLOUD_DOMAIN.test(url);
}

/**
 * Extracts customer subdomain from a spend.cloud URL
 * @param {string} url - URL to extract from
 * @returns {string|null} Customer subdomain or null if not found
 */
function extractCustomerDomain(url) {
  const match = url.match(DOMAIN_PATTERN);
  return match ? match[1] : null;
}

/**
 * Extracts card ID from a card URL if it matches any of the card patterns
 * @param {string} url - URL to extract from
 * @returns {Object|null} Object with customer and cardId, or null if not a card URL
 */
function extractCardInfo(url) {
  // Try each pattern
  for (const [type, pattern] of Object.entries(CARD_PATTERNS)) {
    const match = url.match(pattern);
    if (match) {
      return {
        type,
        customer: match[1],
        cardId: match[2]
      };
    }
  }
  return null;
}

/**
 * Extracts book ID from a book URL
 * @param {string} url - URL to extract from
 * @returns {Object|null} Object with customer and bookId, or null if not a book URL
 */
function extractBookInfo(url) {
  const match = url.match(BOOK_PATTERN);
  if (match) {
    return {
      customer: match[1],
      bookId: match[2]
    };
  }
  return null;
}

/**
 * Extracts entry ID from a book entry URL
 * @param {string} url - URL to extract from
 * @returns {Object|null} Object with customer and entryId, or null if not a book entry URL
 */
function extractEntryInfo(url) {
  const match = url.match(BOOK_ENTRY_PATTERN);
  if (match) {
    return {
      customer: match[1],
      entryId: match[2]
    };
  }
  return null;
}

/**
 * URL Pattern Utility Functions
 * Added in Phase 1.3 for enhanced URL pattern handling
 */

/**
 * URL Pattern Types for categorization
 * @enum {string}
 */
const URL_PATTERN_TYPES = {
  CARD: 'card',
  BOOK: 'book', 
  ENTRY: 'entry',
  API: 'api',
  DOMAIN: 'domain',
  UNKNOWN: 'unknown'
};

/**
 * Pattern specificity weights for different URL components
 * @type {Object}
 */
const SPECIFICITY_WEIGHTS = {
  QUERY_PARAM: 10,
  PATH_SEGMENT: 3,
  EXACT_MATCH: 5,
  WILDCARD_PENALTY: -2,
  LENGTH_BONUS: 0.05
};

/**
 * Validates if a URL pattern is properly formatted
 * @param {RegExp|string} pattern - Pattern to validate
 * @returns {Object} Validation result with isValid and errors array
 */
function validateUrlPattern(pattern) {
  const result = {
    isValid: true,
    errors: [],
    warnings: []
  };

  try {
    // Convert string to RegExp if needed
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    
    // Check for common issues
    const patternStr = regex.toString();
    
    // Check for unescaped special characters that might be mistakes
    if (patternStr.includes('.') && !patternStr.includes('\\.')) {
      result.warnings.push('Pattern contains unescaped dots - consider if these should be literal dots (\\.)');
    }
    
    // Check for overly broad patterns
    if (patternStr === '/.*/' || patternStr === '/.+/') {
      result.warnings.push('Pattern is very broad and may match unintended URLs');
    }
    
    // Check for spend.cloud domain specificity
    if (!patternStr.includes('spend\\.cloud') && !patternStr.includes('spend.cloud')) {
      result.warnings.push('Pattern does not appear to be spend.cloud specific');
    }
    
    // Test the pattern with a sample URL
    const testUrl = 'https://test.spend.cloud/test';
    regex.test(testUrl);
    
  } catch (error) {
    result.isValid = false;
    result.errors.push(`Invalid RegExp pattern: ${error.message}`);
  }
  
  return result;
}

/**
 * Enhanced pattern specificity calculation
 * @param {RegExp} pattern - The URL pattern to analyze
 * @param {string} url - The URL being matched (optional, for context-specific scoring)
 * @returns {number} Specificity score (higher = more specific)
 */
function calculatePatternSpecificity(pattern, url = '') {
  const patternStr = pattern.toString();
  let score = 0;
  
  // Count path segments (separated by forward slashes)
  const segments = (patternStr.match(/\//g) || []).length;
  score += segments * SPECIFICITY_WEIGHTS.PATH_SEGMENT;
  
  // Query parameters make patterns more specific
  if (patternStr.includes('\\?')) {
    score += SPECIFICITY_WEIGHTS.QUERY_PARAM;
  }
  
  // Penalize wildcards (less specific)
  const wildcards = (patternStr.match(/\.\*/g) || []).length;
  score += wildcards * SPECIFICITY_WEIGHTS.WILDCARD_PENALTY;
  
  // Penalize flexible quantifiers
  const flexQuantifiers = (patternStr.match(/[^\\]\+/g) || []).length;
  score += flexQuantifiers * SPECIFICITY_WEIGHTS.WILDCARD_PENALTY;
  
  // Bonus for exact character matches
  const exactChars = patternStr.replace(/[\[\](){}.*+?^$|\\]/g, '').length;
  score += exactChars * SPECIFICITY_WEIGHTS.LENGTH_BONUS;
  
  // Bonus for specific domain patterns
  if (patternStr.includes('spend\\.cloud')) {
    score += SPECIFICITY_WEIGHTS.EXACT_MATCH;
  }
  
  // Context-specific scoring if URL is provided
  if (url) {
    const match = url.match(pattern);
    if (match) {
      // Bonus for patterns that capture specific parts of the URL
      score += (match.length - 1) * 2; // Number of capture groups
    }
  }
  
  return Math.round(score * 100) / 100; // Round to 2 decimal places
}

/**
 * Categorizes a URL based on known patterns
 * @param {string} url - URL to categorize
 * @returns {Object} Category information with type, details, and confidence
 */
function categorizeUrl(url) {
  const result = {
    type: URL_PATTERN_TYPES.UNKNOWN,
    details: null,
    confidence: 0,
    matchedPattern: null
  };
  
  // Check card patterns first (most specific)
  const cardInfo = extractCardInfo(url);
  if (cardInfo) {
    result.type = URL_PATTERN_TYPES.CARD;
    result.details = cardInfo;
    result.confidence = 0.95;
    result.matchedPattern = CARD_PATTERNS[cardInfo.type];
    return result;
  }
  
  // Check entry pattern
  const entryInfo = extractEntryInfo(url);
  if (entryInfo) {
    result.type = URL_PATTERN_TYPES.ENTRY;
    result.details = entryInfo;
    result.confidence = 0.9;
    result.matchedPattern = BOOK_ENTRY_PATTERN;
    return result;
  }
  
  // Check book pattern
  const bookInfo = extractBookInfo(url);
  if (bookInfo) {
    result.type = URL_PATTERN_TYPES.BOOK;
    result.details = bookInfo;
    result.confidence = 0.85;
    result.matchedPattern = BOOK_PATTERN;
    return result;
  }
  
  // Check API route
  if (isApiRoute(url)) {
    result.type = URL_PATTERN_TYPES.API;
    result.details = { customer: extractCustomerDomain(url) };
    result.confidence = 0.8;
    result.matchedPattern = API_ROUTE_PATTERN;
    return result;
  }
  
  // Check general spend.cloud domain
  if (isSpendCloudDomain(url)) {
    result.type = URL_PATTERN_TYPES.DOMAIN;
    result.details = { customer: extractCustomerDomain(url) };
    result.confidence = 0.7;
    result.matchedPattern = ANY_SPEND_CLOUD_DOMAIN;
    return result;
  }
  
  return result;
}

/**
 * Finds the best matching pattern from a set of patterns
 * @param {string} url - URL to match against
 * @param {Array<{pattern: RegExp, name: string}>} patterns - Array of pattern objects
 * @returns {Object|null} Best match with pattern info and specificity score
 */
function findBestPatternMatch(url, patterns) {
  const matches = [];
  
  for (const patternInfo of patterns) {
    const match = url.match(patternInfo.pattern);
    if (match) {
      const specificity = calculatePatternSpecificity(patternInfo.pattern, url);
      matches.push({
        ...patternInfo,
        match,
        specificity,
        captureGroups: match.slice(1) // Exclude the full match
      });
    }
  }
  
  if (matches.length === 0) {
    return null;
  }
  
  // Sort by specificity (descending) and return the best match
  matches.sort((a, b) => b.specificity - a.specificity);
  return matches[0];
}

/**
 * Creates a pattern matcher function with caching for performance
 * @param {RegExp} pattern - Pattern to create matcher for
 * @returns {Function} Matcher function that tests URLs against the pattern
 */
function createPatternMatcher(pattern) {
  const cache = new Map();
  const maxCacheSize = 100;
  
  return function matchUrl(url) {
    // Check cache first
    if (cache.has(url)) {
      return cache.get(url);
    }
    
    // Test the pattern
    const result = pattern.test(url);
    
    // Cache the result (with size limit)
    if (cache.size >= maxCacheSize) {
      // Remove oldest entry
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    cache.set(url, result);
    
    return result;
  };
}

/**
 * Utility to test multiple URLs against a pattern for validation
 * @param {RegExp} pattern - Pattern to test
 * @param {Array<string>} testUrls - URLs to test against
 * @returns {Object} Test results with passes, failures, and summary
 */
function testPatternAgainstUrls(pattern, testUrls) {
  const results = {
    pattern: pattern.toString(),
    totalTests: testUrls.length,
    passes: [],
    failures: [],
    summary: {
      passCount: 0,
      failCount: 0,
      passRate: 0
    }
  };
  
  for (const url of testUrls) {
    try {
      const match = pattern.test(url);
      if (match) {
        results.passes.push(url);
      } else {
        results.failures.push(url);
      }
    } catch (error) {
      results.failures.push({ url, error: error.message });
    }
  }
  
  results.summary.passCount = results.passes.length;
  results.summary.failCount = results.failures.length;
  results.summary.passRate = Math.round((results.summary.passCount / results.totalTests) * 100);
  
  return results;
}

// Export all patterns and functions for browser extension environment
if (typeof window !== 'undefined') {
  // Pattern constants
  window.DOMAIN_PATTERN = DOMAIN_PATTERN;
  window.ANY_SPEND_CLOUD_DOMAIN = ANY_SPEND_CLOUD_DOMAIN;
  window.API_ROUTE_PATTERN = API_ROUTE_PATTERN;
  window.CARD_PATTERNS = CARD_PATTERNS;
  window.BOOK_PATTERN = BOOK_PATTERN;
  window.BOOK_ENTRY_PATTERN = BOOK_ENTRY_PATTERN;
  
  // Basic extraction functions
  window.isApiRoute = isApiRoute;
  window.isSpendCloudDomain = isSpendCloudDomain;
  window.extractCustomerDomain = extractCustomerDomain;
  window.extractCardInfo = extractCardInfo;
  window.extractBookInfo = extractBookInfo;
  window.extractEntryInfo = extractEntryInfo;
  
  // Phase 1.3 Enhancements
  window.URL_PATTERN_TYPES = URL_PATTERN_TYPES;
  window.SPECIFICITY_WEIGHTS = SPECIFICITY_WEIGHTS;
  window.validateUrlPattern = validateUrlPattern;
  window.calculatePatternSpecificity = calculatePatternSpecificity;
  window.categorizeUrl = categorizeUrl;
  window.findBestPatternMatch = findBestPatternMatch;
  window.createPatternMatcher = createPatternMatcher;
  window.testPatternAgainstUrls = testPatternAgainstUrls;
}
