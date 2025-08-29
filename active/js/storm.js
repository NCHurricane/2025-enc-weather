/**
 * storm.js — Active storm page (static cache reader)
 * - Lists active storms if no ?storm
 * - If ?storm present, reads ../js/modules/cache/storms/{ALnnYYYY}/storm.json
 */
(() => {
  "use strict";

  // ---------- Endpoints ----------
  const ENDPOINTS = {
    stormsApi: "/2025_weather/js/modules/tropical_data.php",
    stormsCache: "/2025_weather/js/modules/cache/nhc_current_storms.json",
    /** Uncomment below and comment-out above for testing tropical-banner */
    // stormsCache: "/2025_weather/js/modules/cache/CurrentStorms.json",
    stormCacheRoot: "./storms",
  };

  // ---------- DOM ----------
  const $ = (sel) => document.querySelector(sel);
  const els = {
    title: $("#storm-title"),
    stormId: $("#storm-id"),
    updated: document.querySelector(".last-updated"),

    radiiSection: $("#radii-section"),
    overviewKV: $("#overview-kv"),
    advisoryCard: $("#advisory-card"),
    advisoryContent: $("#advisory-content"),

    graphicsSection: $("#storm-graphics-section"),
    coneGraphic: $("#cone-graphic"),
    hazardsGraphic: $("#hazards-graphic"),

    textSection: $("#storm-text-section"),
    keyMessages: $("#key-messages"),
    discussion: $("#storm-discussion"),

    // Optional, if you add it:
    radiiTable: $("#radii-table"),
  };

  // ---------- Utils ----------
  function getParam() {
    const p = new URLSearchParams(location.search);
    return (p.get("storm") || p.get("active") || p.get("id") || "").trim();
  }

  // Hide all detail sections so only the tropical banner remains visible
  function showBannerOnly() {
    const selectors = [
      ".storm-header-container",
      ".radii-container",
      ".hazards-container",
      ".graphics-container",
      ".text-products-container",
    ];
    selectors.forEach((sel) => {
      const el = document.querySelector(sel);
      if (el) el.hidden = true; // we use .hidden to avoid layout jumps
    });
  }

  function normalizeQueryId(raw) {
    if (!raw) return "";
    const s = raw.toString().trim().toLowerCase();
    // Accept AL## or AL##YYYY → return al##
    const m = s.match(/^([a-z]{2})(\d{2})(\d{4})?$/);
    return m ? m[1] + m[2] : s; // canonical short id
  }

  function ktToMph(kt) {
    if (kt == null || isNaN(+kt)) return null;
    return Math.round(+kt * 1.15078);
  }

  function degToCompass(d) {
    if (d == null || isNaN(+d)) return "";
    const dirs = [
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
    return dirs[Math.round((+d % 360) / 22.5) % 16];
  }

  function formatAbs(anyTs) {
    if (!anyTs) return "—";
    try {
      let d;
      if (typeof anyTs === "number") {
        d = new Date(anyTs < 1e12 ? anyTs * 1000 : anyTs);
      } else if (typeof anyTs === "string") {
        const m = anyTs
          .trim()
          .match(
            /^(\d{3,4})\s+UTC\s+([A-Za-z]{3})\s+([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})$/
          );
        if (m) {
          let hhmm = m[1];
          if (hhmm.length === 3) hhmm = "0" + hhmm;
          const [hh, mm] = [hhmm.slice(0, 2), hhmm.slice(2)];
          d = new Date(`${m[2]} ${m[3]} ${m[4]} ${m[5]} ${hh}:${mm}:00 Z`);
        } else if (/\sUTC$/i.test(anyTs)) {
          d = new Date(anyTs.replace(/\sUTC$/i, "Z"));
        } else {
          d = new Date(anyTs);
        }
      } else {
        d = new Date(anyTs);
      }
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleString("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "long",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch {
      return "—";
    }
  }

  async function getJson(url) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  // ---------- Existing list flow (unchanged) ----------
  async function loadStorms() {
    const api = await getJson(ENDPOINTS.stormsApi);
    if (api && (Array.isArray(api.data) || Array.isArray(api.data?.storms))) {
      const arr = Array.isArray(api.data) ? api.data : api.data.storms;
      return {
        list: arr,
        updated:
          api?.metadata?.cached_at_iso || api?.metadata?.generated || null,
      };
    }
    const raw = await getJson(ENDPOINTS.stormsCache);
    if (Array.isArray(raw)) {
      return { list: raw, updated: null };
    }
    return { list: [], updated: null };
  }

  function toShortId(storm) {
    const id = (storm?.id || storm?.stormId || "").toString();
    const basin = (storm?.basin || "").toString().substr(0, 2).toUpperCase();
    let num = "";
    const m = id.match(/^[A-Za-z]{2}(\d{2})\d{4}$/);
    if (m) num = m[1];
    else if (storm?.stormNumber)
      num = String(storm.stormNumber).padStart(2, "0");
    if (!basin || !num) return id || "";
    return `${basin.toLowerCase()}${num}`;
  }

  function matchStorm(list, queryId) {
    if (!queryId) return null;
    const normalized = normalizeQueryId(queryId);

    let found = list.find(
      (s) => (s?.id || "").toString().toUpperCase() === normalized
    );
    if (found) return found;

    if (/^[A-Z]{2}\d{2}$/.test(normalized)) {
      found = list.find((s) => toShortId(s).toUpperCase() === normalized);
      if (found) return found;
    }

    found = list.find(
      (s) => (s?.name || "").toString().toUpperCase() === normalized
    );
    return found || null;
  }

  async function resolveLongIdFromList(queryId, list) {
    // We canonicalize to short-id now
    const s = normalizeQueryId(queryId); // al##
    // Try to match against list items (by short-id or by raw id if present)
    const match = list.find((item) => {
      const basin = (item?.basin || "").toString().slice(0, 2).toLowerCase();
      const num =
        item?.stormNumber != null
          ? String(item.stormNumber).padStart(2, "0")
          : "";
      const shortId =
        basin && num ? basin + num : (item?.id || "").toString().toLowerCase();
      return shortId === s;
    });
    // Always return a short-id
    if (match) {
      const basin = (match?.basin || "").toString().slice(0, 2).toLowerCase();
      const num =
        match?.stormNumber != null
          ? String(match.stormNumber).padStart(2, "0")
          : "";
      return basin && num ? basin + num : s;
    }
    return s;
  }

  function isKnownStormId(list, sid) {
    if (!sid || !Array.isArray(list)) return false;
    sid = String(sid).toLowerCase();
    return list.some((item) => {
      const basin = (item?.basin || "").toString().slice(0, 2).toLowerCase();
      const num =
        item?.stormNumber != null
          ? String(item.stormNumber).padStart(2, "0")
          : "";
      const shortId =
        basin && num ? basin + num : String(item?.id || "").toLowerCase();
      return shortId === sid;
    });
  }

  function setUpdatedFromCache(cache) {
    try {
      const ts =
        cache?.meta?.created ||
        cache?.meta?.generated ||
        cache?.metadata?.generated ||
        cache?.metadata?.issued ||
        Date.now();
      if (els.updated) els.updated.textContent = `Updated: ${formatAbs(ts)}`;
    } catch {}
  }

  // ---------- Static cache readers ----------
  async function loadCxmlCache(longId) {
    const url = `${ENDPOINTS.stormCacheRoot}/${encodeURIComponent(
      longId
    )}/storm.json?${Date.now()}`;
    return await getJson(url);
  }

  function renderRadiiVisual(radii, stormName) {
    const container = document.querySelector(
      ".radii-container .radii-section"
    );
    if (!container || !radii) return;

    // Clear existing content
    container.innerHTML = "";

    // Create control buttons
    const controls = document.createElement("div");
    controls.className = "radii-controls";
    controls.innerHTML = `
    <button class="radii-btn active" data-wind="34">TS Winds</button>
    <button class="radii-btn" data-wind="50">Gale Force</button>
    <button class="radii-btn" data-wind="64">Hurricane</button>
    <button class="radii-btn" data-wind="all">All Winds</button>
  `;

    // Create canvas container
    const canvasContainer = document.createElement("div");
    canvasContainer.className = "radii-compass";
    canvasContainer.innerHTML =
      '<canvas id="radiiCanvas" class="radii-canvas"></canvas>';

    // Create legend
    const legend = document.createElement("div");
    legend.className = "radii-legend";
    legend.innerHTML = `
    <div class="legend-item">
      <div class="legend-color" style="background: #ffd93d;">
      <span>34 kt - TS Force</span></div>
    </div>
    <div class="legend-item">
      <div class="legend-color" style="background: #ff9f1c;">
      <span>50 kt - Strong TS</span></div>
    </div>
    <div class="legend-item">
      <div class="legend-color" style="background: #ff6b6b;">
      <span>64 kt - Hurricane</span></div>
    </div>
  `;

    // Only show controls that have data
    const hasR34 = radii.r34 && Object.values(radii.r34).some((v) => v > 0);
    const hasR50 = radii.r50 && Object.values(radii.r50).some((v) => v > 0);
    const hasR64 = radii.r64 && Object.values(radii.r64).some((v) => v > 0);

    // Filter buttons based on available data
    const buttons = controls.querySelectorAll(".radii-btn");
    buttons[0].style.display = hasR34 ? "inline-block" : "none";
    buttons[1].style.display = hasR50 ? "inline-block" : "none";
    buttons[2].style.display = hasR64 ? "inline-block" : "none";

    // If no single radii data, hide the "All" button too
    if (!hasR34 && !hasR50 && !hasR64) {
      controls.innerHTML = '<p class="muted">No wind radii data available</p>';
    }

    // Append elements
    container.appendChild(controls);
    container.appendChild(canvasContainer);
    container.appendChild(legend);

    // Initialize the compass visualization
    setTimeout(() => {
      new RadiiCompass("radiiCanvas", radii, stormName);
    }, 100); // Small delay to ensure DOM is ready
  }

  function showStormFromCache(data) {
    const meta = data.metadata || {};
    const cur = data.current || {};
    const rad = data.radii || {};

    els.radiiSection.hidden = false;
    els.graphicsSection.hidden = false;
    els.textSection.hidden = false;

    const name = (meta.name || "Unnamed").toString();
    const idShown = (meta.id || "").toString().toUpperCase();

    els.title.textContent = name;
    if (idShown) {
      els.stormId.textContent = idShown;
      els.stormId.hidden = false;
    } else {
      els.stormId.hidden = true;
    }

    if (els.updated)
      els.updated.textContent = `Updated: ${formatAbs(
        meta.created || cur.validTime || null
      )}`;

    const windKt = cur?.wind?.maxKt ?? null;
    const gustKt = cur?.wind?.gustKt ?? null;
    const windStr =
      windKt != null
        ? `${windKt} kt (${ktToMph(windKt)} mph)${
            gustKt != null ? `, gusts ${gustKt} kt` : ""
          }`
        : "—";

    const motionDeg = cur?.motion?.dir ?? null;
    const motionKt = cur?.motion?.speedKt ?? null;
    const moveStr =
      motionDeg != null || motionKt != null
        ? `${degToCompass(motionDeg)} ${motionKt ?? "—"} kt`
        : "—";

    const lines = [
      ["Status", (cur?.type || "—").toString()],
      ["Advisory", (meta?.advisory || "—").toString()],
      ["Max Wind", windStr],
      ["Movement", moveStr],
      [
        "Location",
        cur?.lat != null && cur?.lon != null ? `${cur.lat}°, ${cur.lon}°` : "—",
      ],
    ];
    els.overviewKV.innerHTML = lines
      .map(([k, v]) => `<dt>${k}</dt><dd>${v || "—"}</dd>`)
      .join("");

    // Advisory / text placeholders (CXML doesn't include text products)
    els.advisoryContent.innerHTML =
      '<p class="muted">Public advisory text not available in this feed.</p>';
    els.keyMessages.innerHTML =
      '<p class="muted">No key messages available.</p>';
    els.discussion.innerHTML = '<p class="muted">No discussion available.</p>';

    // Optional radii table
    renderRadiiVisual(rad, meta?.name || "Active Storm");
  }

  class RadiiCompass {
    constructor(canvasId, radiiData, stormName = "Active Storm") {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;

      this.ctx = this.canvas.getContext("2d");
      this.radiiData = radiiData;
      this.stormName = stormName;
      this.activeWind = "34";
      this.init();
    }

    init() {
      // Set canvas size
      const container = this.canvas.parentElement;
      const size = Math.min(container.offsetWidth, 500);
      this.canvas.width = size;
      this.canvas.height = size;

      this.centerX = size / 2;
      this.centerY = size / 2;
      this.maxRadius = size * 0.35; // Leave room for labels

      // Bind button events if controls exist
      const controls = document.querySelectorAll(".radii-btn");
      if (controls.length > 0) {
        controls.forEach((btn) => {
          btn.addEventListener("click", (e) => {
            document
              .querySelectorAll(".radii-btn")
              .forEach((b) => b.classList.remove("active"));
            e.target.classList.add("active");
            this.activeWind = e.target.dataset.wind;
            this.draw();
          });
        });
      }

      this.draw();
    }

    draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Draw background circle
      this.drawBackground();

      // Draw compass points
      this.drawCompass();

      // Draw range circles
      this.drawRangeCircles();

      // Draw wind radii
      if (this.activeWind === "all") {
        // Draw in order from largest to smallest so smaller radii appear on top
        if (this.radiiData.r34) this.drawRadii("r34", "#ffd93d", 0.5);
        if (this.radiiData.r50) this.drawRadii("r50", "#ff9f1c", 0.6);
        if (this.radiiData.r64) this.drawRadii("r64", "#ff6b6b", 0.7);
      } else {
        const colors = {
          34: "#ffd93d",
          50: "#ff9f1c",
          64: "#ff6b6b",
        };
        const radiiKey = `r${this.activeWind}`;
        if (this.radiiData[radiiKey]) {
          this.drawRadii(radiiKey, colors[this.activeWind], 0.8);
        }
      }

      // Draw center storm icon (FontAwesome cyclone)
      this.drawStormCenter();
    }

    drawBackground() {
      const ctx = this.ctx;

      // Outer circle
      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, this.maxRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(this.centerX - this.maxRadius, this.centerY);
      ctx.lineTo(this.centerX + this.maxRadius, this.centerY);
      ctx.moveTo(this.centerX, this.centerY - this.maxRadius);
      ctx.lineTo(this.centerX, this.centerY + this.maxRadius);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    drawCompass() {
      const ctx = this.ctx;
      const directions = [
        { label: "N", angle: -90, x: 0, y: -1 },
        { label: "E", angle: 0, x: 1, y: 0 },
        { label: "S", angle: 90, x: 0, y: 1 },
        { label: "W", angle: 180, x: -1, y: 0 },
      ];

      ctx.font = "bold 18px Arial";
      ctx.fillStyle = "#fff200";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      directions.forEach((dir) => {
        const x = this.centerX + dir.x * (this.maxRadius + 25);
        const y = this.centerY + dir.y * (this.maxRadius + 25);
        ctx.fillText(dir.label, x, y);
      });

      // Add distance labels
      ctx.font = "bold 12px Arial";
      ctx.fillStyle = "rgba(255, 255, 255, 0.78)";

      // Distance scale (100nm, 200nm, 300nm, 400nm)
      const distances = [100, 200, 300, 400, 500];
      distances.forEach((dist) => {
        const radius = (dist / 500) * this.maxRadius;
        ctx.fillText(`${dist}`, this.centerX + radius + 5, this.centerY - 10);
        ctx.fillText(`nm`, this.centerX + radius + 5, this.centerY + 2);
      });
    }

    drawRangeCircles() {
      const ctx = this.ctx;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 2;
      ctx.setLineDash([2, 4]);

      // Draw circles at 100nm intervals (assuming 500nm max)
      for (let i = 1; i <= 5; i++) {
        const radius = (i / 5) * this.maxRadius;
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.setLineDash([]);
    }

drawRadii(radiiKey, color, opacity) {
  const ctx = this.ctx;
  const radii = this.radiiData[radiiKey];
  if (!radii) return;

  // Maximum distance for scaling (500nm now)
  const maxDist = 500;

  // Convert to polar coordinates (angles in radians)
  // NE = 45°, SE = 135°, SW = 225°, NW = 315°
  const points = [
    { angle: Math.PI * 0.25, dist: radii.NE || 0, label: 'NE' },  // 45°
    { angle: Math.PI * 0.75, dist: radii.SE || 0, label: 'SE' },  // 135°
    { angle: Math.PI * 1.25, dist: radii.SW || 0, label: 'SW' },  // 225°
    { angle: Math.PI * 1.75, dist: radii.NW || 0, label: 'NW' }   // 315°
  ];

  // Convert to cartesian coordinates
  const cartesianPoints = points.map(point => {
    const r = (point.dist / maxDist) * this.maxRadius;
    return {
      x: this.centerX + r * Math.cos(point.angle - Math.PI/2),
      y: this.centerY + r * Math.sin(point.angle - Math.PI/2),
      dist: point.dist,
      label: point.label
    };
  });

  // Draw rounded polygon
  ctx.beginPath();
  
  // Rounding factor (0 = sharp corners, 1 = very rounded)
  const roundness = 0.4; // Adjust this value to control corner rounding (0.1 to 0.3 works well)
  
  for (let i = 0; i < cartesianPoints.length; i++) {
    const current = cartesianPoints[i];
    const next = cartesianPoints[(i + 1) % cartesianPoints.length];
    const prev = cartesianPoints[(i - 1 + cartesianPoints.length) % cartesianPoints.length];
    
    // Calculate control points for rounded corners
    const dx1 = current.x - prev.x;
    const dy1 = current.y - prev.y;
    const dx2 = next.x - current.x;
    const dy2 = next.y - current.y;
    
    // Distance to control points (smaller = sharper corners)
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    const controlDist1 = len1 * roundness;
    const controlDist2 = len2 * roundness;
    
    // Control points for the curve
    const cp1x = current.x - (dx1 / len1) * controlDist1;
    const cp1y = current.y - (dy1 / len1) * controlDist1;
    const cp2x = current.x + (dx2 / len2) * controlDist2;
    const cp2y = current.y + (dy2 / len2) * controlDist2;
    
    if (i === 0) {
      ctx.moveTo(cp1x, cp1y);
    } else {
      ctx.lineTo(cp1x, cp1y);
    }
    
    // Draw the curved corner
    ctx.quadraticCurveTo(current.x, current.y, cp2x, cp2y);
  }
  
  ctx.closePath();

  // Fill with semi-transparent color
  ctx.fillStyle = color + Math.round(opacity * 255).toString(16).padStart(2, '0');
  ctx.fill();

  // Draw border
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Add distance labels at vertices (only if showing single radii)
  if (this.activeWind !== 'all') {
    ctx.font = 'bold 18px Roboto, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    cartesianPoints.forEach(point => {
      if (point.dist === 0) return; // Skip if no data
      
      // Position label slightly beyond the actual point
      const angle = Math.atan2(point.y - this.centerY, point.x - this.centerX);
      const labelOffset = 25;
      const x = point.x + Math.cos(angle) * labelOffset;
      const y = point.y + Math.sin(angle) * labelOffset;
      
      // Draw background for better readability
      ctx.fillStyle = 'rgba(26, 58, 82, 0.9)';
      ctx.fillRect(x - 35, y - 12, 70, 24);
      
      ctx.fillStyle = color;
      ctx.fillText(`${point.dist} nm`, x, y);
    });
  }
}
drawStormCenter() {
  const ctx = this.ctx;
  
  // Draw white background circle
  ctx.beginPath();
  ctx.arc(this.centerX, this.centerY, 15, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fill();
  ctx.strokeStyle = '#ff6b6b';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Draw hurricane spiral
  ctx.strokeStyle = '#ff6b6b';
  ctx.lineWidth = 2.5;
  
  // Draw three spiral arms
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    const startAngle = (i * 120) * Math.PI / 180;
    
    // Create spiral using small arc segments
    for (let j = 0; j < 20; j++) {
      const angle = startAngle + (j * Math.PI / 30);
      const r = 3 + (j * 0.6); // Expanding radius
      const x = this.centerX + r * Math.cos(angle);
      const y = this.centerY + r * Math.sin(angle);
      
      if (j === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }
  
  // Draw center dot
  ctx.beginPath();
  ctx.arc(this.centerX, this.centerY, 3, 0, Math.PI * 2);
  ctx.fillStyle = '#ff6b6b';
  ctx.fill();
}
  }

  // ---------- init ----------
  async function init() {
    const params = new URLSearchParams(location.search);
    const raw = params.get("storm");
    const sid = normalizeQueryId(raw); // short like "al05"

    // No ?storm → banner only
    if (!sid) {
      showBannerOnly();
      return;
    }

    // 1) Prefer the per-storm cache; if it exists, render immediately
    const cache = await loadCxmlCache(sid); // reads ./storms/<sid>/storm.json
    if (cache && (cache.meta || cache.metadata)) {
      showStormFromCache(cache);
      setUpdatedFromCache(cache);
      return;
    }

    // 2) Optional: list only for timestamp/diagnostics (do not gate detail view)
    try {
      const { list, updated } = await loadStorms();
      const badId = sid && !isKnownStormId(list, sid);
      if (badId) {
        location.href = "/2025_weather/404.html"; // or: showBannerOnly();
        return;
      }
      if (els.updated)
        els.updated.textContent = `Updated: ${formatAbs(updated)}`;
    } catch (e) {
      console.warn("loadStorms() failed; continuing with banner fallback.");
    }

    // 3) Still no cache → banner only
    showBannerOnly();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
