import {
  InteractiveWeatherMap,
  WEATHER_BASEMAPS,
  formatWeatherTime,
} from '../../js/modules/interactiveWeatherMap.js?v=20260821-basemap-menu-2';
import { TropicalMapEngine } from '../../js/modules/tropicalMapEngine.js?v=20260821-basemap-menu-2';
import { TROPICAL_REFERENCE_OVERLAYS } from '../../js/modules/tropicalReferenceLayers.js?v=20260819-1';
import {
  TROPICAL_SATELLITE_PRODUCTS,
  tropicalSatelliteSource,
} from '../../js/modules/tropicalSatelliteMap.js?v=20260821-basemap-menu-2';

const LAYER_PRODUCT = Object.freeze({
  currentPosition: 'currentPosition',
  bestTrack: 'bestTrack',
  forecastTrack: 'forecastTrack',
  cone: 'cone',
  watchesWarnings: 'watchesWarnings',
  surgeWarnings: 'surgeWarnings',
  windRadii34: 'windRadii',
  windRadii50: 'windRadii',
  windRadii64: 'windRadii',
});

const FLOATER_PRODUCTS = Object.freeze({
  GEOCOLOR: 'GEOCOLOR',
  CLEAN_IR: '13',
  '02': '02',
  '07': '07',
  '08': '08',
});

const MOBILE_STORM_MAP_MIN_ZOOM = 4;

function parseStormCoordinate(value, textValue, axis) {
  const numeric = value === null || value === undefined || value === '' ? Number.NaN : Number(value);
  if (Number.isFinite(numeric)) return numeric;

  const match = String(textValue || '').trim().match(/^(\d+(?:\.\d+)?)\s*([NSEW])$/i);
  if (!match) return Number.NaN;
  const magnitude = Number(match[1]);
  const hemisphere = match[2].toUpperCase();
  if (!Number.isFinite(magnitude)) return Number.NaN;
  if (axis === 'latitude' && !['N', 'S'].includes(hemisphere)) return Number.NaN;
  if (axis === 'longitude' && !['E', 'W'].includes(hemisphere)) return Number.NaN;
  return ['S', 'W'].includes(hemisphere) ? -magnitude : magnitude;
}

function activeStormCenter(advisory) {
  const latitude = parseStormCoordinate(advisory?.loc?.lat, advisory?.loc?.latText, 'latitude');
  const longitude = parseStormCoordinate(advisory?.loc?.lon, advisory?.loc?.lonText, 'longitude');
  if (
    !Number.isFinite(latitude)
    || !Number.isFinite(longitude)
    || latitude < -90
    || latitude > 90
    || longitude < -180
    || longitude > 180
  ) {
    return null;
  }
  return [latitude, longitude];
}

function stormBasin(stormId) {
  if (stormId.startsWith('EP')) return 'epac';
  if (stormId.startsWith('CP')) return 'cpac';
  return 'atl';
}

export class ActiveStormMapController {
  constructor({ documentRef = globalThis.document, windowRef = globalThis.window } = {}) {
    this.documentRef = documentRef;
    this.windowRef = windowRef;
    this.controls = Array.from(documentRef?.querySelectorAll?.('[data-storm-layer]') || []);
    this.mapPanel = documentRef?.getElementById?.('storm-panel-map');
    this.mapShell = documentRef?.querySelector?.('.active-storm-map-section .interactive-weather-map-shell');
    this.imageryGroup = documentRef?.getElementById?.('active-map-imagery-source');
    this.imageryDetails = this.imageryGroup?.closest?.('.active-map-imagery') || null;
    this.satelliteControls = documentRef?.getElementById?.('active-map-satellite-controls');
    this.playButton = documentRef?.getElementById?.('active-satellite-play-pause');
    this.scrubber = documentRef?.getElementById?.('active-satellite-frame-scrubber');
    this.scrubberOutput = documentRef?.getElementById?.('active-satellite-frame-indicator');
    this.loading = documentRef?.getElementById?.('active-satellite-loading');
    this.error = documentRef?.getElementById?.('active-satellite-error');
    this.timestamp = documentRef?.getElementById?.('active-satellite-timestamp');
    this.legend = documentRef?.getElementById?.('active-satellite-legend');
    this.legendTitle = documentRef?.getElementById?.('active-satellite-legend-title');
    this.fallback = documentRef?.getElementById?.('active-satellite-image-container');
    this.fallbackImage = documentRef?.getElementById?.('active-satellite-image');
    this.startedStormId = null;
    this.pendingStormId = null;
    this.pendingStormCenter = null;
    this.basin = 'atl';
    this.mapPanelActive = !this.mapPanel?.hidden;
    this.imageryGeneration = 0;
    this.fallbackMode = false;
    this.fallbackPlaying = false;
    this.handleStormReady = this.handleStormReady.bind(this);
    this.handleWorkspacePanelChange = this.handleWorkspacePanelChange.bind(this);
    this.handleImageryChange = this.handleImageryChange.bind(this);
    this.handlePlayback = this.handlePlayback.bind(this);
  }

  init() {
    if (!this.documentRef?.getElementById?.('active-storm-map') || !this.windowRef) return false;
    this.windowRef.addEventListener('nch:active-storm-ready', this.handleStormReady);
    this.windowRef.addEventListener('nch:active-workspace-panel-change', this.handleWorkspacePanelChange);
    this.imageryGroup?.addEventListener('change', this.handleImageryChange);
    this.playButton?.addEventListener('click', this.handlePlayback);
    for (const control of this.controls) {
      control.addEventListener('change', () => {
        this.engine?.setLayerVisible(control.dataset.stormLayer, control.checked);
      });
    }
    this.syncSatelliteUi(false);
    const ready = this.windowRef.NCHActiveStorm;
    if (ready?.stormId) this.handleStormReady({ detail: ready });
    return true;
  }

  handleStormReady(event) {
    const stormId = String(event?.detail?.stormId || '').toUpperCase();
    if (!stormId) return;
    this.pendingStormId = stormId;
    this.pendingStormCenter = activeStormCenter(event?.detail?.advisory);
    this.basin = stormBasin(stormId);
    if (this.mapPanelActive) this.load(stormId);
  }

  handleWorkspacePanelChange(event) {
    if (event?.detail?.group !== 'storm') return;
    this.mapPanelActive = event.detail.panel === 'map';
    if (!this.mapPanelActive) {
      this.engine?.setVisible(false);
      this.satelliteMap?.setVisible(false);
      return;
    }
    if (this.pendingStormId) this.load(this.pendingStormId);
    this.engine?.setVisible(true);
    if (this.imageryValue() !== 'map') this.satelliteMap?.setVisible(true);
  }

  async load(stormId) {
    const normalized = String(stormId || '').toUpperCase();
    if (!/^(?:AL|EP|CP)\d{6}$/.test(normalized)) return false;
    if (normalized === this.startedStormId) {
      this.engine?.setVisible(true);
      this.applyMobileZoomFloor();
      return true;
    }
    this.startedStormId = normalized;
    this.basin = stormBasin(normalized);
    this.engine ||= new TropicalMapEngine({
      mode: 'storm',
      container: 'active-storm-map',
      status: 'active-storm-map-status',
      basin: this.basin,
      leaflet: this.windowRef.L,
      documentRef: this.documentRef,
      windowRef: this.windowRef,
      fetchImpl: this.windowRef.fetch,
      resizeObserverClass: this.windowRef.ResizeObserver,
      basemaps: WEATHER_BASEMAPS,
      initialBasemap: 'esri',
      showBasemapControl: true,
      basemapControlPosition: 'topleft',
      referenceOverlays: TROPICAL_REFERENCE_OVERLAYS,
      onStatus: (event) => this.handleMapStatus(event),
    });
    for (const control of this.controls) {
      this.engine.setLayerVisible(control.dataset.stormLayer, control.checked);
    }
    try {
      const loaded = await this.engine.loadStorm(normalized, {
        manifestUrl: `./storms/${encodeURIComponent(normalized)}/map/manifest.json`,
      });
      if (loaded) this.centerOnStorm();
      this.applyMobileZoomFloor();
      if (this.imageryValue() !== 'map') await this.selectImagery();
      return loaded;
    } catch (error) {
      console.warn('[active-storm-map] Detailed map unavailable:', error);
      return false;
    }
  }

  centerOnStorm(center = this.pendingStormCenter) {
    const map = this.engine?.map;
    const latitude = Number(center?.[0]);
    const longitude = Number(center?.[1]);
    const zoom = Number(map?.getZoom?.());
    if (!map || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
    if (Number.isFinite(zoom)) {
      map.setView([latitude, longitude], zoom, { animate: false });
    } else {
      map.panTo?.([latitude, longitude], { animate: false });
    }
    return true;
  }

  applyMobileZoomFloor() {
    const map = this.engine?.map;
    const compact = this.engine?.isCompactLayout?.();
    const zoom = Number(map?.getZoom?.());
    if (compact && Number.isFinite(zoom) && zoom < MOBILE_STORM_MAP_MIN_ZOOM) {
      map.setZoom(MOBILE_STORM_MAP_MIN_ZOOM, { animate: false });
    }
  }

  ensureSatelliteMap() {
    if (this.satelliteMap || !this.engine?.map) return this.satelliteMap;
    this.satelliteMap = new InteractiveWeatherMap({
      container: 'active-storm-map',
      mapInstance: this.engine.map,
      dataPane: 'tropicalSatellitePane',
      dataPaneZIndex: 250,
      center: this.engine.map.getCenter?.(),
      zoom: this.engine.map.getZoom?.(),
      maxFrames: 12,
      overlayOpacity: 0.9,
      scrubber: this.scrubber,
      scrubberOutput: this.scrubberOutput,
      requireCtrlForWheelZoom: false,
      onLoading: (busy) => this.setSatelliteBusy(busy),
      onError: () => {},
      onFrame: ({ time, index, count, source }) => {
        if (this.timestamp) {
          this.timestamp.textContent = `${source.label} · ${formatWeatherTime(time)}${
            count ? ` · Frame ${index + 1} of ${count}` : ''
          }`;
        }
      },
      onPlayStateChange: (playing) => this.syncPlayButton(playing),
    });
    this.satelliteMap.ensureMap();
    return this.satelliteMap;
  }

  imageryValue() {
    return this.imageryGroup?.querySelector?.('[data-map-imagery]:checked')?.value || 'map';
  }

  imageryLabel() {
    return this.imageryGroup?.querySelector?.('[data-map-imagery]:checked')?.closest?.('label')?.textContent?.trim()
      || 'satellite';
  }

  handleImageryChange(event) {
    if (!event?.target?.matches?.('[data-map-imagery]')) return;
    this.imageryDetails?.removeAttribute?.('open');
    this.selectImagery();
  }

  async selectImagery() {
    const productKey = this.imageryValue();
    const generation = ++this.imageryGeneration;
    this.fallbackMode = false;
    this.fallbackPlaying = false;
    this.restoreInteractiveMap();
    if (productKey === 'map') {
      this.satelliteMap?.setVisible(false);
      this.syncSatelliteUi(false);
      if (this.timestamp) this.timestamp.textContent = 'Storm map imagery';
      return true;
    }
    if (!this.engine?.map || !this.mapPanelActive) return false;
    this.syncSatelliteUi(true);
    this.renderSatelliteLegend(productKey);
    const source = tropicalSatelliteSource(this.basin, productKey);
    try {
      const satelliteMap = this.ensureSatelliteMap();
      satelliteMap.setVisible(true);
      const loaded = await satelliteMap.setSource(source);
      if (generation !== this.imageryGeneration) return false;
      this.restoreInteractiveMap();
      return loaded;
    } catch (error) {
      if (generation !== this.imageryGeneration) return false;
      console.warn('[active-storm-map] Interactive satellite unavailable; using floater fallback:', error);
      return this.showFloaterFallback(productKey, generation);
    }
  }

  floaterUrl(productKey, playing) {
    const product = FLOATER_PRODUCTS[productKey] || 'GEOCOLOR';
    const base = `https://cdn.star.nesdis.noaa.gov/FLOATER/${this.startedStormId}/${product}`;
    return playing
      ? `${base}/${this.startedStormId}-${product}-1000x1000.gif`
      : `${base}/1000x1000.jpg`;
  }

  showFloaterFallback(productKey, generation = ++this.imageryGeneration) {
    if (!this.fallback || !this.fallbackImage || !this.startedStormId) return false;
    this.satelliteMap?.setVisible(false);
    this.fallbackMode = true;
    this.setSatelliteBusy(true);
    const url = this.floaterUrl(productKey, this.fallbackPlaying);
    return new Promise((resolve) => {
      const probe = new this.windowRef.Image();
      probe.onload = () => {
        if (generation !== this.imageryGeneration) return resolve(false);
        this.fallbackImage.src = url;
        this.fallbackImage.alt = `${this.startedStormId} ${this.imageryLabel()} ${this.fallbackPlaying ? 'animated loop' : 'latest image'}`;
        this.fallback.hidden = false;
        this.mapShell?.classList.add('is-satellite-fallback');
        if (this.timestamp) {
          this.timestamp.textContent = `NOAA STAR storm floater · ${this.fallbackPlaying ? 'Animated loop' : 'Latest image'}`;
        }
        this.setSatelliteBusy(false);
        this.syncPlayButton(this.fallbackPlaying);
        resolve(true);
      };
      probe.onerror = () => {
        if (generation === this.imageryGeneration) {
          this.setSatelliteBusy(false);
          this.restoreInteractiveMap();
          if (this.error) this.error.hidden = false;
        }
        resolve(false);
      };
      probe.src = url;
    });
  }

  restoreInteractiveMap() {
    this.mapShell?.classList.remove('is-satellite-fallback');
    if (this.fallback) this.fallback.hidden = true;
    if (this.error) this.error.hidden = true;
  }

  async handlePlayback() {
    const productKey = this.imageryValue();
    if (productKey === 'map') return;
    if (this.fallbackMode) {
      this.fallbackPlaying = !this.fallbackPlaying;
      await this.showFloaterFallback(productKey);
      return;
    }
    if (this.satelliteMap?.playing) {
      this.satelliteMap.stop();
      await this.satelliteMap.showLatest();
      return;
    }
    await this.satelliteMap?.start();
  }

  syncSatelliteUi(visible) {
    if (this.satelliteControls) this.satelliteControls.hidden = !visible;
    if (this.legend) this.legend.hidden = !visible;
    if (!visible) {
      this.syncPlayButton(false);
      this.satelliteMap?.setScrubberVisible(false);
      this.restoreInteractiveMap();
    }
  }

  renderSatelliteLegend(productKey) {
    const product = TROPICAL_SATELLITE_PRODUCTS[productKey];
    if (this.legendTitle) this.legendTitle.textContent = product?.label || 'Satellite imagery';
    if (this.legend) this.legend.hidden = false;
  }

  setSatelliteBusy(busy) {
    if (this.loading) this.loading.hidden = !busy;
    this.mapShell?.setAttribute('aria-busy', String(Boolean(busy)));
    if (busy && this.error) this.error.hidden = true;
  }

  syncPlayButton(playing) {
    if (!this.playButton) return;
    const icon = this.playButton.querySelector('i');
    icon?.classList.toggle('fa-play', !playing);
    icon?.classList.toggle('fa-pause', playing);
    this.playButton.setAttribute('aria-pressed', String(Boolean(playing)));
    this.playButton.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} satellite animation`);
  }

  handleMapStatus(event) {
    const products = event?.manifest?.products;
    if (!products) return;
    const counts = event.snapshot?.layerCounts || {};
    for (const control of this.controls) {
      const layerKey = control.dataset.stormLayer;
      const product = products[LAYER_PRODUCT[layerKey]];
      const issued = product?.state === 'fresh' && Number(counts[layerKey]) > 0;
      control.disabled = layerKey === 'currentPosition' || !issued;
      control.closest?.('label')?.classList?.toggle('is-unavailable', !issued);
    }
  }

  destroy() {
    this.windowRef?.removeEventListener?.('nch:active-storm-ready', this.handleStormReady);
    this.windowRef?.removeEventListener?.('nch:active-workspace-panel-change', this.handleWorkspacePanelChange);
    this.imageryGroup?.removeEventListener('change', this.handleImageryChange);
    this.playButton?.removeEventListener('click', this.handlePlayback);
    this.satelliteMap?.destroy();
    this.satelliteMap = null;
    this.engine?.destroy();
    this.engine = null;
  }
}

const controller = new ActiveStormMapController();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => controller.init(), { once: true });
} else {
  controller.init();
}
