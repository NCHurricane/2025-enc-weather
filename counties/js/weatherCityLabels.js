import {
  MAP_CITY_FAVORITES_URL,
  loadMapCityFavorites,
  mergeMapCityFavorites,
} from '../../js/modules/mapCityFavorites.js?v=20260822-san-diego-cities-3';

const weatherCityDataPromises = new Map();

function escapeCityLabelHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function weatherCityMaxRank(zoom) {
  if (zoom >= 10) return Number.POSITIVE_INFINITY;
  if (zoom >= 9) return 30000;
  if (zoom >= 8) return 12000;
  if (zoom >= 7) return 2500;
  return 500;
}

function isHomeLabel(city, homeCenter) {
  if (!Array.isArray(homeCenter)) return false;
  return Math.hypot(
    city.latitude - homeCenter[0],
    city.longitude - homeCenter[1],
  ) <= 0.08;
}

function cityLabelDimensions(city, homeCenter) {
  const major = city.favorite
    || isHomeLabel(city, homeCenter)
    || (Number.isFinite(city.rank) && city.rank <= 1000);
  return {
    major,
    width: Math.max(32, Math.min(190, city.city.length * (major ? 8 : 7) + 12)),
    height: major ? 20 : 18,
  };
}

function thinCityLabelsByCollision(cities, leafletMap, homeCenter) {
  const occupiedBoxes = [];
  const accepted = [];

  for (const city of cities) {
    const point = leafletMap.latLngToContainerPoint([city.latitude, city.longitude]);
    const { width, height } = cityLabelDimensions(city, homeCenter);
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

function loadWeatherCityData(dataUrl, mapScope, favoritesUrl) {
  const cacheKey = `${dataUrl}|${favoritesUrl}|${mapScope}`;
  if (weatherCityDataPromises.has(cacheKey)) return weatherCityDataPromises.get(cacheKey);

  const cityRequest = fetch(dataUrl)
    .then((response) => {
      if (!response.ok) throw new Error(`City label data request failed (${response.status})`);
      return response.json();
    })
    .then((payload) => {
      if (!Array.isArray(payload)) throw new Error('City label data is not an array');

      return payload
        .map((city) => ({
          city: String(city.city || '').trim(),
          latitude: Number(city.latitude),
          longitude: Number(city.longitude),
          rank: Number(city.rank),
        }))
        .filter((city) => (
          city.city
          && Number.isFinite(city.latitude)
          && Number.isFinite(city.longitude)
        ))
        .sort((a, b) => (
          (Number.isFinite(a.rank) ? a.rank : Number.MAX_SAFE_INTEGER)
          - (Number.isFinite(b.rank) ? b.rank : Number.MAX_SAFE_INTEGER)
        ));
    });
  const favoriteRequest = loadMapCityFavorites(favoritesUrl)
    .catch((error) => {
      console.warn('[county-weather-map] City favorites failed:', error);
      return [];
    });
  const request = Promise.all([cityRequest, favoriteRequest])
    .then(([cities, favorites]) => mergeMapCityFavorites(cities, favorites, mapScope))
    .catch((error) => {
      weatherCityDataPromises.delete(cacheKey);
      throw error;
    });
  weatherCityDataPromises.set(cacheKey, request);
  return request;
}

export function installWeatherCityLabels(leafletMap, homeCenter, dataUrl, {
  mapScope = 'county',
  favoritesUrl = MAP_CITY_FAVORITES_URL,
} = {}) {
  if (!leafletMap || !window.L || !dataUrl) return null;

  const paneName = 'weatherPlaceLabelPane';
  const pane = leafletMap.getPane(paneName) || leafletMap.createPane(paneName);
  pane.style.zIndex = '475';
  pane.style.pointerEvents = 'none';

  const layer = window.L.layerGroup().addTo(leafletMap);
  const overlay = { data: null, layer, map: leafletMap, homeCenter, render: null };
  const render = () => {
    if (!overlay.data?.length) return;

    const bounds = overlay.map.getBounds().pad(0.08);
    const maxRank = weatherCityMaxRank(overlay.map.getZoom());
    const visibleCities = overlay.data.filter((city) => (
      city.latitude >= bounds.getSouth()
      && city.latitude <= bounds.getNorth()
      && city.longitude >= bounds.getWest()
      && city.longitude <= bounds.getEast()
      && (
        (city.favorite && overlay.map.getZoom() >= city.minZoom)
        || isHomeLabel(city, overlay.homeCenter)
        || (!city.favorite && (!Number.isFinite(city.rank) || city.rank <= maxRank))
      )
    )).sort((a, b) => (
      Number(isHomeLabel(b, overlay.homeCenter)) - Number(isHomeLabel(a, overlay.homeCenter))
      || Number(b.favorite) - Number(a.favorite)
    ));
    const cities = thinCityLabelsByCollision(visibleCities, overlay.map, overlay.homeCenter);

    overlay.layer.clearLayers();
    cities.forEach((city) => {
      const { major, width, height } = cityLabelDimensions(city, overlay.homeCenter);
      const icon = window.L.divIcon({
        className: `map-place-label${major ? ' is-major' : ''}`,
        html: `<span>${escapeCityLabelHtml(city.city)}</span>`,
        iconSize: [width, height],
        iconAnchor: [Math.round(width / 2), Math.round(height / 2)],
      });
      window.L.marker([city.latitude, city.longitude], {
        pane: paneName,
        icon,
        interactive: false,
        keyboard: false,
      }).addTo(overlay.layer);
    });
  };
  overlay.render = render;

  leafletMap.on('moveend', render);
  loadWeatherCityData(dataUrl, mapScope, favoritesUrl)
    .then((data) => {
      overlay.data = data;
      render();
    })
    .catch((error) => {
      console.warn('[county-weather-map] City labels failed:', error);
    });

  return overlay;
}
