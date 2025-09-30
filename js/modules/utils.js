// =============================
// Weather Application Utilities - js/modules/utils.js
// 
// Common utility functions for weather data processing and formatting.
// Includes unit conversions, date formatting, DOM manipulation helpers, and
// weather station selection logic.
// =============================

export function safeSetText(elementId, text) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = text;
  }
}

export function safeSetHTML(elementId, html) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = html;
  }
}

export function degreesToCardinal(degrees) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

export function celsiusToFahrenheit(celsius) {
  return Math.round(celsius * 9 / 5 + 32);
}

export function metersToMiles(meters) {
  return Math.round(meters * 0.000621371);
}

export function pascalsToMillibars(pascals) {
  return Math.round(pascals / 100);
}

export function formatTime(timestamp) {
  if (!timestamp) return 'Unknown';

  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(',', '');
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 First latitude
 * @param {number} lon1 First longitude  
 * @param {number} lat2 Second latitude
 * @param {number} lon2 Second longitude
 * @returns {number} Distance in miles
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const earthRadius = 3959;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

/**
 * Convert degrees to radians
 * @param {number} degrees Degrees to convert
 * @returns {number} Radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Score station quality based on basic criteria (simplified for JS)
 * @param {Object} station Station feature from NWS API
 * @param {number} targetLat Target latitude
 * @param {number} targetLon Target longitude
 * @returns {Object} Station with score
 */
export function scoreStation(station, targetLat, targetLon) {
  const props = station.properties;
  const coords = station.geometry.coordinates;
  const stationLat = coords[1];
  const stationLon = coords[0];

  const distance = calculateDistance(targetLat, targetLon, stationLat, stationLon);
  const distanceScore = Math.max(0, (100 - distance) / 100); // 0-1 scale

  const provider = (props.provider || 'unknown').toUpperCase();
  let providerScore = 0.5;

  if (provider === 'ASOS') providerScore = 1.0;
  else if (provider === 'AWOS') providerScore = 0.9;
  else if (provider === 'MESOWEST' || provider === 'MADIS') providerScore = 0.7;
  else if (provider === 'COOP' || provider === 'RAWS') providerScore = 0.6;

  const name = (props.name || '').toUpperCase();
  let typeScore = 0.7;

  if (name.includes('AIRPORT') || name.includes('FIELD') ||
    name.includes('AFB') || name.includes('ARP')) {
    typeScore = 1.0;
  } else if (name.includes('COAST GUARD')) {
    typeScore = 0.9;
  } else if (name.includes('UNIVERSITY') || name.includes('COLLEGE')) {
    typeScore = 0.8;
  }

  const compositeScore = (
    distanceScore * 0.6 +      // 60% distance weight
    providerScore * 0.25 +     // 25% provider weight
    typeScore * 0.15           // 15% type weight
  );

  return {
    station,
    stationId: props.stationIdentifier,
    name: props.name,
    provider: props.provider || 'unknown',
    distance: Math.round(distance * 10) / 10,
    scores: {
      distance: Math.round(distanceScore * 1000) / 1000,
      provider: Math.round(providerScore * 1000) / 1000,
      type: Math.round(typeScore * 1000) / 1000,
      composite: Math.round(compositeScore * 1000) / 1000
    }
  };
}

/**
 * Select best station from available options (simplified for JS fallback)
 * @param {Array} stations Array of station features from NWS API
 * @param {number} targetLat Target latitude
 * @param {number} targetLon Target longitude
 * @returns {Object} Best station info
 */
export function selectBestStationJS(stations, targetLat, targetLon) {
  if (!stations || stations.length === 0) {
    throw new Error('No stations available for selection');
  }

  console.log(`Evaluating ${Math.min(3, stations.length)} stations for JS fallback`);

  const maxStationsToEvaluate = Math.min(3, stations.length);
  const scoredStations = [];

  for (let i = 0; i < maxStationsToEvaluate; i++) {
    const scoredStation = scoreStation(stations[i], targetLat, targetLon);
    scoredStations.push(scoredStation);
  }

  scoredStations.sort((a, b) => b.scores.composite - a.scores.composite);

  const bestStation = scoredStations[0];

  console.log(`Selected station ${bestStation.stationId} (${bestStation.name}) - Distance: ${bestStation.distance} mi, Score: ${bestStation.scores.composite}`);

  return bestStation;
}

/**
 * Try multiple stations with fallback (for robust API calls)
 * @param {Array} stations Array of station features
 * @param {number} targetLat Target latitude
 * @param {number} targetLon Target longitude
 * @param {Function} testStationFn Function to test if station has good data
 * @returns {Promise<Object>} Best working station info
 */
export async function selectWorkingStation(stations, targetLat, targetLon, testStationFn) {
  const rankedStations = [];

  for (const station of stations.slice(0, 5)) {
    const scored = scoreStation(station, targetLat, targetLon);
    rankedStations.push(scored);
  }

  rankedStations.sort((a, b) => b.scores.composite - a.scores.composite);

  for (const stationInfo of rankedStations) {
    try {
      console.log(`Testing station ${stationInfo.stationId}...`);
      const hasGoodData = await testStationFn(stationInfo.stationId);

      if (hasGoodData) {
        console.log(`Station ${stationInfo.stationId} selected and working`);
        return stationInfo;
      }

      console.log(`Station ${stationInfo.stationId} failed data quality test`);
    } catch (error) {
      console.log(`Station ${stationInfo.stationId} failed: ${error.message}`);
    }
  }

  throw new Error('No working stations found');
}

/**
 * Format temperature with proper fallbacks
 * @param {number|null} temp Temperature value
 * @returns {string} Formatted temperature
 */
export function formatTemperature(temp) {
  if (temp === null || temp === undefined || isNaN(temp)) {
    return 'N/A';
  }
  return Math.round(temp) + '°F';
}

/**
 * Format wind information
 * @param {number|null} speed Wind speed in mph
 * @param {string|null} direction Cardinal direction
 * @returns {string} Formatted wind string
 */
export function formatWind(speed, direction) {
  if (!speed || speed === 0) {
    return 'Calm';
  }

  if (!direction || direction === 'N/A') {
    return `${Math.round(speed)} mph`;
  }

  return `${Math.round(speed)} mph from ${direction}`;
}

/**
 * Format visibility
 * @param {number|null} visibility Visibility in miles
 * @returns {string} Formatted visibility
 */
export function formatVisibility(visibility) {
  if (visibility === null || visibility === undefined || isNaN(visibility)) {
    return 'N/A';
  }

  if (visibility >= 10) {
    return '10+ mi';
  }

  return `${Math.round(visibility * 10) / 10} mi`;
}

/**
 * Format pressure
 * @param {number|null} pressure Pressure in millibars
 * @returns {string} Formatted pressure
 */
export function formatPressure(pressure) {
  if (pressure === null || pressure === undefined || isNaN(pressure)) {
    return 'N/A';
  }

  return `${Math.round(pressure)} mb`;
}

/**
 * Format humidity
 * @param {number|null} humidity Humidity percentage
 * @returns {string} Formatted humidity
 */
export function formatHumidity(humidity) {
  if (humidity === null || humidity === undefined || isNaN(humidity)) {
    return 'N/A';
  }

  return `${Math.round(humidity)}%`;
}

/**
 * Check if data is recent enough to be useful
 * @param {number|string} timestamp Unix timestamp or ISO string
 * @param {number} maxAgeHours Maximum age in hours
 * @returns {boolean} True if data is fresh enough
 */
export function isDataFresh(timestamp, maxAgeHours = 6) {
  if (!timestamp) return false;

  const dataTime = typeof timestamp === 'string' ?
    new Date(timestamp).getTime() :
    timestamp * 1000;

  const ageHours = (Date.now() - dataTime) / (1000 * 60 * 60);
  return ageHours <= maxAgeHours;
}

/**
 * Format date for display (needed by tropical.js)
 * @param {Date} date Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  if (!date) return 'Unknown';

  if (!(date instanceof Date)) {
    date = new Date(date);
  }

  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(',', '');
}