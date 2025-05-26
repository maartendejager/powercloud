/**
 * Responsive Styles Test
 * 
 * This script simulates different viewport sizes to test the responsive
 * behavior of the metrics grid.
 */

function testResponsiveMetricsGrid() {
  console.log('🧪 Testing responsive behavior of metrics grid...');
  
  // Store original viewport dimensions
  const originalWidth = window.innerWidth;
  const originalHeight = window.innerHeight;
  
  console.log(`Current viewport: ${originalWidth}px × ${originalHeight}px`);
  
  // Create test function for various widths
  function testViewportWidth(width) {
    console.log(`Testing viewport width: ${width}px`);
    
    // This is just a simulation - in a real browser environment,
    // you would need to use browser dev tools to resize the viewport
    console.log(`At ${width}px, metrics grid should have ${width <= 400 ? '2' : '4'} columns`);
    
    // Additional checks could be performed here if we could actually resize the window
    // For a real test, this would need to be done manually or with a proper testing framework
  }
  
  // Test various widths
  [800, 600, 400, 320].forEach(testViewportWidth);
  
  console.log('📱 For a proper test:');
  console.log('1. Open browser developer tools');
  console.log('2. Use responsive design mode or device toolbar');
  console.log('3. Test with various device widths (especially below 400px)');
  console.log('4. Verify that metrics grid changes from 4 columns to 2 columns at small sizes');
  
  return 'Responsive behavior simulation complete. See developer tools for manual testing.';
}

// Execute the test
testResponsiveMetricsGrid();
