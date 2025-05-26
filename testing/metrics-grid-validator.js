/**
 * Metrics Grid Styling Validator
 * 
 * This script validates that the metrics grid styling has been correctly applied.
 * It can be run in the browser console to check if the styling meets requirements.
 */

function validateMetricsGridStyling() {
  console.log('🧪 Validating metrics grid styling...');
  
  // Check if metric cards exist
  const metricCards = document.querySelectorAll('.metric-card');
  if (metricCards.length === 0) {
    console.error('❌ No metric cards found in the document');
    return false;
  }
  
  console.log(`✅ Found ${metricCards.length} metric cards`);
  
  // Check for flexbox styling on metric cards
  const firstCard = metricCards[0];
  const cardStyle = window.getComputedStyle(firstCard);
  
  if (cardStyle.display !== 'flex') {
    console.error('❌ Metric cards are not using flexbox layout');
  } else {
    console.log('✅ Metric cards are using flexbox layout');
  }
  
  // Check for metric values
  const metricValues = document.querySelectorAll('.metric-value');
  if (metricValues.length === 0) {
    console.error('❌ No metric values found');
    return false;
  }
  
  const valueStyle = window.getComputedStyle(metricValues[0]);
  console.log(`✅ Metric value font size: ${valueStyle.fontSize}`);
  
  // Check that values are centered
  if (valueStyle.justifyContent === 'center' && valueStyle.alignItems === 'center') {
    console.log('✅ Metric values are centered');
  } else {
    console.warn('⚠️ Metric values may not be properly centered');
  }
  
  // Check for metric labels
  const metricLabels = document.querySelectorAll('.metric-label');
  if (metricLabels.length === 0) {
    console.error('❌ No metric labels found');
    return false;
  }
  
  const labelStyle = window.getComputedStyle(metricLabels[0]);
  console.log(`✅ Metric label font size: ${labelStyle.fontSize}`);
  
  // Check if the label is at the bottom (this is approximate)
  const labelMarginTop = labelStyle.marginTop;
  if (labelMarginTop === 'auto' || parseInt(labelMarginTop) > 0) {
    console.log('✅ Labels appear to be aligned to the bottom');
  } else {
    console.warn('⚠️ Labels may not be aligned to the bottom');
  }
  
  return true;
}

// Execute the validation
validateMetricsGridStyling();
