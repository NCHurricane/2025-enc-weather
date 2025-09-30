// =============================
// Tropical Data Handler - active/js/tropical.js
// 
// Constructs and renders the tropical text products on the active storm page 
// ==============================

"use strict";

const BASE = "active/cache";
const PATHS = {
  two_en: `${BASE}/twoat.json`,
  two_es: `${BASE}/twosat.json`,
  disc: `${BASE}/twdat.json`,
  summary: `${BASE}/twsat.json`,
};

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
  summary: {
    content: $("#summary-content"),
    ts: $("#summary-timestamp"),
    time: $("#summary-time"),
    actions: $("#summary-actions"),
    link: $("#summary-link"),
  },
  satellite: {
    actions: $("#satellite-actions"),
    link: $("#satellite-link"),
  },
  lastUpdated: $(".last-updated"),
};

const tsParam = () => `t=${Date.now()}`;
const isNonEmptyStr = (v) => typeof v === "string" && v.trim().length > 0;
const safe = (s) => (typeof s === "string" ? s : "");


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
  if (hhmm.length === 3) hhmm = "0" + hhmm;
  const hh = hhmm.slice(0, 2);
  const mm = hhmm.slice(2);
  const str = `${dow} ${mon} ${dd} ${yyyy} ${hh}:${mm}:00 Z`;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function parseTimestamp(ts) {
  if (ts == null) return null;

  if (typeof ts === "number") {
    const ms = ts < 1e12 ? ts * 1000 : ts;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof ts === "string") {
    const s = ts.trim();

    const nhc = parseNHC_IssueTime(s);
    if (nhc) return nhc;

    if (/\sUTC$/i.test(s)) {
      const d = new Date(s.replace(/\sUTC$/i, "Z"));
      if (!isNaN(d.getTime())) return d;
    }

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

function renderTextProduct(data, ui, title, fallbackMessage) {
  if (!ui.content) return;

  let html = `<h3>${title}</h3>`;
  if (isNonEmptyStr(data?.discussion)) {
    html += data.discussion;
  } else if (isNonEmptyStr(data?.rawContent)) {
    html += `<pre>${safe(data.rawContent)}</pre>`;
  } else {
    html += `<p>${fallbackMessage}</p>`;
  }
  renderHtmlInto(ui.content, html);

  const ts =
    data?.issueTime ??
    data?.pubDate ??
    data?.issued ??
    data?.issue_time ??
    data?.timestamp ??
    data?.generated ??
    data?.validTime ??
    null;

  if (ui.ts) setTimestamp(ui.ts, ts);
  if (ui.time) setTimestamp(ui.time, ts);

  if (ui.actions && ui.link) {
    if (data?.link) {
      ui.link.href = data.link;
      ui.actions.style.display = 'block';
    } else {
      ui.actions.style.display = 'none';
    }
  }
}

function renderTwoEN(data) {
  renderTextProduct(
    data,
    targets.two,
    "Atlantic Tropical Weather Outlook",
    "Unable to load the tropical outlook at this time."
  );
}

function renderTwoES(data) {
  renderTextProduct(
    data,
    targets.twoEs,
    "Perspectiva del Tiempo Tropical del Atlántico",
    "No se puede cargar la perspectiva tropical en este momento."
  );
}

function renderDiscussion(data) {
  renderTextProduct(
    data,
    targets.disc,
    "Tropical Weather Discussion",
    "No tropical discussion available at this time."
  );
}

function renderSummary(data) {
  renderTextProduct(
    data,
    targets.summary,
    "Monthly Tropical Weather Summary",
    "No monthly summary available at this time."
  );
}

async function init() {
  const { initSatellite } = await import(
    `../../js/modules/satellite.js?t=${Date.now()}`
  );
  const [twoEn, twoEs, disc, summary] = await Promise.all([
    getJSON(PATHS.two_en),
    getJSON(PATHS.two_es),
    getJSON(PATHS.disc),
    getJSON(PATHS.summary),
  ]);

  const upAny =
    summary?.pubDate ??
    summary?.issueTime ??
    disc?.pubDate ??
    twoEn?.pubDate ??
    summary?.generated ??
    summary?.timestamp ??
    null;
  setPageLastUpdated(upAny);

  renderTwoEN(twoEn || {});
  renderTwoES(twoEs || {});
  renderDiscussion(disc || {});
  renderSummary(summary || {});

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

  updateSatelliteActionButton("taw");

  console.info("[tropical] text products initialized");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
