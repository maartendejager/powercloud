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

// Export all patterns and functions
export {
  DOMAIN_PATTERN,
  ANY_SPEND_CLOUD_DOMAIN,
  API_ROUTE_PATTERN,
  CARD_PATTERNS,
  BOOK_PATTERN,
  isApiRoute,
  isSpendCloudDomain,
  extractCustomerDomain,
  extractCardInfo,
  extractBookInfo
};
