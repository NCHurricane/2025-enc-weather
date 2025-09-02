/**
 * storm.js – Active storm page (static cache reader)
 * Overview v2 (advisory.json) + Radii (storm.json with current + forecast)
 * - Accepts only ?storm=ALnnYYYY (Atlantic)
 * - Overview comes exclusively from advisory.json
 * - Radii visualization delegated to radii-visualization.js module
 *
 * Logging: console.info|warn|error only
 */
(() => {
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
      return await res.json();
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
          day: "2-digit",
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
    ).filter((sec) => !sec.classList.contains("storm-header-container"));

    sections.forEach((section) => {
      const title = section.querySelector(":scope > .section-title");
      // first direct child div after the title = content wrapper
      const kids = Array.from(section.children);
      const content = kids.find((el) => el !== title && el.tagName === "DIV");

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

      title.addEventListener("click", toggle);
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
  function renderOverviewV2(advisory, longId) {
    if (!els.overview) return;

    const sysType = (advisory?.systemType || "—").toString();
    const sysName = (advisory?.systemName || "—").toString();
    const atcfID = (advisory?.atcfID || longId || "").toString().toUpperCase();

    const titleText = `${(sysType + " " + sysName).toUpperCase()}`;
    if (els.title) els.title.textContent = titleText;
    if (els.stormId)
      els.stormId.textContent = atcfID ? `\u2013 ${atcfID}` : "";

    const msgType = toNA(advisory?.messageType);
    const advNum = toNA(advisory?.advisoryNumber);
    const localStr = toNA(advisory?.messageTimeLocal);
    const utcStr = advisory?.messageTimeUTC
      ? formatUtcShort(advisory.messageTimeUTC)
      : "—";
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
    const dirText = (advisory?.motion?.dirText || "").toString().trim();
    const moving = advisory?.motion
      ? dirText
        ? `${dirText} at ${fmtTripletSlash(advisory.motion)}`
        : fmtTripletSlash(advisory.motion)
      : "—";

    const nameUpper = sysName ? sysName.toUpperCase() : "";
    const geo1 = toNA(advisory?.geo?.[0]);
    const geo2 = toNA(advisory?.geo?.[1]);

    let html = `
      <div class="overview-v2">
        <div id="ov-message-type" class="ov-row"><span class="ov-label">Message</span><span class="ov-value">${msgType}</span></div>
        <div id="ov-advisory" class="ov-row"><span class="ov-label">Number</span><span class="ov-value">${advNum}</span></div>
        <div id="ov-issued" class="ov-row"><span class="ov-label">Issued</span><span class="ov-value">${issued}</span></div>
    `;

    if (showCategory) {
      html += `<div id="ov-category" class="ov-row"><span class="ov-label">Category</span><span class="ov-value">Category ${catRaw}</span></div>`;
    }

    html += `
        <div id="ov-location" class="ov-row"><span class="ov-label">Location</span><span class="ov-value">${loc}</span></div>
        <div id="ov-max-wind" class="ov-row"><span class="ov-label">Maximum Sustained Winds</span><span class="ov-value">${maxWind}</span></div>
        <div id="ov-pressure" class="ov-row"><span class="ov-label">Minimum Central Pressure</span><span class="ov-value">${pressure}</span></div>
        <div id="ov-moving" class="ov-row"><span class="ov-label">Moving</span><span class="ov-value">${moving}</span></div>
        <div id="ov-geo-leadin" class="ov-row"><span class="ov-value">THE CENTER OF ${
          nameUpper || "THIS SYSTEM"
        } IS:</span></div>
        <div id="ov-geo-pt1" class="ov-row"><span class="ov-value">${geo1}</span></div>
        <div id="ov-geo-pt2" class="ov-row"><span class="ov-value">${geo2}</span></div>
      </div>
    `;

    els.overview.innerHTML = html;

    // Inline N/A icon for em dashes
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
})();