import test from 'node:test';
import assert from 'node:assert/strict';
import { NavigationModule } from '../../js/modules/navigation.js';

function navigationHarness(t, { menuOpen = false, submenuOpen = false } = {}) {
  let focused = 'drawer-trigger';
  const listeners = new Map();
  const element = (name, open) => {
    const classes = new Set(open ? ['is-open'] : []);
    const attributes = new Map([['aria-expanded', String(Boolean(open))]]);
    return {
      classList: { contains: value => classes.has(value), remove: value => classes.delete(value) },
      setAttribute: (key, value) => attributes.set(key, value),
      getAttribute: key => attributes.get(key),
      addEventListener() {},
      focus: () => { focused = name; },
    };
  };
  const hamburger = element('menu', menuOpen);
  const toggle = element('submenu', submenuOpen);
  const submenu = element('submenu-item', submenuOpen);
  submenu.querySelector = () => toggle;
  const nav = element('navigation', menuOpen);
  nav.querySelector = () => submenu.classList.contains('is-open') ? toggle : null;
  const originals = { document: globalThis.document, window: globalThis.window };
  globalThis.document = {
    getElementById: () => hamburger,
    querySelector: () => nav,
    querySelectorAll: selector => selector === '[data-submenu]' ? [submenu] : [],
    addEventListener: (name, handler) => listeners.set(name, handler),
  };
  globalThis.window = { addEventListener() {}, innerWidth: 390 };
  t.after(() => {
    for (const key of ['document', 'window']) {
      if (originals[key] === undefined) delete globalThis[key];
      else globalThis[key] = originals[key];
    }
  });
  NavigationModule.bindEvents();
  return {
    nav, hamburger, submenu, toggle,
    focus: () => focused,
    keydown(options = {}) {
      const event = {
        key: 'Escape', defaultPrevented: false,
        preventDefault() { this.defaultPrevented = true; },
        ...options,
      };
      listeners.get('keydown')(event);
      return event;
    },
  };
}

test('Escape outside closed navigation preserves the drawer return target', t => {
  const ui = navigationHarness(t);
  assert.equal(ui.keydown().defaultPrevented, false);
  assert.equal(ui.focus(), 'drawer-trigger');
});

test('navigation leaves an already handled Escape to its owning control', t => {
  const ui = navigationHarness(t, { menuOpen: true });
  ui.keydown({ defaultPrevented: true });
  assert.equal(ui.nav.classList.contains('is-open'), true);
  assert.equal(ui.focus(), 'drawer-trigger');
});

test('Escape closes an open mobile menu and its submenus and returns to Menu', t => {
  const ui = navigationHarness(t, { menuOpen: true, submenuOpen: true });
  assert.equal(ui.keydown().defaultPrevented, true);
  assert.equal(ui.nav.classList.contains('is-open'), false);
  assert.equal(ui.submenu.classList.contains('is-open'), false);
  assert.equal(ui.hamburger.getAttribute('aria-expanded'), 'false');
  assert.equal(ui.toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(ui.focus(), 'menu');
});

test('Escape returns desktop submenu focus to its visible opener', t => {
  const ui = navigationHarness(t, { submenuOpen: true });
  assert.equal(ui.keydown().defaultPrevented, true);
  assert.equal(ui.submenu.classList.contains('is-open'), false);
  assert.equal(ui.focus(), 'submenu');
});

test('other keys leave open navigation unchanged', t => {
  const ui = navigationHarness(t, { menuOpen: true });
  assert.equal(ui.keydown({ key: 'Tab' }).defaultPrevented, false);
  assert.equal(ui.nav.classList.contains('is-open'), true);
  assert.equal(ui.focus(), 'drawer-trigger');
});
