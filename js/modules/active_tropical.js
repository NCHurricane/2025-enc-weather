// Fetch tropical storm data from NHC via our proxy
function fetchActiveStormData() {
    // Use our PHP proxy instead of directly accessing NHC
    fetch('./js/modules/nhc_proxy.php')
        .then(response => {
            // Check if the response is ok
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Successfully loaded storm data:", data);

            // Filter for Atlantic storms only (binNumber starts with "AT")
            const atlanticStorms = data.activeStorms.filter(storm =>
                storm.binNumber && storm.binNumber.startsWith('AT')
            );

            // This should be called regardless of whether atlanticStorms is empty
            displayActiveStorms(atlanticStorms);
        })
        .catch(error => {
            console.error('Error loading storm data:', error);

            // Display a fallback message even if the fetch fails
            const alertSection = document.getElementById('active-storms-section');
            if (alertSection) {
                alertSection.innerHTML = '<div class="fetch-error">Error loading tropical systems data</div>';
            }

            // Try to load fallback data if the proxy fails
            loadFallbackStormData();
        });
}

// Fallback function to load local data if the proxy fails
function loadFallbackStormData() {
    fetch('./js/modules/CurrentStorms.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Loaded fallback storm data");

            const atlanticStorms = data.activeStorms.filter(storm =>
                storm.binNumber && storm.binNumber.startsWith('AT')
            );

            displayActiveStorms(atlanticStorms);
        })
        .catch(error => {
            console.error('Failed to load fallback storm data:', error);

            const alertSection = document.getElementById('active-storms-section');
            if (alertSection) {
                alertSection.innerHTML = '<div class="no-active-systems"><i class="fa-solid fa-check"></i><span>&nbsp;&nbsp;No active systems</span></div>';
            }
        });
}

function displayActiveStorms(storms) {
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

    // Get the container section
    const alertSection = document.getElementById('active-storms-section');
    alertSection.innerHTML = ''; // Clear any existing content

    if (!storms || storms.length === 0) {
        const noSystemsContainer = document.createElement('div');
        noSystemsContainer.className = 'no-active-systems';

        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-check';

        const message = document.createElement('span');
        message.textContent = 'No active systems';

        noSystemsContainer.appendChild(icon);
        noSystemsContainer.appendChild(message);
        alertSection.appendChild(noSystemsContainer);
        return;
    }

    // Create alert banner header
    const alertHeader = document.createElement('div');
    alertHeader.className = 'active-systems-header';

    // Add header text
    const headerText = document.createElement('span');
    headerText.textContent = 'Active Systems';
    headerText.style.textTransform = 'uppercase'; // Make header text uppercase

    // Assemble header
    alertHeader.appendChild(headerText);
    alertSection.appendChild(alertHeader);

    // Create storm systems container
    const stormsContainer = document.createElement('div');
    stormsContainer.className = 'active-systems-container';

    // Add each storm as a separate div
    storms.forEach(storm => {
        const stormDiv = document.createElement('div');
        stormDiv.className = 'active-system-item';

        // Create link from bin number
        const binNumber = storm.binNumber.toLowerCase();
        const linkHref = `${binNumber}.html`;

        // Create linked storm info
        const stormLink = document.createElement('a');
        stormLink.href = linkHref;
        stormLink.className = 'active-system-link';

        // Get classification text
        const classification = STORM_CLASSIFICATIONS[storm.classification] || 'Tropical Cyclone';

        // Add intensity info if available
        let intensityDisplay = '';
        if (storm.intensity) {
            intensityDisplay = ` (${storm.intensity} kt)`;
        }

        // Set link text
        stormLink.innerHTML = `<strong>${classification} ${storm.name}</strong>${intensityDisplay}`;
        stormLink.style.textTransform = 'uppercase'; // Make link text uppercase
        stormLink.style.fontSize = '0.9rem';
        stormLink.style.fontWeight = 'bold';// Increase font size for better visibility

        // Add icon appropriate to storm type
        const stormIcon = document.createElement('i');
        if (storm.classification === 'HU' || storm.classification === 'MH') {
            stormIcon.className = 'fa-solid fa-hurricane';
            stormIcon.style.color = 'red'; // Major hurricane color
        } else if (storm.classification === 'TS' || storm.classification === 'STS') {
            stormIcon.className = 'fa-solid fa-hurricane';
            stormIcon.style.color = 'orange'; // Tropical storm color
        } else {
            stormIcon.className = 'fa-solid fa-hurricane';
            stormIcon.style.color = 'blue'; // Default color for other types
        }

        // Add location info if available
        const locationInfo = document.createElement('span');


        // Assemble storm div
        stormDiv.appendChild(stormIcon);
        stormDiv.appendChild(stormLink);
        if (storm.latitude && storm.longitude) {
            stormDiv.appendChild(locationInfo);
        }

        // Add to container
        stormsContainer.appendChild(stormDiv);
    });

    // Add container to section
    alertSection.appendChild(stormsContainer);
}

// Call the main function when the document is ready
document.addEventListener('DOMContentLoaded', fetchActiveStormData);