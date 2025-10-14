// =============================
// Map Data Aggregator - js/modules/mapAggregator.js
// Aggregates weather and alert data for multiple counties.
// Provides functions to fetch current weather and alerts based on coordinates.
// Designed for use with the NC County Map and other modules.
// =============================


// Configurable maximum station data age (minutes). Default 90
let STATION_MAX_AGE_MINUTES = 90;

const COUNTIES = ['bertie', 'pitt', 'beaufort', 'martin', 'dare', 'hyde', 'washington', 'tyrrell'];

/**
 * Preferred station mapping: countyName (or countyName.zoneName) => preferred station ID(s)
 * Example: { beaufort: 'KOCW', 'dare.mainland': ['KHSE', 'KFFA'] }
 */
const PREFERRED_STATIONS = {
  // Example entries (customize as needed):
  beaufort: 'KOCW',
  washington: 'KOCW',
  // 'dare.mainland': ['KHSE', 'KFFA'],
  // Add more as needed
};

/**
 * Select best station from county data (handles both single and multi-zone)
 * Prefers station(s) from PREFERRED_STATIONS if available, else falls back to first usable.
 */
function selectBestStationFromCounty(countyData, isMultiZone = false, countyName = '', zoneName = '') {
  const usable = (st) =>
    st?.data?.temperature !== null &&
    st?.data?.temperature !== undefined &&
    st?.observation?.timestamp !== null &&
    (st.observation?.age_minutes ?? 999) < STATION_MAX_AGE_MINUTES;

  // Helper to find preferred station in a stations object
  function findPreferred(stations, preferred) {
    if (!stations || !preferred) return null;
    const ids = Array.isArray(preferred) ? preferred : [preferred];
    for (const id of ids) {
      if (stations[id] && usable(stations[id])) return stations[id];
    }
    return null;
  }

  if (isMultiZone) {
    for (const zn of Object.keys(countyData)) {
      const zone = countyData[zn];
      if (!zone?.stations) continue;
      // Try per-county+zone preferred, then per-county
      const preferred = PREFERRED_STATIONS[`${countyName}.${zn}`] || PREFERRED_STATIONS[countyName];
      const found = findPreferred(zone.stations, preferred);
      if (found) return found;
      // Fallback: first usable
      for (const st of Object.values(zone.stations)) {
        if (usable(st)) return st;
      }
    }
    return null;
  } else {
    if (!countyData.stations) return null;
    const preferred = PREFERRED_STATIONS[countyName];
    const found = findPreferred(countyData.stations, preferred);
    if (found) return found;
    for (const st of Object.values(countyData.stations)) {
      if (usable(st)) return st;
    }
    return null;
  }
}

/**
 * Fetch weather data for a specific county
 */
async function fetchCountyWeather(countyName) {
  const BUST_BUCKET_MS = 15 * 60 * 1000;
  const bust = Math.floor(Date.now() / BUST_BUCKET_MS);
  try {
    const configResponse = await fetch(`counties/${countyName}/data/config.json?v=${bust}`, {
      cache: 'no-store',
    });
    if (!configResponse.ok) return null;
    const config = await configResponse.json();
    const isMultiZone = config.county?.multiZone || false;
    let weatherData = null;
    if (isMultiZone) {
      const zones = Object.keys(config.zones || {});
      const zoneData = {};
      for (const zone of zones) {
        try {
          const resp = await fetch(
            `counties/${countyName}/data/${zone}/current.json?v=${bust}`,
            { cache: 'no-store' }
          );
          if (resp.ok) zoneData[zone] = await resp.json();
        } catch { }
      }
      weatherData = zoneData;
    } else {
      try {
        const resp = await fetch(`counties/${countyName}/data/current.json?v=${bust}`, {
          cache: 'no-store',
        });
        if (resp.ok) weatherData = await resp.json();
      } catch { }
    }
    if (!weatherData) return null;
    // Pass countyName and zoneName for preferred station logic
    const bestStation = selectBestStationFromCounty(weatherData, isMultiZone, countyName);
    if (!bestStation) {
      console.warn(`No valid weather data available for ${countyName}`);
      return null;
    }
    // Extract all needed parameters, with 'N/A' fallback for null values
    return {
      temp: bestStation.data.temperature ?? 'N/A',
      humidity: bestStation.data.humidity ?? 'N/A',
      dewpoint: bestStation.data.dewpoint ?? 'N/A',
      windSpeed: bestStation.data.windSpeed ?? 'N/A',
      windDirection: bestStation.data.windDirection ?? 'N/A',
      windGust: bestStation.data.windGust ?? bestStation.data.gust ?? 'N/A',
      conditions: bestStation.data.conditions || 'N/A',
      stationName: bestStation.name || bestStation.id,
      age: bestStation.observation?.age_minutes || 999,
      updatedIso: bestStation.observation?.timestamp || weatherData.generated,
    };
  } catch {
    return null;
  }
}

/**
 * Default weather data fallback (when no data available)
 */
export function getDefaultWeatherData() {
  return { temp: 'N/A', conditions: 'N/A', stationName: 'No Data', age: 999 };
}

/**
 * Main aggregator function - replaces the old fetchCurrentWeather function
 */
/**
 * Fetch current weather for a county at lat/lon, returning all parameters for the marker
 * Optionally accepts a parameter argument ("temperature", "humidity", "dewpoint", "wind")
 */
export async function fetchCurrentWeather(lat, lon, parameter = 'temperature') {
  let countyName = null;

  if (window.siteConfig?.counties) {
    const county = window.siteConfig.counties.find(
      (c) => Math.abs(c.lat - lat) < 0.1 && Math.abs(c.lon - lon) < 0.1
    );
    countyName = county?.name?.toLowerCase();
  }

  if (!countyName || !COUNTIES.includes(countyName)) {
    console.warn(`No county match found for coordinates ${lat}, ${lon}`);
    return { temp: 'N/A', conditions: 'N/A' };
  }

  const weather = await fetchCountyWeather(countyName);

  if (!weather) {
    return { temp: 'N/A', conditions: 'N/A' };
  }

  // Always return all parameters so the map can switch between them
  return weather;
}

/**
 * Main aggregator function - replaces the old fetchAlerts function
 */
export async function fetchAlerts(lat, lon) {
  const BUST_BUCKET_MS = 15 * 60 * 1000;
  const bust = Math.floor(Date.now() / BUST_BUCKET_MS);
  let countyName = null;

  if (window.siteConfig?.counties) {
    const county = window.siteConfig.counties.find(
      (c) => Math.abs(c.lat - lat) < 0.1 && Math.abs(c.lon - lon) < 0.1
    );
    countyName = county?.name?.toLowerCase();
  }

  if (!countyName || !COUNTIES.includes(countyName)) {
    console.warn(`No county match found for alerts ${lat}, ${lon}`);
    return [];
  }

  try {
    const configResponse = await fetch(`counties/${countyName}/data/config.json?v=${bust}`, {
      cache: 'no-store',
    });
    if (!configResponse.ok) return [];

    const config = await configResponse.json();
    const isMultiZone = config.county?.multiZone || false;

    let allAlerts = [];

    if (isMultiZone) {
      const zones = Object.keys(config.zones || {});

      for (const zoneName of zones) {
        const zoneConfig = config.zones[zoneName];
        const forecastZone = zoneConfig.forecast;

        try {
          const alertsResponse = await fetch(
            `counties/${countyName}/data/${zoneName}/alerts.json?v=${bust}`,
            { cache: 'no-store' }
          );
          if (alertsResponse.ok) {
            const alertsData = await alertsResponse.json();
            if (alertsData.alerts && Array.isArray(alertsData.alerts)) {
              const zoneAlerts = alertsData.alerts.map((alert) => ({
                ...alert,
                zones: [forecastZone],
                sourceZone: zoneName,
                forecastZone: forecastZone,
              }));
              allAlerts = allAlerts.concat(zoneAlerts);
            }
          }
        } catch (err) {
          console.warn(
            `Failed to fetch alerts for zone ${zoneName} in ${countyName}:`,
            err
          );
        }
      }
    } else {
      try {
        const alertsResponse = await fetch(
          `counties/${countyName}/data/alerts.json?v=${bust}`,
          { cache: 'no-store' }
        );
        if (alertsResponse.ok) {
          const alertsData = await alertsResponse.json();
          if (alertsData.alerts && Array.isArray(alertsData.alerts)) {
            const forecastZone = config.zones?.forecast;
            allAlerts = alertsData.alerts.map((alert) => ({
              ...alert,
              zones: forecastZone ? [forecastZone] : [],
              sourceZone: 'single',
              forecastZone: forecastZone,
            }));
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch alerts for ${countyName}:`, err);
      }
    }

    const uniqueAlerts = [];
    const seenIds = new Set();

    for (const alert of allAlerts) {
      const id = `${alert.id || alert.identifier || alert.event}-${alert.forecastZone}`;

      if (!seenIds.has(id)) {
        seenIds.add(id);
        uniqueAlerts.push(alert);
      }
    }

    return uniqueAlerts;
  } catch (error) {
    console.error(`Error fetching alerts for ${countyName}:`, error);
    return [];
  }
}

/**
 * Batch update function for efficiency (optional enhancement)
 */
export async function updateMapData() {
  console.log('[mapAggregator] Starting batch update for all counties');

  const weatherData = {};
  const alertsData = {};

  const promises = COUNTIES.map(async (countyName) => {
    try {
      const [weather, alerts] = await Promise.all([
        fetchCountyWeather(countyName),
        fetchCountyAlerts(countyName),
      ]);

      if (weather) {
        weatherData[countyName] = weather;
      }

      alertsData[countyName] = alerts || [];
    } catch (error) {
      console.error(`Failed to update data for ${countyName}:`, error);
    }
  });

  await Promise.all(promises);

  console.log(`[mapAggregator] Updated data for ${Object.keys(weatherData).length} counties`);

  return { weatherData, alertsData };
}

// Configurable maximum station data age (minutes). Default 90;
export function setStationMaxAgeMinutes(mins) {
  if (typeof mins === 'number' && mins > 0) {
    STATION_MAX_AGE_MINUTES = mins;
  }
}
