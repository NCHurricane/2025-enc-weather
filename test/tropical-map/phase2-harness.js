import { TropicalMapEngine } from '../../js/modules/tropicalMapEngine.js?v=20260819-14';

const buttons = Array.from(document.querySelectorAll('[data-basin]'));
const debug = document.getElementById('harness-debug');
let lastError = null;

const engine = new TropicalMapEngine({
  container: 'tropical-map',
  status: 'tropical-map-status',
  basin: 'atl',
  onStatus: ({ error, snapshot }) => {
    if (error) lastError = { name: error.name, message: error.message };
    debug.textContent = JSON.stringify({ ...snapshot, lastError }, null, 2);
  },
});

function fixtureUrl(basin) {
  return `/test/output/tropical-map-smoke/overview/overview-${basin}.json?v=20260819-6`;
}

function syncButtons(basin) {
  for (const button of buttons) {
    button.setAttribute('aria-pressed', String(button.dataset.basin === basin));
  }
}

async function switchBasin(basin) {
  lastError = null;
  syncButtons(basin);
  try {
    await engine.loadOverview(basin, { url: fixtureUrl(basin) });
  } catch (error) {
    lastError = { name: error.name, message: error.message };
    console.error('[tropical-map-harness] Basin load failed:', error);
  } finally {
    debug.textContent = JSON.stringify({ ...engine.getSnapshot(), lastError }, null, 2);
  }
}

for (const button of buttons) {
  button.addEventListener('click', () => switchBasin(button.dataset.basin));
}

window.tropicalMapHarness = Object.freeze({ engine, switchBasin });
switchBasin('atl');
