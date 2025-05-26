/**
 * Token Tenant Extraction Validator
 * 
 * This utility helps validate that tenant names are correctly extracted from tokens
 * and displayed in the UI. It's intended as a debugging aid to ensure the correct
 * tenant is shown in token cards.
 */

// Function to validate token tenant extraction from both URL and JWT
function validateTokenTenantExtraction(tokenObj) {
  console.group('Token Tenant Extraction Validation');

  // Extract tenant from URL
  console.log('Token URL:', tokenObj.url);
  const urlTenant = extractTenantFromUrl(tokenObj.url);
  console.log('Tenant extracted from URL:', urlTenant);

  // Extract tenant from JWT payload
  console.log('JWT Payload analysis:');
  const jwtTenant = extractTenantFromJwt(tokenObj.token);
  console.log('Tenant extracted from JWT payload:', jwtTenant);

  // Check what's stored in the token
  console.log('Stored clientEnvironment value:', tokenObj.clientEnvironment);

  // Final decision on what tenant should be displayed
  const finalTenant = jwtTenant || urlTenant || tokenObj.clientEnvironment || 'Unknown';
  console.log('Final tenant that should be displayed:', finalTenant);
  
  // Check if there's a mismatch
  if (finalTenant !== tokenObj.clientEnvironment) {
    console.warn('⚠️ MISMATCH: The stored clientEnvironment does not match the expected tenant name!');
  } else {
    console.log('✓ MATCH: The stored clientEnvironment matches the expected tenant name.');
  }

  console.groupEnd();
  return {
    fromUrl: urlTenant,
    fromJwt: jwtTenant,
    stored: tokenObj.clientEnvironment,
    recommended: finalTenant,
    hasMismatch: finalTenant !== tokenObj.clientEnvironment
  };
}

// Extract tenant from URL
function extractTenantFromUrl(url) {
  try {
    const match = url.match(/https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud/);
    return match ? match[1] : null;
  } catch (e) {
    console.error('Error extracting tenant from URL:', e);
    return null;
  }
}

// Extract tenant from JWT payload
function extractTenantFromJwt(token) {
  if (!token) return null;
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    
    // Look for tenant name in common fields
    if (payload.client) {
      return payload.client;
    } else if (payload.tenant) {
      return payload.tenant;
    } else if (payload.iss && typeof payload.iss === 'string') {
      // Sometimes the issuer contains the tenant name (e.g., "tenant-api")
      const issMatch = payload.iss.match(/^([^-]+)-api/);
      if (issMatch) return issMatch[1];
    }
    
    return null;
  } catch (e) {
    console.error('Error extracting tenant from JWT:', e);
    return null;
  }
}

// Utility function to validate a specific token
function validateToken(token) {
  return validateTokenTenantExtraction(token);
}

// Utility function to validate all tokens
async function validateAllTokens() {
  try {
    // Get all tokens using the extension's API
    const tokens = await window.getAllTokens();
    
    console.group('Validating all tokens');
    console.log(`Found ${tokens.length} tokens to validate`);
    
    const results = tokens.map((token, index) => {
      console.group(`Token #${index + 1}`);
      const result = validateTokenTenantExtraction(token);
      console.groupEnd();
      return result;
    });
    
    // Summary
    const mismatches = results.filter(r => r.hasMismatch);
    console.log(`Validation complete. Found ${mismatches.length} mismatches out of ${tokens.length} tokens.`);
    
    if (mismatches.length > 0) {
      console.warn('⚠️ Some tokens have mismatched tenant names. Consider updating them.');
    } else {
      console.log('✓ All tokens have correct tenant names.');
    }
    
    console.groupEnd();
    return results;
  } catch (e) {
    console.error('Error validating tokens:', e);
    return [];
  }
}

// Export functions if in a module environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateToken,
    validateAllTokens,
    validateTokenTenantExtraction,
    extractTenantFromUrl,
    extractTenantFromJwt
  };
}

// Make functions available in browser environment
if (typeof window !== 'undefined') {
  window.validateToken = validateToken;
  window.validateAllTokens = validateAllTokens;
  window.validateTokenTenantExtraction = validateTokenTenantExtraction;
}

console.log('Token Tenant Extraction Validator loaded. Use validateAllTokens() to check all tokens.');
