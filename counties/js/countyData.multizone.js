// =======================
// Dare County Page Data Handler - countyData.js
//
// Products:
//   • Current Conditions
//   • Forecast/Hourly/Alerts/AFD
//
// Units Conversion: km/h↔mph, m/s↔mph, Pa→mb, m→miles
//
// Derived: Heat Index(°F) + Wind Chill(°F)
// ========================

let config = null;

const FRESH_MINUTES = 120;

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
  return dirs[Math.round((deg % 360) / 22.5) % 16];
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
  return kphToMph(val);
}

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
  const m = name.split(/\s+AT\s+/i);
  if (m.length > 1) {
    return m[m.length - 1].trim();
  }
  return name.length > 28 ? name.slice(0, 25).trim() + "…" : name;
}

/**
 * Initialize the county data module
 * Loads config and determines current zone
 */
export async function init() {
  try {
    const res = await fetch("./data/config.json?v=" + Date.now(), { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load config.json: ${res.status}`);

    config = await res.json();

    const urlParams = new URLSearchParams(window.location.search);
    const urlZone = urlParams.get("zone");
    const storedZone = localStorage.getItem("selectedZone");
    const currentZone =
      urlZone || storedZone || config.county?.defaultZone || "mainland";

    config.currentZone = currentZone;

    console.log(
      `[countyData] Initialized for ${config.county.name} County, zone: ${currentZone}`
    );
    return config;
  } catch (error) {
    console.error("[countyData] Failed to initialize:", error);
    throw error;
  }
}

/**
 * Get the data path based on whether this is multi-zone or single-zone county
 */
function getDataPath(fileName) {
  if (!config) {
    throw new Error("Config not initialized. Call init() first.");
  }

  if (config.county?.multiZone) {
    const currentZone = config.currentZone;
    return `./data/${currentZone}/${fileName}`;
  }

  return `./data/${fileName}`;
}

/**
 * Get current zone stations for secondary chip display
 */
function getCurrentZoneStations() {
  if (!config) return [];

  if (config.county?.multiZone) {
    const currentZone = config.currentZone;
    const zoneConfig = config.zones?.[currentZone];
    return zoneConfig?.stations || [];
  } else {
    return config.stations || [];
  }
}

/**
 * Fetch current weather conditions
 * Returns Bertie-compatible format: {status: "ok", temperature: 72, wind: "NE at 8 mph", ...}
 */
export async function getCurrentConditions() {
  try {
    await init();

    const dataPath = getDataPath("current.json");
    console.log(`[countyData] Fetching current conditions from: ${dataPath}`);

    const response = await fetch(`${dataPath}?t=${Date.now()}`, {
      headers: { "User-Agent": "NCHurricane.com Weather App/1.0" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch current conditions: ${response.status}`);
    }

    const cacheData = await response.json();

    if (!cacheData.stations) {
      throw new Error("Invalid cache data structure");
    }

    const stationEntries = Object.entries(cacheData.stations);
    const currentZoneStations = getCurrentZoneStations();

    if (stationEntries.length === 0) {
      return {
        status: "error",
        message:
          "Weather data temporarily unavailable. Please check back shortly.",
      };
    }

    const results = [];

    for (const [stationId, stationData] of stationEntries) {
      if (!stationData || !stationData.observation || !stationData.data) {
        console.warn(`[current] Invalid data for station ${stationId}`);
        continue;
      }

      const obsTime = stationData.observation.timestamp;
      const ageMinutes = stationData.observation.age_minutes;
      const isFresh = ageMinutes <= FRESH_MINUTES;

      const stationConfig = currentZoneStations.find((s) => s.id === stationId);

      const result = {
        stationId: stationId,
        stationName: stationData.name || stationId,
        friendlyName:
          stationConfig?.friendlyName || stationData.name || stationId,
        obsTime: obsTime,
        ageMinutes: ageMinutes,
        isFresh: isFresh,
        data: stationData.data,
      };

      results.push(result);
      console.log(
        `[current] Loaded ${stationId}: temp=${stationData.data.temperature}, age=${ageMinutes}min`
      );
    }

    console.log(
      `[current] Successfully loaded ${results.length} stations:`,
      results.map((r) => r.stationId)
    );

    if (results.length === 0) {
      return {
        status: "error",
        message:
          "Weather data temporarily unavailable. Please check back shortly.",
      };
    }

    const currentZone = config.currentZone;
    const zoneConfig = config.zones?.[currentZone];
    const primaryStationId = zoneConfig?.primaryStation;

    let chosen = null;

    if (primaryStationId) {
      const primary = results.find(r => r.stationId === primaryStationId && r.isFresh && r.data.temperature != null);
      if (primary) {
        chosen = primary;
        console.log(`[current] Using primary station: ${primaryStationId}`);
      }
    }

    if (!chosen) {
      const fresh = results.find((r) => r.isFresh && r.data.temperature != null);
      chosen = fresh || results.filter((r) => r.data.temperature != null).sort((a, b) => a.ageMinutes - b.ageMinutes)[0] || results[0];
    }

    const d = chosen.data;

    const windStr =
      d.windSpeed == null || d.windSpeed < 1
        ? "Calm"
        : `${d.windDirection || "--"} at ${d.windSpeed} mph`;

    const visStr = d.visibility == null ? null : `${d.visibility} miles`;

    const secondaries = results
      .filter(
        (r) => r.stationId !== chosen.stationId && r.data.temperature != null
      )
      .map((r) => ({
        id: r.stationId,
        name: r.stationName,
        shortName: shortenStationName(r.friendlyName, r.stationId),
        temperature: r.data.temperature,
        hasIcon: !!r.data.icon,
      }));

    const bgIcon =
      d.icon || results.find((r) => r.data.icon)?.data.icon || null;

    return {
      status: "ok",
      stationId: chosen.stationId,
      stationName: chosen.stationName,
      friendlyName: chosen.friendlyName,
      obsTime: chosen.obsTime,
      ageMinutes: chosen.ageMinutes,
      temperature: d.temperature,
      dewpoint: d.dewpoint,
      humidity: d.humidity,
      pressure: d.pressure,
      wind: windStr,
      windGust: d.windGust ?? d.gust ?? null,
      visibility: visStr,
      conditions: d.conditions || "Sky Conditions Not Reported",
      icon: bgIcon,
      feelsLike: d.feelsLike ?? null,
      heatIndex: d.heatIndex ?? null,
      windChill: d.windChill ?? null,
      secondaries,
    };
  } catch (error) {
    console.error("Error loading current conditions from cache:", error);
    return {
      status: "error",
      message:
        "Weather data temporarily unavailable. Please check back shortly.",
    };
  }
}

/**
 * Fetch forecast data (zone-aware)
 */
export async function getForecast() {
  try {
    await init();
    const dataPath = getDataPath("forecast.json");
    console.log(`[countyData] Fetching forecast from: ${dataPath}`);

    const response = await fetch(`${dataPath}?t=${Date.now()}`, {
      headers: { "User-Agent": "NCHurricane.com Weather App/1.0" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch forecast: ${response.status}`);
    }

    const data = await response.json();
    console.log(
      `[countyData] Loaded ${data.periods?.length || 0} forecast periods`
    );

    return data;
  } catch (error) {
    console.error("[countyData] Error fetching forecast:", error);
    return null;
  }
}

/**
 * Fetch hourly data for meteogram (zone-aware)
 */
export async function getHourlyData() {
  try {
    await init();

    const dataPath = getDataPath("hourly.json");
    console.log(`[countyData] Fetching hourly data from: ${dataPath}`);

    const response = await fetch(`${dataPath}?t=${Date.now()}`, {
      headers: { "User-Agent": "NCHurricane.com Weather App/1.0" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch hourly data: ${response.status}`);
    }

    const data = await response.json();
    console.log(
      `[countyData] Loaded ${data.properties?.periods?.length || 0
      } hourly periods`
    );

    return data;
  } catch (error) {
    console.error("[countyData] Error fetching hourly data:", error);
    return null;
  }
}

/**
 * Fetch active alerts (zone-aware)
 */
export async function getAlerts() {
  try {
    await init();

    const dataPath = getDataPath("alerts.json");
    console.log(`[countyData] Fetching alerts from: ${dataPath}`);

    const response = await fetch(`${dataPath}?t=${Date.now()}`, {
      headers: { "User-Agent": "NCHurricane.com Weather App/1.0" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch alerts: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[countyData] Loaded ${data.alerts?.length || 0} alerts`);

    return {
      status: "ok",
      list: Array.isArray(data.alerts) ? data.alerts : [],
      outlook: data.outlook && typeof data.outlook === "object" ? data.outlook : null,
    };
  } catch (error) {
    console.error("[countyData] Error fetching alerts:", error);
    return { status: "ok", list: [] };
  }
}

/**
 * Fetch Area Forecast Discussion (AFD)
 * Note: AFD is county-wide, not zone-specific
 */
export async function getAFD() {
  try {
    await init();
    const dataPath = "./data/discussion.json";
    console.log(`[countyData] Fetching AFD from: ${dataPath}`);

    const response = await fetch(`${dataPath}?t=${Date.now()}`, {
      headers: { "User-Agent": "NCHurricane.com Weather App/1.0" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch AFD: ${response.status}`);
    }

    const data = await response.json();
    console.log("[countyData] Loaded AFD discussion");

    return {
      status: "ok",
      text: data.text || "",
    };
  } catch (error) {
    console.error("[countyData] Error fetching AFD:", error);
    return { status: "ok", text: "" };
  }
}

/**
 * Get current zone information
 */
export function getCurrentZone() {
  if (!config) return null;

  const currentZone = config.currentZone;
  if (config.county?.multiZone && config.zones?.[currentZone]) {
    return {
      id: currentZone,
      displayName: config.zones[currentZone].displayName,
      city: config.zones[currentZone].city,
      forecastZone: config.zones[currentZone].forecast,
    };
  }

  return {
    id: "single",
    displayName: config.county.name,
    city: config.location?.city || config.county.name,
    forecastZone: config.zones?.forecast,
  };
}

/**
 * Get all available zones (for zone selector)
 */
export function getAvailableZones() {
  if (!config || !config.county?.multiZone) return [];

  return Object.entries(config.zones || {}).map(([id, zone]) => ({
    id,
    displayName: zone.displayName,
    city: zone.city,
  }));
}

/**
 * Switch to a different zone
 */
export function switchZone(zoneId) {
  if (!config || !config.county?.multiZone) {
    console.warn("[countyData] Cannot switch zones on single-zone county");
    return false;
  }

  if (!config.zones?.[zoneId]) {
    console.error(`[countyData] Invalid zone: ${zoneId}`);
    return false;
  }

  config.currentZone = zoneId;

  localStorage.setItem("selectedZone", zoneId);

  const url = new URL(window.location);
  url.searchParams.set("zone", zoneId);
  window.history.replaceState({}, "", url);

  console.log(`[countyData] Switched to zone: ${zoneId}`);
  return true;
}
