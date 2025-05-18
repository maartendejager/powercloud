/**
 * Test module for API service
 * 
 * This module tests the shared API service functionality.
 */

import { getCardDetails, makeAuthenticatedRequest } from '../shared/api.js';

/**
 * Test the API service by making a request for card details
 * @param {string} customer - The customer subdomain
 * @param {string} cardId - The card ID to test with
 * @returns {Promise<Object>} The result of the test
 */
async function testApiService(customer, cardId) {
  console.log(`Testing API service with customer: ${customer}, cardId: ${cardId}`);
  
  try {
    const cardDetails = await getCardDetails(customer, cardId);
    console.log('API test successful!', cardDetails);
    return {
      success: true,
      data: cardDetails
    };
  } catch (error) {
    console.error('API test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export { testApiService };
