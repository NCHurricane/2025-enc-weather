import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  WEATHER_BASEMAP_FALLBACK_URL,
  WEATHER_BASEMAPS,
} from '../../js/modules/interactiveWeatherMap.js';
import { basemapContract } from '../css-ownership-contract.mjs';

const EXTERNAL_BASEMAP_IDS = ['terrain', 'esri', 'dark', 'light'];

test('shared basemaps use four label-free ArcGIS services with an automatic local fallback', () => {
  assert.deepEqual(Object.keys(WEATHER_BASEMAPS), EXTERNAL_BASEMAP_IDS);
  assert.match(WEATHER_BASEMAPS.terrain.url, /World_Terrain_Base\/MapServer\/tile/);
  assert.match(WEATHER_BASEMAPS.esri.url, /World_Imagery\/MapServer\/tile/);
  assert.match(WEATHER_BASEMAPS.dark.url, /Canvas\/World_Dark_Gray_Base\/MapServer\/tile/);
  assert.match(WEATHER_BASEMAPS.light.url, /Canvas\/World_Light_Gray_Base\/MapServer\/tile/);

  for (const basemapId of EXTERNAL_BASEMAP_IDS) {
    const config = WEATHER_BASEMAPS[basemapId];
    assert.match(config.url, /^https:\/\/services\.arcgisonline\.com\//);
    assert.equal(config.errorTileUrl, WEATHER_BASEMAP_FALLBACK_URL);
  }

  const serialized = JSON.stringify(WEATHER_BASEMAPS);
  assert.doesNotMatch(serialized, /cartocdn|carto\.com|basemap\.nationalmap\.gov|USGSImageryOnly/);
  assert.match(WEATHER_BASEMAP_FALLBACK_URL, /\/images\/map-fallback-tile\.svg$/);
});

test('self-hosted fallback tile is neutral and contains no map labels', () => {
  const svg = readFileSync(new URL('../../images/map-fallback-tile.svg', import.meta.url), 'utf8');
  assert.match(svg, /<svg[\s>]/);
  assert.match(svg, /width="256" height="256"/);
  assert.doesNotMatch(svg, /<text[\s>]/i);
});

test('server-side hazard tile cache uses ArcGIS namespaces without reusing USGS tiles', () => {
  const sources = [
    readFileSync(new URL('../../active/api/tiles.php', import.meta.url), 'utf8'),
    readFileSync(new URL('../../active/api/warm_tiles.php', import.meta.url), 'utf8'),
    readFileSync(new URL('../../active/js/ww-maps.js', import.meta.url), 'utf8'),
  ].join('\n');

  assert.doesNotMatch(sources, /basemap\.nationalmap\.gov|USGSImageryOnly|USGSTopo|USGSShadedReliefOnly/);
  assert.match(sources, /services\.arcgisonline\.com/);
  assert.match(sources, /esri-imagery/);
});

test('Active alert maps share Tropical borders and zoom-filtered city labels', () => {
  const source = readFileSync(
    new URL('../../active/js/ww-maps.js', import.meta.url),
    'utf8',
  );

  assert.match(source, /new InteractiveWeatherMap\(\{[\s\S]*referenceOverlays:\s*TROPICAL_REFERENCE_OVERLAYS/);
  assert.match(source, /installTropicalCityLabels\(map,/);
  assert.match(source, /paneName:\s*'activeAlertCityLabelPane',[\s\S]*paneZIndex:\s*306/);
  assert.match(source, /const state = \{ map, mapController, cityLabels,/);
});

test('every basemap consumer uses the dedicated cache version', () => {
  assert.equal(basemapContract.version, '20260831-phase9-1');
  for (const dependency of basemapContract.versionedAssets) {
    const source = readFileSync(new URL(`../../${dependency.file}`, import.meta.url), 'utf8');
    const basename = dependency.target.split('/').at(-1);
    assert.ok(
      source.includes(`${basename}?v=${dependency.version || basemapContract.version}`),
      `${dependency.file} -> ${dependency.target}`,
    );
  }
});
