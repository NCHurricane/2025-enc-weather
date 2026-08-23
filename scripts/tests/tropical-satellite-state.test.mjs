import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TropicalSatelliteMap,
  tropicalSatelliteSource,
} from '../../js/modules/tropicalSatelliteMap.js';
import { fetchRealEarthTimes } from '../../js/modules/interactiveWeatherMap.js';
import { realEarthProductId } from '../../js/modules/satelliteTileSources.js';

function fakeController() {
  const elements = new Map([
    ['tropical-satellite-product', {
      value: 'CLEAN_IR',
      options: [{ text: 'Clean IR' }],
      selectedIndex: 0,
    }],
    ['tropical-satellite-map', {
      clientWidth: 900,
      hidden: false,
      setAttribute() {},
    }],
    ['tropical-satellite-fallback', { hidden: true }],
    ['tropical-satellite-image', {}],
    ['tropical-satellite-error', { hidden: true }],
    ['tropical-satellite-timestamp', { textContent: '' }],
  ]);
  const documentRef = {
    getElementById: (id) => elements.get(id) || null,
  };
  const windowRef = {
    matchMedia: () => ({ matches: false }),
    setTimeout(callback) {
      callback();
      return 1;
    },
  };
  return {
    controller: new TropicalSatelliteMap({ documentRef, windowRef }),
    elements,
  };
}

function fakeWeatherMap() {
  const visibleCalls = [];
  const leafletMap = {
    setMaxBounds() {},
    setView() {},
  };
  return {
    visibleCalls,
    ensureMap: () => leafletMap,
    setSource: async () => true,
    setVisible: (visible) => visibleCalls.push(visible),
  };
}

test('satellite sources retain explicit basin and operational platform identity', () => {
  assert.deepEqual(
    [
      tropicalSatelliteSource('atl', 'CLEAN_IR').basin,
      tropicalSatelliteSource('atl', 'CLEAN_IR').satelliteName,
      tropicalSatelliteSource('atl', 'CLEAN_IR').layer,
    ],
    ['atl', 'GOES19', 'GOES-East_ABI_Band13_Clean_Infrared'],
  );
  for (const basin of ['epac', 'cpac']) {
    const source = tropicalSatelliteSource(basin, 'GEOCOLOR');
    assert.equal(source.basin, basin);
    assert.equal(source.satelliteName, 'GOES18');
    assert.equal(source.layer, 'GOES-West_ABI_GeoColor');
  }
});

test('GIBS products use WMTS tiles and retain a platform-matched RealEarth fallback', () => {
  const cleanIr = tropicalSatelliteSource('atl', 'CLEAN_IR');
  assert.equal(cleanIr.type, 'xyz');
  assert.equal(cleanIr.timeSource, 'wms');
  assert.equal(cleanIr.maxNativeZoom, 6);
  assert.match(
    cleanIr.tileUrl('2026-08-22T23:50:00Z'),
    /\/wmts\/epsg3857\/best\/GOES-East_ABI_Band13_Clean_Infrared\/default\/2026-08-22T23%3A50%3A00Z\/GoogleMapsCompatible_Level6\/\{z}\/{y}\/\{x}\.png$/,
  );
  assert.equal(cleanIr.fallbackSources.length, 1);
  assert.equal(cleanIr.fallbackSources[0].productId, 'G19-ABI-FD-BAND13-GRAD');

  const westGeoColor = tropicalSatelliteSource('epac', 'GEOCOLOR');
  assert.equal(westGeoColor.maxNativeZoom, 7);
  assert.equal(westGeoColor.fallbackSources[0].productId, 'G18-ABI-FD-geo-color');
});

test('nowCOAST satellite products retain exact RealEarth product fallbacks', () => {
  const expected = {
    '02': 'G18-ABI-FD-BAND02',
    '07': 'G18-ABI-FD-BAND07',
    '08': 'G18-ABI-FD-BAND08',
  };
  for (const [productKey, productId] of Object.entries(expected)) {
    const source = tropicalSatelliteSource('cpac', productKey);
    assert.match(source.wmsUrl, /nowcoast\.noaa\.gov/);
    assert.equal(source.fallbackSources[0].productId, productId);
  }
  assert.equal(realEarthProductId('East', '13'), 'G19-ABI-FD-BAND14');
});

test('RealEarth time discovery normalizes and sorts exact frame timestamps', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(new URL(url).searchParams.get('products'), 'G19-ABI-FD-BAND13-GRAD');
    return new Response(JSON.stringify({
      'G19-ABI-FD-BAND13-GRAD': [
        '20260822.235021',
        'invalid',
        '20260822.234021',
        '20260822.235021',
      ],
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    assert.deepEqual(
      await fetchRealEarthTimes('G19-ABI-FD-BAND13-GRAD'),
      ['2026-08-22T23:40:21Z', '2026-08-22T23:50:21Z'],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('a basin change hides the old platform and starts one replacement load', () => {
  const { controller, elements } = fakeController();
  const map = fakeWeatherMap();
  let loadCalls = 0;
  controller.map = map;
  controller.active = true;
  controller.loadedBasin = 'atl';
  controller.fallbackMode = true;
  controller.loadSource = async () => {
    loadCalls += 1;
    return true;
  };

  controller.setContext('epac', null);

  assert.equal(controller.basin, 'epac');
  assert.equal(controller.fallbackMode, false);
  assert.deepEqual(map.visibleCalls, [false]);
  assert.equal(loadCalls, 1);
  assert.equal(elements.get('tropical-satellite-fallback').hidden, true);
  assert.equal(elements.get('tropical-satellite-map').hidden, false);
  assert.equal(elements.get('tropical-satellite-timestamp').textContent, 'Loading GOES18 imagery…');

  controller.setContext('epac', null);
  assert.deepEqual(map.visibleCalls, [false]);
  assert.equal(loadCalls, 1);
});

test('activation cannot reuse imagery loaded for another basin', () => {
  const { controller } = fakeController();
  const map = fakeWeatherMap();
  let loadCalls = 0;
  controller.map = map;
  controller.basin = 'cpac';
  controller.loadedBasin = 'atl';
  controller.lastLoadAt = Date.now();
  controller.loadSource = async () => {
    loadCalls += 1;
    return true;
  };

  controller.activate();

  assert.equal(loadCalls, 1);
  assert.deepEqual(map.visibleCalls, []);
});

test('a successful source load records and reveals only the requested basin', async () => {
  const { controller } = fakeController();
  const map = fakeWeatherMap();
  let requestedSource = null;
  map.setSource = async (source) => {
    requestedSource = source;
    return true;
  };
  controller.map = map;
  controller.active = true;
  controller.basin = 'epac';
  controller.ensureMap = () => map;

  assert.equal(await controller.loadSource(), true);
  assert.equal(requestedSource.basin, 'epac');
  assert.equal(requestedSource.satelliteName, 'GOES18');
  assert.equal(controller.loadedBasin, 'epac');
  assert.deepEqual(map.visibleCalls, [true]);
});
