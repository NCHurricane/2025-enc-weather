import { ANALYTICS_CONFIG } from './analytics-config.js?v=20260812-ga4';

const VALID_GA4_ID = /^G-[A-Z0-9]+$/;
const CONSENT_STORAGE_KEY = 'nch_analytics_consent_v1';
const CONSENT_GRANTED = 'granted';
const CONSENT_DENIED = 'denied';

function getConsentChoice() {
  const sessionChoice = window.__nchAnalyticsConsentChoice;
  if (sessionChoice === CONSENT_GRANTED || sessionChoice === CONSENT_DENIED) {
    return sessionChoice;
  }

  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === CONSENT_GRANTED || value === CONSENT_DENIED ? value : '';
  } catch {
    return '';
  }
}

function saveConsentChoice(value) {
  window.__nchAnalyticsConsentChoice = value;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch {
    // The current-page choice still applies when storage is unavailable.
  }
}

function clearAnalyticsCookies() {
  const cookieNames = document.cookie
    .split(';')
    .map(cookie => cookie.split('=')[0].trim())
    .filter(name => name === '_ga' || name.startsWith('_ga_'));
  const rootDomain = window.location.hostname.replace(/^www\./, '');

  cookieNames.forEach(name => {
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=.${rootDomain}; SameSite=Lax`;
  });
}

function classifyLink(link) {
  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) return 'outbound';
  if (url.pathname.includes('/counties/')) return 'county';
  if (url.pathname.includes('tropical') || url.pathname.includes('/active/')) return 'tropical';
  if (link.closest('.nav-menu')) return 'primary_navigation';
  if (link.closest('.footer')) return 'footer_navigation';
  return 'internal';
}

function bindLinkTracking() {
  if (window.__nchAnalyticsLinkTracking) return;
  window.__nchAnalyticsLinkTracking = true;

  document.addEventListener('click', event => {
    if (getConsentChoice() !== CONSENT_GRANTED) return;
    const link = event.target.closest('a[href]');
    if (!link) return;
    window.gtag?.('event', 'link_click', {
      link_type: classifyLink(link),
      link_text: (link.textContent || link.getAttribute('aria-label') || '').trim().slice(0, 100),
      link_url: link.href
    });
  });
}

function loadAnalytics(measurementId) {
  if (window.__nchAnalyticsLoaded) return;
  window.__nchAnalyticsLoaded = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied'
  });
  window.gtag('consent', 'update', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'granted'
  });
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    anonymize_ip: true
  });

  const script = document.createElement('script');
  script.async = true;
  script.id = 'nch-ga4-script';
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
  bindLinkTracking();
}

function grantAnalyticsConsent(measurementId) {
  if (!window.__nchAnalyticsLoaded) {
    loadAnalytics(measurementId);
    return;
  }

  window.gtag?.('consent', 'update', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'granted'
  });
}

function announceConsent(message) {
  let status = document.getElementById('analytics-consent-status');
  if (!status) {
    status = document.createElement('p');
    status.id = 'analytics-consent-status';
    status.className = 'visually-hidden';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    document.body.appendChild(status);
  }
  status.textContent = message;
}

function renderConsentPrompt(measurementId, options = {}) {
  const existing = document.getElementById('analytics-consent');
  if (existing) {
    if (options.focus) existing.focus();
    return;
  }

  const currentChoice = getConsentChoice();
  const returnFocus = options.returnFocus instanceof HTMLElement ? options.returnFocus : null;
  const panel = document.createElement('section');
  panel.id = 'analytics-consent';
  panel.className = 'consent-dialog';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', 'analytics-consent-title');
  panel.setAttribute('tabindex', '-1');
  panel.innerHTML = `
    <div class="consent-dialog__copy">
      <h2 id="analytics-consent-title" class="section-heading consent-dialog__title">Optional analytics</h2>
      <p>May we use Google Analytics to understand site usage and improve NCHurricane.com? Advertising personalization and Google Signals remain disabled. <a href="/privacy.html">Read the privacy notice</a>.</p>
      ${currentChoice ? `<p class="consent-dialog__current">Current choice: <strong>${currentChoice === CONSENT_GRANTED ? 'Allowed' : 'Declined'}</strong></p>` : ''}
    </div>
    <div class="consent-dialog__actions">
      <button type="button" class="consent-dialog__button consent-dialog__button--allow" data-consent-choice="${CONSENT_GRANTED}">Allow analytics</button>
      <button type="button" class="consent-dialog__button consent-dialog__button--decline" data-consent-choice="${CONSENT_DENIED}">Decline</button>
      ${currentChoice ? '<button type="button" class="consent-dialog__close" data-consent-close>Close</button>' : ''}
    </div>
  `;

  panel.addEventListener('click', event => {
    const choiceButton = event.target.closest('[data-consent-choice]');
    if (choiceButton) {
      const choice = choiceButton.dataset.consentChoice;
      saveConsentChoice(choice);
      panel.remove();

      if (choice === CONSENT_GRANTED) {
        grantAnalyticsConsent(measurementId);
        announceConsent('Analytics have been allowed.');
      } else {
        if (window.__nchAnalyticsLoaded && window.gtag) {
          window.gtag('consent', 'update', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'denied'
          });
        }
        clearAnalyticsCookies();
        announceConsent('Analytics have been declined.');
      }

      returnFocus?.focus();
      return;
    }

    if (event.target.closest('[data-consent-close]')) {
      panel.remove();
      returnFocus?.focus();
    }
  });

  document.body.appendChild(panel);
  if (options.focus) panel.focus();
}

function bindConsentPreferences(measurementId) {
  if (window.__nchConsentPreferencesBound) return;
  window.__nchConsentPreferencesBound = true;

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-analytics-preferences]');
    if (!trigger) return;
    event.preventDefault();
    renderConsentPrompt(measurementId, { focus: true, returnFocus: trigger });
  });
}

export function initAnalytics() {
  if (window.__nchAnalyticsInitialized) return;
  window.__nchAnalyticsInitialized = true;

  const metaId = document.querySelector('meta[name="ga4-measurement-id"]')?.content?.trim();
  const measurementId = (metaId || ANALYTICS_CONFIG.measurementId || '').toUpperCase();
  if (!VALID_GA4_ID.test(measurementId)) return;

  bindConsentPreferences(measurementId);
  const consentChoice = getConsentChoice();
  if (consentChoice === CONSENT_GRANTED) {
    loadAnalytics(measurementId);
  } else if (!consentChoice) {
    renderConsentPrompt(measurementId);
  }
}
