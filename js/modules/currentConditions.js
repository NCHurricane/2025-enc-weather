// currentConditions.js
import { safeSetText, safeSetHTML, degreesToCardinal } from './utils.js';

// Track the observation time from the API
let observationTime = null;

export async function fetchCurrentConditions(lat, lon) {
    try {
        // Validate inputs
        if (!lat || !lon) {
            throw new Error('Invalid coordinates provided');
        }

        const response = await fetch(`https://api.weather.gov/points/${lat},${lon}`);
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

        const data = await response.json();
        if (!data.properties || !data.properties.observationStations) {
            throw new Error('Invalid points data response');
        }

        const stationUrl = data.properties.observationStations;
        const stationResponse = await fetch(stationUrl);
        if (!stationResponse.ok) throw new Error(`HTTP error: ${stationResponse.status}`);

        const stationData = await stationResponse.json();
        if (!stationData.features || !stationData.features.length || !stationData.features[0].properties) {
            throw new Error('No observation stations found');
        }

        const stationId = stationData.features[0].properties.stationIdentifier;
        const obsResponse = await fetch(`https://api.weather.gov/stations/${stationId}/observations/latest`);
        if (!obsResponse.ok) throw new Error(`HTTP error: ${obsResponse.status}`);

        const obsData = await obsResponse.json();
        if (!obsData.properties) {
            throw new Error('Invalid observation data');
        }

        const properties = obsData.properties;

        // Store the API observation time
        if (properties.timestamp) {
            observationTime = new Date(properties.timestamp);
            startUpdateTimer();
        }

        // Update DOM with observation data
        updateDOMWithObservation(properties, stationData.features[0].properties.name);

        // Set weather icon/background
        setWeatherBackground(properties);
    } catch (error) {
        console.error('Error fetching current conditions:', error);
        safeSetHTML('current-temp', '<span style="font-size: 1rem;">Current Conditions Unavailable</span>');
        safeSetText('current-desc', 'Error retrieving data');
        safeSetHTML('current-dewpoint', '<strong>Dew Point:</strong> N/A');
        safeSetHTML('current-humidity', '<strong>Humidity:</strong> N/A');
        safeSetHTML('current-wind', '<strong>Wind:</strong> N/A');
        safeSetHTML('current-visibility', '<strong>Visibility:</strong> N/A');
        safeSetHTML('current-pressure', '<strong>Pressure:</strong> N/A');
        safeSetText('current-obs-time', 'N/A');
        safeSetText('current-location', 'Station data unavailable');

        // Update last updated timestamp
        updateLastUpdateTimestamp();
    }
}

export function updateDOMWithObservation(properties, stationName) {
    // Ensure we have all required properties, use defaults if missing
    const temperature = properties.temperature && properties.temperature.value !== null ?
        celsiusToFahrenheit(properties.temperature.value) : 'N/A';

    const dewpoint = properties.dewpoint && properties.dewpoint.value !== null ?
        Math.round((properties.dewpoint.value * 9 / 5) + 32) : 'N/A';

    const humidity = properties.relativeHumidity && properties.relativeHumidity.value !== null ?
        Math.round(properties.relativeHumidity.value) : 'N/A';

    let windDisplay = 'N/A';
    if (properties.windSpeed && properties.windSpeed.value !== null) {
        const windSpeed = Math.round(properties.windSpeed.value);
        if (windSpeed === 0) {
            windDisplay = 'Calm';
        } else if (properties.windDirection && properties.windDirection.value !== null) {
            windDisplay = `${windSpeed} mph from ${degreesToCardinal(properties.windDirection.value)}`;
        } else {
            windDisplay = `${windSpeed} mph`;
        }
    }

    const visibility = properties.visibility && properties.visibility.value !== null ?
        metersToMiles(properties.visibility.value) : 'N/A';

    const pressure = properties.barometricPressure && properties.barometricPressure.value !== null ?
        Math.round((properties.barometricPressure.value / 3386.389) * 33.8639) : 'N/A';

    // Store and format observation time
    if (properties.timestamp) {
        observationTime = new Date(properties.timestamp);
    }

    const formattedTime = observationTime ?
        observationTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown';

    // Update DOM
    safeSetText('current-temp', `${temperature}°`);
    safeSetText('current-desc', properties.textDescription || 'Sky Conditions N/A');
    safeSetHTML('current-dewpoint', `<strong>Dew Point:</strong> ${dewpoint}°F`);
    safeSetHTML('current-humidity', `<strong>Humidity:</strong> ${humidity}%`);
    safeSetHTML('current-wind', `<strong>Wind:</strong> ${windDisplay}`);
    safeSetHTML('current-visibility', `<strong>Visibility:</strong> ${visibility} mi`);
    safeSetHTML('current-pressure', `<strong>Pressure:</strong> ${pressure} mb`);
    safeSetText('current-obs-time', formattedTime);
    safeSetText('current-location', stationName || 'Unknown Station');

    // Update last updated timestamp
    updateLastUpdateTimestamp();
}

function setWeatherBackground(properties) {
    // Get county name from window variable or default to 'county_map'
    const countyName = window.countyName || 'county_map';

    // Check if icon URL is available in the API response
    let iconUrl = properties.icon ? properties.icon : `../../../images/county/${countyName}.png`;

    // Update resolution if needed
    if (properties.icon) {
        iconUrl = iconUrl.replace(/\?size=\w+/, '?size=large');
    }

    // Set background image for weather card
    const weatherBgElement = document.getElementById('weather-background');
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


// Function to update the time since last observation
function updateLastUpdateTimestamp() {
    const lastUpdateElement = document.getElementById('last-update-time');
    if (!lastUpdateElement) {
        // Create the element if it doesn't exist
        createLastUpdateElement();
        return;
    }

    if (!observationTime) {
        safeSetText('last-update-time', 'Data age: Unknown');
        return;
    }

    const now = new Date();
    const diffMs = now - observationTime;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
        safeSetText('last-update-time', 'Data age: Less than a minute');
    } else if (diffMins === 1) {
        safeSetText('last-update-time', 'Data age: 1 minute');
    } else if (diffMins < 60) {
        safeSetText('last-update-time', `Data age: ${diffMins} minutes`);
    } else {
        const hours = Math.floor(diffMins / 60);
        const remainingMins = diffMins % 60;

        if (hours === 1) {
            if (remainingMins === 0) {
                safeSetText('last-update-time', 'Data age: 1 hour');
            } else {
                safeSetText('last-update-time', `Data age: 1 hour, ${remainingMins} min`);
            }
        } else {
            if (remainingMins === 0) {
                safeSetText('last-update-time', `Data age: ${hours} hours`);
            } else {
                safeSetText('last-update-time', `Data age: ${hours} hr, ${remainingMins} min`);
            }
        }
    }
}

// Create the last update element
// Create or get the last update element
function createLastUpdateElement() {
    // Check if element already exists
    let lastUpdateElement = document.getElementById('last-update-time');
    if (lastUpdateElement) {
        return lastUpdateElement; // Return existing element
    }

    // Find where to insert the element
    const detailsElement = document.querySelector('.details');
    if (!detailsElement) return null;

    // Create the element
    lastUpdateElement = document.createElement('p');
    lastUpdateElement.id = 'last-update-time';
    lastUpdateElement.className = 'last-update';
    lastUpdateElement.style.color = '#fff200';
    lastUpdateElement.style.fontSize = '.8rem';
    lastUpdateElement.innerText = 'Data age: Unknown';

    // Insert it before the <br> in the details section
    const br = detailsElement.querySelector('br');
    if (br) {
        detailsElement.insertBefore(lastUpdateElement, br);
    } else {
        // If no <br>, just append to the end
        detailsElement.appendChild(lastUpdateElement);
    }

    return lastUpdateElement;
}

// Start a timer to update the "minutes ago" text
function startUpdateTimer() {
    // Update immediately
    updateLastUpdateTimestamp();

    // Then update every minute
    setInterval(updateLastUpdateTimestamp, 60000);
}

// Export function to initialize weather data
export function initWeather(lat, lon) {
    // Create the last update element on initialization
    createLastUpdateElement();

    // Fetch current conditions
    fetchCurrentConditions(lat, lon);

    // Add auto-refresh every 15 minutes
    setInterval(() => {
        fetchCurrentConditions(lat, lon);
    }, 15 * 60 * 1000); // 15 minutes in milliseconds
}