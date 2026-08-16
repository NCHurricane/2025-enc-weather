const CONFIG_URL = './data/config.json';
const NC_STATION_CATALOG_URL = new URL('../nc-weather-stations.json', import.meta.url).href;
const NC_CURRENT_CONDITIONS_URL = new URL('../data/nc-current.json', import.meta.url).href;

let configPromise = null;

function finiteCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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
  const isNorthCarolina = String(config.county?.state || '').toUpperCase() === 'NC';

  return {
    config,
    countyName: String(config.county?.name || 'County'),
    zoneId,
    zone: zoneId ? config.zones?.[zoneId] : null,
    center: [lat, lon],
    stations: zoneId ? (config.zones?.[zoneId]?.stations || []) : (config.stations || []),
    conditionsSource: isNorthCarolina
      ? {
          mode: 'statewide',
          stationsUrl: NC_STATION_CATALOG_URL,
          currentUrl: NC_CURRENT_CONDITIONS_URL,
        }
      : {
          mode: 'local',
          stationsUrl: null,
          currentUrl: dataPath('current.json'),
        },
    dataPath(fileName) {
      return dataPath(fileName);
    },
  };
}

export const COUNTY_ZONE_CHANGE_EVENT = 'county:zonechange';
