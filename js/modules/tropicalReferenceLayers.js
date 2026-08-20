const NATURAL_EARTH_ATTRIBUTION =
  'Borders: <a href="https://www.naturalearthdata.com/">Natural Earth</a>';
const BORDER_RENDERER_FILTER = 'drop-shadow(0 0 1px rgba(45, 45, 45, 0.95))';

const worldBorderUrl = new URL(
  '../data/boundaries/world-countries-50m.geojson',
  import.meta.url,
).toString();

export const TROPICAL_WORLD_BORDER_OVERLAY = Object.freeze({
  type: 'geojson',
  url: worldBorderUrl,
  attribution: NATURAL_EARTH_ATTRIBUTION,
  rendererFilter: BORDER_RENDERER_FILTER,
  style: Object.freeze({
    color: '#ededed',
    weight: 1.4,
    opacity: 0.72,
    fill: false,
    lineCap: 'round',
    lineJoin: 'round',
  }),
});

export const TROPICAL_REFERENCE_OVERLAYS = Object.freeze([
  TROPICAL_WORLD_BORDER_OVERLAY,
]);
