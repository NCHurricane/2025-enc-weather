// =========================
// FILE 2 of 2 — FULL DROP-IN
// Path: counties/bertie/js/countyApp.js
// Purpose: Use icon (if any) for #current-container background; render secondary chips
// Notes:
//  • Matches your Bertie HTML IDs: #current-desc, #current-location, #current-obs-time, etc.
//  • If #secondary-stations doesn’t exist, we create it at the end of #current-container.
// =========================

import {
  init,
  getCurrentConditions,
  getForecast,
  getHourlyData,
  getAlerts,
  getAFD
} from './countyData.js';

const SEL = {
  wrap:   '#current-container',
  chips:  '#secondary-stations',
  current: {
    temp:  '#current-temp',
    desc:  '#current-desc',
    wind:  '#current-wind',
    dew:   '#current-dewpoint',
    rh:    '#current-humidity',
    pres:  '#current-pressure',
    vis:   '#current-visibility',
    heat:  '#current-heat-index',
    chill: '#current-wind-chill',
    loc:   '#current-location',
    obs:   '#current-obs-time'
  },
  forecast: { container: '#forecast', detailed: '#detailed-forecast' },
  alerts:   { container: '#alerts' },
  afd:      { container: '#afd-content' }
};

function $(sel){ return document.querySelector(sel); }
function setText(sel, text){ const el=$(sel); if(el) el.textContent = text; }
function setHTML(sel, html){ const el=$(sel); if(el) el.innerHTML = html; }
function fmtF(v){ return (v==null)?'N/A':`${Math.round(v)}°F`; }
function fmtPct(v){ return (v==null)?'N/A':`${Math.round(v)}%`; }
function fmtMb(v){ return (v==null)?'N/A':`${Number(v).toFixed(1)} mb`; }
function fmtTimeLocal(iso){ if(!iso) return ''; try{ return new Date(iso).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', month:'short', day:'numeric' }); } catch{ return ''; } }

function ensureChipsContainer(){
  let c = $(SEL.chips);
  if(!c){
    const wrap = $(SEL.wrap);
    if(!wrap) return null;
    c = document.createElement('div');
    c.id = SEL.chips.replace('#','');
    c.className = 'secondary-stations';
    wrap.appendChild(c);
  }
  return c;
}

async function renderCurrent(){
  const cur = await getCurrentConditions();
  if(!cur || cur.status!=='ok'){
    setText(SEL.current.desc, 'Weather data temporarily unavailable. Please check back shortly.');
    return;
  }
  // Background image for current container (icon from official station if available)
  const wrap = $(SEL.wrap);
  if(wrap){
    if(cur.icon){ wrap.style.backgroundImage = `url(${cur.icon})`; wrap.style.backgroundSize = 'cover'; wrap.style.backgroundPosition = 'center'; }
    else { wrap.style.removeProperty('background-image'); }
  }

  setText(SEL.current.temp,  fmtF(cur.temperature));
  setText(SEL.current.desc,  cur.conditions ?? 'N/A');
  setText(SEL.current.wind,  cur.wind ?? 'N/A');
  setText(SEL.current.dew,   fmtF(cur.dewpoint));
  setText(SEL.current.rh,    fmtPct(cur.humidity));
  setText(SEL.current.pres,  fmtMb(cur.pressure));
  setText(SEL.current.vis,   cur.visibility ?? 'N/A');
  setText(SEL.current.heat,  cur.heatIndex!=null ? fmtF(cur.heatIndex)   : 'N/A');
  setText(SEL.current.chill, cur.windChill!=null ? fmtF(cur.windChill)   : 'N/A');
  setText(SEL.current.loc,   cur.stationName ? `Data from: ${cur.stationName}` : '');
  setText(SEL.current.obs,   cur.obsTime ? `Obs: ${fmtTimeLocal(cur.obsTime)}` : '');

  // Secondary station chips (location + temperature)
  const chipsC = ensureChipsContainer();
  if(chipsC){
    const secs = Array.isArray(cur.secondaries) ? cur.secondaries : [];
    if(secs.length===0){ chipsC.innerHTML = ''; }
    else {
      const html = secs.map(s => {
        const nm = s.shortName || s.name || s.id;
        const tv = (s.temperature==null) ? 'N/A' : `${Math.round(s.temperature)}°F`;
        return `<div class="station-chip" title="${s.name||s.id}"><span class="chip-name">${nm}</span><span class="chip-temp">${tv}</span></div>`;
      }).join('');
      chipsC.innerHTML = html;
    }
  }
}

async function renderForecast(){
  try{
    const fc = await getForecast();
    const periods = Array.isArray(fc?.periods) ? fc.periods : [];
    if(!periods.length){ setHTML(SEL.forecast.container, '<p>Forecast temporarily unavailable.</p>'); return; }
    const cards = periods.slice(0,5).map(p => {
      const t = (p?.temperature!=null) ? `${p.temperature}°${p.temperatureUnit||'F'}` : '—';
      return `<div class="forecast-card"><div class="fc-name">${p?.name||'—'}</div><div class="fc-short">${p?.shortForecast||'—'}</div><div class="fc-temp">${t}</div></div>`;
    }).join('');
    setHTML(SEL.forecast.container, cards);
    const details = periods.slice(0,6).map(p => `<p><strong>${p?.name||'—'}:</strong> ${p?.detailedForecast||p?.shortForecast||''}</p>`).join('');
    setHTML(SEL.forecast.detailed, details);
  } catch(e){
    console.warn('[countyApp] forecast load failed', e);
    setHTML(SEL.forecast.container, '<p>Forecast temporarily unavailable.</p>');
  }
}

async function renderAlerts(){
  try{
    const a = await getAlerts();
    if(!a || a.status!=='ok'){ setHTML(SEL.alerts.container, ''); return; }
    const list = Array.isArray(a.list) ? a.list : [];
    if(list.length===0){ setHTML(SEL.alerts.container, '<p>No active alerts</p>'); return; }
    const items = list.map(x => {
      const h = x.headline || x.event || x.type || 'Alert';
      const sev = x.severity ? `<strong>${x.severity}</strong> — ` : '';
      return `<li>${sev}${h}</li>`;
    }).join('');
    setHTML(SEL.alerts.container, `<ul class="alerts-list">${items}</ul>`);
  } catch(e){ console.warn('[countyApp] alerts load failed', e); }
}

async function renderAFD(){
  try{
    const afd = await getAFD();
    const txt = afd?.text || '';
    if(txt){ setHTML(SEL.afd.container, `<pre class="afd-text">${txt.replace(/[&<>]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]))}</pre>`); }
  } catch(e){ console.warn('[countyApp] AFD load failed', e); }
}

async function loadAll(){
  try{ await init(); } catch(e){ console.warn('[countyApp] init failed (non-fatal)', e); }
  await renderCurrent();
  await renderForecast();
  try{ await getHourlyData(); } catch(e){ console.warn('[countyApp] hourly load failed (non-fatal)', e); }
  await renderAlerts();
  await renderAFD();
}

export async function initializePage(){
  try{ await loadAll(); } catch(e){ console.error('[countyApp] initialize failed', e); }
}

initializePage();
