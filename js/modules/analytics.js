import { ANALYTICS_CONFIG } from './analytics-config.js';

const VALID_GA4_ID = /^G-[A-Z0-9]+$/;

function classifyLink(link) {
  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) return 'outbound';
  if (url.pathname.includes('/counties/')) return 'county';
  if (url.pathname.includes('tropical') || url.pathname.includes('/active/')) return 'tropical';
  if (link.closest('.nav-menu')) return 'primary_navigation';
  if (link.closest('.footer')) return 'footer_navigation';
  return 'internal';
}

export function initAnalytics() {
  if (window.__nchAnalyticsInitialized) return;
  window.__nchAnalyticsInitialized = true;

  const metaId = document.querySelector('meta[name="ga4-measurement-id"]')?.content?.trim();
  const measurementId = (metaId || ANALYTICS_CONFIG.measurementId || '').toUpperCase();
  if (!VALID_GA4_ID.test(measurementId)) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    anonymize_ip: true
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    window.gtag('event', 'link_click', {
      link_type: classifyLink(link),
      link_text: (link.textContent || link.getAttribute('aria-label') || '').trim().slice(0, 100),
      link_url: link.href
    });
  });
}
