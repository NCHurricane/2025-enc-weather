// Shared responsive alert tray for county weather pages.

function escapeHTML(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]
  );
}

function formatOutlookTime(value, formatTime) {
  if (!value) return '';
  try {
    return formatTime(value) || '';
  } catch (error) {
    console.warn('[countyAlerts] unable to format outlook time', error);
    return '';
  }
}

function officialProductUrl(value) {
  const url = String(value || '');
  return /^https:\/\/api\.weather\.gov\/products\/[a-f0-9-]{36}$/i.test(url) ? url : '';
}

function bindOutlookDialog(container) {
  const trigger = container.querySelector('[data-county-hwo-open]');
  const dialog = container.querySelector('.county-hwo-dialog');
  if (!trigger || !dialog) return;

  const closeDialog = () => {
    if (typeof dialog.close === 'function' && dialog.open) {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
    document.documentElement.classList.remove('county-alert-modal-open');
  };

  trigger.addEventListener('click', () => {
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
    document.documentElement.classList.add('county-alert-modal-open');
  });

  dialog.querySelector('[data-county-hwo-close]')?.addEventListener('click', closeDialog);
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    closeDialog();
  });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('county-alert-modal-open');
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog();
  });
}

export function renderCountyOutlook({ container, outlook, formatTime }) {
  if (!container) return false;

  if (!outlook || !['ok', 'stale'].includes(outlook.status) || !outlook.text) {
    return false;
  }

  const alertElement = container.firstElementChild;
  if (!alertElement) return false;

  const issued = formatOutlookTime(outlook.issued, formatTime);
  const validUntil = formatOutlookTime(outlook.validUntil, formatTime);
  const office = [outlook.office ? `${outlook.office}` : '']
    .filter(Boolean)
    .join(' ');
  const sourceUrl = officialProductUrl(outlook.sourceUrl);
  const metadata = [
    ['Issued', issued],
    ['Valid until', validUntil],
    ['NWS office', office],
    ['Forecast zone', outlook.zone],
    ['Applicable area', outlook.areaDesc],
  ]
    .filter(([, value]) => value)
    .map(
      ([label, value]) => `
        <div>
          <dt>${escapeHTML(label)}</dt>
          <dd>${escapeHTML(value)}</dd>
        </div>
      `
    )
    .join('');

  const row = document.createElement('div');
  row.className = 'county-alert-row';
  const primary = document.createElement('div');
  primary.className = 'county-alert-primary';
  container.insertBefore(row, alertElement);
  primary.append(alertElement);
  row.append(primary);

  row.insertAdjacentHTML(
    'beforeend',
    `
      <button
        type="button"
        class="county-hwo-trigger"
        data-county-hwo-open
        aria-haspopup="dialog"
        aria-controls="county-hwo-dialog"
      >
        <i class="fa-solid fa-cloud-bolt" aria-hidden="true"></i>
        <span class="county-hwo-trigger-copy">
          <span>Forecast outlook</span>
          <strong>
            <span class="county-hwo-label-long">Hazardous Weather Outlook</span>
            <span class="county-hwo-label-short">HWO</span>
          </strong>
          ${issued ? `<small>Issued ${escapeHTML(issued)}</small>` : ''}
        </span>
        <span class="county-hwo-trigger-action">
          View
          <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
        </span>
      </button>

      <dialog class="county-alert-dialog county-hwo-dialog" id="county-hwo-dialog" aria-labelledby="county-hwo-dialog-title">
        <div class="county-alert-dialog-shell">
          <header class="county-alert-dialog-header">
            <div>
              <span>Forecast outlook</span>
              <h2 id="county-hwo-dialog-title">Hazardous Weather Outlook</h2>
            </div>
            <button type="button" class="county-alert-dialog-close" data-county-hwo-close aria-label="Close Hazardous Weather Outlook">
              <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
          </header>

          <div class="county-alert-dialog-scroll">
            <article class="county-alert-panel county-hwo-panel">
              <header class="county-alert-panel-heading">
                <i class="fa-solid fa-cloud-bolt" aria-hidden="true"></i>
                <div>
                  <h3>Hazardous Weather Outlook</h3>
                  ${issued ? `<p>Issued ${escapeHTML(issued)}</p>` : ''}
                </div>
              </header>
              ${outlook.status === 'stale'
                ? '<p class="county-hwo-stale"><i class="fa-solid fa-clock-rotate-left" aria-hidden="true"></i><span>The latest refresh failed. This is the last available NWS outlook and may be stale.</span></p>'
                : ''}
              ${metadata ? `<dl class="county-hwo-metadata" aria-label="Hazardous Weather Outlook details">${metadata}</dl>` : ''}
              <pre class="county-hwo-text">${escapeHTML(outlook.text)}</pre>
              ${sourceUrl
                ? `<a class="county-hwo-source" href="${escapeHTML(sourceUrl)}" target="_blank" rel="noopener noreferrer">View the official NWS product <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a>`
                : ''}
            </article>
          </div>
        </div>
      </dialog>
    `
  );

  bindOutlookDialog(container);
  return true;
}

function alertEvent(alert) {
  return alert?.event || alert?.type || alert?.headline || 'Alert';
}

export function closeCountyAlertDialog(root = document) {
  const dialog = root.querySelector('.county-alert-dialog[open]');
  if (dialog) {
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
  }
  document.documentElement.classList.remove('county-alert-modal-open');
}

function setSelectedAlert(dialog, index, { focusSelector = false } = {}) {
  const selectors = Array.from(dialog.querySelectorAll('[data-county-alert-select]'));
  const panels = Array.from(dialog.querySelectorAll('[data-county-alert-panel]'));
  const selectedIndex = Math.max(0, Math.min(index, panels.length - 1));

  selectors.forEach((selector) => {
    const isSelected = Number(selector.dataset.countyAlertSelect) === selectedIndex;
    selector.setAttribute('aria-selected', String(isSelected));
    selector.tabIndex = isSelected ? 0 : -1;
    selector.classList.toggle('is-selected', isSelected);
    if (isSelected && focusSelector) selector.focus();
  });

  panels.forEach((panel) => {
    panel.hidden = Number(panel.dataset.countyAlertPanel) !== selectedIndex;
  });

  const scroller = dialog.querySelector('.county-alert-dialog-scroll');
  if (scroller) scroller.scrollTop = 0;
}

function bindAlertDialog(container) {
  const dialog = container.querySelector('.county-alert-dialog');
  if (!dialog) return;

  const closeDialog = () => {
    if (typeof dialog.close === 'function' && dialog.open) {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
    document.documentElement.classList.remove('county-alert-modal-open');
  };

  container.querySelectorAll('[data-county-alert-open]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.countyAlertOpen) || 0;
      setSelectedAlert(dialog, index);
      if (typeof dialog.showModal === 'function') {
        if (!dialog.open) dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
      document.documentElement.classList.add('county-alert-modal-open');
    });
  });

  dialog.querySelectorAll('[data-county-alert-select]').forEach((button) => {
    button.addEventListener('click', () => {
      setSelectedAlert(dialog, Number(button.dataset.countyAlertSelect) || 0);
    });

    button.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const selectors = Array.from(dialog.querySelectorAll('[data-county-alert-select]'));
      const currentIndex = selectors.indexOf(button);
      let nextIndex = currentIndex;
      if (event.key === 'ArrowLeft') nextIndex = Math.max(0, currentIndex - 1);
      if (event.key === 'ArrowRight') nextIndex = Math.min(selectors.length - 1, currentIndex + 1);
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = selectors.length - 1;
      event.preventDefault();
      setSelectedAlert(dialog, nextIndex, { focusSelector: true });
    });
  });

  dialog.querySelector('[data-county-alert-close]')?.addEventListener('click', closeDialog);
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    closeDialog();
  });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('county-alert-modal-open');
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog();
  });
}

export function renderCountyAlerts({
  container,
  alerts,
  warningColors,
  warningPriorities,
  formatTime,
}) {
  const sortedAlerts = [...alerts].sort((first, second) => {
    const firstPriority = warningPriorities[alertEvent(first)] || 999;
    const secondPriority = warningPriorities[alertEvent(second)] || 999;
    return firstPriority - secondPriority;
  });

  if (!container || sortedAlerts.length === 0) return sortedAlerts;

  closeCountyAlertDialog(container);

  const entries = sortedAlerts.map((alert, index) => {
    const eventName = alertEvent(alert);
    const expires = alert.expires ? formatTime(alert.expires) : '';
    return {
      alert,
      index,
      eventName,
      eventLabel: escapeHTML(eventName),
      expires,
      expiresLabel: escapeHTML(expires),
      color: warningColors[eventName] || '#dc3545',
    };
  });

  const bulletinCounts = new Map();
  entries.forEach((entry) => {
    const bulletin = entry.alert.description || entry.alert.summary || '';
    if (!bulletin) return;
    bulletinCounts.set(bulletin, (bulletinCounts.get(bulletin) || 0) + 1);
  });
  entries.forEach((entry) => {
    const bulletin = entry.alert.description || entry.alert.summary || '';
    entry.sharedBulletinCount = bulletin ? bulletinCounts.get(bulletin) || 1 : 1;
  });

  const count = entries.length;
  const countLabel = `${count} active alert${count === 1 ? '' : 's'}`;
  const primary = entries[0];
  const visibleEntries = entries.slice(0, 3);

  const railHTML = visibleEntries
    .map(
      (entry) => `
        <button
          type="button"
          class="county-alert-chip"
          style="--county-alert-color: ${entry.color};"
          data-county-alert-open="${entry.index}"
          aria-haspopup="dialog"
          aria-controls="county-alert-dialog"
          aria-label="View ${entry.eventLabel}${entry.expiresLabel ? `, until ${entry.expiresLabel}` : ''}"
        >
          <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
          <span class="county-alert-chip-copy">
            <strong>${entry.eventLabel}</strong>
            ${entry.expiresLabel ? `<span>Until ${entry.expiresLabel}</span>` : ''}
          </span>
        </button>
      `
    )
    .join('');

  const viewAllHTML = count > 3
    ? `<button type="button" class="county-alert-view-all" data-county-alert-open="0" aria-haspopup="dialog" aria-controls="county-alert-dialog">View all <span>${count}</span></button>`
    : '';

  const selectorHTML = entries
    .map(
      (entry) => `
        <button
          type="button"
          id="county-alert-selector-${entry.index}"
          class="county-alert-selector${entry.index === 0 ? ' is-selected' : ''}"
          style="--county-alert-color: ${entry.color};"
          role="tab"
          aria-selected="${entry.index === 0}"
          aria-controls="county-alert-panel-${entry.index}"
          tabindex="${entry.index === 0 ? '0' : '-1'}"
          data-county-alert-select="${entry.index}"
        >
          <strong>${entry.eventLabel}</strong>
          ${entry.expiresLabel ? `<span>Until ${entry.expiresLabel}</span>` : ''}
        </button>
      `
    )
    .join('');

  const panelHTML = entries
    .map(
      (entry) => `
        <article
          id="county-alert-panel-${entry.index}"
          class="county-alert-panel"
          style="--county-alert-color: ${entry.color};"
          role="tabpanel"
          aria-labelledby="county-alert-selector-${entry.index}"
          data-county-alert-panel="${entry.index}"
          ${entry.index === 0 ? '' : 'hidden'}
        >
          <header class="county-alert-panel-heading">
            <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
            <div>
              <h3>${entry.eventLabel}</h3>
              ${entry.expiresLabel ? `<p>Until ${entry.expiresLabel}</p>` : ''}
            </div>
          </header>
          <dl class="county-alert-metadata" aria-label="Selected alert details">
            <div>
              <dt>Severity</dt>
              <dd>${escapeHTML(entry.alert.severity || 'Not specified')}</dd>
            </div>
            <div>
              <dt>Urgency</dt>
              <dd>${escapeHTML(entry.alert.urgency || 'Not specified')}</dd>
            </div>
            <div>
              <dt>Affected area</dt>
              <dd>${escapeHTML(entry.alert.areaDesc || 'Not specified')}</dd>
            </div>
          </dl>
          ${entry.sharedBulletinCount > 1
            ? `<p class="county-alert-shared-bulletin"><i class="fa-solid fa-circle-info" aria-hidden="true"></i><span><strong>Shared NWS bulletin</strong> The source provides the same bulletin text for ${entry.sharedBulletinCount} active alerts. The selected alert's details are shown above.</span></p>`
            : ''}
          <div class="county-alert-description">${entry.alert.description || entry.alert.summary || '<p>No additional alert details are available.</p>'}</div>
        </article>
      `
    )
    .join('');

  container.innerHTML = `
    <div class="county-alert-ui">
      <button
        type="button"
        class="county-alert-summary"
        style="--county-alert-color: ${primary.color};"
        data-county-alert-open="0"
        aria-haspopup="dialog"
        aria-controls="county-alert-dialog"
      >
        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
        <span class="county-alert-summary-copy">
          <span>${countLabel}</span>
          <strong>${primary.eventLabel}</strong>
          ${primary.expiresLabel ? `<small>Until ${primary.expiresLabel}</small>` : ''}
        </span>
        <span class="county-alert-summary-action">View <i class="fa-solid fa-chevron-right" aria-hidden="true"></i></span>
      </button>

      <div class="county-alert-rail" aria-label="${countLabel}">
        ${railHTML}
        ${viewAllHTML}
      </div>

      <dialog class="county-alert-dialog" id="county-alert-dialog" aria-labelledby="county-alert-dialog-title">
        <div class="county-alert-dialog-shell">
          <header class="county-alert-dialog-header">
            <div>
              <span>Current alerts</span>
              <h2 id="county-alert-dialog-title">${countLabel}</h2>
            </div>
            <button type="button" class="county-alert-dialog-close" data-county-alert-close aria-label="Close alerts">
              <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
          </header>

          <div class="county-alert-selectors" role="tablist" aria-label="Select an alert">
            ${selectorHTML}
          </div>

          <div class="county-alert-dialog-scroll">
            ${panelHTML}
          </div>
        </div>
      </dialog>
    </div>
  `;

  bindAlertDialog(container);
  return sortedAlerts;
}
