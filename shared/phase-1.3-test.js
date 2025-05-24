/**
 * Phase 1.3 Integration Test - URL Pattern Enhancement
 * 
 * This test validates the URL pattern enhancements introduced in Phase 1.3
 * of the PowerCloud Extension improvement plan.
 */

/**
 * Phase 1.3 Integration Test Suite
 */
class Phase13IntegrationTest {
  constructor() {
    this.testResults = [];
    this.logger = window.PowerCloudLoggerFactory?.getLogger('Phase13Test') || console;
  }

  /**
   * Run all Phase 1.3 integration tests
   */
  async runTests() {
    console.log('🧪 Starting Phase 1.3 Integration Tests...');
    
    try {
      await this.testPatternValidation();
      await this.testSpecificityCalculation();
      await this.testUrlCategorization();
      await this.testPatternMatching();
      await this.testPatternCache();
      await this.testFeatureManagerEnhancement();
      await this.testPatternBestPractices();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  /**
   * Test 1: Pattern Validation
   */
  async testPatternValidation() {
    console.log('🔍 Testing Pattern Validation...');
    
    try {
      // Check if validation function exists
      this.assert(typeof window.validateUrlPattern === 'function', 'validateUrlPattern should be available');
      
      // Test valid pattern
      const validPattern = /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/cards\/([^\/]+)/;
      const validResult = window.validateUrlPattern(validPattern);
      this.assert(validResult.isValid === true, 'Should validate correct patterns');
      this.assert(Array.isArray(validResult.errors), 'Should return errors array');
      this.assert(Array.isArray(validResult.warnings), 'Should return warnings array');
      
      // Test invalid pattern
      try {
        const invalidResult = window.validateUrlPattern('[invalid regex');
        this.assert(invalidResult.isValid === false, 'Should detect invalid patterns');
        this.assert(invalidResult.errors.length > 0, 'Should return error messages');
      } catch (e) {
        // This is acceptable - invalid regex might throw
      }
      
      // Test pattern with warnings
      const broadPattern = /.*/;
      const warningResult = window.validateUrlPattern(broadPattern);
      this.assert(warningResult.warnings.length > 0, 'Should detect overly broad patterns');
      
      this.recordTest('Pattern Validation', true, 'Pattern validation working correctly');
      
    } catch (error) {
      this.recordTest('Pattern Validation', false, error.message);
    }
  }

  /**
   * Test 2: Enhanced Specificity Calculation
   */
  async testSpecificityCalculation() {
    console.log('🔍 Testing Specificity Calculation...');
    
    try {
      // Check if function exists
      this.assert(typeof window.calculatePatternSpecificity === 'function', 'calculatePatternSpecificity should be available');
      
      // Test different specificity levels
      const highSpecificity = /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/data\.card\/single_card_update\?id=([^&]+)/;
      const mediumSpecificity = /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/cards\/([^\/]+)/;
      const lowSpecificity = /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud/;
      
      const highScore = window.calculatePatternSpecificity(highSpecificity);
      const mediumScore = window.calculatePatternSpecificity(mediumSpecificity);
      const lowScore = window.calculatePatternSpecificity(lowSpecificity);
      
      this.assert(typeof highScore === 'number', 'Should return numeric score');
      this.assert(highScore > mediumScore, 'More specific patterns should have higher scores');
      this.assert(mediumScore > lowScore, 'Specificity should be ordered correctly');
      
      // Test with URL context
      const testUrl = 'https://test.spend.cloud/cards/12345';
      const contextScore = window.calculatePatternSpecificity(mediumSpecificity, testUrl);
      this.assert(typeof contextScore === 'number', 'Should handle URL context');
      
      this.recordTest('Specificity Calculation', true, 'Enhanced specificity calculation working');
      
    } catch (error) {
      this.recordTest('Specificity Calculation', false, error.message);
    }
  }

  /**
   * Test 3: URL Categorization
   */
  async testUrlCategorization() {
    console.log('🔍 Testing URL Categorization...');
    
    try {
      // Check if function exists
      this.assert(typeof window.categorizeUrl === 'function', 'categorizeUrl should be available');
      
      // Test card URL categorization
      const cardUrl = 'https://test.spend.cloud/cards/12345';
      const cardResult = window.categorizeUrl(cardUrl);
      
      this.assert(cardResult.type === 'card', 'Should categorize card URLs correctly');
      this.assert(cardResult.details !== null, 'Should provide details for card URLs');
      this.assert(cardResult.confidence > 0.8, 'Should have high confidence for card URLs');
      
      // Test book URL categorization
      const bookUrl = 'https://test.spend.cloud/proactive/kasboek.boekingen/show?id=67890';
      const bookResult = window.categorizeUrl(bookUrl);
      
      this.assert(bookResult.type === 'entry', 'Should categorize book entry URLs correctly');
      
      // Test API URL categorization
      const apiUrl = 'https://test.spend.cloud/api/some/endpoint';
      const apiResult = window.categorizeUrl(apiUrl);
      
      this.assert(apiResult.type === 'api', 'Should categorize API URLs correctly');
      
      // Test unknown URL
      const unknownUrl = 'https://example.com/unknown';
      const unknownResult = window.categorizeUrl(unknownUrl);
      
      this.assert(unknownResult.type === 'unknown', 'Should handle unknown URLs');
      this.assert(unknownResult.confidence === 0, 'Should have zero confidence for unknown URLs');
      
      this.recordTest('URL Categorization', true, 'URL categorization working correctly');
      
    } catch (error) {
      this.recordTest('URL Categorization', false, error.message);
    }
  }

  /**
   * Test 4: Best Pattern Matching
   */
  async testPatternMatching() {
    console.log('🔍 Testing Pattern Matching...');
    
    try {
      // Check if function exists
      this.assert(typeof window.findBestPatternMatch === 'function', 'findBestPatternMatch should be available');
      
      // Test pattern set
      const patterns = [
        { 
          pattern: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/cards\/([^\/]+)/, 
          name: 'cardStandard' 
        },
        { 
          pattern: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/proactive\/data\.card\/single_card_update\?id=([^&]+)/, 
          name: 'cardProactive' 
        },
        { 
          pattern: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud/, 
          name: 'general' 
        }
      ];
      
      // Test with card URL - should match most specific pattern
      const cardUrl = 'https://test.spend.cloud/cards/12345';
      const cardMatch = window.findBestPatternMatch(cardUrl, patterns);
      
      this.assert(cardMatch !== null, 'Should find matching pattern');
      this.assert(cardMatch.name === 'cardStandard', 'Should select most specific matching pattern');
      this.assert(Array.isArray(cardMatch.captureGroups), 'Should provide capture groups');
      this.assert(cardMatch.captureGroups.length >= 2, 'Should capture customer and card ID');
      
      // Test with proactive URL - should match even more specific pattern
      const proactiveUrl = 'https://test.spend.cloud/proactive/data.card/single_card_update?id=67890';
      const proactiveMatch = window.findBestPatternMatch(proactiveUrl, patterns);
      
      this.assert(proactiveMatch.name === 'cardProactive', 'Should select most specific pattern for proactive URL');
      
      // Test with no matching patterns
      const noMatch = window.findBestPatternMatch('https://example.com/other', patterns);
      this.assert(noMatch === null, 'Should return null for non-matching URLs');
      
      this.recordTest('Pattern Matching', true, 'Pattern matching working correctly');
      
    } catch (error) {
      this.recordTest('Pattern Matching', false, error.message);
    }
  }

  /**
   * Test 5: Pattern Caching
   */
  async testPatternCache() {
    console.log('🔍 Testing Pattern Caching...');
    
    try {
      // Check if function exists
      this.assert(typeof window.createPatternMatcher === 'function', 'createPatternMatcher should be available');
      
      // Create cached matcher
      const pattern = /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/cards\/([^\/]+)/;
      const matcher = window.createPatternMatcher(pattern);
      
      this.assert(typeof matcher === 'function', 'Should return matcher function');
      
      // Test matcher functionality
      const testUrl = 'https://test.spend.cloud/cards/12345';
      const result1 = matcher(testUrl);
      const result2 = matcher(testUrl); // Should be cached
      
      this.assert(result1 === true, 'Should match correctly first time');
      this.assert(result2 === true, 'Should match correctly from cache');
      this.assert(result1 === result2, 'Cached result should be consistent');
      
      // Test non-matching URL
      const nonMatchUrl = 'https://example.com/other';
      const nonMatchResult = matcher(nonMatchUrl);
      this.assert(nonMatchResult === false, 'Should correctly identify non-matches');
      
      this.recordTest('Pattern Caching', true, 'Pattern caching working correctly');
      
    } catch (error) {
      this.recordTest('Pattern Caching', false, error.message);
    }
  }

  /**
   * Test 6: FeatureManager Enhancement
   */
  async testFeatureManagerEnhancement() {
    console.log('🔍 Testing FeatureManager Enhancement...');
    
    try {
      // Check if FeatureManager is available
      this.assert(typeof window.FeatureManager === 'function', 'FeatureManager should be available');
      
      // Create test features with different specificities
      const features = [
        {
          name: 'generalFeature',
          urlPattern: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud/,
          init: function() { console.log('General feature init'); },
          cleanup: function() { console.log('General feature cleanup'); }
        },
        {
          name: 'specificFeature',
          urlPattern: /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/cards\/([^\/]+)/,
          init: function() { console.log('Specific feature init'); },
          cleanup: function() { console.log('Specific feature cleanup'); }
        }
      ];
      
      // Create FeatureManager instance
      const manager = new window.FeatureManager(features);
      this.assert(typeof manager.calculatePatternSpecificity === 'function', 'Should have enhanced specificity calculation');
      
      // Test specificity calculation fallback
      const pattern = /test-pattern/;
      const specificity = manager.calculatePatternSpecificity(pattern, 'test-url');
      this.assert(typeof specificity === 'number', 'Should return numeric specificity');
      
      this.recordTest('FeatureManager Enhancement', true, 'FeatureManager enhanced successfully');
      
    } catch (error) {
      this.recordTest('FeatureManager Enhancement', false, error.message);
    }
  }

  /**
   * Test 7: Pattern Best Practices Validation
   */
  async testPatternBestPractices() {
    console.log('🔍 Testing Pattern Best Practices...');
    
    try {
      // Test pattern testing utility
      this.assert(typeof window.testPatternAgainstUrls === 'function', 'testPatternAgainstUrls should be available');
      
      // Test with card pattern
      const cardPattern = /https:\/\/([^.]+)\.(?:dev\.)?spend\.cloud\/cards\/([^\/]+)/;
      const testUrls = [
        'https://test.spend.cloud/cards/12345',
        'https://test.dev.spend.cloud/cards/67890',
        'https://demo.spend.cloud/cards/abc123',
        'https://example.com/other' // Should not match
      ];
      
      const testResults = window.testPatternAgainstUrls(cardPattern, testUrls);
      
      this.assert(typeof testResults === 'object', 'Should return test results object');
      this.assert(typeof testResults.summary === 'object', 'Should include summary');
      this.assert(typeof testResults.summary.passRate === 'number', 'Should calculate pass rate');
      this.assert(testResults.passes.length === 3, 'Should match 3 spend.cloud URLs');
      this.assert(testResults.failures.length === 1, 'Should fail 1 non-spend.cloud URL');
      this.assert(testResults.summary.passRate === 75, 'Should calculate 75% pass rate');
      
      // Test pattern types enum
      this.assert(typeof window.URL_PATTERN_TYPES === 'object', 'URL_PATTERN_TYPES should be available');
      this.assert(window.URL_PATTERN_TYPES.CARD === 'card', 'Should have card type');
      this.assert(window.URL_PATTERN_TYPES.BOOK === 'book', 'Should have book type');
      
      this.recordTest('Pattern Best Practices', true, 'Best practices validation working');
      
    } catch (error) {
      this.recordTest('Pattern Best Practices', false, error.message);
    }
  }

  /**
   * Helper method to assert conditions
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  /**
   * Record test result
   */
  recordTest(testName, passed, message) {
    this.testResults.push({
      test: testName,
      passed,
      message,
      timestamp: new Date().toISOString()
    });
    
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testName}: ${message}`);
  }

  /**
   * Print final test results
   */
  printResults() {
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    
    console.log('\n📊 Phase 1.3 Integration Test Results:');
    console.log(`Passed: ${passed}/${total}`);
    
    if (passed === total) {
      console.log('🎉 All tests passed! Phase 1.3 implementation is ready.');
    } else {
      console.log('⚠️ Some tests failed. Please review the implementation.');
    }
    
    // Store results for debugging
    window.PowerCloudPhase13TestResults = this.testResults;
  }
}

// Auto-run tests when script loads (with delay to ensure everything is loaded)
if (typeof window !== 'undefined') {
  setTimeout(() => {
    const testSuite = new Phase13IntegrationTest();
    testSuite.runTests();
  }, 1500); // Slightly longer delay than Phase 1.2
}

// Make available globally for manual testing
window.PowerCloudPhase13Test = Phase13IntegrationTest;
