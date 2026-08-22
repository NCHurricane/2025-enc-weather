# Tropical Map Phase 2: Shared Leaflet Engine

> Archived historical Phase 2 evidence preserved on 2026-08-22. The mount and
> next-phase statements below describe that checkpoint, not current status or
> authorization. Use the [current tropical handoff](../../../tropical-map-next-session-plan.md).

Updated: 2026-08-19
Status: implemented and validated locally; owner smoke accepted. Not deployed or mounted on tropical pages.

## Implemented scope

- `js/modules/tropicalMapEngine.js` owns one Leaflet map instance, one common basemap, five named product groups, basin views, shared styles, popups, legend construction, responsive legend placement, status text, fitting, and cleanup.
- The engine consumes the Phase 1 `tropical-overview` schema version `1.0.0` and fails closed on unsupported schemas or malformed named layers.
- Atlantic, Eastern Pacific, and Central Pacific use explicit view presets. Central Pacific geometries are shifted into a longitude window centered on 180 degrees before rendering and fitting, so split date-line features remain spatially local.
- A generation token and `AbortController` prevent a superseded basin request from replacing the newest selection.
- Same-basin refreshes retain completed layers while replacement data loads. A basin change clears the prior basin's groups before loading so old products are never presented as belonging to the new basin.
- Fresh, empty, stale, loading, and unavailable states have separate visible/live-region text. A failed same-basin refresh preserves the previous rendered layers; a failed different-basin request does not claim cleared layers remain visible.
- Popup content is built from escaped normalized properties. Storm-detail links are derived only from an exact uppercase ATCF ID.
- `css/tropical-map-engine.css` contains only reusable map status, legend, and popup styling.
- `test/tropical-map/phase2-harness.html` is an isolated three-basin harness. It does not modify or import any tropical-page controller.

## Named overview layer owners

```text
outlookAreas
cones
forecastTracks
outlookPoints
stormPositions
```

Every accepted package constructs all five replacement renderers before any current group is cleared. A package validation or renderer-construction failure therefore cannot partially replace the visible layer set.

## Harness preparation

Generate deterministic overview fixtures:

```powershell
php active/api/tropical_map_builder.php overview --fixtures --basin=all --overview-output=test/output/tropical-map-smoke/overview
```

Start the local server from the repository root:

```powershell
php -S 127.0.0.1:8085 -t .
```

Open:

```text
http://127.0.0.1:8085/test/tropical-map/phase2-harness.html
```

The harness state panel must retain `"mapInstanceCount": 1` while switching among all three basins.

## Automated validation evidence

- `node --check js/modules/tropicalMapEngine.js`: passed.
- `node --check test/tropical-map/phase2-harness.js`: passed.
- `node --test test/tropical-map/tropicalMapEngine.test.mjs`: the current shared-engine suite passed 15 tests (the 14 Phase 2 checks plus the page-level memory-cache integration added for Phase 3).
- The tests cover package/schema validation, named layer summaries, popup escaping, CP date-line shifting, one-instance basin switching, cross-basin bounds release and viewport ordering, desktop/mobile basin-bounds capacity, responsive basin zoom without cumulative drift, layer replacement, responsive legend placement, superseded generations, same-basin last-render retention, and different-basin clearing.
- `php test/tropical-map/phase0_fixture_contract.php`: passed.
- `php test/tropical-map/tropical_map_parser_test.php`: passed 59 Phase 1 checks.
- Fixture generation produced all three overview packages.
- Local HTTP probes returned `200` for the harness, shared engine, and all three fixture packages.
- `git diff --check`: passed for tracked changes. New Phase 2 files were also checked for trailing whitespace.

## Browser validation boundary

- Controlled-browser validation was not performed. The Codex built-in Browser remains blocked before page connection by an internal trusted-code-path error even after app Repair, Reset, restarts, and update checks.
- The first owner smoke on 2026-08-19 did not pass: the map showed mismatched basemap world copies and the Central Pacific package ended in the unavailable state. Basin-button interaction appeared responsive, but it could not be accepted while the map was incorrect.
- The follow-up correction keeps Central Pacific in a bounded longitude window around -180 degrees, disables Leaflet `worldCopyJump`, binds the fetch implementation safely, uses an absolute fixture route, cache-busts harness assets, and exposes any remaining exception as `lastError` in the harness state panel.
- The second owner smoke confirmed that package loading reached the Atlantic empty state, but tiles still escaped the map container. The root cause was an incorrect Leaflet CSS subresource-integrity value in the harness, which caused the browser to reject Leaflet's required positioning and overflow rules. The hash now matches the Leaflet 1.9.4 artifact and official documentation, with a static regression assertion.
- The third owner smoke passed tile layout and basin-region placement. Atlantic and Eastern Pacific were each requested one zoom level closer; their presets and data-driven fits now include that adjustment while Central Pacific retains its accepted date-line view.
- The zoom recheck passed, but exposed a first-transition defect from Atlantic to Eastern Pacific. Releasing the old bounds before moving did not resolve it on desktop, while the transition worked at a mobile viewport. That comparison identified destination bounds too small for the rendered desktop map at zoom 4; Eastern Pacific's protective pan limits now contain at least a 1600-by-900 projected-pixel viewport at the accepted preset zoom. The desktop transition recheck passed.
- Owner review then requested Atlantic and Eastern Pacific one level farther out on mobile. Both preset and data-fit zooms now subtract one level at the existing 680-pixel breakpoint, including live breakpoint changes; Central Pacific is unchanged. The final desktop/mobile owner recheck passed.
- Automated lifecycle and coordinate tests do not establish rendered appearance, tile behavior, popup usability, or horizontal-overflow acceptance.

## Deferred integration refinement

- The mobile harness legend is functional and did not block Phase 2 acceptance, but its placement and density may need to be rethought once the engine is mounted within the actual unified tropical page. Reassess it against the real surrounding content during Phase 3 rather than treating the isolated harness layout as final.

## Owner smoke checklist

1. Switch Atlantic -> Eastern Pacific -> Central Pacific -> Atlantic and confirm the state panel always reports one map instance.
2. Confirm Eastern Pacific reports and displays two outlook areas and two outlook points.
3. Confirm Central Pacific reports and displays one outlook area, one storm, two track segments, and one cone without a nearly global fit.
4. Open storm and outlook popups and confirm they are readable and remain within the map.
5. Rapidly switch basins and confirm old layers do not remain or duplicate.
6. At a narrow width, confirm the legend compacts and moves left, buttons stack, controls remain usable, and the page has no horizontal scrollbar.
7. Report browser console errors separately from visible acceptance.

## Phase boundary

Phase 2 does not mount the engine on `tropical.html`, change compatibility routes, update navigation, or touch the active-storm page. Stop after owner smoke and obtain approval before Phase 3 begins the unified tropical overview migration.
