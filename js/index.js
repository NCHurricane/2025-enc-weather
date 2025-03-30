/**
 * Index Page Specific JavaScript
 * Handles map initialization, weather data fetching, and UI updates for the main page
 */

import { safeSetHTML, safeSetText, createElement } from './modules/utils.js';
import { fetchCurrentWeather, getWeatherIcon } from './modules/weatherData.js';
import { updateTropicalOutlook, checkActiveSystemsStatus, updateTropicalAlertBanner } from './modules/tropical.js';
import { initCountyMap } from './modules/ncCountyMap.js';

// Global variables
let weatherMap;
let weatherMarkers = [];

// County coordinates for the SVG map
const countyCoordinates = {
    'bertie': { x: 310, y: 150, url: 'counties/bertie/windsor.html' },
    'pitt': { x: 380, y: 250, url: 'counties/pitt/greenville.html' },
    'beaufort': { x: 450, y: 280, url: 'counties/beaufort/washington.html' },
    'dare': { x: 620, y: 170, url: 'counties/dare/manteo.html' },
    'washington': { x: 390, y: 190, url: 'counties/washington/plymouth.html' },
    'tyrrell': { x: 500, y: 170, url: 'counties/tyrrell/columbia.html' },
    'hyde': { x: 550, y: 280, url: 'counties/hyde/swanquarter.html' }
};

// Replace initMap with createSVGMap
function createSVGMap() {
    const svgElement = document.getElementById('enc-map');
    if (!svgElement) return null;

    // Add county paths based on your county data
    const counties = window.siteConfig.counties;

    counties.forEach(county => {
        // Create a basic rectangular shape for each county
        const countyName = county.name.toLowerCase();
        const coords = countyCoordinates[countyName];

        if (coords) {
            // Create a simple rectangle for the county (placeholder)
            const countyPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');

            // Simple rectangle around the coordinate
            const width = 70;
            const height = 50;
            const x = coords.x - width / 2;
            const y = coords.y - height / 2;

            countyPath.setAttribute('d', `M ${x},${y} h ${width} v ${height} h -${width} z`);
            countyPath.setAttribute('id', countyName);
            countyPath.setAttribute('class', 'county');
            countyPath.setAttribute('data-url', coords.url);

            // Add click event to navigate to county page
            countyPath.addEventListener('click', () => {
                window.location.href = coords.url;
            });

            svgElement.appendChild(countyPath);

            // Add county name
            const nameLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            nameLabel.setAttribute('x', coords.x);
            nameLabel.setAttribute('y', coords.y + 30); // Below the temperature
            nameLabel.setAttribute('class', 'county-label');
            nameLabel.textContent = county.name;
            svgElement.appendChild(nameLabel);
        }
    });

    return svgElement;
}

// Function to update the SVG map with temperature data
function updateSVGTemperatures() {
    const svg = document.getElementById('enc-map');
    if (!svg) return;

    // Clear any existing temperature markers
    const existingMarkers = document.querySelectorAll('.temp-marker');
    existingMarkers.forEach(marker => marker.remove());

    // For each county in the config, update the temp
    window.siteConfig.counties.forEach(async county => {
        try {
            const countyName = county.name.toLowerCase();
            const coords = countyCoordinates[countyName];

            if (coords) {
                // Use your existing fetchCurrentWeather function
                const weatherData = await fetchCurrentWeather(county.lat, county.lon);

                // Create temperature marker
                const tempMarker = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                tempMarker.setAttribute('x', coords.x);
                tempMarker.setAttribute('y', coords.y);
                tempMarker.setAttribute('class', 'temp-marker');
                tempMarker.textContent = `${weatherData.temp}°`;

                svg.appendChild(tempMarker);
            }
        } catch (error) {
            console.error(`Error updating temperature for ${county.name}:`, error);
        }
    });
}

// Modify the existing refreshWeatherData function
// Instead of replacing it, modify it:
async function refreshWeatherData() {
    // Clear existing markers (from original function)
    if (weatherMarkers.length > 0) {
        weatherMarkers.forEach(marker => {
            if (weatherMap) {
                weatherMap.removeLayer(marker);
            }
        });
        weatherMarkers = [];
    }

    // Clear county cards (from original function)
    const cardsContainer = document.querySelector('.county-cards');
    if (cardsContainer) {
        cardsContainer.innerHTML = '';
    }

    // Update SVG map temperatures
    updateSVGTemperatures();

    // Update tropical section (from original function)
    updateTropicalOutlook();

    // Check for active tropical systems (from original function)
    const hasActiveSystems = await checkActiveSystemsStatus();
    updateTropicalAlertBanner(hasActiveSystems);
}


// Update initIndexPage
async function initIndexPage() {
    // Create SVG map (replaces Leaflet map initialization)
    createSVGMap();

    // Load weather data and update temperatures
    updateSVGTemperatures();

    // Load tropical outlook (from original function)
    updateTropicalOutlook();

    // Check for active tropical systems (from original function)
    const hasActiveSystems = await checkActiveSystemsStatus();
    updateTropicalAlertBanner(hasActiveSystems);

    // Set up event handlers (from original function)
    setupEventHandlers();
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
    // const mapConfig = window.siteConfig.map;
    // let newZoom;

    // if (viewportWidth < 600) {
    //     // Mobile phones
    //     newZoom = mapConfig.defaultZoom - 1;
    // } else if (viewportWidth < 992) {
    //     // Tablets
    //     newZoom = mapConfig.defaultZoom - .8;
    // } else {
    //     // Desktops and larger screens
    //     newZoom = mapConfig.defaultZoom;
    // }

    // // Update map zoom if it exists
    // if (weatherMap) {
    //     weatherMap.setZoom(newZoom);
    // }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initIndexPage);
document.addEventListener('DOMContentLoaded', function () {
    // Initialize the county map
    initCountyMap();
});