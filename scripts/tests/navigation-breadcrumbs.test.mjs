import test from 'node:test';
import assert from 'node:assert/strict';

import { breadcrumbItemsForPath } from '../../js/modules/navigation.js';

test('the homepage has no breadcrumb trail', () => {
  assert.deepEqual(breadcrumbItemsForPath('/index.html'), []);
});

test('county pages retain a stable hierarchy across zone query state', () => {
  assert.deepEqual(breadcrumbItemsForPath('/counties/dare/'), [
    { text: 'Home', href: 'index.html' },
    { text: 'Counties' },
    { text: 'Dare County' },
  ]);
});

test('the Bertie prototype resolves to the same county hierarchy', () => {
  assert.deepEqual(breadcrumbItemsForPath('/counties/bertie/index_test.html'), [
    { text: 'Home', href: 'index.html' },
    { text: 'Counties' },
    { text: 'Bertie County' },
  ]);
});

test('Active links back through the canonical Tropical overview', () => {
  assert.deepEqual(breadcrumbItemsForPath('/active/index.html'), [
    { text: 'Home', href: 'index.html' },
    { text: 'Tropical', href: 'tropical.html?basin=atl' },
    { text: 'Active Storms' },
  ]);
});

test('top-level information and Tropical pages identify the current page', () => {
  assert.deepEqual(breadcrumbItemsForPath('/tropical.html'), [
    { text: 'Home', href: 'index.html' },
    { text: 'Tropical' },
  ]);
  assert.deepEqual(breadcrumbItemsForPath('/accessibility.html'), [
    { text: 'Home', href: 'index.html' },
    { text: 'Accessibility' },
  ]);
});

test('unknown routes fail closed without an invented hierarchy', () => {
  assert.deepEqual(breadcrumbItemsForPath('/counties/unknown/'), []);
  assert.deepEqual(breadcrumbItemsForPath('/unmapped-page.html'), []);
});
