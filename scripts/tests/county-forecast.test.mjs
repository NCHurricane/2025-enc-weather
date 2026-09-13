import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { forecastPeriodMarkup, renderCountyForecast } from '../../counties/js/countyForecast.js';
import { isCurrentCountyOutlook, renderCountyOutlook } from '../../counties/js/countyAlerts.js';

const counties = ['beaufort', 'bertie', 'dare', 'hyde', 'martin', 'pitt', 'san-diego', 'tyrrell', 'washington'];
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const periods = [
  { name: 'Period A', temperature: 70, isDaytime: true, shortForecast: 'Fixture summary A', detailedForecast: 'Fixture detail A' },
  { name: 'Period B', temperature: null, isDaytime: false, shortForecast: 'Fixture summary B', detailedForecast: 'Fixture detail B' },
];

test('all nine live pages have independent forecast cards with the approved tabs and outlook mount', () => {
  for (const county of counties) {
    const html = read(`counties/${county}/index.html`);
    assert.deepEqual([...html.matchAll(/data-weather-tab="([^"]+)"/g)].map(match => match[1]), ['temp', 'radar', 'satellite'], county);
    assert.deepEqual([...html.matchAll(/data-forecast-tab="([^"]+)"/g)].map(match => match[1]), ['seven-day', 'meteogram', 'discussion', 'outlook'], county);
    assert.match(html, /<\/section>\s*<\/div>\s*<section id="county-forecast"/, county);
    assert.match(html, /data-forecast-tab="outlook"\s+tabindex="-1" data-short-label="Haz Wx" aria-label="Hazardous Weather Outlook"\s+hidden>Hazardous Weather<\/button>/, county);
    assert.match(html, /<section id="forecast-panel-outlook"[^>]*role="tabpanel"[^>]*aria-labelledby="forecast-tab-outlook"[^>]*hidden>\s*<div class="county-forecast__outlook" data-county-outlook>/, county);
    assert.doesNotMatch(html, /county-forecast__header[\s\S]*data-county-outlook[\s\S]*<\/header>/, county);
    assert.match(html, /data-forecast-tab="seven-day" data-short-label="7-Day" aria-label="7-Day">7-Day<\/button>/, county);
    assert.doesNotMatch(html, /weather-tab-forecast|weather-panel-forecast|forecast-tab-detailed|forecast-panel-detailed|detailed-forecast|detailed-toggle|Current alerts and Hazardous/, county);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${county}: duplicate IDs`);
  }
  assert.match(read('counties/bertie/index_test.html'), /id="weather-panel-forecast"/);
  assert.match(read('counties/bertie/index_test.html'), /id="detailed-forecast"/);
  assert.doesNotMatch(read('index.html'), /data-county-forecast|countyForecast\.js/);
});

test('inline outlooks require fresh, nonempty content and an unexpired valid-until time when supplied', () => {
  const now = Date.parse('2026-09-12T12:00:00Z');
  const outlook = { status: 'ok', text: 'Fixture outlook', validUntil: '2026-09-12T13:00:00Z' };
  assert.equal(isCurrentCountyOutlook(outlook, now), true);
  assert.equal(isCurrentCountyOutlook({ ...outlook, validUntil: null }, now), true);
  for (const status of ['stale', 'unavailable', 'not-applicable', undefined]) {
    assert.equal(isCurrentCountyOutlook({ ...outlook, status }, now), false);
  }
  for (const validUntil of ['2026-09-12T11:00:00Z', '2026-09-12T12:00:00Z', 'invalid']) {
    assert.equal(isCurrentCountyOutlook({ ...outlook, validUntil }, now), false);
  }
  assert.equal(isCurrentCountyOutlook({ ...outlook, text: '  ' }, now), false);
  assert.equal(isCurrentCountyOutlook(null, now), false);
});

test('inline outlook content preserves metadata and safe source links, clears stale content, and creates no dialog', () => {
  const container = { innerHTML: 'previous zone', replaceChildren() { this.innerHTML = ''; } };
  const sourceUrl = 'https://api.weather.gov/products/12345678-1234-1234-1234-123456789abc';
  const outlook = { status: 'ok', text: '<Fixture & outlook>', issued: 'issued time', office: 'AKQ', zone: 'NCZ030', areaDesc: 'Fixture area', sourceUrl };
  const options = { container, outlook, inline: true, formatTime: value => value };
  assert.equal(renderCountyOutlook(options), true);
  for (const value of ['Issued', 'issued time', 'NWS office', 'AKQ', 'Forecast zone', 'NCZ030', 'Applicable area', 'Fixture area', sourceUrl, '&lt;Fixture &amp; outlook&gt;']) {
    assert.ok(container.innerHTML.includes(value), value);
  }
  assert.doesNotMatch(container.innerHTML, /<dialog|<button|aria-haspopup|<Fixture/);
  assert.equal(renderCountyOutlook({ ...options, outlook: { ...outlook, sourceUrl: 'https://example.test/product' } }), true);
  assert.doesNotMatch(container.innerHTML, /href=/);
  for (const status of ['stale', 'unavailable', 'not-applicable']) {
    container.innerHTML = 'previous zone';
    assert.equal(renderCountyOutlook({ ...options, outlook: { ...outlook, status } }), false);
    assert.equal(container.innerHTML, '');
  }
});

test('each period keeps its own detail, default-closed disclosure, and missing temperature fallback', () => {
  const html = forecastPeriodMarkup(periods);
  assert.equal((html.match(/<details\b/g) || []).length, 2);
  assert.doesNotMatch(html, /<details[^>]*\bopen/);
  assert.match(html, /Details<span[^>]*> for Period A<\/span>[\s\S]*Fixture detail A/);
  assert.match(html, /Details<span[^>]*> for Period B<\/span>[\s\S]*Fixture detail B/);
  assert.match(html, /70°/);
  assert.match(html, /<span class="value">N\/A<\/span>/);
});

test('period text and icon attributes are escaped; unsafe icons and missing details fail safely', () => {
  const html = forecastPeriodMarkup([{ name: '<script>', shortForecast: 'A & B', icon: 'javascript:alert(1)' }]);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /<p>A &amp; B<\/p>/);
  assert.doesNotMatch(html, /javascript:|<script>|<img/);
  assert.match(forecastPeriodMarkup([{}]), /No forecast details available\./);
});

test('one fetched list supplies both the new card and retained legacy panels', async () => {
  for (const legacy of [false, true]) {
    let requests = 0;
    const container = { innerHTML: '' };
    const detailedContainer = legacy ? { innerHTML: '' } : null;
    await renderCountyForecast({ container, detailedContainer, getForecast: async () => { requests++; return { periods }; } });
    assert.equal(requests, 1);
    assert.match(legacy ? detailedContainer.innerHTML : container.innerHTML, /Fixture detail A/);
    if (legacy) assert.doesNotMatch(container.innerHTML, /<details/);
  }
});

test('superseded forecast responses cannot overwrite the current zone', async () => {
  let finishOld;
  let current = true;
  const container = { innerHTML: '' };
  const old = renderCountyForecast({ container, isCurrent: () => current, getForecast: () => new Promise(resolve => { finishOld = resolve; }) });
  current = false;
  await renderCountyForecast({ container, getForecast: async () => ({ periods: [periods[1]] }) });
  finishOld({ periods: [periods[0]] });
  await old;
  assert.match(container.innerHTML, /Fixture detail B/);
  assert.doesNotMatch(container.innerHTML, /Fixture detail A/);
});

test('empty, malformed and failed forecasts show unavailable without retaining earlier cards', async t => {
  t.mock.method(console, 'warn', () => {});
  for (const getForecast of [async () => ({ periods: [] }), async () => ({}), async () => { throw new Error('fixture failure'); }]) {
    const container = { innerHTML: 'old zone' };
    await renderCountyForecast({ container, getForecast });
    assert.equal(container.innerHTML, '<p role="status">Forecast temporarily unavailable.</p>');
  }
});

test('single and multi-zone alert loaders distinguish failures from a valid empty list', async t => {
  const config = JSON.parse(read('counties/dare/data/config.json'));
  t.mock.method(console, 'error', () => {});
  t.mock.method(console, 'log', () => {});
  const originalWindow = globalThis.window;
  const originalStorage = globalThis.localStorage;
  globalThis.window = { location: { href: 'https://example.test/counties/dare/?zone=mainland', search: '?zone=mainland' }, history: { replaceState() {} } };
  globalThis.localStorage = { getItem: () => 'mainland', setItem() {} };
  t.after(() => { globalThis.window = originalWindow; globalThis.localStorage = originalStorage; });
  let response;
  const requests = [];
  t.mock.method(globalThis, 'fetch', async url => {
    requests.push(String(url));
    if (String(url).includes('config.json')) return { ok: true, json: async () => config };
    if (response instanceof Error) throw response;
    return response;
  });
  const loaders = await Promise.all([
    import('../../counties/js/countyData.js'), import('../../counties/js/countyData.multizone.js'),
  ]);
  for (const loader of loaders) {
    for (const failure of [new Error('offline'), { ok: false, status: 503 }, { ok: true, json: async () => { throw new Error('bad JSON'); } }, { ok: true, json: async () => ({}) }, { ok: true, json: async () => ({ alerts: [null] }) }]) {
      response = failure;
      let result;
      try { result = await loader.getAlerts(); } catch { result = { status: 'unavailable' }; }
      assert.notEqual(result.status, 'ok');
    }
    const outlook = { status: 'stale', text: 'Fixture outlook' };
    response = { ok: true, json: async () => ({ alerts: [], outlook }) };
    assert.deepEqual(await loader.getAlerts(), { status: 'ok', list: [], outlook });
  }
  assert.ok(requests.some(url => url.startsWith('./data/mainland/alerts.json')));
  assert.ok(requests.every(url => !url.includes('/coastal/')));
});
