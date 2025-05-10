/**
 * Index Page Specific JavaScript
 * Handles map initialization, weather data fetching, and UI updates for the main page
 */

import { updateTropicalOutlook, checkActiveSystemsStatus, updateTropicalAlertBanner } from './modules/tropical.js';
import { initCountyMap } from './modules/ncCountyMap.js';
import { initTropicalBanner } from './modules/tropical-banner.js';

async function initIndexPage() {
    console.log('Initializing index page...');

    // Initialize the NC County Map
    const countyMap = initCountyMap();

    // Store the map instance globally for debugging or future access
    window.countyMap = countyMap;

    // Initialize tropical banner system - this will handle both 
    // active systems and "No Active Systems" display
    initTropicalBanner();

    // Load tropical outlook
    updateTropicalOutlook();

    // Check for active tropical systems for the full-page banner
    const hasActiveSystems = await checkActiveSystemsStatus();
    updateTropicalAlertBanner(hasActiveSystems);

    // Set up event handlers
    setupEventHandlers();

    // Set up auto-refresh
    setInterval(() => {
        console.log('Auto-refreshing weather data');

        // Refresh the county map if available
        if (window.countyMap && typeof window.countyMap.refresh === 'function') {
            window.countyMap.refresh();
        }

        // Refresh tropical banner
        initTropicalBanner();

        // Refresh tropical data
        updateTropicalOutlook();
        checkActiveSystemsStatus().then(hasActiveSystems => {
            updateTropicalAlertBanner(hasActiveSystems);
        });
    }, 300000); // Refresh every 5 minutes
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

            // Refresh the county map if available
            if (window.countyMap && typeof window.countyMap.refresh === 'function') {
                window.countyMap.refresh();
            }

            // Refresh tropical data
            updateTropicalOutlook();
            checkActiveSystemsStatus().then(hasActiveSystems => {
                updateTropicalAlertBanner(hasActiveSystems);
            });

            // Remove refreshing class after animation
            setTimeout(() => {
                this.classList.remove('refreshing');
            }, 2000);
        });
    }

    // Setup hamburger menu
    // const hamburger = document.getElementById('hamburger');
    // const nav = document.querySelector('.nav');
    // if (hamburger && nav) {
    //     hamburger.addEventListener('click', () => {
    //         hamburger.classList.toggle('active');
    //         nav.classList.toggle('active');

    //         const icon = hamburger.querySelector('i');
    //         if (icon) {
    //             icon.classList.toggle('fa-bars');
    //             icon.classList.toggle('fa-xmark');
    //         }
    //     });
    // }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initIndexPage);

// Add window resize event listener to handle responsive adjustments
window.addEventListener('resize', function () {
    // If the map has a resize handler, call it
    if (window.countyMap && typeof window.countyMap.handleResize === 'function') {
        window.countyMap.handleResize();
    }
});

// Export functions for potential use in other modules
export { initIndexPage };