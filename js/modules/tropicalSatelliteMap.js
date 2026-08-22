import {
  InteractiveWeatherMap,
  WEATHER_BASEMAPS,
  formatWeatherTime,
} from './interactiveWeatherMap.js?v=20260821-basemap-menu-2';
import { installTropicalCityLabels } from './tropicalCityLabels.js?v=20260822-san-diego-cities-3';
import {
  TROPICAL_BASIN_VIEWS,
  TROPICAL_RESPONSIVE_BREAKPOINT,
  tropicalZoomForView,
} from './tropicalMapEngine.js?v=20260822-border-cities-1';
import { TROPICAL_REFERENCE_OVERLAYS } from './tropicalReferenceLayers.js?v=20260822-map-borders-1';

const NOWCOAST_SATELLITE_URL = 'https://nowcoast.noaa.gov/geoserver/satellite/wms';
const NASA_GIBS_URL = 'https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi';

function satelliteBasinView(basin, source) {
  const overviewView = TROPICAL_BASIN_VIEWS[basin];
  return Object.freeze({
    label: `${overviewView.label} basin`,
    center: overviewView.center,
    zoom: tropicalZoomForView(overviewView),
    mobileZoom: tropicalZoomForView(overviewView, true),
    maxBounds: overviewView.maxBounds,
    ...source,
  });
}

export const TROPICAL_SATELLITE_BASIN_VIEWS = Object.freeze({
  atl: satelliteBasinView('atl', {
    platform: 'East',
    satelliteName: 'GOES19',
    sector: 'taw',
    staticSize: '3600x2160',
    loopSize: '900x540',
  }),
  epac: satelliteBasinView('epac', {
    platform: 'West',
    satelliteName: 'GOES18',
    sector: 'tpw',
    staticSize: '3600x2160',
    loopSize: '900x540',
  }),
  cpac: satelliteBasinView('cpac', {
    platform: 'West',
    satelliteName: 'GOES18',
    sector: 'hi',
    staticSize: '2400x2400',
    loopSize: '600x600',
  }),
});

export const TROPICAL_SATELLITE_PRODUCTS = Object.freeze({
  GEOCOLOR: Object.freeze({
    label: 'GeoColor',
    gibsLayer: 'ABI_GeoColor',
    legend: Object.freeze({ title: 'GeoColor' }),
  }),
  '02': Object.freeze({
    label: 'Visible',
    layer: 'goes_visible_imagery',
    legend: Object.freeze({
      title: 'Visible',
      scale: Object.freeze({
        min: '0',
        max: '255',
        colors: Object.freeze(['#000000', '#ffffff']),
      }),
    }),
  }),
  '07': Object.freeze({
    label: 'Shortwave IR',
    layer: 'goes_shortwave_imagery',
    legend: Object.freeze({
      title: 'Shortwave IR',
      scale: Object.freeze({
        min: '0',
        max: '100',
        colors: Object.freeze(['#ffffff', '#000000']),
      }),
    }),
  }),
  CLEAN_IR: Object.freeze({
    label: 'Clean IR',
    gibsLayer: 'ABI_Band13_Clean_Infrared',
    fallbackProduct: '13',
    legend: Object.freeze({
      title: 'Clean IR',
      scale: Object.freeze({
        min: '-92°C',
        max: '>57°C',
        colors: Object.freeze([
          '#ffffff 0%',
          '#7f007f 0.7%',
          '#ff7fcb 8%',
          '#e6e6e6 8.1%',
          '#050505 14.8%',
          '#1a0000 14.9%',
          '#ff0000 21.5%',
          '#ffff00 28.2%',
          '#00ff00 34.9%',
          '#000073 41.6%',
          '#00ffff 49%',
          '#c5c5c5 49.1%',
          '#000000 100%',
        ]),
      }),
    }),
  }),
  '08': Object.freeze({
    label: 'Water Vapor',
    layer: 'goes_water_vapor_imagery',
    legend: Object.freeze({
      title: 'Water Vapor',
      scale: Object.freeze({
        min: '0',
        max: '63',
        colors: Object.freeze(['#ffffff', '#000000']),
      }),
    }),
  }),
});

export function tropicalSatelliteTargets(_packageData, basin) {
  const view = TROPICAL_SATELLITE_BASIN_VIEWS[basin] || TROPICAL_SATELLITE_BASIN_VIEWS.atl;
  return [{
    value: 'basin',
    kind: 'basin',
    stormId: '',
    label: view.label,
    center: [...view.center],
    coordinateSource: 'basin',
    zoom: view.zoom,
    mobileZoom: view.mobileZoom,
    maxBounds: view.maxBounds,
  }];
}

export function tropicalSatelliteSource(basin, productKey) {
  const view = TROPICAL_SATELLITE_BASIN_VIEWS[basin] || TROPICAL_SATELLITE_BASIN_VIEWS.atl;
  const product = TROPICAL_SATELLITE_PRODUCTS[productKey]
    || TROPICAL_SATELLITE_PRODUCTS.GEOCOLOR;
  if (product.gibsLayer) {
    return {
      wmsUrl: NASA_GIBS_URL,
      layer: `GOES-${view.platform}_${product.gibsLayer}`,
      label: `NASA Worldview GOES-${view.platform} ${product.label}`,
      attribution: 'NASA EOSDIS GIBS/Worldview',
      product,
    };
  }
  return {
    wmsUrl: NOWCOAST_SATELLITE_URL,
    layer: product.layer,
    label: `GOES ${product.label}`,
    attribution: 'NOAA/NESDIS nowCOAST',
    product,
  };
}

export function tropicalSatelliteFallbackUrl({ basin, productKey, playing = false }) {
  const view = TROPICAL_SATELLITE_BASIN_VIEWS[basin] || TROPICAL_SATELLITE_BASIN_VIEWS.atl;
  const product = TROPICAL_SATELLITE_PRODUCTS[productKey]
    || TROPICAL_SATELLITE_PRODUCTS.GEOCOLOR;
  const fallbackProduct = product.fallbackProduct || productKey || 'GEOCOLOR';
  const base = `https://cdn.star.nesdis.noaa.gov/${view.satelliteName}/ABI/SECTOR/${view.sector}/${fallbackProduct}/`;
  return playing
    ? `${base}${view.satelliteName}-${view.sector.toUpperCase()}-${fallbackProduct}-${view.loopSize}.gif`
    : `${base}${view.staticSize}.jpg`;
}

function resolveElement(documentRef, value) {
  return typeof value === 'string' ? documentRef?.getElementById?.(value) : value;
}

function preloadImage(windowRef, url) {
  return new Promise((resolve, reject) => {
    const probe = new windowRef.Image();
    probe.onload = () => resolve(true);
    probe.onerror = () => reject(new Error('NOAA STAR satellite image failed to load'));
    probe.src = url;
  });
}

export class TropicalSatelliteMap {
  constructor({ documentRef = globalThis.document, windowRef = globalThis.window } = {}) {
    this.documentRef = documentRef;
    this.windowRef = windowRef;
    this.basin = 'atl';
    this.targets = tropicalSatelliteTargets(null, 'atl');
    this.active = false;
    this.fallbackMode = false;
    this.fallbackPlaying = false;
    this.lastLoadAt = 0;
    this.loadGeneration = 0;
    this.fallbackGeneration = 0;
    this.map = null;
    this.cityLabels = null;

    this.productSelect = resolveElement(documentRef, 'tropical-satellite-product');
    this.playButton = resolveElement(documentRef, 'tropical-satellite-play-pause');
    this.mapElement = resolveElement(documentRef, 'tropical-satellite-map');
    this.fallback = resolveElement(documentRef, 'tropical-satellite-fallback');
    this.fallbackImage = resolveElement(documentRef, 'tropical-satellite-image');
    this.loading = resolveElement(documentRef, 'tropical-satellite-loading');
    this.error = resolveElement(documentRef, 'tropical-satellite-error');
    this.timestamp = resolveElement(documentRef, 'tropical-satellite-timestamp');
    this.scrubber = resolveElement(documentRef, 'tropical-satellite-frame-scrubber');
    this.scrubberOutput = resolveElement(documentRef, 'tropical-satellite-frame-indicator');
    this.legend = resolveElement(documentRef, 'tropical-satellite-legend');
    this.legendTitle = resolveElement(documentRef, 'tropical-satellite-legend-title');
    this.legendImage = resolveElement(documentRef, 'tropical-satellite-legend-image');
    this.legendScale = resolveElement(documentRef, 'tropical-satellite-legend-scale');
    this.legendScaleBar = resolveElement(documentRef, 'tropical-satellite-legend-scale-bar');
    this.legendScaleMin = resolveElement(documentRef, 'tropical-satellite-legend-scale-min');
    this.legendScaleMax = resolveElement(documentRef, 'tropical-satellite-legend-scale-max');
    this.legendDescription = resolveElement(documentRef, 'tropical-satellite-legend-description');
    this.note = resolveElement(documentRef, 'tropical-satellite-note');
    this.sourceLink = resolveElement(documentRef, 'tropical-satellite-link');
  }

  init() {
    if (!this.productSelect || !this.playButton || !this.mapElement) return false;
    this.productSelect.addEventListener('change', () => {
      if (this.active) this.loadSource();
    });
    this.playButton.addEventListener('click', () => this.togglePlayback());
    this.syncPlayButton(false);
    return true;
  }

  setContext(basin, _packageData) {
    const nextBasin = TROPICAL_SATELLITE_BASIN_VIEWS[basin] ? basin : 'atl';
    this.basin = nextBasin;
    this.targets = tropicalSatelliteTargets(null, this.basin);
    this.updateViewport();
    if (this.active) this.loadSource();
  }

  currentTarget() {
    return this.targets[0];
  }

  compactLayout(width = this.mapElement?.clientWidth) {
    const measuredWidth = Number(width);
    if (measuredWidth > 0) return measuredWidth <= TROPICAL_RESPONSIVE_BREAKPOINT;
    return Boolean(
      this.windowRef?.matchMedia?.(`(max-width: ${TROPICAL_RESPONSIVE_BREAKPOINT}px)`).matches,
    );
  }

  ensureMap() {
    if (this.map) return this.map;
    const target = this.currentTarget();
    this.map = new InteractiveWeatherMap({
      container: this.mapElement,
      center: target.center,
      zoom: this.compactLayout() ? target.mobileZoom : target.zoom,
      minZoom: 2,
      maxZoom: 12,
      maxFrames: 12,
      overlayOpacity: 0.92,
      ariaLabel: `Interactive satellite map centered on ${target.label}`,
      basemaps: WEATHER_BASEMAPS,
      initialBasemap: 'esri',
      showBasemapControl: true,
      basemapControlPosition: 'topleft',
      referenceOverlays: TROPICAL_REFERENCE_OVERLAYS,
      requireCtrlForWheelZoom: false,
      scrubber: this.scrubber,
      scrubberOutput: this.scrubberOutput,
      onLoading: (busy) => this.setBusy(busy),
      onError: (error) => {
        if (error) this.showFallback('Interactive satellite is unavailable; showing NOAA STAR imagery.');
      },
      onFrame: ({ time, index, count, source }) => {
        if (this.timestamp) {
          this.timestamp.textContent = `${source.label} · ${formatWeatherTime(time)}${
            count ? ` · Frame ${index + 1} of ${count}` : ''
          }`;
        }
      },
      onPlayStateChange: (playing) => this.syncPlayButton(playing),
    });
    const leafletMap = this.map.ensureMap();
    this.cityLabels = installTropicalCityLabels(leafletMap, {
      leaflet: this.windowRef.L,
      fetchImpl: this.windowRef.fetch,
      paneName: 'tropicalSatelliteCityLabelPane',
      paneZIndex: 475,
    });
    this.updateViewport();
    return this.map;
  }

  updateViewport() {
    const target = this.currentTarget();
    if (!target) return;
    if (this.note) {
      this.note.textContent = `View centered on ${target.label} using the configured basin satellite view.`;
    }
    this.mapElement?.setAttribute?.('aria-label', `Interactive satellite map centered on ${target.label}`);
    if (!this.map) return;
    const leafletMap = this.map.ensureMap();
    leafletMap.setMaxBounds?.(null);
    leafletMap.setView(target.center, this.compactLayout() ? target.mobileZoom : target.zoom, {
      animate: false,
    });
    leafletMap.setMaxBounds?.(target.maxBounds);
  }

  renderLegend(source) {
    if (!this.legend) return;
    const legend = source.product.legend;
    if (!legend) {
      this.legend.hidden = true;
      return;
    }

    if (this.legendTitle) this.legendTitle.textContent = legend.title || 'Legend';
    if (this.legendDescription) {
      this.legendDescription.textContent = legend.description || '';
      this.legendDescription.hidden = !legend.description;
    }

    const scale = legend.scale;
    if (scale && this.legendScale && this.legendScaleBar
      && this.legendScaleMin && this.legendScaleMax) {
      if (this.legendImage) {
        this.legendImage.hidden = true;
        this.legendImage.removeAttribute('src');
        this.legendImage.alt = '';
      }
      this.legendScaleBar.style.background = `linear-gradient(to right, ${scale.colors.join(', ')})`;
      this.legendScaleMin.textContent = scale.min;
      this.legendScaleMax.textContent = scale.max;
      this.legendScale.setAttribute(
        'aria-label',
        `${legend.title || 'Product'} color scale from ${scale.min} to ${scale.max}`,
      );
      this.legendScale.hidden = false;
    } else {
      if (this.legendScale) this.legendScale.hidden = true;
      if (this.legendImage) {
        this.legendImage.hidden = true;
        this.legendImage.removeAttribute('src');
        this.legendImage.alt = '';
      }
    }

    this.legend.hidden = false;
  }

  async loadSource() {
    if (!this.active) return false;
    const generation = ++this.loadGeneration;
    this.fallbackGeneration += 1;
    const source = tropicalSatelliteSource(this.basin, this.productSelect.value);
    this.lastLoadAt = Date.now();
    this.fallbackMode = false;
    this.fallbackPlaying = false;
    this.fallback.hidden = true;
    this.mapElement.hidden = false;
    if (this.error) this.error.hidden = true;
    this.renderLegend(source);
    this.updateSourceLink();
    try {
      await this.ensureMap().setSource(source);
      if (generation !== this.loadGeneration) return false;
      this.updateViewport();
      return true;
    } catch (error) {
      if (generation === this.loadGeneration) {
        console.warn('[tropical-satellite-map] Interactive source failed:', error);
      }
      return false;
    }
  }

  updateSourceLink() {
    if (!this.sourceLink) return;
    const view = TROPICAL_SATELLITE_BASIN_VIEWS[this.basin];
    this.sourceLink.href = `https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G${view.satelliteName.slice(4)}&sector=${view.sector}`;
    this.sourceLink.textContent = `View the ${view.label} sector at NOAA STAR`;
  }

  setBusy(busy) {
    if (this.loading) this.loading.hidden = !busy;
    if (busy && this.error) this.error.hidden = true;
  }

  async showFallback(message) {
    if (!this.active || !this.fallback || !this.fallbackImage) return false;
    this.map?.stop();
    this.map?.setScrubberVisible(false);
    this.fallbackMode = true;
    this.mapElement.hidden = true;
    this.fallback.hidden = false;
    if (this.note) this.note.textContent = message;
    this.syncPlayButton(this.fallbackPlaying);
    this.setBusy(true);
    const target = this.currentTarget();
    const generation = ++this.fallbackGeneration;
    try {
      const url = tropicalSatelliteFallbackUrl({
        basin: this.basin,
        target,
        productKey: this.productSelect.value,
        playing: this.fallbackPlaying,
      });
      await preloadImage(this.windowRef, url);
      if (!this.active || generation !== this.fallbackGeneration) return false;
      this.fallbackImage.src = url;
      this.fallbackImage.alt = `${target.label} ${this.productSelect.options[this.productSelect.selectedIndex]?.text || 'satellite'} ${this.fallbackPlaying ? 'animation' : 'image'}`;
      if (this.timestamp) this.timestamp.textContent = `NOAA STAR image · ${this.fallbackPlaying ? 'Animated loop' : 'Latest image'}`;
      if (this.error) this.error.hidden = true;
      return true;
    } catch (error) {
      if (generation === this.fallbackGeneration && this.error) this.error.hidden = false;
      return false;
    } finally {
      if (generation === this.fallbackGeneration) this.setBusy(false);
    }
  }

  async togglePlayback() {
    if (this.fallbackMode) {
      this.fallbackPlaying = !this.fallbackPlaying;
      await this.showFallback(this.note?.textContent || 'Showing NOAA STAR imagery.');
      return;
    }
    if (this.map?.playing) {
      this.map.stop();
      try {
        await this.map.showLatest();
      } catch {
        await this.showFallback('Interactive satellite is unavailable; showing NOAA STAR imagery.');
      }
      return;
    }
    await this.map?.start();
  }

  syncPlayButton(playing) {
    if (!this.playButton) return;
    const icon = this.playButton.querySelector('i');
    icon?.classList.toggle('fa-play', !playing);
    icon?.classList.toggle('fa-pause', playing);
    this.playButton.setAttribute('aria-pressed', String(playing));
    this.playButton.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} satellite animation`);
  }

  activate() {
    this.active = true;
    this.windowRef.setTimeout(() => {
      if (this.fallbackMode) {
        this.showFallback(this.note?.textContent || 'Showing NOAA STAR imagery.');
      } else if (!this.map || Date.now() - this.lastLoadAt >= 240000) this.loadSource();
      else {
        this.map.setVisible(true);
        this.updateViewport();
      }
    }, 0);
  }

  deactivate() {
    this.active = false;
    this.loadGeneration += 1;
    this.fallbackGeneration += 1;
    this.map?.setVisible(false);
    this.fallbackPlaying = false;
    this.syncPlayButton(false);
  }
}
