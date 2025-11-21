#!/usr/bin/env node

/**
 * PowerCloud Extension Test Runner
 * 
 * Runs all automated tests and reports results.
 * 
 * Usage:
 *   node testing/run-all-tests.js
 *   npm test
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir } from 'fs/promises';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Test Suite Configuration
 */
const testSuites = {
  unit: {
    name: 'Unit Tests',
    files: [
      'unit-tests.js',
      'base-feature-test.js',
      'test-framework.js'
    ]
  },
  validation: {
    name: 'Validation Tests',
    files: [
      'validate-token-terminology.js',
      'token-tenant-extraction-validator.js',
      'metrics-grid-validator.js',
      'auth-error-handling-validation.js'
    ]
  },
  integration: {
    name: 'Integration Tests',
    directory: 'integration',
    files: [
      'test-health-api.js',
      'test-404-handling.js',
      'test-auth-improvement.js',
      'test-auth-status.js',
      'test-health-fix.js'
    ]
  },
  features: {
    name: 'Feature Tests',
    files: [
      'adyen-features-test.js',
      'button-visibility-toggle-test.js',
      'content-script-tests.js',
      'background-integration-tests.js'
    ]
  },
  phases: {
    name: 'Phase Tests',
    files: [
      'validate-phase-4.1.js',
      'validate-phase-5.2.js',
      'phase-1.2-test.js',
      'phase-1.3-test.js',
      'phase-2.2-tests.js'
    ]
  }
};

/**
 * Run a single test file
 * @param {string} testPath - Path to test file
 * @returns {Promise<{success: boolean, output: string, duration: number}>}
 */
async function runTest(testPath) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const child = spawn('node', [testPath], {
      stdio: 'pipe',
      cwd: join(__dirname, '..')
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      resolve({
        success: code === 0,
        output: output + errorOutput,
        duration
      });
    });

    child.on('error', (error) => {
      const duration = Date.now() - startTime;
      resolve({
        success: false,
        output: `Error running test: ${error.message}`,
        duration
      });
    });
  });
}

/**
 * Run a test suite
 * @param {string} suiteName - Suite name
 * @param {Object} suite - Suite configuration
 * @returns {Promise<{passed: number, failed: number, skipped: number}>}
 */
async function runSuite(suiteName, suite) {
  console.log(`\n${colors.bright}${colors.cyan}━━━ ${suite.name} ━━━${colors.reset}\n`);

  const results = { passed: 0, failed: 0, skipped: 0 };
  const baseDir = suite.directory ? join(__dirname, suite.directory) : __dirname;

  for (const file of suite.files) {
    const testPath = join(baseDir, file);
    const displayName = suite.directory ? `${suite.directory}/${file}` : file;

    process.stdout.write(`  ${displayName.padEnd(50, '.')} `);

    try {
      const result = await runTest(testPath);

      if (result.success) {
        console.log(`${colors.green}✓ PASS${colors.reset} (${result.duration}ms)`);
        results.passed++;
      } else {
        console.log(`${colors.red}✗ FAIL${colors.reset} (${result.duration}ms)`);
        results.failed++;
        
        // Show error output
        if (result.output) {
          console.log(`${colors.red}    ${result.output.split('\n').join('\n    ')}${colors.reset}`);
        }
      }
    } catch (error) {
      console.log(`${colors.yellow}⊘ SKIP${colors.reset} (${error.message})`);
      results.skipped++;
    }
  }

  return results;
}

/**
 * Main test runner
 */
async function main() {
  console.log(`${colors.bright}${colors.blue}`);
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   PowerCloud Extension - Test Runner          ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);

  const startTime = Date.now();
  const totalResults = { passed: 0, failed: 0, skipped: 0 };

  // Run all test suites
  for (const [suiteName, suite] of Object.entries(testSuites)) {
    const results = await runSuite(suiteName, suite);
    totalResults.passed += results.passed;
    totalResults.failed += results.failed;
    totalResults.skipped += results.skipped;
  }

  // Summary
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
  const totalTests = totalResults.passed + totalResults.failed + totalResults.skipped;

  console.log(`\n${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}Test Summary:${colors.reset}`);
  console.log(`  Total:   ${totalTests} tests`);
  console.log(`  ${colors.green}Passed:  ${totalResults.passed}${colors.reset}`);
  console.log(`  ${colors.red}Failed:  ${totalResults.failed}${colors.reset}`);
  console.log(`  ${colors.yellow}Skipped: ${totalResults.skipped}${colors.reset}`);
  console.log(`  Time:    ${totalTime}s`);
  console.log(`${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  // Exit with appropriate code
  process.exit(totalResults.failed > 0 ? 1 : 0);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
  });
}

export { runTest, runSuite };

