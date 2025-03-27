// Fix import paths to reflect actual file structure
import { initWeather } from './modules/currentConditions.js';
import { fetchWeatherForecast, fetchCurrentWarnings, fetchAFDText, fetchDetailedForecast } from './modules/alertsForecastAFD.js';
import { initMeteogram } from './modules/meteogram.js';
import { initSatellite } from './modules/satellite.js';
import { initRadar } from './modules/radar.js';

// Define the update data function
function updateData() {
    // Get configuration values from the weatherConfig object with fallback defaults
    const config = window.weatherConfig || {};
    const location = config.location || {};

    const lat = location.lat || 35.64;
    const lon = location.lon || -77.39;
    const wfo = location.afdWFO || "MHX";

    // If using defaults, log a warning
    if (!config.location || !location.lat || !location.lon) {
        // Only show warning on county/city pages, not the index
        if (window.location.pathname.includes('/counties/') ||
            (window.location.pathname.endsWith('.html') && !window.location.pathname.endsWith('index.html'))) {
            console.warn('Invalid or missing location configuration. Using default Greenville, NC coordinates.');
        }
    }

    // Initialize weather data (check if element exists first)
    if (document.getElementById('current-temp')) {
        initWeather(lat, lon);
    }

    // Initialize forecast (check if element exists first)
    if (document.getElementById('forecast')) {
        fetchWeatherForecast(lat, lon);
    }

    // Initialize alerts (always try to fetch alerts as they might be needed)
    fetchCurrentWarnings(lat, lon);

    // Initialize AFD text (check if element exists first)
    if (document.getElementById('afd-content')) {
        fetchAFDText(wfo);
    }

    // Initialize detailed forecast (check if element exists first)
    if (document.getElementById('detailed-forecast')) {
        fetchDetailedForecast(lat, lon);
    }

    // Initialize meteogram (check if element exists first)
    if (document.getElementById('meteogram-chart-container')) {
        initMeteogram(lat, lon);
    }

    // Initialize satellite (check if element exists first)
    if (document.getElementById('satellite-image-container')) {
        initSatellite();
    }

    // Initialize radar (check if element exists first)
    if (document.getElementById('radar-image-container')) {
        initRadar();
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