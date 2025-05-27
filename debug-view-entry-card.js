/**
 * Debug script for view-entry-card feature
 * Run this in the browser console on an entry page to debug the feature
 */

function debugViewEntryCard() {
    console.log('=== DEBUGGING VIEW ENTRY CARD FEATURE ===');
    
    // 1. Check if URL matches the expected pattern
    const currentUrl = window.location.href;
    console.log('1. Current URL:', currentUrl);
    
    // Check URL pattern match
    const entryPattern = /https:\/\/([^\.]+)\.(?:dev\.)?spend\.cloud\/proactive\/kasboek\.boekingen\/show/;
    const match = currentUrl.match(entryPattern);
    console.log('2. URL Pattern Match:', match);
    if (match) {
        console.log('   - Customer:', match[1]);
        console.log('   - Entry ID from URL params:', new URLSearchParams(window.location.search).get('id'));
    }
    
    // 2. Check if PowerCloudFeatures is available
    console.log('3. PowerCloudFeatures availability:');
    console.log('   - window.PowerCloudFeatures:', !!window.PowerCloudFeatures);
    if (window.PowerCloudFeatures) {
        console.log('   - Available features:', Object.keys(window.PowerCloudFeatures));
        console.log('   - viewEntryCard feature:', !!window.PowerCloudFeatures.viewEntryCard);
        if (window.PowerCloudFeatures.viewEntryCard) {
            console.log('   - viewEntryCard methods:', Object.keys(window.PowerCloudFeatures.viewEntryCard));
        }
    }
    
    // 3. Check if BaseFeature is available
    console.log('4. BaseFeature availability:', typeof BaseFeature);
    
    // 4. Check if scripts are loaded
    console.log('5. Script loading check:');
    const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src).filter(s => s.includes('view-entry-card'));
    console.log('   - view-entry-card.js scripts found:', scripts);
    
    // 5. Try to manually initialize the feature (if available)
    console.log('6. Manual feature test:');
    if (window.PowerCloudFeatures?.viewEntryCard?.init && match) {
        console.log('   - Attempting manual initialization...');
        const urlParams = new URLSearchParams(window.location.search);
        const entryId = urlParams.get('id');
        
        // Mock entry data with card relationship
        const mockEntryData = {
            data: {
                id: entryId,
                attributes: {
                    id: entryId,
                    card_id: "1234" // Mock card ID for testing
                },
                relationships: {
                    card: {
                        data: {
                            id: "1234",
                            type: "cards"
                        }
                    }
                }
            }
        };
        
        try {
            window.PowerCloudFeatures.viewEntryCard.init(match, mockEntryData)
                .then(() => console.log('   - Manual initialization SUCCESS'))
                .catch(error => console.error('   - Manual initialization FAILED:', error));
        } catch (error) {
            console.error('   - Manual initialization threw error:', error);
        }
    } else {
        console.log('   - Cannot test manual initialization (feature or match not available)');
    }
    
    // 6. Check for any existing buttons
    console.log('7. Existing buttons check:');
    const buttons = document.querySelectorAll('button, [class*="button"], [id*="button"]');
    const relevantButtons = Array.from(buttons).filter(btn => 
        btn.textContent.includes('Card') || 
        btn.textContent.includes('Entry') ||
        btn.className.includes('powercloud') ||
        btn.id.includes('powercloud')
    );
    console.log('   - Relevant buttons found:', relevantButtons.length);
    relevantButtons.forEach((btn, i) => {
        console.log(`   - Button ${i + 1}:`, {
            text: btn.textContent,
            className: btn.className,
            id: btn.id
        });
    });
    
    // 7. Check console for any errors
    console.log('8. Check browser console for any JavaScript errors related to:');
    console.log('   - [DEBUG][ViewEntryCard] messages');
    console.log('   - [DEBUG][AdyenEntries] messages');
    console.log('   - BaseFeature errors');
    console.log('   - PowerCloudFeatures errors');
    
    console.log('=== DEBUG COMPLETE ===');
    console.log('Check the messages above and any error messages in the console.');
}

// Auto-run if this script is executed
debugViewEntryCard();
