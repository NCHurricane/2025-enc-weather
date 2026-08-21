import {
  InteractiveWeatherMap,
  formatWeatherTime,
} from '../../js/modules/interactiveWeatherMap.js?v=20260816-5';
import {
  COUNTY_ZONE_CHANGE_EVENT,
  loadWeatherPageContext,
} from './countyContext.js?v=20260816-home1';
import { WEATHER_BOUNDARY_OVERLAYS } from './weatherBoundaries.js?v=20260816-1';
import { installWeatherCityLabels } from './weatherCityLabels.js?v=20260820-3';

const NOWCOAST_RADAR_URL = 'https://nowcoast.noaa.gov/geoserver/weather_radar/wms';
const NOWCOAST_SATELLITE_URL = 'https://nowcoast.noaa.gov/geoserver/satellite/wms';
const NASA_GIBS_URL = 'https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi';
const NCEP_CONUS_PRECIP_TYPE_URL =
  'https://opengeo.ncep.noaa.gov/geoserver/conus/conus_pcpn_typ/ows';
const NOWCOAST_RADAR_LEGEND_URL =
  'https://nowcoast.noaa.gov/geoserver/observations/weather_radar/ows';
const MOBILE_MAP_QUERY = window.matchMedia('(max-width: 600px)');
const TABLET_PORTRAIT_MAP_QUERY = window.matchMedia(
  '(min-width: 601px) and (max-width: 1024px) and (orientation: portrait)',
);

function initialWeatherMapZoom() {
  const root = document.querySelector('[data-county-weather-center]');
  const configuredZoom = MOBILE_MAP_QUERY.matches
    ? root?.dataset.mapZoomMobile
    : root?.dataset.mapZoomDesktop;
  const parsedZoom = Number(configuredZoom);
  if (Number.isFinite(parsedZoom) && configuredZoom !== '') return parsedZoom;
  if (MOBILE_MAP_QUERY.matches) return 7;
  return TABLET_PORTRAIT_MAP_QUERY.matches ? 10 : 9;
}

function contextAreaLabel(context) {
  return context?.regionLabel || `${context?.countyName || 'the county'} County`;
}

function buildWmsLegendUrl(wmsUrl, layer, { width, height } = {}) {
  const url = new URL(wmsUrl);
  url.search = '';
  url.searchParams.set('service', 'WMS');
  url.searchParams.set('version', '1.3.0');
  url.searchParams.set('request', 'GetLegendGraphic');
  url.searchParams.set('format', 'image/png');
  url.searchParams.set('layer', layer);
  if (width) url.searchParams.set('width', String(width));
  if (height) url.searchParams.set('height', String(height));
  return url.toString();
}

function pageMapConfig() {
  const root = document.querySelector('[data-county-weather-center]') || document.body;
  return {
    satelliteName: root.dataset.satelliteName || 'GOES19',
    satelliteSector: root.dataset.satelliteSector || 'eus',
    satelliteRegion: root.dataset.satelliteRegion || 'Eastern US',
    satellitePlatform: root.dataset.satellitePlatform || 'East',
    cityLabelsUrl: root.dataset.cityLabelsUrl || '',
    regionalPrecipType: root.dataset.radarRegionalPrecipType === 'true',
  };
}

function isRegionalRadarStation(station) {
  return station === 'SOUTHEAST' || station === 'PACSOUTHWEST';
}

const SATELLITE_LAYERS = {
  GEOCOLOR: {
    wmsUrl: NASA_GIBS_URL,
    layer: 'GOES-East_ABI_GeoColor',
    label: 'NASA Worldview GOES-East GeoColor',
    attribution: 'NASA EOSDIS GIBS/Worldview',
    legend: {
      title: 'GeoColor',
    },
  },
  '02': {
    layer: 'goes_visible_imagery',
    label: 'GOES Visible',
    legend: {
      title: 'Visible',
      scale: { min: '0', max: '255', colors: ['#000000', '#ffffff'] },
    },
  },
  '07': {
    layer: 'goes_shortwave_imagery',
    label: 'GOES Shortwave IR',
    legend: {
      title: 'Shortwave IR',
      scale: { min: '0', max: '100', colors: ['#ffffff', '#000000'] },
    },
  },
  '13': {
    layer: 'goes_longwave_imagery',
    label: 'GOES Longwave IR',
    legend: {
      title: 'Longwave IR',
      scale: { min: '0', max: '255', colors: ['#ffffff', '#000000'] },
    },
  },
  CLEAN_IR: {
    wmsUrl: NASA_GIBS_URL,
    layer: 'GOES-East_ABI_Band13_Clean_Infrared',
    label: 'NASA Worldview GOES-East Clean IR',
    attribution: 'NASA EOSDIS GIBS/Worldview',
    fallbackProduct: '13',
    legend: {
      title: 'Clean IR',
      scale: {
        min: '-92°C',
        max: '>57°C',
        colors: [
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
        ],
      },
    },
  },
  '08': {
    layer: 'goes_water_vapor_imagery',
    label: 'GOES Water Vapor',
    legend: {
      title: 'Water Vapor',
      scale: { min: '0', max: '63', colors: ['#ffffff', '#000000'] },
    },
  },
};

function setPlayButton(button, playing, type) {
  const icon = button?.querySelector('i');
  icon?.classList.toggle('fa-play', !playing);
  icon?.classList.toggle('fa-pause', playing);
  button?.setAttribute('aria-pressed', String(playing));
  button?.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${type} animation`);
}

function setBusy(loading, error, busy) {
  if (loading) loading.style.display = busy ? 'flex' : 'none';
  if (busy && error) error.style.display = 'none';
}

function hideError(error) {
  if (error) error.style.display = 'none';
}

function showError(error, message) {
  if (!error) return;
  const detail = error.querySelector('small');
  if (detail && message) detail.textContent = message;
  error.style.display = 'flex';
}

function setWeatherLegend(elements, legend) {
  const { container, title, image, scale, scaleBar, scaleMin, scaleMax, description } = elements;
  if (!container) return;

  if (!legend) {
    container.hidden = true;
    return;
  }

  title.textContent = legend.title || 'Legend';
  description.textContent = legend.description || '';
  description.hidden = !legend.description;

  if (legend.scale && scale && scaleBar && scaleMin && scaleMax) {
    image.hidden = true;
    image.removeAttribute('src');
    image.alt = '';
    scaleBar.style.background = `linear-gradient(to right, ${legend.scale.colors.join(', ')})`;
    scaleMin.textContent = legend.scale.min;
    scaleMax.textContent = legend.scale.max;
    scale.setAttribute(
      'aria-label',
      `${legend.title || 'Product'} color scale from ${legend.scale.min} to ${legend.scale.max}`,
    );
    scale.hidden = false;
  } else if (legend.imageUrl) {
    if (scale) scale.hidden = true;
    image.alt = `${legend.title || 'Product'} color legend`;
    image.onload = () => {
      image.hidden = false;
    };
    image.onerror = () => {
      image.hidden = true;
    };
    image.hidden = false;
    image.src = legend.imageUrl;
  } else {
    if (scale) scale.hidden = true;
    image.hidden = true;
    image.removeAttribute('src');
    image.alt = '';
  }

  container.hidden = false;
}

function preloadImage(image, url, alt) {
  return new Promise((resolve, reject) => {
    const testImage = new Image();
    testImage.onload = () => {
      image.src = url;
      image.alt = alt;
      resolve();
    };
    testImage.onerror = () => reject(new Error(`Fallback image failed to load: ${url}`));
    testImage.src = url;
  });
}

class CountyRadarViewer {
  constructor() {
    this.toggle = document.getElementById('radar-toggle');
    this.stationSelect = document.getElementById('radar-station-select');
    this.productSelect = document.getElementById('radar-product-select');
    this.playButton = document.getElementById('radar-play-pause');
    this.basemapSelect = document.getElementById('radar-basemap-select');
    this.mapElement = document.getElementById('radar-map');
    this.fallback = document.getElementById('radar-fallback');
    this.fallbackImage = document.getElementById('radar-image');
    this.loading = document.getElementById('radar-loading');
    this.error = document.getElementById('radar-error');
    this.timestamp = document.getElementById('radar-timestamp');
    this.scrubber = document.getElementById('radar-frame-scrubber');
    this.scrubberOutput = document.getElementById('radar-frame-indicator');
    this.legendElements = {
      container: document.getElementById('radar-legend'),
      title: document.getElementById('radar-legend-title'),
      image: document.getElementById('radar-legend-image'),
      description: document.getElementById('radar-legend-description'),
    };
    this.note = document.getElementById('radar-map-note');
    this.map = null;
    this.initialized = false;
    this.fallbackMode = false;
    this.fallbackPlaying = false;
    this.lastAttemptAt = 0;
    this.cityLabelOverlay = null;
    this.context = null;
    this.mapConfig = pageMapConfig();
    this.localProducts = [];
    this.handleZoneChange = this.handleZoneChange.bind(this);
  }

  init() {
    if (!this.toggle || !this.stationSelect || !this.productSelect || !this.playButton) return false;

    this.localProducts = Array.from(this.productSelect.options, (option) => ({
      value: option.value,
      label: option.textContent,
    }));
    this.stationSelect.addEventListener('change', () => {
      this.updateProductOptions();
      if (this.toggle.checked) this.loadSource();
    });
    this.productSelect.addEventListener('change', () => {
      if (this.toggle.checked) this.loadSource();
    });
    this.playButton.addEventListener('click', () => this.togglePlayback());
    this.basemapSelect?.addEventListener('change', () => {
      this.map?.setBasemap(this.basemapSelect.value);
    });
    this.toggle.addEventListener('change', () => this.handleVisibility());
    document.addEventListener(COUNTY_ZONE_CHANGE_EVENT, this.handleZoneChange);

    this.updateProductOptions();
    setPlayButton(this.playButton, false, 'radar');
    this.initialized = true;
    if (this.toggle.checked) this.handleVisibility();
    return true;
  }

  ensureMap() {
    if (this.map) return this.map;

    this.map = new InteractiveWeatherMap({
      container: this.mapElement,
      center: this.context.center,
      zoom: initialWeatherMapZoom(),
      requireCtrlForWheelZoom: false,
      maxFrames: 12,
      overlayOpacity: 0.8,
      ariaLabel: `Interactive radar map centered on ${contextAreaLabel(this.context)}`,
      initialBasemap: this.basemapSelect?.value || 'esri',
      showBasemapControl: !this.basemapSelect,
      basemapControlPosition: 'topleft',
      referenceOverlays: WEATHER_BOUNDARY_OVERLAYS,
      scrubber: this.scrubber,
      scrubberOutput: this.scrubberOutput,
      onLoading: (busy) => setBusy(this.loading, this.error, busy),
      onError: (error) => {
        if (error) this.showFallback('Interactive radar is unavailable; showing the standard NWS image.');
      },
      onFrame: ({ time, index, count, source }) => {
        this.timestamp.textContent = `${source.label} · ${formatWeatherTime(time)}${
          count ? ` · Frame ${index + 1} of ${count}` : ''
        }`;
      },
      onPlayStateChange: (playing) => setPlayButton(this.playButton, playing, 'radar'),
    });
    this.cityLabelOverlay = installWeatherCityLabels(
      this.map.ensureMap(),
      this.context.center,
      this.mapConfig.cityLabelsUrl,
      { mapScope: this.context.isRegional ? 'homepage' : 'county' },
    );
    return this.map;
  }

  async ensureContext() {
    if (!this.context) this.context = await loadWeatherPageContext();
    return this.context;
  }

  async handleZoneChange() {
    try {
      this.context = await loadWeatherPageContext();
      this.mapElement.setAttribute(
        'aria-label',
        `Interactive radar map centered on ${contextAreaLabel(this.context)}`,
      );
      if (this.map) {
        this.map.ensureMap().setView(this.context.center, initialWeatherMapZoom(), {
          animate: false,
        });
        if (this.cityLabelOverlay) {
          this.cityLabelOverlay.homeCenter = this.context.center;
          this.cityLabelOverlay.render?.();
        }
      }
    } catch (error) {
      console.error('[county-weather-map] Radar zone refresh failed:', error);
    }
  }

  updateProductOptions() {
    const national = isRegionalRadarStation(this.stationSelect.value);
    const previous = this.productSelect.value;
    const products = national
      ? [
          { value: 'reflectivity', label: 'Reflectivity' },
          ...(this.mapConfig.regionalPrecipType
            ? [{ value: 'precip_type', label: 'Precipitation Type' }]
            : []),
        ]
      : this.localProducts;

    this.productSelect.replaceChildren(
      ...products.map(({ value, label }) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        return option;
      }),
    );
    this.productSelect.value = products.some(({ value }) => value === previous)
      ? previous
      : 'reflectivity';
  }

  sourceConfig() {
    const station = this.stationSelect.value;
    const product = this.productSelect.value;

    if (isRegionalRadarStation(station)) {
      if (product === 'precip_type') {
        const layer = 'conus_pcpn_typ';
        return {
          wmsUrl: NCEP_CONUS_PRECIP_TYPE_URL,
          layer,
          label: 'NOAA CONUS precipitation type',
          attribution: 'NOAA/NWS OpenGeo',
          legend: {
            title: 'Precipitation Type',
            imageUrl: buildWmsLegendUrl(NCEP_CONUS_PRECIP_TYPE_URL, layer, {
              width: 500,
              height: 30,
            }),
            description: 'Classifies radar echoes as rain, snow, hail, or convective and stratiform precipitation.',
          },
        };
      }

      return {
        wmsUrl: NOWCOAST_RADAR_URL,
        layer: 'conus_base_reflectivity_mosaic',
        label: 'NOAA CONUS reflectivity',
        attribution: 'NOAA/NWS nowCOAST',
        legend: {
          title: 'Base Reflectivity',
          imageUrl: buildWmsLegendUrl(
            NOWCOAST_RADAR_LEGEND_URL,
            'conus_base_reflectivity_mosaic',
            { width: 272, height: 21 },
          ),
          description: 'dBZ.',
        },
      };
    }

    const stationKey = station.toLowerCase();
    const productConfig = {
      reflectivity: {
        layerSuffix: 'sr_bref',
        label: 'reflectivity',
        legendTitle: 'Base Reflectivity',
        legendDescription:
          'dBZ',
      },
      velocity: {
        layerSuffix: 'sr_bvel',
        label: 'velocity',
        legendTitle: 'Base Velocity',
        legendDescription:
          'kts',
      },
      storm_total: {
        layerSuffix: 'bdsa',
        label: 'storm-total precipitation',
        legendTitle: 'Storm Total',
        legendDescription:
          'in.',
      },
    }[product];
    const wmsUrl = `https://opengeo.ncep.noaa.gov/geoserver/${stationKey}/ows`;
    const layer = `${stationKey}_${productConfig.layerSuffix}`;
    return {
      wmsUrl,
      layer,
      label: `${station} ${productConfig.label}`,
      attribution: 'NOAA/NWS OpenGeo',
      legend: {
        title: productConfig.legendTitle,
        imageUrl: buildWmsLegendUrl(wmsUrl, layer, { width: 500, height: 30 }),
        description: productConfig.legendDescription,
      },
    };
  }

  async loadSource() {
    await this.ensureContext();
    this.lastAttemptAt = Date.now();
    this.fallbackMode = false;
    this.fallbackPlaying = false;
    this.fallback.hidden = true;
    this.mapElement.hidden = false;
    hideError(this.error);
    this.note.textContent = ' ';
    const source = this.sourceConfig();
    setWeatherLegend(this.legendElements, source.legend);

    try {
      await this.ensureMap().setSource(source);
    } catch (error) {
      console.warn('[county-weather-map] Radar WMS failed:', error);
    }
  }

  fallbackUrl() {
    const station = this.stationSelect.value;
    const product = this.productSelect.value;
    const suffix = this.fallbackPlaying ? 'loop' : '0';
    const baseUrl = 'https://radar.weather.gov/ridge/standard/';

    if (isRegionalRadarStation(station)) return `${baseUrl}${station}_${suffix}.gif`;
    if (product === 'velocity') return `${baseUrl}base_velocity/${station}_${suffix}.gif`;
    return `${baseUrl}${station}_${suffix}.gif`;
  }

  async showFallback(message) {
    this.map?.stop();
    this.map?.setScrubberVisible(false);
    this.fallbackMode = true;
    this.mapElement.hidden = true;
    this.fallback.hidden = false;
    this.note.textContent = message;
    setPlayButton(this.playButton, this.fallbackPlaying, 'radar');
    setBusy(this.loading, this.error, true);

    try {
      const stationLabel = this.stationSelect.options[this.stationSelect.selectedIndex]?.text || '';
      const productLabel = this.productSelect.options[this.productSelect.selectedIndex]?.text || '';
      await preloadImage(
        this.fallbackImage,
        this.fallbackUrl(),
        `${stationLabel} ${productLabel} ${this.fallbackPlaying ? 'animated loop' : 'latest image'}`,
      );
      hideError(this.error);
      this.timestamp.textContent = `Standard NWS image fallback · ${
        this.fallbackPlaying ? 'Animated loop' : 'Latest image'
      }`;
    } catch (error) {
      showError(this.error, 'The interactive service and standard radar image are both unavailable.');
    } finally {
      setBusy(this.loading, this.error, false);
    }
  }

  async togglePlayback() {
    if (this.fallbackMode) {
      this.fallbackPlaying = !this.fallbackPlaying;
      await this.showFallback(this.note.textContent);
      return;
    }

    if (this.map?.playing) {
      this.map.stop();
      try {
        await this.map.showLatest();
      } catch (error) {
        await this.showFallback('Interactive radar is unavailable; showing the standard NWS image.');
      }
      return;
    }

    await this.map?.start();
  }

  handleVisibility() {
    if (!this.toggle.checked) {
      this.map?.setVisible(false);
      this.fallbackPlaying = false;
      if (this.fallbackMode && this.fallbackImage.src.includes('.gif')) {
        this.fallbackImage.src = this.fallbackUrl();
      }
      setPlayButton(this.playButton, false, 'radar');
      return;
    }

    window.setTimeout(() => {
      if (!this.map || Date.now() - this.lastAttemptAt >= 240000) this.loadSource();
      else this.map?.setVisible(true);
    }, 0);
  }

  pause() {
    this.map?.stop();
    this.fallbackPlaying = false;
    if (this.fallbackMode && this.fallbackImage.src.includes('.gif')) {
      this.fallbackImage.src = this.fallbackUrl();
    }
    setPlayButton(this.playButton, false, 'radar');
  }
}

class CountySatelliteViewer {
  constructor() {
    this.toggle = document.getElementById('satellite-toggle');
    this.productSelect = document.getElementById('satellite-product-select');
    this.playButton = document.getElementById('satellite-play-pause');
    this.basemapSelect = document.getElementById('satellite-basemap-select');
    this.mapElement = document.getElementById('satellite-map');
    this.fallback = document.getElementById('satellite-fallback');
    this.fallbackImage = document.getElementById('satellite-image');
    this.loading = document.getElementById('satellite-loading');
    this.error = document.getElementById('satellite-error');
    this.timestamp = document.getElementById('satellite-timestamp');
    this.scrubber = document.getElementById('satellite-frame-scrubber');
    this.scrubberOutput = document.getElementById('satellite-frame-indicator');
    this.legendElements = {
      container: document.getElementById('satellite-legend'),
      title: document.getElementById('satellite-legend-title'),
      image: document.getElementById('satellite-legend-image'),
      scale: document.getElementById('satellite-legend-scale'),
      scaleBar: document.getElementById('satellite-legend-scale-bar'),
      scaleMin: document.getElementById('satellite-legend-scale-min'),
      scaleMax: document.getElementById('satellite-legend-scale-max'),
      description: document.getElementById('satellite-legend-description'),
    };
    this.note = document.getElementById('satellite-map-note');
    this.map = null;
    this.fallbackMode = false;
    this.fallbackPlaying = false;
    this.lastAttemptAt = 0;
    this.cityLabelOverlay = null;
    this.context = null;
    this.mapConfig = pageMapConfig();
    this.handleZoneChange = this.handleZoneChange.bind(this);
  }

  init() {
    if (!this.toggle || !this.productSelect || !this.playButton) return false;

    this.productSelect.addEventListener('change', () => {
      if (this.toggle.checked) this.loadSource();
    });
    this.playButton.addEventListener('click', () => this.togglePlayback());
    this.basemapSelect?.addEventListener('change', () => {
      this.map?.setBasemap(this.basemapSelect.value);
    });
    this.toggle.addEventListener('change', () => this.handleVisibility());
    document.addEventListener(COUNTY_ZONE_CHANGE_EVENT, this.handleZoneChange);
    setPlayButton(this.playButton, false, 'satellite');
    if (this.toggle.checked) this.handleVisibility();
    return true;
  }

  ensureMap() {
    if (this.map) return this.map;

    this.map = new InteractiveWeatherMap({
      container: this.mapElement,
      center: this.context.center,
      zoom: initialWeatherMapZoom(),
      requireCtrlForWheelZoom: false,
      maxFrames: 12,
      overlayOpacity: 0.92,
      ariaLabel: `Interactive satellite map centered on ${contextAreaLabel(this.context)}`,
      initialBasemap: this.basemapSelect?.value || 'esri',
      showBasemapControl: !this.basemapSelect,
      basemapControlPosition: 'topleft',
      referenceOverlays: [...WEATHER_BOUNDARY_OVERLAYS],
      scrubber: this.scrubber,
      scrubberOutput: this.scrubberOutput,
      onLoading: (busy) => setBusy(this.loading, this.error, busy),
      onError: (error) => {
        if (error) this.showFallback('Interactive satellite is unavailable; showing NOAA STAR imagery.');
      },
      onFrame: ({ time, index, count, source }) => {
        this.timestamp.textContent = `${source.label} · ${formatWeatherTime(time)}${
          count ? ` · Frame ${index + 1} of ${count}` : ''
        }`;
      },
      onPlayStateChange: (playing) => setPlayButton(this.playButton, playing, 'satellite'),
    });
    this.cityLabelOverlay = installWeatherCityLabels(
      this.map.ensureMap(),
      this.context.center,
      this.mapConfig.cityLabelsUrl,
      { mapScope: this.context.isRegional ? 'homepage' : 'county' },
    );
    return this.map;
  }

  async ensureContext() {
    if (!this.context) this.context = await loadWeatherPageContext();
    return this.context;
  }

  sourceConfig(product) {
    const base = SATELLITE_LAYERS[product];
    if (!base) return null;
    if (this.mapConfig.satellitePlatform !== 'West') return base;

    if (product === 'GEOCOLOR') {
      return {
        ...base,
        layer: 'GOES-West_ABI_GeoColor',
        label: 'NASA Worldview GOES-West GeoColor',
      };
    }
    if (product === 'CLEAN_IR') {
      return {
        ...base,
        layer: 'GOES-West_ABI_Band13_Clean_Infrared',
        label: 'NASA Worldview GOES-West Clean IR',
      };
    }
    return base;
  }

  async handleZoneChange() {
    try {
      this.context = await loadWeatherPageContext();
      this.mapElement.setAttribute(
        'aria-label',
        `Interactive satellite map centered on ${contextAreaLabel(this.context)}`,
      );
      if (this.map) {
        this.map.ensureMap().setView(this.context.center, initialWeatherMapZoom(), {
          animate: false,
        });
        if (this.cityLabelOverlay) {
          this.cityLabelOverlay.homeCenter = this.context.center;
          this.cityLabelOverlay.render?.();
        }
      }
    } catch (error) {
      console.error('[county-weather-map] Satellite zone refresh failed:', error);
    }
  }

  async loadSource() {
    await this.ensureContext();
    this.lastAttemptAt = Date.now();
    const product = this.productSelect.value;
    const source = this.sourceConfig(product);
    this.fallbackPlaying = false;

    this.fallbackMode = false;
    this.fallback.hidden = true;
    this.mapElement.hidden = false;
    hideError(this.error);
    this.note.textContent =
      source.note || ' ';
    setWeatherLegend(this.legendElements, source.legend);

    try {
      await this.ensureMap().setSource({
        wmsUrl: source.wmsUrl || NOWCOAST_SATELLITE_URL,
        layer: source.layer,
        label: source.label,
        attribution: source.attribution || 'NOAA/NESDIS nowCOAST',
      });
    } catch (error) {
      console.warn('[county-weather-map] Satellite WMS failed:', error);
    }
  }

  fallbackUrl() {
    const product = this.productSelect.value;
    const fallbackProduct = this.sourceConfig(product)?.fallbackProduct || product;
    const { satelliteName, satelliteSector } = this.mapConfig;
    const baseUrl = `https://cdn.star.nesdis.noaa.gov/${satelliteName}/ABI/SECTOR/${satelliteSector}/${fallbackProduct}/`;
    return this.fallbackPlaying
      ? `${baseUrl}${satelliteName}-${satelliteSector.toUpperCase()}-${fallbackProduct}-1000x1000.gif`
      : `${baseUrl}2000x2000.jpg`;
  }

  async showFallback(message) {
    this.map?.stop();
    this.map?.setScrubberVisible(false);
    this.fallbackMode = true;
    this.mapElement.hidden = true;
    this.fallback.hidden = false;
    this.note.textContent = message;
    setPlayButton(this.playButton, this.fallbackPlaying, 'satellite');
    setBusy(this.loading, this.error, true);

    try {
      const productLabel = this.productSelect.options[this.productSelect.selectedIndex]?.text || '';
      await preloadImage(
        this.fallbackImage,
        this.fallbackUrl(),
        `${this.mapConfig.satelliteName} ${productLabel} ${this.fallbackPlaying ? 'animated loop' : 'latest image'} - ${this.mapConfig.satelliteRegion}`,
      );
      hideError(this.error);
      this.timestamp.textContent = `NOAA STAR image · ${
        this.fallbackPlaying ? 'Animated loop' : 'Latest image'
      }`;
    } catch (error) {
      showError(this.error, 'The interactive service and NOAA STAR image are both unavailable.');
    } finally {
      setBusy(this.loading, this.error, false);
    }
  }

  async togglePlayback() {
    if (this.fallbackMode) {
      this.fallbackPlaying = !this.fallbackPlaying;
      await this.showFallback(this.note.textContent);
      return;
    }

    if (this.map?.playing) {
      this.map.stop();
      try {
        await this.map.showLatest();
      } catch (error) {
        await this.showFallback('Interactive satellite is unavailable; showing NOAA STAR imagery.');
      }
      return;
    }

    await this.map?.start();
  }

  handleVisibility() {
    if (!this.toggle.checked) {
      this.map?.setVisible(false);
      this.fallbackPlaying = false;
      if (this.fallbackMode && this.fallbackImage.src.includes('.gif')) {
        this.fallbackImage.src = this.fallbackUrl();
      }
      setPlayButton(this.playButton, false, 'satellite');
      return;
    }

    window.setTimeout(() => {
      const hasInteractiveProduct = Boolean(SATELLITE_LAYERS[this.productSelect.value]);
      if (hasInteractiveProduct && (!this.map || Date.now() - this.lastAttemptAt >= 240000)) {
        this.loadSource();
      }
      else this.map?.setVisible(true);
    }, 0);
  }

  pause() {
    this.map?.stop();
    this.fallbackPlaying = false;
    if (this.fallbackMode && this.fallbackImage.src.includes('.gif')) {
      this.fallbackImage.src = this.fallbackUrl();
    }
    setPlayButton(this.playButton, false, 'satellite');
  }
}

function initCountyWeatherMaps() {
  const radar = new CountyRadarViewer();
  const satellite = new CountySatelliteViewer();
  radar.init();
  satellite.init();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      radar.pause();
      satellite.pause();
      return;
    }

    if (radar.toggle?.checked) radar.handleVisibility();
    if (satellite.toggle?.checked) satellite.handleVisibility();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCountyWeatherMaps, { once: true });
} else {
  initCountyWeatherMaps();
}
