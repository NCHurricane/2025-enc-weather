# Tropical Overview and Active-Storm Maps: Current Handoff

Updated: 2026-08-22
Repository: `K:\Web Design\NCHurricane 2025`
Status: Phases 0 through 4 are implemented. Phase 4 compatibility routes and navigation were committed in `2a60674`. A large Phase 5 active-storm shell and detailed-map implementation was committed in `7d125fa`, then changed by later shell/map-consistency work through `d80c37d`. The 2026-08-22 reconciliation audit passed the available static, parser, current-CP runtime, and desktop/mobile interaction checks. Follow-up fixes preserve East/West basin ownership and now use NASA GIBS WMTS for GIBS products, a platform-matched RealEarth tile fallback for every satellite product, and a click-to-load NOAA STAR animation dialog only after both tile sources fail. The Leaflet map and Active storm overlays stay mounted during tertiary fallback. The owner reported that all requested satellite tests passed. The unused Active tropical-banner request and all-basin Outlook line formatting are corrected with deterministic and controlled-browser coverage. Tropical Overview now defers basin-camera changes while its Leaflet container is hidden and restores the selected basin preset after the panel becomes visible; the owner reported that this seemed to fix the issue. Phase 5 remains open because of one Active-shell defect and material AL/EP/issued-hazard browser-coverage gaps. Phase 6 archive support remains open, and Phase 7 consolidation has not begun. This document does not authorize staging, committing, pushing, deployment, Phase 6, or Phase 7 work.

The detailed August 2026 roadmap and Phase 0-3 records are preserved under [`docs/archive/tropical-map/2026-08/`](archive/tropical-map/2026-08/).

## Resume order

1. Read the repository-root `AGENTS.md` and apply any newer user instructions.
2. Read this handoff completely.
3. Run `git status --short --branch` and `git log -8 --oneline`.
4. Preserve all existing working-tree changes. Do not infer phase completion from an uncommitted file.
5. Inspect the Phase 4 commit `2a60674`, the Phase 5 implementation commit `7d125fa`, and later commits only as needed to determine current ownership.
6. Do not begin Phase 6 or remove a legacy presentation without explicit user authorization.

## Current repository boundary

- At the 2026-08-22 Phase 5 audit start, `HEAD`, `main`, and `origin/main` were `d80c37d`, and `git status --short --branch` was clean.
- Commits `f39a3be` through `d80c37d` changed Active/Tropical shell, CSS, map, satellite, city-label, and reference-overlay behavior after the original `7d125fa` implementation. The audit used the current tree rather than treating `7d125fa` as final behavior.
- The reconciliation and authorized satellite-reliability edits are this handoff; the shared weather engine, satellite provider, and fallback-dialog modules; the Tropical, Active, homepage, and county satellite controllers; shared fallback CSS; focused site guards and tests; and the affected module/stylesheet cache-busters. Do not absorb unrelated county/shared-map work into a Phase 5 implementation patch.
- Concurrent user-owned changes are present in `active/css/active.css`, `active/js/radii-visualization.js`, `counties/css/county.css`, shared CSS files, and untracked `fonts/Inter/`. The fallback fix touched only its targeted hunk in the already-dirty Active stylesheet; all unrelated user hunks remain intact. The original audit evidence applies to the clean `d80c37d` snapshot, while the later forced-fallback browser evidence applies to the current working tree.
- `active/cache/nhc_current_storms.json`, generated tropical-map packages, storm directories, county output, and ignored test output are runtime or retained fixture state. Do not rewrite, delete, or commit them opportunistically.
- The banner/Outlook source follow-up touches only the legacy initialization hunk in `active/index.html`, the shared Outlook sanitizer in `active/api/tropical_map_lib.php`, a self-contained all-basin format test under `scripts/tests/`, the adjacent site-validator guard, and this handoff. It does not alter the concurrent satellite implementation. A later user-authorized `overview --basin=all` run republished the three ignored/runtime overview packages; they remain outside the source-change and commit boundary.

## Phase status

| Phase | Current status | Evidence and boundary |
| --- | --- | --- |
| 0: source contracts | Complete historical record | Current `/xgtwo/` sources, `CurrentStorms.json`, bounded `PharData` extraction, exact identity, freshness, and date-line rules are recorded in the archived Phase 0 contract. |
| 1: normalized packages | Implemented | `active/api/tropical_map_lib.php` and `active/api/tropical_map_builder.php` publish validated overview and storm packages atomically. |
| 2: shared Leaflet engine | Implemented | `js/modules/tropicalMapEngine.js` owns overview/storm modes, named layers, failure states, generation cancellation, popups, and date-line-safe rendering. |
| 3: unified overview | Complete through `9e3ecb6` | `tropical.html` owns URL-addressable `atl`, `epac`, and `cpac` views with Overview, Satellite, Graphics, and Text Products. |
| 4: compatibility/navigation | Implemented in `2a60674` | `tropical_at.html` and `tropical_ep.html` are accessible compatibility entries; navigation, sitemap, `.htaccess`, and site validation were updated. |
| 5: active shell/detailed map | Substantially implemented; closeout remains open after the 2026-08-22 audit | Current CP behavior passed the available static, runtime, and desktop/mobile checks. Satellite imagery now preserves platform ownership, uses GIBS WMTS then RealEarth tiles, and keeps the map/overlays available while offering NOAA STAR only on request after both providers fail. The unused legacy banner request is fixed. Owner re-smoke remains open. Fix the duplicate skip link, add reproducible AL/EP and issued-hazard page coverage, and complete popup/owner evidence before calling the phase complete. |
| 6: archive support | Open | `active/js/storm.js` still requires an exact storm match in the current-storm feed before loading local advisory data. The storm package builder also publishes `stormState: "live"`. |
| 7: consolidation | Not begun | No duplicate warning, surge, track/cone, radii, graphics, or text presentation may be removed without parity evidence and owner approval. |

## Best next course: Phase 5 reconciliation and closeout

The next bounded task should be an evidence-first Phase 5 audit, not new Phase 6 implementation.

1. Inventory the committed Phase 5 surface from `7d125fa`: Active shell, tab ownership, detailed map, satellite mode, storm packages, product states, Central Pacific writers, and preserved legacy interfaces.
2. Compare the current working tree against `7c46f80` and separate later Active/Tropical map-consistency work from unrelated county/shared-map changes.
3. Trace every shared-module consumer before altering `tropicalMapEngine.js`, `tropicalCityLabels.js`, reference overlays, satellite code, or shared CSS.
4. Reconcile the actual implementation with the Phase 5 exit criteria below and record each validation category separately.
5. Fix only defects explicitly included in the authorized closeout slice. Do not absorb Phase 6 archive behavior or Phase 7 removals.
6. Update this handoff with exact evidence and remaining gates. If Phase 5 passes, request explicit authorization before Phase 6.

## Phase 5 closeout criteria

### Functional scope

- A validated current-storm fixture loads the Active shell and detailed map for an exact `AL`, `EP`, or `CP` ID.
- Current position, past/best track, forecast track and points, cone, watches/warnings, surge warnings, and 34/50/64-knot wind radii expose truthful issued/not-issued/unavailable states.
- The map and satellite modes retain one page-owned lifecycle, bounded frame behavior, cancellation, correct storm/basin framing, basemap control, timestamps, legend, and NOAA STAR fallback.
- Existing text advisories, graphics languages/product tabs, radii tables, official links, and generated DOM hooks remain functional.
- Overview-only behavior remains basin-based; storm/floater targeting remains Active-only.
- Central Pacific geometry and labels remain date-line safe without duplicated worlds, markers, or city labels.

### Validation categories

Report these independently:

1. **Static/automated:** `node --check` for changed JavaScript, `php -l` for changed PHP, focused Tropical/Active tests, `node scripts/validate-site.mjs`, JSON/GeoJSON identity/schema checks, reference searches, and `git diff --check`.
2. **Fixture/runtime/API:** deterministic `AL`, `EP`, and `CP` packages; issued and not-issued products; partial/unavailable states; exact-ID/advisory mismatch rejection; local PHP serving and HTTP/schema probes.
3. **Controlled browser:** representative desktop near `1280x900` and mobile near `390x844`; direct/deep links, Back/Forward where applicable, tab keyboard behavior, map layers/popups, satellite controls, responsive layout, no horizontal overflow, console, and network behavior.
4. **Owner smoke:** record only the exact pages, devices, and interactions the owner confirms.
5. **External source:** recheck live NHC URLs, identities, timestamps, and product availability separately from local correctness.
6. **Deployment/production:** remains open unless separately authorized and verified in production.

## Phase 5 reconciliation evidence: 2026-08-22

Audit checkpoint: clean `main` and `origin/main` at `d80c37d` before this handoff-only edit.

### Static and automated

- `node --check` passed for 13 current Active/Tropical JavaScript files.
- `php -l` passed for 18 Phase 5 writer, product-state, map-builder, map-library, and test-router PHP files.
- `node --test test/tropical-map/*.test.mjs scripts/tests/storm-product-states.test.mjs` passed 52 tests.
- `php test/tropical-map/phase0_fixture_contract.php` passed.
- `php test/tropical-map/tropical_map_parser_test.php` passed 68 checks.
- `php scripts/tests/tcv-product-state-test.php` passed 6 checks.
- `php scripts/tests/hwo-product-test.php` passed 20 assertions.
- `node scripts/validate-site.mjs` validated 20 HTML files, 268 JSON files, and 156 local references.
- The shared-engine tests cover exact storm-manifest identity rejection, unsafe product paths, one storm map instance, selectable radii, layer ownership, generation cancellation, and date-line normalization. This is automated evidence, not page-level browser evidence.
- Satellite reliability follow-up: `node --check` passed for the 12 changed JavaScript/test modules; the focused Tropical/shared-map suite passed 59 tests, including WMTS matrix/product identity, RealEarth product mapping and time normalization, basin/platform ownership, and existing map/date-line contracts; the site validator passed the same 20 HTML, 268 JSON, and 156-reference inventory; and `git diff --check` passed.
- Active banner and Outlook follow-up: PHP syntax passed for the map library and new format test, JavaScript syntax passed for the site validator, the parser/publication suite retained its 68 passing checks, the new self-contained Outlook test passed six basin-specific line-break and non-duplication checks, the 59-test Tropical/shared-map suite passed, the Phase 0 fixture contract passed, the site validator passed the same 20 HTML, 268 JSON, and 156-reference inventory, and `git diff --check` passed.
- Overview hidden-basin viewport follow-up: JavaScript syntax passed for the four affected modules and the new regression test. The focused hidden-map test passed, the full Tropical/shared-map suite passed 60 tests, the site validator passed the same 20 HTML, 268 JSON, and 156-reference inventory, and `git diff --check` passed.

### Fixture, runtime, and HTTP/API

- A fresh isolated fixture publication produced valid Atlantic, Eastern Pacific, and Central Pacific overview packages and one exact `CP012026` storm package. The CP package truthfully reported `forecastTrack`, `cone`, and `windRadii` as fresh; warnings and surge as not issued; and missing best track as unavailable/partial.
- The checked-in fixture set does not produce an AL or EP storm package. A retained ignored `test/output/phase5-al-complete/AL052025` artifact passed a read-only schema/identity check and contains issued warning, surge, track, cone, best-track, and radii layers, but it is not a reproducible checked-in source fixture and does not close the AL gate. No equivalent EP artifact exists.
- Local PHP HTTP/schema probes returned `200` and exact identities for the Active page, current-storm feed, and all named files in the current generated `CP012026` and `CP022026` map manifests. Both current CP manifests were fresh and exposed five issued map-product groups, with warnings and surge correctly not issued.
- The local retained feed/packages were advisories 38 and 6 from 2026-08-21. They are intentionally treated as local fixture/runtime state, not proof of current NHC freshness.
- User-authorized live overview refresh at 2026-08-23 02:23:10 UTC: `active/api/tropical_map_builder.php overview --basin=all` atomically republished exact `atl`, `epac`, and `cpac` packages as fresh with zero errors. Because local PHP CLI has no default CA path, the documented Git CA bundle was supplied with `curl.cainfo`; TLS verification remained enabled. All three packages reported the 2026-08-23 00:00 UTC source issue time. Their English Outlook HTML contained 47, 45, and 18 `<br>` separators respectively and zero raw newline characters. The focused formatter test passed 6 checks and the parser/publication suite passed 68 checks after publication.

### Controlled browser

- Desktop near `1280x900`: `CP012026` loaded the summary, detailed map, current/past/forecast track, cone, selectable 34/50/64-knot radii, basemap, legend, timestamps, and city labels. Warning and surge controls were disabled from truthful not-issued states. Tab keyboard navigation, direct query state, Back/Forward, layer toggles, and invalid-ID redirect to `/404.html` worked. No horizontal overflow or duplicate IDs were observed.
- Desktop satellite: Clean IR loaded 12 frames; playback, pause, resting manual scrub, rapid Visible-to-Water-Vapor switching, timestamp, legend, and stale-work cancellation behaved correctly. NASA Worldview and GOES imagery both rendered without a provider error in the checked cases.
- Mobile near `390x844`: `CP022026` summary, z4 detailed map, controls, legend, Clean IR frames, text products, English/Espanol/Francais graphics, wind tabs, and responsive layout remained usable with no horizontal overflow.
- Two defects were reproduced on both page loads:
  1. `active/index.html` imports and runs `active/js/tropical-banner.js` even though the Active page has no banner container. Its document-relative `active/cache/...` request resolves to `/active/active/cache/...`, returns HTML, and logs `Unexpected token '<'` while parsing JSON.
  2. `active/index.html` contains a static skip link while `NavigationModule` injects another, leaving two identical `Skip to main content` links.
- Browser popup interaction was not confirmed. Popup construction/escaping and readable official-link mapping passed automated tests, but that does not satisfy the page-level popup gate.
- Historical deterministic fallback check before the current provider decision: both interactive WMS endpoints were temporarily redirected to an unavailable local test endpoint, then restored immediately. On `CP012026`, the real 1000-by-1000 NOAA STAR Clean IR floater loaded as a non-blocking inset while the Leaflet map, storm layers, basemap controls, and timestamps remained visible. This inset presentation was subsequently superseded by the explicitly authorized message/dialog behavior below.
- Historical desktop `1280x900` and mobile `390x844` inset layouts passed visible inspection. This remains evidence for map preservation only, not acceptance evidence for the current dialog presentation.
- Tropical Satellite platform follow-up: the controller now records the basin that successfully owns the mounted imagery, immediately hides the old weather layer on a basin change, clears basin-specific fallback state, and refuses the four-minute reuse path unless the loaded and selected basins match. Repeated same-basin package updates no longer restart the satellite source unnecessarily.
- Controlled browser at `1280x900` loaded Atlantic Clean IR as `GOES-East` and Eastern Pacific Clean IR as `GOES-West`, then passed rapid Central Pacific-to-Atlantic switching. Changing from Atlantic to Central Pacific while the Satellite tab was closed showed `Loading GOES18 imagery…` instead of re-exposing the recent GOES-East layer. Later provider tile timeouts fell back to the correct platform and sector: Central Pacific `GOES18/hi`, Atlantic `GOES19/taw`, and Eastern Pacific `GOES18/tpw`.
- Mobile `390x844` Eastern Pacific displayed only the GOES18 loading/fallback states with zero horizontal overflow. Console inspection found no JavaScript errors; three WMS tile-timeout warnings were external-provider failures that resolved to identity-correct NOAA STAR fallbacks.
- Authorized satellite reliability follow-up: Clean IR and GeoColor now use GIBS WMTS REST tiles at their published Web Mercator matrix levels. Visible, Shortwave IR, Longwave IR, and Water Vapor keep their nowCOAST WMS primary. All six products have exact platform-matched RealEarth timed tile fallbacks; the shared engine also switches provider if a later frame fails, while retaining ready frame layers at opacity zero.
- Controlled browser at `1280x900` loaded current GIBS WMTS tiles for Atlantic GOES-East Clean IR, Eastern Pacific GOES-West Clean IR, homepage GOES-East GeoColor, San Diego GOES-West GeoColor, and `CP012026` GOES-West Clean IR. Central Pacific addressing wrapped west-edge columns to valid tile columns with no negative requests.
- With GIBS blocked but RealEarth available, San Diego automatically rendered current `G18-ABI-FD-BAND13-GRAD` tiles, reported `RealEarth GOES-18 Clean IR`, kept the Leaflet map visible, and did not expose the tertiary fallback.
- With both tile providers blocked, Tropical, homepage, and Active kept their Leaflet containers visible, kept the old static/inset image containers hidden with no `src`, disabled tile playback, and displayed `Satellite map tiles are unavailable` plus `View NOAA STAR animation`. No NOAA STAR GIF URL was assigned before the click.
- The clicked dialog used the identity-correct Eastern Pacific `GOES18/TPW` sector GIF and exact `CP012026` floater GIF. Close, Escape, backdrop wiring, scroll lock, explicit focus restoration, and removal of the GIF `src` on close are implemented; Close and Escape were exercised. At `390x844`, Tropical and Active had no horizontal overflow, the maps remained 357 and 341 pixels wide respectively, and each 95%-width dialog stayed inside the viewport.
- During the Active forced fallback, all five storm canvases remained mounted, selected storm-layer ownership remained intact, and map zoom advanced from z4 to z5. The expected forced-provider warnings were separate from the pre-existing `active/js/tropical-banner.js` JSON error. No new unforced browser error was observed.
- Banner/Outlook follow-up at desktop `1280x900`: the Active page requested only `/active/cache/nhc_current_storms.json`, received `application/json`, loaded no tropical-banner script, and logged no console errors. Deterministic Atlantic, Eastern Pacific, and Central Pacific Outlook packages rendered their WMO header, blank separator, title, office, issuance, and body on distinct lines with 13, 34, and 26 line breaks respectively; `white-space: pre-wrap` remained active and the console stayed clear.
- At mobile `390x844`, the Atlantic Outlook retained the same 13 structured line breaks in a 316-pixel content area with no page overflow. The Active page also had no horizontal overflow and no console error. The browser Outlook check used a temporary read-only fixture router that substituted corrected fixture text in responses without modifying generated overview packages; the router was removed after validation.
- Overview viewport follow-up at desktop `1280x900`: Atlantic Overview -> Eastern Pacific Overview -> Satellite -> Atlantic -> Overview returned to the configured Atlantic center (`26.98, -69.96`) at z4 after first showing Eastern Pacific at (`19.97, -129.99`) at z4. A separate Satellite -> Central Pacific -> Overview path retained Satellite as the selected subtab during the basin change, then returned Overview to (`19.97, -145.02`) at z4. While hidden, the `0x0` Overview map retained its prior camera instead of applying a basin view against an unmeasurable container. At mobile `390x844`, Text Products -> Eastern Pacific -> Overview returned to (`19.97, -129.99`) at z3 in a 357-pixel-wide map with no horizontal overflow. All browser runs had no horizontal overflow or console errors.
- Current browser evidence still covers CP and not-issued warning/surge states only. No deterministic AL or EP Active page, issued warning/surge popup, partial/unavailable page state, or exact advisory-mismatch page run was completed.

### Owner, external source, and production

- Owner smoke reported on 2026-08-22: the interactive satellite source timed out, the default floater fallback replaced the map, and storm overlays were unusable. The owner said all other requested checks passed "as far as I can tell." The storm ID, page URL, device, and viewport were not supplied, so this evidence is not broadened beyond that report. Owner re-smoke of the current WMTS/RealEarth/message-dialog chain remains open.
- Owner follow-up reported that satellite was working "somewhat," but Tropical Satellite intermittently displayed GOES-19/East for a Pacific basin and GOES-18/West for the Atlantic. The basin/platform ownership fix above has controlled-browser evidence but still needs owner smoke in the owner's environment.
- The owner then reported another interactive-satellite failure with the correct fallback, followed by the same intermittent loading on the homepage and county pages. Controlled-browser checks reproduced stalled NASA GIBS WMS tile batches across Tropical, homepage, and Dare County while the local controllers and identity-correct fallbacks continued to work.
- A live source comparison explained why the same code worked earlier in the day: one newly advertised GOES-East GeoColor tile for `2026-08-22T23:20:00Z` returned a 1,096-byte blank PNG, while the same tile for `23:10Z` and `23:00Z` returned 345,372-byte and 367,554-byte imagery in about 0.6 seconds. Full browser tile batches still stalled on older frames, so the current incident is an upstream WMS availability/performance change, not evidence of another local basin/platform error.
- At the earlier incident checkpoint, experimental same-frame retry, larger-tile, partial-coverage, WMTS, and newest-frame-skipping changes were not retained. The owner subsequently and explicitly authorized retaining the GIBS WMTS transport, RealEarth secondary fallback, and NOAA STAR message/dialog tertiary path. Same-frame retry, larger WMS tiles, partial-coverage acceptance, and newest-frame skipping remain unimplemented.
- The owner reserved a separate non-satellite issue until the satellite platform fix was confirmed; that issue was subsequently identified and corrected below.
- External source check at approximately 2026-08-22 21:24 UTC: official `CurrentStorms.json` and the Atlantic, Eastern Pacific, and Central Pacific `/xgtwo/` JSON endpoints returned HTTP `200` with the expected root schemas. The live feed contained exact `CP012026` and `CP022026` identities at advisories 42 and 10 issued 21:00 UTC, with track, cone, best track, and wind-radii sources present and warnings/surge absent. This live evidence had advanced beyond the retained local advisories 38 and 6.
- Satellite source check on 2026-08-22: NASA GIBS continued to publish the named `GOES-East_ABI_*` and `GOES-West_ABI_*` layers. NOAA's operational status identified GOES-19 as East and GOES-18 as West, both green. This time-dependent provider evidence confirms the existing platform table; the defect was local stale ownership rather than reversed upstream identities.
- Live provider probes on 2026-08-22 returned HTTP `200` and CORS for a GIBS GOES-East Clean IR WMTS tile at `2026-08-23T00:20:00Z`, the RealEarth time API, and a current RealEarth GOES-19 Clean IR tile at `20260823.010020`. These probes establish the contracts at that time only.
- Owner follow-up after the WMTS/RealEarth/NOAA STAR changes reported, "All test passed." The exact pages, device, and viewport were not supplied, so this closes the requested satellite owner re-smoke only at that report's granularity.
- The separate non-satellite issue was then identified as Tropical Overview losing its configured basin viewport when a basin changed from Satellite, Graphics, or Text Products. The deferred hidden-map camera correction above has deterministic and controlled-browser evidence. Owner follow-up reported, "that seemed to fix the issue"; the exact basin/subtab repetitions, device, and viewport were not supplied, so the claim is retained at that granularity.
- Deployment/production: not attempted or established. Production PHP extensions, cache freshness, scheduler state, upload state, and production browser behavior remain open.

## Smallest coherent Phase 5 closeout slice

Keep this separate from Phase 6 archive behavior and Phase 7 presentation removal.

1. In `active/index.html`, remove the duplicate static skip link; retain the single navigation-owned skip link and every script-owned storm DOM hook. The unused legacy tropical-banner initialization is already removed.
2. Add a focused guard that fails if the Active shell again creates duplicate skip links. The guard against restarting the unused `/active/active/cache/` banner request is already present.
3. Add immutable, non-production AL and EP current-storm/advisory/map fixtures plus a bounded test router/harness. Do not edit `active/cache/nhc_current_storms.json` or promote ignored `test/output/` artifacts into production state.
4. Exercise AL, EP, and CP through the Active page, including issued and not-issued warnings/surge, partial/unavailable products, exact-ID/advisory rejection, map and warning popups, desktop/mobile layout, console, and network behavior.
5. Re-run the current CP map/satellite regression and the static/runtime suites above. Satellite owner smoke has been reported passing, and the owner reported that the Overview viewport correction seemed to fix the issue. If the remaining gates pass, update this handoff to close Phase 5 and request explicit Phase 6 authorization.

## Phase 6 boundary

Archive support is a separate authorization gate. Its target remains:

1. Validate `?storm=` against `^(AL|EP|CP)\d{6}$`.
2. Load the exact local advisory, text, graphics, and map manifests before deciding availability.
3. Require every available identity to match the requested ATCF ID and advisory.
4. Use the current-storm feed only to label the valid package `live` or `archive`, not as the gate that permits local loading.
5. Render a valid retained archive when it is absent from the live feed.
6. Fail closed to 404 for invalid IDs, identity mismatches, or missing required local state.

Do not edit `active/cache/nhc_current_storms.json` to simulate archive support.

## Durable product contracts

- The Tropical overview shows basin basics: active systems, simplified track/cone, and outlook areas. Active owns granular storm layers and controls.
- Preserve `tropical_at.html` and `tropical_ep.html` as accessible compatibility entries and server redirect targets.
- Preserve the Tropical `NCHurric` + hurricane icon + `ne` wordmark and accessible `NCHurricane home` label.
- Overview Satellite remains basin-only, defaults to Clean IR, and uses the configured basin sector for the click-to-load NOAA STAR animation after both tile sources fail.
- Shared code exposes engines/utilities; page controllers own page lifecycle.
- Popups link to readable official NHC pages, never directly to KMZ files. Unknown source-link mappings fail closed.
- Use one map instance per page, named layer owners, generation/abort protection, escaped accessible popups, source timestamps, and explicit loading/empty/stale/partial/unavailable states.
- Normalize and split date-line geometry; never substitute one storm/basin/advisory for another.
- Retain last-known-good data on bounded refresh failure and publish generated packages atomically.
- Preserve archived storm files, current text/graphics/language behavior, official links, and script-owned IDs until replacement parity is accepted.

## Current official source/runtime contract

- Active storms: `https://www.nhc.noaa.gov/CurrentStorms.json`.
- Outlook metadata/text: `https://www.nhc.noaa.gov/xgtwo/xgtwo_atl.json`, `xgtwo_pac.json`, and `xgtwo_cpac.json`.
- Outlook geometry: matching `/xgtwo/gtwo_atl.kmz`, `gtwo_pac.kmz`, and `gtwo_cpac.kmz`.
- Do not use the stale `/archive/xgtwo/{basin}/latest/` aliases as live sources.
- The selected server-side conversion path is bounded `PharData` + `zlib` + DOM/libxml. `ZipArchive` is absent in the verified PHP environment and is not required.
- Reverify live URLs, schemas, freshness, and production PHP capability when a change depends on them.

## Historical records

- [Full August 2026 roadmap through the pre-Phase-5 handoff](archive/tropical-map/2026-08/tropical-map-roadmap-2026-08-21.md)
- [Phase 0 source contracts](archive/tropical-map/2026-08/tropical-map-phase-0-source-contracts.md)
- [Phase 1 normalized packages](archive/tropical-map/2026-08/tropical-map-phase-1-normalized-packages.md)
- [Phase 2 shared Leaflet engine](archive/tropical-map/2026-08/tropical-map-phase-2-shared-leaflet-engine.md)
- [Phase 3 unified overview](archive/tropical-map/2026-08/tropical-map-phase-3-unified-overview.md)

Archived plans are evidence, not current authorization.

## Ready-to-paste continuation prompt

```text
Continue the NCHurricane tropical-map work in K:\Web Design\NCHurricane 2025.

Read AGENTS.md and docs/tropical-map-next-session-plan.md completely, then run `git status --short --branch` and `git log -8 --oneline`. Preserve every existing working-tree change. Do not stage, commit, push, deploy, edit generated/runtime data, or begin a new phase unless I explicitly authorize it.

The next task is a Phase 5 reconciliation and closeout audit. Phase 4 compatibility/navigation is already implemented in 2a60674. The Active shell and detailed map were substantially implemented in 7d125fa, but Phase 5 does not yet have a consolidated current validation record. Inventory the committed and current Active/Tropical work, compare it with the Phase 5 criteria in the handoff, and report the smallest coherent closeout slice. Keep static/automated, fixture/runtime/API, controlled-browser, owner, external-source, and deployment evidence separate.

Do not begin Phase 6 archive support or Phase 7 consolidation from the handoff alone.
```
