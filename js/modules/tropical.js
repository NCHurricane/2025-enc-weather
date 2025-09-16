/**
 * tropical.js — Text Products (NCHurricane 2025)
 * Reads cached NHC text products and renders them safely.
 * - Fetches local cache JSONs (fast) — no loaders needed
 * - Robust timestamp parsing (NHC "HHMM UTC ..." and RFC-2822, ISO, epoch)
 * - Neutral fallbacks when a product is missing
 * - No season logic, no external imports
 */
import { initSatellite } from "./satellite.js?v=9.14.25";

(() => {
  "use strict";

  // -------- Paths (absolute for reliability) --------
  const BASE = "/2025_weather/js/modules/cache";
  const PATHS = {
    two_en: `${BASE}/tropical_two_at.json`,
    two_es: `${BASE}/tropical_two_sat.json`,
    disc: `${BASE}/tropical_disc_at.json`,
    summary: `${BASE}/tropical_summary_at.json`,
  };

  // -------- DOM targets (optional; render only if present) --------
  const $ = (sel) => {
    try {
      return document.querySelector(sel);
    } catch {
      return null;
    }
  };
  const targets = {
    two: {
      content: $("#two-text-content"),
      ts: $("#two-text-timestamp"),
      time: $("#two-text-time"),
      actions: $("#two-text-actions"),
      link: $("#two-text-link"),
    },
    twoEs: {
      content: $("#two-spanish-content"),
      ts: $("#two-spanish-timestamp"),
      time: $("#two-spanish-time"),
      actions: $("#two-spanish-actions"),
      link: $("#two-spanish-link"),
    },
    disc: {
      content: $("#discussion-content"),
      ts: $("#discussion-timestamp"),
      time: $("#discussion-time"),
      actions: $("#discussion-actions"),
      link: $("#discussion-link"),
    },
    satellite: {
      actions: $("#satellite-actions"),
      link: $("#satellite-link"),
    },
    // If you add a page-wide updated line, class="last-updated" will be used; otherwise no-op.
    lastUpdated: $(".last-updated"),
  };

  // -------- utils --------
  const tsParam = () => `t=${Date.now()}`;
  const isNonEmptyStr = (v) => typeof v === "string" && v.trim().length > 0;
  const safe = (s) => (typeof s === "string" ? s : "");

  // --- Timestamp parsing for NHC fields ---

  // Parse "1215 UTC Thu Aug 28 2025" → Date
  function parseNHC_IssueTime(s) {
    if (typeof s !== "string") return null;
    const m = s
      .trim()
      .match(
        /^(\d{3,4})\s+UTC\s+([A-Za-z]{3})\s+([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})$/
      );
    if (!m) return null;
    let hhmm = m[1];
    const dow = m[2],
      mon = m[3],
      dd = m[4],
      yyyy = m[5];
    if (hhmm.length === 3) hhmm = "0" + hhmm; // 915 → 0915
    const hh = hhmm.slice(0, 2);
    const mm = hhmm.slice(2);
    // Build a parseable UTC string
    const str = `${dow} ${mon} ${dd} ${yyyy} ${hh}:${mm}:00 Z`;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  // Parse many possibilities (epoch, ISO, RFC2822, "… UTC", NHC issueTime)
  function parseTimestamp(ts) {
    if (ts == null) return null;

    // Epoch number (seconds/millis)
    if (typeof ts === "number") {
      const ms = ts < 1e12 ? ts * 1000 : ts;
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }

    if (typeof ts === "string") {
      const s = ts.trim();

      // NHC "HHMM UTC Thu Aug 28 2025"
      const nhc = parseNHC_IssueTime(s);
      if (nhc) return nhc;

      // If ends with " UTC", replace with Z (helps engines that don't grok "UTC")
      if (/\sUTC$/i.test(s)) {
        const d = new Date(s.replace(/\sUTC$/i, "Z"));
        if (!isNaN(d.getTime())) return d;
      }

      // Native parse (handles ISO/RFC2822 on all modern browsers)
      const d2 = new Date(s);
      if (!isNaN(d2.getTime())) return d2;
    }

    return null;
  }

  function fmtAbsFromAny(ts) {
    const d = parseTimestamp(ts);
    if (!d) return "—";
    try {
      return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return "—";
    }
  }

  function setPageLastUpdated(anyTs) {
    if (!targets.lastUpdated) return;
    targets.lastUpdated.textContent = `Updated: ${fmtAbsFromAny(anyTs)}`;
  }

  function setTimestamp(node, anyTs) {
    if (!node) return;
    node.textContent = `Last Updated: ${fmtAbsFromAny(anyTs)}`;
  }

  // Function to update satellite action button based on current sector
  function updateSatelliteActionButton(sector) {
    if (!targets.satellite.actions || !targets.satellite.link) return;
    
    const sectorUrls = {
      'taw': 'https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G19&sector=taw',
      'na': 'https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G19&sector=na',
      'eus': 'https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G19&sector=eus',
      'car': 'https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G19&sector=car',
      'ga': 'https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G19&sector=ga'
    };
    
    const url = sectorUrls[sector];
    if (url) {
      targets.satellite.link.href = url;
      targets.satellite.actions.style.display = 'block';
    } else {
      targets.satellite.actions.style.display = 'none';
    }
  }

  // Make function globally available for satellite module
  window.updateSatelliteActionButton = updateSatelliteActionButton;

  async function getJSON(url) {
    try {
      const res = await fetch(`${url}?${tsParam()}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  function renderHtmlInto(node, html) {
    if (!node) return;
    node.innerHTML = html;
    node.style.display = "block";
  }

  // -------- renderers --------
  function renderTwoEN(data) {
    const n = targets.two.content;
    if (!n) return;

    let html = "<h3>Atlantic Tropical Weather Outlook</h3>";
    if (isNonEmptyStr(data?.discussion)) {
      html += data.discussion; // expected safe HTML from your cache writer
    } else if (isNonEmptyStr(data?.rawContent)) {
      html += `<pre>${safe(data.rawContent)}</pre>`;
    } else {
      html += "<p>Unable to load the tropical outlook at this time.</p>";
    }
    renderHtmlInto(n, html);

    // Update timestamps
    const ts =
      data?.issueTime ?? // "1215 UTC Thu Aug 28 2025"
      data?.pubDate ?? // "Thu, 28 Aug 2025 10:41:28 +0000"
      data?.issued ??
      data?.issue_time ??
      data?.timestamp ??
      data?.generated ??
      data?.validTime ??
      null;
    
    if (targets.two.ts) {
      setTimestamp(targets.two.ts, ts);
    }
    
    if (targets.two.time) {
      setTimestamp(targets.two.time, ts);
    }

    // Update action button if link is available
    if (targets.two.actions && targets.two.link && data?.link) {
      targets.two.link.href = data.link;
      targets.two.actions.style.display = 'block';
    } else if (targets.two.actions) {
      targets.two.actions.style.display = 'none';
    }
  }

  function renderTwoES(data) {
    const n = targets.twoEs.content;
    if (!n) return;

    let html = "<h3>Perspectiva del Tiempo Tropical del Atlántico</h3>";
    if (isNonEmptyStr(data?.discussion)) {
      html += data.discussion;
    } else if (isNonEmptyStr(data?.rawContent)) {
      html += `<pre>${safe(data.rawContent)}</pre>`;
    } else {
      html +=
        "<p>No se puede cargar la perspectiva tropical en este momento.</p>";
    }
    renderHtmlInto(n, html);

    if (targets.twoEs.ts) {
      const ts =
        data?.issueTime ??
        data?.pubDate ??
        data?.issued ??
        data?.issue_time ??
        data?.timestamp ??
        data?.generated ??
        data?.validTime ??
        null;
      setTimestamp(targets.twoEs.ts, ts);
      
      if (targets.twoEs.time) {
        setTimestamp(targets.twoEs.time, ts);
      }
    }

    // Update action button if link is available
    if (targets.twoEs.actions && targets.twoEs.link && data?.link) {
      targets.twoEs.link.href = data.link;
      targets.twoEs.actions.style.display = 'block';
    } else if (targets.twoEs.actions) {
      targets.twoEs.actions.style.display = 'none';
    }
  }

  function renderDiscussion(data) {
    const n = targets.disc.content;
    if (!n) return;

    let html = "<h3>Tropical Weather Discussion</h3>";
    if (isNonEmptyStr(data?.discussion)) {
      html += data.discussion;
    } else if (isNonEmptyStr(data?.rawContent)) {
      html += `<pre>${safe(data.rawContent)}</pre>`;
    } else {
      html += "<p>No tropical discussion available at this time.</p>";
    }
    renderHtmlInto(n, html);

    if (targets.disc.ts) {
      const ts =
        data?.issueTime ??
        data?.pubDate ??
        data?.issued ??
        data?.issue_time ??
        data?.timestamp ??
        data?.generated ??
        data?.validTime ??
        null;
      setTimestamp(targets.disc.ts, ts);
      
      if (targets.disc.time) {
        setTimestamp(targets.disc.time, ts);
      }
    }

    // Update action button if link is available
    if (targets.disc.actions && targets.disc.link && data?.link) {
      targets.disc.link.href = data.link;
      targets.disc.actions.style.display = 'block';
    } else if (targets.disc.actions) {
      targets.disc.actions.style.display = 'none';
    }
  }

  // -------- init --------
  async function init() {
    // Summary first → optional page "Updated:"
    const summary = await getJSON(PATHS.summary);
    const upAny =
      summary?.metadata?.cached_at_iso ??
      summary?.cached_at_iso ??
      summary?.metadata?.generated ??
      summary?.generated ??
      summary?.metadata?.timestamp ??
      summary?.timestamp ??
      null;
    setPageLastUpdated(upAny);

    // Load each text product (in parallel)
    const [twoEn, twoEs, disc] = await Promise.all([
      getJSON(PATHS.two_en),
      getJSON(PATHS.two_es),
      getJSON(PATHS.disc),
    ]);

    try {
      renderTwoEN(twoEn || {});
    } catch (e) {
      console.warn("[tropical] TWO EN render:", e);
    }
    try {
      renderTwoES(twoEs || {});
    } catch (e) {
      console.warn("[tropical] TWO ES render:", e);
    }
    try {
      renderDiscussion(disc || {});
    } catch (e) {
      console.warn("[tropical] DISC render:", e);
    }

    initSatellite({
      sector: "taw",
      selectorId: "tropical-satellite-product-select",
      sectorSelectName: "satellite-sector",
      playButtonId: "tropical-satellite-play-pause",
      imageId: "tropical-satellite-image",
      containerId: "tropical-satellite-image-container",
      loadingId: "tropical-satellite-loading",
      errorId: "tropical-satellite-error",
      timestampId: "tropical-satellite-timestamp",
    });

    // Initialize satellite action button with default sector
    updateSatelliteActionButton("taw");

    console.info("[tropical] text products initialized");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
