# Validation Testing Files

This directory contains validation scripts and test utilities for the PowerCloud extension.

## Contents

- **validate-adyen-entries-integration.js** - Validates Adyen entries integration functionality
- **validate-adyen-entries-simple.cjs** - Simple CommonJS validation for Adyen entries
- **validate-button-fixes.js** - Button functionality validation tests
- **validate-button-id-fix.cjs** - Button ID fix validation (CommonJS)
- **validate-multi-button-integration.js** - Multi-button layout validation

## Purpose

These validation scripts verify that:
- Features work correctly after changes
- Integration points function as expected
- Bug fixes resolve the intended issues
- No regressions are introduced

## Usage

Run these scripts to validate specific functionality:

```bash
node validate-adyen-entries-simple.cjs
node validate-button-id-fix.cjs
```

For JavaScript files, load them in the browser console or include them in test pages.

## Guidelines

- Run relevant validation scripts before committing changes
- Add new validation scripts for new features or bug fixes
- Keep validation logic focused and specific to avoid false positives
