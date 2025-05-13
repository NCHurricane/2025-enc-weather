// main.js
import {
    initWeather,
    fetchAlerts,
    fetchAFDText,
    fetchWeatherForecast,
    fetchDetailedForecast
} from './modules/weatherData.js';
import { initMeteogram } from './modules/meteogram.js';
import { initSatellite } from './modules/satellite.js';
import { initRadar } from './modules/radar.js';

// Function to extract county name from the current page URL
function extractCountyNameFromURL() {
    const path = window.location.pathname;
    const match = path.match(/\/counties\/(\w+)\//);
    return match ? match[1] : null;
}

// Define the update data function
function updateData() {
    // Get configuration values from the weatherConfig object with fallback defaults
    const config = window.weatherConfig || {};
    const location = config.location || {};

    const lat = location.lat || 35.64;
    const lon = location.lon || -77.39;
    const wfo = location.afdWFO || "MHX";
    const countyName = location.countyName || extractCountyNameFromURL();

    // If using defaults, log a warning
    if (!config.location || !location.lat || !location.lon) {
        console.warn('Invalid or missing location configuration. Using default coordinates.');
    }

    // Modify the fetchCountyWeatherData function in main.js
    async function fetchCountyWeatherData(countyName) {
        if (!countyName) {
            console.warn('No county name found. Cannot fetch county-specific weather data.');
            return null;
        }

        try {
            // Add fallback mechanism for paths and better error handling
            let response = null;
            let errors = [];

            // Try multiple path patterns
            const paths = [
                `../../js/modules/cache/${countyName.toLowerCase()}_weather.json`,
                `js/modules/cache/${countyName.toLowerCase()}_weather.json`,
                `./js/modules/cache/${countyName.toLowerCase()}_weather.json`
            ];

            for (const path of paths) {
                try {
                    console.log(`Attempting to fetch weather data from: ${path}`);
                    const result = await fetch(`${path}?t=${Date.now()}`);
                    if (result.ok) {
                        response = result;
                        break;
                    } else {
                        errors.push(`HTTP error: ${result.status} for ${path}`);
                    }
                } catch (e) {
                    errors.push(`Fetch error: ${e.message} for ${path}`);
                }
            }

            if (!response) {
                throw new Error(`Failed to fetch weather data: ${errors.join(', ')}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Error fetching weather data for ${countyName}:`, error);
            return null;
        }
    }

    // Initialize weather data (check if element exists first)
    if (document.getElementById('current-temp')) {
        fetchCountyWeatherData(countyName)
            .then(weatherData => {
                if (weatherData && weatherData.weather) {
                    // Update current conditions using the county-specific JSON data
                    initWeather(lat, lon, weatherData.weather);
                } else {
                    // Fallback to original method if no data found
                    initWeather(lat, lon);
                }
            })
            .catch(() => initWeather(lat, lon));
    }

    // Fetch and display forecast data
    if (document.getElementById('forecast')) {
        fetchWeatherForecast(lat, lon);
    }

    // Fetch and display alerts
    if (document.getElementById('alerts')) {
        console.log("Fetching alerts for coordinates:", { lat, lon });
        fetchAlerts(lat, lon).then(alerts => {
            console.log(`fetchAlerts returned ${alerts?.length || 0} alerts`);
            renderAlerts(alerts);
        }).catch(error => {
            console.error("Error fetching alerts:", error);
            renderAlerts([]); // Render with empty array as fallback
        });
    }

    // Fetch and display Area Forecast Discussion
    if (document.getElementById('afd-content')) {
        fetchAFDText(wfo);
    }

    // Fetch and display detailed forecast
    if (document.getElementById('detailed-forecast')) {
        fetchDetailedForecast(lat, lon);
    }

    // Initialize other components
    if (document.getElementById('meteogram-chart-container')) {
        initMeteogram(lat, lon);
    }

    if (document.getElementById('satellite-image-container')) {
        initSatellite();
    }

    if (document.getElementById('radar-image-container')) {
        initRadar();
    }
}

// Function to render alerts
function renderAlerts(alerts) {
    const alertsElement = document.getElementById('alerts');
    if (!alertsElement) {
        console.error("Alerts container element not found");
        return;
    }

    console.log("renderAlerts called with:", alerts);

    try {
        if (!alerts || alerts.length === 0) {
            console.log("No alerts to display, showing 'No active alerts' message");
            alertsElement.innerHTML = '<div class="alert"><div class="alert-none"><i class="fa-sharp-duotone fa-solid fa-triangle-exclamation fa-xl fontawesome-icon"></i> <b>No active alerts</b></div></div>';
            return;
        }

        console.log(`Rendering ${alerts.length} alerts`);

        let alertsHTML = '';
        alerts.forEach((alert, index) => {
            console.log(`Processing alert ${index}:`, alert);

            // Debug alert structure - check if 'properties' exists or if alert has direct properties
            const hasProperties = !!alert.properties;
            const hasDirectProps = !!(alert.event || alert.headline || alert.description);

            console.log(`Alert ${index} structure check:`, {
                hasProperties,
                hasDirectProps,
                keys: Object.keys(alert)
            });

            // Determine event name based on structure
            const eventName = alert.properties?.event || alert.event || 'Unknown Alert';
            console.log(`Alert ${index} event name:`, eventName);

            // Get description based on structure
            let description = alert.properties?.description || alert.description || 'No description available.';
            description = description.replace(/\r\n/g, "\n");

            const paragraphs = description.split(/\n\s*\n/);
            const formattedDescription = paragraphs.map(p => `<p>${p.replace(/\n/g, " ")}</p>`).join("");

            // Add to HTML
            alertsHTML += `
              <div class="alert">
                <input type="checkbox" id="alert-${index}" class="alert-toggle">
                <label for="alert-${index}" class="alert-title">
                  <i class="fa-sharp-duotone fa-solid fa-triangle-exclamation fa-xl fontawesome-icon"></i>
                  ${eventName}
                </label>
                <div class="alert-details">
                  ${formattedDescription}
                </div>
              </div>
            `;
        });

        console.log("Setting alerts HTML content");
        alertsElement.innerHTML = alertsHTML;
        console.log("Alerts rendered successfully");
    } catch (error) {
        console.error('Error rendering alerts:', error);
        console.error('Error stack:', error.stack);
        alertsElement.innerHTML = '<div class="alert"><p><b>Unable to render alerts. Please try again later.</b></p></div>';
    }
}

// Setup submenu toggle for mobile/tablet
function setupSubmenuToggle() {
    // Get all menu items with submenus
    const menuItemsWithSubmenu = document.querySelectorAll('.nav-menu .has-submenu > a');

    // Add click handler to each menu item with submenu
    menuItemsWithSubmenu.forEach(function (menuItem) {
        menuItem.addEventListener('click', function (e) {
            // Only apply this behavior on mobile/tablet
            if (window.innerWidth <= 768) {
                // Prevent the link from navigating
                e.preventDefault();

                // Toggle 'active' class on the parent li element
                this.parentElement.classList.toggle('submenu-active');

                // Toggle aria-expanded attribute for accessibility
                const isExpanded = this.parentElement.classList.contains('submenu-active');
                this.setAttribute('aria-expanded', isExpanded);
            }
        });
    });

    // Close submenus when clicking outside
    document.addEventListener('click', function (e) {
        if (window.innerWidth <= 768) {
            // If click is outside the navigation
            if (!e.target.closest('.nav-menu') && !e.target.closest('.hamburger')) {
                // Remove active class from all submenus
                document.querySelectorAll('.submenu-active').forEach(function (item) {
                    item.classList.remove('submenu-active');
                });
            }
        }
    });

    // Handle window resize
    window.addEventListener('resize', function () {
        if (window.innerWidth > 768) {
            // Reset submenus when returning to desktop view
            document.querySelectorAll('.submenu-active').forEach(function (item) {
                item.classList.remove('submenu-active');
            });
        }
    });
}

function setupEventHandlers() {
    const refreshButton = document.getElementById('global-refresh');
    if (refreshButton) {
        refreshButton.addEventListener('click', function () {
            this.classList.add('refreshing');
            updateData();
            setTimeout(() => {
                this.classList.remove('refreshing');
            }, 4000);
        });
    }

    // Setup hamburger menu
    const hamburger = document.getElementById('hamburger');
    const nav = document.querySelector('.nav');
    if (hamburger && nav) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            nav.classList.toggle('active');

            const icon = hamburger.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-xmark');
            }
        });
    }
    // Call the submenu toggle setup function
    setupSubmenuToggle();
}

function initializeWeatherApp() {
    updateData();
    setupEventHandlers();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeWeatherApp);