/**
 * Weather Data Module
 * Handles fetching and formatting weather data directly from county-specific JSON cache
 */

import { degreesToCardinal, celsiusToFahrenheit, pascalsToMillibars, metersToMiles } from './utils.js';

/**
 * Extract county name from coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {string|null} County name or null if not found
 */
function findCountyByCoordinates(lat, lon) {
    const counties = window.siteConfig?.counties || [];
    return counties.find(county =>
        Math.abs(county.lat - lat) < 0.1 &&
        Math.abs(county.lon - lon) < 0.1
    )?.name || null;
}

/**
 * Fetch current weather conditions for a specific location
 * Uses county-specific JSON cache with API fallback
 * 
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Formatted weather data
 */
export async function fetchCurrentWeather(lat, lon) {
    try {
        // Validate inputs
        if (!lat || !lon) {
            throw new Error('Invalid coordinates provided');
        }

        // Identify county by coordinates
        const countyName = findCountyByCoordinates(lat, lon);

        if (!countyName) {
            console.warn('No matching county found for coordinates:', { lat, lon });
            return getDefaultWeatherData();
        }

        try {
            // Fetch county-specific JSON cache
            const response = await fetch(`js/modules/cache/${countyName.toLowerCase()}_weather.json?t=${Date.now()}`);

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            const data = await response.json();

            // Check if weather data exists
            if (!data.weather) {
                console.warn(`No weather data found in cache for ${countyName}`);
                return getDefaultWeatherData();
            }

            // Return formatted data
            return formatWeatherData(data.weather);

        } catch (cacheError) {
            console.warn(`Error accessing cache for ${countyName}:`, cacheError);

            // Fallback to API if cache fetch fails
            return await fetchWeatherFromAPI(lat, lon);
        }
    } catch (error) {
        console.error('Comprehensive weather data retrieval failed:', error);
        return getDefaultWeatherData();
    }
}

/**
 * Fallback method to fetch data directly from NWS API
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Formatted weather data
 */
async function fetchWeatherFromAPI(lat, lon) {
    try {
        const pointsResponse = await fetch(`https://api.weather.gov/points/${lat},${lon}`);
        if (!pointsResponse.ok) throw new Error(`HTTP error: ${pointsResponse.status}`);

        const pointsData = await pointsResponse.json();
        if (!pointsData.properties || !pointsData.properties.observationStations) {
            throw new Error('Invalid points data response');
        }

        const stationUrl = pointsData.properties.observationStations;
        const stationsResponse = await fetch(stationUrl);
        if (!stationsResponse.ok) throw new Error(`HTTP error: ${stationsResponse.status}`);

        const stationsData = await stationsResponse.json();
        if (!stationsData.features || !stationsData.features.length) {
            throw new Error('No observation stations found');
        }

        const stationId = stationsData.features[0].properties.stationIdentifier;
        const obsResponse = await fetch(`https://api.weather.gov/stations/${stationId}/observations/latest`);
        if (!obsResponse.ok) throw new Error(`HTTP error: ${obsResponse.status}`);

        const obsData = await obsResponse.json();
        if (!obsData.properties) {
            throw new Error('Invalid observation data');
        }

        return formatObservationData(obsData.properties, stationsData.features[0].properties.name);
    } catch (error) {
        console.error('API fallback failed:', error);
        return getDefaultWeatherData();
    }
}

/**
 * Format weather data from county cache JSON
 * @param {Object} weatherData - Raw weather data from cache
 * @returns {Object} Formatted weather object
 */
function formatWeatherData(weatherData) {
    return {
        temp: formatTemperature(weatherData.temperature),
        condition: weatherData.skyConditions || 'Unknown',
        dewpoint: formatDewpoint(weatherData.dewPoint),
        humidity: formatHumidity(weatherData.humidity),
        wind: formatWind(weatherData.windSpeed, weatherData.windDirectionCardinal),
        visibility: formatVisibility(weatherData.visibility),
        pressure: formatPressure(weatherData.pressure),
        time: new Date(weatherData.timestamp * 1000),
        formattedTime: formatTime(weatherData.timestamp),
        stationName: weatherData.stationName || 'Local Station',
        iconUrl: null  // County cache JSONs don't include icon URLs
    };
}

/**
 * Helper formatting functions
 */
function formatTemperature(temp) {
    return temp !== null && temp !== undefined
        ? Math.round(typeof temp === 'string' ? parseFloat(temp) : temp)
        : 'N/A';
}

function formatDewpoint(dewpoint) {
    return dewpoint !== null && dewpoint !== undefined
        ? Math.round(dewpoint)
        : 'N/A';
}

function formatHumidity(humidity) {
    return humidity !== null && humidity !== undefined
        ? Math.round(humidity)
        : 'N/A';
}

function formatWind(speed, direction) {
    if (speed === null || speed === undefined) return 'N/A';

    const windSpeed = Math.round(speed);
    return windSpeed === 0
        ? 'Calm'
        : `${windSpeed} mph from ${direction || 'N/A'}`;
}

function formatVisibility(visibility) {
    return visibility !== null && visibility !== undefined
        ? visibility
        : 'N/A';
}

function formatPressure(pressure) {
    return pressure !== null && pressure !== undefined
        ? pressure
        : 'N/A';
}

function formatTime(timestamp) {
    return timestamp
        ? new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Unknown';
}

/**
 * Fallback function for when no weather data can be retrieved
 * @returns {Object} Default weather data object
 */
function getDefaultWeatherData() {
    return {
        temp: 'N/A',
        condition: 'Data Unavailable',
        dewpoint: 'N/A',
        humidity: 'N/A',
        wind: 'N/A',
        visibility: 'N/A',
        pressure: 'N/A',
        time: null,
        formattedTime: 'N/A',
        stationName: 'Unknown Station',
        iconUrl: null
    };
}

/**
 * Get appropriate weather icon based on condition text
 * @param {string} condition - Weather condition text
 * @returns {string} Font Awesome icon class
 */
export function getWeatherIcon(condition) {
    if (!condition || condition === 'N/A') {
        return 'fa-solid fa-question';
    }

    const conditionLower = condition.toLowerCase();

    if (conditionLower.includes('thunderstorm') || conditionLower.includes('lightning')) {
        return 'fa-solid fa-cloud-bolt';
    } else if (conditionLower.includes('rain') && conditionLower.includes('snow')) {
        return 'fa-solid fa-cloud-sleet';
    } else if (conditionLower.includes('rain') || conditionLower.includes('drizzle') || conditionLower.includes('shower')) {
        return 'fa-solid fa-cloud-rain';
    } else if (conditionLower.includes('snow') || conditionLower.includes('flurr')) {
        return 'fa-solid fa-snowflake';
    } else if (conditionLower.includes('sleet') || conditionLower.includes('pellets') || conditionLower.includes('ice')) {
        return 'fa-solid fa-cloud-hail';
    } else if (conditionLower.includes('fog') || conditionLower.includes('haze') || conditionLower.includes('mist')) {
        return 'fa-solid fa-cloud-fog';
    } else if (conditionLower.includes('cloud')) {
        if (conditionLower.includes('few') || conditionLower.includes('partly')) {
            return 'fa-solid fa-cloud-sun';
        } else {
            return 'fa-solid fa-cloud';
        }
    } else if (conditionLower.includes('clear') || conditionLower.includes('sunny') || conditionLower.includes('fair')) {
        return 'fa-solid fa-sun';
    } else {
        return 'fa-solid fa-cloud';
    }
}

export function isDateInHurricaneSeason(date = new Date()) {
    const config = window.siteConfig.tropicalWeather.season;
    const year = date.getFullYear();

    const seasonStart = new Date(`${year}-${config.start}`);
    const seasonEnd = new Date(`${year}-${config.end}`);

    return date >= seasonStart && date <= seasonEnd;
}