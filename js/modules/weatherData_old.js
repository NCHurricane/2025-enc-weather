/**
 * Weather Data Module
 * Handles fetching and formatting weather data directly from the API
 */

import { degreesToCardinal, pascalsToMillibars, celsiusToFahrenheit, metersToMiles } from './utils.js';

/**
 * Fetch current weather conditions for a specific location
 * Uses direct API calls
 * 
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Formatted weather data
 */


// export async function fetchCurrentWeather(lat, lon) {
//     try {
//         // Validate inputs
//         if (!lat || !lon) {
//             throw new Error('Invalid coordinates provided');
//         }

//         // Try to get data from cache file first
//         try {
//             const cacheResponse = await fetch('weather_cache.json');

//             if (cacheResponse.ok) {
//                 const cacheData = await cacheResponse.json();

//                 // Find county name by matching coordinates
//                 const matchedCounty = window.siteConfig.counties.find(county =>
//                     county.lat.toFixed(4) === lat.toFixed(4) &&
//                     county.lon.toFixed(4) === lon.toFixed(4)
//                 );

//                 if (matchedCounty && cacheData.temperatures && cacheData.temperatures[matchedCounty.name]) {
//                     const cachedTemp = cacheData.temperatures[matchedCounty.name];

//                     // Check cache age (15 minutes = 900 seconds)
//                     const cacheAge = Math.abs(Date.now() / 1000 - cachedTemp.timestamp);
//                     console.log(`Cache check for ${matchedCounty.name}:`, {
//                         cacheFound: true,
//                         cacheAge: `${cacheAge.toFixed(2)} seconds`,
//                         isCacheValid: cacheAge < 900
//                     });

//                     if (cacheAge < 900) {
//                         console.log(`%c Using cached data for ${matchedCounty.name}`, 'color: green; font-weight: bold;');
//                         return {
//                             temp: cachedTemp.temp,
//                             condition: cachedTemp.condition || 'Unknown',
//                             dewpoint: 'N/A',
//                             humidity: 'N/A',
//                             wind: 'N/A',
//                             visibility: 'N/A',
//                             pressure: 'N/A',
//                             time: new Date(cachedTemp.timestamp * 1000),
//                             formattedTime: new Date(cachedTemp.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
//                             stationName: `${matchedCounty.name} County`,
//                             iconUrl: null
//                         };
//                     } else {
//                         console.log(`%c Cache expired for ${matchedCounty.name}, falling back to API`, 'color: orange; font-weight: bold;');
//                     }
//                 } else {
//                     console.log(`%c No cache found for coordinates`, 'color: red; font-weight: bold;', { lat, lon });
//                 }
//             } else {
//                 console.log(`%c Cache file not accessible`, 'color: red; font-weight: bold;');
//             }
//         } catch (cacheError) {
//             console.log('%c Error accessing cache', 'color: red; font-weight: bold;', cacheError);
//         }

//         // Fallback to API fetch
//         console.log('%c Fetching data from NWS API', 'color: blue; font-weight: bold;');

//         // Rest of the existing API fetch logic remains the same...
//         // (Full API fetch code from previous example)
//     } catch (error) {
//         console.error('Error fetching weather data:', error);
//         return getDefaultWeatherData();
//     }
// }

/**
 * Fetch current weather conditions for a specific location
 * Uses cached data first, falls back to API if necessary
 * 
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Formatted weather data
 */
// export async function fetchCurrentWeather(lat, lon) {
//     try {
//         // Validate inputs
//         if (!lat || !lon) {
//             throw new Error('Invalid coordinates provided');
//         }

//         // Try to get data from cache file first
//         try {
//             const cacheResponse = await fetch('js/modules/weather_cache.json');

//             if (cacheResponse.ok) {
//                 const cacheData = await cacheResponse.json();

//                 // Find county name by matching coordinates approximately (using precision to 2 decimal places)
//                 // This helps with floating point comparison
//                 const latRounded = parseFloat(lat).toFixed(2);
//                 const lonRounded = parseFloat(lon).toFixed(2);

//                 const matchedCounty = window.siteConfig?.counties?.find(county =>
//                     parseFloat(county.lat).toFixed(2) === latRounded &&
//                     parseFloat(county.lon).toFixed(2) === lonRounded
//                 );

//                 if (matchedCounty && cacheData.temperatures && cacheData.temperatures[matchedCounty.name]) {
//                     const cachedData = cacheData.temperatures[matchedCounty.name];

//                     // Current time in seconds since epoch (not milliseconds)
//                     const currentTimeSeconds = Math.floor(Date.now() / 1000);

//                     // Calculate cache age, ensuring both timestamps are in seconds
//                     const cacheAge = Math.abs(currentTimeSeconds - cachedData.timestamp);

//                     console.log(`Cache check for ${matchedCounty.name}:`, {
//                         cacheFound: true,
//                         cacheAge: `${Math.round(cacheAge)} seconds`,
//                         isCacheValid: cacheAge < 900,
//                         cachedTimestamp: cachedData.timestamp,
//                         currentTimeSeconds: currentTimeSeconds
//                     });

//                     if (cacheAge < 900) {
//                         console.log(`Using cached data for ${matchedCounty.name}`);
//                         return {
//                             temp: cachedData.temp,
//                             condition: cachedData.condition || 'Unknown',
//                             dewpoint: 'N/A',
//                             humidity: 'N/A',
//                             wind: 'N/A',
//                             visibility: 'N/A',
//                             pressure: 'N/A',
//                             time: new Date(cachedData.timestamp * 1000),
//                             formattedTime: new Date(cachedData.timestamp * 1000).toLocaleTimeString([], {
//                                 hour: '2-digit', minute: '2-digit'
//                             }),
//                             stationName: `${matchedCounty.name} County`,
//                             iconUrl: null
//                         };
//                     } else {
//                         console.log(`Cache expired for ${matchedCounty.name}, falling back to API`);
//                     }
//                 } else {
//                     console.log(`No cache found for coordinates`, { lat, lon });
//                 }
//             } else {
//                 console.log(`Cache file not accessible`);
//             }
//         } catch (cacheError) {
//             console.log('Error accessing cache:', cacheError);
//         }

//         // If we get here, the cache wasn't available or was invalid
//         // Fall back to direct API calls
//         console.log('Fetching data from NWS API');

//         // Step 1: Get the forecast office and grid coordinates
//         const pointsResponse = await fetch(`https://api.weather.gov/points/${lat},${lon}`);
//         if (!pointsResponse.ok) throw new Error(`HTTP error: ${pointsResponse.status}`);

//         const pointsData = await pointsResponse.json();
//         if (!pointsData.properties || !pointsData.properties.observationStations) {
//             throw new Error('Invalid points data response');
//         }

//         // Step 2: Get nearby observation stations
//         const stationUrl = pointsData.properties.observationStations;
//         const stationsResponse = await fetch(stationUrl);
//         if (!stationsResponse.ok) throw new Error(`HTTP error: ${stationsResponse.status}`);

//         const stationsData = await stationsResponse.json();
//         if (!stationsData.features || !stationsData.features.length || !stationsData.features[0].properties) {
//             throw new Error('No observation stations found');
//         }

//         // Step 3: Get the latest observation from the nearest station
//         const stationId = stationsData.features[0].properties.stationIdentifier;
//         const obsResponse = await fetch(`https://api.weather.gov/stations/${stationId}/observations/latest`);
//         if (!obsResponse.ok) throw new Error(`HTTP error: ${obsResponse.status}`);

//         const obsData = await obsResponse.json();
//         if (!obsData.properties) {
//             throw new Error('Invalid observation data');
//         }

//         // Format API data for return
//         const stationName = stationsData.features[0].properties.name;
//         return formatObservationData(obsData.properties, stationName);
//     } catch (error) {
//         console.error('Error fetching weather data:', error);
//         return getDefaultWeatherData();
//     }
// }

// Inside weatherData.js

export async function fetchCurrentWeather(lat, lon) {
    try {
        // Validate inputs
        if (!lat || !lon) {
            throw new Error('Invalid coordinates provided');
        }

        // Try to get data from the server-side proxy script
        try {
            // *** CHANGE THIS LINE ***
            const cacheResponse = await fetch('js/modules/get_weather_data.php'); // Call the PHP script

            if (cacheResponse.ok) {
                const serverData = await cacheResponse.json();

                // *** NEW LOGIC ***
                // Check if the server script reported an error
                if (serverData.error) {
                    console.log(`Server reported issue: ${serverData.error}, falling back to API`);
                } else {
                    // Server provided valid cache data
                    // Find the county name (keep this logic)
                    const latRounded = parseFloat(lat).toFixed(2);
                    const lonRounded = parseFloat(lon).toFixed(2);
                    const matchedCounty = window.siteConfig?.counties?.find(county =>
                        parseFloat(county.lat).toFixed(2) === latRounded &&
                        parseFloat(county.lon).toFixed(2) === lonRounded
                    );

                    if (matchedCounty && serverData.temperatures && serverData.temperatures[matchedCounty.name]) {
                        const cachedData = serverData.temperatures[matchedCounty.name];

                        // *** REMOVE CACHE CHECK LOGIC ***
                        // No need for client-side cache age check anymore
                        // const currentTimeSeconds = Math.floor(Date.now() / 1000);
                        // const cacheAge = Math.abs(currentTimeSeconds - cachedData.timestamp);
                        // console.log(`Cache check for ${matchedCounty.name}: ... `); // Remove this log
                        // if (cacheAge < 900) { ... } // Remove this condition

                        console.log(`Using valid data served by PHP for ${matchedCounty.name}`);
                        return {
                            temp: cachedData.temp,
                            condition: cachedData.condition || 'Unknown',
                            dewpoint: 'N/A',
                            humidity: 'N/A',
                            wind: 'N/A',
                            visibility: 'N/A',
                            pressure: 'N/A',
                            time: new Date(cachedData.timestamp * 1000), // Timestamp still useful for display
                            formattedTime: new Date(cachedData.timestamp * 1000).toLocaleTimeString([], {
                                hour: '2-digit', minute: '2-digit'
                            }),
                            stationName: `${matchedCounty.name} County`,
                            iconUrl: null
                        };
                    } else {
                        console.log(`Data for ${matchedCounty?.name || 'coordinates'} not found in server response, falling back to API`);
                    }
                }
            } else {
                console.log(`Proxy script not accessible (HTTP Status: ${cacheResponse.status}), falling back to API`);
            }
        } catch (cacheError) {
            console.log('Error fetching from proxy script:', cacheError);
        }

        // If we get here, the cache wasn't available via proxy or was invalid
        // Fall back to direct API calls
        console.log('Fetching data from NWS API');

        // ... (rest of your existing API fallback logic remains the same) ...

    } catch (error) {
        console.error('Error fetching weather data:', error);
        return getDefaultWeatherData();
    }
}

// ... (rest of weatherData.js)

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
 * Set weather background based on conditions
 * 
 * @param {Object} weatherData - Weather data object
 * @param {string} containerId - ID of container to update
 */
export function setWeatherBackground(weatherData, containerId = 'weather-background') {
    // Get county name from window variable or default
    const config = window.weatherConfig || {};
    const location = config.location || {};
    const countyName = location.countyName || 'county_map';

    // Check if icon URL is available in the weather data
    let iconUrl = weatherData.iconUrl ? weatherData.iconUrl : `images/county/${countyName}.png`;

    // Update resolution if needed
    if (weatherData.iconUrl) {
        iconUrl = iconUrl.replace(/\?size=\w+/, '?size=large');
    }

    // Set background image for weather card
    const weatherBgElement = document.getElementById(containerId);
    if (weatherBgElement) {
        weatherBgElement.classList.add('weather-bg');

        // Use a linear-gradient to create an overlay that controls opacity
        weatherBgElement.style.backgroundImage =
            `linear-gradient(rgba(45, 45, 45, 0.5), rgba(45, 45, 45, 0.5)), url(${iconUrl})`;
    }

    // Hide any existing weather icon div (if present)
    const weatherIconDiv = document.querySelector('.weather-icon');
    if (weatherIconDiv) {
        weatherIconDiv.style.display = 'none';
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