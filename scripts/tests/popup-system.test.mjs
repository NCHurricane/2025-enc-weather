import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { phase6Contract } from '../css-ownership-contract.mjs';
import {
  buildTropicalPopup,
  tropicalPopupAccessibleLabel,
} from '../../js/modules/tropicalMapEngine.js';

const readProjectFile = relative => readFileSync(
  new URL(`../../${relative}`, import.meta.url),
  'utf8',
);

test('Phase 6 owns one accessible popup shell with BEM family content and no legacy aliases', () => {
  const shared = readProjectFile('css/interactive-weather-map.css');
  assert.match(shared, /\.leaflet-popup\.weather-map-popup\s*\{/);
  assert.match(shared, /\.weather-map-popup \.leaflet-popup-content\s*\{[\s\S]*overflow:\s*auto;/);
  assert.match(shared, /\.leaflet-container \.weather-map-popup \.leaflet-popup-close-button\s*\{[\s\S]*--control-target-min/);
  assert.match(shared, /data-weather-map-popup-trigger[\s\S]*:focus-visible/);

  const familyStyles = [
    'css/home.css',
    'counties/css/county.css',
    'css/tropical-map-engine.css',
    'active/css/active.css',
  ].map(readProjectFile);
  for (const css of familyStyles) {
    assert.doesNotMatch(css, /\.weather-map-popup \.leaflet-popup-(?:content|tip|close-button)/);
  }

  const sources = [
    'js/modules/homeMapOverlays.js',
    'counties/js/weatherCenter.js',
    'js/modules/tropicalMapEngine.js',
    'active/js/ww-maps.js',
    'js/modules/leafletPopupShell.js',
  ].map(readProjectFile);
  const [home, county, tropical, active, shell] = sources;
  assert.match(home, /weather-map-popup__content home-popup/);
  assert.match(home, /data-weather-map-popup-trigger/);
  assert.match(county, /weather-map-popup__content observation-popup/);
  assert.match(county, /data-observation-popup-(?:trigger|close)/);
  assert.match(tropical, /installLeafletPopupTrigger/);
  assert.match(active, /weather-map-popup__content active-alert-popup/);
  assert.match(shell, /map\.on\('popupopen'/);
  assert.match(shell, /map\.closePopup\(popup\)/);
  assert.match(shell, /sourceElement\.focus\(\{ preventScroll: true \}\)/);

  const popup = buildTropicalPopup('outlookPoints', {
    discussionHtml: '5:00 PM EDT<br>Central Atlantic <script>alert(1)</script>',
    sevenDayProbability: 20,
    sevenDayCategory: 'Low',
    sourceUrl: 'https://www.nhc.noaa.gov/xgtwo/gtwo_atl.kmz',
  });
  assert.match(popup, /weather-map-popup__content tropical-map-popup/);
  assert.match(popup, /tropical-map-popup__link/);
  assert.match(popup, /gtwo\.php\?basin=atlc&amp;fdays=7/);
  assert.doesNotMatch(popup, /\.kmz|<script>/i);
  assert.equal(
    tropicalPopupAccessibleLabel('watchesWarnings', { warningType: 'Hurricane Warning' }),
    'Hurricane Warning map details',
  );

  const implementation = [...familyStyles, ...sources].join('\n');
  for (const retiredClass of phase6Contract.retiredClasses) {
    assert.equal(implementation.includes(retiredClass), false, retiredClass);
  }

  assert.equal(phase6Contract.version, '20260824-phase6-1');
  const harness = readProjectFile('test/tropical-map/phase2-harness.html');
  assert.match(harness, /interactive-weather-map\.css\?v=20260824-phase6-1/);
  assert.match(harness, /tropical-map-engine\.css\?v=20260824-phase6-1/);
});
