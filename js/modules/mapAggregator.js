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
  const usable = (st) =>
    st?.data?.temperature !== null && (st.observation?.age_minutes ?? 999) < 60;
  if (isMultiZone) {
    for (const zoneName of Object.keys(countyData)) {
      const zone = countyData[zoneName];
      if (!zone?.stations) continue;
      for (const st of Object.values(zone.stations)) {
        if (usable(st)) return st; // first station wins
      }
    }
    return null;
  } else {
    if (!countyData.stations) return null;
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
    const configResponse = await fetch(
      `counties/${countyName}/data/config.json?cb=${bust}`,
      { cache: "no-store" }
    );
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
            `counties/${countyName}/data/${zone}/current.json?cb=${bust}`,
            { cache: "no-store" }
          );
          if (resp.ok) zoneData[zone] = await resp.json();
        } catch {}
      }
      weatherData = zoneData;
    } else {
      try {
        const resp = await fetch(
          `counties/${countyName}/data/current.json?cb=${bust}`,
          { cache: "no-store" }
        );
        if (resp.ok) weatherData = await resp.json();
      } catch {}
    }
    if (!weatherData) return null;
    const bestStation = selectBestStationFromCounty(weatherData, isMultiZone);
    if (!bestStation) return null;
    return {
      temp: bestStation.data.temperature,
      conditions: bestStation.data.conditions || "N/A",
      stationName: bestStation.name || bestStation.id,
      age: bestStation.observation?.age_minutes || 0,
      updatedIso: weatherData.generated || bestStation.observation?.timestamp,
    };
  } catch {
    return null;
  }
}

/**
 * Default weather data fallback (when no data available)
 */
export function getDefaultWeatherData() {
  return { temp: "N/A", conditions: "N/A", stationName: "No Data", age: 999 };
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
