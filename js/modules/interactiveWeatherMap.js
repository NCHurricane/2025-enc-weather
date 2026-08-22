const DEFAULT_BASEMAP_URL =
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png';
const DEFAULT_BASEMAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>, ChuckCopelandWX';
const referenceGeoJsonPromises = new Map();
let basemapMenuSequence = 0;

export const WEATHER_BASEMAPS = Object.freeze({
  light: {
    label: 'Light',
    url: DEFAULT_BASEMAP_URL,
    attribution: DEFAULT_BASEMAP_ATTRIBUTION,
    maxZoom: 20,
    subdomains: 'abcd',
  },
  dark: {
    label: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>, ChuckCopelandWX',
    maxZoom: 20,
    subdomains: 'abcd',
  },
  usgs: {
    label: 'USGS US Imagery',
    url: 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}',
    attribution: 'USGS The National Map, USDA, ChuckCopelandWX',
    maxZoom: 16,
  },
  esri: {
    label: 'Esri World Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, DigitalGlobe, Earthstar Geographics, ChuckCopelandWX',
    maxZoom: 18,
  },
});

export function installBasemapMenuControl({
  leaflet = globalThis.L,
  map,
  basemaps = WEATHER_BASEMAPS,
  initialBasemap = 'esri',
  position = 'topleft',
  onSelect = () => true,
} = {}) {
  const entries = Object.entries(basemaps || {});
  const documentRef = map?.getContainer?.()?.ownerDocument || globalThis.document;
  if (!leaflet?.control || !leaflet?.DomUtil || !map || !documentRef || entries.length === 0) {
    return null;
  }

  const radioName = `map-basemap-${++basemapMenuSequence}`;
  let selectedBasemapId = basemaps[initialBasemap] ? initialBasemap : entries[0][0];
  const inputs = new Map();
  const control = leaflet.control({ position });

  control.setActiveBasemap = (basemapId) => {
    if (!basemaps[basemapId]) return false;
    selectedBasemapId = basemapId;
    for (const [id, input] of inputs) input.checked = id === basemapId;
    return true;
  };

  control.onAdd = () => {
    const container = leaflet.DomUtil.create('div', 'map-basemap-control');
    const details = documentRef.createElement('details');
    details.className = 'map-menu map-menu--map-control';

    const summary = documentRef.createElement('summary');
    summary.setAttribute('aria-label', 'Choose base map');
    summary.title = 'Choose base map';
    const icon = documentRef.createElement('i');
    icon.className = 'fa-solid fa-layer-group';
    icon.setAttribute('aria-hidden', 'true');
    summary.appendChild(icon);

    const options = documentRef.createElement('div');
    options.className = 'map-menu-options';
    options.setAttribute('role', 'radiogroup');
    options.setAttribute('aria-label', 'Base map');

    for (const [basemapId, config] of entries) {
      const label = documentRef.createElement('label');
      const input = documentRef.createElement('input');
      input.type = 'radio';
      input.name = radioName;
      input.value = basemapId;
      input.checked = basemapId === selectedBasemapId;
      input.addEventListener('change', () => {
        if (!input.checked) return;
        const previousBasemapId = selectedBasemapId;
        if (onSelect(basemapId) === false) {
          control.setActiveBasemap(previousBasemapId);
          return;
        }
        control.setActiveBasemap(basemapId);
        details.removeAttribute('open');
      });
      inputs.set(basemapId, input);
      label.append(input, documentRef.createTextNode(config.label || basemapId));
      options.appendChild(label);
    }

    details.append(summary, options);
    container.appendChild(details);
    leaflet.DomEvent?.disableClickPropagation?.(container);
    leaflet.DomEvent?.disableScrollPropagation?.(container);
    return container;
  };

  control.addTo(map);
  control.setActiveBasemap(selectedBasemapId);
  return control;
}

function resolveElement(value) {
  return typeof value === 'string' ? document.getElementById(value) : value;
}

function loadReferenceGeoJson(url) {
  if (!referenceGeoJsonPromises.has(url)) {
    const promise = fetch(url, { cache: 'force-cache' })
      .then((response) => {
        if (!response.ok) throw new Error(`Boundary GeoJSON request failed (${response.status})`);
        return response.json();
      })
      .catch((error) => {
        referenceGeoJsonPromises.delete(url);
        throw error;
      });
    referenceGeoJsonPromises.set(url, promise);
  }
  return referenceGeoJsonPromises.get(url);
}

function referenceStyleAtZoom(zoom, style, zoomStyles) {
  const zoomStyle = zoomStyles.find((candidate) => {
    return (
      (candidate.minZoom === undefined || zoom >= candidate.minZoom) &&
      (candidate.maxZoom === undefined || zoom <= candidate.maxZoom)
    );
  });
  return zoomStyle?.style || style || {};
}

function waitForPaint() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
  });
}

async function decodeLayerTiles(layer) {
  const tiles = Object.values(layer?._tiles || {})
    .map((tile) => tile?.el)
    .filter(Boolean);

  await Promise.all(
    tiles.map(async (tile) => {
      if (typeof tile.decode !== 'function') return;
      try {
        await tile.decode();
      } catch {
        // tileload/tileerror accounting below remains authoritative.
      }
    }),
  );
}

function directChild(element, localName) {
  return Array.from(element?.children || []).find((child) => child.localName === localName) || null;
}

function buildCapabilitiesUrl(wmsUrl) {
  const url = new URL(wmsUrl);
  url.searchParams.set('SERVICE', 'WMS');
  url.searchParams.set('VERSION', '1.3.0');
  url.searchParams.set('REQUEST', 'GetCapabilities');
  return url.toString();
}

function parseIsoDurationMs(value) {
  const match = value.match(
    /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i,
  );
  if (!match) return 0;

  const [, days = 0, hours = 0, minutes = 0, seconds = 0] = match;
  return (
    Number(days) * 86400000 +
    Number(hours) * 3600000 +
    Number(minutes) * 60000 +
    Number(seconds) * 1000
  );
}

function expandTimeValue(value) {
  const parts = value.split('/');
  if (parts.length !== 3) return [value];

  const startMs = Date.parse(parts[0]);
  const endMs = Date.parse(parts[1]);
  const stepMs = parseIsoDurationMs(parts[2]);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || stepMs <= 0 || endMs < startMs) {
    return [];
  }

  const frames = [];
  for (let timeMs = startMs; timeMs <= endMs && frames.length < 10000; timeMs += stepMs) {
    frames.push(new Date(timeMs).toISOString().replace('.000Z', 'Z'));
  }
  return frames;
}

export async function fetchWmsTimes(wmsUrl, layerName, { signal } = {}) {
  const response = await fetch(buildCapabilitiesUrl(wmsUrl), {
    signal,
  });

  if (!response.ok) {
    throw new Error(`WMS capabilities request failed (${response.status})`);
  }

  const documentXml = new DOMParser().parseFromString(await response.text(), 'application/xml');
  if (documentXml.querySelector('parsererror')) {
    throw new Error('WMS capabilities response was not valid XML');
  }

  const layer = Array.from(documentXml.getElementsByTagNameNS('*', 'Layer')).find((candidate) => {
    return directChild(candidate, 'Name')?.textContent?.trim() === layerName;
  });

  if (!layer) {
    throw new Error(`WMS layer not found: ${layerName}`);
  }

  const timeDimension = Array.from(layer.children).find((child) => {
    return child.localName === 'Dimension' && child.getAttribute('name')?.toLowerCase() === 'time';
  });

  if (!timeDimension?.textContent?.trim()) {
    return [];
  }

  const frames = timeDimension.textContent
    .trim()
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .flatMap(expandTimeValue);

  return Array.from(new Set(frames)).sort((left, right) => Date.parse(left) - Date.parse(right));
}

export function formatWeatherTime(value) {
  if (!value) return 'Latest available';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export class InteractiveWeatherMap {
  constructor({
    container,
    mapInstance = null,
    dataPane = 'weatherDataPane',
    dataPaneZIndex = 300,
    center,
    zoom,
    minZoom = 4,
    maxZoom = 12,
    maxFrames = 12,
    frameDelayMs = 650,
    overlayOpacity = 0.82,
    ariaLabel = 'Interactive weather map',
    basemaps = WEATHER_BASEMAPS,
    initialBasemap = 'esri',
    showBasemapControl = false,
    basemapControlPosition = 'topright',
    requireCtrlForWheelZoom = true,
    referenceOverlay = null,
    referenceOverlays = null,
    scrubber = null,
    scrubberOutput = null,
    onLoading = () => {},
    onError = () => {},
    onFrame = () => {},
    onPlayStateChange = () => {},
  }) {
    this.container = resolveElement(container);
    this.ownsMap = !mapInstance;
    this.dataPane = dataPane;
    this.dataPaneZIndex = dataPaneZIndex;
    this.center = center;
    this.zoom = zoom;
    this.minZoom = minZoom;
    this.maxZoom = maxZoom;
    this.maxFrames = maxFrames;
    this.frameDelayMs = frameDelayMs;
    this.overlayOpacity = overlayOpacity;
    this.ariaLabel = ariaLabel;
    this.basemaps = basemaps;
    this.activeBasemapId = basemaps[initialBasemap] ? initialBasemap : Object.keys(basemaps)[0];
    this.showBasemapControl = showBasemapControl;
    this.requireCtrlForWheelZoom = requireCtrlForWheelZoom;
    this.basemapControlPosition = ['topleft', 'topright', 'bottomleft', 'bottomright'].includes(
      basemapControlPosition,
    )
      ? basemapControlPosition
      : 'topright';
    this.referenceOverlays = referenceOverlays || (referenceOverlay ? [referenceOverlay] : []);
    this.scrubber = resolveElement(scrubber);
    this.scrubberOutput = resolveElement(scrubberOutput);
    this.scrubberContainer = this.scrubber?.closest('.weather-map-scrubber') || null;
    this.onLoading = onLoading;
    this.onError = onError;
    this.onFrame = onFrame;
    this.onPlayStateChange = onPlayStateChange;

    this.map = mapInstance || null;
    this.zoomIndicator = null;
    this.basemapLayer = null;
    this.basemapLayers = new Map();
    this.basemapLayerControl = null;
    this.referenceLayers = [];
    this.source = null;
    this.frames = [];
    this.frameIndex = -1;
    this.weatherLayer = null;
    this.pendingLayer = null;
    this.weatherLayerPool = new Map();
    this.capabilitiesController = null;
    this.sourceToken = 0;
    this.displayToken = 0;
    this.playTimer = null;
    this.scrubRequestToken = 0;
    this.playing = false;
    this.visible = true;
    this.lastCtrlWheelAt = Number.NEGATIVE_INFINITY;
    this.updateZoomIndicator = this.updateZoomIndicator.bind(this);
    this.handleCtrlWheel = this.handleCtrlWheel.bind(this);
    this.handleScrubberInput = this.handleScrubberInput.bind(this);
    this.scrubber?.addEventListener('input', this.handleScrubberInput);
    this.syncScrubber(false);
  }

  ensureMap() {
    if (this.map) {
      this.ensureDataPane();
      return this.map;
    }
    if (!this.container) throw new Error('Interactive map container was not found');
    if (!window.L) throw new Error('Leaflet did not load');

    this.container.setAttribute('aria-label', this.ariaLabel);
    this.map = window.L.map(this.container, {
      center: this.center,
      zoom: this.zoom,
      minZoom: this.minZoom,
      maxZoom: this.maxZoom,
      scrollWheelZoom: !this.requireCtrlForWheelZoom,
      fadeAnimation: false,
      preferCanvas: true,
    });
    this.installZoomIndicator();

    this.map.createPane('weatherBasemapPane').style.zIndex = '200';
    this.ensureDataPane();
    this.map.createPane('weatherReferencePane').style.zIndex = '450';
    this.map.getPane('weatherReferencePane').style.pointerEvents = 'none';

    this.createBasemapLayers();
    if (this.showBasemapControl) this.installBasemapControl();
    this.setBasemap(this.activeBasemapId);
    this.referenceLayers = this.referenceOverlays
      .filter((reference) => reference?.url)
      .map((reference) => this.addReferenceOverlay(reference))
      .filter(Boolean);

    if (this.requireCtrlForWheelZoom) {
      this.container.addEventListener('wheel', this.handleCtrlWheel, {
        capture: true,
        passive: false,
      });
    }

    return this.map;
  }

  ensureDataPane() {
    if (!this.map) return null;
    const pane = this.map.getPane?.(this.dataPane) || this.map.createPane?.(this.dataPane);
    if (pane?.style) pane.style.zIndex = String(this.dataPaneZIndex);
    return pane;
  }

  installZoomIndicator() {
    const zoomContainer = this.map?.zoomControl?.getContainer?.();
    if (!zoomContainer || this.zoomIndicator) return;

    zoomContainer.classList.add('weather-map-zoom-indicator-enabled');
    this.zoomIndicator = window.L.DomUtil.create(
      'div',
      'weather-map-zoom-indicator',
      zoomContainer,
    );
    this.zoomIndicator.setAttribute('role', 'status');
    this.zoomIndicator.setAttribute('aria-live', 'polite');
    this.map.on('zoom zoomend resize', this.updateZoomIndicator);
    this.updateZoomIndicator();
  }

  updateZoomIndicator() {
    if (!this.zoomIndicator || !this.map) return;

    const zoom = Number(this.map.getZoom()) || 0;
    this.zoomIndicator.textContent = `z ${Math.round(zoom)}`;
    this.zoomIndicator.title = `Zoom ${zoom.toFixed(2)}`;
  }

  addReferenceOverlay(reference) {
    const { type = 'tile', url, ...referenceOptions } = reference;
    const options = {
      ...referenceOptions,
      pane: 'weatherReferencePane',
    };
    if (type === 'geojson') return this.addGeoJsonReferenceOverlay(url, options);
    const layer =
      type === 'wms' ? window.L.tileLayer.wms(url, options) : window.L.tileLayer(url, options);
    return layer.addTo(this.map);
  }

  addGeoJsonReferenceOverlay(url, options) {
    const {
      minZoom,
      maxZoom,
      rendererFilter,
      style = {},
      zoomStyles = [],
      attribution,
      ...geoJsonOptions
    } = options;
    const renderer = window.L.canvas({
      pane: 'weatherReferencePane',
      padding: 0.5,
    });
    const layer = window.L.geoJSON(null, {
      ...geoJsonOptions,
      pane: 'weatherReferencePane',
      renderer,
      interactive: false,
      style: referenceStyleAtZoom(this.map.getZoom(), style, zoomStyles),
    });
    if (attribution) layer.getAttribution = () => attribution;

    const syncLayer = () => {
      if (!this.map) return;
      const zoom = this.map.getZoom();
      const visible =
        (minZoom === undefined || zoom >= minZoom) &&
        (maxZoom === undefined || zoom <= maxZoom);

      if (visible && !this.map.hasLayer(layer)) layer.addTo(this.map);
      if (!visible && this.map.hasLayer(layer)) this.map.removeLayer(layer);
      layer.setStyle(referenceStyleAtZoom(zoom, style, zoomStyles));

      const rendererContainer = renderer.getContainer?.() || renderer._container;
      if (rendererContainer) {
        rendererContainer.style.display = visible ? '' : 'none';
        if (rendererFilter) rendererContainer.style.filter = rendererFilter;
      }
    };

    this.map.on('zoomend', syncLayer);
    syncLayer();
    loadReferenceGeoJson(url)
      .then((geoJson) => {
        if (!this.map) return;
        layer.addData(geoJson);
        syncLayer();
      })
      .catch((error) => {
        console.warn('[interactive-weather-map] Boundary GeoJSON failed:', error);
      });
    return layer;
  }

  createBasemapLayers() {
    if (!this.map || this.basemapLayers.size) return;
    for (const [basemapId, config] of Object.entries(this.basemaps)) {
      const { label: _label, url, ...layerOptions } = config;
      const layer = window.L.tileLayer(url, {
        ...layerOptions,
        pane: 'weatherBasemapPane',
      });
      this.basemapLayers.set(basemapId, layer);
    }
  }

  installBasemapControl() {
    if (!this.map || this.basemapLayerControl) return;
    this.createBasemapLayers();

    this.basemapLayerControl = installBasemapMenuControl({
      leaflet: window.L,
      map: this.map,
      basemaps: this.basemaps,
      initialBasemap: this.activeBasemapId,
      position: this.basemapControlPosition,
      onSelect: (basemapId) => this.setBasemap(basemapId),
    });
  }

  setBasemap(basemapId) {
    const config = this.basemaps[basemapId];
    if (!config) return false;

    this.activeBasemapId = basemapId;
    if (!this.map) return true;

    this.createBasemapLayers();
    const nextLayer = this.basemapLayers.get(basemapId);
    if (!nextLayer) return false;

    for (const layer of this.basemapLayers.values()) {
      if (layer !== nextLayer && this.map.hasLayer(layer)) this.map.removeLayer(layer);
    }
    if (!this.map.hasLayer(nextLayer)) nextLayer.addTo(this.map);
    this.basemapLayer = nextLayer;
    this.basemapLayerControl?.setActiveBasemap?.(basemapId);
    return true;
  }

  handleCtrlWheel(event) {
    if (!event.ctrlKey || !this.map) return;

    event.preventDefault();
    event.stopPropagation();

    if (event.deltaY === 0) return;

    const now = window.performance.now();
    if (now - this.lastCtrlWheelAt < 90) return;
    this.lastCtrlWheelAt = now;

    const direction = event.deltaY < 0 ? 1 : -1;
    const nextZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.map.getZoom() + direction));
    if (nextZoom === this.map.getZoom()) return;

    this.map.setZoomAround(this.map.mouseEventToContainerPoint(event), nextZoom);
  }

  handleScrubberInput() {
    const index = Number.parseInt(this.scrubber?.value, 10);
    if (!Number.isInteger(index)) return;

    this.showFrame(index, { preservePlayback: true }).catch((error) => this.onError(error));
  }

  syncScrubber(visible = true) {
    if (!this.scrubber) return;

    const count = this.frames.length;
    const index = count ? Math.max(0, Math.min(this.frameIndex, count - 1)) : 0;
    this.scrubber.min = '0';
    this.scrubber.max = String(Math.max(0, count - 1));
    this.scrubber.value = String(index);
    this.scrubber.disabled = count < 2;
    this.scrubber.setAttribute(
      'aria-valuetext',
      count
        ? `${formatWeatherTime(this.frames[index])}, frame ${index + 1} of ${count}`
        : 'No animation frames available',
    );

    if (this.scrubberOutput) {
      this.scrubberOutput.value = count ? `${index + 1} / ${count}` : '0 / 0';
      this.scrubberOutput.textContent = this.scrubberOutput.value;
    }
    if (this.scrubberContainer) this.scrubberContainer.hidden = !visible || count === 0;
  }

  async setSource(source) {
    this.stop();
    this.frames = [];
    this.frameIndex = -1;
    this.syncScrubber(false);
    this.sourceToken += 1;
    this.displayToken += 1;
    const token = this.sourceToken;

    this.capabilitiesController?.abort();
    this.capabilitiesController = new AbortController();
    this.onError(null);
    this.onLoading(true);

    this.ensureMap();
    this.map.invalidateSize(false);

    try {
      const availableFrames = await fetchWmsTimes(source.wmsUrl, source.layer, {
        signal: this.capabilitiesController.signal,
      });

      if (token !== this.sourceToken) return false;

      this.source = source;
      this.frames = availableFrames.slice(-this.maxFrames);
      this.frameIndex = this.frames.length ? this.frames.length - 1 : -1;
      await this.displayFrame(this.frameIndex >= 0 ? this.frames[this.frameIndex] : null);

      if (token !== this.sourceToken) return false;
      this.onLoading(false);
      return true;
    } catch (error) {
      if (error.name === 'AbortError' || token !== this.sourceToken) return false;
      this.onLoading(false);
      this.onError(error);
      throw error;
    }
  }

  weatherLayerKey(time) {
    return `${this.source.wmsUrl}\u0000${this.source.layer}\u0000${time || 'latest'}`;
  }

  trimWeatherLayerPool() {
    if (!this.map || !this.source) return;

    const allowedKeys = new Set(
      this.frames.length
        ? this.frames.map((time) => this.weatherLayerKey(time))
        : [this.weatherLayerKey(null)],
    );

    this.weatherLayerPool.forEach((record, key) => {
      if (
        allowedKeys.has(key) ||
        record.layer === this.weatherLayer ||
        record.layer === this.pendingLayer
      ) {
        return;
      }

      record.layer.setOpacity(0);
      if (this.map.hasLayer(record.layer)) this.map.removeLayer(record.layer);
      this.weatherLayerPool.delete(key);
    });
  }

  displayFrame(time) {
    if (!this.source || !this.map) {
      return Promise.reject(new Error('Weather map source has not been configured'));
    }

    this.displayToken += 1;
    const token = this.displayToken;
    const options = {
      layers: this.source.layer,
      format: 'image/png',
      transparent: true,
      version: '1.3.0',
      opacity: 0,
      attribution: this.source.attribution || 'NOAA/NWS',
      pane: this.dataPane,
    };

    if (time) options.time = time;

    return new Promise((resolve, reject) => {
      const frameKey = this.weatherLayerKey(time);
      let record = this.weatherLayerPool.get(frameKey);
      const isNewLayer = !record;

      if (!record) {
        const layer = window.L.tileLayer.wms(this.source.wmsUrl, options);
        record = {
          layer,
          ready: false,
          tileErrors: 0,
          tileLoads: 0,
        };
        layer.on('loading', () => {
          record.ready = false;
          record.tileErrors = 0;
          record.tileLoads = 0;
        });
        layer.on('tileerror', () => {
          record.tileErrors += 1;
        });
        layer.on('tileload', () => {
          record.tileLoads += 1;
        });
        layer.on('load', () => {
          record.ready = true;
        });
        this.weatherLayerPool.set(frameKey, record);
      }

      const { layer } = record;
      const previousPendingLayer = this.pendingLayer;
      if (
        previousPendingLayer &&
        previousPendingLayer !== this.weatherLayer &&
        previousPendingLayer !== layer
      ) {
        previousPendingLayer.setOpacity(0);
      }
      if (layer !== this.weatherLayer) layer.setOpacity(0);

      let settled = false;
      this.pendingLayer = layer;
      let timeoutId = null;

      const stopWaiting = () => {
        window.clearTimeout(timeoutId);
        layer.off('load', onLayerLoad);
      };

      const retireFailedLayer = () => {
        if (layer === this.weatherLayer) return;
        layer.setOpacity(0);
        if (this.map?.hasLayer(layer)) this.map.removeLayer(layer);
        if (this.weatherLayerPool.get(frameKey) === record) {
          this.weatherLayerPool.delete(frameKey);
        }
      };

      const finish = async (error = null) => {
        if (settled) return;
        settled = true;
        stopWaiting();

        if (token !== this.displayToken) {
          if (this.pendingLayer !== layer && this.weatherLayer !== layer) layer.setOpacity(0);
          resolve(false);
          return;
        }

        if (error) {
          retireFailedLayer();
          if (this.pendingLayer === layer) this.pendingLayer = null;
          reject(error);
          return;
        }

        // Leaflet's load event can precede image decode and browser paint.
        // Keep the outgoing frame fully visible until the incoming tiles are
        // decoded and ready for an atomic handoff.
        await decodeLayerTiles(layer);
        await waitForPaint();
        if (token !== this.displayToken) {
          if (this.pendingLayer !== layer && this.weatherLayer !== layer) layer.setOpacity(0);
          resolve(false);
          return;
        }

        const previousLayer = this.weatherLayer;
        const committed = await new Promise((complete) => {
          window.requestAnimationFrame(() => {
            if (token !== this.displayToken || !this.map?.hasLayer(layer)) {
              if (this.pendingLayer !== layer && this.weatherLayer !== layer) layer.setOpacity(0);
              complete(false);
              return;
            }

            // Keep every frame mounted and reuse it on the next loop. Removing
            // the outgoing tile container during playback can expose the map
            // pane for a browser paint and produce a visible blink.
            this.weatherLayer = layer;
            layer.setOpacity(this.visible ? this.overlayOpacity : 0);
            if (previousLayer && previousLayer !== layer && this.map.hasLayer(previousLayer)) {
              previousLayer.setOpacity(0);
            }
            if (this.pendingLayer === layer) this.pendingLayer = null;
            complete(true);
          });
        });

        if (!committed) {
          resolve(false);
          return;
        }

        // Confirm the committed layer has painted before advancing playback.
        await new Promise((complete) => window.requestAnimationFrame(complete));
        if (token !== this.displayToken) {
          resolve(false);
          return;
        }

        this.syncScrubber(true);
        this.trimWeatherLayerPool();
        this.onFrame({
          time,
          index: this.frameIndex,
          count: this.frames.length,
          source: this.source,
        });
        resolve(true);
      };

      const onLayerLoad = () => {
        finish(
          record.tileErrors > 0 && record.tileLoads === 0
            ? new Error('Weather map tiles failed to load')
            : null,
        );
      };
      layer.on('load', onLayerLoad);

      timeoutId = window.setTimeout(() => {
        finish(new Error('Weather map tiles timed out'));
      }, 20000);

      if (!this.map.hasLayer(layer)) layer.addTo(this.map);
      if (!isNewLayer && record.ready) {
        window.queueMicrotask(onLayerLoad);
      }
    });
  }

  async showLatest() {
    this.stop();
    this.frameIndex = this.frames.length ? this.frames.length - 1 : -1;
    return this.displayFrame(this.frameIndex >= 0 ? this.frames[this.frameIndex] : null);
  }

  async showFrame(index, { preservePlayback = false } = {}) {
    if (!this.frames.length) return false;

    const nextIndex = Number(index);
    if (!Number.isInteger(nextIndex)) return false;

    const continuePlayback = preservePlayback && this.playing;
    const requestToken = ++this.scrubRequestToken;
    if (continuePlayback) {
      window.clearTimeout(this.playTimer);
      this.playTimer = null;
    } else {
      this.stop();
    }

    this.frameIndex = Math.max(0, Math.min(nextIndex, this.frames.length - 1));
    this.syncScrubber(true);
    const displayed = await this.displayFrame(this.frames[this.frameIndex]);

    if (requestToken !== this.scrubRequestToken || !displayed) return false;
    if (continuePlayback && this.playing) {
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
      this.playTimer = window.setTimeout(() => this.playCurrentFrame(), this.frameDelayMs);
    }

    return true;
  }

  async start() {
    if (this.playing || this.frames.length < 2) return false;

    this.playing = true;
    this.frameIndex = 0;
    this.onPlayStateChange(true);
    await this.playCurrentFrame();
    return true;
  }

  stop() {
    this.playing = false;
    window.clearTimeout(this.playTimer);
    this.playTimer = null;
    this.onPlayStateChange(false);
  }

  setScrubberVisible(visible) {
    this.syncScrubber(visible);
  }

  async playCurrentFrame() {
    if (!this.playing) return;

    try {
      const displayed = await this.displayFrame(this.frames[this.frameIndex]);
      if (!this.playing || !displayed) return;

      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
      this.playTimer = window.setTimeout(() => this.playCurrentFrame(), this.frameDelayMs);
    } catch (error) {
      this.stop();
      this.onError(error);
    }
  }

  setVisible(visible) {
    this.visible = Boolean(visible);
    if (!visible) {
      this.stop();
      this.weatherLayerPool.forEach(({ layer }) => layer.setOpacity?.(0));
      return;
    }

    if (this.map) {
      this.weatherLayer?.setOpacity?.(this.overlayOpacity);
      window.setTimeout(() => this.map.invalidateSize(false), 0);
    }
  }

  destroy() {
    this.stop();
    this.capabilitiesController?.abort();
    this.sourceToken += 1;
    this.displayToken += 1;
    this.scrubber?.removeEventListener('input', this.handleScrubberInput);
    if (this.requireCtrlForWheelZoom) {
      this.container?.removeEventListener('wheel', this.handleCtrlWheel, true);
    }
    this.map?.off('zoom zoomend resize', this.updateZoomIndicator);
    this.weatherLayerPool.forEach(({ layer }) => {
      layer.setOpacity?.(0);
      if (this.map?.hasLayer?.(layer)) this.map.removeLayer?.(layer);
    });
    if (this.map && this.ownsMap) this.map.remove();
    this.weatherLayerPool.clear();
    this.zoomIndicator = null;
    this.map = null;
  }
}
