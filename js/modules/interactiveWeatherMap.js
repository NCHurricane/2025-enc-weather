const DEFAULT_BASEMAP_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const DEFAULT_BASEMAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const WEATHER_BASEMAPS = Object.freeze({
  light: {
    label: 'Light',
    url: DEFAULT_BASEMAP_URL,
    attribution: DEFAULT_BASEMAP_ATTRIBUTION,
    maxZoom: 19,
  },
  dark: {
    label: 'Dark + Labels',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
    subdomains: 'abcd',
  },
  stamen: {
    label: 'Stamen Terrain',
    url: 'https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  },
  esri: {
    label: 'Esri World Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, DigitalGlobe, Earthstar Geographics',
    maxZoom: 18,
  },
});

function resolveElement(value) {
  return typeof value === 'string' ? document.getElementById(value) : value;
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

    this.map = null;
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
    this.lastCtrlWheelAt = Number.NEGATIVE_INFINITY;
    this.handleCtrlWheel = this.handleCtrlWheel.bind(this);
    this.handleBasemapChange = this.handleBasemapChange.bind(this);
    this.handleScrubberInput = this.handleScrubberInput.bind(this);
    this.scrubber?.addEventListener('input', this.handleScrubberInput);
    this.syncScrubber(false);
  }

  ensureMap() {
    if (this.map) return this.map;
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

    this.map.createPane('weatherBasemapPane').style.zIndex = '200';
    this.map.createPane('weatherDataPane').style.zIndex = '300';
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

  addReferenceOverlay(reference) {
    const { type = 'tile', url, ...referenceOptions } = reference;
    const options = {
      ...referenceOptions,
      pane: 'weatherReferencePane',
    };
    const layer =
      type === 'wms' ? window.L.tileLayer.wms(url, options) : window.L.tileLayer(url, options);
    return layer.addTo(this.map);
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

    const controlLayers = {};
    for (const [basemapId, layer] of this.basemapLayers) {
      controlLayers[this.basemaps[basemapId]?.label || basemapId] = layer;
    }

    this.basemapLayerControl = window.L.control.layers(controlLayers, null, {
      collapsed: true,
      position: this.basemapControlPosition,
    }).addTo(this.map);
    this.basemapLayerControl
      .getContainer()
      ?.querySelector('.leaflet-control-layers-toggle')
      ?.setAttribute('aria-label', 'Choose a base map');
    this.map.on('baselayerchange', this.handleBasemapChange);
  }

  handleBasemapChange(event) {
    for (const [basemapId, layer] of this.basemapLayers) {
      if (layer !== event.layer) continue;
      this.activeBasemapId = basemapId;
      this.basemapLayer = layer;
      break;
    }
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
      pane: 'weatherDataPane',
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
            layer.setOpacity(this.overlayOpacity);
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
    if (!visible) {
      this.stop();
      return;
    }

    if (this.map) {
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
    if (this.map) this.map.remove();
    this.weatherLayerPool.clear();
    this.map = null;
  }
}
