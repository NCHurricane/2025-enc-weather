import {
  MAP_CITY_FAVORITES_URL,
  clearMapCityFavoriteCache,
  loadMapCityFavorites,
  mergeMapCityFavorites,
} from './mapCityFavorites.js?v=20260822-san-diego-cities-3';

export const TROPICAL_CITY_LABEL_LIMIT = 20000;
export const TROPICAL_CITY_LABELS_URL = new URL(
  '../data/tropical-city-labels.json?v=20260820-1',
  import.meta.url,
).toString();
export const TROPICAL_CITY_ATTRIBUTION =
  'Cities: <a href="https://simplemaps.com/data/world-cities">SimpleMaps</a> '
  + '(<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>)';

const tropicalCityDataPromises = new Map();

function escapeCityLabelHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function cityLabelDimensions(city) {
  const major = city.favorite || city.rank <= 1000;
  return {
    major,
    width: Math.max(32, Math.min(190, city.city.length * (major ? 8 : 7) + 12)),
    height: major ? 20 : 18,
  };
}

export function tropicalCityMaxRank(zoom) {
  if (zoom >= 9) return TROPICAL_CITY_LABEL_LIMIT;
  if (zoom >= 8) return 12000;
  if (zoom >= 7) return 2500;
  return 500;
}

export function normalizeTropicalCityLongitude(longitude, referenceLongitude) {
  if (!Number.isFinite(longitude) || !Number.isFinite(referenceLongitude)) return longitude;
  let normalized = longitude;
  while (normalized - referenceLongitude > 180) normalized -= 360;
  while (normalized - referenceLongitude < -180) normalized += 360;
  return normalized;
}

export function normalizeTropicalCityData(payload) {
  if (!Array.isArray(payload)) throw new Error('Tropical city-label data is not an array');
  return payload
    .map((city) => ({
      city: String(city?.city || '').trim(),
      latitude: Number(city?.latitude),
      longitude: Number(city?.longitude),
      rank: Number(city?.rank),
    }))
    .filter((city) => (
      city.city
      && Number.isFinite(city.latitude)
      && Number.isFinite(city.longitude)
      && Number.isInteger(city.rank)
      && city.rank > 0
      && city.rank <= TROPICAL_CITY_LABEL_LIMIT
    ))
    .sort((left, right) => left.rank - right.rank || left.city.localeCompare(right.city));
}

export function tropicalCityCandidates(cities, { bounds, zoom, centerLongitude }) {
  if (!bounds) return [];
  const south = Number(bounds.getSouth?.());
  const north = Number(bounds.getNorth?.());
  const west = Number(bounds.getWest?.());
  const east = Number(bounds.getEast?.());
  if (![south, north, west, east].every(Number.isFinite)) return [];

  const referenceLongitude = Number.isFinite(centerLongitude)
    ? centerLongitude
    : (west + east) / 2;
  const maxRank = tropicalCityMaxRank(zoom);
  const candidates = [];
  for (const city of cities || []) {
    if (city.favorite) {
      if (zoom < city.minZoom) continue;
    } else if (city.rank > maxRank) {
      continue;
    }
    if (city.latitude < south || city.latitude > north) continue;
    const renderLongitude = normalizeTropicalCityLongitude(city.longitude, referenceLongitude);
    if (renderLongitude < west || renderLongitude > east) continue;
    candidates.push({ ...city, renderLongitude });
  }
  return candidates;
}

export function thinTropicalCityLabels(cities, leafletMap) {
  const occupiedBoxes = [];
  const accepted = [];
  for (const city of cities) {
    const point = leafletMap.latLngToContainerPoint([
      city.latitude,
      city.renderLongitude ?? city.longitude,
    ]);
    const { width, height } = cityLabelDimensions(city);
    const padding = 4;
    const box = {
      left: point.x - width / 2 - padding,
      right: point.x + width / 2 + padding,
      top: point.y - height / 2 - padding,
      bottom: point.y + height / 2 + padding,
    };
    const overlaps = occupiedBoxes.some((occupied) => !(
      box.right < occupied.left
      || box.left > occupied.right
      || box.bottom < occupied.top
      || box.top > occupied.bottom
    ));
    if (overlaps && !city.favorite) continue;
    accepted.push(city);
    occupiedBoxes.push(box);
  }
  return accepted;
}

export function clearTropicalCityLabelCache() {
  tropicalCityDataPromises.clear();
  clearMapCityFavoriteCache();
}

export function loadTropicalCityLabelData(
  dataUrl = TROPICAL_CITY_LABELS_URL,
  fetchImpl = globalThis.fetch,
  favoritesUrl = MAP_CITY_FAVORITES_URL,
) {
  const cacheKey = `${dataUrl}|${favoritesUrl}`;
  if (tropicalCityDataPromises.has(cacheKey)) return tropicalCityDataPromises.get(cacheKey);
  if (typeof fetchImpl !== 'function') return Promise.reject(new Error('Fetch is unavailable'));

  const cityRequest = Promise.resolve()
    .then(() => fetchImpl.call(globalThis, dataUrl, {
      cache: 'force-cache',
      headers: { Accept: 'application/json' },
    }))
    .then((response) => {
      if (!response.ok) throw new Error(`Tropical city-label request failed (${response.status})`);
      return response.json();
    })
    .then(normalizeTropicalCityData);
  const favoriteRequest = loadMapCityFavorites(favoritesUrl, fetchImpl)
    .catch((error) => {
      globalThis.console?.warn?.('[tropical-map] City favorites failed:', error);
      return [];
    });
  const request = Promise.all([cityRequest, favoriteRequest])
    .then(([cities, favorites]) => mergeMapCityFavorites(cities, favorites, 'tropical'))
    .catch((error) => {
      tropicalCityDataPromises.delete(cacheKey);
      throw error;
    });
  tropicalCityDataPromises.set(cacheKey, request);
  return request;
}

export function installTropicalCityLabels(leafletMap, {
  leaflet = globalThis.L,
  fetchImpl = globalThis.fetch,
  dataUrl = TROPICAL_CITY_LABELS_URL,
  favoritesUrl = MAP_CITY_FAVORITES_URL,
  paneName = 'tropicalCityLabelPane',
  paneZIndex = 306,
  logger = globalThis.console,
} = {}) {
  if (!leafletMap || !leaflet?.layerGroup || !dataUrl) return null;

  const pane = leafletMap.getPane?.(paneName) || leafletMap.createPane?.(paneName);
  if (pane?.style) {
    pane.style.zIndex = String(paneZIndex);
    pane.style.pointerEvents = 'none';
  }

  const layer = leaflet.layerGroup();
  layer.getAttribution = () => TROPICAL_CITY_ATTRIBUTION;
  layer.addTo(leafletMap);

  const overlay = {
    data: null,
    layer,
    map: leafletMap,
    destroyed: false,
    render: null,
    ready: null,
    destroy: null,
  };

  const render = () => {
    if (overlay.destroyed || !overlay.data?.length) return 0;
    const mapBounds = overlay.map.getBounds?.();
    const bounds = mapBounds?.pad?.(0.08) || mapBounds;
    const candidates = tropicalCityCandidates(overlay.data, {
      bounds,
      zoom: Number(overlay.map.getZoom?.()) || 0,
      centerLongitude: Number(overlay.map.getCenter?.()?.lng),
    });
    const cities = thinTropicalCityLabels(candidates, overlay.map);

    overlay.layer.clearLayers();
    for (const city of cities) {
      const { major, width, height } = cityLabelDimensions(city);
      const icon = leaflet.divIcon({
        className: `weather-place-label${major ? ' is-major' : ''}`,
        html: `<span>${escapeCityLabelHtml(city.city)}</span>`,
        iconSize: [width, height],
        iconAnchor: [Math.round(width / 2), Math.round(height / 2)],
      });
      leaflet.marker([city.latitude, city.renderLongitude], {
        pane: paneName,
        icon,
        interactive: false,
        keyboard: false,
      }).addTo(overlay.layer);
    }
    return cities.length;
  };
  overlay.render = render;
  overlay.map.on?.('moveend zoomend resize', render);
  overlay.destroy = () => {
    if (overlay.destroyed) return;
    overlay.destroyed = true;
    overlay.map.off?.('moveend zoomend resize', render);
    overlay.map.removeLayer?.(overlay.layer);
    overlay.data = null;
  };
  overlay.ready = loadTropicalCityLabelData(dataUrl, fetchImpl, favoritesUrl)
    .then((data) => {
      if (overlay.destroyed) return overlay;
      overlay.data = data;
      render();
      return overlay;
    })
    .catch((error) => {
      logger?.warn?.('[tropical-map] City labels failed:', error);
      return overlay;
    });
  return overlay;
}
