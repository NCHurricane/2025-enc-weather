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

    // In production, this would fetch from NHC
    // For testing, we'll use the example data
    fetch('./js/modules/CurrentStorms[example2].json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
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
        })
        .catch(error => {
            console.error("Error checking for active systems:", error);
        });
}

/**
 * Display the tropical alert banner inside the tropical-content div
 * @param {Array} storms - Array of storm objects
 */
export function displayTropicalBanner(storms) {
    if (!storms || storms.length === 0) {
        console.log("No storms to display in banner");
        return;
    }

    console.log(`Creating banner for ${storms.length} active systems`);

    // Find the tropical-content container
    const container = document.querySelector('.tropical-content');
    if (!container) {
        console.error("Could not find .tropical-content container");
        return;
    }

    // Remove any existing banner
    const existingBanner = container.querySelector('.tropical-alert-banner');
    if (existingBanner) {
        existingBanner.remove();
    }

    // Create banner element
    const banner = document.createElement('div');
    banner.className = 'tropical-alert-banner in-content';

    // Create hurricane icon
    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-hurricane';
    banner.appendChild(icon);

    // Create message text
    const text = document.createElement('span');
    text.textContent = `${storms.length} Active Atlantic Tropical ${storms.length === 1 ? 'System' : 'Systems'}`;
    banner.appendChild(text);

    // Create link to details
    const link = document.createElement('a');
    link.href = 'tropical.html';
    link.textContent = ' View Details';
    text.appendChild(link);

    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    closeBtn.addEventListener('click', function () {
        banner.remove();
        // Store preference in session to avoid showing again on refresh
        sessionStorage.setItem('hideTropicalBanner', 'true');
    });
    banner.appendChild(closeBtn);

    // Insert the banner at the beginning of the tropical-content div
    container.insertBefore(banner, container.firstChild);
    console.log("Banner added to tropical-content container");
}

/**
 * Display a list of active storms in the tropical-content div
 * @param {Array} storms - Array of storm objects
 */
function displayStormList(storms) {
    // Find the tropical-content container
    const container = document.querySelector('.tropical-content');
    if (!container) {
        console.error("Could not find .tropical-content container");
        return;
    }

    // Remove any existing active-storms-section
    const existingSection = container.querySelector('#active-storms-section');
    if (existingSection) {
        existingSection.remove();
    }

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

    // Create active-storms-section
    const stormSection = document.createElement('div');
    stormSection.id = 'active-storms-section';
    stormSection.className = 'active-storms-section';

    // Create header
    const header = document.createElement('div');
    header.className = 'active-systems-header';
    header.innerHTML = '<span>Active Systems</span>';
    stormSection.appendChild(header);

    // Create storm container
    const stormsContainer = document.createElement('div');
    stormsContainer.className = 'active-systems-container';

    // Add each storm
    storms.forEach(storm => {
        const stormDiv = document.createElement('div');
        stormDiv.className = 'active-system-item';

        // Add storm icon
        const icon = document.createElement('i');
        if (storm.classification === 'HU' || storm.classification === 'MH') {
            icon.className = 'fa-solid fa-hurricane';
            icon.style.color = 'red';
        } else if (storm.classification === 'TS' || storm.classification === 'STS') {
            icon.className = 'fa-solid fa-hurricane';
            icon.style.color = 'orange';
        } else {
            icon.className = 'fa-solid fa-hurricane';
            icon.style.color = 'blue';
        }
        stormDiv.appendChild(icon);

        // Add storm info
        const classification = STORM_CLASSIFICATIONS[storm.classification] || 'Tropical System';
        const stormLink = document.createElement('a');
        stormLink.href = `${storm.binNumber.toLowerCase()}.html`;
        stormLink.className = 'active-system-link';

        // Add intensity if available
        let intensityDisplay = '';
        if (storm.intensity) {
            intensityDisplay = ` (${storm.intensity} kt)`;
        }

        stormLink.innerHTML = `<strong>${classification} ${storm.name}</strong>${intensityDisplay}`;
        stormDiv.appendChild(stormLink);

        // Add to container
        stormsContainer.appendChild(stormDiv);
    });

    stormSection.appendChild(stormsContainer);

    // Insert at the beginning of the container before any other content
    container.insertBefore(stormSection, container.firstChild);
    console.log("Storm list added to tropical-content container");
}

/**
 * Display a "no active systems" message when there are no storms
 */
function displayNoActiveSystems() {
    // Find the tropical-content container
    const container = document.querySelector('.tropical-content');
    if (!container) {
        console.error("Could not find .tropical-content container");
        return;
    }

    // Remove any existing active-storms-section
    const existingSection = container.querySelector('#active-storms-section');
    if (existingSection) {
        existingSection.remove();
    }

    // Create no-active-systems div
    const noSystemsDiv = document.createElement('div');
    noSystemsDiv.id = 'active-storms-section';
    noSystemsDiv.className = 'no-active-systems';

    // Add icon
    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-check';
    noSystemsDiv.appendChild(icon);

    // Add message
    const message = document.createElement('span');
    message.textContent = 'No active systems';
    noSystemsDiv.appendChild(message);

    // Insert at the beginning of the container
    container.insertBefore(noSystemsDiv, container.firstChild);
    console.log("No active systems message added");
}