import { installBasemapMenuControl } from './interactiveWeatherMap.js?v=20260824-phase5-1';
import {
  installLeafletPopupShell,
  installLeafletPopupTrigger,
} from './leafletPopupShell.js?v=20260824-phase6-1';

const DEFAULT_BASEMAP_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png';
const DEFAULT_BASEMAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a> | Tropical data: NOAA/NHC';

export const TROPICAL_LAYER_KEYS = Object.freeze([
  'outlookAreas',
  'cones',
  'forecastTracks',
  'outlookPoints',
  'stormPositions',
]);

export const TROPICAL_STORM_LAYER_KEYS = Object.freeze([
  'currentPosition',
  'bestTrack',
  'cone',
  'forecastTrack',
  'watchesWarnings',
  'surgeWarnings',
  'windRadii34',
  'windRadii50',
  'windRadii64',
]);

export const TROPICAL_BASIN_VIEWS = Object.freeze({
  atl: Object.freeze({
    label: 'Atlantic',
    center: Object.freeze([27, -70]),
    zoom: 4,
    mobileZoomAdjustment: -1,
    fitZoomAdjustment: 1,
    referenceLongitude: -58,
    maxBounds: null,
  }),
  epac: Object.freeze({
    label: 'Eastern Pacific',
    center: Object.freeze([20, -130]),
    zoom: 4,
    mobileZoomAdjustment: -1,
    fitZoomAdjustment: -1,
    referenceLongitude: -122,
    maxBounds: null,
  }),
  cpac: Object.freeze({
    label: 'Central Pacific',
    center: Object.freeze([20, -145]),
    zoom: 4,
    mobileZoomAdjustment: -1,
    fitZoomAdjustment: 0,
    referenceLongitude: -180,
    maxBounds: null,
  }),
});

export const TROPICAL_RESPONSIVE_BREAKPOINT = 680;

export function tropicalZoomForView(view, compact = false) {
  return view.zoom + (compact ? view.mobileZoomAdjustment || 0 : 0);
}

const VALID_PACKAGE_STATES = new Set(['fresh', 'partial', 'empty', 'stale', 'unavailable']);
const SUPPORTED_OVERVIEW_SCHEMA_VERSION = '1.0.0';
const SUPPORTED_STORM_SCHEMA_VERSION = '1.0.0';
const VALID_PRODUCT_STATES = new Set(['fresh', 'not-issued', 'unavailable']);
const EMPTY_FEATURE_COLLECTION = Object.freeze({ type: 'FeatureCollection', features: [] });

const LEGEND_ITEMS = Object.freeze([
  Object.freeze({ label: 'Active storm', className: 'is-storm' }),
  Object.freeze({ label: 'Forecast cone', className: 'is-cone' }),
  Object.freeze({ label: 'Forecast track', className: 'is-track' }),
  Object.freeze({ label: 'Low chance', className: 'is-low' }),
  Object.freeze({ label: 'Medium chance', className: 'is-medium' }),
  Object.freeze({ label: 'High chance', className: 'is-high' }),
]);

const STORM_LEGEND_ITEMS = Object.freeze([
  Object.freeze({ label: 'Current position', className: 'is-storm' }),
  Object.freeze({ label: 'Past track', className: 'is-best-track' }),
  Object.freeze({ label: 'Forecast track', className: 'is-track' }),
  Object.freeze({ label: 'Forecast cone', className: 'is-cone' }),
  Object.freeze({ label: 'Watches / warnings', className: 'is-warning' }),
  Object.freeze({ label: 'Wind radii', className: 'is-radii' }),
]);

function stormIdBasin(stormId) {
  const prefix = String(stormId || '').slice(0, 2).toUpperCase();
  if (prefix === 'AL') return 'atl';
  if (prefix === 'EP') return 'epac';
  if (prefix === 'CP') return 'cpac';
  throw new Error(`Invalid ATCF storm ID: ${stormId}`);
}

function resolveElement(value, documentRef) {
  return typeof value === 'string' ? documentRef?.getElementById(value) || null : value;
}

function assertBasin(basin) {
  if (!Object.hasOwn(TROPICAL_BASIN_VIEWS, basin)) {
    throw new Error(`Unsupported tropical basin: ${basin}`);
  }
  return basin;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeLongitudeNear(longitude, referenceLongitude) {
  if (!Number.isFinite(longitude)) return longitude;

  let normalized = longitude;
  while (normalized - referenceLongitude > 180) normalized -= 360;
  while (normalized - referenceLongitude < -180) normalized += 360;
  return normalized;
}

function normalizeCoordinates(value, referenceLongitude) {
  if (!Array.isArray(value)) return value;
  if (value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1])) {
    return [normalizeLongitudeNear(value[0], referenceLongitude), ...value.slice(1)];
  }
  return value.map((child) => normalizeCoordinates(child, referenceLongitude));
}

function normalizeGeometry(geometry, referenceLongitude) {
  if (!geometry || typeof geometry !== 'object') return geometry;
  if (geometry.type === 'GeometryCollection') {
    return {
      ...geometry,
      geometries: (geometry.geometries || []).map((child) =>
        normalizeGeometry(child, referenceLongitude),
      ),
    };
  }
  return {
    ...geometry,
    coordinates: normalizeCoordinates(geometry.coordinates, referenceLongitude),
  };
}

export function normalizeGeoJsonForBasin(geoJson, basin) {
  const view = TROPICAL_BASIN_VIEWS[assertBasin(basin)];
  const source = geoJson || EMPTY_FEATURE_COLLECTION;
  if (source.type !== 'FeatureCollection' || !Array.isArray(source.features)) {
    throw new Error('Tropical map layer must be a GeoJSON FeatureCollection');
  }

  return {
    ...source,
    features: source.features.map((feature) => ({
      ...feature,
      geometry: normalizeGeometry(feature.geometry, view.referenceLongitude),
      properties: { ...(feature.properties || {}) },
    })),
  };
}

function collectCoordinates(value, output) {
  if (!Array.isArray(value)) return;
  if (value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1])) {
    output.push([value[1], value[0]]);
    return;
  }
  value.forEach((child) => collectCoordinates(child, output));
}

function collectGeometryCoordinates(geometry, output) {
  if (!geometry) return;
  if (geometry.type === 'GeometryCollection') {
    (geometry.geometries || []).forEach((child) => collectGeometryCoordinates(child, output));
    return;
  }
  collectCoordinates(geometry.coordinates, output);
}

function formatTime(value) {
  if (!value) return 'time unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function probabilityLabel(properties, period) {
  const value = properties?.[`${period}DayProbability`];
  const category = properties?.[`${period}DayCategory`];
  if (value === null || value === undefined || value === '') return null;
  if (!Number.isFinite(Number(value))) return null;
  const suffix = category ? ` (${escapeHtml(category)})` : '';
  return `${Number(value)}%${suffix}`;
}

function outlookColor(properties) {
  const probability = Math.max(
    Number(properties?.twoDayProbability) || 0,
    Number(properties?.sevenDayProbability) || 0,
  );
  if (probability >= 60) return '#e53935';
  if (probability >= 40) return '#f59e0b';
  return '#facc15';
}

function stormColor(classification) {
  const normalized = String(classification || '').toUpperCase();
  if (['HU', 'TY', 'ST'].includes(normalized)) return '#ef4444';
  if (['TS', 'SS'].includes(normalized)) return '#f97316';
  return '#38bdf8';
}

const OUTLOOK_PAGE_BY_KMZ = Object.freeze({
  'gtwo_atl.kmz': 'https://www.nhc.noaa.gov/gtwo.php?basin=atlc&fdays=7',
  'gtwo_pac.kmz': 'https://www.nhc.noaa.gov/gtwo.php?basin=epac&fdays=7',
  'gtwo_cpac.kmz': 'https://www.nhc.noaa.gov/gtwo.php?basin=cpac&fdays=7',
});

function humanReadableNHCSource(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'https:' || !['nhc.noaa.gov', 'www.nhc.noaa.gov'].includes(url.hostname)) {
      return null;
    }

    if (!url.pathname.toLowerCase().endsWith('.kmz')) return url.href;

    const fileName = url.pathname.split('/').at(-1)?.toLowerCase() || '';
    return OUTLOOK_PAGE_BY_KMZ[fileName] || null;
  } catch {
    return null;
  }
}

function officialSourceLink(value, label = 'View official NHC source') {
  const href = humanReadableNHCSource(value);
  if (!href) {
    return '';
  }
  return `<p class="tropical-map-popup__text"><a class="tropical-map-popup__link" href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(label)}</a></p>`;
}

function outlookAreaLabel(value) {
  const lines = String(value || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines[1] || 'Area of interest';
}

export function buildTropicalPopup(layerKey, properties = {}) {
  const stormId = /^[A-Z]{2}\d{6}$/.test(String(properties.stormId || ''))
    ? String(properties.stormId)
    : null;
  const sourceTime = properties.sourceIssueTime
    ? `<p class="tropical-map-popup__time">Issued ${escapeHtml(formatTime(properties.sourceIssueTime))}</p>`
    : '';

  if (layerKey === 'stormPositions') {
    const title = properties.name || stormId || 'Active storm';
    const classification = properties.classification
      ? `${escapeHtml(properties.classification)} `
      : '';
    const intensity = Number.isFinite(Number(properties.intensityKnots))
      ? `${Number(properties.intensityKnots)} kt`
      : 'intensity unavailable';
    const pressure = Number.isFinite(Number(properties.pressureMillibars))
      ? `<li>Pressure: ${Number(properties.pressureMillibars)} mb</li>`
      : '';
    const movement = Number.isFinite(Number(properties.movementDirectionDegrees))
      && Number.isFinite(Number(properties.movementSpeedMph))
      ? `<li>Movement: ${Number(properties.movementDirectionDegrees)}° at ${Number(properties.movementSpeedMph)} mph</li>`
      : '';
    const detailLink = stormId
      ? `<p class="tropical-map-popup__text"><a class="tropical-map-popup__link" href="active/?storm=${encodeURIComponent(stormId)}">View ${escapeHtml(title)} details</a></p>`
      : '';
    return `<article class="weather-map-popup__content tropical-map-popup"><h3 class="tropical-map-popup__title">${escapeHtml(title)}</h3><ul class="tropical-map-popup__list"><li>${classification}${intensity}</li>${pressure}${movement}</ul>${sourceTime}${detailLink}</article>`;
  }

  if (layerKey === 'outlookAreas' || layerKey === 'outlookPoints') {
    const twoDay = probabilityLabel(properties, 'two');
    const sevenDay = probabilityLabel(properties, 'seven');
    const chances = [
      twoDay ? `<li>2-day chance: ${twoDay}</li>` : '',
      sevenDay ? `<li>7-day chance: ${sevenDay}</li>` : '',
    ].join('');
    const areaLabel = outlookAreaLabel(properties.discussionHtml);
    const sourceLink = officialSourceLink(properties.sourceUrl);
    return `<article class="weather-map-popup__content tropical-map-popup"><h3 class="tropical-map-popup__title">${escapeHtml(areaLabel)}</h3><ul class="tropical-map-popup__list">${chances || '<li>Development chance unavailable</li>'}</ul>${sourceTime}${sourceLink}</article>`;
  }

  if (layerKey === 'currentPosition') {
    const title = properties.name || stormId || 'Current position';
    const intensity = Number.isFinite(Number(properties.intensityKnots))
      ? `<li>Maximum wind: ${Number(properties.intensityKnots)} kt</li>`
      : '';
    const pressure = Number.isFinite(Number(properties.pressureMillibars))
      ? `<li>Pressure: ${Number(properties.pressureMillibars)} mb</li>`
      : '';
    return `<article class="weather-map-popup__content tropical-map-popup"><h3 class="tropical-map-popup__title">${escapeHtml(title)}</h3><ul class="tropical-map-popup__list">${intensity}${pressure}</ul>${sourceTime}</article>`;
  }

  if (layerKey === 'forecastTrack') {
    const hour = Number.isFinite(Number(properties.forecastHour))
      ? `<li>Forecast hour: ${Number(properties.forecastHour)}</li>`
      : '';
    const wind = Number.isFinite(Number(properties.intensityKnots))
      ? `<li>Maximum wind: ${Number(properties.intensityKnots)} kt</li>`
      : '';
    const validTime = properties.validTime
      ? `<p class="tropical-map-popup__time">Valid ${escapeHtml(formatTime(properties.validTime))}</p>`
      : sourceTime;
    return `<article class="weather-map-popup__content tropical-map-popup"><h3 class="tropical-map-popup__title">Forecast track${stormId ? ` for ${escapeHtml(stormId)}` : ''}</h3><ul class="tropical-map-popup__list">${hour}${wind}</ul>${validTime}</article>`;
  }

  if (layerKey === 'bestTrack') {
    const label = properties.label || 'Past track';
    const description = properties.description
      ? `<p class="tropical-map-popup__text">${escapeHtml(properties.description)}</p>`
      : '';
    return `<article class="weather-map-popup__content tropical-map-popup"><h3 class="tropical-map-popup__title">${escapeHtml(label)}</h3>${description}${sourceTime}</article>`;
  }

  if (layerKey === 'watchesWarnings' || layerKey === 'surgeWarnings') {
    const fallback = layerKey === 'surgeWarnings' ? 'Storm surge alert' : 'Tropical watch / warning';
    const description = properties.description
      ? `<p class="tropical-map-popup__text">${escapeHtml(properties.description)}</p>`
      : '';
    return `<article class="weather-map-popup__content tropical-map-popup"><h3 class="tropical-map-popup__title">${escapeHtml(properties.warningType || fallback)}</h3>${description}${sourceTime}</article>`;
  }

  if (layerKey.startsWith('windRadii')) {
    const threshold = Number(properties.windThresholdKnots) || Number(layerKey.slice(-2));
    const hour = Number.isFinite(Number(properties.forecastHour))
      ? `<li>Forecast hour: ${Number(properties.forecastHour)}</li>`
      : '';
    const validTime = properties.validTime
      ? `<p class="tropical-map-popup__time">Valid ${escapeHtml(formatTime(properties.validTime))}</p>`
      : sourceTime;
    return `<article class="weather-map-popup__content tropical-map-popup"><h3 class="tropical-map-popup__title">${threshold}-kt wind radii</h3><ul class="tropical-map-popup__list">${hour}</ul>${validTime}</article>`;
  }

  const productLabel = layerKey === 'cones' ? 'Forecast cone' : 'Forecast track';
  const stormLabel = stormId ? ` for ${escapeHtml(stormId)}` : '';
  const sourceLink = officialSourceLink(properties.sourceUrl);
  return `<article class="weather-map-popup__content tropical-map-popup"><h3 class="tropical-map-popup__title">${productLabel}${stormLabel}</h3>${sourceTime}${sourceLink}</article>`;
}

export function tropicalPopupAccessibleLabel(layerKey, properties = {}) {
  const stormId = /^[A-Z]{2}\d{6}$/.test(String(properties.stormId || ''))
    ? String(properties.stormId)
    : '';
  if (layerKey === 'stormPositions' || layerKey === 'currentPosition') {
    return `${properties.name || stormId || 'Active storm'} map details`;
  }
  if (layerKey === 'outlookAreas' || layerKey === 'outlookPoints') {
    return `${outlookAreaLabel(properties.discussionHtml)} development outlook`;
  }
  if (layerKey === 'watchesWarnings' || layerKey === 'surgeWarnings') {
    const fallback = layerKey === 'surgeWarnings' ? 'Storm surge alert' : 'Tropical watch or warning';
    return `${properties.warningType || fallback} map details`;
  }
  if (layerKey.startsWith('windRadii')) {
    const threshold = Number(properties.windThresholdKnots) || Number(layerKey.slice(-2));
    return `${threshold}-knot wind radii map details`;
  }
  if (layerKey === 'bestTrack') return `${properties.label || 'Past track'} map details`;
  if (layerKey === 'cones' || layerKey === 'cone') return `Forecast cone${stormId ? ` for ${stormId}` : ''} map details`;
  return `Forecast track${stormId ? ` for ${stormId}` : ''} map details`;
}

export function validateTropicalOverviewPackage(packageData) {
  if (!packageData || typeof packageData !== 'object') {
    throw new Error('Tropical overview package is missing');
  }
  if (packageData.kind !== 'tropical-overview') {
    throw new Error('Tropical overview package kind is invalid');
  }
  if (packageData.schemaVersion !== SUPPORTED_OVERVIEW_SCHEMA_VERSION) {
    throw new Error(`Unsupported tropical overview schema: ${packageData.schemaVersion}`);
  }
  assertBasin(packageData.basin);
  if (!VALID_PACKAGE_STATES.has(packageData.state)) {
    throw new Error(`Tropical overview state is invalid: ${packageData.state}`);
  }
  if (!packageData.layers || typeof packageData.layers !== 'object') {
    throw new Error('Tropical overview package has no layers');
  }
  for (const layerKey of TROPICAL_LAYER_KEYS) {
    const layer = packageData.layers[layerKey];
    if (!layer || layer.type !== 'FeatureCollection' || !Array.isArray(layer.features)) {
      throw new Error(`Tropical overview layer is invalid: ${layerKey}`);
    }
  }
  return packageData;
}

export function validateTropicalStormManifest(manifest, expectedStormId = null) {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('Tropical storm manifest is missing');
  }
  if (manifest.kind !== 'tropical-storm-map') {
    throw new Error('Tropical storm manifest kind is invalid');
  }
  if (manifest.schemaVersion !== SUPPORTED_STORM_SCHEMA_VERSION) {
    throw new Error(`Unsupported tropical storm schema: ${manifest.schemaVersion}`);
  }
  const stormId = String(manifest.stormId || '').toUpperCase();
  stormIdBasin(stormId);
  if (expectedStormId && stormId !== String(expectedStormId).toUpperCase()) {
    throw new Error(`Tropical storm manifest identity mismatch: ${stormId}`);
  }
  if (manifest.stormState !== 'live') {
    throw new Error(`Tropical storm state is invalid: ${manifest.stormState}`);
  }
  if (!VALID_PACKAGE_STATES.has(manifest.state)) {
    throw new Error(`Tropical storm package state is invalid: ${manifest.state}`);
  }
  if (!manifest.products || typeof manifest.products !== 'object') {
    throw new Error('Tropical storm manifest has no products');
  }
  for (const [productKey, product] of Object.entries(manifest.products)) {
    if (!product || !VALID_PRODUCT_STATES.has(product.state)) {
      throw new Error(`Tropical storm product state is invalid: ${productKey}`);
    }
    if (product.state === 'fresh') {
      if (typeof product.file !== 'string' || !/^[a-z0-9-]+\.geojson$/i.test(product.file)) {
        throw new Error(`Tropical storm product file is invalid: ${productKey}`);
      }
    } else if (product.file !== null) {
      throw new Error(`Unavailable tropical storm product cannot name a file: ${productKey}`);
    }
  }
  if (manifest.products.currentPosition?.state !== 'fresh') {
    throw new Error('Tropical storm current position is required');
  }
  manifest.stormId = stormId;
  return manifest;
}

function validateStormCollection(collection, stormId, productKey) {
  if (!collection || collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) {
    throw new Error(`Tropical storm layer is invalid: ${productKey}`);
  }
  for (const feature of collection.features) {
    if (String(feature?.properties?.stormId || '').toUpperCase() !== stormId) {
      throw new Error(`Tropical storm layer identity mismatch: ${productKey}`);
    }
  }
  return collection;
}

function productFileUrl(manifestUrl, file) {
  try {
    return new URL(file, manifestUrl).href;
  } catch {
    const base = String(manifestUrl).replace(/[^/]*$/, '');
    return `${base}${file}`;
  }
}

function emptyStormLayers() {
  return Object.fromEntries(TROPICAL_STORM_LAYER_KEYS.map((key) => [key, EMPTY_FEATURE_COLLECTION]));
}

function splitStormProducts(manifest, collections) {
  const layers = emptyStormLayers();
  layers.currentPosition = collections.currentPosition || EMPTY_FEATURE_COLLECTION;
  layers.bestTrack = collections.bestTrack || EMPTY_FEATURE_COLLECTION;
  layers.cone = collections.cone || EMPTY_FEATURE_COLLECTION;
  layers.forecastTrack = collections.forecastTrack || EMPTY_FEATURE_COLLECTION;
  layers.watchesWarnings = collections.watchesWarnings || EMPTY_FEATURE_COLLECTION;
  layers.surgeWarnings = collections.surgeWarnings || EMPTY_FEATURE_COLLECTION;
  const radii = collections.windRadii || EMPTY_FEATURE_COLLECTION;
  for (const threshold of [34, 50, 64]) {
    layers[`windRadii${threshold}`] = {
      ...radii,
      features: radii.features.filter(
        (feature) => Number(feature?.properties?.windThresholdKnots) === threshold,
      ),
    };
  }
  return { manifest, layers };
}

function layerCount(packageData, key) {
  return packageData.layers[key]?.features?.length || 0;
}

export function summarizeTropicalOverview(packageData) {
  validateTropicalOverviewPackage(packageData);
  return {
    outlookAreas: layerCount(packageData, 'outlookAreas'),
    outlookPoints: layerCount(packageData, 'outlookPoints'),
    activeStorms: layerCount(packageData, 'stormPositions'),
    forecastTracks: layerCount(packageData, 'forecastTracks'),
    cones: layerCount(packageData, 'cones'),
  };
}

function createLegendControl(leaflet, documentRef, position, items = LEGEND_ITEMS) {
  const control = leaflet.control({ position });
  control.onAdd = () => {
    const container = documentRef.createElement('section');
    container.className = 'tropical-map-legend';
    container.setAttribute('aria-label', 'Tropical map legend');

    const heading = documentRef.createElement('h2');
    heading.className = 'tropical-map-legend__title';
    heading.textContent = 'Map legend';
    container.appendChild(heading);

    const list = documentRef.createElement('ul');
    for (const item of items) {
      const row = documentRef.createElement('li');
      const swatch = documentRef.createElement('span');
      swatch.className = `tropical-map-legend__swatch ${item.className}`;
      swatch.setAttribute('aria-hidden', 'true');
      row.appendChild(swatch);
      row.append(item.label);
      list.appendChild(row);
    }
    container.appendChild(list);
    control._tropicalContainer = container;
    return container;
  };
  return control;
}

export class TropicalMapEngine {
  constructor({
    container,
    status = null,
    basin = 'atl',
    leaflet = globalThis.L,
    documentRef = globalThis.document,
    windowRef = globalThis.window,
    fetchImpl = globalThis.fetch,
    resizeObserverClass = globalThis.ResizeObserver,
    basemapUrl = DEFAULT_BASEMAP_URL,
    basemapAttribution = DEFAULT_BASEMAP_ATTRIBUTION,
    basemaps = null,
    initialBasemap = 'light',
    showBasemapControl = false,
    basemapControlPosition = 'topright',
    referenceOverlays = [],
    responsiveBreakpoint = TROPICAL_RESPONSIVE_BREAKPOINT,
    showLegend = true,
    mode = 'overview',
    onStatus = () => {},
  } = {}) {
    this.documentRef = documentRef;
    this.windowRef = windowRef;
    this.container = resolveElement(container, documentRef);
    this.statusElement = resolveElement(status, documentRef);
    this.leaflet = leaflet;
    this.fetchImpl = typeof fetchImpl === 'function' ? fetchImpl.bind(globalThis) : fetchImpl;
    this.ResizeObserverClass = resizeObserverClass;
    this.basemapUrl = basemapUrl;
    this.basemapAttribution = basemapAttribution;
    this.basemaps = basemaps && Object.keys(basemaps).length ? basemaps : null;
    this.activeBasemapId = this.basemaps?.[initialBasemap]
      ? initialBasemap
      : Object.keys(this.basemaps || {})[0] || null;
    this.showBasemapControl = showBasemapControl;
    this.basemapControlPosition = ['topleft', 'topright', 'bottomleft', 'bottomright'].includes(
      basemapControlPosition,
    )
      ? basemapControlPosition
      : 'topright';
    this.referenceOverlays = Array.isArray(referenceOverlays) ? referenceOverlays : [];
    this.responsiveBreakpoint = responsiveBreakpoint;
    this.showLegend = showLegend;
    if (!['overview', 'storm'].includes(mode)) throw new Error(`Unsupported tropical map mode: ${mode}`);
    this.mode = mode;
    this.layerKeys = mode === 'storm' ? TROPICAL_STORM_LAYER_KEYS : TROPICAL_LAYER_KEYS;
    this.onStatus = onStatus;
    this.activeBasin = assertBasin(basin);
    this.compactLayout = null;
    this.pendingBasinView = false;

    this.map = null;
    this.basemapLayer = null;
    this.basemapLayers = new Map();
    this.basemapLayerControl = null;
    this.referenceLayers = [];
    this.zoomIndicator = null;
    this.layerGroups = new Map();
    this.overviewCache = new Map();
    this.legendControl = null;
    this.resizeObserver = null;
    this.loadController = null;
    this.loadGeneration = 0;
    this.mapInstanceCount = 0;
    this.renderedBasin = null;
    this.renderedStormId = null;
    this.state = 'idle';
    this.layerCounts = Object.fromEntries(this.layerKeys.map((key) => [key, 0]));
    this.layerVisibility = Object.fromEntries(
      this.layerKeys.map((key) => [key, !['windRadii50', 'windRadii64'].includes(key)]),
    );
    this.handleWindowResize = this.handleWindowResize.bind(this);
    this.updateZoomIndicator = this.updateZoomIndicator.bind(this);
  }

  ensureMap() {
    if (this.map) return this.map;
    if (!this.container) throw new Error('Tropical map container was not found');
    if (!this.leaflet) throw new Error('Leaflet did not load');

    const view = TROPICAL_BASIN_VIEWS[this.activeBasin];
    const compact = this.isCompactLayout();
    this.compactLayout = compact;
    this.container.setAttribute('aria-label', `${view.label} tropical weather map`);
    this.map = this.leaflet.map(this.container, {
      center: view.center,
      zoom: this.zoomForView(view, compact),
      minZoom: 2,
      maxZoom: 10,
      maxBounds: view.maxBounds,
      maxBoundsViscosity: 0.75,
      worldCopyJump: false,
      preferCanvas: false,
    });
    installLeafletPopupShell(this.map);
    this.mapInstanceCount += 1;

    this.installPanes();
    this.installZoomIndicator();
    if (this.basemaps) {
      this.createBasemapLayers();
      this.setBasemap(this.activeBasemapId);
      if (this.showBasemapControl) this.installBasemapControl();
    } else {
      this.basemapLayer = this.leaflet.tileLayer(this.basemapUrl, {
        attribution: this.basemapAttribution,
        maxZoom: 20,
        subdomains: 'abcd',
        noWrap: false,
        pane: 'tropicalBasemapPane',
      });
      this.basemapLayer.addTo(this.map);
    }

    this.referenceLayers = this.referenceOverlays
      .filter((reference) => reference?.type === 'geojson' && reference?.url)
      .map((reference) => this.addGeoJsonReferenceOverlay(reference))
      .filter(Boolean);

    for (const layerKey of this.layerKeys) {
      const group = this.leaflet.layerGroup();
      if (this.layerVisibility[layerKey]) group.addTo(this.map);
      this.layerGroups.set(layerKey, group);
    }

    if (this.showLegend && this.documentRef) {
      this.legendControl = createLegendControl(
        this.leaflet,
        this.documentRef,
        'bottomright',
        this.mode === 'storm' ? STORM_LEGEND_ITEMS : LEGEND_ITEMS,
      );
      this.legendControl.addTo(this.map);
    }
    this.installResponsiveObserver();
    this.syncResponsiveLayout();
    return this.map;
  }

  installZoomIndicator() {
    const zoomContainer = this.map?.zoomControl?.getContainer?.();
    if (!zoomContainer || this.zoomIndicator || !this.leaflet?.DomUtil?.create) return;
    zoomContainer.classList?.add?.('weather-map-zoom-indicator-enabled');
    this.zoomIndicator = this.leaflet.DomUtil.create(
      'div',
      'weather-map-zoom-indicator',
      zoomContainer,
    );
    this.zoomIndicator.setAttribute?.('role', 'status');
    this.zoomIndicator.setAttribute?.('aria-live', 'polite');
    this.map.on?.('zoom zoomend resize', this.updateZoomIndicator);
    this.updateZoomIndicator();
  }

  updateZoomIndicator() {
    if (!this.zoomIndicator || !this.map) return;
    const zoom = Number(this.map.getZoom?.()) || 0;
    this.zoomIndicator.textContent = `z ${Math.round(zoom)}`;
    this.zoomIndicator.title = `Zoom ${zoom.toFixed(2)}`;
  }

  addGeoJsonReferenceOverlay(reference) {
    if (!this.map || !this.leaflet?.geoJSON || typeof this.fetchImpl !== 'function') return null;
    const {
      url,
      minZoom,
      maxZoom,
      rendererFilter,
      attribution,
      style = {},
      ...geoJsonOptions
    } = reference;
    delete geoJsonOptions.type;

    const renderer = this.leaflet.canvas?.({
      pane: 'tropicalReferencePane',
      padding: 0.5,
    });
    const layer = this.leaflet.geoJSON(null, {
      ...geoJsonOptions,
      pane: 'tropicalReferencePane',
      ...(renderer ? { renderer } : {}),
      interactive: false,
      style,
    });
    if (attribution) layer.getAttribution = () => attribution;

    const syncLayer = () => {
      if (!this.map) return;
      const zoom = Number(this.map.getZoom?.());
      const visible =
        (minZoom === undefined || zoom >= minZoom)
        && (maxZoom === undefined || zoom <= maxZoom);
      if (visible && !this.map.hasLayer?.(layer)) layer.addTo(this.map);
      if (!visible && this.map.hasLayer?.(layer)) this.map.removeLayer?.(layer);

      const rendererContainer = renderer?.getContainer?.() || renderer?._container;
      if (rendererContainer) {
        rendererContainer.style.display = visible ? '' : 'none';
        if (rendererFilter) rendererContainer.style.filter = rendererFilter;
      }
    };

    this.map.on?.('zoomend', syncLayer);
    syncLayer();

    this.fetchImpl(url, {
      cache: 'force-cache',
      headers: { Accept: 'application/geo+json, application/json' },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`World-border GeoJSON request failed (${response.status})`);
        return response.json();
      })
      .then((geoJson) => {
        if (!this.map) return;
        layer.addData(geoJson);
        syncLayer();
      })
      .catch((error) => {
        console.warn('[tropical-map] World-border GeoJSON failed:', error);
      });
    return layer;
  }

  createBasemapLayers() {
    if (!this.map || !this.basemaps || this.basemapLayers.size) return;
    for (const [basemapId, config] of Object.entries(this.basemaps)) {
      const { label: _label, url, ...layerOptions } = config;
      this.basemapLayers.set(
        basemapId,
        this.leaflet.tileLayer(url, {
          ...layerOptions,
          pane: 'tropicalBasemapPane',
        }),
      );
    }
  }

  installBasemapControl() {
    if (!this.map || this.basemapLayerControl) return;
    this.basemapLayerControl = installBasemapMenuControl({
      leaflet: this.leaflet,
      map: this.map,
      basemaps: this.basemaps,
      initialBasemap: this.activeBasemapId,
      position: this.basemapControlPosition,
      onSelect: (basemapId) => this.setBasemap(basemapId),
    });
  }

  setBasemap(basemapId) {
    if (!this.basemaps?.[basemapId]) return false;
    this.activeBasemapId = basemapId;
    if (!this.map) return true;
    this.createBasemapLayers();
    const nextLayer = this.basemapLayers.get(basemapId);
    if (!nextLayer) return false;
    for (const layer of this.basemapLayers.values()) {
      if (layer !== nextLayer && this.map.hasLayer?.(layer)) this.map.removeLayer?.(layer);
    }
    if (!this.map.hasLayer?.(nextLayer)) nextLayer.addTo(this.map);
    this.basemapLayer = nextLayer;
    this.basemapLayerControl?.setActiveBasemap?.(basemapId);
    return true;
  }

  installPanes() {
    const panes = [
      ['tropicalBasemapPane', 200],
      ['tropicalReferencePane', 305],
      ['tropicalConePane', 310],
      ['tropicalRadiiPane', 315],
      ['tropicalOutlookPane', 320],
      ['tropicalTrackPane', 330],
      ['tropicalWarningPane', 335],
      ['tropicalPointPane', 340],
    ];
    for (const [name, zIndex] of panes) {
      const pane = this.map.createPane?.(name);
      if (pane?.style) {
        pane.style.zIndex = String(zIndex);
        if (name === 'tropicalReferencePane') pane.style.pointerEvents = 'none';
      }
    }
  }

  installResponsiveObserver() {
    if (this.ResizeObserverClass) {
      this.resizeObserver = new this.ResizeObserverClass((entries) => {
        const width = entries[0]?.contentRect?.width;
        this.syncResponsiveLayout(width);
      });
      this.resizeObserver.observe(this.container);
      return;
    }
    this.windowRef?.addEventListener?.('resize', this.handleWindowResize);
  }

  handleWindowResize() {
    this.syncResponsiveLayout();
  }

  isCompactLayout(width = this.container?.clientWidth) {
    return Number(width) > 0 && Number(width) <= this.responsiveBreakpoint;
  }

  zoomForView(view, compact = this.compactLayout ?? this.isCompactLayout()) {
    return tropicalZoomForView(view, compact);
  }

  syncResponsiveLayout(width = this.container?.clientWidth) {
    const compact = this.isCompactLayout(width);
    const previousCompact = this.compactLayout;
    this.compactLayout = compact;
    const legendContainer = this.legendControl?._tropicalContainer;
    legendContainer?.classList?.toggle('is-compact', compact);
    this.legendControl?.setPosition?.(compact ? 'bottomleft' : 'bottomright');
    if (this.map && previousCompact !== null && previousCompact !== compact) {
      const view = TROPICAL_BASIN_VIEWS[this.activeBasin];
      const previousAdjustment = previousCompact ? view.mobileZoomAdjustment || 0 : 0;
      const nextAdjustment = compact ? view.mobileZoomAdjustment || 0 : 0;
      const currentZoom = this.map.getZoom?.();
      if (Number.isFinite(currentZoom) && previousAdjustment !== nextAdjustment) {
        this.map.setZoom(currentZoom + nextAdjustment - previousAdjustment, { animate: false });
      }
    }
    this.map?.invalidateSize?.({ pan: false });
    return compact;
  }

  setBasin(basin, { move = true } = {}) {
    this.activeBasin = assertBasin(basin);
    const view = TROPICAL_BASIN_VIEWS[this.activeBasin];
    this.container?.setAttribute('aria-label', `${view.label} tropical weather map`);
    if (!this.map || !move) return view;
    if (
      Number(this.container?.clientWidth) <= 0
      || Number(this.container?.clientHeight) <= 0
    ) {
      this.pendingBasinView = true;
      return view;
    }

    // Leaflet enforces new max bounds immediately. Release the previous basin's
    // bounds before crossing oceans so its current center cannot be constrained
    // into an intermediate wrapped view.
    this.pendingBasinView = false;
    this.map.setMaxBounds?.(null);
    this.map.setView(view.center, this.zoomForView(view), { animate: false });
    this.map.setMaxBounds?.(view.maxBounds);
    return view;
  }

  beginLoad(basin) {
    this.ensureMap();
    const basinChanged = this.renderedBasin !== null && basin !== this.renderedBasin;
    const preservedLayers =
      !basinChanged && Object.values(this.layerCounts).some((count) => count > 0);
    this.setBasin(basin);
    if (basinChanged) this.clearRenderedLayers();
    this.loadController?.abort();
    this.loadController = new AbortController();
    this.loadGeneration += 1;
    const generation = this.loadGeneration;
    const label = TROPICAL_BASIN_VIEWS[this.activeBasin].label;
    this.setStatus('loading', `Loading the ${label} tropical map.`, { generation });
    return { generation, signal: this.loadController.signal, preservedLayers };
  }

  async loadOverview(
    basin,
    { url, fit = true, cache = 'no-store', memoryCache = false } = {},
  ) {
    if (!url) throw new Error('Tropical overview URL is required');
    if (typeof this.fetchImpl !== 'function') throw new Error('Fetch is unavailable');

    const request = this.beginLoad(basin);
    const cacheKey = `${basin}:${url}`;
    try {
      let packageData = memoryCache ? this.overviewCache.get(cacheKey) : null;
      if (!packageData) {
        const response = await this.fetchImpl(url, {
          cache,
          signal: request.signal,
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error(`Tropical overview request failed (${response.status})`);
        packageData = await response.json();
        if (memoryCache) this.overviewCache.set(cacheKey, packageData);
      }
      return this.renderOverview(packageData, { generation: request.generation, fit });
    } catch (error) {
      if (error?.name === 'AbortError' || request.generation !== this.loadGeneration) return false;
      const label = TROPICAL_BASIN_VIEWS[this.activeBasin].label;
      this.setStatus(
        'unavailable',
        request.preservedLayers
          ? `${label} tropical map data is unavailable. Previously rendered layers remain visible.`
          : `${label} tropical map data is unavailable.`,
        { error, generation: request.generation },
      );
      throw error;
    }
  }

  async loadStorm(stormId, { manifestUrl, fit = true, cache = 'no-store' } = {}) {
    if (this.mode !== 'storm') throw new Error('Storm packages require storm map mode');
    const expectedStormId = String(stormId || '').toUpperCase();
    const basin = stormIdBasin(expectedStormId);
    if (!manifestUrl) throw new Error('Tropical storm manifest URL is required');
    if (typeof this.fetchImpl !== 'function') throw new Error('Fetch is unavailable');

    const request = this.beginLoad(basin);
    try {
      const manifestResponse = await this.fetchImpl(manifestUrl, {
        cache,
        signal: request.signal,
        headers: { Accept: 'application/json' },
      });
      if (!manifestResponse.ok) {
        throw new Error(`Tropical storm manifest request failed (${manifestResponse.status})`);
      }
      const manifest = validateTropicalStormManifest(await manifestResponse.json(), expectedStormId);
      const freshProducts = Object.entries(manifest.products).filter(
        ([, product]) => product.state === 'fresh',
      );
      const entries = await Promise.all(
        freshProducts.map(async ([productKey, product]) => {
          const url = productFileUrl(manifestResponse.url || manifestUrl, product.file);
          const response = await this.fetchImpl(url, {
            cache,
            signal: request.signal,
            headers: { Accept: 'application/geo+json, application/json' },
          });
          if (!response.ok) {
            throw new Error(`Tropical storm product request failed: ${productKey} (${response.status})`);
          }
          return [
            productKey,
            validateStormCollection(await response.json(), expectedStormId, productKey),
          ];
        }),
      );
      return this.renderStorm(splitStormProducts(manifest, Object.fromEntries(entries)), {
        generation: request.generation,
        fit,
      });
    } catch (error) {
      if (error?.name === 'AbortError' || request.generation !== this.loadGeneration) return false;
      this.setStatus(
        'unavailable',
        request.preservedLayers
          ? `${expectedStormId} detailed map data is unavailable. Previously rendered layers remain visible.`
          : `${expectedStormId} detailed map data is unavailable. Other storm information remains available below.`,
        { error, generation: request.generation, stormId: expectedStormId },
      );
      throw error;
    }
  }

  renderOverview(packageData, { generation = null, fit = true } = {}) {
    if (this.mode !== 'overview') throw new Error('Overview packages require overview map mode');
    this.ensureMap();
    validateTropicalOverviewPackage(packageData);
    if (generation !== null && generation !== this.loadGeneration) return false;
    if (packageData.basin !== this.activeBasin) this.setBasin(packageData.basin);
    if (packageData.state === 'unavailable') {
      if (this.renderedBasin !== null && packageData.basin !== this.renderedBasin) {
        this.clearRenderedLayers();
      }
      this.applyPackageStatus(packageData);
      return true;
    }

    const normalizedLayers = new Map();
    const renderedLayers = new Map();
    for (const layerKey of TROPICAL_LAYER_KEYS) {
      const collection = normalizeGeoJsonForBasin(packageData.layers[layerKey], packageData.basin);
      normalizedLayers.set(layerKey, collection);
      renderedLayers.set(layerKey, this.createGeoJsonLayer(layerKey, collection));
    }

    for (const layerKey of TROPICAL_LAYER_KEYS) {
      const group = this.layerGroups.get(layerKey);
      group.clearLayers();
      group.addLayer(renderedLayers.get(layerKey));
      this.layerCounts[layerKey] = normalizedLayers.get(layerKey).features.length;
    }
    this.renderedBasin = packageData.basin;

    if (fit) this.fitCollections(normalizedLayers.values());
    this.applyPackageStatus(packageData);
    return true;
  }

  renderStorm(packageData, { generation = null, fit = true } = {}) {
    if (this.mode !== 'storm') throw new Error('Storm packages require storm map mode');
    this.ensureMap();
    const manifest = validateTropicalStormManifest(packageData?.manifest);
    if (generation !== null && generation !== this.loadGeneration) return false;
    const basin = stormIdBasin(manifest.stormId);
    if (basin !== this.activeBasin) this.setBasin(basin);

    const normalizedLayers = new Map();
    for (const layerKey of TROPICAL_STORM_LAYER_KEYS) {
      const collection = validateStormCollection(
        packageData.layers?.[layerKey] || EMPTY_FEATURE_COLLECTION,
        manifest.stormId,
        layerKey,
      );
      const normalized = normalizeGeoJsonForBasin(collection, basin);
      normalizedLayers.set(layerKey, normalized);
      const group = this.layerGroups.get(layerKey);
      group.clearLayers();
      group.addLayer(this.createGeoJsonLayer(layerKey, normalized));
      this.layerCounts[layerKey] = normalized.features.length;
    }
    this.renderedBasin = basin;
    this.renderedStormId = manifest.stormId;
    if (fit) this.fitCollections(normalizedLayers.values());
    this.applyStormPackageStatus(manifest);
    return true;
  }

  createGeoJsonLayer(layerKey, collection) {
    const options = {
      pane: this.paneForLayer(layerKey),
      style: (feature) => this.styleForLayer(layerKey, feature?.properties || {}),
      pointToLayer: (feature, latlng) =>
        this.leaflet.circleMarker(
          latlng,
          this.pointStyleForLayer(layerKey, feature?.properties || {}),
        ),
      onEachFeature: (feature, layer) => {
        const properties = feature?.properties || {};
        layer.bindPopup?.(buildTropicalPopup(layerKey, properties), {
          className: `weather-map-popup weather-map-popup--${this.mode === 'storm' ? 'active' : 'tropical'}`,
          maxWidth: 320,
        });
        installLeafletPopupTrigger(layer, tropicalPopupAccessibleLabel(layerKey, properties));
      },
    };
    return this.leaflet.geoJSON(collection, options);
  }

  paneForLayer(layerKey) {
    if (layerKey === 'cones' || layerKey === 'cone') return 'tropicalConePane';
    if (layerKey.startsWith('windRadii')) return 'tropicalRadiiPane';
    if (layerKey === 'watchesWarnings' || layerKey === 'surgeWarnings') return 'tropicalWarningPane';
    if (['forecastTracks', 'forecastTrack', 'bestTrack'].includes(layerKey)) return 'tropicalTrackPane';
    if (layerKey === 'outlookAreas') return 'tropicalOutlookPane';
    return 'tropicalPointPane';
  }

  styleForLayer(layerKey, properties) {
    if (layerKey === 'outlookAreas') {
      const color = outlookColor(properties);
      return { color, fillColor: color, weight: 2, opacity: 0.9, fillOpacity: 0.2 };
    }
    if (layerKey === 'cones' || layerKey === 'cone') {
      return {
        color: '#f8fafc',
        fillColor: '#cbd5e1',
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.28,
      };
    }
    if (layerKey === 'forecastTracks' || layerKey === 'forecastTrack') {
      return { color: '#f8fafc', weight: 3, opacity: 0.95, dashArray: '7 6' };
    }
    if (layerKey === 'bestTrack') {
      return { color: '#38bdf8', weight: 3, opacity: 0.95 };
    }
    if (layerKey === 'watchesWarnings') {
      const warning = String(properties.warningType || '').toLowerCase();
      const color = warning.includes('hurricane')
        ? '#ef4444'
        : warning.includes('tropical storm')
          ? '#facc15'
          : '#f97316';
      return { color, fillColor: color, weight: 5, opacity: 1, fillOpacity: 0.2 };
    }
    if (layerKey === 'surgeWarnings') {
      return { color: '#ec4899', fillColor: '#ec4899', weight: 5, opacity: 1, fillOpacity: 0.2 };
    }
    if (layerKey.startsWith('windRadii')) {
      const threshold = Number(properties.windThresholdKnots) || Number(layerKey.slice(-2));
      const color = { 34: '#facc15', 50: '#f97316', 64: '#ef4444' }[threshold] || '#facc15';
      return { color, fillColor: color, weight: 1.5, opacity: 0.8, fillOpacity: 0.14 };
    }
    return {};
  }

  pointStyleForLayer(layerKey, properties) {
    if (layerKey === 'stormPositions' || layerKey === 'currentPosition') {
      const color = stormColor(properties.classification);
      return {
        pane: 'tropicalPointPane',
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: color,
        fillOpacity: 1,
      };
    }
    if (layerKey === 'forecastTrack') {
      return {
        pane: 'tropicalPointPane',
        radius: 5,
        color: '#111827',
        weight: 1.5,
        fillColor: '#f8fafc',
        fillOpacity: 1,
      };
    }
    if (layerKey === 'bestTrack') {
      return {
        pane: 'tropicalPointPane',
        radius: 4,
        color: '#082f49',
        weight: 1,
        fillColor: '#38bdf8',
        fillOpacity: 1,
      };
    }
    const color = outlookColor(properties);
    return {
      pane: 'tropicalPointPane',
      radius: 7,
      color: '#111827',
      weight: 1.5,
      fillColor: color,
      fillOpacity: 0.95,
    };
  }

  fitCollections(collections) {
    const coordinates = [];
    for (const collection of collections) {
      for (const feature of collection.features) {
        collectGeometryCoordinates(feature.geometry, coordinates);
      }
    }
    if (coordinates.length === 0) {
      this.setBasin(this.activeBasin);
      return false;
    }

    const bounds = this.leaflet.latLngBounds(coordinates);
    if (bounds.isValid?.() === false) return false;
    this.map.fitBounds(bounds, { padding: [24, 24], maxZoom: 7, animate: false });
    const view = TROPICAL_BASIN_VIEWS[this.activeBasin];
    const zoomAdjustment =
      (view.fitZoomAdjustment || 0) + (this.compactLayout ? view.mobileZoomAdjustment || 0 : 0);
    if (zoomAdjustment !== 0 && this.map.getZoom && this.map.setZoom) {
      const fittedZoom = this.map.getZoom();
      this.map.setZoom(Math.min(7, Math.max(2, fittedZoom + zoomAdjustment)), { animate: false });
    }
    return true;
  }

  clearRenderedLayers() {
    for (const layerKey of this.layerKeys) {
      this.layerGroups.get(layerKey)?.clearLayers();
      this.layerCounts[layerKey] = 0;
    }
    this.renderedBasin = null;
    this.renderedStormId = null;
  }

  setLayerVisible(layerKey, visible) {
    if (!this.layerGroups.has(layerKey)) return false;
    this.layerVisibility[layerKey] = Boolean(visible);
    if (!this.map) return true;
    const group = this.layerGroups.get(layerKey);
    if (visible && !this.map.hasLayer?.(group)) group.addTo(this.map);
    if (!visible && this.map.hasLayer?.(group)) this.map.removeLayer?.(group);
    return true;
  }

  applyStormPackageStatus(manifest) {
    const unavailable = Object.values(manifest.products).filter(
      (product) => product.state === 'unavailable',
    ).length;
    const issued = Object.values(manifest.products).filter((product) => product.state === 'fresh').length;
    const issueTime = formatTime(manifest.sourceIssueTime);
    if (manifest.state === 'partial' || unavailable > 0) {
      this.setStatus(
        'partial',
        `Showing ${manifest.stormId} detailed map with ${issued} available product${issued === 1 ? '' : 's'}; ${unavailable} product${unavailable === 1 ? '' : 's'} unavailable. NHC source time: ${issueTime}.`,
        { manifest, stormId: manifest.stormId },
      );
      return;
    }
    this.setStatus(
      'fresh',
      `Showing ${manifest.stormId} detailed map with ${issued} issued product${issued === 1 ? '' : 's'}. NHC source time: ${issueTime}.`,
      { manifest, stormId: manifest.stormId },
    );
  }

  applyPackageStatus(packageData) {
    const summary = summarizeTropicalOverview(packageData);
    const label = TROPICAL_BASIN_VIEWS[packageData.basin].label;
    const issueTime = formatTime(packageData.sourceIssueTime);
    const visibleSummary = `${summary.activeStorms} active storm${summary.activeStorms === 1 ? '' : 's'}, ${summary.outlookAreas} outlook area${summary.outlookAreas === 1 ? '' : 's'}, ${summary.forecastTracks} track segment${summary.forecastTracks === 1 ? '' : 's'}, and ${summary.cones} cone${summary.cones === 1 ? '' : 's'}`;

    if (packageData.state === 'empty') {
      this.setStatus(
        'empty',
        `No active storms or outlook areas are shown for the ${label}. NHC source time: ${issueTime}.`,
        { packageData, summary },
      );
      return;
    }
    if (packageData.state === 'stale' || packageData.stale) {
      this.setStatus(
        'stale',
        `Showing retained ${label} data: ${visibleSummary}. NHC source time: ${issueTime}.`,
        { packageData, summary },
      );
      return;
    }
    if (packageData.state === 'unavailable') {
      this.setStatus('unavailable', `${label} tropical map data is unavailable.`, {
        packageData,
        summary,
      });
      return;
    }
    this.setStatus(
      'fresh',
      `Showing ${label} data: ${visibleSummary}. NHC source time: ${issueTime}.`,
      { packageData, summary },
    );
  }

  setStatus(state, message, details = {}) {
    this.state = state;
    if (this.statusElement) {
      this.statusElement.textContent = message;
      this.statusElement.dataset.state = state;
      this.statusElement.setAttribute('role', state === 'unavailable' ? 'alert' : 'status');
      this.statusElement.setAttribute('aria-live', state === 'unavailable' ? 'assertive' : 'polite');
    }
    this.onStatus({ state, message, ...details, snapshot: this.getSnapshot() });
  }

  getSnapshot() {
    return {
      mode: this.mode,
      activeBasin: this.activeBasin,
      renderedStormId: this.renderedStormId,
      state: this.state,
      generation: this.loadGeneration,
      mapInstanceCount: this.mapInstanceCount,
      layerCounts: { ...this.layerCounts },
      layerVisibility: { ...this.layerVisibility },
    };
  }

  setVisible(visible) {
    if (visible && this.map) {
      this.windowRef?.setTimeout?.(() => {
        if (!this.map) return;
        this.map.invalidateSize?.({ pan: false });
        if (this.pendingBasinView) this.setBasin(this.activeBasin);
      }, 0);
    }
  }

  destroy() {
    this.loadController?.abort();
    this.loadController = null;
    this.resizeObserver?.disconnect?.();
    this.resizeObserver = null;
    this.windowRef?.removeEventListener?.('resize', this.handleWindowResize);
    this.map?.off?.('zoom zoomend resize', this.updateZoomIndicator);
    this.map?.remove?.();
    this.map = null;
    this.basemapLayer = null;
    this.basemapLayers.clear();
    this.basemapLayerControl = null;
    this.zoomIndicator = null;
    this.renderedBasin = null;
    this.pendingBasinView = false;
    this.renderedStormId = null;
    this.layerGroups.clear();
    this.overviewCache.clear();
    this.legendControl = null;
  }
}
