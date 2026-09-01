import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  installCooperativeWheelZoom,
} from '../../js/modules/interactiveWeatherMap.js';

function readProjectFile(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
}

test('cooperative map wheel zoom leaves ordinary page scrolling available', () => {
  const listeners = new Map();
  const container = {
    addEventListener(name, handler) {
      listeners.set(name, handler);
    },
    removeEventListener(name, handler) {
      if (listeners.get(name) === handler) listeners.delete(name);
    },
  };
  const zoomCalls = [];
  const map = {
    getZoom: () => 5,
    mouseEventToContainerPoint: () => ({ x: 20, y: 30 }),
    setZoomAround(point, zoom) {
      zoomCalls.push({ point, zoom });
    },
  };
  const cleanup = installCooperativeWheelZoom({
    container,
    map,
    minZoom: 2,
    maxZoom: 10,
    windowRef: { performance: { now: () => 100 } },
  });
  const handler = listeners.get('wheel');
  assert.equal(typeof handler, 'function');

  let prevented = false;
  let stopped = false;
  handler({
    ctrlKey: false,
    deltaY: -1,
    preventDefault: () => { prevented = true; },
    stopPropagation: () => { stopped = true; },
  });
  assert.equal(prevented, false);
  assert.equal(stopped, false);
  assert.deepEqual(zoomCalls, []);

  handler({
    ctrlKey: true,
    deltaY: -1,
    preventDefault: () => { prevented = true; },
    stopPropagation: () => { stopped = true; },
  });
  assert.equal(prevented, true);
  assert.equal(stopped, true);
  assert.deepEqual(zoomCalls, [{ point: { x: 20, y: 30 }, zoom: 6 }]);

  cleanup();
  assert.equal(listeners.has('wheel'), false);
});

test('Phase 9 CSS keeps mobile vertical gestures and long text on the document scroller', () => {
  const shared = readProjectFile('css/interactive-weather-map.css');
  const county = readProjectFile('counties/css/county.css');
  const tropical = readProjectFile('css/tropical.css');
  const active = readProjectFile('active/css/active.css');

  assert.match(shared, /@media \(pointer: coarse\)[\s\S]*touch-action:\s*pan-y;/);
  assert.match(county, /\.weather-center-forecast-panel \.afd-content\s*\{[\s\S]*height:\s*auto;[\s\S]*overflow-y:\s*visible;/);
  assert.match(tropical, /@media \(max-width: 680px\)[\s\S]*\.tropical-text-content\s*\{[\s\S]*max-height:\s*none;[\s\S]*overflow:\s*visible;/);
  assert.match(active, /@media \(max-width: 680px\)[\s\S]*\.text-content\s*\{[\s\S]*max-height:\s*none;[\s\S]*overflow-y:\s*visible;/);
});

test('Phase 9 height ownership uses bounded shared calculations and family stack variants', () => {
  const globalStyles = readProjectFile('css/styles.css');
  const shared = readProjectFile('css/interactive-weather-map.css');
  const familyStyles = [
    'css/home.css',
    'counties/css/county.css',
    'css/tropical.css',
    'active/css/active.css',
  ].map(readProjectFile);

  assert.match(globalStyles, /--page-shell-min-block-size:\s*auto;/);
  assert.match(globalStyles, /min-height:\s*var\(--page-shell-min-block-size\);/);
  assert.match(shared, /calc\(100svh - var\(--weather-map-stack-offset\)\)/);
  for (const css of familyStyles) assert.match(css, /--weather-map-stack-offset:/);
});
