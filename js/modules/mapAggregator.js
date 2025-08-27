/**
 * Map Aggregator Module
 * Aggregates weather data from county-specific files for main index map display
 */

// County list to aggregate
const COUNTIES = [
  "bertie",
  "pitt",
  "beaufort",
  "martin",
  "dare",
  "hyde",
  "washington",
  "tyrrell",
];

/**
 * Select best station from county data (handles both single and multi-zone)
 */
function selectBestStationFromCounty(countyData, isMultiZone = false) {
  if (!countyData) return null;

  let allStations = [];

  if (isMultiZone) {
    // Multi-zone: collect stations from all zones
    Object.values(countyData).forEach((zoneData) => {
      if (zoneData && zoneData.stations) {
        Object.values(zoneData.stations).forEach((station) => {
          if (station && station.data && station.data.temperature !== null) {
            allStations.push(station);
          }
        });
      }
    });
  } else {
    // Single-zone: use stations directly
    if (countyData.stations) {
      Object.values(countyData.stations).forEach((station) => {
        if (station && station.data && station.data.temperature !== null) {
          allStations.push(station);
        }
      });
    }
  }

  if (allStations.length === 0) return null;

  // Select best station by data freshness and completeness
  allStations.sort((a, b) => {
    const ageA = a.observation?.age_minutes || 999;
    const ageB = b.observation?.age_minutes || 999;

    // Prefer fresher data
    if (ageA !== ageB) return ageA - ageB;

    // Prefer more complete data
    const completeA =
      (a.data.temperature !== null ? 1 : 0) +
      (a.data.windSpeed !== null ? 1 : 0) +
      (a.data.conditions !== null ? 1 : 0);
    const completeB =
      (b.data.temperature !== null ? 1 : 0) +
      (b.data.windSpeed !== null ? 1 : 0) +
      (b.data.conditions !== null ? 1 : 0);

    return completeB - completeA;
  });

  return allStations[0];
}

/**
 * Fetch weather data for a specific county
 */
async function fetchCountyWeather(countyName) {
  try {
    // First, get county config to determine if multi-zone
    const configResponse = await fetch(
      `counties/${countyName}/data/config.json`
    );
    if (!configResponse.ok) {
      console.warn(`Config not found for ${countyName}`);
      return null;
    }

    const config = await configResponse.json();
    const isMultiZone = config.county?.multiZone || false;

    let weatherData = null;

    if (isMultiZone) {
      // Multi-zone: fetch from each zone and aggregate
      const zones = Object.keys(config.zones || {});
      const zoneData = {};

      for (const zone of zones) {
        try {
          const zoneResponse = await fetch(
            `counties/${countyName}/data/${zone}/current.json`
          );
          if (zoneResponse.ok) {
            zoneData[zone] = await zoneResponse.json();
          }
        } catch (err) {
          console.warn(`Failed to fetch zone ${zone} for ${countyName}:`, err);
        }
      }

      weatherData = zoneData;
    } else {
      // Single-zone: fetch directly
      try {
        const response = await fetch(
          `counties/${countyName}/data/current.json`
        );
        if (response.ok) {
          weatherData = await response.json();
        }
      } catch (err) {
        console.warn(`Failed to fetch weather for ${countyName}:`, err);
      }
    }

    if (!weatherData) return null;

    // Select best station
    const bestStation = selectBestStationFromCounty(weatherData, isMultiZone);
    if (!bestStation) return null;

    // Return in format expected by map
    return {
      temp: bestStation.data.temperature,
      conditions: bestStation.data.conditions || "N/A",
      stationName: bestStation.name || bestStation.id,
      age: bestStation.observation?.age_minutes || 0,
    };
  } catch (error) {
    console.error(`Error fetching weather for ${countyName}:`, error);
    return null;
  }
}

/**
 * Default weather data fallback (when no data available)
 */
export function getDefaultWeatherData() {
  return {
    temp: "N/A",
    conditions: "N/A",
    stationName: "No Data",
    age: 999,
  };
}

/**
 * Main aggregator function - replaces the old fetchCurrentWeather function
 */
export async function fetchCurrentWeather(lat, lon) {
  // Find county name from coordinates using existing siteConfig
  let countyName = null;

  if (window.siteConfig?.counties) {
    const county = window.siteConfig.counties.find(
      (c) => Math.abs(c.lat - lat) < 0.1 && Math.abs(c.lon - lon) < 0.1
    );
    countyName = county?.name?.toLowerCase();
  }

  if (!countyName || !COUNTIES.includes(countyName)) {
    console.warn(`No county match found for coordinates ${lat}, ${lon}`);
    return { temp: "N/A", conditions: "N/A" };
  }

  const weather = await fetchCountyWeather(countyName);

  if (!weather) {
    return { temp: "N/A", conditions: "N/A" };
  }

  return weather;
}

/**
 * Main aggregator function - replaces the old fetchAlerts function
 */
export async function fetchAlerts(lat, lon) {
  // Find county name from coordinates
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

  // Get county config to determine zones
  try {
    const configResponse = await fetch(
      `counties/${countyName}/data/config.json`
    );
    if (!configResponse.ok) return [];

    const config = await configResponse.json();
    const isMultiZone = config.county?.multiZone || false;

    let allAlerts = [];

    if (isMultiZone) {
      // Multi-zone: collect alerts from all zones WITH zone identification
      const zones = Object.keys(config.zones || {});

      for (const zoneName of zones) {
        const zoneConfig = config.zones[zoneName];
        const forecastZone = zoneConfig.forecast; // e.g., "NCZ203"

        try {
          const alertsResponse = await fetch(
            `counties/${countyName}/data/${zoneName}/alerts.json`
          );
          if (alertsResponse.ok) {
            const alertsData = await alertsResponse.json();
            if (alertsData.alerts && Array.isArray(alertsData.alerts)) {
              // Add zone information to each alert
              const zoneAlerts = alertsData.alerts.map((alert) => ({
                ...alert,
                // Ensure zone info is preserved/added
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
      // Single-zone: fetch directly and add zone info
      try {
        const alertsResponse = await fetch(
          `counties/${countyName}/data/alerts.json`
        );
        if (alertsResponse.ok) {
          const alertsData = await alertsResponse.json();
          if (alertsData.alerts && Array.isArray(alertsData.alerts)) {
            // Add zone information based on county config
            const forecastZone = config.zones?.forecast;
            allAlerts = alertsData.alerts.map((alert) => ({
              ...alert,
              zones: forecastZone ? [forecastZone] : [],
              sourceZone: "single",
              forecastZone: forecastZone,
            }));
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch alerts for ${countyName}:`, err);
      }
    }

    // Remove duplicates but preserve zone information
    const uniqueAlerts = [];
    const seenIds = new Set();

    for (const alert of allAlerts) {
      // Include forecastZone in the deduplication key to preserve zone-specific alerts
      const id = `${alert.id || alert.identifier || alert.event}-${
        alert.forecastZone
      }`;

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
  console.log("[mapAggregator] Starting batch update for all counties");

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

  console.log(
    `[mapAggregator] Updated data for ${
      Object.keys(weatherData).length
    } counties`
  );

  return { weatherData, alertsData };
}