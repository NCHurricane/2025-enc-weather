import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  init,
  getCurrentConditions,
  getCurrentZone,
  resolveInitialCountyZone,
} from '../../counties/js/countyData.multizone.js';
import { configUsesMultipleZones } from '../../counties/js/countyData.loader.js';

const readJson = relative => JSON.parse(
  readFileSync(new URL(`../../${relative}`, import.meta.url), 'utf8'),
);

const bertie = readJson('counties/bertie/data/config.json');
const dare = readJson('counties/dare/data/config.json');
const hyde = readJson('counties/hyde/data/config.json');
const sanDiego = readJson('counties/san-diego/data/config.json');

test('county topology contract distinguishes single-zone and all multi-zone configs', () => {
  assert.equal(configUsesMultipleZones(bertie), false);
  assert.equal(configUsesMultipleZones(dare), true);
  assert.equal(configUsesMultipleZones(hyde), true);
  assert.equal(configUsesMultipleZones(sanDiego), true);
});

test('initial zone resolution preserves valid NC and San Diego state', () => {
  assert.deepEqual(
    resolveInitialCountyZone(bertie, { storedZone: 'coastal' }),
    { currentZone: null, invalidUrlZone: false, invalidStoredZone: false },
  );
  assert.deepEqual(
    resolveInitialCountyZone(hyde, { storedZone: 'ocracoke' }),
    { currentZone: 'ocracoke', invalidUrlZone: false, invalidStoredZone: false },
  );
  assert.deepEqual(
    resolveInitialCountyZone(sanDiego, { storedZone: 'coastal' }),
    { currentZone: 'coastal', invalidUrlZone: false, invalidStoredZone: false },
  );
  assert.deepEqual(
    resolveInitialCountyZone(dare, { urlZone: 'northern', storedZone: 'mainland' }),
    { currentZone: 'northern', invalidUrlZone: false, invalidStoredZone: false },
  );
});

test('invalid stored or URL zones resolve to the destination county default', () => {
  assert.deepEqual(
    resolveInitialCountyZone(dare, { storedZone: 'coastal' }),
    { currentZone: 'mainland', invalidUrlZone: false, invalidStoredZone: true },
  );
  assert.deepEqual(
    resolveInitialCountyZone(dare, { urlZone: 'coastal', storedZone: 'northern' }),
    { currentZone: 'mainland', invalidUrlZone: true, invalidStoredZone: false },
  );
  assert.deepEqual(
    resolveInitialCountyZone(sanDiego, { storedZone: 'ocracoke' }),
    { currentZone: 'coastal', invalidUrlZone: false, invalidStoredZone: true },
  );
});

test('Dare normalizes San Diego storage before requesting zone product data', async t => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;
  const requests = [];
  let storedZone = 'coastal';

  globalThis.window = {
    location: {
      href: 'https://example.test/counties/dare/',
      search: '',
    },
    history: {
      replaceState() {
        throw new Error('storage-only normalization must not rewrite the URL');
      },
    },
  };
  globalThis.localStorage = {
    getItem(key) {
      return key === 'selectedZone' ? storedZone : null;
    },
    setItem(key, value) {
      if (key === 'selectedZone') storedZone = value;
    },
  };
  globalThis.fetch = async input => {
    const url = String(input);
    requests.push(url);
    if (url.startsWith('./data/config.json')) {
      return {
        ok: true,
        json: async () => structuredClone(dare),
      };
    }
    if (url.startsWith('./data/mainland/current.json')) {
      return {
        ok: true,
        json: async () => ({ stations: {} }),
      };
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  t.after(() => {
    if (originalFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalLocalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalLocalStorage;
  });

  await init();
  assert.equal(getCurrentZone()?.id, 'mainland');
  assert.equal(storedZone, 'mainland');

  await getCurrentConditions();
  assert.ok(requests.some(url => url.startsWith('./data/mainland/current.json')));
  assert.ok(requests.every(url => !url.includes('/coastal/')));
});

test('multi-zone entrypoints carry the zone-normalization cache key', () => {
  for (const county of ['dare', 'hyde', 'san-diego']) {
    const html = readFileSync(new URL(`../../counties/${county}/index.html`, import.meta.url), 'utf8');
    const wrapper = readFileSync(new URL(`../../counties/${county}/js/countyApp.js`, import.meta.url), 'utf8');
    assert.match(html, /countyApp\.js\?v=20260824-phase4-1&amp;zone=20260826-zone-normalization-1/);
    assert.match(wrapper, /countyData\.multizone\.js\?v=20260826-zone-normalization-1/);
    assert.match(wrapper, /meteogram\.js\?v=20260826-zone-normalization-1/);
  }

  const sharedMeteogram = readFileSync(new URL('../../counties/js/meteogram.js', import.meta.url), 'utf8');
  const loader = readFileSync(new URL('../../counties/js/countyData.loader.js', import.meta.url), 'utf8');
  const sanDiegoMeteogram = readFileSync(new URL('../../counties/san-diego/js/meteogram.js', import.meta.url), 'utf8');
  assert.match(sharedMeteogram, /countyData\.loader\.js\?v=20260826-zone-normalization-1/);
  assert.match(loader, /countyData\.multizone\.js\?v=20260826-zone-normalization-1/);
  assert.match(sanDiegoMeteogram, /countyData\.multizone\.js\?v=20260826-zone-normalization-1/);
});
