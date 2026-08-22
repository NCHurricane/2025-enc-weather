export const MAP_BORDER_RENDERER_FILTER =
  'drop-shadow(0 0 1px rgba(45, 45, 45, 0.95))';

export const MAP_MAJOR_BORDER_STYLE = Object.freeze({
  color: '#ededed',
  weight: 1.4,
  opacity: 0.72,
  fill: false,
  lineCap: 'round',
  lineJoin: 'round',
});

const worldCountryBorderUrl = new URL(
  '../data/boundaries/world-countries-50m.geojson',
  import.meta.url,
).toString();

export const WORLD_COUNTRY_BORDER_OVERLAY = Object.freeze({
  type: 'geojson',
  url: worldCountryBorderUrl,
  maxZoom: 8,
  attribution: 'Borders: <a href="https://www.naturalearthdata.com/">Natural Earth</a>',
  rendererFilter: MAP_BORDER_RENDERER_FILTER,
  style: MAP_MAJOR_BORDER_STYLE,
});
