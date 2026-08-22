# Tropical Overview and Active-Storm Maps: Current Handoff

Updated: 2026-08-22
Repository: `K:\Web Design\NCHurricane 2025`
Status: Phases 0 through 4 are implemented. Phase 4 compatibility routes and navigation were committed in `2a60674`. A large Phase 5 active-storm shell and detailed-map implementation was committed in `7d125fa`, but its completion evidence was never consolidated into a current phase handoff, so Phase 5 must be audited and closed before it is called complete. Phase 6 archive support remains open, and Phase 7 consolidation has not begun. This document does not authorize implementation, staging, committing, pushing, or deployment.

The detailed August 2026 roadmap and Phase 0-3 records are preserved under [`docs/archive/tropical-map/2026-08/`](archive/tropical-map/2026-08/).

## Resume order

1. Read the repository-root `AGENTS.md` and apply any newer user instructions.
2. Read this handoff completely.
3. Run `git status --short --branch` and `git log -8 --oneline`.
4. Preserve all existing working-tree changes. Do not infer phase completion from an uncommitted file.
5. Inspect the Phase 4 commit `2a60674`, the Phase 5 implementation commit `7d125fa`, and later commits only as needed to determine current ownership.
6. Do not begin Phase 6 or remove a legacy presentation without explicit user authorization.

## Current repository boundary

- At this documentation cleanup, `HEAD`, `main`, and `origin/main` are `7c46f80`.
- Before the cleanup began, the working tree already contained user-owned changes across Active, county pages, shared CSS, map/city/boundary modules, the canonical Tropical page, and an untracked `js/modules/mapBoundaryOverlays.js`.
- The current Active/Tropical map-consistency and city/boundary work is not classified by this handoff. Audit it before changing or staging any overlapping file.
- `active/cache/nhc_current_storms.json`, generated tropical-map packages, storm directories, county output, and ignored test output are runtime or retained fixture state. Do not rewrite, delete, or commit them opportunistically.

## Phase status

| Phase | Current status | Evidence and boundary |
| --- | --- | --- |
| 0: source contracts | Complete historical record | Current `/xgtwo/` sources, `CurrentStorms.json`, bounded `PharData` extraction, exact identity, freshness, and date-line rules are recorded in the archived Phase 0 contract. |
| 1: normalized packages | Implemented | `active/api/tropical_map_lib.php` and `active/api/tropical_map_builder.php` publish validated overview and storm packages atomically. |
| 2: shared Leaflet engine | Implemented | `js/modules/tropicalMapEngine.js` owns overview/storm modes, named layers, failure states, generation cancellation, popups, and date-line-safe rendering. |
| 3: unified overview | Complete through `9e3ecb6` | `tropical.html` owns URL-addressable `atl`, `epac`, and `cpac` views with Overview, Satellite, Graphics, and Text Products. |
| 4: compatibility/navigation | Implemented in `2a60674` | `tropical_at.html` and `tropical_ep.html` are accessible compatibility entries; navigation, sitemap, `.htaccess`, and site validation were updated. |
| 5: active shell/detailed map | Substantially implemented in `7d125fa`; closeout required | The Active page has the new shell, detailed Leaflet map, map-layer controls, interactive satellite workflow, storm-product state work, and Central Pacific support. Do not call the phase complete until current behavior and validation evidence are reconciled. |
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
- Overview Satellite remains basin-only, defaults to Clean IR, and retains NOAA STAR basin fallback.
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
