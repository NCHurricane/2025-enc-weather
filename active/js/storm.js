/**
 * storm.js – Active storm page (static cache reader)
 * Overview v2 (advisory.json) + Radii (storm.json with current + forecast)
 * - Accepts only ?storm=ALnnYYYY (Atlantic)
 * - Overview comes exclusively from advisory.json
 * - Radii visualization delegated to radii-visualization.js module
 *
 * Logging: console.info|warn|error only
 */
"use strict";

/* ==============================
     Config "knobs" (easy tuning)
     ============================== */
const CONFIG = {
  STORMS_ROOT: "./storms",
};

/* ================
     DOM shortcuts
     ================ */
const $ = (sel) => document.querySelector(sel);
const els = {
  title: $("#storm-title"),
  stormId: $("#storm-id"),
  overview: document.getElementById("overview-v2"),

  // Radii
  radiiTable: $("#radii-table"), // optional; created if absent

  // (placeholders kept for future sections)
  advisoryCard: $("#advisory-card"),
  advisoryContent: $("#advisory-content"),
  graphicsSection: $("#storm-graphics-section"),
  coneGraphic: $("#cone-graphic"),
  hazardsGraphic: $("#hazards-graphic"),
  keyMessages: $("#key-messages"),
  discussion: $("#storm-discussion"),
};

/* ================
     Utilities
     ================ */
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
  return /^AL\d{2}\d{4}$/.test(id);
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

/* ================
     Data loaders
     ================ */
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

/* ============================
     Formatting helpers (overview)
     ============================ */
function fmtTripletSlash(tri) {
  const mph = tri?.mph ?? null,
    kts = tri?.kts ?? null,
    kph = tri?.kph ?? null;
  const out = [];
  if (mph != null) out.push(`${mph} mph`);
  if (kts != null) out.push(`${kts} kt`);
  if (kph != null) out.push(`${kph} km/h`);
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

/* ============================
   Collapsible sections (active)
   ============================ */
function setupSectionCollapsibles() {
  // All sections whose class ends with "-container", except the header
  const sections = Array.from(
    document.querySelectorAll('section[class$="-container"]')
  ).filter(
    (sec) =>
      !sec.classList.contains("storm-header-container") &&
      !sec.classList.contains("active-storms-section")
  );

  sections.forEach((section) => {
    const container = section;
    const title = section.querySelector(":scope > .section-title");
    // first direct child div after the title = content wrapper
    const kids = Array.from(container.children);
    // Pick the first *element* after the title — works for DIV or SECTION
    const titleIndex = kids.indexOf(title);
    const content = kids.find(
      (el, idx) => idx > titleIndex && el.nodeType === 1
    );
    if (!content) return; // safety

    // Collapse on load except the header container
    if (!container.classList.contains("storm-header-container")) {
      content.hidden = true;
      title.setAttribute("aria-expanded", "false");
    }

    if (!title || !content) return;

    // ARIA wiring
    if (!content.id) {
      // ensure an id so aria-controls is valid
      content.id = `${section.classList[0] || "section"}-content`;
    }
    title.setAttribute("role", "button");
    title.setAttribute("tabindex", "0");
    title.setAttribute("aria-controls", content.id);

    // Start collapsed
    title.setAttribute("aria-expanded", "false");
    content.hidden = true;

    const toggle = () => {
      const expanded = title.getAttribute("aria-expanded") === "true";
      title.setAttribute("aria-expanded", String(!expanded));
      content.hidden = expanded;

      if (!expanded) {
        // section just opened: give layout a tick, then refresh if available
        requestAnimationFrame(() => {
          if (typeof content.__radiiRefresh === "function") {
            content.__radiiRefresh();
          } else {
            // fallback: poke global resize so any listeners recompute
            window.dispatchEvent(new Event("resize"));
          }
        });
      }
    };

    title.addEventListener("click", () => {
      const willOpen = content.hidden === true;
      content.hidden = !content.hidden;
      title.setAttribute("aria-expanded", willOpen ? "true" : "false");
      if (willOpen) {
        window.dispatchEvent(new Event("resize"));
      }
    });
    title.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      setupSectionCollapsibles();
      init();
    },
    { once: true }
  );
} else {
  setupSectionCollapsibles();
  init();
}

const toNA = (v) =>
  v == null ||
  String(v).trim() === "" ||
  String(v).trim().toUpperCase() === "N/A"
    ? "—"
    : v;

/* ============================
     Overview v2 renderer
     ============================ */
function createInfoLine(label, value, options = {}) {
  const { className = "", wrapValue = true, fullWidth = false } = options;
  const labelSpan = label ? `<span class="ov-label">${label}</span>` : "";
  const valueContent = wrapValue
    ? `<span class="ov-value">${value}</span>`
    : value;
  const rowClass = `ov-info-line ${className}`.trim();
  const gridClass = fullWidth ? "ov-full-width" : "";

  return `<div id="ov-${
    label.toLowerCase().replace(/[^a-z]/g, "") || "custom"
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

  // helper to turn a label into a stable key like "advisory-number"
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

    // If the string starts with 1–3 N/E/S/W letters (e.g., N, NW, ENE), grab it
    const m = s.match(/^([NSEW]{1,3})\b(.*)$/i);
    if (!m) return s; // e.g., "Stationary" – leave as-is

    const cardinal = m[1].toUpperCase();
    const rest = m[2].toLowerCase(); // " OR 65 DEGREES" -> " or 65 degrees"
    return `${cardinal}${rest}`;
  }

  // Inline key/value pair to embed inside another row
  function inlineKV(label, value, key) {
    const v =
      value == null || value === "" || value === "—" ? "—" : String(value);
    // If value is missing, omit the whole pair so you don't show "# —"
    if (v === "—") return "";
    return `<span class="ov-inline" data-key="${key}">
            <span class="ov-label">${label}</span>
            <span class="ov-value">${v}</span>
          </span>`;
  }

  const titleText = `${(sysType + " " + sysName).toUpperCase()}`;
  if (els.title) els.title.textContent = titleText;
  if (els.stormId) els.stormId.textContent = atcfID ? `— ${atcfID}` : "";

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
  const showCategory = /^\d+$/.test(String(catRaw ?? ""));

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
  const dirTextRaw = advisory?.motion?.dirText || "";
  const dirText = normalizeDirText(dirTextRaw);

  const moving = advisory?.motion
    ? dirText
      ? `${dirText} at ${fmtTripletSlash(advisory.motion)}`
      : fmtTripletSlash(advisory.motion)
    : "—";

  const nameUpper = sysName ? sysName.toUpperCase() : "";
  const geo1 = toNA(advisory?.geo?.[0]);
  const geo2 = toNA(advisory?.geo?.[1]);

  const messageWithAdv = `${msgType} ${inlineKV(
    "#",
    advNum,
    "advisory-number"
  )}`.trim();

  const lines = [
    createInfoLine("", messageWithAdv, "message-type"),
    createInfoLine("Issued:", issued, "issued"),
    createInfoLine("Location:", loc, "location"),
    createInfoLine("Maximum Sustained Winds:", maxWind, "max-wind"),
    createInfoLine("Minimum Central Pressure:", pressure, "min-pressure"),
    createInfoLine("Movement:", moving, "movement"),
  ];

  if (showCategory) {
    lines.splice(
      0,
      0,
      `
      <div class="ov-info-line category-line" data-key="category-value">
        <span class="ov-label ov-category-label">Category</span>
        <span class="ov-value ov-category-value">${catRaw}</span>
      </div>
      `
    );
  }

  const centerSection = `
    <div class="ov-center-section">
      <div class="ov-center-title">${
        nameUpper || "this system"
      }'s Center is:</div>
      <div class="ov-geo-point">${geo1}</div>
      <div class="ov-geo-point">${geo2}</div>
    </div>
  `;

  const html = `
    <div class="overview-v2 compact-layout">
      ${lines.join("")}
      ${centerSection}
    </div>
  `;

  els.overview.innerHTML = html;

  // Handle N/A icons
  els.overview.querySelectorAll(".ov-value").forEach((node) => {
    if (node.textContent === "—") {
      node.innerHTML = `<i class="fa-solid fa-circle-question" aria-hidden="true"></i><span class="sr-only">Not available</span>&nbsp;N/A`;
    }
  });
}

/* ================
     Init
     ================ */
async function init() {
  const raw = getStormParam();
  if (!raw) return showBannerOnly();

  const longId = raw.toUpperCase();
  if (!isValidLongId(longId)) {
    console.warn("Invalid storm id; expected ALnnYYYY:", raw);
    return showBannerOnly();
  }

  const [advisory, cache] = await Promise.all([
    loadAdvisoryCache(longId),
    loadRadiiCache(longId),
  ]);

  renderOverviewV2(advisory || { atcfID: longId }, longId);

  // Delegate radii visualization to the external module
  try {
    const rad = cache?.radii || null;
    const fixes = Array.isArray(cache?.fixes) ? cache.fixes : null;
    if ((rad || fixes) && window.RadiiVisualization) {
      const stormName = advisory?.systemName || "Active Storm";
      window.RadiiVisualization.render(rad, fixes, stormName);
    } else if (!window.RadiiVisualization) {
      console.error("RadiiVisualization module not loaded");
    } else {
      console.info("No radii data available in storm.json");
    }
  } catch (e) {
    console.error("Radii render failed:", e);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
