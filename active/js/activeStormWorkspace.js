const GROUP_SELECTOR = '[data-active-tab-group]';
const TAB_SELECTOR = '[data-active-tab]';
const PANEL_SELECTOR = '[data-active-panel]';

function visibleTabs(group) {
  return Array.from(group.querySelectorAll(TAB_SELECTOR)).filter((tab) => !tab.hidden && !tab.disabled);
}

function panelScope(group) {
  return group.closest('.active-module') || group.parentElement || group;
}

function forecastGraphicUrls(stormId) {
  const basinFolder = stormId.startsWith('AL') ? 'AT' : 'EP';
  const stormNumber = stormId.slice(2, 4);
  const graphicsFolder = `${basinFolder}${stormNumber}`;
  return [
    `./storms/${encodeURIComponent(stormId)}/5day_cone_no_line_and_wind.png`,
    `https://www.nhc.noaa.gov/storm_graphics/${graphicsFolder}/${stormId}_5day_cone.png`,
  ];
}

export class ActiveStormWorkspace {
  constructor({ documentRef = globalThis.document, windowRef = globalThis.window } = {}) {
    this.documentRef = documentRef;
    this.windowRef = windowRef;
    this.groups = Array.from(documentRef?.querySelectorAll?.(GROUP_SELECTOR) || []);
    this.handlePopState = this.handlePopState.bind(this);
    this.handleAlertsState = this.handleAlertsState.bind(this);
    this.handleStormReady = this.handleStormReady.bind(this);
  }

  init() {
    for (const group of this.groups) this.bindGroup(group);
    this.documentRef?.querySelectorAll?.('[data-open-active-panel]').forEach((button) => {
      button.addEventListener('click', () => {
        const targetGroup = this.groups.find((group) => group.dataset.activeTabGroup === button.dataset.openActiveGroup);
        if (targetGroup) this.activateGroup(targetGroup, button.dataset.openActivePanel, { updateHistory: true, focus: true });
      });
    });
    this.windowRef?.addEventListener?.('popstate', this.handlePopState);
    this.windowRef?.addEventListener?.('nch:active-alerts-state', this.handleAlertsState);
    this.windowRef?.addEventListener?.('nch:active-storm-ready', this.handleStormReady);
    this.applyUrlState();
    const ready = this.windowRef?.NCHActiveStorm;
    if (ready?.stormId) this.handleStormReady({ detail: ready });
    this.syncMobileDisclosures();
    this.windowRef?.matchMedia?.('(max-width: 680px)')?.addEventListener?.('change', () => this.syncMobileDisclosures());
    return true;
  }

  bindGroup(group) {
    group.querySelectorAll(TAB_SELECTOR).forEach((tab) => {
      tab.addEventListener('click', () => {
        this.activateGroup(group, tab.dataset.activeTab, { updateHistory: true });
      });
      tab.addEventListener('keydown', (event) => this.handleTabKeydown(event, group, tab));
    });
  }

  handleTabKeydown(event, group, currentTab) {
    const tabs = visibleTabs(group);
    const currentIndex = tabs.indexOf(currentTab);
    if (currentIndex < 0) return;
    let nextIndex = null;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const nextTab = tabs[nextIndex];
    this.activateGroup(group, nextTab.dataset.activeTab, { updateHistory: true, focus: true });
  }

  activateGroup(group, requestedPanel, { updateHistory = false, focus = false } = {}) {
    const tabs = visibleTabs(group);
    const selectedTab = tabs.find((tab) => tab.dataset.activeTab === requestedPanel) || tabs[0];
    if (!selectedTab) return false;
    const panelName = selectedTab.dataset.activeTab;
    group.querySelectorAll(TAB_SELECTOR).forEach((tab) => {
      const active = tab === selectedTab;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    panelScope(group).querySelectorAll(PANEL_SELECTOR).forEach((panel) => {
      const active = panel.dataset.activePanel === panelName;
      panel.hidden = !active;
      panel.setAttribute('aria-hidden', String(!active));
    });
    if (focus) selectedTab.focus();
    if (updateHistory) this.updateUrl(group.dataset.queryKey, panelName);
    this.windowRef?.dispatchEvent?.(new this.windowRef.CustomEvent('nch:active-workspace-panel-change', {
      detail: { group: group.dataset.activeTabGroup, panel: panelName },
    }));
    if (group.dataset.activeTabGroup === 'storm' && panelName === 'alerts') {
      this.windowRef?.setTimeout?.(() => {
        this.windowRef.dispatchEvent(new this.windowRef.Event('resize'));
      }, 0);
    }
    return true;
  }

  updateUrl(queryKey, panelName) {
    if (!queryKey || !this.windowRef?.history?.pushState) return;
    const url = new URL(this.windowRef.location.href);
    url.searchParams.set(queryKey, panelName);
    this.windowRef.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }

  applyUrlState() {
    const params = new URLSearchParams(this.windowRef?.location?.search || '');
    for (const group of this.groups) {
      const selected = params.get(group.dataset.queryKey)
        || group.querySelector(`${TAB_SELECTOR}[aria-selected="true"]`)?.dataset.activeTab;
      this.activateGroup(group, selected, { updateHistory: false });
    }
  }

  handlePopState() {
    this.applyUrlState();
  }

  handleAlertsState(event) {
    const hasAlerts = Boolean(event?.detail?.hasWind || event?.detail?.hasSurge);
    const group = this.groups.find((candidate) => candidate.dataset.activeTabGroup === 'storm');
    if (!group) return;
    const tab = group.querySelector('[data-active-tab="alerts"]');
    const panel = panelScope(group).querySelector('[data-active-panel="alerts"]');
    if (tab) tab.hidden = !hasAlerts;
    if (!hasAlerts && panel && !panel.hidden) {
      this.activateGroup(group, 'summary', { updateHistory: true });
    }
  }

  handleStormReady(event) {
    const stormId = String(event?.detail?.stormId || '').toUpperCase();
    const image = this.documentRef?.getElementById?.('active-summary-forecast-image');
    const emptyState = this.documentRef?.getElementById?.('active-summary-forecast-empty');
    if (!image || !/^(?:AL|EP|CP)\d{6}$/.test(stormId)) return;
    const urls = forecastGraphicUrls(stormId);
    let index = 0;
    image.onload = () => {
      image.hidden = false;
      if (emptyState) emptyState.hidden = true;
    };
    image.onerror = () => {
      index += 1;
      if (index < urls.length) {
        image.src = urls[index];
        return;
      }
      image.hidden = true;
      if (emptyState) emptyState.hidden = false;
    };
    image.hidden = false;
    if (emptyState) emptyState.hidden = true;
    image.alt = `${stormId} latest NHC five-day forecast track and cone`;
    image.src = urls[index];
  }

  syncMobileDisclosures() {
    const isMobile = this.windowRef?.matchMedia?.('(max-width: 680px)').matches;
    if (!isMobile) return;
    this.documentRef?.querySelectorAll?.('.active-map-layers[open]').forEach((details) => {
      details.removeAttribute('open');
    });
    this.documentRef?.querySelectorAll?.('.active-map-imagery[open]').forEach((details) => {
      details.removeAttribute('open');
    });
  }

  destroy() {
    this.windowRef?.removeEventListener?.('popstate', this.handlePopState);
    this.windowRef?.removeEventListener?.('nch:active-alerts-state', this.handleAlertsState);
    this.windowRef?.removeEventListener?.('nch:active-storm-ready', this.handleStormReady);
  }
}

const workspace = new ActiveStormWorkspace();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => workspace.init(), { once: true });
} else {
  workspace.init();
}
