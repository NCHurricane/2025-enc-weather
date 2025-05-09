/**
 * Tropical Weather Module
 * Handles tropical weather forecasts and displays
 */

import { isDateInHurricaneSeason } from './weatherData.js';
import { formatDate } from './utils.js';
// Initialize tropical satellite with TAW sector
import { initSatellite } from './satellite.js';

// DOM elements that will be used
let twoTextContent = null;
let twoSpanishContent = null;
let discussionContent = null;
let twoTextTimestamp = null;
let twoSpanishTimestamp = null;
let discussionTimestamp = null;

/**
 * Initialize when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function () {
    console.log('Tropical module initializing...');

    // Initialize satellite imagery
    initTropicalSatellite();

    // Initialize text products
    initTextProducts();

    // Initialize graphics timestamps
    updateGraphicsTimestamps();

    // Set up refresh button
    setupRefreshButton();

    // Initialize active storm checking
    checkActiveStorms();

});

/**
 * Initialize tropical satellite display
 */
function initTropicalSatellite() {
    console.log('Initializing tropical satellite...');
    initSatellite({
        sector: 'taw',
        containerId: 'tropical-satellite-image-container',
        imageId: 'tropical-satellite-image',
        loadingId: 'tropical-satellite-loading',
        errorId: 'tropical-satellite-error',
        timestampId: 'tropical-satellite-timestamp',
        playButtonId: 'tropical-satellite-play-pause',
        selectorId: 'tropical-satellite-product-select'
    });
}

/**
 * Initialize text products - load cached data
 */
function initTextProducts() {
    console.log('Initializing tropical text products...');

    // Cache DOM elements
    twoTextContent = document.getElementById('two-text-content');
    twoSpanishContent = document.getElementById('two-spanish-content');
    discussionContent = document.getElementById('discussion-content');
    twoTextTimestamp = document.getElementById('two-text-timestamp');
    twoSpanishTimestamp = document.getElementById('two-spanish-timestamp');
    discussionTimestamp = document.getElementById('discussion-timestamp');

    // Check if elements exist before proceeding
    if (!twoTextContent) {
        console.error('Element #two-text-content not found');
    }
    if (!twoSpanishContent) {
        console.error('Element #two-spanish-content not found');
    }
    if (!discussionContent) {
        console.error('Element #discussion-content not found');
    }

    // Load each product
    loadTropicalWeatherOutlook();
    loadTropicalWeatherOutlookSpanish();
    loadTropicalDiscussion();
}

/**
 * Load Tropical Weather Outlook text
 */
function loadTropicalWeatherOutlook() {
    console.log('Loading tropical weather outlook...');
    const loadingElement = document.getElementById('two-text-loading');
    const errorElement = document.getElementById('two-text-error');

    if (loadingElement) loadingElement.style.display = 'block';
    if (errorElement) errorElement.style.display = 'none';
    if (twoTextContent) twoTextContent.style.display = 'none';

    // Generate a timestamp to prevent caching
    const timestamp = Date.now();

    // Try both possible paths
    fetch(`js/modules/cache/tropical_two_at.json?t=${timestamp}`)
        .then(response => {
            if (!response.ok) {
                // Try alternative path
                return fetch(`../../js/modules/cache/tropical_two_at.json?t=${timestamp}`);
            }
            return response;
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('TWO data loaded successfully:', data);
            renderTwoText(data);
            if (loadingElement) loadingElement.style.display = 'none';
            if (twoTextContent) twoTextContent.style.display = 'block';
        })
        .catch(error => {
            console.error('Error loading TWO text:', error);
            if (loadingElement) loadingElement.style.display = 'none';
            if (errorElement) {
                errorElement.style.display = 'block';
                errorElement.innerHTML = `<i class="fa-solid fa-exclamation-triangle"></i>
                    <span>Unable to load tropical weather outlook</span>
                    <small>Error: ${error.message}. Cache file may not exist. Check PHP cron job.</small>`;
            }
            // Create default content as fallback
            createDefaultTwoContent();
        });
}

/**
 * Create default TWO content if cache fails
 */
function createDefaultTwoContent() {
    if (!twoTextContent) return;

    console.log('Creating default TWO content as fallback');
    const now = new Date();
    const isInSeason = isDateInHurricaneSeason(now);

    let html = '<h3>Atlantic Tropical Weather Outlook</h3>';

    if (isInSeason) {
        html += `<div class="outlook-section">
            <h4>Outlook for next 48 hours</h4>
            <p>Unable to load current outlook data. Please check back later.</p>
            <p>The Atlantic hurricane season is currently active (May 15 - November 30).</p>
        </div>`;
    } else {
        const currentYear = now.getFullYear();
        html += `<div class="outlook-section">
            <h4>Off-Season Notification</h4>
            <p>The Atlantic hurricane season is currently inactive. The next season begins May 15, ${currentYear}.</p>
        </div>`;
    }

    twoTextContent.innerHTML = html;
    twoTextContent.style.display = 'block';

    if (twoTextTimestamp) {
        twoTextTimestamp.textContent = `Status: Cache file not available`;
    }
}

/**
 * Load Tropical Weather Outlook text in Spanish
 */
function loadTropicalWeatherOutlookSpanish() {
    console.log('Loading tropical weather outlook in Spanish...');
    const loadingElement = document.getElementById('two-spanish-loading');
    const errorElement = document.getElementById('two-spanish-error');

    if (loadingElement) loadingElement.style.display = 'block';
    if (errorElement) errorElement.style.display = 'none';
    if (twoSpanishContent) twoSpanishContent.style.display = 'none';

    // Generate a timestamp to prevent caching
    const timestamp = Date.now();

    // Try both possible paths
    fetch(`js/modules/cache/tropical_two_sat.json?t=${timestamp}`)
        .then(response => {
            if (!response.ok) {
                // Try alternative path
                return fetch(`../../js/modules/cache/tropical_two_sat.json?t=${timestamp}`);
            }
            return response;
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Spanish TWO data loaded successfully');
            renderTwoSpanishText(data);
            if (loadingElement) loadingElement.style.display = 'none';
            if (twoSpanishContent) twoSpanishContent.style.display = 'block';
        })
        .catch(error => {
            console.error('Error loading TWO Spanish text:', error);
            if (loadingElement) loadingElement.style.display = 'none';
            if (errorElement) {
                errorElement.style.display = 'block';
                errorElement.innerHTML = `<i class="fa-solid fa-exclamation-triangle"></i>
                    <span>No se puede cargar la perspectiva del tiempo tropical</span>
                    <small>Error: ${error.message}. El archivo de caché puede no existir.</small>`;
            }
            createDefaultTwoSpanishContent();
        });
}

/**
 * Create default Spanish TWO content if cache fails
 */
function createDefaultTwoSpanishContent() {
    if (!twoSpanishContent) return;

    console.log('Creating default Spanish TWO content as fallback');
    const now = new Date();
    const isInSeason = isDateInHurricaneSeason(now);

    let html = '<h3>Perspectiva del Tiempo Tropical del Atlántico</h3>';

    if (isInSeason) {
        html += `<div class="outlook-section">
            <h4>Perspectiva para las próximas 48 horas</h4>
            <p>No se pudieron cargar los datos actuales de la perspectiva. Por favor, vuelva más tarde.</p>
            <p>La temporada de huracanes del Atlántico está actualmente activa (15 de mayo - 30 de noviembre).</p>
        </div>`;
    } else {
        const currentYear = now.getFullYear();
        html += `<div class="outlook-section">
            <h4>Notificación Fuera de Temporada</h4>
            <p>La temporada de huracanes del Atlántico está actualmente inactiva. La próxima temporada comienza el 15 de mayo de ${currentYear}.</p>
        </div>`;
    }

    twoSpanishContent.innerHTML = html;
    twoSpanishContent.style.display = 'block';

    if (twoSpanishTimestamp) {
        twoSpanishTimestamp.textContent = `Estado: Archivo de caché no disponible`;
    }
}

/**
 * Load Tropical Weather Discussion text
 */
function loadTropicalDiscussion() {
    console.log('Loading tropical weather discussion...');
    const loadingElement = document.getElementById('discussion-loading');
    const errorElement = document.getElementById('discussion-error');

    if (loadingElement) loadingElement.style.display = 'block';
    if (errorElement) errorElement.style.display = 'none';
    if (discussionContent) discussionContent.style.display = 'none';

    // Generate a timestamp to prevent caching
    const timestamp = Date.now();

    // Try both possible paths
    fetch(`js/modules/cache/tropical_disc_at.json?t=${timestamp}`)
        .then(response => {
            if (!response.ok) {
                // Try alternative path
                return fetch(`../../js/modules/cache/tropical_disc_at.json?t=${timestamp}`);
            }
            return response;
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Tropical Discussion data loaded successfully');
            renderDiscussionText(data);
            if (loadingElement) loadingElement.style.display = 'none';
            if (discussionContent) discussionContent.style.display = 'block';
        })
        .catch(error => {
            console.error('Error loading Tropical Discussion text:', error);
            if (loadingElement) loadingElement.style.display = 'none';
            if (errorElement) {
                errorElement.style.display = 'block';
                errorElement.innerHTML = `<i class="fa-solid fa-exclamation-triangle"></i>
                    <span>Unable to load tropical weather discussion</span>
                    <small>Error: ${error.message}. Cache file may not exist. Check PHP cron job.</small>`;
            }
            createDefaultDiscussionContent();
        });
}

/**
 * Create default Discussion content if cache fails
 */
function createDefaultDiscussionContent() {
    if (!discussionContent) return;

    console.log('Creating default Discussion content as fallback');
    const now = new Date();
    const isInSeason = isDateInHurricaneSeason(now);

    let html = '<h3>Tropical Weather Discussion</h3>';

    if (isInSeason) {
        html += `<div class="discussion-section">
            <p>Unable to load current tropical weather discussion. Please check back later.</p>
            <p>The Atlantic hurricane season is currently active (May 15 - November 30).</p>
        </div>`;
    } else {
        const currentYear = now.getFullYear();
        html += `<div class="discussion-section">
            <p>The Atlantic hurricane season is currently inactive. The next season begins May 15, ${currentYear}.</p>
        </div>`;
    }

    discussionContent.innerHTML = html;
    discussionContent.style.display = 'block';

    if (discussionTimestamp) {
        discussionTimestamp.textContent = `Status: Cache file not available`;
    }
}

/**
 * Render TWO text content
 * @param {Object} data - The TWO data object
 */
function renderTwoText(data) {
    if (!twoTextContent || !data) return;

    let html = '<h3>Atlantic Tropical Weather Outlook</h3>';

    // Add the discussion content which is already pre-formatted
    if (data.discussion) {
        html += data.discussion;
    } else if (data.rawContent) {
        // Fallback to simple pre-formatting if no processed discussion
        html += '<pre>' + data.rawContent + '</pre>';
    } else {
        html += '<p>No tropical weather outlook data available.</p>';
    }

    twoTextContent.innerHTML = html;

    // Update timestamp
    if (twoTextTimestamp && data.issueTime) {
        const date = new Date(data.issueTime);
        twoTextTimestamp.textContent = `Last Updated: ${formatDate(date)}`;
    } else if (twoTextTimestamp && data.timestamp) {
        const date = new Date(data.timestamp * 1000);
        twoTextTimestamp.textContent = `Last Updated: ${formatDate(date)}`;
    }
}

/**
 * Render TWO Spanish text content
 * @param {Object} data - The TWO Spanish data object
 */
function renderTwoSpanishText(data) {
    if (!twoSpanishContent || !data) return;

    let html = '<h3>Perspectiva del Tiempo Tropical del Atlántico</h3>';

    // Add the discussion content which is already pre-formatted
    if (data.discussion) {
        html += data.discussion;
    } else if (data.rawContent) {
        // Fallback to simple pre-formatting if no processed discussion
        html += '<pre>' + data.rawContent + '</pre>';
    } else {
        html += '<p>No hay datos disponibles de la perspectiva del tiempo tropical.</p>';
    }

    twoSpanishContent.innerHTML = html;

    // Update timestamp
    if (twoSpanishTimestamp && data.issueTime) {
        const date = new Date(data.issueTime);
        twoSpanishTimestamp.textContent = `Última Actualización: ${formatDate(date)}`;
    } else if (twoSpanishTimestamp && data.timestamp) {
        const date = new Date(data.timestamp * 1000);
        twoSpanishTimestamp.textContent = `Última Actualización: ${formatDate(date)}`;
    }
}

/**
 * Render Tropical Discussion text content
 * @param {Object} data - The Tropical Discussion data object
 */
function renderDiscussionText(data) {
    if (!discussionContent || !data) return;

    let html = '<h3>Tropical Weather Discussion</h3>';

    if (data.discussion) {
        html += data.discussion;
    } else if (data.rawContent) {
        // Fallback to raw content if available
        html += `<pre>${data.rawContent}</pre>`;
    } else {
        html += `<p>No tropical weather discussion data available.</p>`;
    }

    discussionContent.innerHTML = html;

    // Update timestamp
    if (discussionTimestamp && data.issueTime) {
        const date = new Date(data.issueTime);
        discussionTimestamp.textContent = `Last Updated: ${formatDate(date)}`;
    } else if (discussionTimestamp && data.timestamp) {
        const date = new Date(data.timestamp * 1000);
        discussionTimestamp.textContent = `Last Updated: ${formatDate(date)}`;
    }
}

/**
 * Update timestamps for graphics images
 */
function updateGraphicsTimestamps() {
    const now = new Date();
    const formattedTime = formatDate(now);

    // Current activity timestamp
    const currentActivityTimestamp = document.getElementById('current-activity-timestamp');
    if (currentActivityTimestamp) {
        currentActivityTimestamp.textContent = `Last Retrieved: ${formattedTime}`;
    }

    // Two-day outlook timestamp
    const twoDayTimestamp = document.getElementById('two-day-timestamp');
    if (twoDayTimestamp) {
        twoDayTimestamp.textContent = `Last Retrieved: ${formattedTime}`;
    }

    // Seven-day outlook timestamp
    const sevenDayTimestamp = document.getElementById('seven-day-timestamp');
    if (sevenDayTimestamp) {
        sevenDayTimestamp.textContent = `Last Retrieved: ${formattedTime}`;
    }

    // Surface analysis timestamp
    const surfaceTimestamp = document.getElementById('surface-timestamp');
    if (surfaceTimestamp) {
        surfaceTimestamp.textContent = `Last Retrieved: ${formattedTime}`;
    }
}

/**
 * Set up refresh button functionality
 */
function setupRefreshButton() {
    const refreshButton = document.getElementById('global-refresh');
    if (refreshButton) {
        refreshButton.addEventListener('click', function () {
            this.classList.add('refreshing');

            // Refresh text products
            loadTropicalWeatherOutlook();
            loadTropicalWeatherOutlookSpanish();
            loadTropicalDiscussion();

            // Refresh graphics by forcing a reload
            const images = [
                document.getElementById('current-activity-img'),
                document.getElementById('two-day-img'),
                document.getElementById('seven-day-img'),
                document.getElementById('surface-img')
            ];

            images.forEach(img => {
                if (img) {
                    const originalSrc = img.src;
                    img.src = originalSrc.split('?')[0] + '?t=' + Date.now();
                }
            });

            // Update graphics timestamps
            updateGraphicsTimestamps();

            // Remove refreshing class after animation
            setTimeout(() => {
                this.classList.remove('refreshing');
            }, 2000);
        });
    }
}


/**
 * Update the tropical weather outlook section
 * @param {string} containerId - ID of the container element to update
 */
export function updateTropicalOutlook(containerId = 'tropical-outlook') {
    const tropicalDiv = document.getElementById(containerId);
    if (!tropicalDiv) return;

    if (isDateInHurricaneSeason()) {
        // Active hurricane season - show current outlook
        updateActiveSeasonDisplay(tropicalDiv);
    } else {
        // Off-season - show previous season summary
        updateOffSeasonDisplay(tropicalDiv);
    }
}

/**
 * Update display for active hurricane season
 * @param {HTMLElement} container - Container element
 */
function updateActiveSeasonDisplay(container) {
    const config = window.siteConfig?.tropicalWeather?.graphics || {};
    const outlookGraphic = config.atlanticOutlook || 'https://www.nhc.noaa.gov/xgtwo/two_atl_0d0.png';

    // Get current date for display
    const now = new Date();
    const formattedDate = formatDate(now, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: undefined,
        minute: undefined
    });

    container.innerHTML = `
        <h3>Current Tropical Outlook</h3>
        <p>Atlantic hurricane season is active (May 15 - November 30)</p>
        <p><small>As of ${formattedDate}</small></p>
        <img src="${outlookGraphic}" 
             alt="NHC 5-Day Tropical Weather Outlook" 
             title="5-Day Tropical Weather Outlook">
        <p>Source: <a href="https://www.nhc.noaa.gov/" target="_blank">National Hurricane Center</a></p>
    `;
}

/**
 * Update display for off-season
 * @param {HTMLElement} container - Container element
 */
function updateOffSeasonDisplay(container) {
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

    container.innerHTML = `
        <h3>Previous Hurricane Season (${lastYear})</h3>
        <p>The ${lastYear} Atlantic hurricane season is now closed. New season begins May 15, ${currentYear}.</p>
        <p>Prepare for the upcoming season! Review evacuation routes and emergency plans.</p>
        <img src="https://www.nhc.noaa.gov/data/tracks/tracks-at-${lastYear}.png" 
             alt="${lastYear} Atlantic Hurricane Season Summary" 
             title="${lastYear} Hurricane Season Summary">
    `;
}

/**
 * Check for active tropical systems
 * @returns {Promise<boolean>} Whether there are active systems
 */
export async function checkActiveSystemsStatus() {
    if (!isDateInHurricaneSeason()) {
        return false;
    }

    try {
        // First try to use cached data if available
        const response = await fetch('js/modules/cache/tropical_two_at.json?t=' + Date.now());
        if (response.ok) {
            const data = await response.json();

            // Check for active systems in the cached data
            if (data.active_systems && data.active_systems.length > 0) {
                return true;
            }

            // Also check for areas with high formation chance
            if (data.outlooks && data.outlooks.length > 0) {
                for (const outlook of data.outlooks) {
                    if (outlook.areas && outlook.areas.length > 0) {
                        for (const area of outlook.areas) {
                            // Consider high chance (70%+) of formation as active
                            if (area.formation_chance &&
                                (area.formation_chance['48hour'] >= 70 ||
                                    area.formation_chance['5day'] >= 70)) {
                                return true;
                            }
                        }
                    }
                }
            }
        }

        // Fallback - check NHC website directly
        const nhcResponse = await fetch('https://www.nhc.noaa.gov/');
        const text = await nhcResponse.text();
        return text.includes('Active Cyclones') && !text.includes('No Active Cyclones');
    } catch (error) {
        console.error('Error checking tropical system status:', error);
        return false;
    }
}

/**
 * Add alert banner for active tropical systems
 * @param {boolean} isActive - Whether there are active systems
 */
export function updateTropicalAlertBanner(isActive) {
    // Don't show banner if user dismissed it this session
    if (sessionStorage.getItem('hideTropicalBanner') === 'true') {
        return;
    }

    // Remove existing banner if any
    const existingBanner = document.getElementById('tropical-alert-banner');
    if (existingBanner) {
        existingBanner.remove();
    }

    // If active systems, add a new banner
    if (isActive) {
        const banner = document.createElement('div');
        banner.id = 'tropical-alert-banner';
        banner.className = 'tropical-alert-banner';
        banner.innerHTML = `
            <i class="fa-solid fa-hurricane"></i>
            <span>Active tropical systems in the Atlantic basin. <a href="tropical.html">View details</a></span>
            <button class="close-button" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        `;

        document.body.insertBefore(banner, document.body.firstChild);
        document.body.classList.add('has-alert-banner');

        // Add close button functionality
        const closeButton = banner.querySelector('.close-button');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                banner.remove();
                document.body.classList.remove('has-alert-banner');
                // Store preference in session storage
                sessionStorage.setItem('hideTropicalBanner', 'true');
            });
        }
    }
}

/**
 * Atlantic Storm Alert System
 * Checks for active Atlantic tropical systems from NHC JSON data
 * and displays alerts on the tropical page
 */

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

/**
 * Fetches current active storms from NHC
 * @returns {Promise<Array>} Array of active Atlantic storms
 */
async function fetchActiveAtlanticStorms() {
    try {
        // URL to NHC active cyclones JSON
        const nhcJsonUrl = 'https://www.nhc.noaa.gov/CurrentStorms.json';

        // Fetch the JSON data with a cache-busting parameter
        const response = await fetch(`${nhcJsonUrl}?t=${Date.now()}`);

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();

        // Filter for Atlantic storms only (binNumber starts with "AT")
        const atlanticStorms = data.activeStorms.filter(storm =>
            storm.binNumber && storm.binNumber.startsWith('AT')
        );

        console.log(`Found ${atlanticStorms.length} active Atlantic storms`);
        return atlanticStorms;
    } catch (error) {
        console.error('Error fetching active storms:', error);
        return [];
    }
}

/**
 * Creates a storm alert banner for display
 * @param {Array} storms - Array of active Atlantic storms
 * @returns {HTMLElement} Alert element for insertion into DOM
 */
function createStormAlertBanner(storms) {
    // Create the alert container
    const alertBanner = document.createElement('div');
    alertBanner.className = 'tropical-alert-banner';
    alertBanner.id = 'active-storm-alert';

    // Add a hurricane icon
    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-hurricane';
    alertBanner.appendChild(icon);

    // Create the alert message
    const message = document.createElement('span');

    if (storms.length === 1) {
        // Single storm format
        const storm = storms[0];
        const classification = STORM_CLASSIFICATIONS[storm.classification] || 'Tropical System';
        message.textContent = `Active: ${classification} ${storm.name}`;
    } else {
        // Multiple storms format
        message.textContent = `${storms.length} Active Atlantic Tropical Systems: `;

        // Add each storm name with classification
        storms.forEach((storm, index) => {
            const classification = STORM_CLASSIFICATIONS[storm.classification] || 'Tropical System';
            const stormText = `${classification} ${storm.name}`;

            if (index > 0) {
                message.textContent += ', ';
            }

            message.textContent += stormText;
        });
    }

    alertBanner.appendChild(message);

    // Add a details link
    const link = document.createElement('a');
    link.href = '#tropical-storms-section';
    link.textContent = ' View Details';
    link.className = 'tropical-alert-link';
    message.appendChild(link);

    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'tropical-alert-close';
    closeButton.setAttribute('aria-label', 'Close alert');
    closeButton.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    closeButton.addEventListener('click', () => {
        alertBanner.remove();
        // Store a session flag that the user dismissed the alert
        sessionStorage.setItem('stormAlertDismissed', 'true');
    });
    alertBanner.appendChild(closeButton);

    return alertBanner;
}

/**
 * Creates a more detailed storm listing for the tropical page
 * @param {Array} storms - Array of active Atlantic storms
 * @returns {HTMLElement} Storm list element
 */
function createStormList(storms) {
    const stormList = document.createElement('div');
    stormList.className = 'active-storms-list';
    stormList.id = 'tropical-storms-section';

    const heading = document.createElement('h3');
    heading.textContent = 'Active Atlantic Tropical Systems';
    stormList.appendChild(heading);

    if (storms.length === 0) {
        const noStorms = document.createElement('p');
        noStorms.textContent = 'No active systems in the Atlantic basin at this time.';
        stormList.appendChild(noStorms);
        return stormList;
    }

    // Create a list of storms
    const list = document.createElement('ul');

    storms.forEach(storm => {
        const item = document.createElement('li');
        const classification = STORM_CLASSIFICATIONS[storm.classification] || 'Tropical System';

        // Add intensity and pressure if available
        let details = '';
        if (storm.intensity) {
            details += ` - Wind: ${storm.intensity} kt`;
        }
        if (storm.pressure) {
            details += ` - Pressure: ${storm.pressure} mb`;
        }

        item.innerHTML = `<strong>${classification} ${storm.name}</strong>${details}`;

        // Add a link to NHC
        if (storm.forecastGraphics && storm.forecastGraphics.url) {
            const nhcLink = document.createElement('a');
            nhcLink.href = storm.forecastGraphics.url;
            nhcLink.target = '_blank';
            nhcLink.textContent = ' NHC Info';
            nhcLink.className = 'storm-nhc-link';
            item.appendChild(nhcLink);
        }

        list.appendChild(item);
    });

    stormList.appendChild(list);
    return stormList;
}

/**
 * Main function to check for active storms and update the UI accordingly
 */
export async function checkActiveStorms() {
    // Don't show alert if user dismissed it this session
    if (sessionStorage.getItem('stormAlertDismissed') === 'true') {
        return;
    }

    const activeStorms = await fetchActiveAtlanticStorms();

    // Update the UI if there are active storms
    if (activeStorms.length > 0) {
        // Add the alert banner to the page
        const alertBanner = createStormAlertBanner(activeStorms);
        document.body.insertBefore(alertBanner, document.body.firstChild);

        // Add detailed storm information to the tropical content section
        const tropicalContent = document.querySelector('.tropical-content');
        if (tropicalContent) {
            const stormList = createStormList(activeStorms);
            tropicalContent.insertBefore(stormList, tropicalContent.firstChild);
        }
    }
}

// The following line should be added to your initialization code
// This ensures the active storm check runs when the page loads
// document.addEventListener('DOMContentLoaded', checkActiveStorms);



// Export functions that might be needed elsewhere
export {
    loadTropicalWeatherOutlook,
    loadTropicalWeatherOutlookSpanish,
    loadTropicalDiscussion,
    updateGraphicsTimestamps,
    updateActiveSeasonDisplay,
    updateOffSeasonDisplay,
    checkActiveStorms
};