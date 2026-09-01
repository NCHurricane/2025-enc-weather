# Tropical Overview and Active-Storm Maps: Current Handoff

Updated: 2026-08-31
Repository: `K:\Web Design\NCHurricane 2025`
Status: Tropical product Phases 0 through 6 are complete locally. Phase 4 compatibility routes and navigation were committed in `2a60674`; on 2026-08-24 the owner separately authorized removal of the two static compatibility pages while retaining their server-owned 301 redirects to canonical basin state. A large Phase 5 active-storm shell and detailed-map implementation was committed in `7d125fa`, then changed by later shell/map-consistency and closeout work through `385b52f`. Deterministic AL/EP/CP fixtures, the bounded Active router, exact identity rejection, issued/not-issued/partial states, page-level popup coverage, the current CP map/satellite regression, SVG path interaction, and desktop/mobile validation all pass. The duplicate static Active skip link and redundant `active-map-status-row` presentation plus their direct CSS/JavaScript wiring are removed and guarded. The owner reported that the Active map looks great with no errors. Live `AL052026` issued-warning smoke on 2026-08-31 exposed a TCV publisher/frontend schema regression; after the repair was uploaded, the owner reported exactly, "Ok, it is working on the server." That closes TCV tab visibility at the reported overall level; the current shared-border/city follow-up remains local and is not deployed. The planned archive-support phase is removed by owner decision: the public Active workflow remains current-storm-only, with no archive loader, selector, or archive state. Tropical product Phase 6 audited presentation parity; after correcting the brief request to remove the duplicate Summary five-day preview, the owner chose to retain every current presentation. No Tropical product Phase 6 application-source removal remains. Separately, sitemap CSS Phase 4 is committed in `1f6b0b1`; shared-map CSS Phase 5 is committed in `af8577a` and owner-accepted at the reported overall level; the CI portability repair is committed in `7a32866`; owner-accepted sitemap CSS Phase 6 is committed in `5448d61`; owner-accepted Phase 7 is committed in `dbd7c8c`; and Phase 8 plus the ArcGIS basemap replacement are implemented, validated, committed, and pushed in `2f53445`. Owner-managed server/device smoke passed functionally at the reported overall level; Wave B layout closeout remains open for responsive height and mobile-scroll findings. This document does not authorize another push, deployment, destructive file cleanup, another Tropical presentation removal, or a new Tropical product phase.

Pre-Phase 9 CSS note on 2026-08-31: the current uncommitted tree restores the
Tropical active-system chip's complete card styling and fixes shared mobile
weather-tab icons so Font Awesome cannot re-show them below the existing
680-pixel container breakpoint. Local browser checks pass at `390x844` and
`1280x900`; the atomic CSS cache key is `20260831`. Phase 9 has not started.

Deployment context: live testing currently uses
`http://s194842513.onlinehome.us/test/`; `chuckcopelandwx.com` is the future
production replacement after site readiness.

## Tropical SVG wordmark follow-up: 2026-08-31

- The owner-authorized header update replaces the font-built Tropical and
  Active `NCHurric` + Font Awesome hurricane + `ne` wordmark with the versioned
  `images/20260831_nchurricane_logo_animated.svg?v=20260831-1` derivative. The
  original SVG remains the designer-owned source. Both page bootstraps retain the
  `NCHurricane home` link label and expose `NCHurricane` as the image alt text.
- The latest supplied outlined artwork is preserved in the stable derivative;
  the concurrently exported source filename remains untouched. Its cyclone group owns embedded
  5.4-second counterclockwise spin and yellow/white flash animations matching
  the main SVG logo's flash cadence; the embedded reduced-motion rule leaves a
  static, fully opaque yellow cyclone.
- The shared header now gives both SVG wordmarks the same definite responsive
  height with proportional automatic width: `height: clamp(17px, 2vw, 26px)`.
  Do not combine `width: auto` and `height: auto` with only maximum dimensions
  here; that flex layout resolves both SVG images to `0x0` despite successful
  asset loads.
- `NavigationModule.navData.logo` now defaults to the current main-site
  `images/20260826_cc_wx_logo.svg` with the `Chuck Copeland WX home` accessible
  label. This is a configuration default for a consumer that does not supply a
  logo, not an image-load error fallback. Tropical and Active continue to
  override it with the NCHurricane wordmark before initialization. All 17
  navigation consumers use cache key `20260831-navigation-logo-1`; unrelated
  Phase 4 module versions remain unchanged.
- Static/automated: the changed JavaScript passed `node --check`; the SVG passed
  XML parsing; the focused local Tropical suite passed 9/9; the site validator
  passed 18 HTML files, 307 JSON files, and 199 local references; the focused
  responsive-scroll suite passed 3/3; the navigation/default-logo suite passed
  7/7; and `git diff --check` passed with line-ending notices only. The site
  validator now guards both the definite-height header-logo contract and the
  current default-logo source.
- Controlled browser: the initial Tropical and retained `EP092026` Active fixture
  rendered the new linked logo at a 1280-pixel desktop width and `390x844`
  without horizontal overflow or captured console warnings/errors. Two direct
  SVG frames showed distinct spin/flash states; reduced-motion emulation returned
  `animation-name: none`, a yellow icon, and full opacity. The logo link accepted
  keyboard focus with its accessible label. Active without a storm query
  correctly reached its 404 shell; the final fixture check used the owner-run
  `8085` server with `?storm=EP092026`. The earlier temporary `8086` server was
  stopped afterward. The equal-height correction was then verified on the main
  and Tropical headers at `390x844` and `1280x900`: both were visible, shared
  17-pixel mobile and 25.6-pixel desktop heights, retained proportional widths,
  had no horizontal overflow, and produced no captured console warnings/errors.
  The cache-bumped navigation was also checked on the homepage, Tropical, and a
  nested county route; each loaded the expected page-specific logo and label,
  including the county-relative asset path, without captured console errors.
- Concurrent Phase 9 and unrelated repository edits remain user-owned and
  untouched. This correction changes only the shared header image sizing, its
  validator guard, and this evidence. No generated/runtime data, staging,
  commit, push, deployment, or production state changed.

The detailed August 2026 roadmap and Phase 0-3 records are preserved under [`docs/archive/tropical-map/2026-08/`](archive/tropical-map/2026-08/).

## Resume order

1. Read the repository-root `AGENTS.md` and apply any newer user instructions.
2. Read this handoff completely.
3. Run `git status --short --branch` and `git log -8 --oneline`.
4. Preserve all existing working-tree changes. Do not infer phase completion from an uncommitted file.
5. Inspect the Phase 4 commit `2a60674`, the Phase 5 implementation commit `7d125fa`, and later commits only as needed to determine current ownership.
6. Do not add an archive workflow or remove a legacy presentation without explicit user authorization.

## Current repository boundary

- This pre-Phase 9 regression slice began from clean `6018db8`. A concurrent
  user-owned County edit then removed two HWO minimum heights and set the County
  CSS key to `20260831`; it is preserved and not claimed by this Tropical fix.
  This slice owns the Tropical chip rules, shared mobile tab-icon override,
  atomic shared CSS references/contracts/tests, and current handoff evidence.

- Before the persisted-zone implementation and handoff reconciliation on
  2026-08-26, `HEAD`, `main`, and `origin/main` matched at documentation
  checkpoint `a096ddc`, and the working tree was clean. The current uncommitted
  source slice is County-only; this Tropical handoff changes only to record its
  preservation boundary and the read-only production findings. Neither the
  commit boundary nor the working tree establishes production deployment.
- At the 2026-08-22 Phase 5 audit start, `HEAD`, `main`, and `origin/main` were `d80c37d`, and `git status --short --branch` was clean.
- Commits `f39a3be` through `d80c37d` changed Active/Tropical shell, CSS, map, satellite, city-label, and reference-overlay behavior after the original `7d125fa` implementation. The audit used the current tree rather than treating `7d125fa` as final behavior.
- The reconciliation and authorized satellite-reliability edits are this handoff; the shared weather engine, satellite provider, and fallback-dialog modules; the Tropical, Active, homepage, and county satellite controllers; shared fallback CSS; focused site guards and tests; and the affected module/stylesheet cache-busters. Do not absorb unrelated county/shared-map work into a Phase 5 implementation patch.
- At the current `c542123` checkpoint, `main`, `origin/main`, and `HEAD` matched and the working tree was clean. The previously concurrent satellite, Active, county, shared-style, and font changes are committed; the skip-link closeout began from that clean boundary.
- The deterministic Phase 5 closeout began from a clean `e350e15` checkpoint. During validation, separate user-owned edits appeared across Active, Tropical, homepage, county, shared-map CSS, and satellite files. This slice changes only the immutable fixture/router/test surface, the shared Tropical SVG renderer and its cache-busters, and this handoff. It does not absorb or rewrite the concurrent edits.
- The final Active presentation closeout began at committed checkpoint `60ec8f8` with pre-existing handoff-only changes. It removes the duplicate static skip link and user-authorized map status row from the current Active shell, removes only their direct current/legacy controller and CSS wiring, updates the adjacent validator contract and cache-busters, and preserves all runtime/generated storm data.
- `active/cache/nhc_current_storms.json`, generated tropical-map packages, storm directories, county output, and ignored test output are runtime or retained fixture state. Do not rewrite, delete, or commit them opportunistically.
- The banner/Outlook source follow-up touches only the legacy initialization hunk in `active/index.html`, the shared Outlook sanitizer in `active/api/tropical_map_lib.php`, a self-contained all-basin format test under `scripts/tests/`, the adjacent site-validator guard, and this handoff. It does not alter the concurrent satellite implementation. A later user-authorized `overview --basin=all` run republished the three ignored/runtime overview packages; they remain outside the source-change and commit boundary.
- The final Phase 6 source boundary is handoff-only. The attempted Summary-preview removal was fully reverted: `active/index.html`, `active/css/active.css`, `active/js/activeStormWorkspace.js`, and `scripts/validate-site.mjs` match their committed baseline. All Active presentations, cache-busters, map/satellite behavior, fixtures, ignored/generated storm data, and runtime state are preserved.
- The live tropical-updater follow-up changes only the orchestration script, the focused `nearZero` parser/test slice, and this handoff. A user-run target-only refresh had published new storm `EP092026` Iselle in the Eastern Pacific overview while its Active advisory/map package was still absent, so the popup link reached Active's intentional 404 guard. Generated current-storm, overview, storm, graphics, and imagery output was refreshed for verification but remains outside the source-change and commit boundary.

## Phase status

| Phase | Current status | Evidence and boundary |
| --- | --- | --- |
| 0: source contracts | Complete historical record | Current `/xgtwo/` sources, `CurrentStorms.json`, bounded `PharData` extraction, exact identity, freshness, and date-line rules are recorded in the archived Phase 0 contract. |
| 1: normalized packages | Implemented | `active/api/tropical_map_lib.php` and `active/api/tropical_map_builder.php` publish validated overview and storm packages atomically. |
| 2: shared Leaflet engine | Implemented | `js/modules/tropicalMapEngine.js` owns overview/storm modes, named layers, failure states, generation cancellation, popups, and date-line-safe rendering. |
| 3: unified overview | Complete through `9e3ecb6` | `tropical.html` owns URL-addressable `atl`, `epac`, and `cpac` views with Overview, Satellite, Graphics, and Text Products. |
| 4: compatibility/navigation | Static entries retired locally by owner direction | `tropical_at.html` and `tropical_ep.html` plus their dedicated client helper are removed. Existing `.htaccess` 301 redirects preserve extensionless and `.html` Atlantic/Eastern Pacific bookmarks by sending them to canonical basin query state. |
| 5: active shell/detailed map | Complete locally; `AL052026` TCV repair owner-confirmed on the test server | Immutable AL/EP/CP fixtures and a bounded router cover exact identities, issued/not-issued/partial/unavailable states, and negative cross-storm cases. Desktop/mobile browser runs confirmed map and warning popups plus the current CP map/satellite path. The duplicate skip link and redundant status row are removed and guarded. Live `AL052026` exposed the compact-TCV/rich-UI contract mismatch; after upload, the owner reported that it was working on the server. The later Alerts border/city consistency slice remains local. |
| 6: presentation consolidation | Complete locally; retain all presentations | The audit found the Summary five-day preview resolves to the same product as the Track & Cone English five-day tab, but the owner corrected the brief removal request and chose to retain its at-a-glance Summary workflow. No application-source removal remains. |

## Live TCV alert-package reconciliation: 2026-08-31

Preservation boundary: this repair and follow-up change only the shared TCV
parser/payload contract, the Atlantic and shared Eastern/Central Pacific TCV
writers, the Active alert consumer and its cache key, the shared Active map
shell/reference/city wiring used by Alerts, adjacent publication/validation
guards, focused tests, cache documentation, and this handoff. It does not run a
publisher, rewrite `active/storms/AL052026`, alter ignored zone caches, change
the detailed-map warning package, or deploy files.

- The owner reported that the test-server `active/?storm=AL052026` page hid its
  Alerts tab while an NHC Tropical Storm Warning covered the upper Texas and
  southwestern Louisiana coast. Read-only browser inspection confirmed the
  primary and both alert subtabs were hidden with no console error.
- The uploaded `tcv.json` truthfully classified the product as `available`, but
  exposed only the compact `stormId/state/tcv/zones` state contract. The
  existing browser required the richer `events/features/display` contract and
  therefore converted the missing event array into an empty feature collection
  and emitted `hasWind: false`.
- The compact parser also reduced NHC's compressed
  `LAZ073-074-TXZ214-439-615` UGC line to `LAZ073` and `TXZ214`. The repair
  expands prefixed, inherited, ranged, and wrapped UGC tokens; applies active
  and cancellation VTEC actions; retains wind/surge watch-warning semantics;
  and fails unavailable instead of presenting unparseable active VTEC as an
  empty product.
- All publisher states now retain one frontend-safe shape with exact root/meta
  storm identity, normalized events, grouped state/zone display, an explicit
  GeoJSON feature collection, and the existing state/reason fields. Generated
  zone caches publish full GeoJSON Features atomically; the browser and writer
  remain compatible with legacy geometry-only caches.
- The Active browser verifies TCV storm identity, accepts legacy rich fixtures,
  bases tab visibility on issued events/display as well as renderable geometry,
  and keeps the current zone list visible with an explicit map-geometry message
  if polygons are temporarily unavailable.
- The Alerts wind and surge maps now use the same shared Active/Tropical map
  shell, Natural Earth reference overlay, ranked Tropical city data, scoped
  favorites, zoom-rank thresholds, viewport inclusion, and collision thinning
  as the other Active/Tropical maps. Alert polygons and TCV state/zone lists
  retain their separate source semantics.
- Static/automated evidence: changed PHP and JavaScript syntax passes; the TCV
  state/parser/payload/cache test passes 20 checks; 54 Tropical map tests and 40
  repository subsystem tests pass; the Phase 0/1 PHP suites pass 68 parser and
  publication checks; the site validator passes 18 HTML, 307 JSON, and 199
  local references; and `git diff --check` passes.
- Controlled browser on the deterministic issued `AL052025` fixture passes at
  `1280x900` and `390x844`: Alerts, wind, and surge tabs are visible; desktop
  wind and surge maps each show 12 collision-free labels at fitted zoom 8 with
  Natural Earth and SimpleMaps attribution; zoom 9 removes the max-zoom-8
  border while retaining re-filtered cities; zoom 6 retains five
  high-priority/favorite cities; and mobile retains four non-overlapping city
  labels with no horizontal overflow. Console warning/error logs are empty.
- Owner smoke after the TCV upload: the owner reported exactly, "Ok, it is
  working on the server." No device, viewport, or individual interaction was
  named, so this establishes the test-server Alerts repair only at that
  reported overall level.
- The shared-border/city follow-up has not been uploaded or deployed. Upload
  its changed source files and repeat the live desktop/mobile Alerts smoke.
  External NHC state remains time-dependent and must be rechecked when the
  publisher is next run.

## Current roadmap boundary

Phases 5 and 6 are complete locally. Archive support is not part of the product roadmap and must not be implemented. No further Tropical phase or presentation removal is authorized by this handoff.

The separately authorized sitemap-wide CSS Phases 3 and 4 changed Tropical and
Active title/heading presentation plus general tab/subtab ownership. Tropical
retains its family-owned gold title and URL-addressable basin state. Active
retains `#storm-title` and `#storm-id`, while its primary modules and generated
text, graphics, language/product, and radii controls now use shared BEM
presentation with IDs/`data-*` hooks and `.is-active`/`[hidden]` state. The
Phase 4 browser pass exercised Tropical keyboard tabs and basin Back/Forward
state plus Active primary/generated tabs at `1280x900` and `390x844`, with no
horizontal overflow or console warning/error.

The owner subsequently reported that Wave A visual acceptance passed and
authorized CSS Wave B Phase 5. That sitemap phase migrated Tropical and Active
map card, toolbar, field, canvas, status, timeline, legend, basemap menu, and
city-label presentation to shared BEM contracts with IDs/`data-*` hooks and no
legacy aliases. Engine-only presentation remains in
`css/tropical-map-engine.css`; explicit page variants remain in the Tropical
and Active family sheets. Desktop/mobile browser checks preserved basin URL
state, Satellite switching, Active map/layer menus, map size, targets,
horizontal overflow, and a clean explicit-state console/network run.

The sitemap CSS slice did not change popup content, sources, storm identity,
cache packages, fixtures, camera policy, layer semantics, or generated data.
It does not reopen a Tropical product phase or permit presentation removal.
The owner reported, "Ok, visual acceptance passed." No exact Tropical/Active
page, device, viewport, or interaction was supplied, so this is retained only
as overall sitemap CSS Phase 5 owner evidence.

The separately authorized sitemap CSS Phase 6 popup slice is complete locally
at baseline `7a32866` and is owner-accepted:

- `css/interactive-weather-map.css` owns the opt-in generic Leaflet shell,
  sizing, padding, close/link targets, tip, focus, overflow, and text rhythm.
  `css/tropical-map-engine.css` retains only the `tropical-map-popup` content
  variant; `active/css/active.css` retains only the legacy Active alert-map
  text variant.
- `js/modules/tropicalMapEngine.js` emits the shared shell with explicit
  Tropical/Active modifiers and BEM content, while preserving escaped text,
  source time, official NHC links, exact storm links, layer content, and map
  ownership. `active/js/ww-maps.js` uses the same Active modifier without
  changing its TCV zone-package semantics.
- `js/modules/leafletPopupShell.js` gives generated SVG paths explicit
  Enter/Space triggers and accessible labels, closes the shared shell by mouse
  or keyboard, and restores focus to the originating path after keyboard
  dismissal. Legacy popup classes are removed rather than aliased.
- Controlled browser at `1280x900` and `390x844` covered Atlantic Overview and
  deterministic `AL052025` Active. Overview development-outlook and Active
  warning/current-position content, source times, official Overview link,
  focus rings/restoration, 44-pixel close/link targets, horizontal bounds, and
  mouse/keyboard closing passed. Active popup content has no link by design.
  The retained Alerts map rendered its separate Tropical Storm Warning zone
  list; the deterministic fixture did not supply renderable legacy-map geometry
  in this run, while its detailed-map warning geometry supplied 29 keyboard
  triggers.
- Final Tropical and Active console warning/error logs were empty. Tropical
  network checks were clean. Active showed only the retained fixture's known
  missing text/graphic-product `404`s and canceled requests during view changes;
  its unavailable-product UI remained accurate and no popup asset failed.
- Phase-wide validation passes: 14 changed JavaScript syntax checks, full
  70-file PHP and 75-file JavaScript baselines, all 78 focused tests, the site
  validator at 18 HTML/307 JSON/167 references, focused legacy-selector
  searches, `git diff --check`, and seven PHP-served HTTP probes.
- Storm identities, sources, packages, fixtures, map products, cameras,
  controls, alerts, current-storm-only routing, generated/runtime data, and all
  retained presentations are unchanged. Nothing was staged, committed, pushed,
  deployed, generated, or deleted. Sitemap CSS Phase 7 is now separately
  authorized; Phase 8 remains gated.
- Owner smoke on 2026-08-24: the owner reported exactly, "Ok, smoke passed."
  No Tropical/Active page, storm, device, viewport, or individual interaction
  was named, so this closes sitemap CSS Phase 6 owner review only at that
  overall granularity. The same message explicitly authorized sitemap CSS
  Phase 7; it did not reopen a Tropical product phase or authorize Phase 8.

The separately authorized sitemap CSS Phase 7 dependency slice is complete,
owner-accepted, and committed locally as `dbd7c8c`:

- `tropical.html` and `active/index.html` no longer load County CSS. Both retain
  the shared map owner, Tropical engine sheet, and their correct family sheets
  in the same approved order. No Tropical/Active selector or JavaScript hook
  had to move because browser rule-usage coverage found no County rule used by
  either page.
- The ownership contract, validator, cache keys, and focused tests now enforce
  the reduced dependency graph. The Phase 7 shared stylesheet uses
  `20260824-phase7-1`; unchanged Tropical-engine and Active family assets retain
  their existing cache versions.
- Controlled browser at `1280x900` and `390x844` covered Atlantic Overview and
  deterministic `AL052025` Active. Overview development-outlook plus Active
  warning/current-position popups retained pointer and keyboard activation,
  closing/focus return, source time and official Overview link, 44-pixel
  targets, bounded content, and zero document/internal horizontal overflow.
  Active popup content still has no link by design.
- Per-page Tropical console/network capture was clean at both widths. Active
  retained only the fixture's known missing text/graphic-product `404`s and
  missing-image ORB failure; its unavailable-product UI remained truthful and
  no stylesheet or popup asset failed.
- Phase-wide static evidence passes: five changed JavaScript/MJS syntax checks,
  full 70-file PHP and 76-file tracked/task JavaScript baselines, all 80 focused
  tests, the site validator at 18 HTML/307 JSON/164 local references, seven
  PHP-served HTTP probes, focused selector/dependency searches, and
  `git diff --check`.
- Storm identities, sources, packages, fixtures, map products, cameras,
  controls, alerts, current-storm-only routing, generated/runtime data, and all
  retained presentations are unchanged. Phase 7 was committed locally as
  `dbd7c8c`; nothing was pushed, deployed, generated, or deleted. The owner
  subsequently authorized Phase 8 cascade layers.
- Owner smoke on 2026-08-24: the owner started the bounded Active fixture
  router, confirmed that `AL052025` loaded, and supplied a screenshot showing
  the Coastal Colleton Tropical Storm Warning polygon and popup. Repository
  inspection confirmed that the TCV fixture deliberately contains only the
  overlapping wind/surge features for that one SC zone, not the historical
  advisory's complete SC/NC extent. The owner then reported exactly, "Ok, then
  it has passed." This closes Phase 7 owner review at the reported overall
  level. Phase 8 was authorized in the following owner request.

Sitemap CSS Phase 8 is implemented and validated locally on 2026-08-24 from
committed baseline `dbd7c8c`; owner review remains open:

- Tropical and Active load the site-wide layer order first, then the map-only
  Leaflet wrapper, token/base, components, shared map, Tropical engine, and
  correct page-family sheets. Leaflet 1.9.4 remains byte-for-byte untouched and
  is imported into `vendor`; the shared map and Tropical-engine rules use
  `maps`, while Tropical, Active, and storm graphics use `pages`.
- All stylesheet references use `20260824-phase8-1`. The ownership contract,
  focused test, and validator reject direct Leaflet CSS links, unlayered or
  undeclared application rules, stale cache references, and undocumented
  `!important` use while continuing to enforce every exact Leaflet checksum.
- Controlled browser at `1280x900` and `390x844` covered Eastern Pacific
  Overview and deterministic `AL052025` Active after initial Atlantic/map
  loading. Basin selection, URL state, map sizes, legends, responsive tabs,
  warning geometry, and page composition retained zero horizontal overflow.
  Tropical system and Active Coastal Colleton warning popups retained pointer
  opening, `overflow:auto`, 44-pixel close targets, narrow fit, and focus return.
- Full static evidence passes: seven changed tracked or dependency-only MJS
  syntax checks, 73 PHP lint checks, 81 JavaScript/MJS syntax checks, all 84
  focused tests, the site validator at 18 HTML/307 JSON/182 local references,
  exact Leaflet hashes, focused old-reference/`!important` searches, and
  `git diff --check`.
- Storm identities, packages, current-storm routing, products, source links,
  cameras, alerts, the one-zone deterministic warning subset, archived/ignored
  data, and generated/runtime files remained unchanged at the implementation
  checkpoint. Phase 8 is committed and pushed in `2f53445`; nothing had been
  deployed, generated, or deleted at that point. The later owner pass closes
  functional smoke at its reported granularity while leaving Wave B layout
  closeout open.

## ArcGIS basemap replacement: 2026-08-26

- The shared basemap menu now exposes four label-free ArcGIS Online layers:
  World Terrain Base, World Imagery, World Dark Gray Base, and World Light Gray
  Base. The requested `USA_Topo_Maps` service was not used because its scanned
  raster maps contain baked-in labels; World Terrain Base preserves the
  intended terrain slot without adding a separate label layer.
- CARTO and the direct USGS National Map provider are removed from the shared
  browser configuration, CSP, documentation, Active hazard-tile proxy, and
  tile warmer. Esri hazard tiles use new `esri-*` cache namespaces, so retained
  generated USGS cache files are neither deleted nor reused.
- Every external basemap uses a self-hosted neutral SVG as Leaflet's automatic
  error tile. The bundled Natural Earth/Census reference layers, city labels,
  storm vectors, and weather markers remain above that fallback.
- Static/automated evidence: all 82 JavaScript/MJS syntax checks and 73 PHP
  lints passed; all 88 JavaScript tests passed; the site validator passed 18
  HTML files, 307 JSON files, and 199 local references; and `git diff --check`
  passed with line-ending notices only.
- Controlled browser: Home and Tropical at `1280x900`, Dare mainland at
  `390x844`, and current `EP092026` Active at `1280x900` loaded the expected
  ArcGIS tiles and four-option menu without horizontal overflow or console
  warnings/errors. The forced ArcGIS-outage check produced loaded local tiles
  while reference layers and data markers remained visible.
- Live provider probes returned HTTP `200`, `image/jpeg`, CORS `*`, and nonzero
  bytes for representative tiles from all four services. These provider checks
  are time-dependent. Storm identity, products, layers, cameras, satellite
  sources/fallbacks, generated/runtime data, scheduler state, and production
  state were not changed by the implementation. The source change is committed
  and pushed in `2f53445`; at that checkpoint nothing had been deployed,
  generated, or deleted. The later owner upload is recorded below.

## Owner functional smoke and deferred layout findings: 2026-08-26

- After uploading the checkpoint to the server and testing it on the owner's
  devices, the owner reported exactly, "All functions passed on all devices."
  Known coverage includes an unspecified Samsung phone and a `3840x2160`
  display; the exact page, browser, and remaining-device matrix was not
  supplied, so this closes functional owner smoke only at that reported overall
  level.
- Visual/layout acceptance remains open. On a `3840x2160` display, some page
  elements retain excessive empty height. On mobile and smaller desktops,
  alerts and/or zone selectors can push the map scrubber and Radar/Satellite
  color bar below the visible viewport.
- Mobile page scrolling is impaired over maps and text-product regions: a
  vertical gesture scrolls or interacts with the element instead of the page
  unless the gesture begins near the extreme viewport edge.
- These findings are deferred to the proposed final responsive-tuning phase.
  Preserve current Tropical/Active data, basin/storm state, products, layers,
  animation, and fallback contracts while measuring page-family-specific
  height and touch/scroll needs.
- The owner performed the upload. No exact production URL, uploaded-file audit,
  server configuration, scheduler/cache state, or independent production probe
  was recorded, so broader production verification remains open.

## Static compatibility-page retirement: 2026-08-24

By explicit owner direction, `tropical_at.html` and `tropical_ep.html` are
removed together with their now-orphaned client redirect helper and
compatibility-only CSS. `index_update.html` and its dedicated stylesheet are
also retired in the same bounded cleanup. The existing `.htaccess` 301 rules
remain the sole owners of both extensionless and `.html` Tropical legacy paths.

The ownership contract and validator now guard all five retired files against
accidental restoration and still require both production redirect rules.
JavaScript syntax passed, all 73 JavaScript tests passed, the site validator
passed 18 HTML files, 307 JSON files, and 162 local references, and
`git diff --check` passed. Direct browser checks confirmed canonical Atlantic
and Eastern Pacific state, Back/Forward, one shell, no document overflow, and
no console errors at `1280x720`. A same-origin `390x844` iframe check confirmed
the mobile shell/map/selection/overflow state but produced one iframe-only
`MutationObserver` error that did not reproduce in direct canonical tabs. The
local PHP server does not execute `.htaccess`; production redirect behavior is
therefore still an owner/deployment verification item.

## Phase 6 parity audit and final owner decision: 2026-08-23

Preservation boundary: the audit's final outcome is retain-all. The attempted Summary-preview removal was fully reverted before staging or commit, so Phase 6 leaves Active application behavior and validator contracts unchanged. It does not change the map, alert, graphics, radii, or text behavior; the immutable AL/EP/CP fixtures; `active/cache/nhc_current_storms.json`; ignored/generated storm packages and imagery; or production/runtime state.

| Surface | Leaflet detailed map provides | Existing presentation adds | Audit result |
| --- | --- | --- | --- |
| Watches and warnings | Combined NHC GIS warning geometry with type/description popups alongside the track, cone, surge, and radii layers. | The Alerts view uses the TCV-derived zone package, a hazard-specific map, and labeled state/zone lists. It exposes zone membership that the detailed-map package and popup do not. | Not redundant; retain unless a later authorized integration preserves the zone list and its separate source semantics. |
| Storm surge alerts | Combined NHC surge-warning geometry and description popups in storm context. | The Alerts view separates surge from wind and provides the TCV-derived zone map plus labeled state/zone lists. | Not redundant; retain unless parity is deliberately added elsewhere first. |
| Track and cone | Interactive current/past/forecast vectors, forecast-point valid times and intensity, the cone, and simultaneous hazard/radii context. | Official 3-day and 5-day graphics, English/Espanol/Francais variants, Key Messages, and experimental products. These remain recognizable official products and add language/product coverage beyond the map. | Not redundant; retain. |
| Wind radii | Georeferenced 34/50/64-knot overlays with forecast-hour and valid-time popups in storm context. | The Radii view selects Now and forecast hours, switches individual/all thresholds, draws a storm-relative compass, and reports exact NE/SE/SW/NW nautical-mile values. | Not redundant; retain. |
| Graphics and text | No full replacement. | Full advisory/forecast/discussion/wind-probability text; wind analysis/history/arrival/probability graphics; surge/rain graphics; and official-language products. | Unique information; retain. |
| Summary five-day preview | The map supplies an interactive forecast track and cone. | The Summary preview and the Track & Cone English five-day tab resolve to the same `5day_cone_no_line_and_wind.png` local asset with the same NHC five-day remote fallback. The Summary placement remains useful as an at-a-glance workflow. | Retain by final owner decision. |

Final owner decision:

1. Retain all current presentations, including the Summary five-day preview and its Track & Cone action.
2. The brief removal was fully reverted before staging or commit; no Active HTML, CSS, JavaScript, validator, or cache-buster diff remains from it.
3. No other presentation removal is authorized.

Current Phase 6 evidence:

- Static/code audit traced the current consumers in `active/index.html`, `active/js/activeStormWorkspace.js`, `active/js/activeStormMap.js`, `active/js/ww-maps.js`, `active/js/radii-visualization.js`, `active/js/storm-graphics.js`, `active/js/storm_text.js`, and `js/modules/tropicalMapEngine.js`.
- Deterministic desktop browser at `1280x900`: issued `AL052025` exposed enabled Leaflet warning/surge layers and separate Alerts tabs with `SC / Coastal Colleton` labeled as Tropical Storm Warning and Storm Surge Warning. Not-issued `CP012026` exposed enabled past/forecast/cone/radii layers, disabled warning/surge layers, Now/3h/12h/24h/36h radii selection, and exact current quadrant values. No browser console errors or warnings were recorded.
- Deterministic mobile browser at `390x844`: the same CP radii hours and AL wind/surge state/zone lists remained present with no horizontal page overflow and no browser console errors or warnings.
- These fixture checks establish local presentation parity only. They do not establish a live issued-hazard owner smoke, current external-provider freshness, deployment, or production behavior.
- Revert static/automated: `active/index.html`, `active/css/active.css`, `active/js/activeStormWorkspace.js`, and `scripts/validate-site.mjs` match their committed baseline; syntax passed for the workspace controller and validator; the current Tropical/shared-map suite passed 60 tests; and the site validator passed 20 HTML files, 296 JSON files, and 156 local references.
- Revert desktop browser at `1280x900`: deterministic `CP012026` restored the two-column Summary preview DOM, fallback loader, unavailable-image state, and Track & Cone action with no horizontal overflow. The retained fixture had no resolvable local or current NHC five-day image, so the explicit empty state appeared truthfully. Activating the action added `nhcView=track`, selected and revealed the Track & Cone panel, and restored focus to `nhc-tab-track`.
- Revert mobile browser at `390x844`: the restored preview DOM remained mounted but the existing responsive rule hid its forecast container, the page had no horizontal overflow, and no console errors or warnings were recorded. This confirms the committed mobile contract rather than introducing a new mobile presentation.

## Phase 5 closeout criteria

### Functional scope

- A validated current-storm fixture loads the Active shell and detailed map for an exact `AL`, `EP`, or `CP` ID.
- Current position, past/best track, forecast track and points, cone, watches/warnings, surge warnings, and 34/50/64-knot wind radii expose truthful issued/not-issued/unavailable states.
- The map and satellite modes retain one page-owned lifecycle, bounded frame behavior, cancellation, correct storm/basin framing, basemap control, legend, and NOAA STAR fallback. The user-authorized Active status/timestamp row is intentionally absent.
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
- Active skip-link closeout: the static duplicate was removed, the site validator now requires zero Active-owned and exactly one navigation-owned skip link, JavaScript syntax passed for the validator, the site validator passed the same 20 HTML, 268 JSON, and 156-reference inventory, and `git diff --check` passed.
- Final Active presentation closeout: the static duplicate skip link and `active-map-status-row` DOM were removed with their current/legacy JavaScript wiring and dedicated CSS. The validator now guards against reintroducing the row or its wiring. The focused Tropical/Active suite passed 59 tests; syntax passed for all 70 tracked JavaScript files and lint passed for all 69 tracked PHP files; the site validator passed 20 HTML files, 296 JSON files, and 156 local references; and `git diff --check` passed.

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
- The original audit reproduced two Active-shell defects on both page loads; both are now corrected:
  1. `active/index.html` imported and ran `active/js/tropical-banner.js` even though the Active page had no banner container. Its document-relative `active/cache/...` request resolved to `/active/active/cache/...`, returned HTML, and logged `Unexpected token '<'` while parsing JSON. The unused initialization was subsequently removed and guarded.
  2. `active/index.html` contained a static skip link while `NavigationModule` injected another, leaving two identical `Skip to main content` links. The static duplicate is now removed and guarded.
- In the original audit, browser popup interaction was not confirmed. Popup construction/escaping and readable official-link mapping passed automated tests at that point; the deterministic closeout browser run below now supplies the missing page-level evidence.
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
- Active skip-link follow-up: at desktop `1280x900`, the rendered Active shell contained exactly one `Skip to main content` link, a real Tab key made it the first page focus target, and activation positioned `main-content` at the top of the viewport. At mobile `390x844`, the rendered shell again contained one skip link, it was the first focusable element in document order, and the page had no horizontal overflow. Console inspection found informational text-product messages but no errors or warnings.
- Deterministic Active closeout at desktop `1280x900`: `AL052025` rendered authentic issued wind and surge subsets; both detailed-map warning and surge paths opened readable issued-time popups, and the preserved Alerts maps opened Tropical Storm Warning and Storm Surge Warning county popups. `EP152025` rendered its exact retained advisory, one available current-position product, not-issued warning/surge states, and unavailable forecast/cone/past/radii states without horizontal overflow or new console output. `CP012026` rendered current, forecast, cone, past track, and selectable 34/50/64-knot radii; a forecast point popup opened and enabling 50/64 knots increased the radii paths from one to three.
- Deterministic Active closeout at mobile `390x844`: AL, EP, and CP each had equal page/client widths with no horizontal overflow. The AL detailed warning popup and legacy warning-map popup stayed inside the viewport. EP retained its truthful partial state. CP retained all five issued map products and the not-issued warning/surge controls.
- Exact negative cases failed closed: an AL request receiving the exact retained EP advisory redirected to `/404.html`; an AL request receiving an EP map manifest disabled only the detailed map, preserved other storm content, and logged the expected identity-mismatch warning.
- Current CP satellite regression passed at desktop and mobile: Clean IR selected `GOES-West_ABI_Band13_Clean_Infrared` over the GIBS WMTS REST path, and checked tiles completed with non-zero native width. The unforced CP browser run had no new console error or warning. This provider result is time-dependent external evidence, not a production guarantee.
- Shared-engine regression passed: Tropical Overview rendered SVG paths, and Atlantic Overview -> Eastern Pacific -> Satellite -> Atlantic -> Overview restored the Atlantic basin preset at z4 with no horizontal overflow or new console output.
- Repository validation is not fully green in the current mixed working tree. The focused 59-test Tropical/Active suite, all 37 fixture parses, all 69 PHP lints, all 70 JavaScript syntax checks, and the existing PHP parser/product suites passed. `node scripts/validate-site.mjs` fails because a concurrent user-owned edit reintroduced the static Active skip link, while navigation also injects its owned link. The county map-status/note cleanup removed its adjacent trailing-space line and `git diff --check` now passes.
- Map-status/note cleanup removed the retired Tropical status/note DOM dependencies and their Tropical-only CSS without changing the map engine, source selection, lifecycle, or fallback behavior. Desktop and mobile checks at `1280x900` and `390x844` confirmed Tropical Overview NHC source time, Tropical Satellite provider/time/frame status, and Active detailed-map NHC source time plus GOES-West Clean IR time/frame status with no clipping, horizontal overflow, console errors, or warnings.
- Final Active presentation closeout at `1280x900` and `390x844` confirmed zero status-row/status/timestamp nodes, exactly one navigation-owned skip link, 62 storm vector paths, working map/satellite switching, Clean IR at 12/12 frames with loaded GOES-West tiles, intact legend and layer controls, no horizontal overflow, and no new console error or warning. This intentionally supersedes the earlier Active status-row presentation without changing Tropical, homepage, or county status UI.

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
- Owner follow-up after the map-status/note cleanup reported, "Everything seems to pass." No exact pages, devices, or viewport sizes were supplied, so this closes only the recent map-status/note owner check at that report's granularity.
- Owner report: there are currently no active systems with watches or warnings, so live owner smoke of issued warning/surge path interactions is deferred until an eligible storm is active. Deterministic fixture and controlled-browser evidence remains separate and complete.
- Final Active closeout owner report: "The active map looks great. No errors." No exact page URL, device, or viewport was supplied, so the acceptance is retained at that granularity.
- Owner-managed server/device follow-up on 2026-08-26 reported, "All functions
  passed on all devices." This closes functional smoke for the uploaded
  checkpoint only at that overall granularity; the separately recorded height
  and mobile nested-scroll findings keep Wave B visual/layout acceptance open.
- Product decision: the owner removed archive support from the roadmap and stated that the website will no longer have an archive element. Active remains a current-storm-only public workflow.
- Deployment/production: the owner reported uploading and testing the checkpoint
  on `http://s194842513.onlinehome.us/test/`. Codex did not perform that upload.
  The read-only staging audit below confirms the committed Phase 8/basemap file
  set and a fresh Atlantic overview. The future `chuckcopelandwx.com`
  replacement, production PHP capability, and installed scheduler/log health
  remain separate.

## Smallest coherent Phase 5 closeout slice

This local closeout is complete. Phase 6 is also complete with the retain-all owner decision recorded above.

1. Complete: the Active shell again contains only the navigation-owned skip link, and the site validator guards that ownership.
2. Complete: the site validator fails if Active owns a static skip link or the shared navigation does not own exactly one. The guard against restarting the unused `/active/active/cache/` banner request remains.
3. Complete: immutable, non-production AL, EP, and CP current-storm/advisory/map fixtures plus a bounded test router/harness are under `scripts/tests/`; no generated/runtime package was edited.
4. Complete locally: AL, EP, and CP Active-page scenarios now cover issued and not-issued warnings/surge, partial/unavailable products, exact-ID/advisory rejection, map and warning popups, desktop/mobile layout, console, and HTTP behavior.
5. Complete locally: the current CP map/satellite and shared Tropical Overview regressions passed, the redundant Active status row is removed, the site validator and `git diff --check` are green, and live issued-hazard owner smoke is explicitly deferred.

## Durable product contracts

- The Tropical overview shows basin basics: active systems, simplified track/cone, and outlook areas. Active owns granular storm layers and controls.
- Preserve the server-owned redirects from the retired `tropical_at` and `tropical_ep` paths to canonical Atlantic and Eastern Pacific basin state; do not restore duplicate HTML compatibility pages.
- Preserve the outlined Tropical/Active SVG wordmark, its counterclockwise flashing cyclone animation, reduced-motion fallback, and accessible `NCHurricane home` label.
- Overview Satellite remains basin-only, defaults to Clean IR, and uses the configured basin sector for the click-to-load NOAA STAR animation after both tile sources fail.
- Shared code exposes engines/utilities; page controllers own page lifecycle.
- Popups link to readable official NHC pages, never directly to KMZ files. Unknown source-link mappings fail closed.
- Use one map instance per page, named layer owners, generation/abort protection, escaped accessible popups, source timestamps, and explicit loading/empty/stale/partial/unavailable states.
- Normalize and split date-line geometry; never substitute one storm/basin/advisory for another.
- Retain last-known-good data on bounded refresh failure and publish generated packages atomically.
- Active is a current-storm-only public workflow. Do not add an archive loader, archive selector, archive route, or public archive state. Retained storm files may remain as non-public fixtures/history and are not deletion targets without separate destructive-cleanup authorization.
- Preserve current text/graphics/language behavior, official links, and script-owned IDs until replacement parity is accepted.

## Current official source/runtime contract

- Active storms: `https://www.nhc.noaa.gov/CurrentStorms.json`.
- Outlook metadata/text: `https://www.nhc.noaa.gov/xgtwo/xgtwo_atl.json`, `xgtwo_pac.json`, and `xgtwo_cpac.json`.
- Outlook geometry: matching `/xgtwo/gtwo_atl.kmz`, `gtwo_pac.kmz`, and `gtwo_cpac.kmz`.
- Live-source follow-up on 2026-08-23: NHC used `risk_level: "nearZero"` with `probability: 0` for an Atlantic disturbance whose official text described the chance as low and near zero. The parser now normalizes only that exact zero-probability combination to `Low` and still fails closed if `nearZero` accompanies a nonzero probability. The base parser/publication suite passed 68 checks, the focused normalization test passed 3 checks, and an isolated live 18:00 UTC refresh published fresh Atlantic, Eastern Pacific, and Central Pacific overview packages.
- `scripts/update-tropical-storm.ps1` uses the requested storm ID/name as an exact live identity gate, then derives every supported active `AL`/`EP`/`CP` storm from that same refreshed NHC payload. It runs each storm's basin-appropriate advisory, TCV, CXML, and detailed-map publishers, runs text/graphics at their actual all-storm or all-basin scope, validates all six required Active JSON packages for every current storm, and only then publishes the all-basin overviews. This ordering prevents a newly listed overview storm from linking to an unbuilt Active package. The overview builder's partial-failure exit remains acceptable only after each basin has a valid `fresh` or retained `stale` package.
- Live updater regression on 2026-08-23: an Iselle-targeted run completed for `EP092026`, `CP012026`, and `CP022026`; all three overview packages were `fresh`, and the generated Iselle advisory/map/graphics/text/TCV packages passed exact-ID validation. Controlled browser clicks on the Iselle map marker and `View Iselle details` popup link at `1280x900` and `390x844` reached `/active/?storm=EP092026`, rendered the Iselle Active page, and produced no browser errors or warnings.
- Do not use the stale `/archive/xgtwo/{basin}/latest/` aliases as live sources.
- The selected server-side conversion path is bounded `PharData` + `zlib` + DOM/libxml. `ZipArchive` is absent in the verified PHP environment and is not required.
- Reverify live URLs, schemas, freshness, and production PHP capability when a change depends on them.

## Shared header breadcrumb follow-up: 2026-08-23

- The user-authorized shared navigation follow-up adds a visible, transparent second header row on interior pages while leaving the homepage unchanged. Tropical renders `Home > Tropical`; Active renders `Home > Tropical > Active Storms`, with the Tropical parent linked to the canonical Atlantic overview.
- Breadcrumbs represent stable page hierarchy only. Tropical basin state and Active storm query identity remain owned by their page controllers and do not create or change breadcrumb levels. The Tropical `NCHurric` + hurricane icon + `ne` wordmark and accessible `NCHurricane home` label are preserved.
- The shared route resolver fails closed for unknown pages, uses an accessible `Breadcrumb` navigation landmark and ordered list, marks the current page with `aria-current="page"`, and gives links a 24-pixel minimum height. All 20 shared stylesheet/navigation consumers use the matching `20260823-breadcrumbs-1` cache key.
- Static/automated: JavaScript syntax passed; six focused breadcrumb route tests passed; the site validator passed 20 HTML files, 307 JSON files, and 156 local references; and `git diff --check` passed before this documentation update.
- Local HTTP/browser: the versioned stylesheet and navigation module returned `200`. Tropical and Active at `1280x900` and `390x844` showed the intended trails with no horizontal overflow, preserved wordmark labels, and no captured console errors or warnings. The representative Dare and Accessibility checks also passed; mobile menu placement, Escape cleanup/focus restoration, breadcrumb Home navigation, and browser Back restoration passed.
- Owner smoke, deployment, and production behavior remain open. The breadcrumb follow-up did not change basin/storm state, maps, satellite behavior, presentations, generated/runtime storm files, or external-provider contracts.

## Production cron candidate: 2026-08-23

- `scripts/production.crontab` is the paste-ready production schedule for the current repository layout. It contains one copy of each county job, the NC and California statewide Conditions publishers, all Atlantic/Eastern Pacific/Central Pacific advisory, TCV, CXML, and graphics publishers, the all-basin tropical map builder, the tropical cache guard, tile warming, and the shared MTCSWA refresh. `tropical_map_builder.php all` now publishes and validates current-storm packages before basin overviews, matching the live updater's rule that a newly listed overview storm must not link to an unbuilt Active package.
- The prior owner-supplied `crontab -l` contained duplicated tropical and county blocks, omitted the Central Pacific publishers and California statewide Conditions publisher, and did not schedule `tropical_map_builder.php`. The candidate removes those duplicates and writes Tropical command output to operation-specific files under `active/logs/`.
- `active/api/warm_tiles.php` remains in use by the production cron candidate, the maintenance dashboard, and the optional `-WarmHazardTiles` path in `scripts/update-tropical-storm.ps1`. Its premature summary using uninitialized counters and its duplicate second warming pass were removed; the retained pass still discovers active wind/surge zones, skips existing tiles unless purge is requested, logs progress, and writes one final summary.
- `test/dashboard.php` now mirrors the production cron candidate for Tropical and shared statewide cache monitoring: it includes the four Central Pacific publishers, the all-basin tropical map builder, and California Conditions, and its Tropical schedule labels and log paths match the candidate cron. The map builder's dashboard default is the complete `all` mode.
- Static validation: all 56 cron rows have five schedule fields plus a command, reference 56 distinct existing PHP entry points, contain no exact duplicate jobs, and include exactly four CP-specific publishers, one California cache publisher, one San Diego alerts job, and one tropical map builder job. All 56 referenced PHP files and the maintenance dashboard passed `php -l`; the fixture-backed all-mode builder published storm packages before all three overview packages; a source-to-cron audit matched all 18 Tropical dashboard targets and log files and found each of the six new dashboard entries exactly once; `git diff --check` passed with only existing line-ending notices.
- Production installation and runtime verification remain open. Before installing, verify `/usr/bin/php8.4-cli`, PHP CA configuration, required PHP extensions, log-directory permissions, and then inspect the new cron logs and generated package freshness. No production crontab, scheduler state, generated cache, or deployment was changed in this local slice.

## Read-only staging deployment health audit: 2026-08-26

- The owner clarified that live testing uses
  `http://s194842513.onlinehome.us/test/`; `chuckcopelandwx.com` is the future
  production URL after readiness. The earlier probe of another public domain
  was not a probe of this deployment and must not be used as staging or
  production-readiness evidence.
- Cache-bypassed HTTP probes returned `200` for staging Home, Dare, the Phase 8
  cascade sheets, self-hosted fallback tile, current SVG logo, and shared map
  module. Home and Dare reference the Phase 8 cache key; the map module contains
  the ArcGIS sources. Controlled browser checks rendered nonzero World Imagery
  tiles on Home and Dare, and the captured Dare console was clean.
- Staging Dare current/forecast/alerts and NC Conditions were generated August
  26/27. The Atlantic overview returned `200`, reported `state: fresh`, and was
  generated August 27 03:09 UTC. California Conditions also returned `200`, but
  its embedded generation time remained August 22, making that publisher/log
  the specific outstanding scheduler check rather than a broad site failure.
- The local cron candidate was re-audited read-only: all 56 job rows have five
  schedule fields plus a command, reference 56 distinct existing PHP entry
  points, and retain the four CP-specific publishers, California Conditions,
  San Diego alerts, and all-basin Tropical map builder.
- Production server access was not available to inspect the installed crontab,
  `/usr/bin/php8.4-cli`, required extensions/CA configuration, log permissions,
  or cron output. No staging/production file, scheduler, configuration, or
  cache was changed. Inspect the installed California cron row and log, and do
  not treat staging as deployment proof for the future production replacement.

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

Phase 5 is complete locally at committed checkpoint `385b52f`. Preserve the immutable AL/EP/CP fixtures, bounded Active router, SVG popup correction, duplicate-skip-link guard, user-authorized Active status-row removal, and recorded browser evidence. The owner accepted the Active map with no errors. Live owner smoke for issued warning/surge products is deferred until an eligible storm is active. Active remains current-storm-only; do not add an archive loader, selector, route, or archive state. Do not edit `active/cache/nhc_current_storms.json`, generated tropical-map packages, retained ignored output, or production/runtime state.

Phase 6 presentation consolidation is complete locally with a retain-all owner decision. Preserve the alert, track/cone, radii, graphics, text, and Summary five-day preview surfaces, including the preview's existing fallback loader, responsive behavior, and Track & Cone action. Do not remove a presentation or begin a new Tropical phase without explicit authorization.

The current documentation checkpoint is `a096ddc`; Phase 8 and the ArcGIS basemap replacement are committed and pushed in `2f53445`. The current uncommitted source slice is a bounded County persisted-zone fix and must not be absorbed into Tropical product work. Live testing uses `http://s194842513.onlinehome.us/test/`; `chuckcopelandwx.com` is the future production replacement. Staging serves the committed Phase 8/basemap checkpoint and a fresh Atlantic overview. California Conditions exists but remains stale at an August 22 embedded generation time, so inspect that installed publisher cron/log separately. The current County zone fix is not yet uploaded. Wave B layout closeout remains open for excessive large-display height, controls pushed below the viewport by alerts/zone selectors, and mobile page-scroll capture over maps/text products. A final responsive-tuning phase is proposed but not authorized for implementation.
```
