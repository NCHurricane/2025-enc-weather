# NCHurricane.com marketing readiness

This document separates code-complete marketing infrastructure from account-owned launch work. Do not add placeholder IDs to production.

## Measurement plan

Use a verified analytics property to answer specific product questions:

- Acquisition: landing page, source/medium, referring domain, geographic market, and organic search query data from Search Console.
- Engagement: county selection, basin selection, radar/satellite tab use, accordion opens, active-storm visits, official-source clicks, and portfolio CTA clicks.
- Retention: new versus returning visitors, return frequency, and event-weather cohorts compared with routine-weather periods.
- Quality: Core Web Vitals, JavaScript errors, API/data freshness failures, broken links, and accessibility regression counts.

Do not publish outcome claims until the date range, sample size, event definitions, and source are documented. Annotate major weather events and deployments so traffic changes are not misattributed to marketing work.

## Analytics activation checklist

1. Create or confirm the production GA4 property and data stream.
2. Review privacy, consent, retention, and regional requirements.
3. Update `privacy.html` with the provider and the final choices before collection begins.
4. Add the verified `G-...` ID to `js/modules/analytics-config.js`.
5. Confirm that one page view and one delegated `link_click` event arrive in DebugView without duplicate tags.
6. Define conversions only after the event taxonomy is stable. Recommended candidates are official-source clicks, county-page engagement, tropical-product engagement, and the case-study portfolio CTA.
7. Apply internal-traffic and developer-traffic filters only after testing them in a non-active state.

The current source ships with a blank measurement ID, so it sends no request to Google Analytics.

## Search launch checklist

1. Deploy `robots.txt` and `sitemap.xml` at the site root.
2. Add a real Search Console verification method supplied by the verified site owner. Never commit a fabricated verification token.
3. Submit `https://nchurricane.com/sitemap.xml` in Search Console.
4. Inspect the homepage, both tropical hubs, the case study, and representative county pages.
5. Monitor indexing, canonical selection, structured-data errors, Core Web Vitals, and 404 trends.
6. Request re-indexing only after the deployed HTML and response headers are verified.

## Hosting checks

- Keep the existing CSP, HSTS, frame, MIME-sniffing, referrer, and permissions headers on public pages.
- Confirm the same baseline headers on PHP responses and custom errors.
- Set a single intentional cache policy per asset type. Avoid conflicting `Cache-Control` directives.
- Cache versioned CSS, JavaScript, fonts, and images for a long period; keep current weather JSON and dynamic PHP responses short-lived or `no-store` as appropriate.
- Confirm `/test/dashboard.php` returns 404 until the full allowlisted maintenance configuration is intentionally enabled.
- Confirm nonexistent storm IDs return 404 and never redirect to a neighboring storm directory.

## Release evidence

For each release, retain separate evidence for PHP lint, JavaScript syntax, JSON/JSON-LD/XML parsing, internal-link checks, controlled-browser behavior, response headers, and account-owned search/analytics verification. One category does not substitute for another.
