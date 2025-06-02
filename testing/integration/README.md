# Integration Testing Files

This directory contains integration tests for the PowerCloud extension components.

## Contents

- **test-404-handling.js** - Tests error handling for 404 scenarios
- **test-auth-improvement.js** - Authentication improvement integration tests
- **test-auth-status.js** - Authentication status checking tests
- **test-button-id-fix.cjs** - Button ID fix integration tests (CommonJS)
- **test-button-id-fix.js** - Button ID fix integration tests (ES modules)
- **test-health-api.js** - Health API integration tests
- **test-health-fix.js** - Health system fix validation
- **test-removebutton-fix.js** - Button removal functionality tests
- **test-singleton.js** - Singleton pattern implementation tests
- **test-url-fix.js** - URL handling fix tests
- **test-view-entry-card-fixes.js** - View entry card functionality tests

## Purpose

Integration tests verify that different components of the extension work together correctly:
- API integrations function properly
- Authentication flows work end-to-end
- UI components interact correctly with backend services
- Error handling works across component boundaries

## Usage

These tests are designed to run in the browser environment with the extension loaded. They test actual integration scenarios rather than isolated units.

## Guidelines

- Focus on testing interactions between components
- Include error scenarios and edge cases
- Test with realistic data and scenarios
- Verify that fixes don't break existing functionality
