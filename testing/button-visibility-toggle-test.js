/**
 * Button Visibility Toggle Test
 * 
 * This script can be run in the extension's popup.js context to validate that
 * the "Show buttons on page" toggle works correctly without errors.
 */

function testButtonVisibilityToggle() {
  console.log('🧪 Testing button visibility toggle...');
  
  // Get the current state of the toggle
  const toggle = document.getElementById('show-buttons-toggle');
  if (!toggle) {
    console.error('❌ Toggle element not found!');
    return;
  }
  
  console.log(`Current toggle state: ${toggle.checked ? 'ON' : 'OFF'}`);
  
  // Create a function to simulate toggling
  const simulateToggle = (newState) => {
    console.log(`Toggling to ${newState ? 'ON' : 'OFF'}...`);
    
    // Update the checkbox state
    toggle.checked = newState;
    
    // Manually dispatch the change event
    const event = new Event('change');
    toggle.dispatchEvent(event);
    
    console.log(`Toggle event dispatched. Current state: ${toggle.checked ? 'ON' : 'OFF'}`);
  };
  
  // Toggle to the opposite state, then back after 2 seconds
  const originalState = toggle.checked;
  
  console.log('Testing toggle (first toggle)...');
  simulateToggle(!originalState);
  
  setTimeout(() => {
    console.log('Testing toggle (returning to original state)...');
    simulateToggle(originalState);
    console.log('✅ Test completed successfully if no errors appeared');
  }, 2000);
  
  return 'Test running... Check console for errors.';
}

// Execute the test
testButtonVisibilityToggle();
