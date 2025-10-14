// ==============================
// Active Storm Page Cache Reader - active/js/storm.js
// Reads advisory.json and storm.json from cache and renders the data to the page.
//
// Products Rendered:
// - Dynamic Page Title and Header
// - Storm Overview Section (v2)
// - Floater Satellite Imagery (if satellite.js loaded)
// - Text Products (if storm_text.js loaded)
// - Storm Graphics (if storm-graphics.js loaded)
// - - 3 and 5-day forecast tracks
// - - Current Wind Field
// - - Wind History
// - - Earliest Reasonable Arrival of 34kt Winds
// - - Earliest Likely Arrival of 34kt Winds
// - - Current Wind Speed Probabilities
// - - - (0 to 60 hours for 34kt, 50kt, and 64kt winds)
// - Wind Radii Compass (if radii data present)
// - Wind Analysis from MTCSWA / OSHO
// - Storm Surge Graphics (if surge data present)
// - Peak Storm Surge Graphic (if issued)
// - Day 1-2 QPF Graphic (if issued)
// - QPF International Forecast Graphic (if issued)
// - WPC Excessive Rainfall Outlook (if issued)
// ==============================


import { initStormGraphics } from './storm-graphics.js';
import { RadiiVisualization } from './radii-visualization.js';

const CONFIG = {
  STORMS_ROOT: "./storms",
};

const $ = (sel) => document.querySelector(sel);
const els = {
  title: $("#storm-title"),
  stormId: $("#storm-id"),
  overview: document.getElementById("overview-v2"),

  radiiTable: $("#radii-table"),
};

function getStormParam() {
  const p = new URLSearchParams(location.search);
  return (p.get("storm") || "").trim();
}

function showBannerOnly() {
  [
    ".storm-header-container",
    ".radii-container",
    ".hazards-container",
    ".graphics-container",
    ".text-products-container",
  ].forEach((sel) => {
    const el = document.querySelector(sel);
    if (el) el.hidden = true;
  });
}

function isValidLongId(id) {
  return /^(?:AL|EP)\d{2}\d{4}$/.test(id);
}

async function getJson(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const raw = await res.text();
    const t = raw.replace(/^\uFEFF/, "").trim();
    return JSON.parse(t);
  } catch {
    console.warn("getJson failed:", url);
    return null;
  }
}

async function loadAdvisoryCache(longId) {
  const url = `${CONFIG.STORMS_ROOT}/${encodeURIComponent(
    longId
  )}/advisory.json?${Date.now()}`;
  return await getJson(url);
}

async function loadRadiiCache(longId) {
  const url = `${CONFIG.STORMS_ROOT}/${encodeURIComponent(
    longId
  )}/storm.json?${Date.now()}`;
  return await getJson(url);
}

function fmtTripletSlash(tri) {
  const mph = tri?.mph ?? null,
    kts = tri?.kts ?? null;
  // kph removed completely

  const out = [];
  if (mph != null) out.push(`${mph} mph`);
  if (kts != null) out.push(`${kts} kt`);
  // skip kph
  return out.length ? out.join(" / ") : "—";
}

function formatUtcShort(ts) {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return (
    d
      .toLocaleString("en-US", {
        timeZone: "UTC",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .replace(",", "") + " UTC"
  );
}


if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      init();
    },
    { once: true }
  );
} else {
  init();
}

const toNA = (v) =>
  v == null ||
    String(v).trim() === "" ||
    String(v).trim().toUpperCase() === "N/A"
    ? "—"
    : v;

function createInfoLine(label, value, options = {}) {
  const { className = "", wrapValue = true, fullWidth = false } = options;
  const labelSpan = label ? `<span class="ov-label">${label}</span>` : "";
  const valueContent = wrapValue
    ? `<span class="ov-value">${value}</span>`
    : value;
  const rowClass = `ov-info-line ${className}`.trim();
  const gridClass = fullWidth ? "ov-full-width" : "";

  return `<div id="ov-${label.toLowerCase().replace(/[^a-z]/g, "") || "custom"
    }" class="${rowClass} ${gridClass}">${labelSpan}${valueContent}</div>`;
}

function createHeaderLine(content, className = "") {
  return `<div class="ov-header-line ${className}">${content}</div>`;
}

function renderOverviewV2(advisory, longId) {
  if (!els.overview) return;

  const sysType = (advisory?.systemType || "—").toString();
  const sysName = (advisory?.systemName || "—").toString();
  const atcfID = (advisory?.atcfID || longId || "").toString().toUpperCase();

  const toKey = (s) =>
    String(s)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  function createInfoLine(label, value, key) {
    const k = key || toKey(label);
    const safeValue = value == null || value === "" ? "—" : value;
    const hasLabel = !!String(label).trim();

    if (!hasLabel) {
      return `
      <div class="ov-info-line no-label" data-key="${k}">
        <span class="ov-value">${safeValue}</span>
      </div>
    `;
    }

    return `
    <div class="ov-info-line" data-key="${k}">
      <span class="ov-label">${label}</span>
      <span class="ov-value">${safeValue}</span>
    </div>
  `;
  }

  function normalizeDirText(raw) {
    const s = (raw || "").trim();
    if (!s) return "";

    const m = s.match(/^([NSEW]{1,3})\b(.*)$/i);
    if (!m) return s;

    const cardinal = m[1].toUpperCase();
    const rest = m[2].toLowerCase();
    return `${cardinal}${rest}`;
  }

  function inlineKV(label, value, key) {
    const v =
      value == null || value === "" || value === "—" ? "—" : String(value);
    if (v === "—") return "";
    return `<span class="ov-inline" data-key="${key}">
            <span class="ov-label">${label}</span>
            <span class="ov-value">${v}</span>
          </span>`;
  }

  const titleText = `${(sysType + " " + sysName).toUpperCase()}`;
  if (els.title) els.title.textContent = titleText;
  els.stormId.textContent = atcfID ? ` — ${atcfID}` : "";

  const msgType = toNA(advisory?.messageType);
  const advNum = toNA(advisory?.advisoryNumber);
  const localStr = toNA(advisory?.messageTimeLocal);
  const utcStr = advisory?.messageTimeUTC_formatted || "—";
  const issued =
    localStr !== "—" && utcStr !== "—"
      ? `${localStr} (${utcStr})`
      : localStr !== "—"
        ? localStr
        : utcStr;

  const catRaw = advisory?.systemSaffirSimpsonCategory;
  const showCategory = String(
    advisory?.systemSaffirSimpsonCategory ?? ""
  ).trim();

  const loc =
    advisory?.loc && (advisory.loc.latText || advisory.loc.lonText)
      ? `${advisory.loc.latText || ""} ${advisory.loc.lonText || ""}`.trim()
      : "—";

  const maxWind = advisory?.intensity
    ? fmtTripletSlash(advisory.intensity)
    : "—";
  const pressure =
    typeof advisory?.intensity?.mb === "number"
      ? `${advisory.intensity.mb} mb`
      : "—";
  const directionRaw = advisory?.motion?.direction || "";
  const direction = normalizeDirText(directionRaw);

  const speed = advisory?.motion?.speed
    ? fmtTripletSlash(advisory.motion.speed)
    : "—";

  const nameUpper = sysName ? sysName.toUpperCase() : "";
  const geo1 = toNA(advisory?.geo?.[0]);
  const geo2 = toNA(advisory?.geo?.[1]);

  const messageWithAdv = `<span class="message-type-text">${msgType}</span> ${inlineKV(
    "#",
    advNum,
    "advisory-number"
  )}`.trim();

  const lines = [
    createInfoLine("", messageWithAdv, "message-type", { wrapValue: false }),
    createInfoLine("Issued:", issued, "issued"),
    createInfoLine("Location:", loc, "location"),
    createInfoLine("Max Sustained Winds:", maxWind, "max-wind"),
    createInfoLine("Min Central Pressure:", pressure, "min-pressure"),
    createInfoLine("Movement:", direction, "direction"),
    createInfoLine("Forward Speed:", speed, "speed"),
  ];

  const catText = String(advisory?.systemSaffirSimpsonCategory ?? "").trim();
  if (catText && catText.toLowerCase() !== "n/a") {
    lines.unshift(createInfoLine("", catText, "category"));
  }


  // Calculate NHC graphics link
  function getNHCLink(longId) {
    const basin = longId.slice(0, 2);
    const stormNum = parseInt(longId.slice(2, 4), 10);
    if (!['AL', 'EP'].includes(basin) || isNaN(stormNum)) return null;
    const n = ((stormNum - 1) % 5) + 1;
    const url = basin === 'AL'
      ? `https://www.nhc.noaa.gov/graphics_at${n}.shtml?start#contents`
      : `https://www.nhc.noaa.gov/graphics_ep${n}.shtml?start#contents`;
    return url;
  }

  const nhcLinkUrl = getNHCLink(longId);
  const nhcLinkHtml = nhcLinkUrl
    ? `<a href="${nhcLinkUrl}" class="nhc-link-btn" target="_blank" rel="noopener">Go to the system's NHC Page</a>`
    : "";

  const centerSection = `
    <div class="ov-center-section">
      <div class="ov-center-content">
        <span class="ov-center-title">${nameUpper || "this system"}'s Center is:</span><br>
        <span class="ov-geo-point">${geo1}</span>
        ${geo2 && geo2 !== '—' ? `<br>and<br><span class="ov-geo-point">${geo2}</span>` : ''}
      </div>
    </div>
  `;

  const nhcLinkBlock = nhcLinkHtml ? `<div class="ov-nhc-link-block">${nhcLinkHtml}</div>` : "";

  let nhcHeadlinesBlock = '';
  if (Array.isArray(advisory?.headlines) && advisory.headlines.length > 0) {
    nhcHeadlinesBlock = `
      <div class="ov-headlines-block" data-key="nhc-headlines-block">
        <div class="ov-headlines-content">
          ${advisory.headlines.map(l => `<div class="ov-headline-line">${l}</div>`).join('')}
        </div>
      </div>
    `;
  }

  let linesWithHeadlines = [];
  if (lines.length > 0) {
    linesWithHeadlines.push(lines[0]);
    if (nhcHeadlinesBlock) linesWithHeadlines.push(nhcHeadlinesBlock);
    for (let i = 1; i < lines.length; ++i) {
      linesWithHeadlines.push(lines[i]);
    }
  }

  const html = `
    <div class="overview-v2">
      ${linesWithHeadlines.join("")}
      ${centerSection}
      ${nhcLinkBlock}
    </div>
  `;

  els.overview.innerHTML = html;

  els.overview.querySelectorAll(".ov-value").forEach((node) => {
    if (node.textContent === "—") {
      node.innerHTML = `<i class="fa-solid fa-circle-question" aria-hidden="true"></i><span class="sr-only">Not available</span>&nbsp;N/A`;
    }
  });
}

async function init() {
  const raw = getStormParam();
  if (!raw) {
    window.location.href = "/404.html";
    return;
  }

  const longId = raw.toUpperCase();
  if (!isValidLongId(longId)) {
    window.location.href = "/404.html";
    return;
  }

  const [advisory, cache] = await Promise.all([
    loadAdvisoryCache(longId),
    loadRadiiCache(longId),
  ]);

  if (!advisory) {
    window.location.href = "/404.html";
    return;
  }

  renderOverviewV2(advisory, longId);

  try {
    const rad = cache?.radii || null;
    const fixes = Array.isArray(cache?.fixes) ? cache.fixes : null;
    if (rad || fixes) {
      const stormName = advisory?.systemName || "Active Storm";
      RadiiVisualization.render(rad, fixes, stormName);
    } else {
      console.info("No radii data available in storm.json");
    }
  } catch (e) {
    console.error("Radii render failed:", e);
  }

  try {
    if (advisory && longId) {
      const stormData = {
        id: longId,
        name: advisory?.systemName || "Active Storm",
        type: advisory?.systemType || ""
      };

      initStormGraphics(stormData);
    }
  } catch (error) {
    console.error("Error initializing storm graphics:", error);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
