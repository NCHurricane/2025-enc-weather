/**
 * Tropical Banner Module
 * Handles the display of alerts for active tropical systems
 */

// ===== TEST MODE SETTINGS =====
// Set to TRUE to use example data, FALSE to use real data
const USE_TEST_DATA = false; // Change this to true for testing
// =============================

/**
 * Initialize the banner system and attempt to fetch active systems data
 */
export function initTropicalBanner() {
    console.log("Initializing tropical banner system");
    console.log("Test mode:", USE_TEST_DATA ? "ENABLED" : "DISABLED");

    // Wait for window to fully load
    window.addEventListener('load', function () {
        // Use a slight delay to ensure all other scripts have initialized
        setTimeout(checkActiveSystemsAndShowBanner, 500);
    });
}

/**
 * Run the tropical banner with example data from JSON file
 */
async function runTestWithExampleData(raw) {
    // Normalize shape (some responses might nest under .data)
    let activeStorms = [];
    if (Array.isArray(raw.activeStorms)) {
        activeStorms = raw.activeStorms;
    } else if (raw.data && Array.isArray(raw.data.activeStorms)) {
        activeStorms = raw.data.activeStorms;
    } else if (raw.data && Array.isArray(raw.data.storms)) {
        activeStorms = raw.data.storms; // fallback variant if naming differs
    } else {
        console.warn('Unexpected structure in test storm data:', raw);
    }

    // Debug: show all seen binNumbers
    console.log('Banner test saw activeStorms binNumbers:', activeStorms.map(s => s.binNumber));

    const atlanticStorms = activeStorms.filter(storm => {
        if (!storm.binNumber) return false;
        const bin = storm.binNumber.toUpperCase();
        return bin.startsWith('AL') || bin.startsWith('AT');
    });

    if (atlanticStorms.length > 0) {
        displayTropicalBanner(atlanticStorms);
    } else {
        displayNoActiveSystems();
    }
}

/**
 * Check for active systems and display banner if needed
 */
function checkActiveSystemsAndShowBanner() {
    console.log("Checking for active tropical systems");

    // Use example data if test mode is enabled
    if (USE_TEST_DATA) {
        console.log("TEST MODE: Using example data");
        fetchStormData('./js/data/CurrentStorms.json')
            .then(handleStormData)
            .catch(error => {
                console.error("Error loading test data:", error);
                displayNoActiveSystems();
            });
        return;
    }

    // Normal production code (only runs if not in test mode)
    fetchStormData('./js/modules/cache/nhc_current_storms.json')
        .then(handleStormData)
        .catch(error => {
            console.warn("Could not load from cache, trying example/fallback data:", error);
            // Fall back to example data if cache fails
            fetchStormData('./js/data/CurrentStorms.json')
                .then(handleStormData)
                .catch(fallbackError => {
                    console.error("All data sources failed:", fallbackError);
                    // Always show something, even if all fetches fail
                    displayNoActiveSystems();
                });
        });
}

/**
 * Fetch storm data from a source
 * @param {string} source - The data source URL
 * @returns {Promise} - Promise resolving to the storm data
 */
function fetchStormData(source) {
    return fetch(source)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        });
}

/**
 * Display a message when no active systems are found
 */
function displayNoActiveSystems() {
    console.log("Displaying 'No active systems' message");

    // Get the banner container
    const bannerContainer = document.querySelector('.tropical-banner');
    if (!bannerContainer) return;

    // Create the "no systems" display
    const noSystemsContainer = document.createElement('div');
    noSystemsContainer.className = 'no-active-systems';

    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-check';

    const message = document.createElement('span');
    message.textContent = ' No active systems';
    message.style.paddingLeft = '10px';

    noSystemsContainer.appendChild(icon);
    noSystemsContainer.appendChild(message);
    bannerContainer.innerHTML = ''; // Clear any existing content
    bannerContainer.appendChild(noSystemsContainer);
}

/**
 * Display active tropical systems in the banner
 * @param {Array} storms - Array of active storm data
 */
function displayTropicalBanner(storms) {
    // Storm classification mapping for readable display
    const STORM_CLASSIFICATIONS = {
        'TD': 'Tropical Depression',
        'TS': 'Tropical Storm',
        'HU': 'Hurricane',
        'MH': 'Major Hurricane',
        'STD': 'Subtropical Depression',
        'STS': 'Subtropical Storm',
        'PTC': 'Post-tropical Cyclone',
        'PC': 'Potential Tropical Cyclone'
    };

    // Get the banner container
    const bannerContainer = document.querySelector('.tropical-banner');
    if (!bannerContainer) return;

    // Clear existing content
    bannerContainer.innerHTML = '';

    // Create header
    const alertHeader = document.createElement('div');
    alertHeader.className = 'active-systems-header';

    const headerText = document.createElement('span');
    headerText.textContent = 'Active Systems';
    alertHeader.appendChild(headerText);

    // Create storms container
    const stormsContainer = document.createElement('div');
    stormsContainer.className = 'active-systems-container';

    // Add each storm
    storms.forEach(storm => {
        const stormDiv = document.createElement('div');
        stormDiv.className = 'active-system-item';

        // Add icon
        const stormIcon = document.createElement('i');
        if (storm.classification === 'HU' || storm.classification === 'MH') {
            stormIcon.className = 'fa-solid fa-hurricane';
            stormIcon.style.color = 'red';
        } else if (storm.classification === 'TS' || storm.classification === 'STS') {
            stormIcon.className = 'fa-solid fa-hurricane';
            stormIcon.style.color = 'orange';
        } else {
            stormIcon.className = 'fa-solid fa-hurricane';
            stormIcon.style.color = 'blue';
        }

        // Create link with storm info
        const stormLink = document.createElement('a');
        stormLink.href = `active/${storm.binNumber.toLowerCase()}.html`;
        stormLink.className = 'active-system-link';

        // Get classification text and set link text
        const classification = STORM_CLASSIFICATIONS[storm.classification] || 'Tropical Cyclone';
        const intensityDisplay = storm.intensity ? ` (${storm.intensity} kt)` : '';
        stormLink.innerHTML = `
        <span class="storm-classification" style="font-weight: 900;">${classification}</span>
        <br>
        <span class="storm-name" style="font-weight: 700;">${storm.name}</span>
        <br>
        <span class="storm-intensity" style="font-weight: 400; font-size: 0.9em;">${intensityDisplay}</span>
    `;
        // Assemble storm div
        stormDiv.appendChild(stormIcon);
        stormDiv.appendChild(stormLink);
        stormsContainer.appendChild(stormDiv);
    });

    // Add to banner
    bannerContainer.appendChild(alertHeader);
    bannerContainer.appendChild(stormsContainer);
}

/**
 * Handle the storm data once retrieved
 * @param {Object} data - The storm data
 */
function handleStormData(raw) {
    // Normalize possible nesting; some versions may wrap in .data
    let activeStorms = [];
    if (Array.isArray(raw.activeStorms)) {
        activeStorms = raw.activeStorms;
    } else if (raw.data && Array.isArray(raw.data.activeStorms)) {
        activeStorms = raw.data.activeStorms;
    } else if (raw.data && Array.isArray(raw.data.storms)) {
        activeStorms = raw.data.storms;
    } else {
        console.warn('Unexpected storm data structure in tropical-banner.js:', raw);
    }

    // Debug: log all seen binNumbers when real data arrives
    console.log('Banner saw activeStorms binNumbers:', activeStorms.map(s => s.binNumber));

    const atlanticStorms = activeStorms.filter(storm => {
        if (!storm.binNumber) return false;
        return storm.binNumber.toUpperCase().startsWith('AL');
    });

    if (atlanticStorms.length > 0) {
        console.log(`Found ${atlanticStorms.length} active Atlantic systems`);
        displayTropicalBanner(atlanticStorms);
    } else {
        console.log('No active tropical systems found');
        displayNoActiveSystems();
    }
}