import { warningColors, warningPriorities } from './warningColors.js?v=20260816-1';

const ALERT_REFRESH_BUCKET_MS = 5 * 60 * 1000;
const HOME_ZONES = Object.freeze([
  { zone: 'NCZ030', label: 'Bertie County', county: 'Bertie', href: 'counties/bertie/index.html', alertsUrl: 'counties/bertie/data/alerts.json' },
  { zone: 'NCZ044', label: 'Pitt County', county: 'Pitt', href: 'counties/pitt/index.html', alertsUrl: 'counties/pitt/data/alerts.json' },
  { zone: 'NCZ080', label: 'Beaufort County', county: 'Beaufort', href: 'counties/beaufort/index.html', alertsUrl: 'counties/beaufort/data/alerts.json' },
  { zone: 'NCZ029', label: 'Martin County', county: 'Martin', href: 'counties/martin/index.html', alertsUrl: 'counties/martin/data/alerts.json' },
  { zone: 'NCZ045', label: 'Washington County', county: 'Washington', href: 'counties/washington/index.html', alertsUrl: 'counties/washington/data/alerts.json' },
  { zone: 'NCZ046', label: 'Tyrrell County', county: 'Tyrrell', href: 'counties/tyrrell/index.html', alertsUrl: 'counties/tyrrell/data/alerts.json' },
  { zone: 'NCZ047', label: 'Mainland Dare', county: 'Dare', href: 'counties/dare/?zone=mainland', alertsUrl: 'counties/dare/data/mainland/alerts.json' },
  { zone: 'NCZ203', label: 'Northern Outer Banks', county: 'Dare', href: 'counties/dare/?zone=northern', alertsUrl: 'counties/dare/data/northern/alerts.json' },
  { zone: 'NCZ205', label: 'Hatteras Island', county: 'Dare', href: 'counties/dare/?zone=hatteras', alertsUrl: 'counties/dare/data/hatteras/alerts.json' },
  { zone: 'NCZ081', label: 'Mainland Hyde', county: 'Hyde', href: 'counties/hyde/?zone=mainland', alertsUrl: 'counties/hyde/data/mainland/alerts.json' },
  { zone: 'NCZ204', label: 'Ocracoke Island', county: 'Hyde', href: 'counties/hyde/?zone=ocracoke', alertsUrl: 'counties/hyde/data/ocracoke/alerts.json' },
]);
const HOME_ZONE_BY_ID = new Map(HOME_ZONES.map((zone) => [zone.zone, zone]));
const initializedMaps = new WeakSet();

function versionedUrl(value) {
  const url = new URL(value, window.location.href);
  url.searchParams.set('v', String(Math.floor(Date.now() / ALERT_REFRESH_BUCKET_MS)));
  return url.href;
}

function alertValue(alert, key) {
  return alert?.[key] ?? alert?.properties?.[key] ?? null;
}

function alertEvent(alert) {
  return alertValue(alert, 'event') || alertValue(alert, 'type') || alertValue(alert, 'headline') || 'Weather alert';
}

function alertPriority(alert) {
  return warningPriorities[alertEvent(alert)] ?? 999;
}

function alertColor(alert) {
  return warningColors[alertEvent(alert)] || '#dc3545';
}

async function fetchJson(url, label) {
  const response = await fetch(versionedUrl(url), { cache: 'no-store' });
  if (!response.ok) throw new Error(`${label} request failed (${response.status})`);
  return response.json();
}

async function loadAlerts() {
  const results = await Promise.allSettled(HOME_ZONES.map(async (zone) => {
    const payload = await fetchJson(zone.alertsUrl, `${zone.label} alerts`);
    return {
      zone,
      alerts: Array.isArray(payload?.alerts) ? payload.alerts : [],
    };
  }));
  const alertsByZone = new Map();
  let failedZoneCount = 0;

  results.forEach((result) => {
    if (result.status === 'rejected') {
      failedZoneCount += 1;
      console.warn('[home-weather-map] Alert source failed:', result.reason);
      return;
    }
    alertsByZone.set(result.value.zone.zone, result.value.alerts);
  });

  return { alertsByZone, failedZoneCount };
}

function primaryAlert(alerts) {
  return [...alerts].sort((left, right) => alertPriority(left) - alertPriority(right))[0] || null;
}

function createCountyPopup(zone, alerts) {
  const popup = document.createElement('section');
  popup.className = 'home-county-popup';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'home-county-popup-eyebrow';
  eyebrow.textContent = zone.county === zone.label.replace(' County', '')
    ? ''
    : `${zone.county} County zone`;
  if (eyebrow.textContent) {
    popup.append(eyebrow);
  }

  const heading = document.createElement('h3');
  heading.textContent = zone.label;
  popup.append(heading);

  if (alerts.length) {
    const alertSummary = document.createElement('div');
    alertSummary.className = 'home-county-popup-alerts';
    const summaryHeading = document.createElement('strong');
    summaryHeading.textContent = `${alerts.length} current alert${alerts.length === 1 ? '' : 's'}`;
    alertSummary.append(summaryHeading);

    const list = document.createElement('ul');
    [...new Set(alerts.map(alertEvent))].forEach((eventName) => {
      const item = document.createElement('li');
      const swatch = document.createElement('span');
      swatch.className = 'home-county-popup-alert-swatch';
      swatch.style.backgroundColor = warningColors[eventName] || '#dc3545';
      swatch.setAttribute('aria-hidden', 'true');
      item.append(swatch, document.createTextNode(eventName));
      list.append(item);
    });
    alertSummary.append(list);
    popup.append(alertSummary);
  } else {
    const status = document.createElement('p');
    status.className = 'home-county-popup-clear';
    status.textContent = 'No current alerts or advisories.';
    popup.append(status);
  }

  const link = document.createElement('a');
  link.className = 'home-county-popup-link';
  link.href = zone.href;
  link.textContent = `Open ${zone.county} County Page`;
  popup.append(link);
  return popup;
}

function createMapKey(map, alertsByZone, failedZoneCount, alertLayer) {
  const eventZones = new Map();
  alertsByZone.forEach((alerts, zoneId) => {
    alerts.forEach((alert) => {
      const eventName = alertEvent(alert);
      if (!eventZones.has(eventName)) eventZones.set(eventName, new Set());
      eventZones.get(eventName).add(zoneId);
    });
  });
  const events = [...eventZones.entries()];
  events.sort(([left], [right]) => (warningPriorities[left] ?? 999) - (warningPriorities[right] ?? 999));
  const control = window.L.control({ position: 'bottomright' });
  control.onAdd = () => {
    const container = window.L.DomUtil.create('section', 'home-map-key leaflet-control');
    const panel = document.createElement('div');
    panel.className = 'home-map-key-panel';

    const heading = document.createElement('strong');
    heading.className = 'home-map-key-heading';
    heading.textContent = 'Alerts & advisories';
    panel.append(heading);

    if (events.length) {
      const list = document.createElement('div');
      list.className = 'home-map-key-alerts';
      events.forEach(([eventName, zones]) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'home-map-key-alert';
        item.setAttribute('aria-label', `Highlight ${eventName} areas`);
        const swatch = document.createElement('span');
        swatch.className = 'home-map-key-swatch';
        swatch.style.backgroundColor = warningColors[eventName] || '#dc3545';
        swatch.setAttribute('aria-hidden', 'true');
        const label = document.createElement('span');
        label.textContent = eventName;
        const count = document.createElement('small');
        count.textContent = `${zones.size} area${zones.size === 1 ? '' : 's'}`;
        item.append(swatch, label, count);
        item.addEventListener('click', () => {
          alertLayer.eachLayer((layer) => {
            const zoneAlerts = alertsByZone.get(layer.feature?.properties?.zoneCode) || [];
            const matches = zoneAlerts.some((alert) => alertEvent(alert) === eventName);
            layer.setStyle({ fillOpacity: matches ? 0.64 : 0.1 });
          });
          window.setTimeout(() => {
            alertLayer.eachLayer((layer) => {
              const zoneAlerts = alertsByZone.get(layer.feature?.properties?.zoneCode) || [];
              layer.setStyle({ fillOpacity: zoneAlerts.length ? 0.34 : 0 });
            });
          }, 1800);
        });
        list.append(item);
      });
      panel.append(list);
    } else {
      const clear = document.createElement('p');
      clear.className = 'home-map-key-clear';
      clear.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i><span>No current alerts or advisories</span>';
      panel.append(clear);
    }

    if (failedZoneCount) {
      const warning = document.createElement('p');
      warning.className = 'home-map-key-warning';
      warning.textContent = `${failedZoneCount} alert source${failedZoneCount === 1 ? '' : 's'} unavailable`;
      panel.append(warning);
    }

    const countyKey = document.createElement('div');
    countyKey.className = 'home-map-key-county';
    countyKey.innerHTML = '<span aria-hidden="true"></span><strong>Home Counties</strong>';
    panel.append(countyKey);
    container.append(panel);
    window.L.DomEvent.disableClickPropagation(container);
    window.L.DomEvent.disableScrollPropagation(container);
    return container;
  };
  control.addTo(map);

  const controlContainer = control.getContainer();
  const leafletCorner = controlContainer?.parentElement;
  const mapShell = map.getContainer().closest('[data-weather-map]');
  const mobileLayoutQuery = window.matchMedia('(max-width: 600px)');
  const syncControlPlacement = () => {
    if (!controlContainer || !leafletCorner || !mapShell) return;
    controlContainer.classList.toggle('is-below-map', mobileLayoutQuery.matches);
    if (mobileLayoutQuery.matches) {
      mapShell.after(controlContainer);
    } else if (controlContainer.parentElement !== leafletCorner) {
      leafletCorner.append(controlContainer);
    }
  };
  mobileLayoutQuery.addEventListener?.('change', syncControlPlacement);
  syncControlPlacement();
}

async function installHomeOverlays(map) {
  const [geoJson, alertState] = await Promise.all([
    fetchJson('counties/NC-county-topo.json', 'County geometry'),
    loadAlerts(),
  ]);
  const features = {
    type: 'FeatureCollection',
    features: (geoJson?.features || []).filter((feature) => (
      HOME_ZONE_BY_ID.has(feature?.properties?.zoneCode)
    )),
  };

  map.createPane('homeAlertPane').style.zIndex = '410';
  map.createPane('homeCountyCasingPane').style.zIndex = '455';
  map.createPane('homeCountyPane').style.zIndex = '460';
  map.getPane('homeCountyCasingPane').style.pointerEvents = 'none';

  const alertLayer = window.L.geoJSON(features, {
    pane: 'homeAlertPane',
    interactive: false,
    style: (feature) => {
      const alerts = alertState.alertsByZone.get(feature.properties.zoneCode) || [];
      const primary = primaryAlert(alerts);
      return {
        stroke: false,
        fill: true,
        fillColor: primary ? alertColor(primary) : '#000000',
        fillOpacity: primary ? 0.34 : 0,
      };
    },
  }).addTo(map);

  const countyLayer = window.L.geoJSON(features, {
    pane: 'homeCountyCasingPane',
    interactive: false,
    style: {
      color: '#06111c',
      opacity: 0.9,
      weight: 6,
      fill: false,
      lineCap: 'round',
      lineJoin: 'round',
    },
  }).addTo(map);

  const countyRenderer = window.L.svg({ pane: 'homeCountyPane', padding: 0.5 });
  countyRenderer.addTo(map);
  window.L.geoJSON(features, {
    pane: 'homeCountyPane',
    renderer: countyRenderer,
    style: {
      color: '#ffffff',
      opacity: 0.96,
      weight: 3.0,
      fill: true,
      fillColor: '#fbff00',
      fillOpacity: 0.001,
      lineCap: 'round',
      lineJoin: 'round',
    },
    onEachFeature(feature, layer) {
      const zone = HOME_ZONE_BY_ID.get(feature.properties.zoneCode);
      const alerts = alertState.alertsByZone.get(zone.zone) || [];
      const restingStyle = { color: '#ffffff', weight: 3.0, fillOpacity: 0.001 };
      const activeStyle = { color: '#fff200', weight: 3.4, fillOpacity: 0.25 };
      layer.bindTooltip(zone.label, {
        className: 'home-county-tooltip',
        direction: 'top',
        sticky: true,
      });
      layer.bindPopup(createCountyPopup(zone, alerts), {
        className: 'home-county-leaflet-popup',
        maxWidth: 320,
      });
      layer.on('mouseover', () => layer.setStyle(activeStyle));
      layer.on('mouseout', () => layer.setStyle(restingStyle));
      layer.on('add', () => {
        window.requestAnimationFrame(() => {
          const element = layer.getElement();
          if (!element) return;
          element.setAttribute('tabindex', '0');
          element.setAttribute('role', 'button');
          element.setAttribute(
            'aria-label',
            `${zone.label}. ${alerts.length ? `${alerts.length} current alert${alerts.length === 1 ? '' : 's'}.` : 'No current alerts.'} Open county options.`,
          );
          element.addEventListener('focus', () => layer.setStyle(activeStyle));
          element.addEventListener('blur', () => layer.setStyle(restingStyle));
          element.addEventListener('click', () => layer.openPopup());
          element.addEventListener('keydown', (event) => {
            if (!['Enter', ' '].includes(event.key)) return;
            event.preventDefault();
            layer.openPopup();
          });
        });
      });
    },
  }).addTo(map);

  const mapContainer = map.getContainer();
  const weatherRoot = mapContainer.closest('[data-county-weather-center]');
  const mobileMapQuery = window.matchMedia('(max-width: 600px)');
  const mobileCenter = [
    Number(weatherRoot?.dataset.conditionsMobileCenterLat),
    Number(weatherRoot?.dataset.conditionsMobileCenterLon),
  ];
  const mobileZoom = Number(weatherRoot?.dataset.conditionsMobileZoom);
  const hasMobileView = mobileCenter.every(Number.isFinite) && Number.isFinite(mobileZoom);
  const applyDefaultConditionsView = () => {
    if (mobileMapQuery.matches && hasMobileView) {
      map.setView(mobileCenter, mobileZoom, { animate: false });
      return;
    }
    map.fitBounds(countyLayer.getBounds(), {
      animate: false,
      maxZoom: 9,
      padding: [18, 18],
    });
  };
  mobileMapQuery.addEventListener?.('change', applyDefaultConditionsView);
  if (mobileMapQuery.matches) applyDefaultConditionsView();
  if (mapContainer.dataset.reportingStationCount) {
    applyDefaultConditionsView();
  } else {
    const stationRenderObserver = new MutationObserver(() => {
      if (!mapContainer.dataset.reportingStationCount) return;
      stationRenderObserver.disconnect();
      window.requestAnimationFrame(applyDefaultConditionsView);
    });
    stationRenderObserver.observe(mapContainer, {
      attributes: true,
      attributeFilter: ['data-reporting-station-count'],
    });
  }

  createMapKey(map, alertState.alertsByZone, alertState.failedZoneCount, alertLayer);
}

document.addEventListener('weather:conditions-map-ready', async (event) => {
  const { map, context } = event.detail || {};
  if (!map || !context?.isRegional || initializedMaps.has(map)) return;
  initializedMaps.add(map);
  try {
    await installHomeOverlays(map);
  } catch (error) {
    console.error('[home-weather-map] County and alert overlays failed:', error);
  }
});
