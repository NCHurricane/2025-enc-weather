/**
 * Unified Weather Data Module
 * Handles fetching, caching, and displaying weather data from various sources
 *
 * This module combines functionality from the previous weatherData.js and currentConditions.js
 * files into a single, cohesive module that prioritizes cached JSON data sources
 * with API fallbacks.
 */
import {
  safeSetText,
  safeSetHTML,
  degreesToCardinal,
  celsiusToFahrenheit,
  metersToMiles,
  pascalsToMillibars,
    selectBestStationJS, 
  selectWorkingStation, 
  isDataFresh,
  calculateDistance
} from "./utils.js";

let observationTime = null;

function getCacheBasePath() {
  const path = window.location.pathname;

  // If we're in a county subdirectory, go up to root
  if (path.includes("/counties/")) {
    return "../../js/modules/cache/";
  }

  // If we're at root level
  return "js/modules/cache/";
}

/**
 * Map county names to their actual cache file names
 * Handles multi-zone counties that have separate cache files per zone
 */
function getCountyCacheFiles(countyName) {
  const lowerCounty = countyName.toLowerCase();

  // Define mapping from county names to their actual cache file names
  const countyFileMap = {
    hyde: {
      // Hyde County has separate files for different zones
      weather: [
        "mainland_hyde_weather",
        "hatteras_island_weather",
        "ocracoke_island_weather",
      ],
      forecast: [
        "mainland_hyde_forecast",
        "hatteras_island_forecast",
        "ocracoke_island_forecast",
      ],
      alerts: [
        "mainland_hyde_alerts",
        "hatteras_island_alerts",
        "ocracoke_island_alerts",
      ],
    },
    dare: {
      // Dare County has separate files for different zones
      weather: [
        "mainland_dare_weather",
        "northern_obx_weather",
        "hatteras_island_weather",
      ],
      forecast: [
        "mainland_dare_forecast",
        "northern_obx_forecast",
        "hatteras_island_forecast",
      ],
      alerts: [
        "mainland_dare_alerts",
        "northern_obx_alerts",
        "hatteras_island_alerts",
      ],
    },
    // Single-zone counties use standard naming
    pitt: {
      weather: ["pitt_weather"],
      forecast: ["pitt_forecast"],
      alerts: ["pitt_alerts"],
    },
    bertie: {
      weather: ["bertie_weather"],
      forecast: ["bertie_forecast"],
      alerts: ["bertie_alerts"],
    },
    beaufort: {
      weather: ["beaufort_weather"],
      forecast: ["beaufort_forecast"],
      alerts: ["beaufort_alerts"],
    },
    martin: {
      weather: ["martin_weather"],
      forecast: ["martin_forecast"],
      alerts: ["martin_alerts"],
    },
    washington: {
      weather: ["washington_weather"],
      forecast: ["washington_forecast"],
      alerts: ["washington_alerts"],
    },
    tyrrell: {
      weather: ["tyrrell_weather"],
      forecast: ["tyrrell_forecast"],
      alerts: ["tyrrell_alerts"],
    },
  };

  return (
    countyFileMap[lowerCounty] || {
      weather: [`${lowerCounty}_weather`],
      forecast: [`${lowerCounty}_forecast`],
      alerts: [`${lowerCounty}_alerts`],
    }
  );
}

/**
 * Try to fetch data from zone-based cache files with correct paths
 * @param {string} countyName - County name
 * @param {string} dataType - 'weather', 'forecast', or 'alerts'
 * @returns {Promise<Object|null>} - First successful data found
 */
async function fetchFromZoneFiles(countyName, dataType) {
  const cacheFiles = getCountyCacheFiles(countyName);
  const fileNames = cacheFiles[dataType] || [];
  const basePath = getCacheBasePath();

  console.log(
    `Trying zone-based files for ${countyName} ${dataType}:`,
    fileNames
  );
  console.log(`Using base path: ${basePath}`);

  // Try each possible file name
  for (const fileName of fileNames) {
    const fullPath = `${basePath}${fileName}.json`;

    try {
      console.log(`Trying zone file: ${fullPath}`);
      const response = await fetch(`${fullPath}?t=${Date.now()}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`Successfully loaded ${dataType} data from: ${fullPath}`);
        return data;
      } else {
        console.log(
          `Zone file not found: ${fullPath} (status: ${response.status})`
        );
      }
    } catch (error) {
      console.log(`Failed to load ${fullPath}:`, error.message);
    }
  }

  console.warn(`No zone-based ${dataType} files found for ${countyName}`);
  return null;
}

// Modified findCountyByCoordinates function in weatherData.js
function findCountyByCoordinates(lat, lon) {
  // First, check if there's a direct configuration match from the page
  const config = window.weatherConfig || {};
  if (config.location && config.location.countyName) {
    console.log(
      "Found county name from weatherConfig:",
      config.location.countyName
    );
    return config.location.countyName.toLowerCase();
  }

  // If no direct match, try to find by coordinates using window.siteConfig.counties
  const counties = window.siteConfig?.counties || [];

  // First try to find an exact match
  const exactMatch = counties.find(
    (county) =>
      Math.abs(county.lat - lat) < 0.01 && Math.abs(county.lon - lon) < 0.01
  );

  if (exactMatch) {
    console.log("Found exact county match by coordinates:", exactMatch.name);
    return exactMatch.name.toLowerCase();
  }

  // If no exact match, try a broader match (within 0.1 degrees)
  const broadMatch = counties.find(
    (county) =>
      Math.abs(county.lat - lat) < 0.1 && Math.abs(county.lon - lon) < 0.1
  );

  if (broadMatch) {
    console.log("Found broader county match by coordinates:", broadMatch.name);
    return broadMatch.name.toLowerCase();
  }

  // Last attempt - try to extract county from current URL path
  const path = window.location.pathname;
  const countyMatch = path.match(/\/counties\/(\w+)\//);
  if (countyMatch && countyMatch[1]) {
    console.log("Extracted county from URL path:", countyMatch[1]);
    return countyMatch[1].toLowerCase();
  }

  console.error("Could not determine county name from any source");
  return null;
}

/**
 * Fetch weather forecast for a specific location
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<boolean>} Success status
 */
export async function fetchWeatherForecast(lat, lon) {
  try {
    const countyName =
      findCountyByCoordinates(lat, lon) ||
      window.weatherConfig?.location?.countyName?.toLowerCase();

    if (!countyName) {
      throw new Error("Unable to determine county name");
    }

    const basePath = getCacheBasePath();

    try {
      // First try standard file naming
      const standardPath = `${basePath}${countyName}_forecast.json`;
      console.log(`Trying standard forecast file: ${standardPath}`);

      const response = await fetch(`${standardPath}?t=${Date.now()}`);

      if (response.ok) {
        const data = await response.json();
        if (
          data.forecast &&
          data.forecast.daily &&
          data.forecast.daily.length
        ) {
          console.log(`Found standard forecast file: ${standardPath}`);
          return renderForecast(data.forecast.daily);
        }
      } else {
        console.log(
          `Standard forecast file not found: ${standardPath} (status: ${response.status})`
        );
      }
    } catch (standardError) {
      console.log(
        "Standard forecast file naming failed, trying zone-based files..."
      );
    }

    // Try zone-based files
    try {
      const zoneData = await fetchFromZoneFiles(countyName, "forecast");
      if (
        zoneData &&
        zoneData.forecast &&
        zoneData.forecast.daily &&
        zoneData.forecast.daily.length
      ) {
        console.log(`Found zone-based forecast data for ${countyName}`);
        return renderForecast(zoneData.forecast.daily);
      }
    } catch (zoneError) {
      console.warn(
        "Zone-based forecast cache error, falling back to API:",
        zoneError
      );
    }

    // API fallback
    console.log("Falling back to NWS API for forecast data...");
    const pointsResponse = await fetch(
      `https://api.weather.gov/points/${lat},${lon}`
    );
    if (!pointsResponse.ok)
      throw new Error(`HTTP error: ${pointsResponse.status}`);

    const pointsData = await pointsResponse.json();
    if (!pointsData.properties || !pointsData.properties.forecast) {
      throw new Error("Invalid points data response");
    }

    const forecastUrl = pointsData.properties.forecast;
    const response = await fetch(forecastUrl);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

    const data = await response.json();
    if (
      !data.properties ||
      !data.properties.periods ||
      !Array.isArray(data.properties.periods)
    ) {
      throw new Error("Invalid forecast data response");
    }

    return renderForecast(data.properties.periods);
  } catch (error) {
    console.error("Error fetching weather forecast:", error);
    safeSetHTML(
      "forecast",
      '<div class="forecast-item">Weather forecast unavailable. Please try again later.</div>'
    );
    return false;
  }
}

/**
 * Render forecast data into the forecast element
 * @param {Array} periods - Forecast periods
 * @returns {boolean} Success status
 */
function renderForecast(periods) {
  try {
    let forecastHTML = "";
    periods.slice(0, 10).forEach((period) => {
      const tempColor = period.isDaytime ? "red" : "blue";
      forecastHTML += `
        <div class="forecast-item">
          <div class="forecast-cell forecast-day">${period.name}</div>
          <div class="forecast-cell forecast-icon">
            <img src="${period.icon}" alt="${period.shortForecast}">
          </div>
          <div class="forecast-cell forecast-temp" style="color: ${tempColor};">
            ${period.temperature}°
          </div>
        </div>
      `;
    });

    safeSetHTML("forecast", forecastHTML);
    return true;
  } catch (error) {
    console.error("Error rendering forecast:", error);
    return false;
  }
}

/**
 * Fetch detailed forecast for a specific location
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<boolean>} Success status
 */
export async function fetchDetailedForecast(lat, lon) {
  try {
    const countyName =
      findCountyByCoordinates(lat, lon) ||
      window.weatherConfig?.location?.countyName?.toLowerCase();

    if (!countyName) {
      throw new Error("Unable to determine county name");
    }

    try {
      let response;
      try {
        response = await fetch(
          `../../js/modules/cache/${countyName}_forecast.json?t=${Date.now()}`
        );
        if (!response.ok) {
          response = await fetch(
            `js/modules/cache/${countyName}_forecast.json?t=${Date.now()}`
          );
        }
      } catch (e) {
        response = await fetch(
          `js/modules/cache/${countyName}_forecast.json?t=${Date.now()}`
        );
      }

      if (!response.ok) {
        throw new Error(`Cache fetch failed: ${response.status}`);
      }

      const data = await response.json();

      if (
        !data.forecast ||
        !data.forecast.daily ||
        !data.forecast.daily.length
      ) {
        throw new Error("Invalid forecast cache data");
      }

      return renderDetailedForecast(data.forecast.daily);
    } catch (cacheError) {
      console.warn(
        "Detailed forecast cache error, falling back to API:",
        cacheError
      );

      const pointsResponse = await fetch(
        `https://api.weather.gov/points/${lat},${lon}`
      );
      if (!pointsResponse.ok)
        throw new Error(`HTTP error: ${pointsResponse.status}`);

      const pointsData = await pointsResponse.json();
      if (!pointsData.properties || !pointsData.properties.forecast) {
        throw new Error("Invalid points data response");
      }

      const forecastUrl = pointsData.properties.forecast;
      const response = await fetch(forecastUrl);
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

      const data = await response.json();
      if (
        !data.properties ||
        !data.properties.periods ||
        !Array.isArray(data.properties.periods)
      ) {
        throw new Error("Invalid forecast data response");
      }

      return renderDetailedForecast(data.properties.periods);
    }
  } catch (error) {
    console.error("Error fetching detailed forecast:", error);
    safeSetHTML(
      "detailed-forecast",
      '<div class="detailed-item">Detailed forecast unavailable. Please try again later.</div>'
    );
    return false;
  }
}

/**
 * Render detailed forecast data into the detailed-forecast element
 * @param {Array} periods - Forecast periods
 * @returns {boolean} Success status
 */
function renderDetailedForecast(periods) {
  try {
    let detailedHTML = "";
    periods.slice(0, 10).forEach((period) => {
      detailedHTML += `
        <div class="detailed-item">
            <div class="detailed-row">
                <div class="detailed-col-day">
                    <div class="detailed-day">${period.name}</div>
                </div>
                <div class="detailed-col-icon">
                    <div class="detailed-icon"><img src="${period.icon}" alt="${period.shortForecast}"></div>
                </div>
                <div class="detailed-col-forecast">
                    <div class="detailed-forecast">${period.detailedForecast}</div>
                </div>
            </div>
        </div>
        `;
    });

    safeSetHTML("detailed-forecast", detailedHTML);
    return true;
  } catch (error) {
    console.error("Error rendering detailed forecast:", error);
    return false;
  }
}

/**
 * Fetch current weather conditions for a specific location
 * Prioritizes JSON cache files over API calls
 *
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Formatted weather data
 */
export async function fetchCurrentWeather(lat, lon) {
  try {
    if (!lat || !lon) {
      throw new Error("Invalid coordinates provided");
    }

    const countyName = findCountyByCoordinates(lat, lon);

    if (!countyName) {
      console.warn("No matching county found for coordinates:", { lat, lon });
      return getDefaultWeatherData();
    }

    let cacheError = null;
    try {
      const response = await fetch(
        `js/modules/cache/${countyName.toLowerCase()}_weather.json?t=${Date.now()}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.weather) {
          return formatWeatherData(data.weather);
        }
      }
    } catch (err) {
      cacheError = err; // capture for later logging
    }

    // zone-based
    try {
      const zoneData = await fetchFromZoneFiles(countyName, "weather");
      if (zoneData && zoneData.weather) {
        return formatWeatherData(zoneData.weather);
      }
    } catch (zoneError) {
      console.warn(`Zone-based cache error for ${countyName}:`, zoneError);
      if (!cacheError) cacheError = zoneError;
    }

    // fallback to API
    console.warn(
      `Cache failed for ${countyName}, attempting NWS API:`,
      cacheError
    );
    return await fetchWeatherFromAPI(lat, lon);
  } catch (error) {
    console.error("Weather data retrieval failed:", error);
    return getDefaultWeatherData();
  }
}

/**
 * Enhanced fallback method to fetch data directly from NWS API
 * Now uses intelligent station selection with fallback logic
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Formatted weather data
 */
async function fetchWeatherFromAPI(lat, lon) {
  try {
    console.log(`Fetching weather from NWS API for coordinates: ${lat}, ${lon}`);
    
    // Step 1: Get the forecast office and grid coordinates
    const pointsResponse = await fetch(
      `https://api.weather.gov/points/${lat},${lon}`
    );
    if (!pointsResponse.ok) {
      throw new Error(`Points API error: ${pointsResponse.status}`);
    }
    
    const pointsData = await pointsResponse.json();
    if (!pointsData.properties || !pointsData.properties.observationStations) {
      throw new Error("Invalid points data response");
    }

    // Step 2: Get nearby observation stations
    const stationUrl = pointsData.properties.observationStations;
    const stationsResponse = await fetch(stationUrl);
    if (!stationsResponse.ok) {
      throw new Error(`Stations API error: ${stationsResponse.status}`);
    }
    
    const stationsData = await stationsResponse.json();
    if (!stationsData.features || !stationsData.features.length) {
      throw new Error("No observation stations found");
    }

    // Step 3: Use enhanced station selection with working station fallback
    const stationInfo = await selectWorkingStation(
      stationsData.features, 
      lat, 
      lon, 
      testStationData
    );

    console.log(`Using station: ${stationInfo.stationId} (${stationInfo.name}) - Distance: ${stationInfo.distance} mi`);

    // Step 4: Get the latest observation from the selected station
    const obsUrl = `https://api.weather.gov/stations/${stationInfo.stationId}/observations/latest`;
    const obsResponse = await fetch(obsUrl);
    if (!obsResponse.ok) {
      throw new Error(`Observation API error: ${obsResponse.status}`);
    }
    
    const obsData = await obsResponse.json();
    if (!obsData.properties) {
      throw new Error("Invalid observation data");
    }

    // Step 5: Format the observation data with station info
    const weatherData = formatObservationData(
      obsData.properties, 
      stationInfo.name,
      stationInfo
    );

    console.log(`Successfully fetched weather via API: ${weatherData.temp}, ${weatherData.condition}`);
    return weatherData;

  } catch (error) {
    console.error("Enhanced API fallback failed:", error);
    return getDefaultWeatherData();
  }
}

/**
 * Test if a station has good recent data
 * Used by selectWorkingStation to find a station that actually works
 * @param {string} stationId - Station identifier to test
 * @returns {Promise<boolean>} True if station has good data
 */
async function testStationData(stationId) {
  try {
    const obsUrl = `https://api.weather.gov/stations/${stationId}/observations/latest`;
    const response = await fetch(obsUrl);
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    const props = data.properties;
    
    if (!props) {
      return false;
    }
    
    // Check if observation is recent (within 6 hours)
    if (!isDataFresh(props.timestamp, 6)) {
      console.log(`Station ${stationId} has stale data`);
      return false;
    }
    
    // Check if essential fields are present
    const hasTemperature = props.temperature && props.temperature.value !== null;
    const hasCondition = props.textDescription;
    
    if (!hasTemperature || !hasCondition) {
      console.log(`Station ${stationId} missing essential data fields`);
      return false;
    }
    
    console.log(`Station ${stationId} passed data quality check`);
    return true;
    
  } catch (error) {
    console.log(`Station ${stationId} test failed: ${error.message}`);
    return false;
  }
}

/**
 * Enhanced formatWeatherData function for cache data
 * Now handles the new fields from enhanced cache structure
 * Replace the existing function in weatherData.js
 */
function formatWeatherData(weatherData) {
  if (weatherData.timestamp) {
    observationTime = new Date(weatherData.timestamp * 1000);
  }

  return {
    temp: formatTemperature(weatherData.temperature),
    condition: weatherData.skyConditions || "Unknown",
    dewpoint: formatTemperature(weatherData.dewPoint),
    humidity: formatHumidity(weatherData.humidity),
    wind: formatWind(weatherData.windSpeed, weatherData.windDirectionCardinal),
    visibility: formatVisibility(weatherData.visibility),
    pressure: formatPressure(weatherData.pressure),
    // NEW: Enhanced fields from cache
    heatIndex: weatherData.heatIndex ? Math.round(weatherData.heatIndex) : null,
    windChill: weatherData.windChill ? Math.round(weatherData.windChill) : null,
    precipitationLastHour: weatherData.precipitationLastHour || null,
    time: observationTime,
    formattedTime: formatTime(weatherData.timestamp),
    stationName: weatherData.stationName || "Local Station",
    iconUrl: weatherData.iconUrl || null,
    source: weatherData.source || 'cache',
    // NEW: Station metadata if available in cache
    station: weatherData.station || null
  };
}

/**
 * Smart temperature display function
 * Shows heat index or wind chill when significant
 * Add this new function to utils.js or weatherData.js
 */
export function getDisplayTemperature(weatherData) {
  const temp = weatherData.temp;
  const heatIndex = weatherData.heatIndex;
  const windChill = weatherData.windChill;

  // Show heat index if it's significantly higher than actual temp (2°F+ difference)
  if (heatIndex && heatIndex > temp + 1) {
    return {
      display: `${temp}° (feels like ${heatIndex}°)`,
      type: 'heat-index',
      apparent: heatIndex
    };
  }

  // Show wind chill if it's significantly lower than actual temp (2°F+ difference) 
  if (windChill && windChill < temp - 1) {
    return {
      display: `${temp}° (feels like ${windChill}°)`,
      type: 'wind-chill',
      apparent: windChill
    };
  }

  // Just show regular temperature
  return {
    display: `${temp}°`,
    type: 'normal',
    apparent: temp
  };
}

/**
 * Enhanced weather summary for mobile/compact displays
 * Add this new function to provide concise weather info
 */
export function getWeatherSummary(weatherData) {
  const tempInfo = getDisplayTemperature(weatherData);
  let summary = `${tempInfo.display} - ${weatherData.condition}`;

  // Add significant weather info
  const additions = [];
  
  if (weatherData.precipitationLastHour > 0) {
    additions.push(`${weatherData.precipitationLastHour}" rain`);
  }
  
  if (weatherData.wind !== 'Calm' && !weatherData.wind.includes('N/A')) {
    additions.push(weatherData.wind);
  }

  if (additions.length > 0) {
    summary += ` • ${additions.join(' • ')}`;
  }

  return summary;
}


/**
 * Enhanced format observation data from NWS API response
 * Now includes station metadata and additional fields
 * @param {Object} properties - Observation properties from API
 * @param {string} stationName - Name of the weather station
 * @param {Object} stationInfo - Additional station information from selection
 * @returns {Object} Formatted weather data
 */
function formatObservationData(properties, stationName, stationInfo = null) {
  if (properties.timestamp) {
    observationTime = new Date(properties.timestamp);
  }

  // Temperature conversion
  const temperature = properties.temperature && properties.temperature.value !== null
    ? celsiusToFahrenheit(properties.temperature.value)
    : "N/A";

  // Dewpoint conversion  
  const dewpoint = properties.dewpoint && properties.dewpoint.value !== null
    ? celsiusToFahrenheit(properties.dewpoint.value)
    : "N/A";

  // Humidity
  const humidity = properties.relativeHumidity && properties.relativeHumidity.value !== null
    ? Math.round(properties.relativeHumidity.value)
    : "N/A";

  // Wind processing
  let windDisplay = "N/A";
  if (properties.windSpeed && properties.windSpeed.value !== null) {
    const windSpeed = Math.round(properties.windSpeed.value * 0.621371); // m/s to mph
    
    if (windSpeed === 0) {
      windDisplay = "Calm";
    } else if (properties.windDirection && properties.windDirection.value !== null) {
      const direction = degreesToCardinal(properties.windDirection.value);
      windDisplay = `${windSpeed} mph from ${direction}`;
    } else {
      windDisplay = `${windSpeed} mph`;
    }
  }

  // Visibility conversion
  const visibility = properties.visibility && properties.visibility.value !== null
    ? metersToMiles(properties.visibility.value)
    : "N/A";

  // Pressure conversion
  const pressure = properties.barometricPressure && properties.barometricPressure.value !== null
    ? pascalsToMillibars(properties.barometricPressure.value)
    : "N/A";

  // Enhanced fields from API
  const heatIndex = properties.heatIndex && properties.heatIndex.value !== null
    ? celsiusToFahrenheit(properties.heatIndex.value)
    : null;

  const windChill = properties.windChill && properties.windChill.value !== null
    ? celsiusToFahrenheit(properties.windChill.value)
    : null;

  const precipLastHour = properties.precipitationLastHour && properties.precipitationLastHour.value !== null
    ? Math.round(properties.precipitationLastHour.value * 0.0393701 * 100) / 100 // mm to inches
    : null;

  // Enhanced weather object with station metadata
  const weatherData = {
    temp: temperature,
    condition: properties.textDescription || "Unknown",
    dewpoint: dewpoint,
    humidity: humidity,
    wind: windDisplay,
    visibility: visibility,
    pressure: pressure,
    heatIndex: heatIndex,                    // NEW FIELD
    windChill: windChill,                    // NEW FIELD
    precipitationLastHour: precipLastHour,   // NEW FIELD
    time: observationTime,
    formattedTime: formatTime(properties.timestamp ? new Date(properties.timestamp).getTime() / 1000 : null),
    stationName: stationName || "Unknown Station",
    iconUrl: properties.icon || null,
    source: 'nws-api',
    // Station metadata for debugging/transparency
    station: stationInfo ? {
      id: stationInfo.stationId,
      name: stationInfo.name,
      distance: stationInfo.distance,
      provider: stationInfo.provider,
      scores: stationInfo.scores
    } : null
  };

  return weatherData;
}

/**
 * Simple fallback station selection for emergency use
 * Used when enhanced selection fails
 * @param {Array} stations - Array of station features
 * @param {number} targetLat - Target latitude
 * @param {number} targetLon - Target longitude
 * @returns {Object} Basic station info
 */
function selectNearestStation(stations, targetLat, targetLon) {
  let nearestStation = null;
  let shortestDistance = Infinity;

  for (const station of stations.slice(0, 3)) { // Check first 3 only
    const coords = station.geometry.coordinates;
    const stationLat = coords[1];
    const stationLon = coords[0];
    
    const distance = calculateDistance(targetLat, targetLon, stationLat, stationLon);
    
    if (distance < shortestDistance) {
      shortestDistance = distance;
      nearestStation = {
        stationId: station.properties.stationIdentifier,
        name: station.properties.name,
        distance: Math.round(distance * 10) / 10,
        provider: station.properties.provider || 'unknown'
      };
    }
  }

  return nearestStation;
}
/**
 * Robust weather fetching with multiple fallback levels
 * This is the main function that should replace fetchWeatherFromAPI
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Formatted weather data
 */
export async function fetchWeatherFromAPIRobust(lat, lon) {
  try {
    // Try enhanced API fetch first
    return await fetchWeatherFromAPI(lat, lon);
  } catch (enhancedError) {
    console.warn("Enhanced API fetch failed, trying simple fallback:", enhancedError.message);
    
    try {
      // Fallback to original simple logic
      const pointsResponse = await fetch(`https://api.weather.gov/points/${lat},${lon}`);
      if (!pointsResponse.ok) throw new Error(`HTTP error: ${pointsResponse.status}`);
      
      const pointsData = await pointsResponse.json();
      if (!pointsData.properties?.observationStations) {
        throw new Error("Invalid points data response");
      }
      
      const stationsResponse = await fetch(pointsData.properties.observationStations);
      if (!stationsResponse.ok) throw new Error(`HTTP error: ${stationsResponse.status}`);
      
      const stationsData = await stationsResponse.json();
      if (!stationsData.features?.length) {
        throw new Error("No observation stations found");
      }
      
      // Use simple nearest station selection
      const stationInfo = selectNearestStation(stationsData.features, lat, lon);
      
      const obsResponse = await fetch(
        `https://api.weather.gov/stations/${stationInfo.stationId}/observations/latest`
      );
      if (!obsResponse.ok) throw new Error(`HTTP error: ${obsResponse.status}`);
      
      const obsData = await obsResponse.json();
      if (!obsData.properties) throw new Error("Invalid observation data");
      
      return formatObservationData(obsData.properties, stationInfo.name, stationInfo);
      
    } catch (simpleError) {
      console.error("All API fallback attempts failed:", simpleError);
      return getDefaultWeatherData();
    }
  }
}


/**
 * Helper formatting functions
 */
function formatTemperature(temp) {
  return temp !== null && temp !== undefined && temp !== "N/A"
    ? Math.round(typeof temp === "string" ? parseFloat(temp) : temp)
    : "N/A";
}

function formatDewpoint(dewpoint) {
  return dewpoint !== null && dewpoint !== undefined
    ? Math.round(dewpoint)
    : "N/A";
}

function formatHumidity(humidity) {
  return humidity !== null && humidity !== undefined
    ? Math.round(humidity)
    : "N/A";
}

function formatWind(speed, direction) {
  if (typeof speed === "string") {
    const match = speed.match(/(\d+)/);
    if (match) {
      speed = parseInt(match[1], 10);
    } else {
      return "N/A";
    }
  }

  if (speed > 20) {
    speed = Math.round(speed);
  } else {
    speed = Math.round(speed * 0.621371);
  }

  if (speed === 0) {
    return "Calm";
  } else {
    return `${speed} mph from ${direction || "N/A"}`;
  }
}

function formatVisibility(visibility) {
  return visibility !== null && visibility !== undefined ? visibility : "N/A";
}

function formatPressure(pressure) {
  return pressure !== null && pressure !== undefined ? pressure : "N/A";
}

function formatTime(timestamp) {
  return timestamp
    ? new Date(timestamp * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Unknown";
}

/**
 * Get appropriate weather icon based on condition text
 * @param {string} condition - Weather condition text
 * @returns {string} Font Awesome icon class
 */
export function getWeatherIcon(condition) {
  if (!condition || condition === "N/A") {
    return "fa-solid fa-question";
  }
  const conditionLower = condition.toLowerCase();
  if (
    conditionLower.includes("thunderstorm") ||
    conditionLower.includes("lightning")
  ) {
    return "fa-solid fa-cloud-bolt";
  } else if (
    conditionLower.includes("rain") &&
    conditionLower.includes("snow")
  ) {
    return "fa-solid fa-cloud-sleet";
  } else if (
    conditionLower.includes("rain") ||
    conditionLower.includes("drizzle") ||
    conditionLower.includes("shower")
  ) {
    return "fa-solid fa-cloud-rain";
  } else if (
    conditionLower.includes("snow") ||
    conditionLower.includes("flurr")
  ) {
    return "fa-solid fa-snowflake";
  } else if (
    conditionLower.includes("sleet") ||
    conditionLower.includes("pellets") ||
    conditionLower.includes("ice")
  ) {
    return "fa-solid fa-cloud-hail";
  } else if (
    conditionLower.includes("fog") ||
    conditionLower.includes("haze") ||
    conditionLower.includes("mist")
  ) {
    return "fa-solid fa-cloud-fog";
  } else if (conditionLower.includes("cloud")) {
    if (conditionLower.includes("few") || conditionLower.includes("partly")) {
      return "fa-solid fa-cloud-sun";
    } else {
      return "fa-solid fa-cloud";
    }
  } else if (
    conditionLower.includes("clear") ||
    conditionLower.includes("sunny") ||
    conditionLower.includes("fair")
  ) {
    return "fa-solid fa-sun";
  } else {
    return "fa-solid fa-cloud";
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
  const seasonStart = new Date(`${year} - ${config.start}`);
  const seasonEnd = new Date(`${year} - ${config.end}`);
  return date >= seasonStart && date <= seasonEnd;
}

/**
 * Enhanced updateDOMWithObservation function
 * Now displays heat index, wind chill, and precipitation data
 * Replace the existing function in weatherData.js
 */
export function updateDOMWithObservation(weatherData) {
  console.log("Weather data for display:", JSON.stringify(weatherData));

  if (!weatherData) return;
  startUpdateTimer();

  // Existing elements
  const tempElement = document.getElementById("current-temp");
  const descElement = document.getElementById("current-desc");
  const dewpointElement = document.getElementById("current-dewpoint");
  const humidityElement = document.getElementById("current-humidity");
  const windElement = document.getElementById("current-wind");
  const visibilityElement = document.getElementById("current-visibility");
  const pressureElement = document.getElementById("current-pressure");
  const timeElement = document.getElementById("current-obs-time");
  const locationElement = document.getElementById("current-location");
  
  // NEW: Enhanced data elements (optional - will work if present in HTML)
  const heatIndexElement = document.getElementById("current-heat-index");
  const windChillElement = document.getElementById("current-wind-chill");
  const precipElement = document.getElementById("current-precipitation");
  const stationInfoElement = document.getElementById("station-info");

  requestAnimationFrame(() => {
    // Existing data fields
    if (tempElement) tempElement.textContent = `${weatherData.temp}°`;
    if (descElement) descElement.textContent = weatherData.condition || "Sky Conditions N/A";
    if (dewpointElement) dewpointElement.innerHTML = `<strong>Dew Point:</strong> ${weatherData.dewpoint}°F`;
    if (humidityElement) humidityElement.innerHTML = `<strong>Humidity:</strong> ${weatherData.humidity}%`;
    if (windElement) windElement.innerHTML = `<strong>Wind:</strong> ${weatherData.wind}`;
    if (visibilityElement) visibilityElement.innerHTML = `<strong>Visibility:</strong> ${weatherData.visibility} mi`;
    if (pressureElement) pressureElement.innerHTML = `<strong>Pressure:</strong> ${weatherData.pressure} mb`;
    if (timeElement) timeElement.textContent = weatherData.formattedTime;
    if (locationElement) locationElement.textContent = weatherData.stationName || "Unknown Station";

    // NEW: Enhanced data fields
    if (heatIndexElement) {
      if (weatherData.heatIndex && weatherData.heatIndex > weatherData.temp) {
        heatIndexElement.innerHTML = `<strong>Heat Index:</strong> ${weatherData.heatIndex}°F`;
        heatIndexElement.style.display = 'block';
      } else {
        heatIndexElement.style.display = 'none';
      }
    }

    if (windChillElement) {
      if (weatherData.windChill && weatherData.windChill < weatherData.temp) {
        windChillElement.innerHTML = `<strong>Wind Chill:</strong> ${weatherData.windChill}°F`;
        windChillElement.style.display = 'block';
      } else {
        windChillElement.style.display = 'none';
      }
    }

    if (precipElement) {
      if (weatherData.precipitationLastHour && weatherData.precipitationLastHour > 0) {
        precipElement.innerHTML = `<strong>Precip (1hr):</strong> ${weatherData.precipitationLastHour}"`;
        precipElement.style.display = 'block';
      } else {
        precipElement.style.display = 'none';
      }
    }

    // NEW: Station information (for debugging/transparency)
    if (stationInfoElement && weatherData.station) {
      const station = weatherData.station;
      stationInfoElement.innerHTML = `
        <small>
          Station: ${station.name} (${station.id})<br>
          Distance: ${station.distance} mi
          ${station.provider !== 'unknown' ? ` • Provider: ${station.provider}` : ''}
        </small>
      `;
      stationInfoElement.style.display = 'block';
    }

    // Set weather background
    setWeatherBackground(weatherData);
  });
}

/**
 * Set weather background based on conditions - simplified version
 * @param {Object} weatherData - Weather data object
 * @param {string} containerId - ID of container to update
 */

export function setWeatherBackground(
  weatherData,
  containerId = "weather-background"
) {
  const weatherBgElement = document.getElementById(containerId);
  if (!weatherBgElement) {
    console.error("Weather background element not found:", containerId);
    return;
  }

  if (weatherData.iconUrl) {
    weatherBgElement.classList.add("weather-bg");

    let weatherIconDiv = weatherBgElement.querySelector(".weather-icon");
    if (!weatherIconDiv) {
      weatherIconDiv = document.createElement("div");
      weatherIconDiv.className = "weather-icon";
      weatherBgElement.appendChild(weatherIconDiv);
    }

    weatherIconDiv.style.backgroundImage = `url("${weatherData.iconUrl}")`;
    weatherIconDiv.style.display = "block";
  }
}

/**
 * Fetch county alerts - simplified for zone-based approach
 * @param {number} lat - Latitude  
 * @param {number} lon - Longitude
 * @returns {Promise<Array>} Array of alert objects
 */
export async function fetchAlerts(lat, lon) {
  try {
    const countyName = findCountyByCoordinates(lat, lon) || 
                      window.weatherConfig?.location?.countyName?.toLowerCase();

    if (!countyName) {
      console.warn('No county found for coordinates:', { lat, lon });
      return [];
    }

    // Try county-specific cache file
    const basePath = getCacheBasePath();
    const countyPath = `${basePath}${countyName.toLowerCase()}_alerts.json`;
    
    try {
      const response = await fetch(`${countyPath}?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        return data.alerts || [];
      }
    } catch (error) {
      console.log(`Cache failed for ${countyName}, trying API fallback`);
      return await fetchAlertsFromAPI(lat, lon);
    }

    return [];
  } catch (error) {
    console.error('Error in fetchAlerts:', error);
    return [];
  }
}

// Helper function to try county alert file without throwing console errors
async function tryCountyAlertFile(countyName, basePath) {
  try {
    const countyPath = `${basePath}${countyName.toLowerCase()}_alerts.json`;
    const response = await fetch(`${countyPath}?t=${Date.now()}`);

    if (response.ok) {
      const data = await response.json();
      console.log(`Loaded alerts from county file: ${countyPath}`);
      return data.alerts || [];
    } else {
      // 404 is expected when county has no active alerts - don't log as error
      if (response.status === 404) {
        console.log(`No alert file for ${countyName} (no active alerts)`);
      } else {
        console.warn(
          `County alert file error (${response.status}): ${countyPath}`
        );
      }
      return [];
    }
  } catch (error) {
    // Don't log fetch errors for missing county files
    console.log(`No individual alerts for ${countyName}`);
    return [];
  }
}

/**
 * Zone-based API fallback for alerts
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Array>} Array of alert objects
 */
async function fetchAlertsFromAPI(lat, lon) {
  try {
    // Get zones for this location
    const pointsResponse = await fetch(`https://api.weather.gov/points/${lat},${lon}`);
    if (!pointsResponse.ok) throw new Error(`Points API failed: ${pointsResponse.status}`);
    
    const pointsData = await pointsResponse.json();
    const zoneIds = [];
    
    // Extract zone IDs
    if (pointsData.properties.county) {
      zoneIds.push(pointsData.properties.county.split('/').pop());
    }
    if (pointsData.properties.forecastZone) {
      const fzId = pointsData.properties.forecastZone.split('/').pop();
      if (!zoneIds.includes(fzId)) zoneIds.push(fzId);
    }
    
    if (zoneIds.length === 0) {
      throw new Error('No zones found for location');
    }
    
    // Fetch alerts for all zones
    const alertPromises = zoneIds.map(async zoneId => {
      try {
        const response = await fetch(`https://api.weather.gov/alerts/active/zone/${zoneId}`);
        if (response.ok) {
          const data = await response.json();
          return data.features || [];
        }
      } catch (err) {
        console.warn(`Failed to fetch alerts for zone ${zoneId}`);
      }
      return [];
    });
    
    const alertResults = await Promise.all(alertPromises);
    
    // Combine and deduplicate
    const allAlerts = [];
    const seenIds = new Set();
    
    alertResults.flat().forEach(alert => {
      const alertId = alert.id || alert.properties?.id;
      if (alertId && !seenIds.has(alertId)) {
        seenIds.add(alertId);
        allAlerts.push(alert.properties || alert);
      }
    });
    
    return allAlerts;
  } catch (error) {
    console.error('Zone-based API fallback failed:', error);
    return [];
  }
}

/**
 * Fetch Area Forecast Discussion text
 * @param {string} wfo - Weather Forecast Office identifier
 * @returns {Promise<string>} Formatted AFD text
 */
export async function fetchAFDText(wfo) {
  if (!wfo) {
    console.error("No WFO identifier provided");
    return "No forecast office specified";
  }
  try {
    try {
      const response = await fetch(
        `../../js/modules/cache/${wfo.toLowerCase()}_afd.json?t=${Date.now()}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      const data = await response.json();
      if (!data.content || !data.timestamp) {
        throw new Error("Invalid AFD cache format");
      }
      const cacheAge = Math.abs(Date.now() / 1000 - data.timestamp);
      if (cacheAge > 14400) {
        throw new Error("AFD cache expired");
      }
      safeSetHTML("afd-content", data.content);
      return data.content;
    } catch (cacheError) {
      console.warn(`AFD cache error for ${wfo}, attempting API:`, cacheError);
      const afdUrl = `https://forecast.weather.gov/product.php?site=${wfo}&issuedby=${wfo}&product=AFD&format=txt&version=1&glossary=0`;
      const response = await fetch(afdUrl);
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const htmlText = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, "text/html");
      let afdContent = doc.querySelector("pre")
        ? doc.querySelector("pre").innerText
        : doc.body.innerText;
      afdContent = afdContent.replace(/&&/g, "").replace(/\r\n/g, "\n");
      const paragraphs = afdContent.split(/\n\s*\n/);
      const formatted = paragraphs
        .map((p) => `<p>${p.replace(/\n/g, " ")}</p>`)
        .join("");
      safeSetHTML("afd-content", formatted);
      return formatted;
    }
  } catch (error) {
    console.error("Error fetching AFD text:", error);
    safeSetText(
      "afd-content",
      "Error loading forecast discussion. Please try again later."
    );
    return "Error loading forecast discussion. Please try again later.";
  }
}

/**
 * Create the last update element to show data age
 * @returns {HTMLElement|null} Created element or null if creation failed
 */
function createLastUpdateElement() {
  let lastUpdateElement = document.getElementById("last-update-time");
  if (lastUpdateElement) {
    return lastUpdateElement;
  }
  const detailsElement = document.querySelector(".details");
  if (!detailsElement) return null;
  lastUpdateElement = document.createElement("p");
  lastUpdateElement.id = "last-update-time";
  lastUpdateElement.className = "last-update";
  lastUpdateElement.style.color = "#fff200";
  lastUpdateElement.style.fontSize = ".8rem";
  lastUpdateElement.innerText = "Data age: Unknown";
  const br = detailsElement.querySelector("br");
  if (br) {
    detailsElement.insertBefore(lastUpdateElement, br);
  } else {
    detailsElement.appendChild(lastUpdateElement);
  }
  return lastUpdateElement;
}

/**
 * Function to update the time since last observation
 */
function updateLastUpdateTimestamp() {
  const lastUpdateElement = document.getElementById("last-update-time");
  if (!lastUpdateElement) {
    createLastUpdateElement();
    return;
  }
  if (!observationTime) {
    safeSetText("last-update-time", "Data age: Unknown");
    return;
  }
  const now = new Date();
  const diffMs = now - observationTime;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) {
    safeSetText("last-update-time", "Data age: Less than a minute");
  } else if (diffMins === 1) {
    safeSetText("last-update-time", "Data age: 1 minute");
  } else if (diffMins < 60) {
    safeSetText("last-update-time", `Data age: ${diffMins} minutes`);
  } else {
    const hours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    if (hours === 1) {
      if (remainingMins === 0) {
        safeSetText("last-update-time", "Data age: 1 hour");
      } else {
        safeSetText(
          "last-update-time",
          `Data age: 1 hour, ${remainingMins} min`
        );
      }
    } else {
      if (remainingMins === 0) {
        safeSetText("last-update-time", `Data age: ${hours} hours`);
      } else {
        safeSetText(
          "last-update-time",
          `Data age: ${hours} hr, ${remainingMins} min`
        );
      }
    }
  }
}

/**
 * Start a timer to update the "minutes ago" text
 */
function startUpdateTimer() {
  updateLastUpdateTimestamp();
  setInterval(updateLastUpdateTimestamp, 60000);
}

/**
 * Main initialization function for current weather
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {Object} [preloadedData] - Optional preloaded weather data
 */
export function initWeather(lat, lon, preloadedData) {
  createLastUpdateElement();
  if (preloadedData) {
    const weatherData = formatWeatherData(preloadedData);
    updateDOMWithObservation(weatherData);
  } else {
    fetchCurrentWeather(lat, lon).then((weatherData) => {
      updateDOMWithObservation(weatherData);
    });
  }
  setInterval(() => {
    fetchCurrentWeather(lat, lon).then((weatherData) => {
      updateDOMWithObservation(weatherData);
    });
  }, 15 * 60 * 1000);
}

/**
 * Fetch current conditions directly - maintained for compatibility
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 */
export async function fetchCurrentConditions(lat, lon) {
  const weatherData = await fetchCurrentWeather(lat, lon);
  updateDOMWithObservation(weatherData);
  return weatherData;
}

export { fetchFromZoneFiles };

export function getDefaultWeatherData() {
  const now = new Date();
  return {
    temp: "N/A",
    condition: "Unknown",
    dewpoint: "N/A",
    humidity: "N/A",
    wind: "Calm",
    visibility: "N/A",
    pressure: "N/A",
    time: now,
    formattedTime: "Unknown",
    stationName: "Local Station",
    iconUrl: null,
    isFallback: true,
  };
}

// Export the enhanced function
export { fetchWeatherFromAPIRobust as fetchWeatherFromAPI };
