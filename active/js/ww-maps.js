// =============================
// Active Storm Page Alert Maps Module - ww-maps.js
// Reads advisory.json and storm.json from cache and renders the data to the page.
//
// Products Rendered:
// - Storm Alert Map
// - Storm Surge Alert Map
//
// ==============================

(() => {
  const DEFAULT_DOMAIN = { lonMin: -106, lonMax: -60, latMin: 18, latMax: 50 };

  const BASEMAP_URL =
    "/2025_weather/js/data/basemaps/us_states_counties.geojson";

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

  const LOCAL_IMAGERY_ROOT = "/2025_weather/js/data/tiles/imagery";
  const LOCAL_IMAGERY_EXTS = ["jpg"];

  const TILE_PROVIDERS = {
    imagery:
      "/2025_weather/active/api/tiles.php?style=imagery&z={z}&y={y}&x={x}",
    topo: "/2025_weather/active/api/tiles.php?style=topo&z={z}&y={y}&x={x}",
    shaded: "/2025_weather/active/api/tiles.php?style=shaded&z={z}&y={y}&x={x}",
    none: null,
  };

  const TILE_STYLE = "imagery";

  const TILE_MIN_Z = 5;
  const TILE_MAX_Z = 7;
  const TILE_DPR_AWARE = false;

  const _tileCache = new Map();
  const _drawVersionByCanvas = new Map();

  const PLACENAMES_URL = "/2025_weather/js/data/placenames.json";
  const SHOW_PLACENAMES = true;
  const MIN_ZOOM_FOR_PLACENAMES = 6;
  const PLACENAMES_ZOOM_OFFSET = -1;

  let PLACENAMES = null;

  function tileUrlCandidates(style, z, x, y) {
    const urls = [];

    if (style === "imagery") {
      const localY = y;
      for (const ext of LOCAL_IMAGERY_EXTS) {
        urls.push(`${LOCAL_IMAGERY_ROOT}/${z}/${x}/${localY}.jpg`);
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
    let best = 6;

    for (let z = TILE_MIN_Z; z <= TILE_MAX_Z; z++) {
      const gxMin = lonToGlobalPx(domain.lonMin, z);
      const gxMax = lonToGlobalPx(domain.lonMax, z);
      const widthPx = Math.abs(gxMax - gxMin);
      if (widthPx >= target) {
        best = z;
        break;
      }
    }

    try {
      if (
        TILE_DPR_AWARE &&
        typeof window !== "undefined" &&
        window.devicePixelRatio > 1
      ) {
        best = Math.min(TILE_MAX_Z, best + 1);
      }
    } catch (e) {
    }

    return Math.max(TILE_MIN_Z, Math.min(TILE_MAX_Z, best));
  }

  function _tileKey(style, z, x, y) {
    return `${style}|${z}|${x}|${y}`;
  }

  function ensureTile(style, z, x, y) {
    const key = `${style}|${z}|${x}|${y}`;
    const cached = _tileCache.get(key);
    if (cached) return Promise.resolve(cached);

    const candidates = tileUrlCandidates(style, z, x, y);

    if (!candidates.length) return Promise.resolve(null);

    return new Promise((resolve) => {
      const img = new Image();
      const isLocal = candidates.some((url) =>
        url.startsWith("/2025_weather/")
      );
      if (!isLocal) {
        img.crossOrigin = "anonymous";
      }
      img.decoding = "async";

      let i = 0;
      let timeoutId = null;

      const tryNext = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (i >= candidates.length) {
          console.warn("[ww] tile fail (all candidates)", {
            z,
            x,
            y,
            candidates,
          });
          return resolve(null);
        }

        const url = candidates[i++];
        console.info("[ww] try", url);

        timeoutId = setTimeout(() => {
          console.warn("[ww] timeout loading", url);
          img.onload = null;
          img.onerror = null;
          tryNext();
        }, 10000);

        img.src = url;
      };

      img.onload = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        console.info("[ww] loaded", img.src);
        _tileCache.set(key, img);
        resolve(img);
      };

      img.onerror = (e) => {
        console.error("[ww] load error", img.src, e);
        tryNext();
      };

      tryNext();
    });
  }

  async function drawTilesLayer(
    ctx,
    domain,
    rect,
    features,
    hazard,
    version,
    canvasKey
  ) {
    console.info("[ww] drawTilesLayer called", {
      style: TILE_STYLE,
      hasProvider: !!TILE_PROVIDERS[TILE_STYLE],
    });
    const style = TILE_STYLE;
    if (!TILE_PROVIDERS[style]) return;

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

    const keysOrder =
      hazard === "wind" ? ["HU.A", "TR.A", "HU.W", "TR.W"] : ["SS.A", "SS.W"];

    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (version !== _drawVersionByCanvas.get(canvasKey)) return;

        console.info(
          "[ww] first-candidate",
          tileUrlCandidates(TILE_STYLE, z, tx, ty)[0]
        );

        const img = await ensureTile(style, z, tx, ty);
        if (!img) continue;
        if (version !== _drawVersionByCanvas.get(canvasKey)) return;

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

        ctx.drawImage(img, cx0, cy0, dx, dy);

        drawBasemap(ctx, domain, rect);
        const all = (features?.features ?? []).filter(
          (f) => f?.properties?.hazard === hazard
        );
        drawFeatures(ctx, all, domain, rect, keysOrder);

        drawPlacenames(ctx, domain, rect, z);

        const pr = all.filter((f) => f.properties.state === "PR");
        const vi = all.filter((f) => f.properties.state === "VI");

        const fitFeatures =
          pr.length || vi.length
            ? all.filter(
                (f) =>
                  f.properties.state !== "PR" && f.properties.state !== "VI"
              )
            : all;

        const auto = bboxOfFeatures(fitFeatures) || DEFAULT_DOMAIN;
        drawFeatures(ctx, all, domain, rect, keysOrder);

        drawPlacenames(ctx, auto, rect, z);
      }
    }
  }

  function project(lon, lat, domain, rect) {
    const x = (lon - domain.lonMin) / (domain.lonMax - domain.lonMin);
    const yNorm =
      (mercY(lat) - mercY(domain.latMin)) /
      (mercY(domain.latMax) - mercY(domain.latMin));
    return { x: rect.x + x * rect.w, y: rect.y + (1 - yNorm) * rect.h };
  }

  function resizeCanvasToContainer(canvas) {
    const parent = canvas.parentElement;
    const cw = parent.clientWidth;
    const isNarrow = cw < 600;
    const ch = Math.round(cw * (isNarrow ? 1.0 : 0.625));
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
    return { width: cw, height: ch };
  }

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
    for (const v of variants) {
      if (typeof wc[v] === "string") return wc[v];
    }

    const FALLBACKS = {
      "HU.W": wc["Hurricane Warning"] || "#DC143C",
      "HU.A": wc["Hurricane Watch"] || "#FFA500",
      "TR.W": wc["Tropical Storm Warning"] || "#FF7F50",
      "TR.A": wc["Tropical Storm Watch"] || "#FFD166",
      "SS.W": wc["Storm Surge Warning"] || "#8B008B",
      "SS.A": wc["Storm Surge Watch"] || "#DA70D6",
    };
    if (FALLBACKS[code]) return FALLBACKS[code];

    console.warn("Missing color for", code, "— using fallback");
    return "#999999";
  }

  let BASEMAP = null;
  async function loadBasemap() {
    try {
      const res = await fetch(BASEMAP_URL, { cache: "force-cache" });
      if (!res.ok) return;
      BASEMAP = await res.json();
    } catch (_) {
      /* ignore */
    }
  }

  async function loadPlacenames() {
    if (!SHOW_PLACENAMES) return;
    try {
      const res = await fetch(PLACENAMES_URL, { cache: "force-cache" });
      if (!res.ok) return;
      PLACENAMES = await res.json();
      console.info("[ww] loaded", PLACENAMES?.length || 0, "place names");
    } catch (err) {
      console.warn("[ww] failed to load place names:", err);
    }
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

  function drawPlacenames(ctx, domain, rect, zoom) {
    if (!SHOW_PLACENAMES || !PLACENAMES || zoom < MIN_ZOOM_FOR_PLACENAMES) return;

    ctx.save();
    ctx.font = "12px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#c3ff00ff";
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.lineWidth = 1;

    for (const place of PLACENAMES) {
      const { text, lat, lon, minZoom, priority } = place;
      
      const effectiveMinZoom = (minZoom || MIN_ZOOM_FOR_PLACENAMES) + PLACENAMES_ZOOM_OFFSET;
      
      if (zoom < effectiveMinZoom) continue;
      
      if (lon < domain.lonMin || lon > domain.lonMax || 
          lat < domain.latMin || lat > domain.latMax) continue;

      const p = project(lon, lat, domain, rect);
      
      if (p.x < 0 || p.x > rect.w || p.y < 0 || p.y > rect.h) continue;

      const fontSize = priority >= 15 ? 14 : priority >= 10 ? 12 : 10;
      ctx.font = `${fontSize}px Arial, sans-serif`;

      const displayText = text.toUpperCase();

      ctx.strokeText(displayText, p.x, p.y);
      ctx.fillText(displayText, p.x, p.y);
    }
    ctx.restore();
  }

  async function fetchZoneFeature(zoneId, zoneType) {
    const localUrl = `/2025_weather/js/data/zones/cache/${zoneId}.json?v=${Date.now()}`;
    try {
      const r = await fetch(localUrl, { cache: "no-cache" });
      if (r.ok) return r.json();
    } catch {}

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
      case "Polygon": {
        if (Array.isArray(geom.coordinates)) out.push(geom.coordinates);
        break;
      }
      case "MultiPolygon": {
        if (Array.isArray(geom.coordinates)) {
          for (const poly of geom.coordinates) out.push(poly);
        }
        break;
      }
      case "GeometryCollection": {
        const geoms = Array.isArray(geom.geometries) ? geom.geometries : [];
        for (const g of geoms) {
          for (const poly of flattenRings(g)) out.push(poly);
        }
        break;
      }
      default:
        break;
    }
    return out;
  }

  // -------- Feature drawing --------
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
      latMax = -Infinity;
    let count = 0;

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
      for (const poly of polys) {
        for (const ring of poly) {
          for (const pt of ring) {
            if (!Array.isArray(pt) || pt.length < 2) continue;
            push(pt[0], pt[1]);
          }
        }
      }
    }

    if (
      !count ||
      !Number.isFinite(lonMin) ||
      !Number.isFinite(lonMax) ||
      !Number.isFinite(latMin) ||
      !Number.isFinite(latMax)
    ) {
      return null;
    }

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

  function drawPanel(canvasId, featureCollection, hazard) {
    console.info("[ww] drawPanel START", {
      canvasId,
      hazard,
      canvas: !!document.getElementById(canvasId),
    });

    console.info("[ww] drawPanel", canvasId, {
      hazard,
      count: (featureCollection?.features || []).length,
    });
    const canvas = document.getElementById(canvasId);
    console.info("[ww] canvas check", {
      canvas: !!canvas,
      hidden: canvas ? isHidden(canvas) : "no canvas",
    });
    if (!canvas || isHidden(canvas)) return;

    const { width, height } = resizeCanvasToContainer(canvas);
    console.info("[ww] canvas resized", { width, height });
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

    console.info("[ww] about to call drawTilesLayer", {
      style: TILE_STYLE,
      provider: TILE_PROVIDERS["imagery"],
    });

    drawTilesLayer(
      ctx,
      auto,
      rectMain,
      featureCollection,
      hazard,
      version,
      canvasId
    );

    drawBasemap(ctx, auto, rectMain);

    const keysOrder =
      hazard === "wind" ? ["HU.A", "TR.A", "HU.W", "TR.W"] : ["SS.A", "SS.W"];

    drawFeatures(ctx, all, auto, rectMain, keysOrder);

    const currentZoom = chooseTileZoom(auto, rectMain);
    drawPlacenames(ctx, auto, rectMain, currentZoom);

    function insetRect(box) {
      return {
        x: Math.round(box.x * width),
        y: Math.round(box.y * height),
        w: Math.round(box.w * width),
        h: Math.round(box.h * height),
      };
    }
    if (all.length) {
      const keysOrder =
        hazard === "wind" ? ["HU.A", "TR.A", "HU.W", "TR.W"] : ["SS.A", "SS.W"];
      drawFeatures(ctx, all, auto, rectMain, keysOrder);
      
      const currentZoom = chooseTileZoom(auto, rectMain);
      drawPlacenames(ctx, auto, rectMain, currentZoom);
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
      ctx.strokeStyle = "#666";
      const r = insetRect(box);
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
      ctx.strokeStyle = "#666";
      const r = insetRect(box);
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

  function renderTextList(containerId, displaySection, emptyMsg) {
    const el = document.getElementById(containerId);
    if (!el) {
      console.warn("Text container not found:", containerId);
      return;
    }
    el.innerHTML = "";

    if (!displaySection || !displaySection.length) {
      const p = document.createElement("p");
      p.textContent = emptyMsg;
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
      title.style.backgroundColor = bg;
      title.style.color = fg;
      title.style.padding = "0.35rem 0.5rem";
      title.style.borderRadius = "0.375rem";
      title.style.fontWeight = "600";
      title.style.display = "inline-block";
      title.style.marginBottom = "0.25rem";

      h.appendChild(title);

      const list = document.createElement("ul");
      for (const st of block.states) {
        const stCode = st.state && st.state !== "UNK" ? st.state : "—";
        const zones = st.zones.join(", ");
        const li = document.createElement("li");
        li.textContent = `${stCode}: ${zones}`;
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
    if (!stormId) {
      console.error("Missing ?storm=ALnnYYYY");
      return;
    }

    loadBasemap();
    loadPlacenames();

    try {
      const url = `/2025_weather/active/storms/${stormId}/tcv.json?v=${Date.now()}`;
      const data = await loadJSON(url);

      if (
        !data.features ||
        !Array.isArray(data.features.features) ||
        data.features.features.length === 0
      ) {
        console.info("tcv.json is thin — loading geometries from cache");
        data.features = await buildFeaturesFromEvents(data.events || []);
      }

      renderTextList(
        "ww-wind-text",
        data.display?.wind,
        "No active watches/warnings."
      );

      renderTextList(
        "ww-surge-text",
        data.display?.surge,
        "No active watches/warnings."
      );

      let raf = null;
      const onResize = () => {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          drawPanel("ww-wind-canvas", data.features, "wind");
          drawPanel("ww-surge-canvas", data.features, "surge");
        });
      };
      window.addEventListener("resize", onResize, { passive: true });
      onResize();
    } catch (err) {
      console.error("Failed to load tcv.json:", err);
      renderTextList("ww-wind-text", null, "No active watches/warnings.");
      renderTextList("ww-surge-text", null, "No active watches/warnings.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
