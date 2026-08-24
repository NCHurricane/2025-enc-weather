import {
  InteractiveWeatherMap,
  formatWeatherTime,
} from '../../js/modules/interactiveWeatherMap.js?v=20260824-phase5-1';
import {
  COUNTY_ZONE_CHANGE_EVENT,
  loadWeatherPageContext,
} from './countyContext.js?v=20260816-home1';
import { WEATHER_BOUNDARY_OVERLAYS } from './weatherBoundaries.js?v=20260822-map-borders-1';
import { installWeatherCityLabels } from './weatherCityLabels.js?v=20260824-phase5-1';

const STATION_MAX_AGE_MINUTES = 120;
const REFRESH_INTERVAL_MS = 30 * 60 * 1000;
const STATE_STATION_CATALOG_VERSION = '20260816-2';
const STATION_MARKER_SIZES = Object.freeze({
  regular: Object.freeze({ iconSize: [76, 48], iconAnchor: [38, 54] }),
  compact: Object.freeze({ iconSize: [96, 40], iconAnchor: [48, 40] }),
});
const MIN_VISIBLE_MARKER_WIDTH = 24;
const MIN_VISIBLE_MARKER_HEIGHT = 12;
const MOBILE_STATION_DETAILS_QUERY = window.matchMedia('(max-width: 600px)');
const TABLET_PORTRAIT_MAP_QUERY = window.matchMedia(
  '(min-width: 601px) and (max-width: 1024px) and (orientation: portrait)',
);
const statewideStationCatalogPromises = new Map();

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function initialMapZoom() {
  const root = document.querySelector('[data-county-weather-center]');
  const configuredZoom = MOBILE_STATION_DETAILS_QUERY.matches
    ? root?.dataset.mapZoomMobile
    : root?.dataset.mapZoomDesktop;
  const parsedZoom = finiteNumber(configuredZoom);
  if (parsedZoom !== null) return parsedZoom;
  return MOBILE_STATION_DETAILS_QUERY.matches || TABLET_PORTRAIT_MAP_QUERY.matches ? 9 : 10;
}

function contextAreaLabel(context) {
  return context?.regionLabel || `${context?.countyName || 'the county'} County`;
}

function currentConditionsAriaLabel(context, mapLabel) {
  const preposition = context?.isRegional ? 'across' : 'near';
  return `Current ${mapLabel} ${preposition} ${contextAreaLabel(context)}`;
}

function statewideStationSpacing(zoom) {
  if (zoom >= 12) return 0;
  if (zoom >= 11) return 25;
  if (zoom >= 10) return 50;
  if (zoom >= 9) return 75;
  if (zoom >= 8) return 100;
  return 120;
}

function versionedUrl(url, version) {
  const requestedUrl = new URL(url, window.location.href);
  requestedUrl.searchParams.set('v', String(version));
  return requestedUrl.href;
}

async function fetchJson(url, label, { cache = 'no-store' } = {}) {
  const response = await fetch(url, { cache });
  if (!response.ok) throw new Error(`${label} request failed (${response.status})`);
  return response.json();
}

async function loadFallbackCurrentObservations(urls, cacheKey) {
  const results = await Promise.allSettled(
    urls.map((url) => fetchJson(versionedUrl(url, cacheKey), 'Fallback current observations')),
  );
  const fulfilled = results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value);
  const stations = Object.assign(
    {},
    ...fulfilled.map((current) => (
      current?.stations && typeof current.stations === 'object' ? current.stations : {}
    )),
  );
  if (!Object.keys(stations).length) {
    throw new Error('Regional fallback observations are unavailable');
  }

  const generated = fulfilled
    .map((current) => current?.generated)
    .filter((value) => Number.isFinite(Date.parse(value)))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0] || null;
  return { generated, stations };
}

function loadStatewideStationCatalog(url, state = 'Statewide') {
  if (!statewideStationCatalogPromises.has(url)) {
    const promise = fetchJson(
      versionedUrl(url, STATE_STATION_CATALOG_VERSION),
      `${state} station catalog`,
      { cache: 'default' },
    )
      .then((stations) => {
        if (!Array.isArray(stations) || !stations.length) {
          throw new Error(`${state} station catalog is empty or invalid`);
        }
        return stations;
      })
      .catch((error) => {
        statewideStationCatalogPromises.delete(url);
        throw error;
      });
    statewideStationCatalogPromises.set(url, promise);
  }
  return statewideStationCatalogPromises.get(url);
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
      html: `${Math.round(value)}<span class="temperature-marker-percent">%</span>`,
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
      html: `
        <span class="temperature-marker-speed">${Math.round(speed)} MPH</span>
        <br />
        <span class="temperature-marker-direction">${direction}</span>
      `,
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
    html: `${displayedValue}<small class="temperature-marker-unit"><br />${fieldConfig.unit}</small>`,
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
    this.statusDot = document.querySelector('[data-map-status-indicator]');
    this.conditionPanel = document.getElementById('condition-panel-display');
    this.stationDetails = document.getElementById('temperature-station-details');
    this.mapShell = this.mapElement?.closest('[data-weather-map]');
    this.conditionButtons = Array.from(document.querySelectorAll('[data-condition-field]'));
    this.loading = document.getElementById('temperature-loading');
    this.error = document.getElementById('temperature-error');
    this.timestamp = document.getElementById('temperature-timestamp');
    this.activeField = 'temperature';
    this.stationConfig = null;
    this.currentData = null;
    this.map = null;
    this.markerLayer = null;
    this.cityLabelOverlay = null;
    this.stationRecords = new Map();
    this.stationMarkers = new Map();
    this.selectedMarker = null;
    this.markerReconcileFrame = 0;
    this.stationLoadGeneration = 0;
    this.hasInitializedView = false;
    this.loadingPromise = null;
    this.lastLoadedAt = 0;
    this.refreshTimer = 0;
    this.context = null;
    this.coverageMode = 'local';
    this.mapReadyDispatched = false;
    const weatherCenterRoot = document.querySelector('[data-county-weather-center]') || document.body;
    this.cityLabelsUrl = weatherCenterRoot.dataset.cityLabelsUrl || '';
    this.active = false;
    this.handleStationDetailsModeChange = this.handleStationDetailsModeChange.bind(this);
    this.handleZoneChange = this.handleZoneChange.bind(this);
    this.handleMapSettled = this.handleMapSettled.bind(this);
  }

  init() {
    if (!this.mapElement) return false;
    this.syncStationDetailsPlacement();
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
    this.syncStationDetailsPlacement();
  }

  syncStationDetailsPlacement() {
    if (!this.stationDetails || !this.mapShell) return;

    if (MOBILE_STATION_DETAILS_QUERY.matches) {
      if (this.stationDetails.parentElement === this.mapShell) {
        this.mapShell.after(this.stationDetails);
      }
      return;
    }

    if (this.stationDetails.parentElement !== this.mapShell) {
      this.mapShell.append(this.stationDetails);
    }
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

  hideStationDetails({ restoreFocus = false, reconcile = true } = {}) {
    const selectedMarker = this.selectedMarker;
    if (this.stationDetails) {
      this.stationDetails.hidden = true;
      this.stationDetails.removeAttribute('aria-labelledby');
      this.stationDetails.replaceChildren();
    }
    this.setSelectedMarker(null);
    if (restoreFocus) selectedMarker?.getElement()?.focus();
    if (selectedMarker && reconcile) this.scheduleStationMarkerReconcile();
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
    this.mapElement.setAttribute(
      'aria-label',
      currentConditionsAriaLabel(this.context, config.mapLabel),
    );

    if (this.stationConfig && this.currentData) this.renderStations();
  }

  ensureMap() {
    if (this.map) return this.map;

    this.map = new InteractiveWeatherMap({
      container: this.mapElement,
      center: this.context.center,
      zoom: initialMapZoom(),
      requireCtrlForWheelZoom: false,
      ariaLabel: currentConditionsAriaLabel(this.context, CONDITION_FIELDS[this.activeField].mapLabel),
      initialBasemap: 'esri',
      showBasemapControl: true,
      basemapControlPosition: 'topleft',
      referenceOverlays: WEATHER_BOUNDARY_OVERLAYS,
    });
    const leafletMap = this.map.ensureMap();
    this.cityLabelOverlay = installWeatherCityLabels(
      leafletMap,
      this.context.center,
      this.cityLabelsUrl,
      { mapScope: this.context.isRegional ? 'homepage' : 'county' },
    );
    this.markerLayer = window.L.layerGroup().addTo(leafletMap);
    leafletMap.on('moveend zoomend', this.handleMapSettled);
    if (!this.mapReadyDispatched) {
      this.mapReadyDispatched = true;
      document.dispatchEvent(new CustomEvent('weather:conditions-map-ready', {
        detail: { map: leafletMap, context: this.context, viewer: this },
      }));
    }
    return this.map;
  }

  handleMapSettled() {
    this.scheduleStationMarkerReconcile();
  }

  cancelStationMarkerReconcile() {
    if (!this.markerReconcileFrame) return;
    window.cancelAnimationFrame(this.markerReconcileFrame);
    this.markerReconcileFrame = 0;
  }

  scheduleStationMarkerReconcile() {
    this.cancelStationMarkerReconcile();
    this.markerReconcileFrame = window.requestAnimationFrame(() => {
      this.markerReconcileFrame = 0;
      this.reconcileStationMarkers();
    });
  }

  clearStationMarkers() {
    this.markerLayer?.clearLayers();
    this.stationMarkers.clear();
    if (this.mapElement) {
      this.mapElement.dataset.eligibleStationCount = '0';
      this.mapElement.dataset.visibleStationCount = '0';
      this.mapElement.dataset.liveMarkerCount = '0';
      this.mapElement.dataset.stationThinningActive = 'false';
      this.mapElement.dataset.stationSpacingPixels = '0';
    }
  }

  stationIsVisible(record, leafletMap) {
    const point = leafletMap.latLngToContainerPoint([record.lat, record.lon]);
    const viewportSize = leafletMap.getSize();
    const [width, height] = record.iconSize;
    const [anchorX, anchorY] = record.iconAnchor;
    const left = point.x - anchorX;
    const right = left + width;
    const top = point.y - anchorY;
    const bottom = top + height;
    const visibleWidth = Math.max(0, Math.min(right, viewportSize.x) - Math.max(left, 0));
    const visibleHeight = Math.max(0, Math.min(bottom, viewportSize.y) - Math.max(top, 0));

    if (!MOBILE_STATION_DETAILS_QUERY.matches) {
      return visibleWidth > 0 && visibleHeight > 0;
    }

    return visibleWidth >= MIN_VISIBLE_MARKER_WIDTH
      && visibleHeight >= MIN_VISIBLE_MARKER_HEIGHT;
  }

  thinStationRecords(records, leafletMap) {
    if (!['statewide', 'regional-fallback'].includes(this.coverageMode)) return records;
    if (!MOBILE_STATION_DETAILS_QUERY.matches && records.length <= 30) return records;

    const spacing = statewideStationSpacing(leafletMap.getZoom());
    if (!spacing) return records;

    const viewportCenter = leafletMap.getSize().divideBy(2);
    const candidates = records.map((record) => {
      const point = leafletMap.latLngToContainerPoint([record.lat, record.lon]);
      return {
        record,
        point,
        distanceFromCenter: point.distanceTo(viewportCenter),
      };
    }).sort((left, right) => (
      Number(left.record.stale) - Number(right.record.stale)
      || left.distanceFromCenter - right.distanceFromCenter
      || left.record.station.id.localeCompare(right.record.station.id)
    ));
    const accepted = [];

    for (const candidate of candidates) {
      const [width, height] = candidate.record.iconSize;
      const overlaps = accepted.some((placed) => {
        const [placedWidth, placedHeight] = placed.record.iconSize;
        const minimumX = Math.max(spacing, (width + placedWidth) / 2 + 8);
        const minimumY = Math.max(spacing * 0.68, (height + placedHeight) / 2 + 6);
        return Math.abs(candidate.point.x - placed.point.x) < minimumX
          && Math.abs(candidate.point.y - placed.point.y) < minimumY;
      });
      if (!overlaps) accepted.push(candidate);
    }

    return accepted.map((candidate) => candidate.record);
  }

  createStationMarker(record) {
    const {
      station,
      cachedStation,
      ageMinutes,
      fieldConfig,
      iconSize,
      iconAnchor,
      lat,
      lon,
      metric,
      stateClass,
      sizeClass,
      stationName,
    } = record;
    const icon = window.L.divIcon({
      className: 'temperature-marker-icon',
      html: `<span class="temperature-marker-value${stateClass}${sizeClass}"><span class="temperature-marker-reading">${metric.html}</span></span>`,
      iconSize,
      iconAnchor,
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
    this.stationMarkers.set(station.id, marker);
    return marker;
  }

  reconcileStationMarkers() {
    if (!this.map || !this.markerLayer) return;
    const leafletMap = this.map.ensureMap();
    const eligibleRecords = [];

    for (const record of this.stationRecords.values()) {
      if (this.stationIsVisible(record, leafletMap)) eligibleRecords.push(record);
    }
    const displayedRecords = this.thinStationRecords(eligibleRecords, leafletMap);
    const displayedStationIds = new Set(displayedRecords.map((record) => record.station.id));

    for (const [stationId, record] of this.stationRecords) {
      const marker = this.stationMarkers.get(stationId);
      const retainSelected = marker === this.selectedMarker && !this.stationDetails?.hidden;

      if (displayedStationIds.has(stationId) || retainSelected) {
        if (!marker) this.createStationMarker(record);
      } else if (marker) {
        this.markerLayer.removeLayer(marker);
        this.stationMarkers.delete(stationId);
      }
    }

    const reportingCount = this.stationRecords.size;
    const visibleCount = displayedRecords.length;
    if (this.stationCount) {
      this.stationCount.textContent = this.coverageMode === 'local-fallback'
        ? `Local coverage · ${reportingCount} reporting`
        : this.coverageMode === 'regional-fallback'
          ? `${visibleCount} visible · ${reportingCount} regional fallback`
          : `${visibleCount} visible · ${reportingCount} reporting`;
    }
    this.mapElement.dataset.coverageMode = this.coverageMode;
    this.mapElement.dataset.eligibleStationCount = String(eligibleRecords.length);
    this.mapElement.dataset.visibleStationCount = String(visibleCount);
    this.mapElement.dataset.reportingStationCount = String(reportingCount);
    this.mapElement.dataset.liveMarkerCount = String(this.stationMarkers.size);
    this.mapElement.dataset.stationThinningActive = String(
      visibleCount < eligibleRecords.length,
    );
    this.mapElement.dataset.stationSpacingPixels = String(
      ['statewide', 'regional-fallback'].includes(this.coverageMode)
        ? statewideStationSpacing(leafletMap.getZoom())
        : 0,
    );
    const center = leafletMap.getCenter();
    this.mapElement.dataset.mapCenter = `${center.lat.toFixed(5)},${center.lng.toFixed(5)}`;
    this.mapElement.dataset.mapZoom = String(leafletMap.getZoom());
  }

  async activate() {
    this.active = true;
    if (!this.context) this.context = await loadWeatherPageContext();
    this.ensureMap().setVisible(true);
    window.clearInterval(this.refreshTimer);
    this.refreshTimer = window.setInterval(() => {
      if (this.active) this.loadStations({ replace: true });
    }, REFRESH_INTERVAL_MS);
    if (!this.lastLoadedAt || Date.now() - this.lastLoadedAt >= REFRESH_INTERVAL_MS) {
      await this.loadStations();
    }
  }

  deactivate() {
    this.active = false;
    window.clearInterval(this.refreshTimer);
    this.refreshTimer = 0;
    this.map?.setVisible(false);
  }

  async handleZoneChange() {
    this.stationLoadGeneration += 1;
    this.stationConfig = null;
    this.currentData = null;
    this.stationRecords.clear();
    this.hasInitializedView = false;
    this.lastLoadedAt = 0;
    this.coverageMode = 'local';
    this.cancelStationMarkerReconcile();
    this.hideStationDetails({ reconcile: false });
    this.clearStationMarkers();
    if (this.stationCount) this.stationCount.textContent = 'Loading stations...';

    try {
      this.context = await loadWeatherPageContext();
      if (this.map) {
        this.map.ensureMap().setView(this.context.center, initialMapZoom(), { animate: false });
        if (this.cityLabelOverlay) {
          this.cityLabelOverlay.homeCenter = this.context.center;
          this.cityLabelOverlay.render?.();
        }
        this.hasInitializedView = true;
      }
      if (this.active) await this.loadStations({ replace: true });
    } catch (error) {
      console.error('[county-weather-center] Zone refresh failed:', error);
    }
  }

  async loadStations({ replace = false } = {}) {
    if (this.loadingPromise && !replace) return this.loadingPromise;

    const generation = ++this.stationLoadGeneration;
    this.loading.hidden = false;
    this.error.hidden = true;
    const loadPromise = this.fetchAndRenderStations(generation);
    this.loadingPromise = loadPromise;

    try {
      await loadPromise;
      if (generation === this.stationLoadGeneration) this.lastLoadedAt = Date.now();
    } catch (error) {
      if (generation === this.stationLoadGeneration) {
        console.error('[county-weather-center] Temperature observations failed:', error);
        this.error.hidden = false;
        if (this.stationCount) this.stationCount.textContent = 'Station data unavailable';
      }
    } finally {
      if (this.loadingPromise === loadPromise) {
        this.loading.hidden = true;
        this.loadingPromise = null;
      }
    }
  }

  async fetchAndRenderStations(generation) {
    const cacheKey = Math.floor(Date.now() / REFRESH_INTERVAL_MS);
    const context = await loadWeatherPageContext();
    let stations;
    let current;
    let coverageMode = 'local';

    if (context.conditionsSource?.mode === 'statewide') {
      try {
        [stations, current] = await Promise.all([
          loadStatewideStationCatalog(
            context.conditionsSource.stationsUrl,
            context.conditionsSource.state,
          ),
          fetchJson(
            versionedUrl(context.conditionsSource.currentUrl, cacheKey),
            'Statewide current observations',
          ),
        ]);
        if (!current?.stations || typeof current.stations !== 'object' || Array.isArray(current.stations)) {
          throw new Error('Statewide current observations are invalid');
        }
        coverageMode = 'statewide';
      } catch (error) {
        const fallbackUrls = context.conditionsSource.fallbackCurrentUrls || [];
        if (fallbackUrls.length) {
          console.warn(
            '[county-weather-center] Statewide observations unavailable; using regional fallback coverage:',
            error,
          );
          [stations, current] = await Promise.all([
            loadStatewideStationCatalog(
              context.conditionsSource.stationsUrl,
              context.conditionsSource.state,
            ),
            loadFallbackCurrentObservations(fallbackUrls, cacheKey),
          ]);
          stations = stations.filter((station) => current.stations?.[station.id]);
          coverageMode = 'regional-fallback';
        } else {
          console.warn(
            '[county-weather-center] Statewide observations unavailable; using local coverage:',
            error,
          );
          stations = Array.isArray(context.stations) ? context.stations : [];
          current = await fetchJson(
            versionedUrl(context.dataPath('current.json'), cacheKey),
            'Local current observations',
          );
          coverageMode = 'local-fallback';
        }
      }
    } else {
      stations = Array.isArray(context.stations) ? context.stations : [];
      current = await fetchJson(
        versionedUrl(context.dataPath('current.json'), cacheKey),
        'Current observations',
      );
    }

    if (generation !== this.stationLoadGeneration) return;
    if (!Array.isArray(stations) || !stations.length) {
      throw new Error('No temperature stations are configured');
    }
    if (!current?.stations || typeof current.stations !== 'object' || Array.isArray(current.stations)) {
      throw new Error('Current observations are invalid');
    }

    this.context = context;
    this.stationConfig = stations;
    this.currentData = current;
    this.coverageMode = coverageMode;
    this.renderStations();
  }

  renderStations() {
    if (!this.stationConfig || !this.currentData) return;

    this.ensureMap();
    this.cancelStationMarkerReconcile();
    this.hideStationDetails({ reconcile: false });
    this.clearStationMarkers();
    this.stationRecords = new Map();

    const observationTimes = [];
    let freshCount = 0;
    let validStationCount = 0;
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
      validStationCount += 1;
      if (!metric.available) continue;

      const stateClass = stale ? ' is-stale' : '';
      const sizeClass = metric.compact ? ' is-compact' : '';
      const stationName = station.friendlyName || station.name || station.id;
      const markerSize = metric.compact
        ? STATION_MARKER_SIZES.compact
        : STATION_MARKER_SIZES.regular;
      this.stationRecords.set(station.id, {
        station,
        cachedStation,
        ageMinutes,
        fieldConfig,
        lat,
        lon,
        metric,
        stale,
        stateClass,
        sizeClass,
        stationName,
        iconSize: markerSize.iconSize,
        iconAnchor: markerSize.iconAnchor,
      });
    }

    if (!validStationCount) throw new Error('No configured stations have valid coordinates');
    const reportingCount = this.stationRecords.size;
    this.statusDot?.classList.toggle('is-empty', reportingCount === 0);
    this.mapElement.dataset.configuredStationCount = String(this.stationConfig.length);
    this.mapElement.dataset.reportingStationCount = String(reportingCount);
    this.mapElement.setAttribute(
      'aria-label',
      currentConditionsAriaLabel(this.context, fieldConfig.mapLabel),
    );
    if (!this.hasInitializedView) {
      this.map.ensureMap().setView(this.context.center, initialMapZoom(), { animate: false });
      this.hasInitializedView = true;
    }

    const newestObservation = observationTimes.sort(
      (left, right) => Date.parse(right) - Date.parse(left),
    )[0];
    this.timestamp.textContent = newestObservation
      ? `NWS observations · Latest ${formatWeatherTime(newestObservation)} · ${freshCount} of ${validStationCount} sites fresh`
      : `NWS observations · Observation times unavailable · ${validStationCount} configured sites`;
    this.reconcileStationMarkers();
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
