import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateTropicalStormManifest } from '../../js/modules/tropicalMapEngine.js';

const fixtureRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'active-phase5',
);

function readJson(...parts) {
  return JSON.parse(fs.readFileSync(path.join(fixtureRoot, ...parts), 'utf8'));
}

function stormFile(stormId, ...parts) {
  return path.join(fixtureRoot, 'storms', stormId, ...parts);
}

function assertCollectionIdentity(stormId, file) {
  const collection = readJson('storms', stormId, 'map', file);
  assert.equal(collection.type, 'FeatureCollection');
  assert.ok(collection.features.length > 0, `${stormId}/${file} must contain features`);
  for (const feature of collection.features) {
    assert.equal(feature?.properties?.stormId, stormId);
  }
  return collection;
}

test('fixture feed contains exact AL, EP, and CP identities and routes', () => {
  const feed = readJson('active-storms.json');
  assert.deepEqual(
    feed.activeStorms.map((storm) => String(storm.id).toUpperCase()),
    ['AL052025', 'EP152025', 'CP012026'],
  );
  assert.deepEqual(
    feed.activeStorms.map((storm) => storm.binNumber),
    ['AT5', 'EP5', 'CP2'],
  );
});

test('Atlantic fixture exposes authentic issued wind and surge subsets', () => {
  const stormId = 'AL052025';
  const manifest = validateTropicalStormManifest(
    readJson('storms', stormId, 'map', 'manifest.json'),
    stormId,
  );
  assert.equal(manifest.state, 'partial');
  assert.equal(manifest.products.watchesWarnings.state, 'fresh');
  assert.equal(manifest.products.surgeWarnings.state, 'fresh');
  assert.equal(manifest.products.forecastTrack.state, 'unavailable');

  const watches = assertCollectionIdentity(stormId, 'watches-warnings.geojson');
  const surge = assertCollectionIdentity(stormId, 'surge-warnings.geojson');
  assert.ok(watches.features.some((feature) => /watch|warning/i.test(feature.properties.warningType)));
  assert.ok(surge.features.some((feature) => /storm surge/i.test(feature.properties.warningType)));

  const tcv = readJson('storms', stormId, 'tcv.json');
  assert.equal(tcv.meta.fixtureSubset, true);
  assert.deepEqual(
    new Set(tcv.features.features.map((feature) => feature.properties.hazard)),
    new Set(['wind', 'surge']),
  );
  assert.equal(tcv.display.wind[0].key, 'TR.W');
  assert.equal(tcv.display.surge[0].key, 'SS.W');
});

test('Eastern Pacific fixture truthfully separates not-issued and unavailable states', () => {
  const stormId = 'EP152025';
  const advisory = readJson('storms', stormId, 'advisory.json');
  assert.equal(String(advisory.atcfID).toUpperCase(), stormId);
  assert.match(advisory.message, /no coastal watches or warnings in effect/i);

  const manifest = validateTropicalStormManifest(
    readJson('storms', stormId, 'map', 'manifest.json'),
    stormId,
  );
  assert.equal(manifest.state, 'partial');
  assert.equal(manifest.products.watchesWarnings.state, 'not-issued');
  assert.equal(manifest.products.surgeWarnings.state, 'not-issued');
  assert.deepEqual(
    ['forecastTrack', 'cone', 'bestTrack', 'windRadii'].map((key) => manifest.products[key].state),
    ['unavailable', 'unavailable', 'unavailable', 'unavailable'],
  );
  assertCollectionIdentity(stormId, 'current-position.geojson');
});

test('Central Pacific fixture retains track, cone, past track, and all radii thresholds', () => {
  const stormId = 'CP012026';
  const manifest = validateTropicalStormManifest(
    readJson('storms', stormId, 'map', 'manifest.json'),
    stormId,
  );
  assert.equal(manifest.state, 'fresh');
  assert.equal(manifest.products.watchesWarnings.state, 'not-issued');
  assert.equal(manifest.products.surgeWarnings.state, 'not-issued');

  for (const file of [
    'current-position.geojson',
    'forecast-track.geojson',
    'cone.geojson',
    'best-track.geojson',
    'wind-radii.geojson',
  ]) {
    assertCollectionIdentity(stormId, file);
  }
  const radii = readJson('storms', stormId, 'map', 'wind-radii.geojson');
  assert.deepEqual(
    radii.features.map((feature) => Number(feature.properties.windThresholdKnots)).sort((a, b) => a - b),
    [34, 50, 64],
  );
});

test('available fixture text products name real files and exact storm content', () => {
  for (const stormId of ['EP152025', 'CP012026']) {
    const manifest = readJson('storms', stormId, 'text-products-manifest.json');
    assert.equal(manifest.kind, 'storm-text-products');
    assert.equal(manifest.stormId, stormId);
    for (const [code, product] of Object.entries(manifest.products)) {
      if (product.state !== 'available') continue;
      assert.equal(fs.existsSync(stormFile(stormId, product.file)), true, `${stormId} ${code} file missing`);
      const payload = readJson('storms', stormId, product.file);
      assert.match(payload.text_content, new RegExp(stormId, 'i'));
    }
  }
});

test('negative fixtures are real cross-storm resources that fail exact identity checks', () => {
  const octaveAdvisory = readJson('storms', 'EP152025', 'advisory.json');
  assert.notEqual(String(octaveAdvisory.atcfID).toUpperCase(), 'AL052025');

  const octaveManifest = readJson('storms', 'EP152025', 'map', 'manifest.json');
  assert.throws(
    () => validateTropicalStormManifest(octaveManifest, 'AL052025'),
    /identity mismatch/i,
  );
});

test('shared tropical vectors use SVG so lower warning panes remain pointer-accessible', () => {
  const engineSource = fs.readFileSync(
    path.join(fixtureRoot, '..', '..', '..', '..', 'js', 'modules', 'tropicalMapEngine.js'),
    'utf8',
  );
  assert.match(engineSource, /preferCanvas:\s*false/);
  assert.doesNotMatch(engineSource, /preferCanvas:\s*true/);
});
