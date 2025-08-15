// counties/bertie/js/countyApp.js
// UPDATED: Fix background icon display for current-container

import {
  init,
  getCurrentConditions,
  getForecast,
  getHourlyData,
  getAlerts,
  getAFD,
} from "./countyData.js";

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

async function renderCurrent() {
  const cur = await getCurrentConditions();
  if (!cur || cur.status !== "ok") {
    setText(
      SEL.current.desc,
      "Weather data temporarily unavailable. Please check back shortly."
    );
    return;
  }

  // Handle weather icon as overlay (preserves county background image)
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
      ? `Dewpoint: <span class="value">${cur.dewpoint} °</span>`
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

  function getStationUrl(stationId) {
    const urls = {
      KEDE: "https://forecast.weather.gov/data/obhistory/KEDE.html",
      WNRN7: "https://www.weather.gov/wrh/LowTimeseries?site=wnrn7",
      GCRN7: "https://www.weather.gov/wrh/LowTimeseries?site=gcrn7",
    };
    return urls[stationId] || "#";
  }

  // Secondary station chips (location + temperature)
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
          return `<div class="station-chip" onclick="window.open('${url}', '_blank')" style="cursor: pointer;">
            <span class="chip-name">${nm}</span>
            <span class="chip-temp">${tv}</span>
          </div>`;
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
      setHTML(
        SEL.forecast.container,
        "<p>Forecast temporarily unavailable.</p>"
      );
      return;
    }
    const cards = periods
      .slice(0, 5)
      .map((p) => {
        const t =
          p?.temperature != null
            ? `${p.temperature}°${p.temperatureUnit || "F"}`
            : "—";
        return `<div class="forecast-card">
        <div class="fc-name">${p?.name || "—"}</div>
        <div class="fc-short">${p?.shortForecast || "—"}</div>
        <div class="fc-temp">${t}</div>
      </div>`;
      })
      .join("");
    setHTML(SEL.forecast.container, cards);

    const details = periods
      .slice(0, 6)
      .map(
        (p) =>
          `<p><strong>${p?.name || "—"}:</strong> ${
            p?.detailedForecast || p?.shortForecast || ""
          }</p>`
      )
      .join("");
    setHTML(SEL.forecast.detailed, details);
  } catch (e) {
    console.warn("[countyApp] forecast load failed", e);
    setHTML(SEL.forecast.container, "<p>Forecast temporarily unavailable.</p>");
  }
}

async function renderAlerts() {
  try {
    const a = await getAlerts();
    if (!a || a.status !== "ok") {
      setHTML(SEL.alerts.container, "");
      return;
    }
    const list = Array.isArray(a.list) ? a.list : [];
    if (list.length === 0) {
      setHTML(SEL.alerts.container, "<p>No active alerts</p>");
      return;
    }
    const items = list
      .map((x) => {
        const h = x.headline || x.event || x.type || "Alert";
        const sev = x.severity ? `<strong>${x.severity}</strong> — ` : "";
        return `<li>${sev}${h}</li>`;
      })
      .join("");
    setHTML(SEL.alerts.container, `<ul class="alerts-list">${items}</ul>`);
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
  } catch (e) {
    console.warn("[countyApp] init failed (non-fatal)", e);
  }
  await renderCurrent();
  await renderForecast();
  try {
    await getHourlyData();
  } catch (e) {
    console.warn("[countyApp] hourly load failed (non-fatal)", e);
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
