import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { leafletContract, phase8Contract } from '../css-ownership-contract.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readProjectFile = relative => readFileSync(path.join(projectRoot, ...relative.split('/')), 'utf8');
const cleanReference = reference => reference.split(/[?#]/, 1)[0];

function topLevelLayerNames(css) {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const names = [];
  let index = 0;
  while (index < source.length) {
    while (/\s/.test(source[index] || '')) index += 1;
    if (index >= source.length) break;
    const header = source.slice(index).match(/^@layer\s+([a-z][a-z0-9-]*)\s*\{/i);
    assert.ok(header, `unlayered CSS starts at ${source.slice(index, index + 40)}`);
    names.push(header[1]);
    index += header[0].length;
    let depth = 1;
    let quote = '';
    while (index < source.length && depth > 0) {
      const character = source[index];
      if (quote) {
        if (character === '\\') index += 1;
        else if (character === quote) quote = '';
      } else if (character === '"' || character === "'") quote = character;
      else if (character === '{') depth += 1;
      else if (character === '}') depth -= 1;
      index += 1;
    }
    assert.equal(depth, 0, 'layer block must be balanced');
  }
  return names;
}

test('Phase 8 declares one stable layer order and imports untouched Leaflet into vendor', () => {
  assert.equal(phase8Contract.version, '20260831');
  assert.equal(
    readProjectFile(phase8Contract.orderStylesheet).trim(),
    `@layer ${phase8Contract.layerOrder.join(', ')};`,
  );
  assert.equal(readProjectFile(phase8Contract.vendorStylesheet).trim(), phase8Contract.vendorImport);
  assert.match(phase8Contract.vendorImport, /leaflet\.css"\) layer\(vendor\);$/);
});

test('Phase 8 contains every application stylesheet in its documented layer', () => {
  for (const [stylesheet, expectedLayers] of Object.entries(phase8Contract.stylesheetLayers)) {
    assert.deepEqual(topLevelLayerNames(readProjectFile(stylesheet)), [...expectedLayers], stylesheet);
  }
});

test('Phase 8 consumers load the order first and map pages use the vendor wrapper', () => {
  for (const page of phase8Contract.htmlConsumers) {
    const html = readProjectFile(page);
    const hrefs = [...html.matchAll(/<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi)]
      .map(match => match[1]);
    const first = path.posix.normalize(path.posix.join(path.posix.dirname(page), cleanReference(hrefs[0])));
    assert.equal(first, phase8Contract.orderStylesheet, page);
    assert.match(hrefs[0], new RegExp(`\\?v=${phase8Contract.version}$`), page);
    assert.doesNotMatch(html, /href=["'][^"']*vendor\/leaflet\/1\.9\.4\/leaflet\.css/i, page);
  }

  for (const consumer of leafletContract.consumers) {
    const html = readProjectFile(consumer.file);
    assert.match(html, new RegExp(`${consumer.css.replaceAll('.', '\\.')}\\?v=${phase8Contract.version}`));
  }
});

test('Phase 8 keeps !important only in the documented exception allowlist', () => {
  for (const [stylesheet, allowed] of Object.entries(phase8Contract.importantAllowlist)) {
    const actual = readProjectFile(stylesheet)
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.includes('!important'))
      .sort();
    assert.deepEqual(actual, [...allowed].sort(), stylesheet);
  }
});

test('pre-Phase 9 responsive fixes survive the layered Font Awesome cascade', () => {
  const components = readProjectFile('css/components.css');
  const tropical = readProjectFile('css/tropical.css');

  assert.match(
    components,
    /@container \(max-width: 680px\)[\s\S]*\.tabset__tab i,[\s\S]*display: none !important;/,
  );
  assert.match(
    tropical,
    /\.tropical-current-systems \.county-alert-chip \{[\s\S]*display: flex;[\s\S]*min-height: 54px;[\s\S]*border-radius: 9px;[\s\S]*color: #fff;/,
  );
});
