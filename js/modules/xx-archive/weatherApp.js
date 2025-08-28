/**
 * weatherApp.js
 * Main entry point for the weather application
 */

import dataService from './dataService.js';
import CurrentConditionsModule from './currentConditionsModule.js';
import ForecastModule from './forecastModule.js';
import AlertsModule from './alertsModule.js';

// Module instances
let currentConditionsModule = null;
let forecastModule = null;
let alertsModule = null;
let radarModule = null;
let satelliteModule = null;
let tropicalModule = null;

/**
 * Initialize the weather application
 * @param {Object} config - Configuration object from page
 * @returns {Promise<boolean>} - Success status
 */
export async function initWeatherApp(config = {}) {
  try {
    console.log('Initializing Weather App...');

    // Extract configuration values with fallbacks
    const location = config.location || {};
    const lat = location.lat || 35.64;
    const lon = location.lon || -77.39;
    const countyName = location.countyName || extractCountyNameFromURL();
    const wfo = location.afdWFO || "MHX";

    // Store these for later use
    window.weatherAppConfig = {
      lat,
      lon,
      countyName,
      wfo
    };

    // Initialize modules based on available DOM elements
    const initPromises = [];

    // Initialize current conditions if element exists
    if (document.getElementById('current-temp')) {
      console.log('Initializing Current Conditions Module...');
      currentConditionsModule = new CurrentConditionsModule();

      // Try to get any preloaded weather data from the page
      const preloadedWeatherData = getPreloadedWeatherData();

      initPromises.push(currentConditionsModule.init(lat, lon, countyName, preloadedWeatherData));
    }

    // Initialize forecast module if either forecast element exists
    if (document.getElementById('forecast') || document.getElementById('detailed-forecast')) {
      console.log('Initializing Forecast Module...');
      forecastModule = new ForecastModule();

      // Try to get any preloaded forecast data
      const preloadedForecastData = getPreloadedForecastData();

      initPromises.push(forecastModule.init(lat, lon, countyName, preloadedForecastData));
    }

    // Initialize alerts module if element exists
    if (document.getElementById('alerts')) {
      console.log('Initializing Alerts Module...');
      alertsModule = new AlertsModule();
      initPromises.push(alertsModule.init(lat, lon, countyName));
    }

    // Initialize AFD if element exists
    if (document.getElementById('afd-content')) {
      console.log('Loading AFD data...');
      initPromises.push(loadAFDData(wfo));
    }

    // Wait for all initializations to complete
    await Promise.all(initPromises);

    // Setup refresh button handler
    setupRefreshButton();

    // Setup other event handlers
    setupEventHandlers();

    console.log('Weather App initialization complete');
    return true;
  } catch (error) {
    console.error('Failed to initialize Weather App:', error);
    return false;
  }
}

/**
 * Try to extract any preloaded weather data from the page
 * @returns {Object|null} - Preloaded weather data or null
 */
function getPreloadedWeatherData() {
  // If the page had PHP-generated data embedded, extract it
  if (window.preloadedWeatherData) {
    return window.preloadedWeatherData;
  }
  return null;
}

/**
 * Try to extract any preloaded forecast data from the page
 * @returns {Object|null} - Preloaded forecast data or null
 */
function getPreloadedForecastData() {
  // If the page had PHP-generated data embedded, extract it
  if (window.preloadedForecastData) {
    return window.preloadedForecastData;
  }
  return null;
}

/**
 * Extract county name from the current page URL
 * @returns {string|null} - County name or null
 */
function extractCountyNameFromURL() {
  const path = window.location.pathname;
  const match = path.match(/\/counties\/(\w+)\//);
  return match ? match[1] : null;
}

/**
 * Set up refresh button functionality
 */
function setupRefreshButton() {
  const refreshButton = document.getElementById('global-refresh');
  if (refreshButton) {
    refreshButton.addEventListener('click', async function () {
      // Add refreshing class for visual feedback
      this.classList.add('refreshing');

      // Create an array to hold all refresh promises
      const refreshPromises = [];

      // Refresh current conditions if module is active
      if (currentConditionsModule) {
        refreshPromises.push(currentConditionsModule.refresh());
      }

      // Refresh forecast if module is active
      if (forecastModule) {
        refreshPromises.push(forecastModule.refresh());
      }

      // Refresh alerts if module is active
      if (alertsModule) {
        refreshPromises.push(alertsModule.refresh());
      }

      // Add refresh for AFD if that section exists
      if (document.getElementById('afd-content')) {
        const config = window.weatherAppConfig || {};
        refreshPromises.push(loadAFDData(config.wfo));
      }

      // Wait for all refreshes to complete
      await Promise.all(refreshPromises);

      // Remove refreshing class after animation
      setTimeout(() => {
        this.classList.remove('refreshing');
      }, 2000);
    });
  }
}

/**
 * Load AFD data and update the DOM
 * @param {string} wfo - Weather Forecast Office identifier
 * @returns {Promise<boolean>} - Success status
 */
async function loadAFDData(wfo) {
  try {
    // Get AFD data using the data service
    const afdData = await dataService.getData('afd', { wfo });

    // Update the DOM
    const afdElement = document.getElementById('afd-content');
    if (afdElement && afdData.content) {
      afdElement.innerHTML = afdData.content;
    }

    return true;
  } catch (error) {
    console.error('Error loading AFD data:', error);
    const afdElement = document.getElementById('afd-content');
    if (afdElement) {
      afdElement.innerHTML = "Error loading forecast discussion. Please try again later.";
    }
    return false;
  }
}

/**
 * Set up event handlers for all interactive elements
 */
function setupEventHandlers() {
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

  // Setup submenu toggle for mobile
  setupSubmenuToggle();

  // Setup back-to-top button
  setupBackToTopButton();
}

/**
 * Setup submenu toggle for mobile/tablet
 */
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

/**
 * Setup back-to-top button functionality
 */
function setupBackToTopButton() {
  const btn = document.querySelector('.back-to-top');
  if (btn) {
    // Set initial state
    btn.style.display = window.pageYOffset > 0 ? 'block' : 'none';

    window.addEventListener('scroll', () => {
      btn.style.display = window.pageYOffset > 0 ? 'block' : 'none';
    });

    // Add click handler
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
}

/**
 * Force refresh all modules
 * @returns {Promise<boolean>} - Success status
 */
export async function refreshAll() {
  try {
    // Create an array to hold all refresh promises
    const refreshPromises = [];

    // Refresh current conditions if module is active
    if (currentConditionsModule) {
      refreshPromises.push(currentConditionsModule.refresh());
    }

    // Refresh forecast if module is active
    if (forecastModule) {
      refreshPromises.push(forecastModule.refresh());
    }

    // Refresh alerts if module is active
    if (alertsModule) {
      refreshPromises.push(alertsModule.refresh());
    }

    // Wait for all refreshes to complete
    await Promise.all(refreshPromises);

    return true;
  } catch (error) {
    console.error('Error refreshing weather data:', error);
    return false;
  }
}

/**
 * Clear all cached data
 * @returns {boolean} - Success status
 */
export function clearCache() {
  try {
    // Clear the data service cache
    dataService.clearCache();

    // Force refresh all modules
    refreshAll();

    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
}

/**
 * Get config value with fallbacks
 * @param {string} key - Config key
 * @param {*} defaultValue - Default value
 * @returns {*} - Config value or default
 */
export function getConfig(key, defaultValue) {
  if (!window.weatherAppConfig) {
    return defaultValue;
  }

  return window.weatherAppConfig[key] !== undefined ?
    window.weatherAppConfig[key] : defaultValue;
}

// Export module instances for potential access from other scripts
export {
  currentConditionsModule,
  forecastModule,
  alertsModule,
  radarModule,
  satelliteModule,
  tropicalModule
};