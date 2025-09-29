// ========================
// Bertie County Page Data Handler - countyData.js
//
// Products:
//   • Current Conditions
//   • Forecast/Hourly/Alerts/AFD
//
// Units Conversion: km/h↔mph, m/s↔mph, Pa→mb, m→miles
//
// Derived: Heat Index(°F) + Wind Chill(°F)
// ========================

const FRESH_MINUTES = 120; // accept obs ≤ 60 minutes old

// ---------- helpers ----------
function minutesSince(iso) {
  if (!iso) return Infinity;
  return Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  );
}
function degToCompass(deg) {
  if (deg == null) return null;
  const d = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  return d[Math.round((deg % 360) / 22.5) % 16];
}
const round = (v, n = 0) => (v == null ? null : +Number(v).toFixed(n));
const cToF = (c) => (c == null ? null : (Number(c) * 9) / 5 + 32);
const paToMb = (pa) => (pa == null ? null : round(Number(pa) / 100, 1));
const mToMiles = (m) => (m == null ? null : round(Number(m) / 1609.344));
const kphToMph = (k) => (k == null ? null : round(Number(k) * 0.621371));
const msToMph = (ms) => (ms == null ? null : round(Number(ms) * 2.236936));

function windSpeedToMph(val, unitCode) {
  if (val == null) return null;
  const u = (unitCode || "").toLowerCase();
  if (u.includes("km_h-1") || u.includes("km/h")) return kphToMph(val);
  if (u.includes("m_s-1") || u.includes("m/s")) return msToMph(val);
  if (u.includes("mph")) return round(val);
  // Unknown: assume km/h for non-airport sensors
  return kphToMph(val);
}

// Derived indices
function computeHeatIndexF(T, RH) {
  if (T == null || RH == null) return null;
  const t = Number(T),
    r = Number(RH);
  if (!(t >= 80 && r >= 40)) return null;
  let HI =
    -42.379 +
    2.04901523 * t +
    10.14333127 * r -
    0.22475541 * t * r -
    0.00683783 * t * t -
    0.05481717 * r * r +
    0.00122874 * t * t * r +
    0.00085282 * t * r * r -
    0.00000199 * t * t * r * r;
  if (r <= 13 && t >= 80 && t <= 112) {
    HI -= ((13 - r) / 4) * Math.sqrt((17 - Math.abs(t - 95)) / 17);
  }
  if (r >= 85 && t >= 80 && t <= 87) {
    HI += ((r - 85) / 10) * ((87 - t) / 5);
  }
  return Math.round(HI);
}
function computeWindChillF(T, Vmph) {
  if (T == null || Vmph == null) return null;
  const t = Number(T),
    v = Number(Vmph);
  if (!(t <= 50 && v >= 3)) return null;
  return Math.round(
    35.74 +
    0.6215 * t -
    35.75 * Math.pow(v, 0.16) +
    0.4275 * t * Math.pow(v, 0.16)
  );
}

function shortenStationName(name, id) {
  if (!name) return id;
  // Heuristic: if name contains " AT ", take tail (common for river gauges)
  const m = name.split(/\s+AT\s+/i);
  if (m.length > 1) {
    return m[m.length - 1].trim();
  }
  // Trim overly long names
  return name.length > 28 ? name.slice(0, 25).trim() + "…" : name;
}

async function httpGetJson(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/geo+json, application/json;q=0.9" },
  });
  if (!res.ok) throw new Error(`GET ${url} ${res.status}`);
  return res.json();
}

// Updated fetchLatestObs function for countyData.js
// Replace the existing fetchLatestObs function with this version

async function fetchLatestObs(stationId) {
  const res = await fetch(url, {
    headers: { "User-Agent": "NCHurricane.com Weather App/1.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const data = json.properties;
  if (!data) throw new Error("No properties in response");

  const obsTime = data.timestamp;
  const ageMs = Math.abs(Date.now() - new Date(obsTime).getTime());
  const ageMinutes = Math.round(ageMs / (60 * 1000));
  const isFresh = ageMinutes <= FRESH_MINUTES;

  // Temperature conversion (handle both Celsius and Fahrenheit)
  let tempF = null;
  if (data.temperature?.value != null) {
    if (data.temperature.unitCode === "wmoUnit:degC") {
      // Convert Celsius to Fahrenheit
      tempF = (data.temperature.value * 9 / 5) + 32;
    } else {
      // Already in Fahrenheit or other units
      tempF = data.temperature.value;
    }
  }

  // Dewpoint conversion
  let dewF = null;
  if (data.dewpoint?.value != null) {
    if (data.dewpoint.unitCode === "wmoUnit:degC") {
      // Convert Celsius to Fahrenheit
      dewF = (data.dewpoint.value * 9 / 5) + 32;
    } else {
      // Already in Fahrenheit or other units
      dewF = data.dewpoint.value;
    }
  }

  // Wind speed conversion (handle km/h, m/s, and mph)
  let wspdMph = null;
  if (data.windSpeed?.value != null) {
    if (data.windSpeed.unitCode === "wmoUnit:km_h-1") {
      // Convert km/h to mph
      wspdMph = data.windSpeed.value * 0.621371;
    } else if (data.windSpeed.unitCode === "wmoUnit:m_s-1") {
      // Convert m/s to mph  
      wspdMph = data.windSpeed.value * 2.237;
    } else {
      // Assume already in mph or use as-is
      wspdMph = data.windSpeed.value;
    }
  }

  // Wind gust conversion
  let gustMph = null;
  if (data.windGust?.value != null) {
    if (data.windGust.unitCode === "wmoUnit:km_h-1") {
      // Convert km/h to mph
      gustMph = data.windGust.value * 0.621371;
    } else if (data.windGust.unitCode === "wmoUnit:m_s-1") {
      // Convert m/s to mph
      gustMph = data.windGust.value * 2.237;
    } else {
      // Assume already in mph or use as-is
      gustMph = data.windGust.value;
    }
  }

  // Pressure conversion (Pascals to millibars)
  let prMb = null;
  if (data.barometricPressure?.value != null) {
    if (data.barometricPressure.unitCode === "wmoUnit:Pa") {
      // Convert Pascals to millibars
      prMb = data.barometricPressure.value / 100;
    } else {
      // Assume already in millibars or use as-is
      prMb = data.barometricPressure.value;
    }
  }

  // Visibility conversion (meters to miles)
  let visMi = null;
  if (data.visibility?.value != null) {
    if (data.visibility.unitCode === "wmoUnit:m") {
      // Convert meters to miles
      visMi = data.visibility.value / 1609.34;
    } else {
      // Assume already in miles or use as-is
      visMi = data.visibility.value;
    }
  }

  // Heat Index conversion
  let heatIndex = null;
  if (data.heatIndex?.value != null) {
    if (data.heatIndex.unitCode === "wmoUnit:degC") {
      // Convert Celsius to Fahrenheit
      heatIndex = (data.heatIndex.value * 9 / 5) + 32;
    } else {
      // Already in Fahrenheit or other units
      heatIndex = data.heatIndex.value;
    }
  }

  // Wind Chill conversion
  let windChill = null;
  if (data.windChill?.value != null) {
    if (data.windChill.unitCode === "wmoUnit:degC") {
      // Convert Celsius to Fahrenheit
      windChill = (data.windChill.value * 9 / 5) + 32;
    } else {
      // Already in Fahrenheit or other units
      windChill = data.windChill.value;
    }
  }

  // Humidity (should already be in percent)
  const rhPct = data.relativeHumidity?.value;

  // Wind direction (degrees)
  const wdir = data.windDirection?.value;

  // Text description and icon
  const textDesc = data.textDescription || null;
  const icon = data.icon || null;

  // Convert wind direction from degrees to cardinal
  const cardinalDir = wdir != null ? degreesToCardinal(wdir) : null;

  return {
    stationId,
    stationName: data.stationName || stationId,
    obsTime,
    ageMinutes,
    isFresh,
    data: {
      temperature: tempF != null ? Math.round(tempF) : null,
      dewpoint: dewF != null ? Math.round(dewF) : null,
      humidity: rhPct,
      pressure: prMb,
      windSpeed: wspdMph,
      windDirection: cardinalDir,
      windGust: gustMph,
      visibility: visMi,
      conditions: textDesc,
      icon,
      heatIndex,
      windChill,
    },
  };
}

// Helper function to convert degrees to cardinal direction
function degreesToCardinal(degrees) {
  if (degrees == null) return null;
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

export async function init() {
  const res = await fetch("./data/config.json?v=" + Date.now(), { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load config.json");
  return res.json();
}

// Updated getCurrentConditions function for countyData.js
// Replace the existing getCurrentConditions function with this version

export async function getCurrentConditions() {
  try {
    // Load config to get station list
    const config = await init();
    const stations = config.stations || [];

    if (stations.length === 0) {
      return {
        status: "error",
        message: "No stations configured.",
      };
    }

    // Fetch the cached current conditions data
    const response = await fetch("./data/current.json?v=" + Date.now(), {
      headers: { "User-Agent": "NCHurricane.com Weather App/1.0" },
      cache: "no-store" // Ensure we get fresh data
    });

    if (!response.ok) {
      throw new Error(`Failed to load current.json: HTTP ${response.status}`);
    }

    const cacheData = await response.json();

    if (!cacheData.stations) {
      throw new Error("Invalid cache data structure");
    }

    // Process each configured station
    const results = [];

    for (const station of stations) {
      const stationId = station.id;
      const cachedStation = cacheData.stations[stationId];

      if (!cachedStation || !cachedStation.observation || !cachedStation.data) {
        console.warn(`[current] No cached data for station ${stationId}`);
        continue;
      }

      const obsTime = cachedStation.observation.timestamp;
      const ageMinutes = cachedStation.observation.age_minutes;
      const isFresh = ageMinutes <= FRESH_MINUTES;

      // Data is already converted to proper units by PHP cache
      const data = cachedStation.data;

      const result = {
        stationId: stationId,
        stationName: cachedStation.name || station.name || stationId,
        obsTime: obsTime,
        ageMinutes: ageMinutes,
        isFresh: isFresh,
        data: {
          temperature: data.temperature,
          dewpoint: data.dewpoint,
          humidity: data.humidity,
          pressure: data.pressure,
          windSpeed: data.windSpeed,
          windDirection: data.windDirection, // Already converted to cardinal
          windGust: data.windGust,
          visibility: data.visibility,
          conditions: data.conditions,
          icon: data.icon,
          heatIndex: data.heatIndex,
          windChill: data.windChill,
        },
      };

      results.push(result);
      console.log(`[current] Loaded ${stationId}: temp=${data.temperature}, age=${ageMinutes}min`);
    }

    console.log(`[current] Successfully loaded ${results.length} stations:`, results.map(r => r.stationId));

    if (results.length === 0) {
      return {
        status: "error",
        message: "Weather data temporarily unavailable. Please check back shortly.",
      };
    }

    // Select the best station (same logic as before)
    const fresh = results.find((r) => r.isFresh);
    const chosen =
      fresh ||
      results
        .filter((r) => r.data.temperature != null)
        .sort((a, b) => a.ageMinutes - b.ageMinutes)[0] ||
      results[0];

    // Find the config for the chosen station
    const chosenConfig = stations.find(st => st.id === chosen.stationId);

    const d = chosen.data;
    const windStr =
      d.windSpeed == null || d.windSpeed < 1
        ? "Calm"
        : `${d.windDirection || "--"} at ${d.windSpeed} mph`;
    const visStr = d.visibility == null ? "N/A" : `${d.visibility} miles`;

    // Build secondaries list (others with a temperature)
    const secondaries = results
      .filter(r => r.stationId !== chosen.stationId && r.data.temperature != null)
      .map(r => {
        const stationConfig = stations.find(st => st.id === r.stationId);
        return {
          id: r.stationId,
          name: r.stationName,
          shortName: stationConfig?.friendlyName || r.stationName,
          temperature: r.data.temperature,
          hasIcon: !!r.data.icon
        };
      });

    // Find any icon among results if chosen lacks one (for background only)
    const bgIcon = d.icon || results.find((r) => r.data.icon)?.data.icon || null;

    return {
      status: "ok",
      stationId: chosen.stationId,
      stationName: chosen.stationName,
      friendlyName: chosenConfig?.friendlyName || chosen.stationName,
      obsTime: chosen.obsTime,
      ageMinutes: chosen.ageMinutes,
      temperature: d.temperature,
      dewpoint: d.dewpoint,
      humidity: d.humidity,
      pressure: d.pressure,
      wind: windStr,
      windGust: d.windGust,
      visibility: visStr,
      conditions: d.conditions || "N/A",
      icon: bgIcon,
      heatIndex: d.heatIndex ?? null,
      windChill: d.windChill ?? null,
      secondaries,
    };

  } catch (error) {
    console.error('Error loading current conditions from cache:', error);
    return {
      status: "error",
      message: "Weather data temporarily unavailable. Please check back shortly.",
    };
  }
}

export async function getForecast() {
  const r = await fetch("./data/forecast.json", { cache: "no-store" });
  if (!r.ok) throw new Error("Failed to load forecast.json");
  return r.json();
}
export async function getHourlyData() {
  const r = await fetch("./data/hourly.json", { cache: "no-store" });
  if (!r.ok) throw new Error("Failed to load hourly.json");
  return r.json();
}
export async function getAlerts() {
  const r = await fetch("./data/alerts.json", { cache: "no-store" });
  if (!r.ok) throw new Error("Failed to load alerts.json");
  const j = await r.json();
  return { status: "ok", list: Array.isArray(j.alerts) ? j.alerts : [] };
}
export async function getAFD() {
  const r = await fetch("./data/discussion.json", { cache: "no-store" });
  if (!r.ok) throw new Error("Failed to load discussion.json");
  const j = await r.json();
  return { status: "ok", text: j.text || "" };
}
