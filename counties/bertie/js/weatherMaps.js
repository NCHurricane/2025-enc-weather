import {
  InteractiveWeatherMap,
  formatWeatherTime,
} from '../../../js/modules/interactiveWeatherMap.js?v=20260814-21';

const BERTIE_CENTER = [36.0187, -76.9461];
const NOWCOAST_RADAR_URL = 'https://nowcoast.noaa.gov/geoserver/weather_radar/wms';
const NOWCOAST_SATELLITE_URL = 'https://nowcoast.noaa.gov/geoserver/satellite/wms';
const NASA_GIBS_URL = 'https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi';
const NCEP_CONUS_PRECIP_TYPE_URL =
  'https://opengeo.ncep.noaa.gov/geoserver/conus/conus_pcpn_typ/ows';
const NOWCOAST_RADAR_LEGEND_URL =
  'https://nowcoast.noaa.gov/geoserver/observations/weather_radar/ows';
const NWS_REFERENCE_WMS_URL =
  'https://mapservices.weather.noaa.gov/static/services/nws_reference_maps/nws_reference_map/MapServer/WMSServer';
const BOUNDARY_RENDER_SCALE = window.L?.Browser?.retina ? 2 : 1;

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
  sld_body: buildBoundarySld('9', 0.3, 0.50),
  minZoom: 8,
});
const STATE_BOUNDARY_OVERLAY = Object.freeze({
  ...BOUNDARY_WMS_OPTIONS,
  layers: '8',
  sld_body: buildBoundarySld('8', 0.7, 0.50),
});
const WEATHER_BOUNDARY_OVERLAYS = Object.freeze([
  REGIONAL_COUNTY_BOUNDARY_OVERLAY,
  LOCAL_COUNTY_BOUNDARY_OVERLAY,
  STATE_BOUNDARY_OVERLAY,
]);
// Full detail near the Carolinas/Mid-Atlantic, plus major cities across the
// wider eastern-US views shown by the Radar and Satellite maps.
const WEATHER_CITY_DATA_URL = new URL(
  '../data/satellite-city-labels.json?v=20260814-1',
  import.meta.url,
);
let weatherCityDataPromise = null;

function escapeCityLabelHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function weatherCityMaxRank(zoom) {
  if (zoom >= 10) return Number.POSITIVE_INFINITY;
  if (zoom >= 9) return 30000;
  if (zoom >= 8) return 12000;
  if (zoom >= 7) return 2500;
  return 500;
}

function isBertieHomeLabel(city) {
  return Math.hypot(
    city.latitude - BERTIE_CENTER[0],
    city.longitude - BERTIE_CENTER[1],
  ) <= 0.08;
}

function cityLabelDimensions(city) {
  const major = isBertieHomeLabel(city) || (Number.isFinite(city.rank) && city.rank <= 1000);
  return {
    major,
    width: Math.max(32, Math.min(190, city.city.length * (major ? 8 : 7) + 12)),
    height: major ? 20 : 18,
  };
}

function thinCityLabelsByCollision(cities, leafletMap) {
  const occupiedBoxes = [];
  const accepted = [];

  for (const city of cities) {
    const point = leafletMap.latLngToContainerPoint([city.latitude, city.longitude]);
    const { width, height } = cityLabelDimensions(city);
    const padding = 4;
    const box = {
      left: point.x - width / 2 - padding,
      right: point.x + width / 2 + padding,
      top: point.y - height / 2 - padding,
      bottom: point.y + height / 2 + padding,
    };
    const overlaps = occupiedBoxes.some((occupied) => !(
      box.right < occupied.left
      || box.left > occupied.right
      || box.bottom < occupied.top
      || box.top > occupied.bottom
    ));
    if (overlaps) continue;

    accepted.push(city);
    occupiedBoxes.push(box);
  }

  return accepted;
}

function loadWeatherCityData() {
  if (weatherCityDataPromise) return weatherCityDataPromise;

  weatherCityDataPromise = fetch(WEATHER_CITY_DATA_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`City label data request failed (${response.status})`);
      return response.json();
    })
    .then((payload) => {
      if (!Array.isArray(payload)) throw new Error('City label data is not an array');

      return payload
        .map((city) => ({
          city: String(city.city || '').trim(),
          latitude: Number(city.latitude),
          longitude: Number(city.longitude),
          rank: Number(city.rank),
        }))
        .filter((city) => (
          city.city
          && Number.isFinite(city.latitude)
          && Number.isFinite(city.longitude)
        ))
        .sort((a, b) => (
          (Number.isFinite(a.rank) ? a.rank : Number.MAX_SAFE_INTEGER)
          - (Number.isFinite(b.rank) ? b.rank : Number.MAX_SAFE_INTEGER)
        ));
    });

  return weatherCityDataPromise;
}

function installWeatherCityLabels(leafletMap) {
  if (!leafletMap || !window.L) return null;

  const paneName = 'weatherPlaceLabelPane';
  const pane = leafletMap.getPane(paneName) || leafletMap.createPane(paneName);
  pane.style.zIndex = '475';
  pane.style.pointerEvents = 'none';

  const layer = window.L.layerGroup().addTo(leafletMap);
  const overlay = { data: null, layer, map: leafletMap };
  const render = () => {
    if (!overlay.data?.length) return;

    const bounds = overlay.map.getBounds().pad(0.08);
    const maxRank = weatherCityMaxRank(overlay.map.getZoom());
    const visibleCities = overlay.data.filter((city) => (
      city.latitude >= bounds.getSouth()
      && city.latitude <= bounds.getNorth()
      && city.longitude >= bounds.getWest()
      && city.longitude <= bounds.getEast()
      && (isBertieHomeLabel(city) || !Number.isFinite(city.rank) || city.rank <= maxRank)
    )).sort((a, b) => Number(isBertieHomeLabel(b)) - Number(isBertieHomeLabel(a)));
    const cities = thinCityLabelsByCollision(visibleCities, overlay.map);

    overlay.layer.clearLayers();
    cities.forEach((city) => {
      const { major, width, height } = cityLabelDimensions(city);
      const icon = window.L.divIcon({
        className: `weather-place-label${major ? ' is-major' : ''}`,
        html: `<span>${escapeCityLabelHtml(city.city)}</span>`,
        iconSize: [width, height],
        iconAnchor: [Math.round(width / 2), Math.round(height / 2)],
      });
      window.L.marker([city.latitude, city.longitude], {
        pane: paneName,
        icon,
        interactive: false,
        keyboard: false,
      }).addTo(overlay.layer);
    });
  };

  leafletMap.on('moveend', render);
  loadWeatherCityData()
    .then((data) => {
      overlay.data = data;
      render();
    })
    .catch((error) => {
      console.warn('[bertie-weather-map] City labels failed:', error);
    });

  return overlay;
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

class BertieRadarViewer {
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
  }

  init() {
    if (!this.toggle || !this.stationSelect || !this.productSelect || !this.playButton) return false;

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
      center: BERTIE_CENTER,
      zoom: 7,
      requireCtrlForWheelZoom: false,
      maxFrames: 12,
      overlayOpacity: 0.8,
      ariaLabel: 'Interactive radar map centered on Bertie County',
      initialBasemap: this.basemapSelect?.value || 'light',
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
    this.cityLabelOverlay = installWeatherCityLabels(this.map.ensureMap());
    return this.map;
  }

  updateProductOptions() {
    const national = this.stationSelect.value === 'SOUTHEAST';
    const previous = this.productSelect.value;
    const products = national
      ? [
          { value: 'reflectivity', label: 'Reflectivity' },
          { value: 'precip_type', label: 'Precipitation Type' },
        ]
      : [
          { value: 'reflectivity', label: 'Reflectivity' },
          { value: 'velocity', label: 'Velocity' },
          { value: 'storm_total', label: 'Storm Total' },
        ];

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

    if (station === 'SOUTHEAST') {
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
      console.warn('[bertie-weather-map] Radar WMS failed:', error);
    }
  }

  fallbackUrl() {
    const station = this.stationSelect.value;
    const product = this.productSelect.value;
    const suffix = this.fallbackPlaying ? 'loop' : '0';
    const baseUrl = 'https://radar.weather.gov/ridge/standard/';

    if (station === 'SOUTHEAST') return `${baseUrl}SOUTHEAST_${suffix}.gif`;
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

class BertieSatelliteViewer {
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
    setPlayButton(this.playButton, false, 'satellite');
    if (this.toggle.checked) this.handleVisibility();
    return true;
  }

  ensureMap() {
    if (this.map) return this.map;

    this.map = new InteractiveWeatherMap({
      container: this.mapElement,
      center: BERTIE_CENTER,
      zoom: 7,
      requireCtrlForWheelZoom: false,
      maxFrames: 12,
      overlayOpacity: 0.92,
      ariaLabel: 'Interactive GOES satellite map centered on Bertie County',
      initialBasemap: this.basemapSelect?.value || 'light',
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
    this.cityLabelOverlay = installWeatherCityLabels(this.map.ensureMap());
    return this.map;
  }

  async loadSource() {
    this.lastAttemptAt = Date.now();
    const product = this.productSelect.value;
    const source = SATELLITE_LAYERS[product];
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
      console.warn('[bertie-weather-map] Satellite WMS failed:', error);
    }
  }

  fallbackUrl() {
    const product = this.productSelect.value;
    const fallbackProduct = SATELLITE_LAYERS[product]?.fallbackProduct || product;
    const baseUrl = `https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/eus/${fallbackProduct}/`;
    return this.fallbackPlaying
      ? `${baseUrl}GOES19-EUS-${fallbackProduct}-1000x1000.gif`
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
        `GOES-19 ${productLabel} ${this.fallbackPlaying ? 'animated loop' : 'latest image'}`,
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

function initBertieWeatherMaps() {
  const radar = new BertieRadarViewer();
  const satellite = new BertieSatelliteViewer();
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
  document.addEventListener('DOMContentLoaded', initBertieWeatherMaps, { once: true });
} else {
  initBertieWeatherMaps();
}
