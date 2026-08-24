import { WEATHER_BASEMAPS } from './interactiveWeatherMap.js?v=20260824-phase5-1';
import { installTropicalCityLabels } from './tropicalCityLabels.js?v=20260824-phase5-1';
import { TropicalMapEngine } from './tropicalMapEngine.js?v=20260824-phase6-1';
import { TROPICAL_REFERENCE_OVERLAYS } from './tropicalReferenceLayers.js?v=20260822-map-borders-1';
import { TropicalSatelliteMap } from './tropicalSatelliteMap.js?v=20260824-phase6-1';

export const TROPICAL_BASINS = Object.freeze(['atl', 'epac', 'cpac']);

const CLASSIFICATION_LABELS = Object.freeze({
  TD: 'Tropical Depression',
  TS: 'Tropical Storm',
  HU: 'Hurricane',
  MH: 'Major Hurricane',
  SD: 'Subtropical Depression',
  SS: 'Subtropical Storm',
  PTC: 'Potential Tropical Cyclone',
});

export const TROPICAL_SUPPORT = Object.freeze({
  atl: Object.freeze({
    label: 'Atlantic',
    description: 'Official NHC outlook areas and active tropical cyclones across the Atlantic basin.',
    graphics: Object.freeze({
      two: Object.freeze({
        label: '2-Day Outlook',
        image: 'https://www.nhc.noaa.gov/xgtwo/two_atl_2d0.png',
        link: 'https://www.nhc.noaa.gov/gtwo.php?basin=atlc&fdays=2',
      }),
      seven: Object.freeze({
        label: '7-Day Outlook',
        image: 'https://www.nhc.noaa.gov/xgtwo/two_atl_7d0.png',
        link: 'https://www.nhc.noaa.gov/gtwo.php?basin=atlc&fdays=7',
      }),
      surface: Object.freeze({
        label: 'Atlantic Surface Analysis',
        image: 'https://ocean.weather.gov/shtml/A_full_00hrsfc.gif',
        link: 'https://ocean.weather.gov/Atl_tab.php',
      }),
    }),
    textProducts: Object.freeze([
      Object.freeze({ key: 'outlook', label: 'Outlook' }),
      Object.freeze({ key: 'spanish', label: 'Outlook (Español)' }),
      Object.freeze({ key: 'discussion', label: 'Discussion', url: 'active/cache/twdat.json' }),
      Object.freeze({ key: 'summary', label: 'Monthly', url: 'active/cache/twsat.json' }),
    ]),
  }),
  epac: Object.freeze({
    label: 'Eastern Pacific',
    description: 'Official NHC outlook areas and active tropical cyclones across the Eastern Pacific basin.',
    graphics: Object.freeze({
      two: Object.freeze({
        label: '2-Day Outlook',
        image: 'https://www.nhc.noaa.gov/xgtwo/two_pac_2d0.png',
        link: 'https://www.nhc.noaa.gov/gtwo.php?basin=epac&fdays=2',
      }),
      seven: Object.freeze({
        label: '7-Day Outlook',
        image: 'https://www.nhc.noaa.gov/xgtwo/two_pac_7d0.png',
        link: 'https://www.nhc.noaa.gov/gtwo.php?basin=epac&fdays=7',
      }),
      surface: Object.freeze({
        label: 'Pacific Surface Analysis',
        image: 'https://ocean.weather.gov/shtml/P_full_00hrsfc.gif',
        link: 'https://ocean.weather.gov/Pac_tab.php',
      }),
    }),
    textProducts: Object.freeze([
      Object.freeze({ key: 'outlook', label: 'Outlook' }),
      Object.freeze({ key: 'discussion', label: 'Discussion', url: 'active/cache/twdep.json' }),
      Object.freeze({ key: 'summary', label: 'Monthly', url: 'active/cache/twsep.json' }),
    ]),
  }),
  cpac: Object.freeze({
    label: 'Central Pacific',
    description: 'Official outlook areas and active tropical cyclones across the Central Pacific and Hawaiian region.',
    graphics: Object.freeze({
      two: Object.freeze({
        label: '2-Day Outlook',
        image: 'https://www.nhc.noaa.gov/xgtwo/two_cpac_2d0.png',
        link: 'https://www.nhc.noaa.gov/gtwo.php?basin=cpac&fdays=2',
      }),
      seven: Object.freeze({
        label: '7-Day Outlook',
        image: 'https://www.nhc.noaa.gov/xgtwo/two_cpac_7d0.png',
        link: 'https://www.nhc.noaa.gov/gtwo.php?basin=cpac&fdays=7',
      }),
      surface: Object.freeze({
        label: 'Pacific Surface Analysis',
        image: 'https://ocean.weather.gov/shtml/P_full_00hrsfc.gif',
        link: 'https://ocean.weather.gov/Pac_tab.php',
      }),
    }),
    textProducts: Object.freeze([Object.freeze({ key: 'outlook', label: 'Outlook' })]),
  }),
});

export function normalizeTropicalBasin(value) {
  const basin = String(value || '').toLowerCase();
  return TROPICAL_BASINS.includes(basin) ? basin : 'atl';
}

export function basinFromUrl(url) {
  const parsed = new URL(url, 'https://nchurricane.com/tropical.html');
  return normalizeTropicalBasin(parsed.searchParams.get('basin'));
}

export function urlForBasin(url, basin) {
  const parsed = new URL(url, 'https://nchurricane.com/tropical.html');
  parsed.searchParams.set('basin', normalizeTropicalBasin(basin));
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function basinForTabKey(currentBasin, key) {
  const currentIndex = TROPICAL_BASINS.indexOf(normalizeTropicalBasin(currentBasin));
  if (key === 'Home') return TROPICAL_BASINS[0];
  if (key === 'End') return TROPICAL_BASINS.at(-1);
  if (!['ArrowLeft', 'ArrowRight'].includes(key)) return null;
  const direction = key === 'ArrowRight' ? 1 : -1;
  return TROPICAL_BASINS[(currentIndex + direction + TROPICAL_BASINS.length) % TROPICAL_BASINS.length];
}

export function indexForTabKey(currentIndex, itemCount, key) {
  if (!Number.isInteger(currentIndex) || itemCount < 1) return null;
  if (key === 'Home') return 0;
  if (key === 'End') return itemCount - 1;
  if (!['ArrowLeft', 'ArrowRight'].includes(key)) return null;
  const direction = key === 'ArrowRight' ? 1 : -1;
  return (currentIndex + direction + itemCount) % itemCount;
}

export function sourceTextToPlainText(value) {
  return String(value || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\r/g, '')
    .trim();
}

function createElement(documentRef, tagName, className = '', text = '') {
  const element = documentRef.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function stormName(properties) {
  const classification = CLASSIFICATION_LABELS[String(properties.classification || '').toUpperCase()]
    || 'Tropical Cyclone';
  return `${classification} ${properties.name || properties.stormId || ''}`.trim();
}

function stormAlertColor(properties) {
  const classification = String(properties.classification || '').toUpperCase();
  if (classification === 'MH') return '#ff4d67';
  if (classification === 'HU') return '#ff9f1c';
  if (classification === 'TS' || classification === 'SS') return '#41d6c3';
  if (classification === 'TD' || classification === 'SD') return '#6fb8ff';
  if (classification === 'PTC') return '#c08cff';
  return '#f4d35e';
}

function formatPackageTime(value) {
  const date = new Date(value || '');
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

export class TropicalOverviewController {
  constructor({ documentRef = globalThis.document, windowRef = globalThis.window } = {}) {
    this.documentRef = documentRef;
    this.windowRef = windowRef;
    this.activeBasin = 'atl';
    this.activeSection = 'overview';
    this.activePackage = null;
    this.supportingCache = new Map();
    this.overviewCityLabels = null;

    this.tabs = Array.from(documentRef?.querySelectorAll?.('[data-tropical-basin]') || []);
    this.sectionTabs = Array.from(documentRef?.querySelectorAll?.('[data-tropical-section]') || []);
    this.sectionPanels = Array.from(documentRef?.querySelectorAll?.('[data-tropical-panel]') || []);
    this.heading = documentRef?.getElementById?.('basin-heading');
    this.description = documentRef?.getElementById?.('basin-description');
    this.mapHeading = documentRef?.getElementById?.('basin-map-heading');
    this.mapTimestamp = documentRef?.getElementById?.('tropical-map-timestamp');
    this.basinPanel = documentRef?.getElementById?.('tropical-weather-center-content');
    this.activeSystems = documentRef?.getElementById?.('active-systems-summary');
    this.mobileLegend = documentRef?.getElementById?.('tropical-mobile-legend');
    this.graphicImage = documentRef?.getElementById?.('official-graphic-image');
    this.graphicLink = documentRef?.getElementById?.('official-graphic-link');
    this.graphicButtons = Array.from(documentRef?.querySelectorAll?.('[data-graphic-product]') || []);
    this.textTabs = documentRef?.getElementById?.('supporting-text-tabs');
    this.textTitle = documentRef?.getElementById?.('supporting-text-title');
    this.textContent = documentRef?.getElementById?.('supporting-text-content');
    this.textLink = documentRef?.getElementById?.('supporting-text-link');
  }

  init() {
    if (!this.documentRef || !this.windowRef || this.tabs.length === 0) return false;
    this.engine = new TropicalMapEngine({
      container: 'tropical-map',
      basin: basinFromUrl(this.windowRef.location.href),
      leaflet: this.windowRef.L,
      documentRef: this.documentRef,
      windowRef: this.windowRef,
      fetchImpl: this.windowRef.fetch,
      resizeObserverClass: this.windowRef.ResizeObserver,
      basemaps: WEATHER_BASEMAPS,
      initialBasemap: 'esri',
      showBasemapControl: true,
      basemapControlPosition: 'topleft',
      referenceOverlays: TROPICAL_REFERENCE_OVERLAYS,
      onStatus: (event) => this.handleMapStatus(event),
    });
    this.satelliteMap = new TropicalSatelliteMap({
      documentRef: this.documentRef,
      windowRef: this.windowRef,
    });
    this.satelliteMap.init();
    this.bindEvents();
    this.selectSection('overview');

    const parameter = new URL(this.windowRef.location.href).searchParams.get('basin');
    const initialBasin = normalizeTropicalBasin(parameter);
    const validParameter = TROPICAL_BASINS.includes(String(parameter || '').toLowerCase());
    this.selectBasin(initialBasin, { historyMode: validParameter ? 'none' : 'replace' });
    return true;
  }

  bindEvents() {
    for (const tab of this.tabs) {
      tab.addEventListener('click', () => this.selectBasin(tab.dataset.tropicalBasin, { historyMode: 'push' }));
      tab.addEventListener('keydown', (event) => {
        const nextBasin = basinForTabKey(this.activeBasin, event.key);
        if (!nextBasin) return;
        event.preventDefault();
        this.selectBasin(nextBasin, { historyMode: 'push', focusTab: true });
      });
    }
    for (const button of this.graphicButtons) {
      button.addEventListener('click', () => this.selectGraphic(button.dataset.graphicProduct));
      button.addEventListener('keydown', (event) => {
        this.handleProductTabKey(event, this.graphicButtons, (nextButton) => {
          this.selectGraphic(nextButton.dataset.graphicProduct);
        });
      });
    }
    for (const tab of this.sectionTabs) {
      tab.addEventListener('click', () => this.selectSection(tab.dataset.tropicalSection));
      tab.addEventListener('keydown', (event) => {
        this.handleProductTabKey(event, this.sectionTabs, (nextTab) => {
          this.selectSection(nextTab.dataset.tropicalSection);
        });
      });
    }
    this.windowRef.addEventListener('popstate', () => {
      const parameter = new URL(this.windowRef.location.href).searchParams.get('basin');
      const valid = TROPICAL_BASINS.includes(String(parameter || '').toLowerCase());
      this.selectBasin(normalizeTropicalBasin(parameter), { historyMode: valid ? 'none' : 'replace' });
    });
  }

  selectSection(section, { focusTab = false } = {}) {
    const available = this.sectionTabs.map((tab) => tab.dataset.tropicalSection);
    const nextSection = available.includes(section) ? section : 'overview';
    this.activeSection = nextSection;
    let activeTab = null;
    for (const tab of this.sectionTabs) {
      const selected = tab.dataset.tropicalSection === nextSection;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected) activeTab = tab;
    }
    for (const panel of this.sectionPanels) {
      panel.hidden = panel.dataset.tropicalPanel !== nextSection;
    }
    if (focusTab) activeTab?.focus();
    this.engine?.setVisible(nextSection === 'overview');
    if (nextSection === 'satellite') this.satelliteMap?.activate();
    else this.satelliteMap?.deactivate();
  }

  handleProductTabKey(event, buttons, selectButton) {
    const nextIndex = indexForTabKey(buttons.indexOf(event.currentTarget), buttons.length, event.key);
    if (nextIndex === null) return;
    event.preventDefault();
    const nextButton = buttons[nextIndex];
    selectButton(nextButton);
    nextButton.focus();
  }

  async selectBasin(basin, { historyMode = 'push', focusTab = false } = {}) {
    const nextBasin = normalizeTropicalBasin(basin);
    this.activeBasin = nextBasin;
    this.activePackage = null;
    this.syncBasinUi(focusTab);
    if (historyMode !== 'none') {
      this.windowRef.history[`${historyMode}State`](
        { basin: nextBasin },
        '',
        urlForBasin(this.windowRef.location.href, nextBasin),
      );
    }
    try {
      this.ensureOverviewCityLabels();
      await this.engine.loadOverview(nextBasin, {
        url: `active/cache/tropical-map/overview-${nextBasin}.json`,
        memoryCache: true,
        fit: false,
      });
    } catch (error) {
      console.error('[tropical-overview] Basin load failed:', error);
    }
  }

  ensureOverviewCityLabels() {
    if (this.overviewCityLabels) return this.overviewCityLabels;
    const leafletMap = this.engine?.ensureMap?.();
    if (!leafletMap) return null;
    this.overviewCityLabels = installTropicalCityLabels(leafletMap, {
      leaflet: this.windowRef.L,
      fetchImpl: this.windowRef.fetch,
      paneName: 'tropicalOverviewCityLabelPane',
      paneZIndex: 306,
    });
    return this.overviewCityLabels;
  }

  syncBasinUi(focusTab) {
    const support = TROPICAL_SUPPORT[this.activeBasin];
    let activeTab = null;
    for (const tab of this.tabs) {
      const selected = tab.dataset.tropicalBasin === this.activeBasin;
      tab.classList.toggle('active', selected);
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected) activeTab = tab;
    }
    if (focusTab) activeTab?.focus();
    if (this.basinPanel && activeTab) this.basinPanel.setAttribute('aria-labelledby', activeTab.id);
    if (this.heading) this.heading.textContent = `${support.label} Tropical Weather`;
    if (this.description) this.description.textContent = support.description;
    if (this.mapHeading) this.mapHeading.textContent = `${support.label} Basin Overview`;
    this.documentRef.title = `${support.label} Tropical Weather - NCHurricane.com`;
    this.renderActiveSystems(null);
    this.renderMobileLegend(null);
    if (this.mapTimestamp) this.mapTimestamp.textContent = '';
    this.selectGraphic('two');
    this.renderTextTabs();
    this.satelliteMap?.setContext(this.activeBasin, null);
  }

  handleMapStatus({ packageData }) {
    if (!packageData || packageData.basin !== this.activeBasin) return;
    this.activePackage = packageData;
    this.renderActiveSystems(packageData);
    this.renderMobileLegend(packageData);
    this.satelliteMap?.setContext(this.activeBasin, packageData);
    const sourceTime = formatPackageTime(packageData.sourceIssueTime);
    if (this.mapTimestamp) {
      this.mapTimestamp.textContent = sourceTime ? `NHC source time · ${sourceTime}` : '';
    }
    const selectedText = this.textTabs?.querySelector?.('[aria-selected="true"]')?.dataset.textProduct;
    if (selectedText === 'outlook' || selectedText === 'spanish') this.selectTextProduct(selectedText);
  }

  renderActiveSystems(packageData) {
    if (!this.activeSystems) return;
    this.activeSystems.replaceChildren();
    if (!packageData) {
      const alert = createElement(this.documentRef, 'div', 'alert');
      const empty = createElement(this.documentRef, 'div', 'alert-none');
      const title = createElement(this.documentRef, 'span', 'alert-title-chip', 'Loading current systems…');
      const icon = createElement(this.documentRef, 'i', 'fa-solid fa-spinner fa-spin');
      icon.setAttribute('aria-hidden', 'true');
      title.prepend(icon);
      empty.append(title);
      alert.append(empty);
      this.activeSystems.append(alert);
      return;
    }
    const storms = packageData.layers?.stormPositions?.features || [];
    if (storms.length === 0) {
      const alert = createElement(this.documentRef, 'div', 'alert');
      const empty = createElement(this.documentRef, 'div', 'alert-none');
      const title = createElement(
        this.documentRef,
        'span',
        'alert-title-chip',
        `No active tropical cyclones`,
      );
      const icon = createElement(this.documentRef, 'i', 'fa-solid fa-circle-check');
      icon.setAttribute('aria-hidden', 'true');
      title.prepend(icon);
      empty.append(title);
      alert.append(empty);
      this.activeSystems.append(alert);
      return;
    }
    const list = createElement(this.documentRef, 'div', 'tropical-system-grid');
    for (const storm of storms) {
      const properties = storm.properties || {};
      const validStormId = /^[A-Z]{2}\d{6}$/.test(String(properties.stormId || ''));
      const item = createElement(this.documentRef, validStormId ? 'a' : 'div', 'county-alert-chip');
      item.style.setProperty('--county-alert-color', stormAlertColor(properties));
      if (validStormId) item.href = `active/?storm=${properties.stormId}`;
      const icon = createElement(this.documentRef, 'i', 'fa-solid fa-hurricane');
      icon.setAttribute('aria-hidden', 'true');
      const copy = createElement(this.documentRef, 'span', 'county-alert-chip-copy');
      const title = createElement(this.documentRef, 'strong', '', stormName(properties));
      const details = createElement(this.documentRef, 'span');
      const parts = [];
      if (Number.isFinite(Number(properties.intensityKnots))) parts.push(`${Number(properties.intensityKnots)} kt`);
      if (Number.isFinite(Number(properties.pressureMillibars))) parts.push(`${Number(properties.pressureMillibars)} mb`);
      details.textContent = parts.join(' · ') || 'Current details available from the NHC.';
      copy.append(title, details);
      item.append(icon, copy);
      list.append(item);
    }
    this.activeSystems.append(list);
  }

  renderMobileLegend(packageData) {
    if (!this.mobileLegend) return;
    this.mobileLegend.replaceChildren();
    const title = createElement(this.documentRef, 'strong', 'tropical-mobile-legend__title', 'Map legend');
    this.mobileLegend.append(title);
    if (!packageData) {
      this.mobileLegend.append(createElement(this.documentRef, 'p', '', 'Loading map layers…'));
      return;
    }
    const items = [];
    const layers = packageData.layers || {};
    if ((layers.stormPositions?.features?.length || 0) > 0) items.push(['is-storm', 'Active storm']);
    if ((layers.cones?.features?.length || 0) > 0) items.push(['is-cone', 'Forecast cone']);
    if ((layers.forecastTracks?.features?.length || 0) > 0) items.push(['is-track', 'Forecast track']);
    const outlookFeatures = [
      ...(layers.outlookAreas?.features || []),
      ...(layers.outlookPoints?.features || []),
    ];
    const probabilities = outlookFeatures.map((feature) => Math.max(
      Number(feature.properties?.twoDayProbability) || 0,
      Number(feature.properties?.sevenDayProbability) || 0,
    ));
    if (probabilities.some((value) => value > 0 && value < 40)) items.push(['is-low', 'Low chance']);
    if (probabilities.some((value) => value >= 40 && value < 60)) items.push(['is-medium', 'Medium chance']);
    if (probabilities.some((value) => value >= 60)) items.push(['is-high', 'High chance']);
    if (items.length === 0) {
      this.mobileLegend.append(createElement(this.documentRef, 'p', '', 'No active storm or outlook layers.'));
      return;
    }
    const list = createElement(this.documentRef, 'ul');
    for (const [className, label] of items) {
      const item = createElement(this.documentRef, 'li');
      const swatch = createElement(this.documentRef, 'span', `tropical-map-legend__swatch ${className}`);
      swatch.setAttribute('aria-hidden', 'true');
      item.append(swatch, label);
      list.append(item);
    }
    this.mobileLegend.append(list);
  }

  selectGraphic(productKey) {
    const product = TROPICAL_SUPPORT[this.activeBasin].graphics[productKey]
      || TROPICAL_SUPPORT[this.activeBasin].graphics.two;
    for (const button of this.graphicButtons) {
      const selected = button.dataset.graphicProduct === productKey;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
    if (this.graphicImage) {
      this.graphicImage.src = product.image;
      this.graphicImage.alt = `${TROPICAL_SUPPORT[this.activeBasin].label} ${product.label}`;
    }
    if (this.graphicLink) {
      this.graphicLink.href = product.link;
      this.graphicLink.textContent = `View ${product.label} at the official source`;
    }
  }

  renderTextTabs() {
    if (!this.textTabs) return;
    this.textTabs.replaceChildren();
    const products = TROPICAL_SUPPORT[this.activeBasin].textProducts;
    for (const [index, product] of products.entries()) {
      const button = createElement(
        this.documentRef,
        'button',
        `subtabs__tab${index === 0 ? ' is-active' : ''}`,
        product.label,
      );
      button.type = 'button';
      button.dataset.textProduct = product.key;
      button.dataset.shortLabel = product.label;
      button.dataset.a11yTab = 'true';
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', 'supporting-text-content');
      button.setAttribute('aria-selected', String(index === 0));
      button.tabIndex = index === 0 ? 0 : -1;
      button.addEventListener('click', () => this.selectTextProduct(product.key));
      button.addEventListener('keydown', (event) => {
        const buttons = Array.from(this.textTabs.querySelectorAll('[data-text-product]'));
        this.handleProductTabKey(event, buttons, (nextButton) => {
          this.selectTextProduct(nextButton.dataset.textProduct);
        });
      });
      this.textTabs.append(button);
    }
    this.selectTextProduct(products[0].key);
  }

  async selectTextProduct(productKey) {
    const requestedBasin = this.activeBasin;
    const products = TROPICAL_SUPPORT[this.activeBasin].textProducts;
    const product = products.find((item) => item.key === productKey) || products[0];
    for (const button of this.textTabs?.querySelectorAll?.('[data-text-product]') || []) {
      const selected = button.dataset.textProduct === product.key;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
    if (this.textTitle) this.textTitle.textContent = `${TROPICAL_SUPPORT[this.activeBasin].label} ${product.label}`;
    if (this.textContent) this.textContent.textContent = 'Loading official text…';
    if (this.textLink) this.textLink.hidden = true;

    let text = '';
    let link = '';
    if (product.key === 'outlook' || product.key === 'spanish') {
      text = product.key === 'spanish'
        ? this.activePackage?.text?.outlookSpanishHtml
        : this.activePackage?.text?.outlookEnglishHtml;
      link = TROPICAL_SUPPORT[this.activeBasin].graphics.seven.link;
    } else if (product.url) {
      const data = await this.fetchSupportingJson(product.url);
      if (requestedBasin !== this.activeBasin) return;
      text = data?.discussion || data?.rawContent || '';
      link = data?.link || '';
    }
    if (this.textContent) {
      this.textContent.textContent = sourceTextToPlainText(text)
        || (this.activePackage ? 'This supporting text product is not currently available for the selected basin.' : 'Waiting for the selected basin package…');
    }
    if (this.textLink && link) {
      this.textLink.href = link;
      this.textLink.hidden = false;
    }
  }

  async fetchSupportingJson(url) {
    if (!this.supportingCache.has(url)) {
      this.supportingCache.set(url, this.windowRef.fetch(url, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      }).then((response) => (response.ok ? response.json() : null)).catch(() => null));
    }
    return this.supportingCache.get(url);
  }
}

export function initTropicalOverview(options = {}) {
  const controller = new TropicalOverviewController(options);
  return controller.init() ? controller : null;
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  const start = () => {
    window.tropicalOverview = initTropicalOverview();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}
