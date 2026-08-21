# County UI Migration: Next-Session Plan

Updated: 2026-08-20
Repository: `K:\Web Design\NCHurricane 2025`  
Status: the current county UI, marker-thinning, city-label, and token-free NWS statewide-conditions checkpoint is committed and pushed at `6d14cb2`. The current Tropical follow-up also adds uncommitted shared city-favorites support to the county/homepage label loader; its seeded records are Tropical-only, so county/homepage output is unchanged until an editorial record uses those scopes. Do not commit or deploy without explicit user authorization.

## Resume order

1. Read the user-supplied `AGENTS.md` instructions in the session prompt. There is currently no tracked `AGENTS.md` at the repository root.
2. Read this document completely.
3. Run `git status --short` and `git log -3 --oneline` before editing.
4. Confirm the current checkpoint is still `6d14cb2 Update to the last commit message to reflect the changes made to the weatherCenter.js file. The iconAnchor for the regular station marker size has been updated from [38, 48] to [38, 54] to better align with the visual representation of the marker on the map.` on `main` and matches `origin/main`.
5. Preserve the current tree. The only intended post-checkpoint change from this validation session is this handoff update.
6. There is no pending implementation phase in this plan. Continue only from the user's next explicit requirement. Treat `counties/data/nc-current.json` as generated runtime data, do not commit it, and do not deploy unless separately requested.

## Current checkpoint

The original all-county UI migration was committed at `9b5fbf1`, based on the user-owned Bertie prototype at `cc5fd3d`.

The user subsequently committed the combined marker and statewide-conditions checkpoint at `69c365a`. That commit intentionally includes the 632-entry `counties/nc-weather-stations.json`, `counties/api/cache_nc_conditions.php`, shared-source routing, the new mobile zoom-9 policy, the ten `weatherCenter.js?v=20260816-1` page references, the previously refreshed county JSON, and the Bertie coordinate edits.

The current checkpoint is `6d14cb2`. It replaces the statewide cache's original provider-specific implementation with direct NWS observation requests requiring no API token, retains atomic cache publication and safe local fallback, adds shared collision-thinned city labels to Conditions/Radar/Satellite, adds statewide station thinning, and changes the regular marker geometry to `76x48` with anchor `[38,54]`. The catalog whitespace cleanup and all implementation work through that checkpoint are committed and pushed. The generated cache is ignored runtime output and is not part of the commit.

The uncommitted 2026-08-20 follow-up keeps editorial city priorities in `js/data/map-city-favorites.json` instead of modifying `us-cities-all.json` or `satellite-city-labels.json`. Records scoped to `county` or `homepage` bypass their normal rank threshold at `minZoom` and take collision priority while retaining configured home-location priority.

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

The list below records the preservation boundary used through the marker-only closeout at `9b5fbf1`. The user-authorized `69c365a` and `6d14cb2` checkpoints superseded the JSON/API and single-`current.json` restrictions specifically for the North Carolina statewide conditions path. Do not use the historical boundary to undo that committed work. Outside that committed exception, do not alter:

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
- No JSON, data, API, cache, or generated-file changes were present at the committed `9b5fbf1` migration checkpoint. The current working tree now contains separately owned generated weather JSON plus the four-coordinate Bertie config edit inventoried below; none was introduced by the marker implementation.
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
- The user accepted the final selected-alert metadata and shared-bulletin treatment on 2026-08-15.

### External-provider checks

- App-integrated live checks loaded 12-frame interactive radar and satellite products throughout the 30-state desktop/mobile regression. Radar remained interactive in every state. Satellite remained interactive in 29 states; Bertie desktop timed out once and correctly switched to the existing NOAA STAR latest-image fallback, then loaded interactively during the mobile pass.
- Direct standalone Chrome navigation to both NOAA NowCOAST GetCapabilities endpoints was blocked at the browser client layer with `ERR_BLOCKED_BY_CLIENT`. This is a direct-probe limitation, not evidence that the provider was unavailable, because the app-integrated NowCOAST tiles and frames loaded successfully.
- Provider availability remains time-dependent. The closeout did not change source selection, fallback ordering, or CORS behavior.

### Phase 4 controlled-browser regression on 2026-08-15

- Chrome exercised 15 county/zone states at `1280x900` and `390x844`: all six single-zone counties, all three Dare zones, both Hyde zones, and all four San Diego zones.
- Every state exercised all seven Conditions fields, viewport-marker counts, station details, temperature-map zoom and basemap controls, Radar, Satellite, playback, pause, scrubbers, legends, all four Forecast subtabs, and the meteogram.
- Every temperature map opened at zoom 10. Zoom controls produced `10 -> 11 -> 10`, and every condition's live-marker count matched both its visible count and rendered marker DOM count.
- Every interactive radar/satellite success exposed 12 frames, accepted play/pause and scrubber input, and rendered its product legend. The Bertie desktop satellite fallback remained usable after its provider timeout.
- Pitt's current single Heat Advisory opened and closed through the standard alert dialog on mobile. Other checked states reported no current active alert; the prior disposable alert fixture remains the authoritative coverage for multi-alert and `View all` behavior.
- No county/zone state had horizontal page overflow. No browser errors were captured.
- Ten existing meteogram warnings, `No data for timeframe: 0`, were captured while the affected meteogram canvases still rendered. They occurred in the shared East implementation and San Diego's local implementation and were left unchanged as current data/runtime findings.

### Post-commit combined validation at `69c365a`

- The committed tree was clean and matched `origin/main` before this follow-up. The commit contains the combined marker, statewide-source, catalog/cache, county JSON, coordinate, documentation, and cache-key work.
- JavaScript syntax passed for the shared context, weather-center, weather-map, alert, and county-app modules. PHP syntax passed for `counties/api/cache_nc_conditions.php`.
- The station catalog contains 632 unique, nonblank IDs and 632 valid North Carolina coordinates. `git show --check` found one trailing space in the final catalog URL entry; the post-commit follow-up removes that whitespace without changing data semantics.
- The generated `counties/data/nc-current.json` is absent locally. All eleven North Carolina county/zone states therefore emitted the expected statewide-cache 404 warning and completed the explicit `local-fallback` path without exposing an error state. San Diego remained on its intended local source.
- A 30-state matrix covered all 15 required county/zone states at `1280x900` and `390x844`. Desktop opened at zoom 10; mobile opened at the new zoom 9. Every state retained the expected source mode and active zone, live marker counts matched both visible counts and rendered marker elements, and no page overflowed.
- Bertie's fallback path passed all seven condition fields and station details. Live radar and satellite each loaded 12 frames with legends and playback, and all four Forecast subtabs plus the meteogram rendered.
- Rapid San Diego Coastal -> Mountains -> Valleys switching finished with Valleys-only local data at zoom 9. Rapid Dare Mainland -> Hatteras -> Northern switching finished with Northern-only local-fallback data at zoom 9. Mobile station details also passed.
- No browser errors were captured. The only warnings were the expected missing-statewide-cache 404 fallbacks.
- At that checkpoint, a generated statewide cache was not available, so live statewide-success validation remained open. The token-free NWS implementation and the completed success checks at `6d14cb2` below close that gap. The controlled missing-cache fallback evidence above remains valid because the consumer/fallback route is unchanged.

### Token-free NWS statewide validation at `6d14cb2`

- The committed tree matched `origin/main` at `6d14cb2` before this handoff update. After correcting the two stale handoff statements, no implementation or documentation reference to the removed provider remains.
- `counties/api/cache_nc_conditions.php` now requests the five latest observations directly from the NWS API with bounded concurrency, one bounded retry, minimum response/reporting thresholds, locking, and atomic publication. It requires no provider token.
- The generated `counties/data/nc-current.json` identified its source as `National Weather Service API` and contained 632 requested stations, 632 available responses, and 559 reporting stations. The source catalog contained 632 unique, nonblank IDs and 632 valid coordinates.
- JavaScript syntax passed for the context, weather-center, weather-map, shared city-label, alert, standard/multi-zone app, interactive-map, and meteogram modules. PHP syntax passed for the statewide cache script, and `git show --check` passed for `6d14cb2`.
- The 2026-08-20 city-favorites follow-up passed JavaScript syntax checks and the 44-test Tropical/shared-label suite; HTTP probes returned `200` for the homepage, Bertie County page, shared favorites asset/module, and updated weather-map controllers. Rendered verification remains an owner smoke because the controlled browser connection failed before page control.
- Chrome at `1280x900` loaded Bertie in `statewide` mode at zoom 10 with 632 configured and 559 reporting stations. Twenty visible/live markers matched the rendered marker count; all seven condition fields kept visible/live/DOM counts synchronized; station details opened; 35 collision-thinned city labels rendered; and the page had no horizontal overflow.
- The regular marker rendered at `76x48` with Leaflet offsets `-38px/-54px`, confirming the committed `[38,54]` anchor. Zooming `10 -> 11 -> 10` updated station spacing `96 -> 70 -> 96`, marker counts, and city-label counts without errors.
- Chrome at `390x844` reloaded Bertie in `statewide` mode at zoom 9 with 28 visible/live/rendered markers, 21 city labels, working station details, and no horizontal overflow.
- Rapid Dare `Mainland -> Hatteras -> Northern` switching ended on Northern OBX in `statewide` mode at the configured Northern center and zoom 9. Rapid San Diego `Coastal -> Mountains -> Inland Valleys` switching ended on Valleys in `local` mode with only the four active-zone markers. Both paths had synchronized marker counts, no overflow, and no captured browser warnings or errors.
- Reloading the page retained the statewide source and reporting totals. The earlier controlled missing-cache checks remain the authoritative safe-fallback evidence. Do not commit the generated cache.

## Known findings intentionally not fixed

1. San Diego emitted the existing warning `[current] No cached data for station KETC`. This is a data/cache finding, not part of the UI migration.
2. Dare Northern OBX, Dare Hatteras, and Hyde Ocracoke multi-alert files contain one identical combined NWS description for every active alert in the file. Their instructions are also duplicated. The UI now explains this accurately; do not split or rewrite the source bulletin.
3. In cached Dare Northern OBX data, some `headline` dates do not agree with the displayed `expires` field (for example, a headline can mention October 15 while `expires` produces October 14 at 8:30 AM). This was not researched or corrected because data/source work was explicitly out of scope.
4. The Phase 4 sweep captured `No data for timeframe: 0` warnings from both meteogram implementations while their canvases remained visible. This was not changed during the UI/source-preservation closeout.

## Alert validation gaps closed on 2026-08-15

A disposable HTML/config fixture exercised the exported standard single-zone initializer without editing production/generated county JSON. The fixture was removed after validation.

1. One active alert rendered and opened through `countyApp.js`'s standard single-zone `initializePage` path.
2. Five alerts rendered three page-level chips plus the `View all 5` control; the modal exposed all five selectors.
3. All five alerts used genuinely different descriptions. Each selector updated its own title, severity, urgency, affected area, and bulletin, with exactly one panel visible and no shared-bulletin notice.
4. The five-alert mobile selector grid had no horizontal overflow. Its intended vertical scrolling retained access to the complete selector set.
5. Backdrop dismissal closed the modal and restored page scrolling. No browser warnings or errors were captured.
6. Third-party provider behavior remains a separate external validation category.

## Added requirement: viewport-aware station markers

This section is the historical marker-only design record from before `69c365a`. The combined checkpoint retains the viewport-marker mechanics but supersedes the single-county observation-source decision and uses mobile zoom 9.

- Preserve the complete configured station inventory, its order, links, observation data, and station-detail behavior. Viewport filtering must control marker materialization only; it must not delete or rewrite station configuration.
- Use a buffered viewport rather than the exact visible bounds. A station remains eligible while its marker is partly visible, including when roughly half of the marker is outside the map. Derive the pixel padding from the existing marker dimensions (`112x50` or `112x62`) instead of relying only on a latitude/longitude percentage.
- Re-evaluate eligible markers after the map settles following pan or zoom. Add newly eligible markers and retire markers outside the buffer without duplicate markers, handlers, or stale station details.
- If the inventory is later expanded statewide, do not fit the initial county/zone map to the full statewide station list. Preserve the intended county or active-zone starting view, and reveal additional station markers as the user pans or zooms out.
- Keep zone changes authoritative in Dare, Hyde, and San Diego. A zone switch must update the station inventory, map center/view, buffered marker set, observations, and station details for the active zone only.
- Do not use clustering as a substitute unless separately approved; the requested behavior is viewport-aware availability of individual station markers.
- Distinguish marker rendering from observation-data transfer. The current controller fetches one `current.json` before rendering, so viewport-aware marker creation alone will reduce Leaflet/DOM work but will not make that JSON request smaller. True viewport-scoped network loading would require separate source/data architecture and must not be introduced during the UI-only closeout.

Historical pre-Phase 3 lifecycle inventory completed on 2026-08-15:

- `counties/js/weatherCenter.js` fetches one active county/zone `current.json`, clears the full Leaflet marker layer, and recreates every marker with an available value whenever the field or data changes.
- The initial render calls `fitBounds` with every configured station coordinate. That works for today's inventories of 3–10 stations but would incorrectly widen the opening view if the list becomes statewide.
- The existing count reports only stations with an available value; it does not expose the number of live Leaflet markers.
- The existing zone-change path reloads the active zone's context and observations and resets the map to the zone center, but viewport reconciliation must also remove the old zone's markers immediately and reject stale asynchronous work.

Owner policy decisions confirmed for the marker-only phase on 2026-08-15; items 1 and 3 were later superseded for the combined `69c365a` checkpoint:

1. “Load” means deferred Leaflet marker creation only. The existing single `current.json` request remains authoritative; viewport-scoped observation transfer is a separate future data/source phase.
2. The reporting label shows both counts: `N visible · M reporting`.
3. The initial county/zone view uses the configured center at zoom 10 and no longer fits to the station inventory.
4. A selected marker remains mounted with its open detail panel while it is outside the buffered viewport. It becomes eligible for retirement after the detail panel closes.

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

### Phase 1: owner acceptance of the final alert treatment — complete

Accepted by the user on 2026-08-15 with no additional visual refinement.

1. Hard-refresh Dare Northern OBX and review the centered modal at mobile and desktop widths.
2. Select all three alert choices and confirm the title, color, metadata, and shared-bulletin explanation are clear.
3. Review Hyde Ocracoke's two-alert modal.
4. Make only narrowly approved visual refinements.

### Phase 2: close the remaining alert validation gaps — complete

Completed on 2026-08-15 with a disposable, non-production fixture that was removed after testing.

1. Exercise an active alert through the standard single-zone builder without modifying production/generated JSON.
2. Exercise four-or-more-alert behavior and the `View all` control with a temporary test harness or naturally available data.
3. Exercise two alerts with genuinely different bulletin descriptions.
4. Explicitly test backdrop dismissal after the final design is accepted.

### Phase 3: viewport-aware station-marker pilot — complete

Completed on 2026-08-15.

- The shared conditions-map controller now reconciles an ordered station-record inventory against the settled Leaflet viewport after pan or zoom.
- Eligibility uses each marker's existing `112x50` or `112x62` size and anchor, retaining markers while any portion remains visible rather than using a latitude/longitude percentage.
- Marker creation/removal is incremental and keyed by station ID, preventing duplicate markers and handlers.
- The selected marker remains mounted while details are open; closing details re-runs eligibility.
- Zone changes immediately clear the prior marker set and use a generation boundary so stale asynchronous observation work cannot publish into the new zone.
- The existing observation request and full configured station inventory remain unchanged.
- All ten county/prototype HTML references use `weatherCenter.js?v=20260815-3`.

Validation evidence:

- Bertie retained all 10 reporting stations but reduced live markers from 10 to 2 at the tighter zoom used in the pilot. An off-screen selected marker and its detail panel remained stable.
- San Diego Coastal, Valleys, Mountains, and Deserts each reset to their configured center at zoom 10 with only the active zone's marker set. Rapid Coastal → Mountains → Valleys switching ended with a Valleys-only set.
- A disposable 144-station fixture materialized 3, 12, 56, and 144 markers at desktop zoom levels 10, 9, 8, and 7. It materialized 1 marker at mobile zoom 10 and 3 at tablet zoom 10.
- Mobile keyboard panning retained markers roughly half outside the left, right, top, and bottom map edges. Tablet and desktop pan/zoom reconciliation also passed.
- A final desktop and mobile sweep covered all single-zone counties plus every Dare, Hyde, and San Diego zone. Every state opened at zoom 10, live Leaflet counts matched rendered marker elements, no page overflow occurred, and no browser warnings/errors were captured.
- Temporary fixture files were removed after validation.

1. Inventory the current station-loading and marker lifecycle without altering config or generated observation files. **Complete.**
2. Add buffered, pixel-aware marker eligibility to the shared conditions-map controller while preserving the existing data loader. **Complete.**
3. Keep the selected station marker/detail presentation stable while the map moves, according to the owner-approved continuity rule. **Complete.**
4. Pilot one single-zone county and San Diego, including every San Diego zone, before applying the shared behavior to the remaining counties. **Complete.**
5. Test pan and zoom boundaries at mobile, tablet, and desktop widths, including markers that are approximately half outside each edge of the map. **Complete.**
6. Test a temporary/non-production statewide-size station list for bounded marker creation at county zoom and progressive marker appearance as the user zooms out. Do not modify production/generated JSON to create the fixture. **Complete.**
7. Measure both total configured stations and live Leaflet marker count so the validation report proves that off-screen markers are deferred. **Complete.**

### Phase 4: full migration regression — complete

Completed in Chrome on 2026-08-15 across all 15 required county/zone states at desktop and mobile widths. The detailed evidence and provider limitation are recorded above.

1. Re-run all nine counties at desktop and mobile widths. **Complete.**
2. Exercise every zone in Dare, Hyde, and San Diego. **Complete.**
3. Recheck Conditions, Radar, Satellite, every Forecast subtab, station details, alerts, map controls, playback, scrubbers, legends, meteograms, and responsive layout. **Complete.**
4. Run live-provider checks separately and report any provider/network limitations without changing source selection or fallback behavior. **Complete.**

### Phase 5: marker-only source-preservation closeout — complete before `69c365a`

Completed on 2026-08-15 for the marker-only boundary. The later user-authorized `69c365a` commit intentionally superseded the single-`current.json` and no-API/data portions of this evidence for North Carolina conditions.

- The pre-migration and committed page inventories have identical ordered values for all nine counties' radar-station, radar-product, and satellite-product selectors.
- No API or committed county config file changed between `cc5fd3d` and `9b5fbf1`. The NOAA standard-radar and STAR fallback URL patterns remain in the shared controller, with GOES-19/Eastern US retained for the East pages and GOES-18/Western US retained for San Diego.
- The marker working-tree slice changes only marker lifecycle/rendering plus the ten `weatherCenter.js` cache-version references. It retains the single active county/zone `current.json` request and introduces no source, JSON, data, API, cache-script, or generated-file diff.
- The county JSON, Bertie coordinate edit, statewide station catalog, and shared cache implementation that were previously outside the marker-only slice were subsequently included by the user in `69c365a`.
- No references remain to `county_old.css`, Bertie's superseded weather-center/map controllers, or the old `weatherCenter.js?v=20260814-1` cache key.
- Syntax checks passed for the shared county controllers, the shared interactive-map module, both meteogram implementations, and the alert/context/map modules. `git diff --check` passed with expected LF-to-CRLF warnings only.

1. Compare all weather/source references against the pre-migration state. **Complete.**
2. Confirm the marker implementation introduced no JSON/data/API/cache/generated diffs; inventory unrelated runtime-generated changes separately. **Complete.**
3. Confirm no superseded CSS/JS references remain. **Complete.**
4. Run JavaScript syntax checks and `git diff --check`. **Complete.**
5. Record tests, controlled-browser checks, owner checks, and external-provider checks as separate categories. **Complete.**

### Phase 6: combined checkpoint review and commit — complete

1. The user committed the combined working tree at `69c365a`, then committed and pushed the token-free NWS cache, shared city labels, marker thinning/geometry, catalog cleanup, and documentation work through `6d14cb2`. **Complete.**
2. Post-commit static, fallback/local-source, responsive, zone, marker, and focused cross-feature regression is recorded above. **Complete.**
3. Live statewide-cache success against the generated NWS cache is recorded above. **Complete.**
4. This handoff update is the only current uncommitted follow-up. Commit it only after explicit authorization.
5. Do not deploy unless separately requested.
