/**
 * ES6 Module wrapper for url-patterns.js
 * This module provides ES6 exports by duplicating the core functionality
 * Content scripts use the window exports from url-patterns.js
 * Background scripts and popup use this ES6 module
 */

// Pattern constants
const DOMAIN_PATTERN = /^https?:\/\/([^\/]+\.spend\.cloud)\//;
const ANY_SPEND_CLOUD_DOMAIN = /^https?:\/\/[^\/]*\.spend\.cloud\//;
const API_ROUTE_PATTERN = /^https?:\/\/[^\/]+\.spend\.cloud\/api\//;

const CARD_PATTERNS = {
  list: /^https?:\/\/[^\/]+\.spend\.cloud\/administration\/cards(?:\/(?:\?.*)?)?$/,
  detail: /^https?:\/\/[^\/]+\.spend\.cloud\/administration\/cards\/(\d+)(?:\/(?:\?.*)?)?$/
};

const BOOK_PATTERN = /^https?:\/\/[^\/]+\.spend\.cloud\/book\/(\d+)(?:\/(?:\?.*)?)?$/;
const BOOK_ENTRY_PATTERN = /^https?:\/\/[^\/]+\.spend\.cloud\/book\/(\d+)\/entry\/(\d+)(?:\/(?:\?.*)?)?$/;

// Basic extraction functions
function isApiRoute(url) {
  return API_ROUTE_PATTERN.test(url);
}

function isSpendCloudDomain(url) {
  return ANY_SPEND_CLOUD_DOMAIN.test(url);
}

function extractCustomerDomain(url) {
  const match = url.match(DOMAIN_PATTERN);
  return match ? match[1] : null;
}

function extractCardInfo(url) {
  const listMatch = url.match(CARD_PATTERNS.list);
  if (listMatch) {
    return { type: 'list', cardId: null };
  }
  
  const detailMatch = url.match(CARD_PATTERNS.detail);
  if (detailMatch) {
    return { type: 'detail', cardId: parseInt(detailMatch[1], 10) };
  }
  
  return null;
}

function extractBookInfo(url) {
  const match = url.match(BOOK_PATTERN);
  if (match) {
    return { bookId: parseInt(match[1], 10) };
  }
  return null;
}

function extractEntryInfo(url) {
  const match = url.match(BOOK_ENTRY_PATTERN);
  if (match) {
    return { 
      bookId: parseInt(match[1], 10), 
      entryId: parseInt(match[2], 10) 
    };
  }
  return null;
}

// Phase 1.3 Enhancements
const URL_PATTERN_TYPES = {
  CARD: 'card',
  BOOK: 'book', 
  ENTRY: 'entry',
  API: 'api',
  DOMAIN: 'domain',
  OTHER: 'other'
};

const SPECIFICITY_WEIGHTS = {
  exact: 100,
  pattern: 50,
  domain: 25,
  generic: 10
};

function validateUrlPattern(pattern) {
  const validation = {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: []
  };

  if (!pattern || typeof pattern !== 'object') {
    validation.isValid = false;
    validation.errors.push('Pattern must be a non-null object');
    return validation;
  }

  return validation;
}

function calculatePatternSpecificity(pattern, url) {
  if (!pattern || !url) {
    return 0;
  }

  let specificity = 0;

  if (pattern.exact && pattern.exact === url) {
    specificity += SPECIFICITY_WEIGHTS.exact;
  }

  if (pattern.regex && pattern.regex.test && pattern.regex.test(url)) {
    specificity += SPECIFICITY_WEIGHTS.pattern;
  }

  if (pattern.domain && url.includes(pattern.domain)) {
    specificity += SPECIFICITY_WEIGHTS.domain;
  }

  return specificity;
}

function categorizeUrl(url) {
  if (CARD_PATTERNS.list.test(url) || CARD_PATTERNS.detail.test(url)) {
    return URL_PATTERN_TYPES.CARD;
  }
  
  if (BOOK_ENTRY_PATTERN.test(url)) {
    return URL_PATTERN_TYPES.ENTRY;
  }
  
  if (BOOK_PATTERN.test(url)) {
    return URL_PATTERN_TYPES.BOOK;
  }
  
  if (API_ROUTE_PATTERN.test(url)) {
    return URL_PATTERN_TYPES.API;
  }
  
  if (ANY_SPEND_CLOUD_DOMAIN.test(url)) {
    return URL_PATTERN_TYPES.DOMAIN;
  }
  
  return URL_PATTERN_TYPES.OTHER;
}

function findBestPatternMatch(patterns, url) {
  let bestMatch = null;
  let highestSpecificity = 0;

  for (const pattern of patterns) {
    const specificity = calculatePatternSpecificity(pattern, url);
    if (specificity > highestSpecificity) {
      highestSpecificity = specificity;
      bestMatch = pattern;
    }
  }

  return {
    pattern: bestMatch,
    specificity: highestSpecificity,
    isMatch: bestMatch !== null
  };
}

function createPatternMatcher(patterns) {
  return {
    match: (url) => findBestPatternMatch(patterns, url),
    test: (url) => findBestPatternMatch(patterns, url).isMatch,
    getCategory: categorizeUrl
  };
}

function testPatternAgainstUrls(pattern, urls) {
  const results = {
    passes: [],
    failures: [],
    summary: {},
    totalTests: urls.length
  };

  for (const url of urls) {
    const specificity = calculatePatternSpecificity(pattern, url);
    const isMatch = specificity > 0;
    
    if (isMatch) {
      results.passes.push({ url, specificity });
    } else {
      results.failures.push({ url, reason: 'No pattern match' });
    }
  }

  results.summary.passCount = results.passes.length;
  results.summary.failCount = results.failures.length;
  results.summary.passRate = Math.round((results.summary.passCount / results.totalTests) * 100);

  return results;
}

export {
  // Pattern constants
  DOMAIN_PATTERN,
  ANY_SPEND_CLOUD_DOMAIN,
  API_ROUTE_PATTERN,
  CARD_PATTERNS,
  BOOK_PATTERN,
  BOOK_ENTRY_PATTERN,
  
  // Basic extraction functions
  isApiRoute,
  isSpendCloudDomain,
  extractCustomerDomain,
  extractCardInfo,
  extractBookInfo,
  extractEntryInfo,
  
  // Phase 1.3 Enhancements
  URL_PATTERN_TYPES,
  SPECIFICITY_WEIGHTS,
  validateUrlPattern,
  calculatePatternSpecificity,
  categorizeUrl,
  findBestPatternMatch,
  createPatternMatcher,
  testPatternAgainstUrls
};
