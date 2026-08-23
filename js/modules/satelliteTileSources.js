const NASA_GIBS_WMS_URL = 'https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi';
const NASA_GIBS_WMTS_URL = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
const REALEARTH_API_URL = 'https://realearth.ssec.wisc.edu/api/times';
const REALEARTH_TILE_URL = 'https://realearth.ssec.wisc.edu/tiles';

const PLATFORM_CONFIG = Object.freeze({
  East: Object.freeze({ satelliteNumber: '19', realEarthPrefix: 'G19' }),
  West: Object.freeze({ satelliteNumber: '18', realEarthPrefix: 'G18' }),
});

const REALEARTH_PRODUCT_SUFFIX = Object.freeze({
  GEOCOLOR: 'ABI-FD-geo-color',
  '02': 'ABI-FD-BAND02',
  '07': 'ABI-FD-BAND07',
  '08': 'ABI-FD-BAND08',
  '13': 'ABI-FD-BAND14',
  CLEAN_IR: 'ABI-FD-BAND13-GRAD',
});

function platformConfig(platform) {
  return PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.East;
}

function compactUtcTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid satellite frame time: ${value}`);
  const iso = date.toISOString();
  return {
    date: iso.slice(0, 10).replaceAll('-', ''),
    time: iso.slice(11, 19).replaceAll(':', ''),
  };
}

export function realEarthProductId(platform, productKey) {
  const suffix = REALEARTH_PRODUCT_SUFFIX[productKey];
  if (!suffix) throw new Error(`Unsupported RealEarth satellite product: ${productKey}`);
  return `${platformConfig(platform).realEarthPrefix}-${suffix}`;
}

export function createRealEarthSatelliteSource({
  platform,
  productKey,
  productLabel,
  context = {},
}) {
  const config = platformConfig(platform);
  const productId = realEarthProductId(platform, productKey);
  return {
    ...context,
    id: `realearth:${productId}`,
    type: 'xyz',
    timeSource: 'realearth',
    timesUrl: REALEARTH_API_URL,
    productId,
    tileUrl: (frameTime) => {
      const { date, time } = compactUtcTime(frameTime);
      return `${REALEARTH_TILE_URL}/${productId}/${date}/${time}/{z}/{x}/{y}.png`;
    },
    label: `RealEarth GOES-${config.satelliteNumber} ${productLabel}`,
    attribution: 'SSEC RealEarth',
    maxNativeZoom: 7,
    tileTimeoutMs: 12000,
  };
}

export function createGibsWmtsSatelliteSource({
  platform,
  gibsLayer,
  matrixSet,
  productKey,
  productLabel,
  context = {},
}) {
  const canonicalPlatform = platform === 'West' ? 'West' : 'East';
  const layer = `GOES-${canonicalPlatform}_${gibsLayer}`;
  const maxNativeZoom = Number.parseInt(String(matrixSet).match(/Level(\d+)$/)?.[1] || '', 10);
  return {
    ...context,
    id: `gibs-wmts:${layer}`,
    type: 'xyz',
    timeSource: 'wms',
    timesWmsUrl: NASA_GIBS_WMS_URL,
    layer,
    tileUrl: (frameTime) => (
      `${NASA_GIBS_WMTS_URL}/${layer}/default/${encodeURIComponent(frameTime)}/${matrixSet}/{z}/{y}/{x}.png`
    ),
    label: `GOES-${canonicalPlatform} ${productLabel}`,
    attribution: 'NASA EOSDIS GIBS/Worldview',
    maxNativeZoom: Number.isInteger(maxNativeZoom) ? maxNativeZoom : undefined,
    tileTimeoutMs: 12000,
    fallbackSources: [
      createRealEarthSatelliteSource({
        platform,
        productKey,
        productLabel,
        context,
      }),
    ],
  };
}

export function withRealEarthFallback(source, {
  platform,
  productKey,
  productLabel,
  context = {},
}) {
  return {
    ...context,
    ...source,
    fallbackSources: [
      createRealEarthSatelliteSource({
        platform,
        productKey,
        productLabel,
        context,
      }),
    ],
  };
}
