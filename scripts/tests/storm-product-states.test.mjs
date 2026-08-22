import test from 'node:test';
import assert from 'node:assert/strict';

import {
  graphicFileName,
  isGraphicAvailable,
} from '../../active/js/storm-graphics.js';

test('graphics manifest exposes only explicitly available products', () => {
  const manifest = {
    products: {
      'WPCQPF.gif': { state: 'available' },
      'peak_surge.png': { state: 'not-issued' },
      'WPCERO.gif': { state: 'stale' },
    },
  };

  assert.equal(graphicFileName('./storms/CP022026/WPCQPF.gif'), 'WPCQPF.gif');
  assert.equal(isGraphicAvailable(manifest, './storms/CP022026/WPCQPF.gif'), true);
  assert.equal(isGraphicAvailable(manifest, './storms/CP022026/peak_surge.png'), false);
  assert.equal(isGraphicAvailable(manifest, './storms/CP022026/WPCERO.gif'), false);
  assert.equal(isGraphicAvailable(manifest, './storms/CP022026/INTQPF.gif'), false);
});

test('archives without a graphics manifest retain their existing fallback behavior', () => {
  assert.equal(isGraphicAvailable(null, './storms/AL052025/peak_surge.png'), true);
});
