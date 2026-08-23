import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TROPICAL_BASIN_VIEWS,
  TropicalMapEngine,
} from '../../js/modules/tropicalMapEngine.js';

function createHarness() {
  const pendingTimeouts = [];
  const viewportCalls = [];
  const container = {
    clientHeight: 0,
    clientWidth: 0,
    setAttribute() {},
  };
  const engine = new TropicalMapEngine({
    container,
    documentRef: null,
    leaflet: null,
    resizeObserverClass: null,
    showLegend: false,
    windowRef: {
      addEventListener() {},
      removeEventListener() {},
      setTimeout(callback) {
        pendingTimeouts.push(callback);
        return pendingTimeouts.length;
      },
    },
  });
  engine.map = {
    invalidateCalls: 0,
    invalidateSize() {
      this.invalidateCalls += 1;
    },
    setMaxBounds(bounds) {
      viewportCalls.push({ method: 'setMaxBounds', bounds });
    },
    setView(center, zoom) {
      viewportCalls.push({ method: 'setView', center, zoom });
    },
  };
  return { container, engine, pendingTimeouts, viewportCalls };
}

test('a hidden cross-basin move waits for a visible map size before restoring the preset', () => {
  const { container, engine, pendingTimeouts, viewportCalls } = createHarness();

  engine.setBasin('epac');

  assert.equal(engine.getSnapshot().activeBasin, 'epac');
  assert.deepEqual(viewportCalls, []);

  container.clientWidth = 900;
  container.clientHeight = 500;
  engine.setVisible(true);
  assert.equal(pendingTimeouts.length, 1);
  pendingTimeouts.shift()();

  assert.equal(engine.map.invalidateCalls, 1);
  assert.deepEqual(viewportCalls, [
    { method: 'setMaxBounds', bounds: null },
    {
      method: 'setView',
      center: TROPICAL_BASIN_VIEWS.epac.center,
      zoom: TROPICAL_BASIN_VIEWS.epac.zoom,
    },
    { method: 'setMaxBounds', bounds: TROPICAL_BASIN_VIEWS.epac.maxBounds },
  ]);

  engine.setVisible(true);
  pendingTimeouts.shift()();
  assert.equal(engine.map.invalidateCalls, 2);
  assert.equal(viewportCalls.filter(({ method }) => method === 'setView').length, 1);
});
