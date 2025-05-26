# Token Terminology Clarification

## Overview
This document clarifies the terminology used in the PowerCloud Chrome extension regarding authentication tokens, specifically the distinction between **tenants** and **environment types**.

> **Related Documentation**: 
> - [Token Display Enhancement](./token-tenant-display-fix.md): Describes fixes to ensure tenant names are correctly displayed in the UI

## Key Terminology

### Tenant (Client Environment)
- **Definition**: A specific organization or account on the platform, identified by the subdomain.
- **Examples**: "customer1", "acme-corp", "tesla", etc.
- **In the Code**: Stored as `clientEnvironment` property of tokens
- **UI Display**: Shown prominently at the top of each token card
- **Sources**:
  - **JWT Payload**: Extracted from the `client` field in the JWT payload when available (primary source)
  - **URL Pattern**: Extracted from URLs following the pattern `https://[tenant-name].spend.cloud/...` (fallback source)

### Environment Type
- **Definition**: Whether the token is for a development or production environment
- **Values**: Development (true) or Production (false)
- **In the Code**: Stored as `isDevRoute` boolean property
- **UI Display**: Shown as a colored badge - orange for Development, green for Production
- **Determination**: Based on URL patterns containing `.dev.`, `dev-`, or `localhost`

## Metrics Clarification

The "Tenants" metric in the token dashboard counts the number of unique tenant names (clientEnvironment values) represented in your captured tokens, not the number of environment types.

## Code Examples

### Extracting Tenant Name
```javascript
function extractClientEnvironment(url) {
  // Extract the tenant name from URL
  const match = url.match(/https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud/);
  return match ? match[1] : 'unknown';
}
```

### Determining Environment Type
```javascript
function isDevelopmentRoute(url) {
  return url.includes('localhost') || 
         url.includes('.dev.') || 
         url.includes('dev-');
}
```

## Best Practices

When adding new features or fixing bugs:

1. Always use "tenant" or "tenant name" when referring to the client organization (clientEnvironment)
2. Use "environment type" or specifically "development"/"production" when referring to the isDevRoute distinction
3. Avoid using just "environment" without qualification, as it can be ambiguous
