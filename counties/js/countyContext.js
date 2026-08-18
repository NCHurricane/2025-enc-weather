const CONFIG_URL = './data/config.json';
const SHARED_CONDITIONS_STATES = new Set(['NC', 'FL', 'CA']);

let configPromise = null;

function finiteCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function regionalContext() {
  const root = document.querySelector('[data-weather-context="regional"]');
  if (!root) return null;

  const lat = finiteCoordinate(root.dataset.mapCenterLat);
  const lon = finiteCoordinate(root.dataset.mapCenterLon);
  if (lat === null || lon === null) throw new Error('Regional map center is not configured');

  const stationsUrl = root.dataset.conditionsStationsUrl;
  const currentUrl = root.dataset.conditionsCurrentUrl;
  if (!stationsUrl || !currentUrl) throw new Error('Regional conditions sources are not configured');

  const fallbackCurrentUrls = String(root.dataset.conditionsFallbackUrls || '')
    .split('|')
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => new URL(url, window.location.href).href);

  return {
    config: null,
    countyName: root.dataset.weatherRegionName || 'Eastern North Carolina',
    regionLabel: root.dataset.weatherRegionName || 'Eastern North Carolina',
    zoneId: null,
    zone: null,
    center: [lat, lon],
    stations: [],
    isRegional: true,
    conditionsSource: {
      mode: 'statewide',
      state: String(root.dataset.conditionsState || 'NC').trim().toUpperCase(),
      stationsUrl: new URL(stationsUrl, window.location.href).href,
      currentUrl: new URL(currentUrl, window.location.href).href,
      fallbackCurrentUrls,
    },
    dataPath(fileName) {
      return new URL(fileName, window.location.href).href;
    },
  };
}

function requestedZoneId(config) {
  if (!config.county?.multiZone) return null;

  const urlZone = new URLSearchParams(window.location.search).get('zone');
  const storedZone = localStorage.getItem('selectedZone');
  const fallbackZone = config.county.defaultZone || Object.keys(config.zones || {})[0];
  const candidate = urlZone || storedZone || fallbackZone;
  return config.zones?.[candidate] ? candidate : fallbackZone;
}

export async function loadCountyContext({ refreshConfig = false } = {}) {
  if (refreshConfig) configPromise = null;
  if (!configPromise) {
    const cacheKey = Math.floor(Date.now() / 300000);
    configPromise = fetch(`${CONFIG_URL}?v=${cacheKey}`, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`Config request failed (${response.status})`);
        return response.json();
      })
      .catch((error) => {
        configPromise = null;
        throw error;
      });
  }

  const config = await configPromise;
  const zoneId = requestedZoneId(config);
  const location = zoneId ? config.zones?.[zoneId] : config.location;
  const lat = finiteCoordinate(location?.lat);
  const lon = finiteCoordinate(location?.lon);
  if (lat === null || lon === null) throw new Error('County map center is not configured');

  const dataPath = (fileName) => (
    zoneId ? `./data/${zoneId}/${fileName}` : `./data/${fileName}`
  );
  const state = String(config.county?.state || '').trim().toUpperCase();
  const stateSlug = state.toLowerCase();
  const hasStatewideConditions = SHARED_CONDITIONS_STATES.has(state);

  return {
    config,
    countyName: String(config.county?.name || 'County'),
    zoneId,
    zone: zoneId ? config.zones?.[zoneId] : null,
    center: [lat, lon],
    stations: zoneId ? (config.zones?.[zoneId]?.stations || []) : (config.stations || []),
    conditionsSource: hasStatewideConditions
      ? {
          mode: 'statewide',
          state,
          stationsUrl: new URL(`../${stateSlug}-weather-stations.json`, import.meta.url).href,
          currentUrl: new URL(`../data/${stateSlug}-current.json`, import.meta.url).href,
        }
      : {
          mode: 'local',
          state,
          stationsUrl: null,
          currentUrl: dataPath('current.json'),
        },
    dataPath(fileName) {
      return dataPath(fileName);
    },
  };
}

export async function loadWeatherPageContext(options = {}) {
  return regionalContext() || loadCountyContext(options);
}

export const COUNTY_ZONE_CHANGE_EVENT = 'county:zonechange';
