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
    stormCacheRoot: "./storms",
  };

  // ---------- DOM ----------
  const $ = (sel) => document.querySelector(sel);
  const els = {
    title: $("#storm-title"),
    stormId: $("#storm-id"),
    updated: document.querySelector(".last-updated"),

    listSection: $("#storm-list-section"),
    list: $("#storm-list"),
    listNote: $("#storm-list-note"),

    overviewSection: $("#storm-overview-section"),
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
      ".active-overview-container",
      ".hazards-container",
      ".graphics-container",
      ".text-products-container",
      "#storm-list-section", // if present
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

  function renderRadiiTable(radii) {
    if (!els.radiiTable || !radii) return;
    const rows = [];
    const row = (label, obj) => `
      <tr>
        <th scope="row">${label}</th>
        <td>${obj?.NE ? `${obj.NE} nm` : "—"}</td>
        <td>${obj?.SE ? `${obj.SE} nm` : "—"}</td>
        <td>${obj?.SW ? `${obj.SW} nm` : "—"}</td>
        <td>${obj?.NW ? `${obj.NW} nm` : "—"}</td>
      </tr>
    `;
    if (radii.r34) rows.push(row("34 kt", radii.r34));
    if (radii.r50) rows.push(row("50 kt", radii.r50));
    if (radii.r64) rows.push(row("64 kt", radii.r64));
    if (radii.seas12) rows.push(row("12 ft seas", radii.seas12));
    els.radiiTable.innerHTML = rows.length
      ? `<table class="kv radiitable"><thead><tr><th></th><th>NE</th><th>SE</th><th>SW</th><th>NW</th></tr></thead><tbody>${rows.join(
          ""
        )}</tbody></table>`
      : '<p class="muted">No wind radii available.</p>';
  }

  function showStormFromCache(data) {
    const meta = data.metadata || {};
    const cur = data.current || {};
    const rad = data.radii || {};

    els.listSection.hidden = true;
    els.overviewSection.hidden = false;
    els.graphicsSection.hidden = false;
    els.textSection.hidden = false;

    const name = (meta.name || "Unnamed").toString();
    const idShown = (meta.id || "").toString().toUpperCase();

    els.title.textContent = name;
    if (idShown) {
      els.stormId.textContent = idShown;
      els.stormId.hidden = false;
    } else {
      els.stormId.hidden = trie;
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
    renderRadiiTable(rad);
  }

  function showList(storms) {
    els.listSection.hidden = false;
    els.overviewSection.hidden = true;
    els.graphicsSection.hidden = true;
    els.textSection.hidden = true;

    els.title.textContent = "Active Storms";
    els.stormId.hidden = false;

    els.list.innerHTML = "";
    if (!storms.length) {
      els.listNote.textContent = "No active tropical cyclones at this time.";
      return;
    }

    storms.forEach((s) => {
      const basin = (s?.basin || "").toString().substr(0, 2).toUpperCase();
      const num =
        s?.stormNumber != null ? String(s.stormNumber).padStart(2, "0") : "";
      const shortId =
        basin && num ? `${basin.toLowerCase()}${num}` : s?.id || "";
      const name = (s?.name || "Unnamed").toString();
      const adv = (
        s?.advisory ||
        s?.advisoryNumber ||
        s?.lastAdvisory ||
        ""
      ).toString();
      const a = document.createElement("a");
      a.className = "storm-tile";
      a.href = `./index.html?storm=${encodeURIComponent(
        shortId || s?.id || name
      )}`;
      a.innerHTML = `
        <div><strong>${name}</strong></div>
        <div class="muted">${shortId || s?.id || ""} ${
        adv ? ` • Advisory ${adv}` : ""
      }</div>
      `;
      els.list.appendChild(a);
    });
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
