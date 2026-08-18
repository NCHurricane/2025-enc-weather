const BOUNDARY_ATTRIBUTION =
  'Boundaries: <a href="https://www.census.gov/geographies/mapping-files/2025/geo/carto-boundary-file.html">U.S. Census Bureau</a>';
const BOUNDARY_RENDERER_FILTER = 'drop-shadow(0 0 1px rgba(45, 45, 45, 0.95))';

const stateBoundaryUrl = new URL(
  '../data/boundaries/us-states-2025-500k.geojson',
  import.meta.url,
).toString();
const countyBoundaryUrl = new URL(
  '../data/boundaries/us-counties-2025-500k.geojson',
  import.meta.url,
).toString();

export const WEATHER_BOUNDARY_OVERLAYS = Object.freeze([
  Object.freeze({
    type: 'geojson',
    url: countyBoundaryUrl,
    minZoom: 7,
    attribution: BOUNDARY_ATTRIBUTION,
    rendererFilter: BOUNDARY_RENDERER_FILTER,
    zoomStyles: Object.freeze([
      Object.freeze({
        minZoom: 7,
        maxZoom: 7,
        style: Object.freeze({
          color: '#ededed',
          weight: 0.85,
          opacity: 0.35,
          fill: false,
          lineCap: 'round',
          lineJoin: 'round',
        }),
      }),
      Object.freeze({
        minZoom: 8,
        style: Object.freeze({
          color: '#ededed',
          weight: 0.9,
          opacity: 0.62,
          fill: false,
          lineCap: 'round',
          lineJoin: 'round',
        }),
      }),
    ]),
  }),
  Object.freeze({
    type: 'geojson',
    url: stateBoundaryUrl,
    attribution: BOUNDARY_ATTRIBUTION,
    rendererFilter: BOUNDARY_RENDERER_FILTER,
    style: Object.freeze({
      color: '#ededed',
      weight: 1.4,
      opacity: 0.72,
      fill: false,
      lineCap: 'round',
      lineJoin: 'round',
    }),
  }),
]);
