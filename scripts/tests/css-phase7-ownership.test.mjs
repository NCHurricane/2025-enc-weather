import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { phase7Contract } from '../css-ownership-contract.mjs';

const readProjectFile = relative => readFileSync(
  new URL(`../../${relative}`, import.meta.url),
  'utf8',
);

test('Phase 7 keeps reusable observation presentation in the shared map owner', () => {
  const shared = readProjectFile(phase7Contract.sharedOwner);
  const county = readProjectFile(phase7Contract.countyOwner);

  for (const selector of phase7Contract.movedSelectors) {
    assert.ok(shared.includes(selector), selector);
    assert.equal(county.includes(selector), false, selector);
  }

  const home = readProjectFile(phase7Contract.homeOwner);
  for (const selector of phase7Contract.forbiddenHomeSelectors) {
    assert.equal(home.includes(selector), false, selector);
  }
});

test('Phase 7 removes cross-family County CSS dependencies and versions changed owners', () => {
  assert.equal(phase7Contract.version, '20260824-phase7-1');

  for (const dependency of phase7Contract.forbiddenDependencies) {
    const html = readProjectFile(dependency.file);
    assert.doesNotMatch(html, /counties\/css\/county\.css|\.\.\/counties\/css\/county\.css/);
    assert.match(
      html,
      new RegExp(`interactive-weather-map\\.css\\?v=${phase7Contract.version}`),
    );
  }

  for (const countyPage of phase7Contract.stylesheets['counties/css/county.css']) {
    const html = readProjectFile(countyPage);
    assert.match(html, new RegExp(`county\\.css\\?v=${phase7Contract.version}`));
    assert.match(
      html,
      new RegExp(`interactive-weather-map\\.css\\?v=${phase7Contract.version}`),
    );
  }
});
