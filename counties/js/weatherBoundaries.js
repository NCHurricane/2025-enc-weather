import {
  MAP_BORDER_RENDERER_FILTER,
  MAP_MAJOR_BORDER_STYLE,
  WORLD_COUNTRY_BORDER_OVERLAY,
} from '../../js/modules/mapBoundaryOverlays.js?v=20260822-map-borders-1';

const BOUNDARY_ATTRIBUTION =
  'Boundaries: <a href="https://www.census.gov/geographies/mapping-files/2025/geo/carto-boundary-file.html">U.S. Census Bureau</a>';

const stateBoundaryUrl = new URL(
  '../data/boundaries/us-states-2025-500k.geojson',
  import.meta.url,
).toString();
const countyBoundaryUrl = new URL(
  '../data/boundaries/us-counties-2025-500k.geojson',
  import.meta.url,
).toString();

export const WEATHER_BOUNDARY_OVERLAYS = Object.freeze([
  WORLD_COUNTRY_BORDER_OVERLAY,
  Object.freeze({
    type: 'geojson',
    url: countyBoundaryUrl,
    minZoom: 7,
    attribution: BOUNDARY_ATTRIBUTION,
    rendererFilter: MAP_BORDER_RENDERER_FILTER,
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
    maxZoom: 8,
    attribution: BOUNDARY_ATTRIBUTION,
    rendererFilter: MAP_BORDER_RENDERER_FILTER,
    style: MAP_MAJOR_BORDER_STYLE,
  }),
]);
