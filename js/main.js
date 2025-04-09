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

    // Function to fetch county-specific weather data from JSON cache
    async function fetchCountyWeatherData(countyName) {
        if (!countyName) {
            console.warn('No county name found. Cannot fetch county-specific weather data.');
            return null;
        }

        try {
            // Try both relative and absolute paths
            let response;
            try {
                response = await fetch(`../../js/modules/cache/${countyName.toLowerCase()}_weather.json?t=${Date.now()}`);
                if (!response.ok) {
                    response = await fetch(`js/modules/cache/${countyName.toLowerCase()}_weather.json?t=${Date.now()}`);
                }
            } catch (e) {
                response = await fetch(`js/modules/cache/${countyName.toLowerCase()}_weather.json?t=${Date.now()}`);
            }

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
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
        fetchAlerts(lat, lon).then(alerts => {
            renderAlerts(alerts);
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
    if (!alertsElement) return;

    try {
        if (!alerts || alerts.length === 0) {
            alertsElement.innerHTML = '<div class="alert"><div class="alert-none"><i class="fa-sharp-duotone fa-solid fa-triangle-exclamation fa-xl fontawesome-icon"></i> <b>No active alerts</b></div></div>';
            return;
        }

        let alertsHTML = '';
        alerts.forEach((alert, index) => {
            if (!alert.properties) return;

            const eventName = alert.properties.event || 'Unknown Alert';
            let description = alert.properties.description || 'No description available.';
            description = description.replace(/\r\n/g, "\n");
            const paragraphs = description.split(/\n\s*\n/);
            const formattedDescription = paragraphs.map(p => `<p>${p.replace(/\n/g, " ")}</p>`).join("");

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

        alertsElement.innerHTML = alertsHTML;
    } catch (error) {
        console.error('Error rendering alerts:', error);
        alertsElement.innerHTML = '<div class="alert"><p><b>Unable to render alerts. Please try again later.</b></p></div>';
    }
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
}

function initializeWeatherApp() {
    updateData();
    setupEventHandlers();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeWeatherApp);