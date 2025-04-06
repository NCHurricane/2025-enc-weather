/**
 * Weather Data Module
 * Handles fetching and formatting weather data directly from the API
 */

import { degreesToCardinal, pascalsToMillibars, celsiusToFahrenheit, metersToMiles } from './utils.js';

/**
 * Fetch current weather conditions for a specific location
 * Uses cached data first, falls back to API if necessary
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

        // Try to get data from cache file first
        try {
            const cacheResponse = await fetch('js/modules/weather_cache.json?t=' + Date.now());

            if (cacheResponse.ok) {
                const cacheData = await cacheResponse.json();

                // Find county name by matching coordinates
                const matchedCounty = findCountyByCoordinates(lat, lon);

                if (matchedCounty && cacheData.temperatures && cacheData.temperatures[matchedCounty]) {
                    const cachedTemp = cacheData.temperatures[matchedCounty];

                    console.log("Debug timestamps:", {
                        currentTime: Date.now() / 1000,
                        cacheTimestamp: cachedTemp.timestamp,
                        difference: Math.abs(Date.now() / 1000 - cachedTemp.timestamp)
                    });

                    // Check cache age (1 hour = 3600 seconds)
                    const cacheAge = Math.abs(Date.now() / 1000 - cachedTemp.timestamp);
                    console.log(`Cache check for ${matchedCounty}:`, {
                        cacheFound: true,
                        cacheAge: `${cacheAge.toFixed(2)} seconds`,
                        isCacheValid: cacheAge < 3600  // Changed from 900 to 3600
                    });

                    if (cacheAge < 3600) {
                        console.log(`Using cached data for ${matchedCounty}`);
                        return {
                            temp: cachedTemp.temp,
                            condition: cachedTemp.condition || 'Unknown',
                            dewpoint: 'N/A',
                            humidity: 'N/A',
                            wind: 'N/A',
                            visibility: 'N/A',
                            pressure: 'N/A',
                            time: new Date(cachedTemp.timestamp * 1000),
                            formattedTime: new Date(cachedTemp.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            stationName: `${matchedCounty} County`,
                            iconUrl: null
                        };
                    } else {
                        console.log(`Cache expired for ${matchedCounty}, falling back to API`);
                    }
                } else {
                    console.log(`No cache found for coordinates`, { lat, lon });
                }
            } else {
                console.log(`Cache file not accessible`);
            }
        } catch (cacheError) {
            console.log('Error accessing cache:', cacheError);
        }

        // If we get here, the cache wasn't available or was invalid
        // Fall back to direct API calls
        console.log('Fetching data from NWS API');

        // Step 1: Get the forecast office and grid coordinates
        const pointsResponse = await fetch(`https://api.weather.gov/points/${lat},${lon}`);
        if (!pointsResponse.ok) throw new Error(`HTTP error: ${pointsResponse.status}`);

        const pointsData = await pointsResponse.json();
        if (!pointsData.properties || !pointsData.properties.observationStations) {
            throw new Error('Invalid points data response');
        }

        // Step 2: Get nearby observation stations
        const stationUrl = pointsData.properties.observationStations;
        const stationsResponse = await fetch(stationUrl);
        if (!stationsResponse.ok) throw new Error(`HTTP error: ${stationsResponse.status}`);

        const stationsData = await stationsResponse.json();
        if (!stationsData.features || !stationsData.features.length || !stationsData.features[0].properties) {
            throw new Error('No observation stations found');
        }

        // Step 3: Get the latest observation from the nearest station
        const stationId = stationsData.features[0].properties.stationIdentifier;
        const obsResponse = await fetch(`https://api.weather.gov/stations/${stationId}/observations/latest`);
        if (!obsResponse.ok) throw new Error(`HTTP error: ${obsResponse.status}`);

        const obsData = await obsResponse.json();
        if (!obsData.properties) {
            throw new Error('Invalid observation data');
        }

        // Format API data for return
        const stationName = stationsData.features[0].properties.name;
        return formatObservationData(obsData.properties, stationName);
    } catch (error) {
        console.error('Error fetching weather data:', error);
        return getDefaultWeatherData();
    }
}

/**
 * Find county name by coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {string|null} County name or null if not found
 */
function findCountyByCoordinates(lat, lon) {
    // Find county name by matching coordinates approximately (using precision to 2 decimal places)
    const latRounded = parseFloat(lat).toFixed(2);
    const lonRounded = parseFloat(lon).toFixed(2);

    const matchedCounty = window.siteConfig?.counties?.find(county => {
        const countyLatRounded = parseFloat(county.lat).toFixed(2);
        const countyLonRounded = parseFloat(county.lon).toFixed(2);

        return countyLatRounded === latRounded && countyLonRounded === lonRounded;
    });

    return matchedCounty ? matchedCounty.name : null;
}

/**
 * Format observation data properties into a standardized object
 * 
 * @param {Object} properties - Observation properties from API
 * @param {string} stationName - Name of the weather station
 * @returns {Object} Formatted weather data
 */
function formatObservationData(properties, stationName) {
    // Format temperature (convert from C to F)
    const temperature = properties.temperature && properties.temperature.value !== null ?
        celsiusToFahrenheit(properties.temperature.value) : 'N/A';

    // Format dewpoint
    const dewpoint = properties.dewpoint && properties.dewpoint.value !== null ?
        celsiusToFahrenheit(properties.dewpoint.value) : 'N/A';

    // Format humidity
    const humidity = properties.relativeHumidity && properties.relativeHumidity.value !== null ?
        Math.round(properties.relativeHumidity.value) : 'N/A';

    // Format wind
    let windDisplay = 'N/A';
    if (properties.windSpeed && properties.windSpeed.value !== null) {
        const windSpeed = Math.round(properties.windSpeed.value * 2.23694); // Convert m/s to mph
        if (windSpeed === 0) {
            windDisplay = 'Calm';
        } else if (properties.windDirection && properties.windDirection.value !== null) {
            const direction = degreesToCardinal(properties.windDirection.value);
            windDisplay = `${windSpeed} mph from ${direction}`;
        } else {
            windDisplay = `${windSpeed} mph`;
        }
    }

    // Format visibility
    const visibility = properties.visibility && properties.visibility.value !== null ?
        metersToMiles(properties.visibility.value) : 'N/A';

    // Format pressure
    const pressure = properties.barometricPressure && properties.barometricPressure.value !== null ?
        pascalsToMillibars(properties.barometricPressure.value) : 'N/A';

    // Create observation time
    const observationTime = properties.timestamp ? new Date(properties.timestamp) : null;
    const formattedTime = observationTime ?
        observationTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown';

    // Return formatted data
    return {
        temp: temperature,
        condition: properties.textDescription || 'Unknown',
        dewpoint: dewpoint,
        humidity: humidity,
        wind: windDisplay,
        visibility: visibility,
        pressure: pressure,
        time: observationTime,
        formattedTime: formattedTime,
        stationName: stationName,
        iconUrl: properties.icon
    };
}

/**
 * Get default weather data when actual data can't be retrieved
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

/**
 * Check if a date is within hurricane season
 * @param {Date} date - Date to check (defaults to current date)
 * @returns {boolean} Whether the date is in hurricane season
 */
export function isDateInHurricaneSeason(date = new Date()) {
    const config = window.siteConfig.tropicalWeather.season;
    const year = date.getFullYear();

    const seasonStart = new Date(`${year}-${config.start}`);
    const seasonEnd = new Date(`${year}-${config.end}`);

    return date >= seasonStart && date <= seasonEnd;
}