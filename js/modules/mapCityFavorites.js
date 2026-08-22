export const MAP_CITY_FAVORITE_SCOPES = Object.freeze([
  'tropical',
  'county',
  'homepage',
]);

export const MAP_CITY_FAVORITES_URL = new URL(
  '../data/map-city-favorites.json?v=20260822-san-diego-cities-3',
  import.meta.url,
).toString();

const favoriteDataPromises = new Map();
const validScopes = new Set(MAP_CITY_FAVORITE_SCOPES);

function cityCoordinateKey(city) {
  return [
    String(city?.city || '').trim().toLocaleLowerCase('en-US'),
    Number(city?.latitude).toFixed(5),
    Number(city?.longitude).toFixed(5),
  ].join('|');
}

export function normalizeMapCityFavorites(payload) {
  if (!Array.isArray(payload)) throw new Error('Map city favorites are not an array');

  const seenIds = new Set();
  return payload.map((favorite, index) => {
    const id = String(favorite?.id || '').trim();
    const city = String(favorite?.city || '').trim();
    const latitude = Number(favorite?.latitude);
    const longitude = Number(favorite?.longitude);
    const rank = Number(favorite?.rank);
    const minZoom = Number(favorite?.minZoom ?? 0);
    const maps = Array.from(new Set(
      (Array.isArray(favorite?.maps) ? favorite.maps : [])
        .map((scope) => String(scope || '').trim().toLowerCase()),
    ));

    if (!id || seenIds.has(id)) {
      throw new Error(`Map city favorite at index ${index} has a missing or duplicate id`);
    }
    if (!city || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error(`Map city favorite ${id} has invalid label coordinates`);
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new Error(`Map city favorite ${id} is outside valid latitude/longitude bounds`);
    }
    if (!Number.isInteger(minZoom) || minZoom < 0 || minZoom > 20) {
      throw new Error(`Map city favorite ${id} has an invalid minZoom`);
    }
    if (!maps.length || maps.some((scope) => !validScopes.has(scope))) {
      throw new Error(`Map city favorite ${id} has an invalid maps scope`);
    }

    seenIds.add(id);
    return {
      id,
      city,
      latitude,
      longitude,
      rank: Number.isInteger(rank) && rank > 0 ? rank : Number.POSITIVE_INFINITY,
      maps,
      minZoom,
      favorite: true,
    };
  });
}

export function mergeMapCityFavorites(cities, favorites, scope) {
  if (!validScopes.has(scope)) throw new Error(`Unknown map city favorite scope: ${scope}`);

  const scopedFavorites = (favorites || []).filter((favorite) => favorite.maps.includes(scope));
  const favoriteKeys = new Set(scopedFavorites.map(cityCoordinateKey));
  const ordinaryCities = (cities || [])
    .filter((city) => !favoriteKeys.has(cityCoordinateKey(city)))
    .map((city) => ({ ...city, favorite: false }));

  return [...scopedFavorites, ...ordinaryCities];
}

export function clearMapCityFavoriteCache() {
  favoriteDataPromises.clear();
}

export function loadMapCityFavorites(
  dataUrl = MAP_CITY_FAVORITES_URL,
  fetchImpl = globalThis.fetch,
) {
  if (favoriteDataPromises.has(dataUrl)) return favoriteDataPromises.get(dataUrl);
  if (typeof fetchImpl !== 'function') return Promise.reject(new Error('Fetch is unavailable'));

  const request = Promise.resolve()
    .then(() => fetchImpl.call(globalThis, dataUrl, {
      cache: 'no-cache',
      headers: { Accept: 'application/json' },
    }))
    .then((response) => {
      if (!response.ok) throw new Error(`Map city favorites request failed (${response.status})`);
      return response.json();
    })
    .then(normalizeMapCityFavorites)
    .catch((error) => {
      favoriteDataPromises.delete(dataUrl);
      throw error;
    });
  favoriteDataPromises.set(dataUrl, request);
  return request;
}
