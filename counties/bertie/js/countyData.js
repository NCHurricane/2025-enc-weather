// ===== counties/bertie/js/countyData.js =====
// FULL DROP-IN — replaces the existing file entirely
// Purpose:
//   • Current Conditions: live NWS fallback (GCRN7 → WNRN7 → KEDE), freshness ≤60 min
//   • Forecast/Hourly/Alerts/AFD: read from local cache JSON (./data/*.json)
//   • Units: km/h↔mph, m/s↔mph, Pa→mb, m→miles
//   • Derived: Heat Index (°F) + Wind Chill (°F)
//   • NEW (WMO rule): Only ONE of Heat Index OR Wind Chill is returned as non-null
//       - Heat Index when T ≥ 80°F AND RH ≥ 40%
//       - Wind Chill when T ≤ 50°F AND wind ≥ 3 mph
//       - If both mathematically appear due to edge rounding, prefer HI when T ≥ 65°F, otherwise WC

const FRESH_MINUTES = 60; // accept obs ≤ 60 minutes old
const STATIONS = [
  { id: "KEDE" },
  { id: "GCRN7" }, // Greens Cross (non-airport)
  { id: "WNRN7" }, // Cashie River @ King St (non-airport)
  // Edenton Airport (airport/METAR)
];

// ---------- helpers ----------
function minutesSince(iso){ if(!iso) return Infinity; return Math.max(0, Math.round((Date.now()-new Date(iso).getTime())/60000)); }
function degToCompass(deg){ if(deg==null) return null; const d=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']; return d[Math.round(((deg%360)/22.5))%16]; }
const round = (v, n=0) => (v==null? null : +Number(v).toFixed(n));
const cToF = c => (c==null? null : (Number(c)*9/5)+32);
const paToMb = pa => (pa==null? null : round(Number(pa)/100, 1));
const mToMiles = m => (m==null? null : round(Number(m)/1609.344));
const kphToMph = k => (k==null? null : round(Number(k)*0.621371));
const msToMph  = ms=> (ms==null? null : round(Number(ms)*2.236936));

function windSpeedToMph(val, unitCode){
  if(val==null) return null;
  const u = (unitCode||'').toLowerCase();
  if(u.includes('km_h-1') || u.includes('km/h')) return kphToMph(val);
  if(u.includes('m_s-1')  || u.includes('m/s'))  return msToMph(val);
  if(u.includes('mph')) return round(val);
  // Unknown: assume km/h for non-airport sensors
  return kphToMph(val);
}

// Derived indices
function computeHeatIndexF(T, RH){
  if(T==null || RH==null) return null; const t=Number(T), r=Number(RH);
  if(!(t>=80 && r>=40)) return null;
  let HI = -42.379 + 2.04901523*t + 10.14333127*r - 0.22475541*t*r
         - 0.00683783*t*t - 0.05481717*r*r + 0.00122874*t*t*r
         + 0.00085282*t*r*r - 0.00000199*t*t*r*r;
  if(r<=13 && t>=80 && t<=112){ HI -= ((13 - r)/4) * Math.sqrt((17 - Math.abs(t - 95))/17); }
  if(r>=85 && t>=80 && t<=87){ HI += ((r - 85)/10) * ((87 - t)/5); }
  return Math.round(HI);
}
function computeWindChillF(T, Vmph){
  if(T==null || Vmph==null) return null; const t=Number(T), v=Number(Vmph);
  if(!(t<=50 && v>=3)) return null;
  return Math.round(35.74 + 0.6215*t - 35.75*Math.pow(v,0.16) + 0.4275*t*Math.pow(v,0.16));
}

function shortenStationName(name, id){
  if(!name) return id;
  // Heuristic: if name contains " AT ", take tail (common for river gauges)
  const m = name.split(/\s+AT\s+/i);
  if(m.length>1){ return m[m.length-1].trim(); }
  // Trim overly long names
  return name.length>28 ? name.slice(0,25).trim()+"…" : name;
}

async function httpGetJson(url){
  const res = await fetch(url, { headers: { 'Accept': 'application/geo+json, application/json;q=0.9' } });
  if(!res.ok) throw new Error(`GET ${url} ${res.status}`);
  return res.json();
}

async function fetchLatestObs(stationId){
  const url = `https://api.weather.gov/stations/${stationId}/observations/latest`;
  const j = await httpGetJson(url);
  const p = j?.properties || {};
  const tObs   = p.timestamp || null;
  const ageMin = minutesSince(tObs);

  const tempF = cToF(p.temperature?.value ?? null);
  const dewF  = cToF(p.dewpoint?.value ?? null);
  const rhPct = p.relativeHumidity?.value!=null ? Math.round(p.relativeHumidity.value) : null;
  const prMb  = paToMb(p.barometricPressure?.value ?? null);
  const wspdMph = windSpeedToMph(p.windSpeed?.value ?? null, p.windSpeed?.unitCode);
  const wdir    = (p.windDirection?.value==null) ? null : degToCompass(p.windDirection.value);
  const gustMph = windSpeedToMph(p.windGust?.value ?? null, p.windGust?.unitCode || p.windSpeed?.unitCode);
  const visMi   = mToMiles(p.visibility?.value ?? null);

  const stationName = p.stationName || stationId;
  const textDesc = p.textDescription || null;
  const icon = p.icon || null;

  const tRounded = tempF!=null ? Math.round(tempF) : null;
  const heatIndexRaw = computeHeatIndexF(tRounded, rhPct);
  const windChillRaw = computeWindChillF(tRounded, wspdMph);

  // WMO-style: pick only one index
  let heatIndex = heatIndexRaw, windChill = windChillRaw;
  if(heatIndex!=null && windChill!=null){
    if(tRounded!=null && tRounded >= 65){ windChill=null; } else { heatIndex=null; }
  } else if(heatIndex!=null){ windChill=null; } else if(windChill!=null){ heatIndex=null; }

  return {
    stationId,
    stationName,
    shortName: shortenStationName(stationName, stationId),
    obsTime: tObs,
    ageMinutes: ageMin,
    isFresh: (ageMin <= FRESH_MINUTES) && (tempF != null),
    data: {
      temperature: tRounded,
      dewpoint:    dewF!=null ? Math.round(dewF) : null,
      humidity:    rhPct,
      pressure:    prMb,
      windSpeed:   wspdMph,
      windDirection: wdir,
      windGust:    gustMph,
      visibility:  visMi,
      conditions:  textDesc,
      icon,
      heatIndex,
      windChill
    }
  };
}

export async function init(){
  const res = await fetch('./data/config.json');
  if(!res.ok) throw new Error('Failed to load config.json');
  return res.json();
}

export async function getCurrentConditions(){
  const results = [];
  for(const s of STATIONS){
    try { results.push(await fetchLatestObs(s.id)); }
    catch(e){ console.warn('[current] fetch failed', s.id, e); }
  }
  if(results.length===0){
    return { status: 'error', message: 'Weather data temporarily unavailable. Please check back shortly.' };
  }

  const fresh = results.find(r => r.isFresh);
  const chosen = fresh || results
    .filter(r => r.data.temperature!=null)
    .sort((a,b)=>a.ageMinutes-b.ageMinutes)[0] || results[0];

  const d = chosen.data;
  const windStr = (d.windSpeed==null || d.windSpeed<3) ? 'Calm' : `${d.windDirection || '--'} at ${d.windSpeed} mph`;
  const visStr  = d.visibility==null ? 'N/A' : `${d.visibility} miles`;

  // Build secondaries list (others with a temperature)
  const secondaries = results
    .filter(r => r.stationId !== chosen.stationId && r.data.temperature != null)
    .map(r => ({
      id: r.stationId,
      name: r.stationName,
      shortName: r.shortName,
      temperature: r.data.temperature,
      hasIcon: !!r.data.icon
    }));

  // Find any icon among results if chosen lacks one (for background only)
  const bgIcon = d.icon || (results.find(r => r.data.icon)?.data.icon) || null;

  return {
    status: 'ok',
    stationId: chosen.stationId,
    stationName: chosen.stationName,
    obsTime: chosen.obsTime,
    ageMinutes: chosen.ageMinutes,
    temperature: d.temperature,
    dewpoint: d.dewpoint,
    humidity: d.humidity,
    pressure: d.pressure,
    wind: windStr,
    windGust: d.windGust,
    visibility: visStr,
    conditions: d.conditions || 'N/A',
    icon: bgIcon, // allow background even if chosen is non-airport
    heatIndex: d.heatIndex ?? null,
    windChill: d.windChill ?? null,
    secondaries // NEW
  };
}

export async function getForecast(){
  const r = await fetch('./data/forecast.json', { cache: 'no-store' });
  if(!r.ok) throw new Error('Failed to load forecast.json');
  return r.json();
}
export async function getHourlyData(){
  const r = await fetch('./data/hourly.json', { cache: 'no-store' });
  if(!r.ok) throw new Error('Failed to load hourly.json');
  return r.json();
}
export async function getAlerts(){
  const r = await fetch('./data/alerts.json', { cache: 'no-store' });
  if(!r.ok) throw new Error('Failed to load alerts.json');
  const j = await r.json();
  return { status: 'ok', list: Array.isArray(j.alerts) ? j.alerts : [] };
}
export async function getAFD(){
  const r = await fetch('./data/discussion.json', { cache: 'no-store' });
  if(!r.ok) throw new Error('Failed to load discussion.json');
  const j = await r.json();
  return { status: 'ok', text: j.text || '' };
}