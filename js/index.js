/**
 * Index Page Specific JavaScript
 * Handles map initialization, weather data fetching, and UI updates for the main page
 */

import { safeSetHTML, safeSetText, createElement } from './modules/utils.js';
import { fetchCurrentWeather, getWeatherIcon } from './modules/weatherData.js';
import { updateTropicalOutlook, checkActiveSystemsStatus, updateTropicalAlertBanner } from './modules/tropical.js';

// Global variables
let weatherMap;
let weatherMarkers = [];

/**
 * Initialize the map with base tiles and settings
 * @returns {Object} Leaflet map instance
 */
function initMap() {
    // Get map configuration
    const mapConfig = window.siteConfig.map;

    // Determine zoom level based on viewport width
    let responsiveZoom = mapConfig.defaultZoom;

    // Get current viewport width
    const viewportWidth = window.innerWidth;

    // Adjust zoom based on screen size with fractional values
    if (viewportWidth < 576) {
        // Mobile phones
        responsiveZoom = mapConfig.defaultZoom - 1;
    } else if (viewportWidth < 992) {
        // Tablets
        responsiveZoom = mapConfig.defaultZoom - .8;
    } else {
        // Desktops and larger screens
        responsiveZoom = mapConfig.defaultZoom;
    }

    // Create map centered on Eastern North Carolina
    const map = L.map('weather-map', {
        center: mapConfig.center,
        zoom: responsiveZoom,
        minZoom: mapConfig.minZoom,
        maxZoom: mapConfig.maxZoom,
        zoomControl: true
    });

    // Add a different base map - change this URL to use a different map style
    L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.{ext}', {
        minZoom: 0,
        maxZoom: 20,
        attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        ext: 'png'

    }).addTo(map);

    return map;
}

/**
 * Create a custom weather marker for the map
 * @param {Object} map - Leaflet map instance
 * @param {Object} countyData - County information
 * @param {Object} weatherData - Weather information
 * @returns {Object} Leaflet marker instance
 */
function createWeatherMarker(map, countyData, weatherData) {
    // Create a custom icon for the weather marker
    const weatherIcon = L.divIcon({
        className: 'weather-marker',
        html: `<div class="marker-temp">${weatherData.temp}°</div>
               <!-- <div class="marker-name">${countyData.city}</div>-->`,
        iconSize: [60, 40]
    });

    // Create marker
    const marker = L.marker([countyData.lat, countyData.lon], {
        icon: weatherIcon
    }).addTo(map);

    // Add popup with more information
    const popupContent = `
    <div class="county-popup">
        <h3>${countyData.city}, ${countyData.name} County</h3>
        <div class="popup-temp">${weatherData.temp}°</div>
        <div class="popup-condition">${weatherData.condition}</div>
        <div class="popup-details">
            <p><strong>Humidity:</strong> ${weatherData.humidity}%</p>
            <p><strong>Wind:</strong> ${weatherData.wind}</p>
        </div>
        <div class="popup-station">${weatherData.stationName}</div>
        <a href="${countyData.url}" class="popup-link">View Details</a>
    </div>
`;

    marker.bindPopup(popupContent);

    // Add click handler to navigate to county page
    marker.on('click', function () {
        marker.openPopup();
    });

    return marker;
}



/**
 * Set up event handlers for interactive elements
 */
function setupEventHandlers() {
    // Add refresh button functionality
    const refreshButton = document.getElementById('global-refresh');
    if (refreshButton) {
        refreshButton.addEventListener('click', function () {
            this.classList.add('refreshing');
            // Refresh data without full page reload
            refreshWeatherData();

            // Remove refreshing class after animation
            setTimeout(() => {
                this.classList.remove('refreshing');
            }, 2000);
        });
    }

    // Add click handlers to county cards
    document.querySelectorAll('.county-card').forEach(card => {
        card.addEventListener('click', function () {
            window.location.href = this.dataset.url;
        });
    });

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

/**
 * Refresh weather data without reloading the page
 */
async function refreshWeatherData() {
    // Clear existing markers
    if (weatherMarkers.length > 0) {
        weatherMarkers.forEach(marker => {
            weatherMap.removeLayer(marker);
        });
        weatherMarkers = [];
    }

    // Clear county cards
    const cardsContainer = document.querySelector('.county-cards');
    if (cardsContainer) {
        cardsContainer.innerHTML = '';
    }

    // Re-fetch and update data
    await loadCountyWeatherData();

    // Update tropical section
    updateTropicalOutlook();

    // Check for active tropical systems
    const hasActiveSystems = await checkActiveSystemsStatus();
    updateTropicalAlertBanner(hasActiveSystems);
}

/**
 * Load weather data for all counties
 */
async function loadCountyWeatherData() {
    // Get counties from config
    const counties = window.siteConfig.counties;
    const cardsContainer = document.querySelector('.county-cards');

    // Process each county
    for (const county of counties) {
        try {
            // Fetch weather data
            const weatherData = await fetchCurrentWeather(county.lat, county.lon);

            // Create map marker for desktop view
            const marker = createWeatherMarker(weatherMap, county, weatherData);
            weatherMarkers.push(marker);

            // Create county card for mobile view
            if (cardsContainer) {
                const cardHtml = createCountyCard(county, weatherData);
                cardsContainer.innerHTML += cardHtml;
            }
        } catch (error) {
            console.error(`Error processing ${county.city}:`, error);
        }
    }

    // Re-attach click handlers to new cards
    document.querySelectorAll('.county-card').forEach(card => {
        card.addEventListener('click', function () {
            window.location.href = this.dataset.url;
        });
    });
}

// Add window resize event listener
window.addEventListener('resize', function () {
    // Recalculate zoom based on new viewport size
    const viewportWidth = window.innerWidth;
    const mapConfig = window.siteConfig.map;
    let newZoom;

    if (viewportWidth < 600) {
        // Mobile phones
        newZoom = mapConfig.defaultZoom - 1;
    } else if (viewportWidth < 992) {
        // Tablets
        newZoom = mapConfig.defaultZoom - .8;
    } else {
        // Desktops and larger screens
        newZoom = mapConfig.defaultZoom;
    }

    // Update map zoom if it exists
    if (weatherMap) {
        weatherMap.setZoom(newZoom);
    }
});

/**
 * Main function to initialize the index page
 */
async function initIndexPage() {
    // Initialize map for large screens
    weatherMap = initMap();

    // Load weather data for all counties
    await loadCountyWeatherData();

    // Update tropical weather section based on season
    updateTropicalOutlook();

    // Check for active tropical systems
    const hasActiveSystems = await checkActiveSystemsStatus();
    updateTropicalAlertBanner(hasActiveSystems);

    // Set up event handlers
    setupEventHandlers();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initIndexPage);