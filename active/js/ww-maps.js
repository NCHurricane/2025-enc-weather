/* eslint-disable no-undef */
import {
  WEATHER_BASEMAPS,
  installBasemapMenuControl,
} from '../../js/modules/interactiveWeatherMap.js?v=20260822-wmts-realearth-1';
// ============================================================================
// Watches & Warnings Maps Module (ww-maps.js)
// ---------------------------------------------------------------------------
// Purpose:
//   Renders the canvas-based hazards / surge map panels, loads tiled imagery,
//   basemap geometry, and decluttered place name labels with priority + zoom
//   based filtering.
//
// Key Concepts:
//   1. Tiles: Selected via TILE_STYLE and provided by TILE_PROVIDERS mapping.
//   2. Basemap: Simple GeoJSON (states / counties) drawn once per frame.
//   3. Place Names: Loaded from PLACENAMES_URL (array of objects with
//      { text, lon, lat, minZoom, priority }.)
//   4. Label Declutter: Simple O(N*M) collision check with early stop when
//      maxLabels (cap) reached.
//   5. Styling: Font sizes + colors driven by CSS custom properties so they
//      adapt to responsive breakpoints without JS changes.
//
// Quick Tuning Cheat Sheet:
//   Filtering / Visibility:
//     - CSS variable --map-label-min-priority controls lowest priority shown.
//       Adjust it in media queries (e.g. hide low priorities on small screens).
//     - Per label: data JSON field `priority` (1..10). Higher number = more
//       important (drawn first, larger font if CSS sizes increase).
//     - Zoom gating: Each place can define `minZoom` (numeric). A label is
//       drawn only when current `zoom >= minZoom` (after PLACENAMES_ZOOM_OFFSET).
//     - PLACENAMES_ZOOM_OFFSET: Add/subtract to minZoom to reveal labels earlier
//       or later without editing the data file.
//
//   Label Appearance (via CSS):
//     --map-label-priority-1 .. --map-label-priority-10  (font sizes, px)
//     --map-label-color-1    .. --map-label-color-10     (fill colors)
//     Change these in `active.css` (and its breakpoints) to globally adjust.
//     JS caches are invalidated automatically on width change; manual theme
//     switches can force:  _labelFontCache = _labelColorCache = null.
//
//   Label Caps (performance / clutter):
//     LABEL_DYNAMIC_CAP (boolean) enables per-zoom caps.
//     LABEL_ZOOM_CAPS: Map of integer zoom -> hard cap (e.g. {6:10,7:15,...}).
//     LABEL_MAX_PER_ZOOM: Absolute ceiling (safety upper bound).
//     To always use one fixed cap, set LABEL_DYNAMIC_CAP = false and adjust
//     LABEL_MAX_PER_ZOOM.
//
//   Debugging:
//     DEBUG_LABELS = true  -> logs counts (skipped by zoom / priority / drawn).
//     DEBUG_TILES   = true  -> outlines tile fetch rectangles & timing.
//
//   Tile / Basemap Adjustments:
//     TILE_STYLE selects provider key in TILE_PROVIDERS (imagery/topo/shaded/none).
//     TILE_MIN_Z / TILE_MAX_Z bound selectable tile zoom range.
//     Modify INSETS (PR / VI) to reposition inset boxes or add new ones.
//
//   Performance Tips:
//     - Reduce LABEL_MAX_PER_ZOOM or tighten LABEL_ZOOM_CAPS for slower devices.
//     - Lower LABEL_PADDING_PX to allow closer packing.
//     - Consider spatial indexing if label volume grows significantly.
//
// Steps To Change Filtering Behavior Quickly:
//   A) To hide low priorities <5 on phones: set in CSS @media(max-width: X){
//        [data-active-page] { --map-label-min-priority: 5; }
//      }
//   B) To reveal a subset only after zooming in: raise each place's `minZoom`.
//   C) To emphasize certain priorities: increase their CSS font sizes or colors.
//
// Data Requirements For Each Placename Entry:
//   {
//     "text": "City Name",  // string
//     "lon": -77.123,       // number (W negative)
//     "lat": 35.678,        // number
//     "minZoom": 7,         // number (optional, defaults to MIN_ZOOM_FOR_PLACENAMES)
//     "priority": 6         // 1..10 (optional -> defaults to 1)
//   }
//
// If a very different scale is needed (e.g. 1..5), adjust the loops that read
// font sizes / colors (currently 1..10) and corresponding CSS variable names.
// ============================================================================
// Module code begins
const DEFAULT_DOMAIN = { lonMin: -106, lonMax: -60, latMin: 18, latMax: 50 };
const DEBUG_LABELS = true;
// Dynamic base path for subdirectory support
const BASE_PATH = window.location.pathname.split('/active')[0] || '';
const BASEMAP_URL = `${BASE_PATH}/active/cache/us_states_counties.geojson`;

const INSETS = {
  PR: {
    lonMin: -67.6,
    lonMax: -65.1,
    latMin: 17.8,
    latMax: 18.6,
    x: 0.72,
    y: 0.7,
    w: 0.24,
    h: 0.22,
  },
  VI: {
    lonMin: -65.1,
    lonMax: -64.3,
    latMin: 17.6,
    latMax: 18.6,
    x: 0.88,
    y: 0.78,
    w: 0.1,
    h: 0.12,
  },
};

const LOCAL_IMAGERY_ROOT = `${BASE_PATH}/js/data/tiles/imagery`;
const LOCAL_IMAGERY_EXTS = ["jpg"];

const TILE_PROVIDERS = {
  imagery:
    `${BASE_PATH}/active/api/tiles.php?style=imagery&z={z}&y={y}&x={x}`,
  topo: `${BASE_PATH}/active/api/tiles.php?style=topo&z={z}&y={y}&x={x}`,
  shaded: `${BASE_PATH}/active/api/tiles.php?style=shaded&z={z}&y={y}&x={x}`,
  none: null,
};
const TILE_STYLE = "imagery";
const TILE_MIN_Z = 3;
const TILE_MAX_Z = 8;
const TILE_DPR_AWARE = false;
// Opacity for base map tiles only (0 = transparent, 1 = opaque)
const TILE_OPACITY = 0.85;

const DEBUG_TILES = false;
const TILE_CONCURRENCY = 6;

const _tileCache = new Map();
const _drawVersionByCanvas = new Map();

// Place names
const PLACENAMES_URL = `${BASE_PATH}/active/cache/coastal_placenames.json?v=` + Date.now();
const SHOW_PLACENAMES = true;
const MIN_ZOOM_FOR_PLACENAMES = 6;
const PLACENAMES_ZOOM_OFFSET = -1;

// Collision / label config
const LABEL_PADDING_PX = 4;
const LABEL_LINE_HEIGHT = 1.15;
const LABEL_MAX_PER_ZOOM = 120;
const LABEL_DYNAMIC_CAP = true;
const LABEL_ZOOM_CAPS = { 6: 10, 7: 15, 8: 30, 9: 40, 10: 60 };

// NEW: cached label font sizes (pulled from CSS custom properties)
let _labelFontCache = null;
let _labelFontCacheWidth = 0;
let _labelColorCache = null;

function activePageStyle() {
  const activePage = document.querySelector('[data-active-page]');
  return activePage ? getComputedStyle(activePage) : null;
}

function readLabelFontSizes() {
  const rootStyle = activePageStyle();
  const grab = (n, fallback) => {
    const v = parseFloat(
      rootStyle?.getPropertyValue(`--map-label-priority-${n}`).trim()
    );
    return Number.isFinite(v) ? v : fallback;
  };
  const arr = [];
  let last = 10; // fallback seed
  for (let i = 1; i <= 10; i++) {
    last = grab(i, last);
    arr[i] = last;
  }
  return arr;
}

function readLabelColors() {
  const rootStyle = activePageStyle();
  const arr = [];
  let last = "#ffffff";
  for (let i = 1; i <= 10; i++) {
    const raw = rootStyle?.getPropertyValue(`--map-label-color-${i}`).trim();
    last = raw || last;
    arr[i] = last;
  }
  return arr;
}

function getLabelFontSize(priority) {
  const w = window.innerWidth || 0;
  if (!_labelFontCache || _labelFontCacheWidth !== w) {
    _labelFontCache = readLabelFontSizes();
    _labelColorCache = readLabelColors();
    _labelFontCacheWidth = w;
  }
  const p = Math.max(1, Math.min(10, priority | 0));
  return _labelFontCache[p];
}

function getLabelColor(priority) {
  if (!_labelColorCache) _labelColorCache = readLabelColors();
  const p = Math.max(1, Math.min(10, priority | 0));
  return _labelColorCache[p];
}

// Optional local zone cache bust switch
const LOCAL_ZONE_CACHE_BUST = false;

let PLACENAMES = null;
let BASEMAP = null;

function tileUrlCandidates(style, z, x, y) {
  const urls = [];
  if (style === "imagery") {
    const localY = y;
    for (const ext of LOCAL_IMAGERY_EXTS) {
      urls.push(`${LOCAL_IMAGERY_ROOT}/${z}/${x}/${localY}.${ext}`);
    }
  }
  const tpl = TILE_PROVIDERS[style];
  if (tpl)
    urls.push(tpl.replace("{z}", z).replace("{x}", x).replace("{y}", y));
  return urls;
}

function getParam(name) {
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}

function mercY(latDeg) {
  const lat = (Math.PI / 180) * latDeg;
  return Math.log(Math.tan(Math.PI / 4 + lat / 2));
}

const MAX_LAT = 85.05112878;
function _clipLat(lat) {
  return Math.max(-MAX_LAT, Math.min(MAX_LAT, lat));
}
function lonToGlobalPx(lon, z) {
  const n = 256 * Math.pow(2, z);
  return ((lon + 180) / 360) * n;
}
function latToGlobalPx(lat, z) {
  const n = 256 * Math.pow(2, z);
  const s = Math.sin((_clipLat(lat) * Math.PI) / 180);
  const y = 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
  return y * n;
}

function chooseTileZoom(domain, rect) {
  const target = rect.w * 1.25;
  let best = TILE_MIN_Z;
  for (let z = TILE_MIN_Z; z <= TILE_MAX_Z; z++) {
    const gxMin = lonToGlobalPx(domain.lonMin, z);
    const gxMax = lonToGlobalPx(domain.lonMax, z);
    if (Math.abs(gxMax - gxMin) >= target) {
      best = z;
      break;
    }
  }
  try {
    if (TILE_DPR_AWARE && window.devicePixelRatio > 1) {
      best = Math.min(TILE_MAX_Z, best + 1);
    }
  } catch { }
  return Math.max(TILE_MIN_Z, Math.min(TILE_MAX_Z, best));
}

function ensureTile(style, z, x, y) {
  const key = `${style}|${z}|${x}|${y}`;
  const cached = _tileCache.get(key);
  if (cached) return Promise.resolve(cached);

  const candidates = tileUrlCandidates(style, z, x, y);
  if (!candidates.length) return Promise.resolve(null);

  return new Promise((resolve) => {
    const img = new Image();
    // Accept both absolute and BASE_PATH-prefixed URLs as local
    const isLocal = candidates.some((u) =>
      u.startsWith(BASE_PATH + "/js/") || u.startsWith(BASE_PATH + "/active/")
    );
    if (!isLocal) img.crossOrigin = "anonymous";
    img.decoding = "async";

    let i = 0;
    let timeoutId = null;

    const tryNext = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (i >= candidates.length) {
        if (DEBUG_TILES) console.warn("[ww] tile fail", { z, x, y });
        return resolve(null);
      }
      const url = candidates[i++];
      if (DEBUG_TILES) console.info("[ww] try", url);
      timeoutId = setTimeout(() => {
        img.onload = img.onerror = null;
        tryNext();
      }, 8000);
      img.src = url;
    };
    img.onload = () => {
      if (timeoutId) clearTimeout(timeoutId);
      _tileCache.set(key, img);
      if (DEBUG_TILES) console.info("[ww] loaded", img.src);
      resolve(img);
    };
    img.onerror = () => tryNext();
    tryNext();
  });
}

// -------- Map math --------
function project(lon, lat, domain, rect) {
  const dx = domain.lonMax - domain.lonMin;
  const dyMerc = mercY(domain.latMax) - mercY(domain.latMin);
  if (dx === 0 || dyMerc === 0) {
    return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
  }
  const x = (lon - domain.lonMin) / dx;
  const yNorm = (mercY(lat) - mercY(domain.latMin)) / dyMerc;
  return { x: rect.x + x * rect.w, y: rect.y + (1 - yNorm) * rect.h };
}

function resizeCanvasToContainer(canvas) {
  const parent = canvas.parentElement;
  const cw = parent.clientWidth;
  const ch = Math.round(cw * 0.625);
  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw;
    canvas.height = ch;
  }
  return { width: cw, height: ch };
}

// -------- Colors --------
function normalizeKey(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}
function buildColorIndex() {
  const idx = new Map();
  const wc = window.warningColors || {};
  for (const [k, v] of Object.entries(wc)) idx.set(normalizeKey(k), v);
  return idx;
}
const COLOR_IDX = buildColorIndex();

function labelForKey(code) {
  switch (code) {
    case "HU.W":
      return "Hurricane Warning";
    case "HU.A":
      return "Hurricane Watch";
    case "TR.W":
      return "Tropical Storm Warning";
    case "TR.A":
      return "Tropical Storm Watch";
    case "SS.W":
      return "Storm Surge Warning";
    case "SS.A":
      return "Storm Surge Watch";
    default:
      return code;
  }
}
function colorForKey(code) {
  const wc = window.warningColors || {};
  const label = labelForKey(code);
  if (typeof wc[code] === "string") return wc[code];
  if (typeof wc[label] === "string") return wc[label];
  const variants = [
    label.toUpperCase(),
    label.replace(/\s+/g, ""),
    label.replace(/\s+/g, "-"),
    label.toLowerCase(),
  ];
  for (const v of variants) if (typeof wc[v] === "string") return wc[v];
  const FALLBACKS = {
    "HU.W": wc["Hurricane Warning"] || "#DC143C",
    "HU.A": wc["Hurricane Watch"] || "#FFA500",
    "TR.W": wc["Tropical Storm Warning"] || "#FF7F50",
    "TR.A": wc["Tropical Storm Watch"] || "#FFD166",
    "SS.W": wc["Storm Surge Warning"] || "#8B008B",
    "SS.A": wc["Storm Surge Watch"] || "#DA70D6",
  };
  if (FALLBACKS[code]) return FALLBACKS[code];
  return "#999999";
}

// -------- Basemap --------
async function loadBasemap() {
  try {
    const res = await fetch(BASEMAP_URL, { cache: "force-cache" });
    if (!res.ok) return;
    BASEMAP = await res.json();
  } catch { }
}

// -------- Place Names --------
async function loadPlacenames() {
  if (!SHOW_PLACENAMES) return;
  try {
    const res = await fetch(PLACENAMES_URL, { cache: "force-cache" });
    if (!res.ok) return;
    PLACENAMES = await res.json();
  } catch { }
}

function drawBasemap(ctx, domain, rect) {
  if (!BASEMAP?.features?.length) return;
  ctx.save();
  ctx.lineWidth = 0.75;
  ctx.strokeStyle = "rgba(32,32,32,.5)";
  ctx.fillStyle = "transparent";
  for (const f of BASEMAP.features) {
    if (!f.geometry) continue;
    const polys =
      f.geometry.type === "Polygon"
        ? [f.geometry.coordinates]
        : f.geometry.coordinates;
    ctx.beginPath();
    for (const poly of polys) {
      for (const ring of poly) {
        ring.forEach((pt, i) => {
          const [lon, lat] = pt;
          const p = project(lon, lat, domain, rect);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}

function getMinLabelPriority() {
  const v = activePageStyle()
    ?.getPropertyValue("--map-label-min-priority")
    .trim();
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(10, Math.max(1, n)) : 1;
}

function drawPlacenames(ctx, domain, rect, zoom) {
  if (!SHOW_PLACENAMES || !PLACENAMES || zoom < MIN_ZOOM_FOR_PLACENAMES)
    return;

  let maxLabels = LABEL_MAX_PER_ZOOM;
  if (LABEL_DYNAMIC_CAP) {
    const zInt = Math.round(zoom); // normalize
    const capFromMap = LABEL_ZOOM_CAPS[zInt];
    if (DEBUG_LABELS) {
      console.log("[cap-debug]", {
        zoomRaw: zoom,
        zInt,
        keys: Object.keys(LABEL_ZOOM_CAPS),
        capFromMap,
      });
    }
    if (capFromMap != null) {
      maxLabels = capFromMap;
    } else {
      // fallback (adjust as needed)
      maxLabels = Math.min(
        LABEL_MAX_PER_ZOOM,
        40 + (zInt - MIN_ZOOM_FOR_PLACENAMES) * 25
      );
    }
  }

  const minP = getMinLabelPriority();

  let skippedZoom = 0,
    skippedPriority = 0,
    skippedInvalid = 0;
  const candidates = [];

  for (const place of PLACENAMES) {
    const { text, lat, lon, minZoom, priority = 1 } = place;

    // Basic numeric validation
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      skippedInvalid++;
      continue;
    }

    const effectiveMinZoom =
      (minZoom || MIN_ZOOM_FOR_PLACENAMES) + PLACENAMES_ZOOM_OFFSET;

    if (zoom < effectiveMinZoom) {
      skippedZoom++;
      continue;
    }
    if (priority < minP) {
      skippedPriority++;
      continue;
    }
    if (
      lon < domain.lonMin ||
      lon > domain.lonMax ||
      lat < domain.latMin ||
      lat > domain.latMax
    )
      continue;

    const p = project(lon, lat, domain, rect);
    if (
      !Number.isFinite(p.x) ||
      !Number.isFinite(p.y) ||
      p.x < rect.x ||
      p.x > rect.x + rect.w ||
      p.y < rect.y ||
      p.y > rect.y + rect.h
    )
      continue;

    candidates.push({
      x: p.x,
      y: p.y,
      fontSize: getLabelFontSize(priority),
      priority,
      text: (text || "").toUpperCase(),
    });
  }

  // Sort higher priority / larger first
  candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    if (b.fontSize !== a.fontSize) return b.fontSize - a.fontSize;
    return a.text.localeCompare(b.text);
  });

  if (DEBUG_LABELS) {
    console.log(
      `[labels] zoom=${zoom} cap=${maxLabels} minPriority=${minP} ` +
      `candidates=${candidates.length} (post-skip)`
    );
    console.log("[labels-filter-details]", {
      zoom,
      minP,
      skippedZoom,
      skippedPriority,
      skippedInvalid,
      kept: candidates.length,
    });
  }

  const accepted = [];
  const collides = (box) => {
    for (const a of accepted) {
      if (
        box.x2 >= a.x1 &&
        box.x1 <= a.x2 &&
        box.y2 >= a.y1 &&
        box.y1 <= a.y2
      )
        return true;
    }
    return false;
  };

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.lineWidth = 2;

  for (const c of candidates) {
    if (accepted.length >= maxLabels) break;
    ctx.font = `${c.fontSize}px Arial, sans-serif`;
    const metrics = ctx.measureText(c.text);
    const w = metrics.width || c.text.length * (c.fontSize * 0.6);
    const h = c.fontSize * LABEL_LINE_HEIGHT;
    const box = {
      x1: c.x - w / 2 - LABEL_PADDING_PX,
      y1: c.y - h / 2 - LABEL_PADDING_PX,
      x2: c.x + w / 2 + LABEL_PADDING_PX,
      y2: c.y + h / 2 + LABEL_PADDING_PX,
    };
    if (collides(box)) continue;
    accepted.push(box);
    ctx.strokeStyle = "rgba(0,0,0,0.75)";
    ctx.fillStyle = getLabelColor(c.priority);
    ctx.strokeText(c.text, c.x, c.y);
    ctx.fillText(c.text, c.x, c.y);
  }
  ctx.restore();
}

async function fetchZoneFeature(zoneId, zoneType) {
  const cacheParam = LOCAL_ZONE_CACHE_BUST ? `?v=${Date.now()}` : "";
  const localUrl = `${BASE_PATH}/active/cache/zones/${zoneId}.json${cacheParam}`;
  try {
    const r = await fetch(localUrl, {
      cache: LOCAL_ZONE_CACHE_BUST ? "no-cache" : "force-cache",
    });
    if (r.ok) return r.json();
  } catch { }
  const nwsUrl = `https://api.weather.gov/zones/${zoneType}/${zoneId}`;
  try {
    const r = await fetch(nwsUrl, {
      headers: {
        Accept: "application/geo+json, application/json;q=0.9",
        "User-Agent": "NCHurricane/TCVViewer (https://nchurricane.com)",
      },
    });
    if (!r.ok) return null;
    const json = await r.json();
    if (!json.geometry) return null;
    return {
      type: "Feature",
      id: zoneId,
      geometry: json.geometry,
      properties: {
        zoneName: json?.properties?.name || zoneId,
        state: json?.properties?.state || null,
      },
    };
  } catch {
    return null;
  }
}

async function buildFeaturesFromEvents(events) {
  const out = [];
  const byZone = new Map();
  for (const ev of events) {
    const key = ev.zoneId;
    if (!byZone.has(key))
      byZone.set(key, { zoneType: ev.zoneType || "forecast" });
  }
  for (const [zoneId, meta] of byZone) {
    const f = await fetchZoneFeature(zoneId, meta.zoneType);
    if (f) byZone.set(zoneId, { ...meta, feature: f });
  }
  for (const ev of events) {
    const base = byZone.get(ev.zoneId);
    const f = base?.feature;
    if (!f) continue;
    out.push({
      type: "Feature",
      id: ev.zoneId,
      geometry: f.geometry,
      properties: {
        zoneName: ev.zoneName || f.properties.zoneName || ev.zoneId,
        state: ev.state || f.properties.state || null,
        phen: ev.phen,
        sig: ev.sig,
        hazard: ev.hazard,
      },
    });
  }
  return { type: "FeatureCollection", features: out };
}

function flattenRings(geom) {
  const out = [];
  if (!geom || !geom.type) return out;
  switch (geom.type) {
    case "Polygon":
      if (Array.isArray(geom.coordinates)) out.push(geom.coordinates);
      break;
    case "MultiPolygon":
      if (Array.isArray(geom.coordinates))
        for (const poly of geom.coordinates) out.push(poly);
      break;
    case "GeometryCollection":
      if (Array.isArray(geom.geometries))
        for (const g of geom.geometries)
          for (const poly of flattenRings(g)) out.push(poly);
      break;
    default:
      break;
  }
  return out;
}

function drawFeatures(ctx, features, domain, rect, keysInOrder) {
  for (const key of keysInOrder) {
    const color = colorForKey(key);
    for (const f of features) {
      const k = `${f.properties.phen}.${f.properties.sig}`;
      if (k !== key) continue;

      const polys = flattenRings(f.geometry);
      if (!polys.length) continue;

      ctx.beginPath();
      for (const poly of polys) {
        for (const ring of poly) {
          if (!Array.isArray(ring)) continue;
          for (let i = 0; i < ring.length; i++) {
            const [lon, lat] = ring[i];
            const p = project(lon, lat, domain, rect);
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          }
          ctx.closePath();
        }
      }
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.6;
      try {
        ctx.fill("evenodd");
      } catch {
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = 0.75;
      ctx.strokeStyle = "#202020";
      ctx.stroke();
    }
  }
}

function bboxOfFeatures(features) {
  let lonMin = Infinity,
    lonMax = -Infinity,
    latMin = Infinity,
    latMax = -Infinity,
    count = 0;
  const push = (lon, lat) => {
    const x = Number(lon),
      y = Number(lat);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    lonMin = Math.min(lonMin, x);
    lonMax = Math.max(lonMax, x);
    latMin = Math.min(latMin, y);
    latMax = Math.max(latMax, y);
    count++;
  };
  for (const f of features) {
    const polys = flattenRings(f?.geometry);
    for (const poly of polys)
      for (const ring of poly)
        for (const pt of ring)
          if (Array.isArray(pt) && pt.length >= 2) push(pt[0], pt[1]);
  }
  if (
    !count ||
    !Number.isFinite(lonMin) ||
    !Number.isFinite(lonMax) ||
    !Number.isFinite(latMin) ||
    !Number.isFinite(latMax)
  )
    return null;
  const lonPad = Math.max(1, (lonMax - lonMin) * 0.06);
  const latPad = Math.max(0.5, (latMax - latMin) * 0.06);
  return {
    lonMin: Math.max(DEFAULT_DOMAIN.lonMin, lonMin - lonPad),
    lonMax: Math.min(DEFAULT_DOMAIN.lonMax, lonMax + lonPad),
    latMin: Math.max(DEFAULT_DOMAIN.latMin, latMin - latPad),
    latMax: Math.min(DEFAULT_DOMAIN.latMax, latMax + latPad),
  };
}

function isHidden(node) {
  if (!node) return true;
  if (node.offsetParent === null) return true;
  if (node.closest("[hidden]")) return true;
  return false;
}

// -------- Refactored tile layer (reduced overdraw) --------
async function drawTilesLayer(
  ctx,
  domain,
  rect,
  features,
  hazard,
  version,
  canvasKey
) {
  if (!TILE_PROVIDERS[TILE_STYLE]) return;

  const z = chooseTileZoom(domain, rect);

  const gxMin = lonToGlobalPx(domain.lonMin, z);
  const gxMax = lonToGlobalPx(domain.lonMax, z);
  const gyMin = Math.min(
    latToGlobalPx(domain.latMax, z),
    latToGlobalPx(domain.latMin, z)
  );
  const gyMax = Math.max(
    latToGlobalPx(domain.latMax, z),
    latToGlobalPx(domain.latMin, z)
  );

  const x0 = Math.floor(gxMin / 256);
  const x1 = Math.floor((gxMax - 1) / 256);
  const y0 = Math.floor(gyMin / 256);
  const y1 = Math.floor((gyMax - 1) / 256);

  const mapX = (px) => rect.x + ((px - gxMin) / (gxMax - gxMin)) * rect.w;
  const mapY = (py) => rect.y + ((py - gyMin) / (gyMax - gyMin)) * rect.h;

  // Offscreen tile buffer to avoid repeatedly repainting overlays
  const tileCanvas = document.createElement("canvas");
  tileCanvas.width = ctx.canvas.width;
  tileCanvas.height = ctx.canvas.height;
  const tctx = tileCanvas.getContext("2d");

  const tiles = [];
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      tiles.push({ tx, ty });
    }
  }

  let overlayRaf = null;
  let overlayDirty = false;

  const all = (features?.features ?? []).filter(
    (f) => f?.properties?.hazard === hazard
  );
  const keysOrder =
    hazard === "wind" ? ["HU.A", "TR.A", "HU.W", "TR.W"] : ["SS.A", "SS.W"];
  const zoomForLabels = z;

  const renderOverlays = () => {
    if (version !== _drawVersionByCanvas.get(canvasKey)) return;
    overlayRaf = null;
    overlayDirty = false;
    ctx.clearRect(rect.x, rect.y, rect.w, rect.h);
    // Draw tiles with separate opacity so overlays stay fully opaque
    if (TILE_OPACITY >= 1) {
      ctx.drawImage(tileCanvas, rect.x, rect.y);
    } else if (TILE_OPACITY > 0) {
      ctx.save();
      ctx.globalAlpha = TILE_OPACITY;
      ctx.drawImage(tileCanvas, rect.x, rect.y);
      ctx.restore();
    }
    drawBasemap(ctx, domain, rect);
    drawFeatures(ctx, all, domain, rect, keysOrder);
    drawPlacenames(ctx, domain, rect, zoomForLabels);
  };

  const scheduleOverlay = () => {
    if (overlayDirty) return;
    overlayDirty = true;
    overlayRaf = requestAnimationFrame(renderOverlays);
  };

  // Concurrency-limited loader
  let index = 0;
  async function worker() {
    while (index < tiles.length) {
      const i = index++;
      const { tx, ty } = tiles[i];
      if (version !== _drawVersionByCanvas.get(canvasKey)) return;

      const img = await ensureTile(TILE_STYLE, z, tx, ty);
      if (!img || version !== _drawVersionByCanvas.get(canvasKey)) return;

      const px0 = tx * 256,
        py0 = ty * 256;
      const px1 = px0 + 256,
        py1 = py0 + 256;
      const cx0 = mapX(px0),
        cy0 = mapY(py0);
      const cx1 = mapX(px1),
        cy1 = mapY(py1);
      const dx = cx1 - cx0,
        dy = cy1 - cy0;
      tctx.drawImage(img, cx0, cy0, dx, dy);

      scheduleOverlay();
    }
  }
  const workers = [];
  for (let i = 0; i < TILE_CONCURRENCY; i++) workers.push(worker());
  await Promise.all(workers);

  // Final overlay ensure (in case no tiles or all loaded before RAF)
  if (version === _drawVersionByCanvas.get(canvasKey)) {
    if (overlayRaf) cancelAnimationFrame(overlayRaf);
    renderOverlays();
  }
}

function drawPanel(canvasId, featureCollection, hazard) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || isHidden(canvas)) return;

  const { width, height } = resizeCanvasToContainer(canvas);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);

  const all =
    featureCollection?.features?.filter(
      (f) => f?.properties?.hazard === hazard
    ) ?? [];

  const rectMain = { x: 0, y: 0, w: width, h: height };

  const pr = all.filter((f) => f.properties.state === "PR");
  const vi = all.filter((f) => f.properties.state === "VI");
  const fitFeatures =
    pr.length || vi.length
      ? all.filter(
        (f) => f.properties.state !== "PR" && f.properties.state !== "VI"
      )
      : all;

  const auto = bboxOfFeatures(fitFeatures) || DEFAULT_DOMAIN;

  const prev = _drawVersionByCanvas.get(canvasId) || 0;
  const version = prev + 1;
  _drawVersionByCanvas.set(canvasId, version);

  // Initial fast overlay (vectors + labels) before tiles arrive
  drawBasemap(ctx, auto, rectMain);
  const keysOrder =
    hazard === "wind" ? ["HU.A", "TR.A", "HU.W", "TR.W"] : ["SS.A", "SS.W"];
  drawFeatures(ctx, all, auto, rectMain, keysOrder);
  const currentZoom = chooseTileZoom(auto, rectMain);
  if (DEBUG_LABELS) console.log(`[tiles] chosenTileZoom=${currentZoom}`);
  drawPlacenames(ctx, auto, rectMain, currentZoom);

  // Start tiles (async incremental, will repaint overlays efficiently)
  drawTilesLayer(
    ctx,
    auto,
    rectMain,
    featureCollection,
    hazard,
    version,
    canvasId
  );

  function insetRect(box) {
    return {
      x: Math.round(box.x * width),
      y: Math.round(box.y * height),
      w: Math.round(box.w * width),
      h: Math.round(box.h * height),
    };
  }

  if (pr.length) {
    const box = INSETS.PR;
    drawFeatures(
      ctx,
      pr,
      {
        lonMin: box.lonMin,
        lonMax: box.lonMax,
        latMin: box.latMin,
        latMax: box.latMax,
      },
      insetRect(box),
      keysOrder
    );
    const r = insetRect(box);
    ctx.strokeStyle = "#666";
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  }
  if (vi.length) {
    const box = INSETS.VI;
    drawFeatures(
      ctx,
      vi,
      {
        lonMin: box.lonMin,
        lonMax: box.lonMax,
        latMin: box.latMin,
        latMax: box.latMax,
      },
      insetRect(box),
      keysOrder
    );
    const r = insetRect(box);
    ctx.strokeStyle = "#666";
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  }
}

function hexToRgb(hex) {
  if (!hex) return null;
  let h = hex.trim();
  if (h[0] === "#") h = h.slice(1);
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function readableTextColor(bgHex) {
  const rgb = hexToRgb(bgHex);
  if (!rgb) return "#000";
  const srgb = ["r", "g", "b"].map((k) => {
    const v = rgb[k] / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  const L = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  return L > 0.5 ? "#111" : "#fff";
}

const ALERT_MAPS = new Map();
let alertFeatureCollection = null;

function alertKey(feature) {
  const properties = feature?.properties || {};
  return `${properties.phen || ''}.${properties.sig || ''}`;
}

function alertMapId(hazard) {
  return hazard === 'surge' ? 'ww-surge-map' : 'ww-wind-map';
}

function alertPopup(feature) {
  const properties = feature?.properties || {};
  const key = alertKey(feature);
  const wrapper = document.createElement('div');
  wrapper.className = 'ww-alert-popup';
  const title = document.createElement('strong');
  title.textContent = labelForKey(key);
  const location = document.createElement('span');
  location.textContent = [properties.zoneName, properties.state].filter(Boolean).join(', ');
  wrapper.append(title, location);
  return wrapper;
}

function ensureAlertMap(hazard) {
  const mapId = alertMapId(hazard);
  if (ALERT_MAPS.has(mapId)) return ALERT_MAPS.get(mapId);
  const container = document.getElementById(mapId);
  if (!container || !window.L) return null;
  try {
    const map = window.L.map(container, {
      preferCanvas: true,
      zoomControl: true,
      attributionControl: true,
    });
    map.setView([27, -80], 4, { animate: false });
    const basemapLayers = new Map();
    for (const [id, config] of Object.entries(WEATHER_BASEMAPS)) {
      const layer = window.L.tileLayer(config.url, {
        attribution: config.attribution,
        maxZoom: config.maxZoom || 20,
        subdomains: config.subdomains || 'abc',
      });
      basemapLayers.set(id, layer);
    }
    (basemapLayers.get('esri') || basemapLayers.values().next().value)?.addTo(map);
    installBasemapMenuControl({
      leaflet: window.L,
      map,
      basemaps: WEATHER_BASEMAPS,
      initialBasemap: 'esri',
      position: 'topleft',
      onSelect: (basemapId) => {
        const nextLayer = basemapLayers.get(basemapId);
        if (!nextLayer) return false;
        for (const layer of basemapLayers.values()) {
          if (layer !== nextLayer && map.hasLayer(layer)) map.removeLayer(layer);
        }
        if (!map.hasLayer(nextLayer)) nextLayer.addTo(map);
        return true;
      },
    });
    const state = { map, layer: null, bounds: null };
    ALERT_MAPS.set(mapId, state);
    return state;
  } catch (error) {
    console.warn('[active-alert-map] Unable to initialize Leaflet:', error);
    container.dataset.alertMapError = error instanceof Error ? error.message : String(error);
    return null;
  }
}

function renderLeafletPanel(hazard) {
  const container = document.getElementById(alertMapId(hazard));
  const features = alertFeatureCollection?.features?.filter(
    (feature) => feature?.properties?.hazard === hazard
  ) || [];
  if (!features.length) return false;
  const state = ensureAlertMap(hazard);
  if (!state) return false;
  if (state.layer) state.map.removeLayer(state.layer);
  try {
    state.layer = window.L.geoJSON({ type: 'FeatureCollection', features }, {
      renderer: window.L.canvas({ padding: 0.35 }),
      style: (feature) => {
        const color = colorForKey(alertKey(feature));
        return { color, fillColor: color, weight: 2, opacity: 0.95, fillOpacity: 0.3 };
      },
      onEachFeature: (feature, layer) => {
        layer.bindPopup(alertPopup(feature), { maxWidth: 280 });
        layer.on({
          mouseover: () => layer.setStyle?.({ weight: 3, fillOpacity: 0.44 }),
          mouseout: () => state.layer?.resetStyle?.(layer),
        });
      },
    }).addTo(state.map);
    if (container) {
      delete container.dataset.alertMapError;
    }
  } catch (error) {
    console.warn('[active-alert-map] Unable to render alert polygons:', error);
    if (container) container.dataset.alertMapError = error instanceof Error ? error.message : String(error);
    return false;
  }
  state.bounds = state.layer.getBounds();
  window.setTimeout(() => {
    state.map.invalidateSize({ pan: false });
    if (state.bounds?.isValid?.()) {
      state.map.fitBounds(state.bounds.pad(0.08), { animate: false, maxZoom: 8 });
    }
  }, 0);
  return true;
}

function visibleAlertHazard() {
  return document.querySelector('[data-alert-tab][aria-selected="true"]')?.dataset.alertTab || 'wind';
}

function activateAlertTab(requested, { focus = false } = {}) {
  const allTabs = Array.from(document.querySelectorAll('[data-alert-tab]'));
  const tabs = allTabs.filter((tab) => !tab.hidden);
  const selected = tabs.find((tab) => tab.dataset.alertTab === requested) || tabs[0];
  if (!selected) return false;
  for (const tab of allTabs) {
    const active = tab === selected;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  }
  document.querySelectorAll('[data-alert-panel]').forEach((panel) => {
    const active = panel.dataset.alertPanel === selected.dataset.alertTab;
    panel.hidden = !active;
    panel.setAttribute('aria-hidden', String(!active));
  });
  if (focus) selected.focus();
  if (!document.getElementById('storm-panel-alerts')?.hidden) {
    renderLeafletPanel(selected.dataset.alertTab);
  }
  return true;
}

function bindAlertTabs() {
  const tabs = Array.from(document.querySelectorAll('[data-alert-tab]'));
  for (const tab of tabs) {
    tab.addEventListener('click', () => activateAlertTab(tab.dataset.alertTab));
    tab.addEventListener('keydown', (event) => {
      const visible = tabs.filter((candidate) => !candidate.hidden);
      const index = visible.indexOf(tab);
      let next = null;
      if (event.key === 'ArrowRight') next = (index + 1) % visible.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + visible.length) % visible.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = visible.length - 1;
      if (next === null || index < 0) return;
      event.preventDefault();
      activateAlertTab(visible[next].dataset.alertTab, { focus: true });
    });
  }
}

function configureAlertTabs(hasWind, hasSurge) {
  const windTab = document.querySelector('[data-alert-tab="wind"]');
  const surgeTab = document.querySelector('[data-alert-tab="surge"]');
  if (windTab) windTab.hidden = !hasWind;
  if (surgeTab) surgeTab.hidden = !hasSurge;
  activateAlertTab(hasWind ? 'wind' : 'surge');
}

function renderTextList(containerId, displaySection, emptyMsg) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = "";
  if (!displaySection || !displaySection.length) {
    const p = document.createElement("p");
    p.textContent = emptyMsg;
    p.id = `${containerId}-empty`;
    el.appendChild(p);
    return;
  }
  for (const block of displaySection) {
    const h = document.createElement("div");
    h.className = "ww-block";
    const title = document.createElement("div");
    title.className = "ww-block-title";
    title.textContent = block.label;
    const bg = colorForKey(block.key);
    const fg = readableTextColor(bg);
    title.style.setProperty('--ww-alert-color', bg);
    title.style.setProperty('--ww-alert-text', fg);
    h.appendChild(title);
    const list = document.createElement("ul");
    for (const st of block.states) {
      const stCode = st.state && st.state !== "UNK" ? st.state : "—";
      const zones = st.zones.join(", ");
      const li = document.createElement("li");
      const stateCode = document.createElement('strong');
      stateCode.className = 'ww-state-code';
      stateCode.textContent = stCode;
      const zoneList = document.createElement('span');
      zoneList.className = 'ww-zone-list';
      zoneList.textContent = zones;
      li.append(stateCode, zoneList);
      list.appendChild(li);
    }
    h.appendChild(list);
    el.appendChild(h);
  }
}

async function loadJSON(url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function init() {
  const stormId = getParam("storm");
  if (!stormId) return;

  bindAlertTabs();
  window.addEventListener('nch:active-workspace-panel-change', (event) => {
    if (event?.detail?.group === 'storm' && event?.detail?.panel === 'alerts') {
      renderLeafletPanel(visibleAlertHazard());
    }
  });

  try {
    const url = `${BASE_PATH}/active/storms/${stormId}/tcv.json?v=${Date.now()}`;

    const data = await loadJSON(url);

    if (
      !data.features ||
      !Array.isArray(data.features.features) ||
      data.features.features.length === 0
    ) {
      data.features = await buildFeaturesFromEvents(data.events || []);
    }

    // Hide containers if no feature data is present, show them otherwise.
    const windFeatures = data.features?.features?.filter(f => f.properties.hazard === 'wind') ?? [];
    const surgeFeatures = data.features?.features?.filter(f => f.properties.hazard === 'surge') ?? [];
    const hasWind = windFeatures.length > 0;
    const hasSurge = surgeFeatures.length > 0;
    alertFeatureCollection = data.features;

    configureAlertTabs(hasWind, hasSurge);
    window.dispatchEvent(new CustomEvent('nch:active-alerts-state', {
      detail: { hasWind, hasSurge },
    }));

    renderTextList(
      "ww-wind-text",
      data.display?.wind,
      "No active US watches/warnings."
    );
    renderTextList(
      "ww-surge-text",
      data.display?.surge,
      "No active US watches/warnings."
    );

    if (!document.getElementById('storm-panel-alerts')?.hidden) {
      renderLeafletPanel(visibleAlertHazard());
    }
  } catch {
    renderTextList("ww-wind-text", null, "No active US watches/warnings.");
    renderTextList("ww-surge-text", null, "No active US watches/warnings.");
    configureAlertTabs(false, false);
    window.dispatchEvent(new CustomEvent('nch:active-alerts-state', {
      detail: { hasWind: false, hasSurge: false },
    }));
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
