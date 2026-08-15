# County UI Migration: Next-Session Plan

Updated: 2026-08-14  
Repository: `K:\Web Design\NCHurricane 2025`  
Status: implementation is complete in the working tree; final owner acceptance, full closeout regression, and an authorized commit remain pending.

## Resume order

1. Read the user-supplied `AGENTS.md` instructions in the session prompt. There is currently no tracked `AGENTS.md` at the repository root.
2. Read this document completely.
3. Run `git status --short` and `git log -3 --oneline` before editing.
4. Confirm the base checkpoint is still `cc5fd3d Update to the county pages' UI and workflow for modernization` on `main`.
5. Preserve the entire current dirty tree. Do not reset, discard, stage, commit, or deploy anything without fresh user authorization.
6. Start with owner visual review of the final alert modal before making another design change.

## Current checkpoint

The all-county UI migration is uncommitted and unstaged. It is based on the user-owned Bertie prototype committed at `cc5fd3d`.

Modified tracked files:

- `counties/beaufort/index.html`
- `counties/bertie/index.html`
- `counties/bertie/index_test.html`
- `counties/dare/index.html`
- `counties/hyde/index.html`
- `counties/js/countyApp.js`
- `counties/js/countyApp.multizone.js`
- `counties/martin/index.html`
- `counties/pitt/index.html`
- `counties/san-diego/index.html`
- `counties/tyrrell/index.html`
- `counties/washington/index.html`

Deleted superseded files:

- `counties/css/county_old.css`
- `counties/bertie/css/weather-center.css`
- `counties/bertie/js/weatherCenter.js`
- `counties/bertie/js/weatherMaps.js`

New untracked implementation files:

- `counties/css/county.css`
- `counties/js/countyAlerts.js`
- `counties/js/countyContext.js`
- `counties/js/weatherCenter.js`
- `counties/js/weatherMaps.js`

This handoff file is also new and untracked.

## Completed this session

### All-county migration

- Applied the approved structure and visual design from `counties/bertie/index_test.html` to all nine live county pages.
- Included San Diego.
- Preserved single-zone loading for Beaufort, Bertie, Martin, Pitt, Tyrrell, and Washington.
- Preserved multi-zone loading for Dare, Hyde, and San Diego, including URL/localStorage state and `./data/{zone}/...` paths.
- Preserved San Diego invalid-zone normalization and its local meteogram implementation.
- Integrated the Dare, Hyde, and San Diego zone selectors into the new styling.
- Added the smallest multi-zone lifecycle hook needed for shared maps and markers to follow an existing zone change.

### Shared UI architecture

- Consolidated the county styles into `counties/css/county.css`.
- Generalized the Bertie weather-center controller into `counties/js/weatherCenter.js`.
- Generalized the Bertie map configuration/controller into `counties/js/weatherMaps.js`.
- Added `counties/js/countyContext.js` for county/zone-aware configuration.
- Removed references to the superseded Bertie-only controllers and CSS. A final reference search found no remaining references.

### Wordmark

- Added the approved `ChuckCopeland` + lightning bolt + `WX` wordmark configuration to every live county navigation bootstrap.
- Preserved the accessible `ChuckCopelandWx home` label.

### Responsive alerts

- Added shared alert rendering in `counties/js/countyAlerts.js`, used by both standard and multi-zone county builders.
- Replaced long inline alert accordions with a compact alert tray and a native dialog.
- The dialog is a true vertically and horizontally centered modal at every breakpoint.
- Preserved the user's requested modal width of exactly `95%`.
- Alert selectors wrap into a responsive grid; there is no horizontal selector scrolling.
- Mobile uses one compact summary row before the modal opens.
- Tablet uses a compact two-column page-level alert grid.
- Desktop uses a single compact page-level alert rail.
- Modal content scrolls internally and never moves or resizes the map.
- Implemented Close, Escape, focus restoration, background scroll locking, backdrop dismissal, and left/right/Home/End alert-selector keyboard navigation.
- The selected alert changes title, color, severity, urgency, and affected area.
- When several alert records contain identical source text, the modal identifies it as a shared NWS bulletin instead of fabricating different event text.

## Non-negotiable preservation rules

This remains a UI-only migration. Do not alter:

- JSON or generated weather data.
- API/cache scripts.
- Stations, station order, station links, or station-detail behavior.
- Forecast or alert zones.
- Radar or satellite sources, source-selection values, or fallback ordering.
- County backgrounds.
- SEO, structured data, analytics, or canonical URLs.
- Meteogram IDs, lazy initialization, timeframe controls, chart parameters, or zone-specific hourly data.
- The validated interactive-map engine, frame handling, playback, scrubbers, legends, boundary behavior, controls, fallbacks, or hybrid station-detail presentation.

Do not fix source/data defects as part of a UI closeout. Record and route them separately.

## Validation evidence from this session

### Static and syntax checks

- JavaScript syntax checks passed for the shared county modules, including `countyAlerts.js`, `countyApp.js`, and `countyApp.multizone.js`.
- `git diff --check` passed. Git reported only expected LF-to-CRLF working-copy warnings.
- No JSON, data, API, cache, or generated-file changes were present.
- No remaining HTML/CSS/JS references to `county_old.css` or the superseded Bertie-only weather-center/map files were found.
- All ten county/prototype navigation bootstraps were verified to contain the approved wordmark configuration and current navigation-module version.

### Controlled-browser checks

- All nine live county pages loaded with the migrated weather center and no unexpected horizontal page overflow.
- Desktop and mobile layouts were checked across the county set during the migration.
- Every configured zone in Dare, Hyde, and San Diego was exercised during the migration; zone state, conditions, forecasts, meteogram, station markers, and map center followed the active zone.
- Conditions, Radar, Satellite, Forecast subtabs, station details, alerts, map controls, playback, scrubbers, legends, and responsive layout were exercised during the migration.
- The approved wordmark rendered on all nine live counties at desktop width; Beaufort and San Diego were also checked at mobile width.
- Alert-specific checks covered mobile, tablet portrait, tablet landscape, and desktop layouts.
- Dare Northern OBX rendered three alert choices; Hyde Ocracoke rendered two.
- The centered alert modal retained equal opposing viewport margins, used 95% width, and had zero horizontal selector overflow.
- Opening and switching alerts did not change the map's page position.
- Exactly one alert detail panel remained visible after each selector click.
- Keyboard selection, Escape, Close, focus return, and scroll-lock cleanup passed.
- Bertie's no-active-alert state remained intact.
- San Diego `?zone=invalid` still normalized to `?zone=coastal`.
- The final shared-bulletin/metadata treatment was browser-checked on Dare and Hyde with no captured errors.

### Owner checks

- The user reported that the migrated site was working before the wordmark correction.
- The user accepted the compact alert element and then preferred the centered modal over the initial bottom-sheet/right-drawer placement.
- The user preferred the modal at 95% width and without horizontal alert-selector scrolling.
- The latest selected-alert metadata and shared-bulletin explanation still need the user's final visual acceptance in the next session.

### External-provider checks

- Local page behavior and available map controls were exercised.
- Live third-party radar/satellite provider availability, latency, throttling, and production CORS behavior were not independently validated as a separate provider test in this closeout.

## Known findings intentionally not fixed

1. San Diego emitted the existing warning `[current] No cached data for station KETC`. This is a data/cache finding, not part of the UI migration.
2. Dare Northern OBX, Dare Hatteras, and Hyde Ocracoke multi-alert files contain one identical combined NWS description for every active alert in the file. Their instructions are also duplicated. The UI now explains this accurately; do not split or rewrite the source bulletin.
3. In cached Dare Northern OBX data, some `headline` dates do not agree with the displayed `expires` field (for example, a headline can mention October 15 while `expires` produces October 14 at 8:30 AM). This was not researched or corrected because data/source work was explicitly out of scope.

## Validation gaps to close next session

1. No single-zone county currently has active local alert data, so the active-alert modal was not browser-exercised through the standard single-zone builder. The standard builder calls the same shared alert renderer and its no-alert path passed, but active-state runtime coverage remains desirable.
2. No current local alert file contains more than three alerts, so the page-level `View all` control for four or more alerts was not browser-tested.
3. Every current multi-alert sample uses a shared combined bulletin, so switching between genuinely different alert descriptions could not be tested against current repository data.
4. Backdrop dismissal was implemented but was not isolated as a separate final browser assertion after the last metadata change.
5. Third-party provider behavior remains a separate external validation category.

Use temporary/non-production test fixtures or naturally available current alerts to close alert-count and distinct-bulletin coverage. Do not edit generated county JSON merely to manufacture a test case.

## Added requirement: viewport-aware station markers

This is a separate follow-up from the completed UI migration. Do not implement it as an incidental closeout edit.

- Preserve the complete configured station inventory, its order, links, observation data, and station-detail behavior. Viewport filtering must control marker materialization only; it must not delete or rewrite station configuration.
- Use a buffered viewport rather than the exact visible bounds. A station remains eligible while its marker is partly visible, including when roughly half of the marker is outside the map. Derive the pixel padding from the existing marker dimensions (`112x50` or `112x62`) instead of relying only on a latitude/longitude percentage.
- Re-evaluate eligible markers after the map settles following pan or zoom. Add newly eligible markers and retire markers outside the buffer without duplicate markers, handlers, or stale station details.
- If the inventory is later expanded statewide, do not fit the initial county/zone map to the full statewide station list. Preserve the intended county or active-zone starting view, and reveal additional station markers as the user pans or zooms out.
- Keep zone changes authoritative in Dare, Hyde, and San Diego. A zone switch must update the station inventory, map center/view, buffered marker set, observations, and station details for the active zone only.
- Do not use clustering as a substitute unless separately approved; the requested behavior is viewport-aware availability of individual station markers.
- Distinguish marker rendering from observation-data transfer. The current controller fetches one `current.json` before rendering, so viewport-aware marker creation alone will reduce Leaflet/DOM work but will not make that JSON request smaller. True viewport-scoped network loading would require separate source/data architecture and must not be introduced during the UI-only closeout.

Research and owner decisions still needed:

1. Confirm whether “load” means deferred Leaflet marker creation only or also a future viewport-scoped observation request. Treat the latter as a separate non-UI phase with its own source-preservation ledger.
2. Decide whether the reporting label should describe the buffered visible set, the full loaded inventory, or both (for example, `12 visible · 84 reporting statewide`).
3. Define the initial county/zone view independently of a future statewide station inventory so an expanded list cannot force an unintended statewide `fitBounds`.
4. Decide how an open station-detail panel behaves if its marker leaves the buffer during a pan or zoom; preserving the selected marker until the panel closes is the preferred continuity behavior to evaluate.

## Alternatives discussed but intentionally not retained

These are not unfinished requirements. Revisit only if the user asks:

- A capped inline accordion with internally scrolling details.
- Compact individual alert rows opening a bottom sheet.
- A dedicated Alerts tab/view that replaces the map temporarily.
- The initial responsive bottom-sheet/right-drawer detail viewer. It was implemented, reviewed, and replaced by the centered modal.
- Alert content floating directly over the map.
- A moving alert ticker.
- Artificially parsing a combined NWS bulletin into event-specific prose.

## Next-session execution plan

### Phase 1: owner acceptance of the final alert treatment

1. Hard-refresh Dare Northern OBX and review the centered modal at mobile and desktop widths.
2. Select all three alert choices and confirm the title, color, metadata, and shared-bulletin explanation are clear.
3. Review Hyde Ocracoke's two-alert modal.
4. Make only narrowly approved visual refinements.

### Phase 2: close the remaining alert validation gaps

1. Exercise an active alert through the standard single-zone builder without modifying production/generated JSON.
2. Exercise four-or-more-alert behavior and the `View all` control with a temporary test harness or naturally available data.
3. Exercise two alerts with genuinely different bulletin descriptions.
4. Explicitly test backdrop dismissal after the final design is accepted.

### Phase 3: viewport-aware station-marker pilot

1. Inventory the current station-loading and marker lifecycle without altering config or generated observation files.
2. Add buffered, pixel-aware marker eligibility to the shared conditions-map controller while preserving the existing data loader.
3. Keep the selected station marker/detail presentation stable while the map moves, according to the owner-approved continuity rule.
4. Pilot one single-zone county and San Diego, including every San Diego zone, before applying the shared behavior to the remaining counties.
5. Test pan and zoom boundaries at mobile, tablet, and desktop widths, including markers that are approximately half outside each edge of the map.
6. Test a temporary/non-production statewide-size station list for bounded marker creation at county zoom and progressive marker appearance as the user zooms out. Do not modify production/generated JSON to create the fixture.
7. Measure both total configured stations and live Leaflet marker count so the validation report proves that off-screen markers are deferred.

### Phase 4: full migration regression

1. Re-run all nine counties at desktop and mobile widths.
2. Exercise every zone in Dare, Hyde, and San Diego.
3. Recheck Conditions, Radar, Satellite, every Forecast subtab, station details, alerts, map controls, playback, scrubbers, legends, meteograms, and responsive layout.
4. Run live-provider checks separately and report any provider/network limitations without changing source selection or fallback behavior.

### Phase 5: source-preservation closeout

1. Compare all weather/source references against the pre-migration state.
2. Confirm no JSON/data/API/cache/generated diffs.
3. Confirm no superseded CSS/JS references remain.
4. Run JavaScript syntax checks and `git diff --check`.
5. Record tests, controlled-browser checks, owner checks, and external-provider checks as separate categories.

### Phase 6: checkpoint review and commit

1. Review the exact final file list and diff with the user.
2. Stage only the authorized county migration, alert UI, and this handoff if the user approves.
3. Commit only after explicit authorization.
4. Do not deploy or push unless separately requested.
