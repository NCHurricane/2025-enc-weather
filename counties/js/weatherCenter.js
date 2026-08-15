import {
  InteractiveWeatherMap,
  formatWeatherTime,
} from '../../js/modules/interactiveWeatherMap.js?v=20260814-21';
import {
  COUNTY_ZONE_CHANGE_EVENT,
  loadCountyContext,
} from './countyContext.js?v=20260814-1';

const STATION_MAX_AGE_MINUTES = 120;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const MOBILE_STATION_DETAILS_QUERY = window.matchMedia('(max-width: 600px)');
const NWS_REFERENCE_WMS_URL =
  'https://mapservices.weather.noaa.gov/static/services/nws_reference_maps/nws_reference_map/MapServer/WMSServer';
const BOUNDARY_RENDER_SCALE = window.L?.Browser?.retina ? 2 : 1;

function buildBoundarySld(layer, width, opacity, { casing = true } = {}) {
  const stroke = (color, strokeWidth, strokeOpacity) =>
    `<sld:PolygonSymbolizer><sld:Fill><sld:CssParameter name="fill">#ffffff</sld:CssParameter><sld:CssParameter name="fill-opacity">0</sld:CssParameter></sld:Fill><sld:Stroke><sld:CssParameter name="stroke">${color}</sld:CssParameter><sld:CssParameter name="stroke-opacity">${strokeOpacity}</sld:CssParameter><sld:CssParameter name="stroke-width">${strokeWidth}</sld:CssParameter><sld:CssParameter name="stroke-linejoin">round</sld:CssParameter><sld:CssParameter name="stroke-linecap">round</sld:CssParameter></sld:Stroke></sld:PolygonSymbolizer>`;
  const innerStroke = stroke('#dbdbdb', width * BOUNDARY_RENDER_SCALE, opacity);
  const strokes = casing
    ? `${stroke('#494949', (width + 0.1) * BOUNDARY_RENDER_SCALE, Math.min(1, opacity + 0.08))}${innerStroke}`
    : innerStroke;

  return `<sld:StyledLayerDescriptor xmlns:sld="http://www.opengis.net/sld" version="1.0.0" xsi:schemaLocation="http://www.opengis.net/sld http://schemas.opengis.net/sld/1.0.0/StyledLayerDescriptor.xsd" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ogc="http://www.opengis.net/ogc" xmlns:gml="http://www.opengis.net/gml"><sld:NamedLayer><sld:Name>${layer}</sld:Name><sld:NamedStyle><sld:Name /></sld:NamedStyle><sld:UserStyle><sld:Name>weather_boundary</sld:Name><sld:Title>weather_boundary</sld:Title><sld:FeatureTypeStyle><sld:Rule><sld:Name>boundary</sld:Name>${strokes}</sld:Rule></sld:FeatureTypeStyle></sld:UserStyle></sld:NamedLayer></sld:StyledLayerDescriptor>`;
}

const BOUNDARY_WMS_OPTIONS = Object.freeze({
  type: 'wms',
  url: NWS_REFERENCE_WMS_URL,
  styles: 'weather_boundary',
  format: 'image/png',
  transparent: true,
  version: '1.3.0',
  uppercase: true,
  detectRetina: true,
  attribution: 'NOAA/NWS reference maps',
});
const REGIONAL_COUNTY_BOUNDARY_OVERLAY = Object.freeze({
  ...BOUNDARY_WMS_OPTIONS,
  layers: '9',
  sld_body: buildBoundarySld('9', 0.85, 0.35, { casing: false }),
  minZoom: 7,
  maxZoom: 7,
});
const LOCAL_COUNTY_BOUNDARY_OVERLAY = Object.freeze({
  ...BOUNDARY_WMS_OPTIONS,
  layers: '9',
  sld_body: buildBoundarySld('9', 0.3, 0.5),
  minZoom: 8,
});
const WEATHER_BOUNDARY_OVERLAYS = Object.freeze([
  REGIONAL_COUNTY_BOUNDARY_OVERLAY,
  LOCAL_COUNTY_BOUNDARY_OVERLAY,
  Object.freeze({
    ...BOUNDARY_WMS_OPTIONS,
    layers: '8',
    sld_body: buildBoundarySld('8', 0.7, 0.5),
  }),
]);

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

const CONDITION_FIELDS = Object.freeze({
  temperature: Object.freeze({ label: 'Temperature', mapLabel: 'temperatures' }),
  dewpoint: Object.freeze({ label: 'Dew Point', mapLabel: 'dew points' }),
  humidity: Object.freeze({ label: 'Humidity', mapLabel: 'relative humidity' }),
  wind: Object.freeze({ label: 'Wind', mapLabel: 'wind observations' }),
  gusts: Object.freeze({ label: 'Gusts', mapLabel: 'wind gusts' }),
  pressure: Object.freeze({ label: 'Pressure', mapLabel: 'air pressure' }),
  visibility: Object.freeze({ label: 'Visibility', mapLabel: 'visibility' }),
});

function markerMetric(field, data = {}) {
  const unavailable = {
    available: false,
    compact: false,
    html: '',
    spoken: `${CONDITION_FIELDS[field]?.label || 'Observation'} unavailable`,
  };

  if (field === 'temperature' || field === 'dewpoint') {
    const value = finiteNumber(data[field]);
    if (value === null) return unavailable;
    const label = field === 'temperature' ? 'Temperature' : 'Dew point';
    return {
      available: true,
      compact: false,
      html: `${Math.round(value)}°`,
      spoken: `${label} ${Math.round(value)} degrees Fahrenheit`,
    };
  }

  if (field === 'humidity') {
    const value = finiteNumber(data.humidity);
    if (value === null) return unavailable;
    return {
      available: true,
      compact: false,
      html: `${Math.round(value)}%`,
      spoken: `Relative humidity ${Math.round(value)} percent`,
    };
  }

  if (field === 'wind') {
    const speed = finiteNumber(data.windSpeed);
    if (speed === null) return unavailable;
    if (speed < 1) {
      return { available: true, compact: true, html: 'Calm', spoken: 'Wind calm' };
    }
    const direction = /^[A-Z]{1,3}$/.test(String(data.windDirection || '').toUpperCase())
      ? String(data.windDirection).toUpperCase()
      : '--';
    return {
      available: true,
      compact: true,
      html: `${direction}<small class="temperature-marker-unit">${Math.round(speed)} mph</small>`,
      spoken: `Wind ${direction === '--' ? '' : `${direction} at `}${Math.round(speed)} miles per hour`,
    };
  }

  const fieldConfig = {
    gusts: { key: 'windGust', unit: 'mph', spoken: 'Wind gust' },
    pressure: { key: 'pressure', unit: 'mb', spoken: 'Air pressure' },
    visibility: { key: 'visibility', unit: 'mi', spoken: 'Visibility' },
  }[field];
  if (!fieldConfig) return unavailable;

  const value = finiteNumber(data[fieldConfig.key]);
  if (value === null) return unavailable;
  const displayedValue = Math.round(value * 10) / 10;
  const spokenUnit = field === 'gusts'
    ? 'miles per hour'
    : field === 'pressure'
      ? 'millibars'
      : 'miles';
  return {
    available: true,
    compact: true,
    html: `${displayedValue}<small class="temperature-marker-unit">${fieldConfig.unit}</small>`,
    spoken: `${fieldConfig.spoken} ${displayedValue} ${spokenUnit}`,
  };
}

function minutesSince(timestamp) {
  const observedAt = Date.parse(timestamp || '');
  if (!Number.isFinite(observedAt)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.round((Date.now() - observedAt) / 60000));
}

function formatAge(ageMinutes) {
  if (!Number.isFinite(ageMinutes)) return 'age unknown';
  if (ageMinutes < 60) return `${ageMinutes} min old`;
  const hours = Math.round(ageMinutes / 60);
  if (hours < 48) return `${hours} hr old`;
  return `${Math.round(hours / 24)} days old`;
}

function formatValue(value, suffix = '') {
  const number = finiteNumber(value);
  return number === null ? 'Not reported' : `${Math.round(number)}${suffix}`;
}

function addDefinition(row, label, value) {
  const term = document.createElement('dt');
  term.textContent = label;
  const description = document.createElement('dd');
  description.textContent = value;
  row.append(term, description);
}

function buildPopup(station, cachedStation, ageMinutes, { inline = false, onClose = null } = {}) {
  const data = cachedStation?.data || {};
  const popup = document.createElement('article');
  popup.className = `temperature-popup${inline ? ' is-inline' : ''}`;

  if (inline) {
    const closeButton = document.createElement('button');
    closeButton.className = 'temperature-popup-inline-close';
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Close station details');
    closeButton.textContent = '×';
    if (onClose) closeButton.addEventListener('click', onClose);
    popup.append(closeButton);
  }

  const heading = document.createElement('h3');
  if (inline) heading.id = 'temperature-station-details-title';
  heading.textContent = station.friendlyName || cachedStation?.name || station.name || station.id;
  popup.append(heading);

  const location = document.createElement('p');
  location.className = 'temperature-popup-location';
  location.textContent = `${cachedStation?.name || station.name || 'Observation station'} · ${station.id}`;
  popup.append(location);

  const stale = ageMinutes > STATION_MAX_AGE_MINUTES;
  const status = document.createElement('p');
  status.className = `temperature-popup-status${stale ? ' is-stale' : ''}`;
  status.textContent = cachedStation
    ? stale
      ? 'Stale observation — use with caution'
      : 'Current observed conditions'
    : 'Observation temporarily unavailable';
  popup.append(status);

  const values = document.createElement('dl');
  values.className = 'temperature-popup-grid';
  addDefinition(values, 'Temperature', formatValue(data.temperature, '°F'));
  addDefinition(values, 'Conditions', data.conditions || 'Not reported');

  const feelsLike = finiteNumber(data.feelsLike?.value);
  const heatIndex = finiteNumber(data.heatIndex);
  const windChill = finiteNumber(data.windChill);
  const apparent = feelsLike ?? heatIndex ?? windChill;
  if (apparent !== null) addDefinition(values, 'Feels like', `${Math.round(apparent)}°F`);

  addDefinition(values, 'Dewpoint', formatValue(data.dewpoint, '°F'));
  addDefinition(values, 'Humidity', formatValue(data.humidity, '%'));

  const windSpeed = finiteNumber(data.windSpeed);
  const wind = windSpeed === null
    ? 'Not reported'
    : windSpeed < 1
      ? 'Calm'
      : `${data.windDirection || '--'} at ${Math.round(windSpeed)} mph`;
  addDefinition(values, 'Wind', wind);
  addDefinition(values, 'Wind gust', formatValue(data.windGust, ' mph'));
  popup.append(values);

  const observationTime = cachedStation?.observation?.timestamp;
  const time = document.createElement('p');
  time.className = 'temperature-popup-time';
  time.textContent = observationTime
    ? `${formatWeatherTime(observationTime)} · ${formatAge(ageMinutes)}`
    : 'Observation time unavailable';
  popup.append(time);

  if (station.url) {
    const link = document.createElement('a');
    link.className = 'temperature-popup-link';
    link.href = station.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Open NWS station history';
    popup.append(link);
  }

  return popup;
}

class CountyTemperatureViewer {
  constructor() {
    this.mapElement = document.getElementById('temperature-map');
    this.stationCount = document.getElementById('temperature-station-count');
    this.statusDot = document.querySelector('.weather-center-status-dot');
    this.conditionPanel = document.getElementById('condition-panel-display');
    this.stationDetails = document.getElementById('temperature-station-details');
    this.conditionButtons = Array.from(document.querySelectorAll('[data-condition-field]'));
    this.loading = document.getElementById('temperature-loading');
    this.error = document.getElementById('temperature-error');
    this.timestamp = document.getElementById('temperature-timestamp');
    this.activeField = 'temperature';
    this.stationConfig = null;
    this.currentData = null;
    this.hasFitBounds = false;
    this.map = null;
    this.markerLayer = null;
    this.selectedMarker = null;
    this.loadingPromise = null;
    this.lastLoadedAt = 0;
    this.context = null;
    this.active = false;
    this.handleStationDetailsModeChange = this.handleStationDetailsModeChange.bind(this);
    this.handleZoneChange = this.handleZoneChange.bind(this);
  }

  init() {
    if (!this.mapElement) return false;
    this.conditionButtons.forEach((button, index) => {
      button.addEventListener('click', () => this.activateField(button.dataset.conditionField));
      button.addEventListener('keydown', (event) => this.handleFieldKeydown(event, index));
    });
    MOBILE_STATION_DETAILS_QUERY.addEventListener(
      'change',
      this.handleStationDetailsModeChange,
    );
    document.addEventListener(COUNTY_ZONE_CHANGE_EVENT, this.handleZoneChange);
    this.activateField('temperature');
    return true;
  }

  handleStationDetailsModeChange() {
    this.hideStationDetails();
  }

  setSelectedMarker(marker) {
    if (this.selectedMarker === marker) return;

    this.selectedMarker
      ?.getElement()
      ?.querySelector('.temperature-marker-value')
      ?.classList.remove('is-selected');
    this.selectedMarker?.setZIndexOffset(0);
    this.selectedMarker = marker;
    this.selectedMarker
      ?.getElement()
      ?.querySelector('.temperature-marker-value')
      ?.classList.add('is-selected');
    this.selectedMarker?.setZIndexOffset(1000);
  }

  hideStationDetails({ restoreFocus = false } = {}) {
    const selectedMarker = this.selectedMarker;
    if (this.stationDetails) {
      this.stationDetails.hidden = true;
      this.stationDetails.removeAttribute('aria-labelledby');
      this.stationDetails.replaceChildren();
    }
    this.setSelectedMarker(null);
    if (restoreFocus) selectedMarker?.getElement()?.focus();
  }

  showStationDetails(station, cachedStation, ageMinutes) {
    if (!this.stationDetails) return;

    const popup = buildPopup(station, cachedStation, ageMinutes, {
      inline: true,
      onClose: () => this.hideStationDetails({ restoreFocus: true }),
    });
    this.stationDetails.replaceChildren(popup);
    this.stationDetails.setAttribute('aria-labelledby', 'temperature-station-details-title');
    this.stationDetails.hidden = false;
    window.requestAnimationFrame(() => {
      if (MOBILE_STATION_DETAILS_QUERY.matches) {
        this.stationDetails.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        this.stationDetails.querySelector('.temperature-popup-inline-close')?.focus({
          preventScroll: true,
        });
      }
    });
  }

  handleStationClick(marker, station, cachedStation, ageMinutes) {
    this.setSelectedMarker(marker);
    this.showStationDetails(station, cachedStation, ageMinutes);
  }

  handleFieldKeydown(event, currentIndex) {
    const keyOffsets = { ArrowLeft: -1, ArrowRight: 1 };
    let nextIndex = null;

    if (event.key in keyOffsets) {
      nextIndex = (currentIndex + keyOffsets[event.key] + this.conditionButtons.length)
        % this.conditionButtons.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = this.conditionButtons.length - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    const nextButton = this.conditionButtons[nextIndex];
    this.activateField(nextButton.dataset.conditionField);
    nextButton.focus();
  }

  activateField(field) {
    const config = CONDITION_FIELDS[field];
    if (!config) return;

    this.activeField = field;
    this.conditionButtons.forEach((button) => {
      const active = button.dataset.conditionField === field;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });

    const activeButton = this.conditionButtons.find(
      (button) => button.dataset.conditionField === field,
    );
    if (activeButton) this.conditionPanel?.setAttribute('aria-labelledby', activeButton.id);
    const countyName = this.context?.countyName || 'the county';
    this.mapElement.setAttribute('aria-label', `Current ${config.mapLabel} near ${countyName} County`);

    if (this.stationConfig && this.currentData) this.renderStations();
  }

  ensureMap() {
    if (this.map) return this.map;

    this.map = new InteractiveWeatherMap({
      container: this.mapElement,
      center: this.context.center,
      zoom: 10,
      requireCtrlForWheelZoom: false,
      ariaLabel: `Current ${CONDITION_FIELDS[this.activeField].mapLabel} near ${this.context.countyName} County`,
      initialBasemap: 'light',
      showBasemapControl: true,
      basemapControlPosition: 'topleft',
      referenceOverlays: WEATHER_BOUNDARY_OVERLAYS,
    });
    this.markerLayer = window.L.layerGroup().addTo(this.map.ensureMap());
    return this.map;
  }

  async activate() {
    this.active = true;
    if (!this.context) this.context = await loadCountyContext();
    this.ensureMap().setVisible(true);
    if (!this.lastLoadedAt || Date.now() - this.lastLoadedAt >= REFRESH_INTERVAL_MS) {
      await this.loadStations();
    }
  }

  deactivate() {
    this.active = false;
    this.map?.setVisible(false);
  }

  async handleZoneChange() {
    try {
      this.context = await loadCountyContext();
      this.stationConfig = null;
      this.currentData = null;
      this.hasFitBounds = false;
      this.lastLoadedAt = 0;
      this.hideStationDetails();
      if (this.map) {
        this.map.ensureMap().setView(this.context.center, 10, { animate: false });
      }
      if (this.active) await this.loadStations();
    } catch (error) {
      console.error('[county-weather-center] Zone refresh failed:', error);
    }
  }

  async loadStations() {
    if (this.loadingPromise) return this.loadingPromise;

    this.loading.hidden = false;
    this.error.hidden = true;
    this.loadingPromise = this.fetchAndRenderStations();

    try {
      await this.loadingPromise;
      this.lastLoadedAt = Date.now();
    } catch (error) {
      console.error('[county-weather-center] Temperature observations failed:', error);
      this.error.hidden = false;
      if (this.stationCount) this.stationCount.textContent = 'Station data unavailable';
    } finally {
      this.loading.hidden = true;
      this.loadingPromise = null;
    }
  }

  async fetchAndRenderStations() {
    const cacheKey = Math.floor(Date.now() / REFRESH_INTERVAL_MS);
    this.context = await loadCountyContext();
    const currentResponse = await fetch(
      `${this.context.dataPath('current.json')}?v=${cacheKey}`,
      { cache: 'no-store' },
    );
    if (!currentResponse.ok) throw new Error(`Current observations request failed (${currentResponse.status})`);
    const current = await currentResponse.json();
    const stations = Array.isArray(this.context.stations) ? this.context.stations : [];
    if (!stations.length) throw new Error('No temperature stations are configured');

    this.stationConfig = stations;
    this.currentData = current;
    this.renderStations({ fitBounds: !this.hasFitBounds });
  }

  renderStations({ fitBounds = false } = {}) {
    if (!this.stationConfig || !this.currentData) return;

    this.ensureMap();
    this.hideStationDetails();
    this.markerLayer.clearLayers();

    const bounds = [];
    const observationTimes = [];
    let freshCount = 0;
    let reportingCount = 0;
    const fieldConfig = CONDITION_FIELDS[this.activeField];

    for (const station of this.stationConfig) {
      const lat = finiteNumber(station.lat);
      const lon = finiteNumber(station.lon);
      if (lat === null || lon === null || !station.id) continue;

      const cachedStation = this.currentData.stations?.[station.id] || null;
      const observedAt = cachedStation?.observation?.timestamp || null;
      const ageMinutes = minutesSince(observedAt);
      const stale = ageMinutes > STATION_MAX_AGE_MINUTES;
      const metric = markerMetric(this.activeField, cachedStation?.data);
      if (!stale && cachedStation) freshCount += 1;
      if (observedAt && Number.isFinite(Date.parse(observedAt))) observationTimes.push(observedAt);
      bounds.push([lat, lon]);
      if (!metric.available) continue;
      reportingCount += 1;

      const stateClass = stale ? ' is-stale' : '';
      const sizeClass = metric.compact ? ' is-compact' : '';
      const stationName = station.friendlyName || station.name || station.id;
      const locationName = station.locationName || station.friendlyName || station.name || station.id;
      const icon = window.L.divIcon({
        className: 'temperature-marker-icon',
        html: `<span class="temperature-marker-value${stateClass}${sizeClass}"><span class="temperature-marker-reading">${metric.html}</span><small class="temperature-marker-location">${escapeHtml(locationName)}</small></span>`,
        iconSize: metric.compact ? [112, 50] : [112, 62],
        iconAnchor: metric.compact ? [56, 25] : [56, 31],
      });

      const marker = window.L.marker([lat, lon], {
        icon,
        keyboard: true,
        riseOnHover: true,
        title: `${stationName}: ${metric.spoken}`,
        alt: `${stationName} ${fieldConfig.label.toLowerCase()} observation`,
      }).addTo(this.markerLayer);
      marker.on('click', () => {
        this.handleStationClick(marker, station, cachedStation, ageMinutes);
      });
    }

    if (!bounds.length) throw new Error('No configured stations have valid coordinates');
    if (this.stationCount) {
      this.stationCount.textContent = `${reportingCount} station${reportingCount === 1 ? '' : 's'} reporting`;
    }
    this.statusDot?.classList.toggle('is-empty', reportingCount === 0);
    this.mapElement.setAttribute(
      'aria-label',
      `Current ${fieldConfig.mapLabel} near ${this.context.countyName} County`,
    );
    if (fitBounds) {
      this.map.ensureMap().fitBounds(bounds, { padding: [42, 42], maxZoom: 10 });
      this.hasFitBounds = true;
    }

    const newestObservation = observationTimes.sort(
      (left, right) => Date.parse(right) - Date.parse(left),
    )[0];
    this.timestamp.textContent = newestObservation
      ? `${freshCount} of ${bounds.length} sites fresh · Latest ${formatWeatherTime(newestObservation)}`
      : `${bounds.length} configured sites · Observation times unavailable`;
  }
}

class CountyForecastTabs {
  constructor() {
    this.buttons = Array.from(document.querySelectorAll('[data-forecast-tab]'));
    this.panels = Array.from(document.querySelectorAll('[data-forecast-panel]'));
    this.discussionPanel = document.querySelector('[data-forecast-panel="discussion"]');
    this.syncDiscussionHeight = this.syncDiscussionHeight.bind(this);
  }

  init() {
    if (!this.buttons.length || !this.panels.length) return false;

    this.buttons.forEach((button, index) => {
      button.addEventListener('click', () => this.activate(button.dataset.forecastTab));
      button.addEventListener('keydown', (event) => this.handleKeydown(event, index));
    });
    window.addEventListener('resize', this.syncDiscussionHeight);
    window.visualViewport?.addEventListener('resize', this.syncDiscussionHeight);

    this.activate('seven-day');
    return true;
  }

  handleKeydown(event, currentIndex) {
    const keyOffsets = { ArrowLeft: -1, ArrowRight: 1 };
    let nextIndex = null;

    if (event.key in keyOffsets) {
      nextIndex = (currentIndex + keyOffsets[event.key] + this.buttons.length) % this.buttons.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = this.buttons.length - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    const nextButton = this.buttons[nextIndex];
    this.activate(nextButton.dataset.forecastTab);
    nextButton.focus();
  }

  syncDiscussionHeight() {
    if (!this.discussionPanel || this.discussionPanel.hidden) return;

    const content = this.discussionPanel.querySelector('.afd-content');
    if (!content) return;
    if (window.innerWidth > 768) {
      content.style.removeProperty('--afd-viewport-height');
      return;
    }

    const viewport = window.visualViewport;
    const viewportBottom = (viewport?.offsetTop || 0) + (viewport?.height || window.innerHeight);
    const availableHeight = Math.floor(
      viewportBottom - content.getBoundingClientRect().top - 8,
    );
    content.style.setProperty('--afd-viewport-height', `${Math.max(240, availableHeight)}px`);
  }

  activate(name) {
    if (!this.buttons.some((button) => button.dataset.forecastTab === name)) return;

    this.buttons.forEach((button) => {
      const active = button.dataset.forecastTab === name;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });

    this.panels.forEach((panel) => {
      panel.hidden = panel.dataset.forecastPanel !== name;
    });

    const controlledToggles = {
      detailed: 'detailed-toggle',
      meteogram: 'meteogram-toggle',
      discussion: 'afd-toggle',
    };

    for (const [panelName, toggleId] of Object.entries(controlledToggles)) {
      const toggle = document.getElementById(toggleId);
      if (!toggle) continue;
      const active = panelName === name;
      if (toggle.checked !== active) {
        toggle.checked = active;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    if (name === 'discussion') window.requestAnimationFrame(this.syncDiscussionHeight);
  }
}

class CountyWeatherCenter {
  constructor(temperatureViewer) {
    this.temperatureViewer = temperatureViewer;
    this.buttons = Array.from(document.querySelectorAll('[data-weather-tab]'));
    this.panels = Array.from(document.querySelectorAll('[data-weather-panel]'));
  }

  init() {
    if (!this.buttons.length || !this.panels.length) return false;

    this.buttons.forEach((button, index) => {
      button.addEventListener('click', () => this.activate(button.dataset.weatherTab));
      button.addEventListener('keydown', (event) => this.handleKeydown(event, index));
    });

    this.activate('temp');
    return true;
  }

  handleKeydown(event, currentIndex) {
    const keyOffsets = { ArrowLeft: -1, ArrowRight: 1 };
    let nextIndex = null;

    if (event.key in keyOffsets) {
      nextIndex = (currentIndex + keyOffsets[event.key] + this.buttons.length) % this.buttons.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = this.buttons.length - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    const nextButton = this.buttons[nextIndex];
    this.activate(nextButton.dataset.weatherTab);
    nextButton.focus();
  }

  activate(name) {
    if (!this.buttons.some((button) => button.dataset.weatherTab === name)) return;

    this.buttons.forEach((button) => {
      const active = button.dataset.weatherTab === name;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });

    this.panels.forEach((panel) => {
      panel.hidden = panel.dataset.weatherPanel !== name;
    });

    for (const mapType of ['radar', 'satellite']) {
      const toggle = document.getElementById(`${mapType}-toggle`);
      if (!toggle) continue;
      const active = name === mapType;
      if (toggle.checked !== active) {
        toggle.checked = active;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    if (name === 'temp') this.temperatureViewer.activate();
    else this.temperatureViewer.deactivate();
  }
}

function initCountyWeatherCenter() {
  const temperatureViewer = new CountyTemperatureViewer();
  if (!temperatureViewer.init()) return;
  new CountyForecastTabs().init();
  new CountyWeatherCenter(temperatureViewer).init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCountyWeatherCenter, { once: true });
} else {
  initCountyWeatherCenter();
}

