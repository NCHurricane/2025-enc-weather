// County-only forecast presentation; fetching and zone lifecycle stay in the app controllers.
import { renderCountyOutlook } from './countyAlerts.js?v=20260912-phase11-hwo-2';

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function forecastIcon(value) {
  // Forecast packages supply absolute NWS icon URLs. Reject executable URL schemes.
  return /^https?:\/\//i.test(String(value || '')) ? escapeHTML(value) : '';
}

export function forecastPeriodMarkup(periods, { combined = true, detailed = false } = {}) {
  return periods.map(period => {
    const name = escapeHTML(period?.name || 'N/A');
    const shortText = escapeHTML(period?.shortForecast || 'N/A');
    const detail = escapeHTML(period?.detailedForecast || period?.shortForecast || 'No forecast details available.');
    const icon = forecastIcon(period?.icon);
    const color = period?.isDaytime ? '#d50000' : '#1976d2';
    const temperature = period?.temperature;
    const value = temperature != null && Number.isFinite(Number(temperature))
      ? `<span class="value" style="color: ${color};">${Math.round(Number(temperature))}°</span>`
      : '<span class="value">N/A</span>';
    const image = icon ? `<img src="${icon}" alt="${shortText}" loading="lazy" decoding="async">` : '';

    // The retained Bertie test page still has separate summary/detail panels.
    if (detailed) return `
      <div class="detailed-item"><div class="detailed-row">
        <div class="detailed-col-day"><div class="detailed-day"><span class="value" style="color: ${color};">${name}</span></div></div>
        <div class="detailed-col-icon"><div class="detailed-icon">${image || '<span class="value">No Icon</span>'}</div></div>
        <div class="detailed-col-forecast"><div class="detailed-forecast">${detail}</div></div>
      </div></div>`;

    return `
      <div class="forecast-item">
        <${combined ? 'h3' : 'div'} class="forecast-cell forecast-day${combined ? ' card-heading' : ''}">${name}</${combined ? 'h3' : 'div'}>
        <div class="forecast-cell forecast-icon">${image}</div>
        <div class="forecast-cell forecast-temp">${value}</div>
        ${combined ? `<p class="county-forecast__description">${shortText}</p>
        <details class="county-forecast__details">
          <summary>Details<span class="county-forecast__summary-context"> for ${name}</span></summary>
          <p>${detail}</p>
        </details>` : ''}
      </div>`;
  }).join('');
}

export async function renderCountyForecast({ getForecast, container, detailedContainer, isCurrent = () => true }) {
  let forecast;
  try {
    forecast = await getForecast?.();
  } catch (error) {
    console.warn('[countyForecast] forecast load failed', error);
  }
  if (!isCurrent()) return;
  const periods = Array.isArray(forecast?.periods) ? forecast.periods : [];
  if (container) container.innerHTML = periods.length
    ? forecastPeriodMarkup(periods, { combined: !detailedContainer })
    : '<p role="status">Forecast temporarily unavailable.</p>';
  if (detailedContainer) detailedContainer.innerHTML = periods.length
    ? forecastPeriodMarkup(periods, { detailed: true })
    : '<div class="detailed-item">Detailed forecast temporarily unavailable.</div>';
}

const initializedRoots = new WeakMap();

export function initCountyForecastTabs(root) {
  if (!root) return;
  if (initializedRoots.has(root)) return initializedRoots.get(root);
  const buttons = Array.from(root.querySelectorAll('[data-forecast-tab]'));
  const panels = Array.from(root.querySelectorAll('[data-forecast-panel]'));
  if (!buttons.length || !panels.length) return;
  const availableButtons = () => buttons.filter(button => !button.hidden && !button.disabled);

  const activate = name => {
    if (!availableButtons().some(button => button.dataset.forecastTab === name)) return;
    buttons.forEach(button => {
      const active = button.dataset.forecastTab === name;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    panels.forEach(panel => { panel.hidden = panel.dataset.forecastPanel !== name; });
    // Retain the existing deferred chart and discussion controls, plus the legacy detail toggle.
    for (const [panelName, id] of Object.entries({ detailed: 'detailed-toggle', meteogram: 'meteogram-toggle', discussion: 'afd-toggle' })) {
      const toggle = root.querySelector(`#${id}`);
      if (toggle && toggle.checked !== (panelName === name)) {
        toggle.checked = panelName === name;
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  };

  buttons.forEach(button => {
    button.addEventListener('click', () => activate(button.dataset.forecastTab));
    button.addEventListener('keydown', event => {
      const available = availableButtons();
      const index = available.indexOf(button);
      let next;
      if (event.key === 'ArrowLeft') next = (index + available.length - 1) % available.length;
      else if (event.key === 'ArrowRight') next = (index + 1) % available.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = available.length - 1;
      else return;
      event.preventDefault();
      activate(available[next].dataset.forecastTab);
      available[next].focus();
    });
  });
  const controller = {
    setAvailable(name, available, contentHadFocus = false) {
      const button = buttons.find(item => item.dataset.forecastTab === name);
      const panel = panels.find(item => item.dataset.forecastPanel === name);
      if (!button || !panel) return;
      const restoreFocus = contentHadFocus || button === document.activeElement || panel.contains(document.activeElement);
      button.hidden = !available;
      if (!available) {
        panel.hidden = true;
        if (button.getAttribute('aria-selected') === 'true') {
          const fallback = availableButtons()[0];
          activate(fallback.dataset.forecastTab);
          if (restoreFocus) fallback.focus({ preventScroll: true });
        }
      }
    },
    outlookTimer: null,
    outlookExpires: NaN,
    refreshOutlook: null,
  };
  initializedRoots.set(root, controller);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && controller.outlookExpires <= Date.now()) controller.refreshOutlook?.();
  });
  activate(availableButtons().find(button => button.getAttribute('aria-selected') === 'true')?.dataset.forecastTab || availableButtons()[0]?.dataset.forecastTab);
  return controller;
}

export function renderCountyForecastOutlook({ root, outlook, formatTime }) {
  const controller = initCountyForecastTabs(root);
  const container = root?.querySelector('[data-county-outlook]');
  if (!controller || !container) return;
  clearTimeout(controller.outlookTimer);
  const contentHadFocus = container.contains(document.activeElement);
  const current = renderCountyOutlook({ container, outlook, formatTime, inline: true });
  controller.setAvailable('outlook', current, contentHadFocus);
  controller.refreshOutlook = () => renderCountyForecastOutlook({ root, outlook, formatTime });
  // Hide an expired product even when the page stays open between data refreshes.
  controller.outlookExpires = current ? Date.parse(outlook?.validUntil) : NaN;
  const remaining = controller.outlookExpires - Date.now();
  if (current && remaining > 0) {
    controller.outlookTimer = setTimeout(controller.refreshOutlook, Math.min(remaining + 1, 2147483647));
  }
}
