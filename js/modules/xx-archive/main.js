// main.js (updated)
// Ensures siteConfig is loaded, waits for it, then proceeds with weather app initialization

import './siteConfig.js'; // assumes siteConfig.js is at ../../js/siteConfig.js relative to county pages

import {
    initWeather,
    fetchAlerts,
    fetchAFDText,
    fetchWeatherForecast,
    fetchDetailedForecast,
    fetchFromZoneFiles
} from './modules/weatherData.js';
import { initMeteogram } from './modules/meteogram.js';
import { initSatellite } from './modules/satellite.js';
import { initRadar } from './modules/radar.js';
import AlertsModule from './modules/alertsModule.js';

/**
 * Extract county name from URL if not provided via config
 */
function extractCountyNameFromURL() {
    const path = window.location.pathname;
    const match = path.match(/\/counties\/(\w+)\//);
    return match ? match[1] : null;
}

/**
 * Wait until siteConfig is available (with timeout)
 */
async function waitForSiteConfig(timeoutMs = 2000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (window.siteConfig && Array.isArray(window.siteConfig.counties)) return true;
        await new Promise(r => setTimeout(r, 50));
    }
    console.warn('Timed out waiting for siteConfig');
    return false;
}

async function updateData() {
    const config = window.weatherConfig || {};
    const location = config.location || {};

    const lat = location.lat || 35.64;
    const lon = location.lon || -77.39;
    const wfo = location.afdWFO || 'MHX';
    const countyName = (location.countyName || extractCountyNameFromURL())?.toLowerCase();

    // Determine if this is a county-specific page
    const isCountyPage = /\/counties\/(\w+)\//.test(window.location.pathname);

    // Warn only if it's a county page (since index/regional pages may intentionally use defaults)
    if (isCountyPage && (!config.location || (!location.lat && !location.countyName))) {
        console.warn('Invalid or missing location configuration for county page. Using default coordinates.');
    }

    async function fetchCountyWeatherData(name) {
        if (!name) {
            console.warn('No county name found. Cannot fetch county-specific weather data.');
            return null;
        }

        try {
            console.log(`Fetching weather data for county: ${name}`);

            // 1. Try standard county-level cache files
            const standardPaths = [
                `../../js/modules/cache/${name}_weather.json`,
                `js/modules/cache/${name}_weather.json`,
                `./js/modules/cache/${name}_weather.json`
            ];

            for (const path of standardPaths) {
                try {
                    console.log(`Attempting standard file: ${path}`);
                    const result = await fetch(`${path}?t=${Date.now()}`);
                    if (result.ok) {
                        console.log(`Found standard weather file: ${path}`);
                        return await result.json();
                    }
                } catch (e) {
                    console.log(`Fetch error for ${path}:`, e.message);
                }
            }

            // 2. Zone-based fallback via shared helper
            if (typeof fetchFromZoneFiles === 'function') {
                const zoneData = await fetchFromZoneFiles(name, 'weather');
                if (zoneData) return zoneData;
            } else {
                console.warn('fetchFromZoneFiles not available; ensure weatherData.js exports it correctly.');
            }

            throw new Error('No weather cache file found for county');
        } catch (error) {
            console.error(`Error fetching weather data for ${name}:`, error);
            return null;
        }
    }

    // Current conditions
    if (document.getElementById('current-temp')) {
        const weatherData = await fetchCountyWeatherData(countyName);
        if (weatherData && weatherData.weather) {
            initWeather(lat, lon, weatherData.weather);
        } else {
            initWeather(lat, lon);
        }
    }

    // Forecast
    if (document.getElementById('forecast')) {
        fetchWeatherForecast(lat, lon);
    }

    // Alerts
    if (document.getElementById('alerts')) {
        console.log('Fetching alerts for coordinates:', { lat, lon });
        try {
            const alertsModule = new AlertsModule();
            // countyName must be defined earlier, same as before
            await alertsModule.init(lat, lon, countyName);
            // AlertsModule.init handles rendering internally
        } catch (error) {
            console.error('Error initializing AlertsModule:', error);
            // Optional: clear or show placeholder if desired
        }
    }

    // AFD
    if (document.getElementById('afd-content')) {
        fetchAFDText(wfo);
    }

    // Detailed forecast
    if (document.getElementById('detailed-forecast')) {
        fetchDetailedForecast(lat, lon);
    }

    // Meteogram
    if (document.getElementById('meteogram-chart-container')) {
        initMeteogram(lat, lon);
    }

    // Satellite & radar
    if (document.getElementById('satellite-image-container')) {
        initSatellite();
    }
    if (document.getElementById('radar-image-container')) {
        initRadar();
    }
}

/**
 * Entry point: wait for config then run update
 */
async function initializeWeatherApp() {
    await waitForSiteConfig();
    await updateData();
}

initializeWeatherApp();
