// Wrapper: San Diego County multi-zone initializer
import { initializePage } from '../../js/countyApp.multizone.js';
import * as countyData from '../../js/countyData.multizone.js';
import { initMeteogram } from './meteogram.js';

const SAN_DIEGO_ZONES = new Set(['coastal', 'valleys', 'mountains', 'deserts']);
const DEFAULT_ZONE = 'coastal';

function normalizeSelectedZone() {
  const url = new URL(window.location.href);
  const urlZone = url.searchParams.get('zone');
  const storedZone = localStorage.getItem('selectedZone');

  if (urlZone && !SAN_DIEGO_ZONES.has(urlZone)) {
    url.searchParams.set('zone', DEFAULT_ZONE);
    window.history.replaceState({}, '', url);
    localStorage.setItem('selectedZone', DEFAULT_ZONE);
    return;
  }

  if (!urlZone && storedZone && !SAN_DIEGO_ZONES.has(storedZone)) {
    localStorage.setItem('selectedZone', DEFAULT_ZONE);
  }
}

normalizeSelectedZone();
initializePage({ ...countyData, initMeteogram });
