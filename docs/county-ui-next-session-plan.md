# County UI: Current Handoff

Updated: 2026-08-24
Repository: `K:\Web Design\NCHurricane 2025`
Status: the current committed checkpoint is `1f6b0b1`. The all-county UI migration, viewport-aware/statewide Conditions work, shared city-label workflow, shared CSS ownership follow-up, Hazardous Weather Outlook integration, nested county navigation, and sitemap CSS Phases 1-4 are implemented in the committed history described below. Shared map UI Phase 5 is complete locally and owner-accepted at the reported overall level; committing it and beginning sitemap CSS Phase 6 remain gated. There is no additional authorized county product phase. Do not push, deploy, or change generated/runtime data without explicit authorization.

The complete August 2026 migration and validation ledger is preserved at [`docs/archive/county-ui/county-ui-migration-ledger-2026-08.md`](archive/county-ui/county-ui-migration-ledger-2026-08.md).

## Resume order

1. Read the repository-root `AGENTS.md` and apply any newer user instructions.
2. Read this handoff completely.
3. Run `git status --short --branch` and `git log -8 --oneline`.
4. Preserve every existing working-tree change. Do not infer ownership or completion from an uncommitted file.
5. Use the archived ledger only for historical evidence; it is not authorization to resume a completed phase.
6. Do not start another county product/source/UI phase unless the user explicitly requests it.

## Current repository boundary

- At the 2026-08-23 documentation cleanup, `HEAD`, `main`, and `origin/main` were `7c46f80`.
- Before the cleanup began, the working tree already contained user-owned changes in all nine county pages, the Bertie prototype, county CSS/controllers, shared CSS, homepage/map modules, Tropical/Active modules, and an untracked `js/modules/mapBoundaryOverlays.js`.
- Those changes are not classified by this handoff. Audit and separate them before modifying or staging any overlapping file.
- The 2026-08-22 map-status slice changes only the status/note paths, the CSS needed to keep full mobile status text readable, matching asset cache-busters, and the site contract guard. It preserves concurrent font, attribution, Tropical SVG, satellite-provider, Active, fixture, and documentation work.
- `counties/data/*-current.json`, county weather output, shared HWO office cache, logs, and `test/output/` are generated/runtime artifacts. Do not delete, rewrite, or commit them as documentation cleanup.
- The sitemap CSS Phase 1-3 checkpoint is committed as `edc6a50`; the
  owner-accepted Phase 4 checkpoint is `1f6b0b1`. The current Phase 5 working
  tree changes shared map presentation classes/ownership, IDs or `data-*`
  hooks, semantic hidden state, cache versions, validation contracts, and
  these handoffs. Products, sources, stations, zones, camera/data lifecycle,
  popup content, and generated/runtime data remain outside this slice.

## Committed checkpoints

| Commit | Retained result |
| --- | --- |
| `9b5fbf1` | All nine live county pages migrated from the accepted Bertie prototype to the shared weather-center UI, alerts, maps, and county context. |
| `69c365a` | Viewport-aware markers combined with the North Carolina statewide Conditions source/catalog and mobile zoom policy. |
| `6d14cb2` | Token-free bounded NWS observation cache, statewide station/city thinning, shared city labels, marker geometry/anchor correction, atomic publication, and local fallback. |
| `9e3ecb6` | Shared scoped editorial city favorites; Greenville is `tropical` and `homepage`, with no current `county` favorite. |
| `ca89d62` | Shared weather-center CSS ownership moved into `css/components.css`/`css/styles.css` while county-specific presentation remained in `counties/css/county.css`. |
| `7c46f80` | Hazardous Weather Outlook integration and nested `Counties` > `Non-NC Counties` navigation, including San Diego, committed. |
| `edc6a50` | Sitemap CSS architecture Phases 1-3, self-hosted Leaflet 1.9.4, and owner-directed retirement of obsolete static pages/resources. |
| `1f6b0b1` | Owner-accepted sitemap CSS Phase 4 BEM components, state hooks, accessibility target/focus corrections, and validator ownership guards. |

## Current durable behavior

### County and zone ownership

- Beaufort, Bertie, Martin, Pitt, Tyrrell, and Washington retain standard single-zone loading.
- Dare, Hyde, and San Diego retain URL/localStorage zone state, active-zone data paths, invalid-zone normalization, and complete zone lifecycle.
- San Diego retains its local Conditions source, local meteogram implementation, and zone-specific exceptions.
- A zone change remains authoritative for map center, station inventory, observations, marker set, details, forecasts, alerts/HWO, meteogram, and map products.

### Alerts and Hazardous Weather Outlooks

- The `alerts` array remains the only authority for active-alert counts, alert selectors/dialogs, homepage warning color, and warning overlays.
- HWO is a separate official NWS product selected by exact office and active forecast zone. It must never inflate or replace alert semantics.
- HWO publication remains bounded, lock-aware, identity-checked, atomic, and last-known-good preserving.
- Current or still-valid HWO appears beside the alert element. If no displayable HWO exists, no HWO wrapper remains and the alert element uses the full row.
- Alert and HWO controls use the shared centered modal. Desktop uses the accepted constrained width; tablet/mobile retain the scoped 95% width, internal scrolling, no horizontal selector overflow, focus restoration, Escape/Close/backdrop dismissal, and scroll-lock cleanup.
- Shared source bulletins must be described truthfully. Do not fabricate event-specific text.

### Conditions markers and labels

- The North Carolina statewide catalog remains complete and authoritative; viewport filtering controls marker materialization, not configuration or station deletion.
- Initial county/zone centers and responsive zoom policies remain authoritative. Do not fit the opening map to the full statewide inventory.
- Marker reconciliation remains buffered, viewport-aware, collision-thinned, generation-safe, and incremental.
- A selected marker with an open detail panel remains mounted until the detail closes.
- Observation transfer and marker rendering remain separate concerns. Do not introduce a new data/source architecture as a UI closeout.
- Editorial city priorities belong only in `js/data/map-city-favorites.json` with explicit `tropical`, `homepage`, or `county` scope and `minZoom`; do not edit large source/derived city datasets for a favorite.

### Interactive maps and presentation

- Preserve station order, zones, provider/product selectors, fallback order, county backgrounds, maps, frame counts, playback/pause, scrubbers, legends, boundary behavior, basemaps, meteograms, and responsive layout.
- Homepage and live county Conditions maps identify `NWS observations` with the latest observation time and freshness count. Radar and Satellite retain provider, frame time, and `Frame n of n`; mobile timestamp overlays wrap instead of clipping those fields.
- `weather-map-note` remains only for the live county Conditions instruction. Removed Radar, Satellite, homepage, Tropical, and prototype notes are not runtime dependencies, and CSS contains no selectors scoped only to those retired notes.
- Preserve the current retained ready-layer animation behavior; readiness timing alone is not an equivalent replacement.
- Shared weather-center structure belongs in shared components, and shared map
  cards, controls, timestamps, legends, markers, and city labels belong in
  `css/interactive-weather-map.css`. County forecast, observation-popup,
  alert-detail, multi-zone, San Diego, and explicit County variants remain
  county-owned.
- The Bertie prototype remains a prototype. Do not promote it to a live page without explicit authorization.

## Shared header breadcrumb follow-up: 2026-08-23

- The user-authorized shared navigation follow-up adds a visible, transparent second header row on interior pages while leaving the homepage unchanged. County pages render `Home > Counties > {County}`; `Counties` remains a truthful non-link category because the site has no Counties landing page.
- Breadcrumbs represent stable page hierarchy only. Dare, Hyde, and San Diego zone query/localStorage state remains owned by the county controllers and does not create or change breadcrumb levels.
- The shared route resolver fails closed for unknown pages, uses an accessible `Breadcrumb` navigation landmark and ordered list, marks the current page with `aria-current="page"`, and gives links a 24-pixel minimum height. All 20 shared stylesheet/navigation consumers use the matching `20260823-breadcrumbs-1` cache key.
- Static/automated: JavaScript syntax passed; six focused breadcrumb route tests passed; the site validator passed 20 HTML files, 307 JSON files, and 156 local references; and `git diff --check` passed before this documentation update.
- Local HTTP/browser: the versioned stylesheet and navigation module returned `200`. Dare at `1280x900` and `390x844` showed the intended trail with no horizontal overflow; the mobile header left a visible gap before the heading, and the menu opened below the full two-row header, closed with Escape, and restored hamburger focus. Home navigation removed the breadcrumb, and browser Back restored the Dare URL and trail. Tropical, Active, and Accessibility representative pages also had correct trails, no horizontal overflow, and no captured console errors or warnings at both viewport sizes.
- Owner smoke, deployment, and production behavior remain open. The breadcrumb follow-up did not change county zones, data, alerts/HWO, Conditions, maps, forecasts, generated/runtime files, or provider contracts.

## Open gates and known limitations

- The 2026-08-23 homepage county-popup mobile follow-up scopes Leaflet paragraph margins to `.home-county-leaflet-popup` at the base popup level, reducing the default vertical gaps without relying on a mobile media-query match or changing Tropical and other popup families. The homepage uses the matching `20260823f` `home.css` cache key. Owner re-smoke on the reported S23 Ultra remains open.
- The map-status slice passed JavaScript syntax checks, 14 focused Tropical/Active tests, `git diff --check`, and controlled browser checks at `1280x900` and `390x844` on the homepage, Beaufort, Dare, San Diego, Tropical, and Active. Conditions/Radar/Satellite status text was present and unclipped, map widths stayed bounded, and the exercised console had no errors or warnings. The site validator's new map-status/note guards passed, but the repository-level command remains blocked by the concurrent static skip link in `active/index.html`.
- Owner follow-up after the map-status/note cleanup reported, "Everything seems to pass." No exact pages, devices, or viewport sizes were supplied, so the evidence is retained only at that overall granularity.
- Navigation owner smoke passed for the committed nested desktop/mobile workflow.
- The owner confirmed keyboard activation for the current HWO button and previously accepted the disclosure treatment. The archived record does not contain a later owner acceptance for every side-by-side/modal refinement; treat that narrower visual owner gate as open unless the owner explicitly confirms it.
- The shared CSS follow-up has controlled-browser evidence in the archive, but its historical record says owner smoke was still open. Do not silently promote controlled-browser evidence to owner acceptance.
- Production deployment, scheduler/cache publication, production PHP/CA configuration, and production provider freshness remain unverified unless separately recorded after deployment authorization.
- Provider availability, missing-station cache warnings, and meteogram `No data for timeframe: 0` warnings are time-dependent/runtime findings. Reproduce before treating them as current defects.

## Best next course: dirty-tree reconciliation and closeout

There is no open county feature phase in this plan. The next bounded county task should be:

The separately authorized sitemap-wide CSS Phases 3 through 5 changed County
title/text roles plus general and shared-map component presentation/ownership.
Phase 4 migrated
the weather tabs, conditions/forecast subtabs, multi-zone selector, shared
alert/HWO dialog shell, navigation menu, and back-to-top control to BEM classes
with `data-*` JavaScript hooks. It added `aria-pressed` to the zone selector,
44-pixel minimum targets, container-based selector/tab layout, and explicit
opener-focus restoration for Close, Escape, and backdrop dialog dismissal.

Phase 5 migrated the shared map card, toolbars, fields, canvases, fallbacks,
timestamps, status overlays, timelines, legends, basemap menu, markers, and
city labels to their approved BEM contracts with IDs/`data-*` hooks and no
legacy aliases. Valid explicit Bertie, Dare, and San Diego routes passed the
desktop/mobile map, target-size, product/zone switch, loading-state, local
response, console, and horizontal-overflow gates. Popup content remains frozen
for Phase 6, which has not been authorized. The owner reported, "Ok, visual
acceptance passed." No exact County page, device, viewport, or interaction was
supplied, so the evidence is retained only at the overall Phase 5 level.

These CSS phases preserved URL/localStorage ownership, zone validation, data
paths, stations, alert/HWO content, maps, products, and generated output. The
unresolved pre-existing lifecycle defect remains: after San Diego stores the
zone value `coastal`, opening Dare without an explicit zone query requests
`counties/dare/data/coastal/current.json`, `forecast.json`, and `alerts.json`;
all three return `404` rather than normalizing to an allowed Dare zone. Valid
explicit Dare/Hyde/San Diego zone URLs passed the Phase 4 selector, heading,
target-size, dialog, and overflow gates with no console warnings or errors.
This finding is evidence for a future bounded County lifecycle fix; it was not
implemented or authorized as part of the CSS architecture work.

1. Inventory the current county/shared-map working-tree diff against `7c46f80` without editing it.
2. Separate county-owned changes from Active/Tropical map-consistency, shared boundary, city-label, homepage, CSS, and unrelated work.
3. Identify the user-authorized slice and its preservation boundary before making further changes.
4. Validate that slice narrowly first, then expand only according to shared-module impact.
5. Update this handoff with exact current evidence and remaining gates; do not append another historical migration narrative here.

## Validation categories for the next county slice

Report independently:

1. **Static/automated:** `node --check` for changed JavaScript, `php -l` for changed PHP, changed JSON parsing, focused tests, `node scripts/validate-site.mjs` where references/public pages are affected, reference searches, and `git diff --check`.
2. **Fixture/runtime/API:** deterministic alert/HWO/source states, exact office/zone identity, generated-cache success/fallback, bounded publication, and local HTTP/schema checks without altering production/generated fixtures.
3. **Controlled browser:** representative desktop near `1280x900` and mobile near `390x844`; standard county, multi-zone county, San Diego, affected maps/tabs/dialogs, keyboard/focus, rapid zone/product changes, console, network, and horizontal overflow.
4. **Owner smoke:** record only the exact page/device/case the owner confirms.
5. **External provider:** record live NWS/NOAA availability and freshness separately from local correctness.
6. **Deployment/production:** remains open unless separately authorized and verified.

## Historical record

- [Complete August 2026 county migration and validation ledger](archive/county-ui/county-ui-migration-ledger-2026-08.md)

The archive retains completed phases, superseded dimensions/zoom/source decisions, exact historical browser evidence, alternatives, and known findings. It is evidence, not a backlog or authorization source.

## Ready-to-paste continuation prompt

```text
Continue the NCHurricane county/shared-map closeout in K:\Web Design\NCHurricane 2025.

Read AGENTS.md and docs/county-ui-next-session-plan.md completely, then run `git status --short --branch` and `git log -8 --oneline`. Preserve every existing working-tree change. Do not stage, commit, push, deploy, edit generated/runtime data, or begin a new county product phase unless I explicitly authorize it.

The committed county checkpoint is 7c46f80. There is no open county feature phase. First perform a read-only reconciliation of the current county/shared-map diff, separate county work from Active/Tropical/boundary/city-label/shared-CSS changes, and propose the smallest coherent closeout slice with its dependencies and validation gates. Treat the archived migration ledger as historical evidence only.
```
