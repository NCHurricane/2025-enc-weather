// =======================
// Beaufort County, NC Page Builder - countyApp.js
// Builds the front-end UI for Beaufort County, NC weather page.
//
// Single-zone county:
// - Beaufort County, NC (zone: NCZ020)
// - Beaufort County, NC (zone: NCC013)
// 
// - Template with comments left in for clarity
// ========================

// Alert Colors and Priorities
const warningColors = {
  "Tsunami Warning": "#FD6347",
  "Tornado Warning": "#FF0000",
  "Extreme Wind Warning": "#FF8C00",
  "Severe Thunderstorm Warning": "#FFA500",
  "Flash Flood Warning": "#8B0000",
  "Flash Flood Statement": "#8B0000",
  "Severe Weather Statement": "#00FFFF",
  "Shelter In Place Warning": "#FA8072",
  "Evacuation Immediate": "#7FFF00",
  "Civil Danger Warning": "#FFB6C1",
  "Nuclear Power Plant Warning": "#4B0082",
  "Radiological Hazard Warning": "#4B0082",
  "Hazardous Materials Warning": "#4B0082",
  "Fire Warning": "#A0522D",
  "Civil Emergency Message": "#FFB6C1",
  "Law Enforcement Warning": "#C0C0C0",
  "Storm Surge Warning": "#B524F7",
  "Hurricane Force Wind Warning": "#CD5C5C",
  "Hurricane Warning": "#DC143C",
  "Typhoon Warning": "#DC143C",
  "Special Marine Warning": "#FFA500",
  "Blizzard Warning": "#FF4500",
  "Snow Squall Warning": "#C71585",
  "Ice Storm Warning": "#8B008B",
  "Heavy Freezing Spray Warning": "#00BFFF",
  "Winter Storm Warning": "#FF69B4",
  "Lake Effect Snow Warning": "#008B8B",
  "Dust Storm Warning": "#FFE4C4",
  "Blowing Dust Warning": "#FFE4C4",
  "High Wind Warning": "#DAA520",
  "Tropical Storm Warning": "#B22222",
  "Storm Warning": "#9400D3",
  "Tsunami Advisory": "#D2691E",
  "Tsunami Watch": "#FF00FF",
  "Avalanche Warning": "#1E90FF",
  "Earthquake Warning": "#8B4513",
  "Volcano Warning": "#2F4F4F",
  "Ashfall Warning": "#A9A9A9",
  "Flood Warning": "#00FF00",
  "Coastal Flood Warning": "#228B22",
  "Lakeshore Flood Warning": "#228B22",
  "Ashfall Advisory": "#696969",
  "High Surf Warning": "#228B22",
  "Extreme Heat Warning": "#C71585",
  "Tornado Watch": "#FFFF00",
  "Severe Thunderstorm Watch": "#DB7093",
  "Flash Flood Watch": "#2E8B57",
  "Gale Warning": "#DDA0DD",
  "Flood Statement": "#00FF00",
  "Extreme Cold Warning": "#0000FF",
  "Freeze Warning": "#483D8B",
  "Red Flag Warning": "#FF1493",
  "Storm Surge Watch": "#DB7FF7",
  "Hurricane Watch": "#FF00FF",
  "Hurricane Force Wind Watch": "#9932CC",
  "Typhoon Watch": "#FF00FF",
  "Tropical Storm Watch": "#F08080",
  "Storm Watch": "#FFE4B5",
  "Tropical Cyclone Local Statement": "#FFE4B5",
  "Winter Weather Advisory": "#7B68EE",
  "Avalanche Advisory": "#CD853F",
  "Cold Weather Advisory": "#AFEEEE",
  "Heat Advisory": "#FF7F50",
  "Flood Advisory": "#00FF7F",
  "Coastal Flood Advisory": "#7CFC00",
  "Lakeshore Flood Advisory": "#7CFC00",
  "High Surf Advisory": "#BA55D3",
  "Dense Fog Advisory": "#708090",
  "Dense Smoke Advisory": "#F0E68C",
  "Small Craft Advisory": "#D8BFD8",
  "Brisk Wind Advisory": "#D8BFD8",
  "Hazardous Seas Warning": "#D8BFD8",
  "Dust Advisory": "#BDB76B",
  "Blowing Dust Advisory": "#BDB76B",
  "Lake Wind Advisory": "#D2B48C",
  "Wind Advisory": "#D2B48C",
  "Frost Advisory": "#6495ED",
  "Freezing Fog Advisory": "#008080",
  "Freezing Spray Advisory": "#00BFFF",
  "Low Water Advisory": "#A52A2A",
  "Local Area Emergency": "#C0C0C0",
  "Winter Storm Watch": "#4682B4",
  "Rip Current Statement": "#40E0D0",
  "Beach Hazards Statement": "#40E0D0",
  "Gale Watch": "#FFC0CB",
  "Avalanche Watch": "#F4A460",
  "Hazardous Seas Watch": "#483D8B",
  "Heavy Freezing Spray Watch": "#BC8F8F",
  "Flood Watch": "#2E8B57",
  "Coastal Flood Watch": "#66CDAA",
  "Lakeshore Flood Watch": "#66CDAA",
  "High Wind Watch": "#B8860B",
  "Extreme Heat Watch": "#800000",
  "Extreme Cold Watch": "#5F9EA0",
  "Freeze Watch": "#00FFFF",
  "Fire Weather Watch": "#FFDEAD",
  "Extreme Fire Danger": "#E9967A",
  "911 Telephone Outage": "#C0C0C0",
  "Coastal Flood Statement": "#6B8E23",
  "Lakeshore Flood Statement": "#6B8E23",
  "Special Weather Statement": "#FFE4B5",
  "Marine Weather Statement": "#FFDAB9",
  "Air Quality Alert": "#808080",
  "Air Stagnation Advisory": "#808080",
  "Hazardous Weather Outlook": "#EEE8AA",
  "Hydrologic Outlook": "#90EE90",
  "Short Term Forecast": "#98FB98",
  "Administrative Message": "#C0C0C0",
  "Test": "#F0FFFF",
  "Child Abduction Emergency": "#FFFFFF",
  "Blue Alert": "#FFFFFF"
};

const warningPriorities = {
  "Tsunami Warning": 1,
  "Tornado Warning": 2,
  "Extreme Wind Warning": 3,
  "Severe Thunderstorm Warning": 4,
  "Flash Flood Warning": 5,
  "Flash Flood Statement": 6,
  "Severe Weather Statement": 7,
  "Shelter In Place Warning": 8,
  "Evacuation Immediate": 9,
  "Civil Danger Warning": 10,
  "Nuclear Power Plant Warning": 11,
  "Radiological Hazard Warning": 12,
  "Hazardous Materials Warning": 13,
  "Fire Warning": 14,
  "Civil Emergency Message": 15,
  "Law Enforcement Warning": 16,
  "Storm Surge Warning": 17,
  "Hurricane Force Wind Warning": 18,
  "Hurricane Warning": 19,
  "Typhoon Warning": 20,
  "Special Marine Warning": 21,
  "Blizzard Warning": 22,
  "Snow Squall Warning": 23,
  "Ice Storm Warning": 24,
  "Heavy Freezing Spray Warning": 25,
  "Winter Storm Warning": 26,
  "Lake Effect Snow Warning": 27,
  "Dust Storm Warning": 28,
  "Blowing Dust Warning": 29,
  "High Wind Warning": 30,
  "Tropical Storm Warning": 31,
  "Storm Warning": 32,
  "Tsunami Advisory": 33,
  "Tsunami Watch": 34,
  "Avalanche Warning": 35,
  "Earthquake Warning": 36,
  "Volcano Warning": 37,
  "Ashfall Warning": 38,
  "Flood Warning": 39,
  "Coastal Flood Warning": 40,
  "Lakeshore Flood Warning": 41,
  "Ashfall Advisory": 42,
  "High Surf Warning": 43,
  "Extreme Heat Warning": 44,
  "Tornado Watch": 45,
  "Severe Thunderstorm Watch": 46,
  "Flash Flood Watch": 47,
  "Gale Warning": 48,
  "Flood Statement": 49,
  "Extreme Cold Warning": 50,
  "Freeze Warning": 51,
  "Red Flag Warning": 52,
  "Storm Surge Watch": 53,
  "Hurricane Watch": 54,
  "Hurricane Force Wind Watch": 55,
  "Typhoon Watch": 56,
  "Tropical Storm Watch": 57,
  "Storm Watch": 58,
  "Tropical Cyclone Local Statement": 59,
  "Winter Weather Advisory": 60,
  "Avalanche Advisory": 61,
  "Cold Weather Advisory": 62,
  "Heat Advisory": 63,
  "Flood Advisory": 64,
  "Coastal Flood Advisory": 65,
  "Lakeshore Flood Advisory": 66,
  "High Surf Advisory": 67,
  "Dense Fog Advisory": 68,
  "Dense Smoke Advisory": 69,
  "Small Craft Advisory": 70,
  "Brisk Wind Advisory": 71,
  "Hazardous Seas Warning": 72,
  "Dust Advisory": 73,
  "Blowing Dust Advisory": 74,
  "Lake Wind Advisory": 75,
  "Wind Advisory": 76,
  "Frost Advisory": 77,
  "Freezing Fog Advisory": 78,
  "Freezing Spray Advisory": 79,
  "Low Water Advisory": 80,
  "Local Area Emergency": 81,
  "Winter Storm Watch": 82,
  "Rip Current Statement": 83,
  "Beach Hazards Statement": 84,
  "Gale Watch": 85,
  "Avalanche Watch": 86,
  "Hazardous Seas Watch": 87,
  "Heavy Freezing Spray Watch": 88,
  "Flood Watch": 89,
  "Coastal Flood Watch": 90,
  "Lakeshore Flood Watch": 91,
  "High Wind Watch": 92,
  "Extreme Heat Watch": 93,
  "Extreme Cold Watch": 94,
  "Freeze Watch": 95,
  "Fire Weather Watch": 96,
  "Extreme Fire Danger": 97,
  "911 Telephone Outage": 98,
  "Coastal Flood Statement": 99,
  "Lakeshore Flood Statement": 100,
  "Special Weather Statement": 101,
  "Marine Weather Statement": 102,
  "Air Quality Alert": 103,
  "Air Stagnation Advisory": 104,
  "Hazardous Weather Outlook": 105,
  "Hydrologic Outlook": 106,
  "Short Term Forecast": 107,
  "Administrative Message": 108,
  "Test": 109,
  "Child Abduction Emergency": 110,
  "Blue Alert": 111
};

import {
  init,
  getCurrentConditions,
  getForecast,
  getHourlyData,
  getAlerts,
  getAFD,
} from "./countyData.js";
import { initMeteogram } from './meteogram.js';

let stationUrls = {};

const SEL = {
  wrap: "#current-container",
  chips: "#other-stations",
  current: {
    temp: "#current-temp",
    desc: "#current-desc",
    wind: "#current-wind",
    dew: "#current-dewpoint",
    rh: "#current-humidity",
    pres: "#current-pressure",
    vis: "#current-visibility",
    heat: "#current-heat-index",
    chill: "#current-wind-chill",
    loc: "#current-location",
    obs: "#current-obs-time",
  },
  forecast: { container: "#forecast", detailed: "#detailed-forecast" },
  alerts: { container: "#alerts" },
  afd: { container: "#afd-content" },
};

function $(sel) {
  return document.querySelector(sel);
}
function setText(sel, text) {
  const el = $(sel);
  if (el) el.textContent = text;
}
function setHTML(sel, html) {
  const el = $(sel);
  if (el) el.innerHTML = html;
}
function fmtF(v) {
  return v == null ? "N/A" : `${Math.round(v)}°`;
}
function fmtPct(v) {
  return v == null ? "N/A" : `${Math.round(v)}%`;
}
function fmtMb(v) {
  return v == null ? "N/A" : `${Number(v).toFixed(1)} mb`;
}
function fmtTimeLocal(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function ensureChipsContainer() {
  let c = $("#other-stations");
  return c;
}

function ensureWeatherIcon() {
  let icon = $("#weather-icon");
  if (!icon) {
    const wrap = $("#weather-background");
    if (!wrap) return null;
    icon = document.createElement("div");
    icon.id = "weather-icon";
    icon.className = "weather-icon";
    wrap.appendChild(icon);
  }
  return icon;
}

async function loadStationUrls() {
  try {
    const configResponse = await fetch('./data/config.json?v=' + Date.now(), { cache: 'no-store' });
    if (!configResponse.ok) {
      throw new Error(`Failed to load config: ${configResponse.status}`);
    }

    const config = await configResponse.json();
    const stations = config.stations || [];

    stations.forEach(station => {
      if (station.id && station.url) {
        stationUrls[station.id] = station.url;
      }
    });

    console.log('Loaded station URLs for', Object.keys(stationUrls).length, 'stations');
  } catch (error) {
    console.warn('Failed to load station URLs:', error);
  }
}

function getStationUrl(stationId) {
  return stationUrls[stationId] || "#";
}

async function renderCurrent() {
  const cur = await getCurrentConditions();
  if (!cur || cur.status !== "ok") {
    setText(
      SEL.current.desc,
      "Weather data temporarily unavailable. Please check back shortly."
    );
    return;
  }

  const iconOverlay = ensureWeatherIcon();
  if (iconOverlay && cur.icon) {
    iconOverlay.style.backgroundImage = `url(${cur.icon})`;
    iconOverlay.style.display = "block";
  } else if (iconOverlay) {
    iconOverlay.style.display = "none";
  }

  setText(SEL.current.temp, fmtF(cur.temperature));
  setText(SEL.current.desc, cur.conditions ?? "N/A");
  setHTML(
    SEL.current.wind,
    cur.wind
      ? `Wind: <span class="value">${cur.wind}</span>`
      : 'Wind: <i class="fa-solid fa-circle-question"></i>'
  );
  setHTML(
    SEL.current.dew,
    cur.dewpoint != null
      ? `Dewpoint: <span class="value">${cur.dewpoint}°</span>`
      : 'Dewpoint: <i class="fa-solid fa-circle-question"></i>'
  );
  setHTML(
    SEL.current.rh,
    cur.humidity != null
      ? `Humidity: <span class="value">${cur.humidity}%</span>`
      : 'Humidity: <i class="fa-solid fa-circle-question"></i>'
  );
  setHTML(
    SEL.current.pres,
    cur.pressure != null
      ? `Pressure: <span class="value">${cur.pressure} mb</span>`
      : 'Pressure: <i class="fa-solid fa-circle-question"></i>'
  );
  setHTML(
    SEL.current.vis,
    cur.visibility != null
      ? `Visibility: <span class="value">${cur.visibility}</span>`
      : 'Visibility: <i class="fa-solid fa-circle-question"></i>'
  );
  setHTML(
    SEL.current.heat,
    cur.heatIndex != null
      ? `Heat Index: <span class="value">${fmtF(cur.heatIndex)}</span>`
      : ""
  );
  setHTML(
    SEL.current.chill,
    cur.windChill != null
      ? `Wind Chill: <span class="value">${fmtF(cur.windChill)}</span>`
      : ""
  );
  setHTML(
    SEL.current.loc,
    cur.stationName
      ? `Data from: <span class="place">${cur.friendlyName}</span>`
      : 'Data from: <i class="fa-solid fa-circle-question"></i>'
  );
  setHTML(
    SEL.current.obs,
    cur.obsTime
      ? `Last Updated: <span class="place">${fmtTimeLocal(cur.obsTime)}</span>`
      : 'Last Updated: <i class="fa-solid fa-circle-question"></i>'
  );

  const chipsC = ensureChipsContainer();
  if (chipsC) {
    const secs = Array.isArray(cur.secondaries) ? cur.secondaries : [];
    if (secs.length === 0) {
      chipsC.innerHTML = "";
    } else {
      const chips = secs
        .map((s) => {
          const nm = s.shortName || s.name || s.id;
          const tv =
            s.temperature == null ? "N/A" : `${Math.round(s.temperature)}°F`;
          const url = getStationUrl(s.id);

          if (url === "#") {
            return `<div class="station-chip">
              <span class="chip-name">${nm}</span>
              <span class="chip-temp">${tv}</span>
            </div>`;
          } else {
            return `<div class="station-chip" onclick="window.open('${url}', '_blank')" style="cursor: pointer;">
              <span class="chip-name">${nm}</span>
              <span class="chip-temp">${tv}</span>
            </div>`;
          }
        })
        .join("");

      const html = `
        <div class="other-content">
          ${chips}
        </div>
      `;
      chipsC.innerHTML = html;
    }
  }
}

async function renderForecast() {
  try {
    const fc = await getForecast();
    const periods = Array.isArray(fc?.periods) ? fc.periods : [];

    if (!periods.length) {
      setHTML(SEL.forecast.container, '<p>Forecast temporarily unavailable.</p>');
      setHTML(SEL.forecast.detailed, '<div class="detailed-item">Detailed forecast temporarily unavailable.</div>');
      return;
    }

    const cards = periods.map(p => {
      const temp = p?.temperature;
      const tempUnit = p?.temperatureUnit || 'F';
      const isDaytime = p?.isDaytime;

      const tempColor = isDaytime ? '#d50000' : '#1976d2'; // Red for day, blue for night

      const tempDisplay = temp != null
        ? `<span class="value" style="color: ${tempColor};">${Math.round(temp)}°</span>`
        : `<span class="value">N/A</span>`;

      const dayName = p?.name || 'N/A';
      const shortForecast = p?.shortForecast || 'N/A';
      const iconSrc = p?.icon || '';
      const iconAlt = shortForecast;

      return `
        <div class="forecast-item">
          <div class="forecast-cell forecast-day">${dayName}</div>
          <div class="forecast-cell forecast-icon">
            ${iconSrc ? `<img src="${iconSrc}" alt="${iconAlt}">` : ''}
          </div>
          <div class="forecast-cell forecast-temp">${tempDisplay}</div>
        </div>
      `;
    }).join('');

    setHTML(SEL.forecast.container, cards);

    await renderDetailedForecast();

  } catch (e) {
    console.warn('[countyApp] forecast load failed', e);
    setHTML(SEL.forecast.container, '<p>Forecast temporarily unavailable.</p>');
    setHTML(SEL.forecast.detailed, '<div class="detailed-item">Detailed forecast temporarily unavailable.</div>');
  }
}

async function renderDetailedForecast() {
  try {
    const fc = await getForecast();
    const periods = Array.isArray(fc?.periods) ? fc.periods : [];

    if (!periods.length) {
      setHTML(SEL.forecast.detailed, '<div class="detailed-item">Detailed forecast temporarily unavailable.</div>');
      return;
    }

    const detailedItems = periods.map(p => {
      const isDaytime = p?.isDaytime;

      const dayColor = isDaytime ? '#d50000' : '#1976d2'; // Red for day, blue for night

      const dayName = p?.name || 'N/A';
      const detailedText = p?.detailedForecast || p?.shortForecast || 'No forecast details available.';
      const iconSrc = p?.icon || '';
      const iconAlt = p?.shortForecast || 'Weather icon';

      const dayDisplay = `<span class="value" style="color: ${dayColor};">${dayName}</span>`;

      return `
        <div class="detailed-item">
          <div class="detailed-row">
            <div class="detailed-col-day">
              <div class="detailed-day">${dayDisplay}</div>
            </div>
            <div class="detailed-col-icon">
              <div class="detailed-icon">
                ${iconSrc ? `<img src="${iconSrc}" alt="${iconAlt}">` : '<span class="value">No Icon</span>'}
              </div>
            </div>
            <div class="detailed-col-forecast">
              <div class="detailed-forecast">${detailedText}</div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    setHTML(SEL.forecast.detailed, detailedItems);

  } catch (e) {
    console.warn('[countyApp] detailed forecast load failed', e);
    setHTML(SEL.forecast.detailed, '<div class="detailed-item">Detailed forecast temporarily unavailable.</div>');
  }
}

async function renderAlerts() {
  try {
    const a = await getAlerts();
    if (!a || a.status !== "ok") {
      setHTML(SEL.alerts.container, "");
      return;
    }
    let list = Array.isArray(a.list) ? a.list : [];

    if (list.length === 0) {
      setHTML(
        SEL.alerts.container,
        `
        <div class="alert" style="background-color: #dc3545;">
          <div class="alert-none">
            <i class="fa-sharp-duotone fa-solid fa-triangle-exclamation fa-xl fontawesome-icon"></i>
            <b>NO ACTIVE ALERTS</b>
          </div>
        </div>
      `
      );
      return;
    }

    const sortedAlerts = list.sort((a, b) => {
      const eventA = a.event || a.type || a.headline || "Unknown";
      const eventB = b.event || b.type || b.headline || "Unknown";
      const priorityA = warningPriorities[eventA] || 999;
      const priorityB = warningPriorities[eventB] || 999;
      return priorityA - priorityB;
    });

    const alertsHTML = sortedAlerts
      .map((alert, index) => {
        const eventName = alert.event || alert.type || alert.headline || "Alert";
        const description = alert.description || alert.summary || "";

        const alertColor = warningColors[eventName] || "#dc3545";

        const priority = warningPriorities[eventName] || 999;
        const borderWidth = priority <= 10 ? "4px" : priority <= 50 ? "2px" : "1px";

        const expiresInline = alert.expires ? `<br /> until ${fmtTimeLocal(alert.expires)}` : "";

        return `
        <div class="alert" style="background-color: ${alertColor}; border: ${borderWidth} solid ${alertColor}; border-radius: var(--border-radius); margin: 3px 0;">
          <input type="checkbox" id="alert-${index}" class="alert-toggle">
          <label for="alert-${index}" class="alert-title">
            
            ${eventName}${expiresInline}
          </label>
          <div class="alert-details">
            <p>${description}</p>
          </div>
        </div>
      `;
      })
      .join("");

    setHTML(SEL.alerts.container, alertsHTML);

    console.log(
      "Alerts sorted by priority:",
      sortedAlerts.map((a) => ({
        event: a.event || a.type || a.headline,
        priority: warningPriorities[a.event || a.type || a.headline] || 999,
      }))
    );
  } catch (e) {
    console.warn("[countyApp] alerts load failed", e);
  }
}

async function renderAFD() {
  try {
    const afd = await getAFD();
    const txt = afd?.text || "";
    if (txt) {
      setHTML(
        SEL.afd.container,
        `<pre class="afd-text">${txt.replace(
          /[&<>]/g,
          (s) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[s])
        )}</pre>`
      );
    }
  } catch (e) {
    console.warn("[countyApp] AFD load failed", e);
  }
}

async function loadAll() {
  try {
    await init();
    await loadStationUrls();
  } catch (e) {
    console.warn('[countyApp] init failed (non-fatal)', e);
  }
  await renderCurrent();
  await renderForecast();

  try {
    await getHourlyData();

    if (document.getElementById('meteogram-chart-container')) {
      await initMeteogram();
    }
  } catch (e) {
    console.warn('[countyApp] hourly/meteogram load failed (non-fatal)', e);
  }

  await renderAlerts();
  await renderAFD();
}

export async function initializePage() {
  try {
    await loadAll();
  } catch (e) {
    console.error("[countyApp] initialize failed", e);
  }
}

initializePage();