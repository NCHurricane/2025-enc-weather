/**
 * Tropical Banner Module
 * Handles the display of alerts for active tropical systems
 */

/**
 * Initialize the banner system and attempt to fetch active systems data
 */
export function initTropicalBanner() {
    console.log("Initializing tropical banner system");

    // Wait for window to fully load
    window.addEventListener('load', function () {
        // Use a slight delay to ensure all other scripts have initialized
        setTimeout(checkActiveSystemsAndShowBanner, 500);
    });
}

/**
 * Check for active systems and display banner if needed
 */
function checkActiveSystemsAndShowBanner() {
    console.log("Checking for active tropical systems");

    // Try to load from cache first
    fetchStormData('./js/modules/cache/nhc_current_storms.json')
        .then(handleStormData)
        .catch(error => {
            console.warn("Could not load from cache, trying example/fallback data:", error);
            // Fall back to example data if cache fails
            fetchStormData('./js/modules/CurrentStorms[example2].json')
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
 * Handle the storm data once retrieved
 * @param {Object} data - The storm data
 */
function handleStormData(data) {
    // Filter for Atlantic storms only
    const atlanticStorms = data.activeStorms.filter(storm =>
        storm.binNumber && storm.binNumber.startsWith('AT')
    );

    if (atlanticStorms && atlanticStorms.length > 0) {
        console.log(`Found ${atlanticStorms.length} active Atlantic systems`);
        displayTropicalBanner(atlanticStorms);
        displayStormList(atlanticStorms);
    } else {
        console.log("No active tropical systems found");
        displayNoActiveSystems();
    }
}