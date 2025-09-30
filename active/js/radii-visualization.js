// =============================
// Wind Radii Compass Visualization Module - active/js/radii-visualization.js
// Handles rendering of wind radii compass and controls
// 
// Uses the current and forecast wind radii data from NHC's public advisories to render a compass visualization
// ==============================

"use strict";

/* ==============================
   Config for radii visualization
   ============================== */
const RADII_CONFIG = {
  CANVAS_MAX_PX: 500,
  MAX_FORECAST_HOUR: 36,
  WIND_COLORS: { 34: "#ffd93d", 50: "#ff7f0e", 64: "#d62728" },
  OPACITY_SINGLE: 0.4,
  OPACITY_ALL: 0.3,
  // Compass & labels
  BASE_PAD: 20,
  EXTRA_FRAME: 20, // extra outer room around compass
  LABEL_OFFSET: 18, // gap from compass circle to cardinal label
  LABEL_SAFE_PAD: 25, // keep labels X px inside the canvas edge
  VERTEX_LABEL_OFFSET: 1, // distance of vertex labels away from polygon
  MIN_RADII_EXTENT: 100, // minimum maxDist in nm (adjustable)
  RADII_PADDING: 100, // padding in nm beyond largest r34
};

function devicePixelRatioSafe() {
  const dpr = window.devicePixelRatio || 1;
  return dpr < 1 ? 1 : dpr > 2 ? 2 : dpr;
}
function devPxFromCss(pxCss) {
  return Math.max(1, Math.round(pxCss * devicePixelRatioSafe()));
}

function hasAnyRadii(fix) {
  if (!fix) return false;
  for (const k of ["r34", "r50", "r64"]) {
    const q = fix[k];
    if (q && (q.NE != null || q.SE != null || q.SW != null || q.NW != null)) {
      return true;
    }
  }
  return false;
}

function collectForecastHours(fixes) {
  if (!Array.isArray(fixes)) return [0];
  const set = new Set([0]);
  for (const f of fixes) {
    let h = f?.hour;
    if (typeof h === "string") h = parseInt(h.replace(/\D+/g, ""), 10);
    if (!Number.isFinite(h)) continue;
    if (h > RADII_CONFIG.MAX_FORECAST_HOUR) continue;
    if (!hasAnyRadii(f)) continue;
    set.add(h);
  }
  return Array.from(set).sort((a, b) => a - b);
}

function radiiAtHour(currentRadii, fixes, hour) {
  if (hour === 0 || !Array.isArray(fixes)) return currentRadii || null;
  for (const f of fixes) {
    let h = f?.hour;
    if (typeof h === "string") h = parseInt(h.replace(/\D+/g, ""), 10);
    if (h === hour)
      return {
        r34: f?.r34 || null,
        r50: f?.r50 || null,
        r64: f?.r64 || null,
      };
  }
  return null;
}

function allZeroOrMissing(rad) {
  if (!rad) return true;
  for (const t of ["r34", "r50", "r64"]) {
    const q = rad[t] || {};
    const vals = [q.NE || 0, q.SE || 0, q.SW || 0, q.NW || 0];
    if (vals.some((v) => (v || 0) > 0)) return false;
  }
  return true;
}

class RadiiDrawer {
  constructor(ctx, canvas, maxDist) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.radiiData = null;
    this.activeWind = "34";
    this.maxDist = maxDist;
    this.refreshGeometry();
  }

  setMaxDist(maxDist) {
    this.maxDist = maxDist;
  }

  refreshGeometry() {
    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2;
    this.maxRadius =
      Math.min(this.canvas.width, this.canvas.height) / 2 -
      (RADII_CONFIG.BASE_PAD + RADII_CONFIG.EXTRA_FRAME);
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.refreshGeometry();
    this.drawBackground();
    this.drawCompass();
    this.drawRangeCircles();

    if (!this.radiiData) return;

    if (this.activeWind === "all") {
      if (this.radiiData.r34)
        this.drawRadii(
          "r34",
          RADII_CONFIG.WIND_COLORS[34],
          RADII_CONFIG.OPACITY_ALL
        );
      if (this.radiiData.r50)
        this.drawRadii(
          "r50",
          RADII_CONFIG.WIND_COLORS[50],
          RADII_CONFIG.OPACITY_ALL
        );
      if (this.radiiData.r64)
        this.drawRadii(
          "r64",
          RADII_CONFIG.WIND_COLORS[64],
          RADII_CONFIG.OPACITY_ALL
        );
    } else {
      const key = `r${this.activeWind}`;
      if (this.radiiData[key])
        this.drawRadii(
          key,
          RADII_CONFIG.WIND_COLORS[this.activeWind],
          RADII_CONFIG.OPACITY_SINGLE
        );
    }

    this.drawStormCenter();
  }

  drawBackground() {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.maxRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 2 * devicePixelRatioSafe();
    ctx.stroke();

    const grad = ctx.createRadialGradient(
      this.centerX,
      this.centerY,
      this.maxRadius * 0.1,
      this.centerX,
      this.centerY,
      this.maxRadius
    );
    grad.addColorStop(0, "rgba(255,255,255,0.05)");
    grad.addColorStop(1, "rgba(0,0,0,0.12)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.maxRadius, 0, Math.PI * 2);
    ctx.fill();

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(this.centerX - this.maxRadius, this.centerY);
    ctx.lineTo(this.centerX + this.maxRadius, this.centerY);
    ctx.moveTo(this.centerX, this.centerY - this.maxRadius);
    ctx.lineTo(this.centerX, this.centerY + this.maxRadius);
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1 * devicePixelRatioSafe();
    ctx.stroke();
  }

  drawCompass() {
    const ctx = this.ctx;
    const canvasHalf = Math.min(this.canvas.width, this.canvas.height) / 2;
    const idealLabelR =
      this.maxRadius + RADII_CONFIG.LABEL_OFFSET + RADII_CONFIG.EXTRA_FRAME;
    const labelR = Math.min(
      idealLabelR,
      canvasHalf - RADII_CONFIG.LABEL_SAFE_PAD
    );

    ctx.font = `bold ${devPxFromCss(18)}px Roboto, Arial, sans-serif`;
    ctx.lineWidth = 1 * devicePixelRatioSafe();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    [
      { label: "N", x: 0, y: -1 },
      { label: "E", x: 1, y: 0 },
      { label: "S", x: 0, y: 1 },
      { label: "W", x: -1, y: 0 },
    ].forEach((d) =>
      ctx.fillText(
        d.label,
        this.centerX + d.x * labelR,
        this.centerY + d.y * labelR
      )
    );

    ctx.font = `bold ${devPxFromCss(12)}px Roboto, Arial, sans-serif`;
    ctx.lineWidth = 1 * devicePixelRatioSafe();
    ctx.fillStyle = "rgba(255,255,255,0.55)";

    // Generate ringDistances at 100nm increments up to maxDist, but only label unique increments
    const ringDistances = [];
    for (let d = 100; d < this.maxDist; d += 100) ringDistances.push(d);
    // Only add maxDist if it's not a multiple of 100 and not already present
    if (this.maxDist % 100 !== 0 && (ringDistances.length === 0 || ringDistances[ringDistances.length - 1] !== this.maxDist)) {
      ringDistances.push(this.maxDist);
    }

    ringDistances.forEach((dist) => {
      // Only label if not the outermost ring when it would overlap
      if (dist === this.maxDist && this.maxDist % 100 !== 0) return; // skip label for odd outermost
      const r = (dist / this.maxDist) * this.maxRadius;
      ctx.fillText(`${dist}`, this.centerX + r + 5, this.centerY - 10);
      ctx.fillText(`nm`, this.centerX + r + 5, this.centerY + 2);
    });
  }

  drawRangeCircles() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
    ctx.lineWidth = 1 * devicePixelRatioSafe();
    ctx.setLineDash([2, 4]);

    // Generate ringDistances at 50nm increments up to maxDist, but only draw unique increments
    const ringDistances = [];
    for (let d = 50; d < this.maxDist; d += 50) ringDistances.push(d);
    if (this.maxDist % 50 !== 0 && (ringDistances.length === 0 || ringDistances[ringDistances.length - 1] !== this.maxDist)) {
      ringDistances.push(this.maxDist);
    }

    ringDistances.forEach(dist => {
      const r = (dist / this.maxDist) * this.maxRadius;
      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    ctx.restore();
  }
  drawRadii(radiiKey, color, opacity) {
    const ctx = this.ctx;
    const q = this.radiiData[radiiKey];
    if (!q) return;

    // Exaggeration factor for polygons
    const EXAGGERATION = 1.5;

    const ne = Math.max(0, Number(q.NE) || 0) * EXAGGERATION;
    const se = Math.max(0, Number(q.SE) || 0) * EXAGGERATION;
    const sw = Math.max(0, Number(q.SW) || 0) * EXAGGERATION;
    const nw = Math.max(0, Number(q.NW) || 0) * EXAGGERATION;

    const points = [
      { angle: Math.PI * 0.25, dist: ne },
      { angle: Math.PI * 0.75, dist: se },
      { angle: Math.PI * 1.25, dist: sw },
      { angle: Math.PI * 1.75, dist: nw },
    ];

    const P = points.map((p) => {
      const r = (p.dist / this.maxDist) * this.maxRadius;
      return {
        x: this.centerX + r * Math.cos(p.angle - Math.PI / 2),
        y: this.centerY + r * Math.sin(p.angle - Math.PI / 2),
        dist: p.dist,
        ang: p.angle,
      };
    });

    ctx.beginPath();
    const roundness = 0.2;
    for (let i = 0; i < P.length; i++) {
      const cur = P[i],
        nxt = P[(i + 1) % P.length],
        prv = P[(i - 1 + P.length) % P.length];
      const dx1 = cur.x - prv.x,
        dy1 = cur.y - prv.y;
      const dx2 = nxt.x - cur.x,
        dy2 = nxt.y - cur.y;
      const len1 = Math.hypot(dx1, dy1) || 1,
        len2 = Math.hypot(dx2, dy2) || 1;
      const c1 = len1 * roundness,
        c2 = len2 * roundness;

      const cp1x = cur.x - (dx1 / len1) * c1;
      const cp1y = cur.y - (dy1 / len1) * c1;
      const cp2x = cur.x + (dx2 / len2) * c2;
      const cp2y = cur.y + (dy2 / len2) * c2;

      if (i === 0) ctx.moveTo(cp1x, cp1y);
      else ctx.lineTo(cp1x, cp1y);
      ctx.quadraticCurveTo(cur.x, cur.y, cp2x, cp2y);
    }
    ctx.closePath();

    ctx.fillStyle =
      color +
      Math.round(opacity * 255)
        .toString(16)
        .padStart(2, "0");
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 * devicePixelRatioSafe();
    ctx.stroke();

    // Style Vertex Labels
    if (this.activeWind !== "all") {
      ctx.font = `bold ${devPxFromCss(16)}px Roboto, Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 1 * devicePixelRatioSafe();
      ctx.fillStyle = "#fff";
      P.forEach((pt) => {
        if (!pt.dist) return;
        const r =
          (pt.dist / this.maxDist) * this.maxRadius +
          RADII_CONFIG.VERTEX_LABEL_OFFSET;
        const lx = this.centerX + r * Math.cos(pt.ang - Math.PI / 2);
        const ly = this.centerY + r * Math.sin(pt.ang - Math.PI / 2);
        ctx.fillText(`${Math.round(pt.dist / EXAGGERATION)} nm`, lx, ly + 0.5);
      });
    }
  }
  drawStormCenter() {
    const ctx = this.ctx;

    ctx.font = `900 ${devPxFromCss(28)}px 'Font Awesome 6 Free'`;
    ctx.lineWidth = 1 * devicePixelRatioSafe();
    ctx.fillStyle = "#d5ff3d53";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText("\uf751", this.centerX, this.centerY);

    ctx.shadowColor = "#d4ff3d";
    ctx.shadowBlur = 8;
    ctx.fillText("\uf751", this.centerX, this.centerY);
    ctx.shadowBlur = 0;
  }
}

/* =========================================
   Main render function
   ========================================= */
function renderRadiiVisualAndTable(cacheRadii, fixes, stormName) {
  const section = document.querySelector(".radii-container .radii-section");
  if (!section) return;
  section.innerHTML = "";

  let largestR34 = 0;
  if (Array.isArray(fixes)) {
    for (const f of fixes) {
      const r = f?.r34;
      if (r) {
        for (const k of ["NE", "SE", "SW", "NW"]) {
          const v = Number(r[k]) || 0;
          if (v > largestR34) largestR34 = v;
        }
      }
    }
  }
  if (cacheRadii && cacheRadii.r34) {
    for (const k of ["NE", "SE", "SW", "NW"]) {
      const v = Number(cacheRadii.r34[k]) || 0;
      if (v > largestR34) largestR34 = v;
    }
  }
  let maxDist = Math.max(largestR34 + RADII_CONFIG.RADII_PADDING, RADII_CONFIG.MIN_RADII_EXTENT);

  const hours = collectForecastHours(fixes);
  const hourControls = document.createElement("div");
  hourControls.className = "radii-hour-controls";
  hourControls.setAttribute("role", "tablist");
  hourControls.innerHTML = hours
    .map((h, i) => {
      const label = h === 0 ? "Now" : `${h}h`;
      const cls = i === 0 ? "radii-hour-btn active" : "radii-hour-btn";
      return `<button class="${cls}" data-hour="${h}" role="tab" aria-selected="${i === 0
        }">${label}</button>`;
    })
    .join("");

  const controls = document.createElement("div");
  controls.className = "radii-controls";
  controls.innerHTML = `
      <button class="radii-btn active" data-wind="34">TS Winds</button>
      <button class="radii-btn" data-wind="50">Gale Force</button>
      <button class="radii-btn" data-wind="64">Hurricane</button>
      <button class="radii-btn" data-wind="all">All Winds</button>
    `;

  const compassWrap = document.createElement("div");
  compassWrap.className = "radii-compass-section";

  const canvasContainer = document.createElement("div");
  canvasContainer.className = "radii-compass";
  canvasContainer.innerHTML =
    '<canvas id="radiiCanvas" class="radii-canvas"></canvas>';
  compassWrap.appendChild(canvasContainer);

  const legend = document.createElement("div");
  legend.className = "radii-legend";
  legend.innerHTML = `
      <div class="legend-item"><div class="legend-color" id="radii-34"><span>34 kt - TS Force</span></div></div>
      <div class="legend-item"><div class="legend-color" id="radii-50"><span>50 kt - Strong TS</span></div></div>
      <div class="legend-item"><div class="legend-color" id="radii-64"><span>64 kt - Hurricane</span></div></div>
    `;

  const tableHost =
    document.getElementById("radii-table") || document.createElement("div");
  if (!document.getElementById("radii-table")) {
    tableHost.id = "radii-table";
    tableHost.className = "radii-table";
  }

  section.appendChild(hourControls);
  section.appendChild(controls);
  section.appendChild(compassWrap);
  section.appendChild(legend);
  section.appendChild(tableHost);

  const canvas = canvasContainer.querySelector("#radiiCanvas");
  const ctx = canvas.getContext("2d");

  function resizeCanvas() {
    canvas.style.width = "";
    canvas.style.height = "";

    const cs = window.getComputedStyle(compassWrap);
    const padX =
      (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    const padY =
      (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);

    const containerRect = canvasContainer.getBoundingClientRect();
    const availableWidth = containerRect.width || canvasContainer.clientWidth;
    const availableHeight =
      containerRect.height || canvasContainer.clientHeight || availableWidth;

    const viewportWidth = window.innerWidth;
    const maxSafeWidth = Math.min(
      viewportWidth * 0.9,
      RADII_CONFIG.CANVAS_MAX_PX
    );

    const cssSide = Math.min(maxSafeWidth, availableWidth, availableHeight);

    if (!cssSide || !isFinite(cssSide) || cssSide <= 0) return false;

    const finalSize = Math.max(200, cssSide);

    const dpr = devicePixelRatioSafe();
    canvas.style.width = finalSize + "px";
    canvas.style.height = finalSize + "px";
    canvas.width = Math.floor(finalSize * dpr);
    canvas.height = Math.floor(finalSize * dpr);
    return true;
  }

  let drawer = new RadiiDrawer(ctx, canvas, maxDist);

  function updateDrawerMaxDist(newMaxDist) {
    if (drawer) drawer.setMaxDist(newMaxDist);
  }

  if (!resizeCanvas()) {
  } else {
    drawer.draw();
  }

  function renderTable(rad) {
    if (!tableHost) return;
    if (!rad || allZeroOrMissing(rad)) {
      tableHost.innerHTML = `<div class="radii-empty muted">No wind radii data available for this hour.</div>`;
      return;
    }
    const safe = (n) => `${Number(n || 0)}nm`;
    const rows = [
      ["34 kt", rad.r34 || {}],
      ["50 kt", rad.r50 || {}],
      ["64 kt", rad.r64 || {}],
    ];
    tableHost.innerHTML = `
        <table class="radii-grid">
          <thead><tr><th>Wind</th><th>NE</th><th>SE</th><th>SW</th><th>NW</th></tr></thead>
          <tbody>
            ${rows
        .map(
          ([label, q]) => `
              <tr><td>${label}</td><td>${safe(q.NE)}</td><td>${safe(
            q.SE
          )}</td><td>${safe(q.SW)}</td><td>${safe(q.NW)}</td></tr>
            `
        )
        .join("")}
          </tbody>
        </table>`;
  }

  let selectedHour = hours[0] || 0;
  let selectedWind = "34";

  function updateForSelection() {
    const rad = radiiAtHour(cacheRadii, fixes, selectedHour);

    let largestR34Sel = 0;
    if (rad && rad.r34) {
      for (const k of ["NE", "SE", "SW", "NW"]) {
        const v = Number(rad.r34[k]) || 0;
        if (v > largestR34Sel) largestR34Sel = v;
      }
    }
    let newMaxDist = Math.max(largestR34Sel + RADII_CONFIG.RADII_PADDING, maxDist);
    updateDrawerMaxDist(newMaxDist);

    const has = {
      r34:
        !!rad &&
        ["NE", "SE", "SW", "NW"].some((k) => (rad.r34?.[k] || 0) > 0),
      r50:
        !!rad &&
        ["NE", "SE", "SW", "NW"].some((k) => (rad.r50?.[k] || 0) > 0),
      r64:
        !!rad &&
        ["NE", "SE", "SW", "NW"].some((k) => (rad.r64?.[k] || 0) > 0),
    };

    controls.querySelectorAll(".radii-btn").forEach((btn) => {
      const w = btn.getAttribute("data-wind");
      if (w === "34") btn.style.display = has.r34 ? "" : "none";
      if (w === "50") btn.style.display = has.r50 ? "" : "none";
      if (w === "64") btn.style.display = has.r64 ? "" : "none";
      if (w === "all")
        btn.style.display = has.r34 || has.r50 || has.r64 ? "" : "none";
    });

    const activeBtn = controls.querySelector(".radii-btn.active");
    if (activeBtn && activeBtn.style.display === "none") {
      const fallback = controls.querySelector(
        '.radii-btn:not([style*="display: none"])'
      );
      if (fallback) {
        controls
          .querySelectorAll(".radii-btn")
          .forEach((b) => b.classList.remove("active"));
        fallback.classList.add("active");
        selectedWind = fallback.getAttribute("data-wind");
      }
    }

    drawer.radiiData = rad;
    drawer.activeWind = selectedWind;
    drawer.draw();
    renderTable(rad);
  }

  hourControls.addEventListener("click", (e) => {
    const btn = e.target.closest(".radii-hour-btn");
    if (!btn) return;
    hourControls.querySelectorAll(".radii-hour-btn").forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    selectedHour = parseInt(btn.getAttribute("data-hour"), 10) || 0;
    updateForSelection();
  });

  controls.addEventListener("click", (e) => {
    const btn = e.target.closest(".radii-btn");
    if (!btn) return;
    controls
      .querySelectorAll(".radii-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    selectedWind = btn.getAttribute("data-wind");
    updateForSelection();
  });

  let resizeTimeout;
  function handleResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (resizeCanvas()) {
        drawer.draw();
      }
    }, 100);
  }

  window.addEventListener("resize", handleResize);

  section.__radiiRefresh = () => {
    setTimeout(() => {
      const ok = resizeCanvas();
      if (ok) drawer.draw();
    }, 50);
  };

  updateForSelection();
}

export const RadiiVisualization = {
  render: renderRadiiVisualAndTable,
};
