# Tropical Overview and Active-Storm Maps: Next-Session Plan

Updated: 2026-08-20
Repository: `K:\Web Design\NCHurricane 2025`  
Status: Phases 0, 1, and 2 are complete, and the Phase 3 baseline is committed at `45ff1fb`. The final Phase 3 follow-up adds shared, collision-managed 20,000-city labels plus a separate scoped editorial-favorites file to Overview and Satellite and is implemented and validated locally; owner desktop/mobile smoke testing is pending. Evidence is documented in [`tropical-map-phase-0-source-contracts.md`](tropical-map-phase-0-source-contracts.md), [`tropical-map-phase-1-normalized-packages.md`](tropical-map-phase-1-normalized-packages.md), [`tropical-map-phase-2-shared-leaflet-engine.md`](tropical-map-phase-2-shared-leaflet-engine.md), and [`tropical-map-phase-3-unified-overview.md`](tropical-map-phase-3-unified-overview.md). Phase 4 compatibility routes and navigation have not begun and require approval after Phase 3 acceptance. Do not commit, deploy, or overwrite user-owned working-tree changes without explicit authorization.

## Objective

Modernize the tropical experience into two related map modes using one shared Leaflet engine:

1. A unified basin-overview page for the Atlantic, Eastern Pacific, and Central Pacific.
2. A storm-detail map on `active/index.html` for one selected tropical cyclone.

The overview answers: **What is happening across this basin?**  
The active page answers: **What is this storm doing, where is it going, and what hazards are associated with it?**

The maps must complement one another rather than duplicate the same controls and information.

## Current working-tree boundary

Before editing in the next session:

1. Read the user-provided `AGENTS.md` instructions.
2. Read this document completely.
3. Run `git status --short` and `git log -5 --oneline`.
4. Preserve every unrelated change in the dirty tree.
5. Treat `active/cache/nhc_current_storms.json` as user-owned temporary test state. The user temporarily added `AL052025` so the archived Erin page could pass the current active-storm gate. Do not discard, rewrite, stage, or commit that change unless the user explicitly directs it.
6. Do not stage, commit, push, deploy, or modify production data unless explicitly requested.

At handoff time, the repository also contains uncommitted homepage, informational-page, county-page, shared-style, weather-map, boundary, and generated-data work. Tropical implementation must not absorb or reformat those unrelated changes.

## Pages and route strategy

### Recommended final routes

- Unified overview: `tropical.html?basin=atl`
- Eastern Pacific view: `tropical.html?basin=epac`
- Central Pacific view: `tropical.html?basin=cpac`
- Storm detail: `active/?storm={ATCF_ID}`

Use `atl`, `epac`, and `cpac` as UI basin keys. Continue using official ATCF prefixes `AL`, `EP`, and `CP` for storms.

### Compatibility routes

- `tropical_at.html` should remain a compatibility entry point for Atlantic and route to the unified page with `basin=atl`.
- `tropical_ep.html` should remain a compatibility entry point for Eastern Pacific and route to the unified page with `basin=epac`.
- Do not create a separate Central Pacific HTML page unless a later SEO or deployment requirement justifies it.
- Preserve incoming links and browser history. Prefer a server redirect when deployment supports it; otherwise use a minimal, accessible HTML/JavaScript redirect with a visible fallback link.
- Update navigation links only after the unified page is functional.

### Canonical and metadata policy

- Make the unified overview canonical at `https://nchurricane.com/tropical` unless the owner chooses separate indexable basin URLs.
- Keep the selected basin in the URL so bookmarks and shared links restore the correct tab.
- Update the document title and visible heading when the basin changes, but avoid pretending that client-only tab content is three separately indexed pages if all variants share one canonical URL.
- Preserve the current social-card image unless separately replaced.

## Branding and shared visual system

All tropical and active-storm pages use the tropical-only wordmark:

- `NCHurric`
- Font Awesome hurricane symbol as the `a/o` treatment
- `ne`
- Accessible label: `NCHurricane home`
- The hurricane symbol spins with the same 5.4-second timing used by the lightning-bolt animation on the rest of the site.
- Disable animation under `prefers-reduced-motion: reduce`.

Use the current county/home design language:

- Dark blue-gray page gradient.
- Near-black header.
- Dark navy cards with restrained borders, radius, and shadow.
- White primary text, muted blue-gray secondary text, and yellow accents.
- Integrated card headings instead of the old translucent glass labels.
- Consistent focus-visible treatment and minimum touch targets.
- Updated 2026 footer language and shared navigation behavior.

Remove from the migrated pages:

- Isabel photographic body background.
- Hidden SVG glass-distortion filter.
- Legacy `.glass` presentation.
- Old image-banner logo.
- Large all-yellow headings and excessive text shadow.

## Shared tropical map architecture

Create one reusable engine with two explicit modes rather than importing page controllers into one another.

Suggested ownership:

```text
js/modules/tropicalMapEngine.js
  - Leaflet map lifecycle
  - basin view definitions
  - basemap ownership
  - common layer groups
  - storm symbols
  - GeoJSON styles
  - legend construction
  - popup helpers
  - responsive control placement
  - dateline normalization

js/modules/tropicalOverview.js
  - basin tabs and URL state
  - overview package loading
  - outlook areas
  - all active storms in selected basin
  - overview cone/track layers
  - overview status and timestamps

active/js/activeStormMap.js
  - selected storm ID
  - detailed storm package loading
  - detailed layers and controls
  - archive/live status
  - storm-specific fit and popup behavior
```

The exact filenames may change after inspection, but preserve this separation of responsibilities.

### Engine requirements

- Initialize Leaflet once per page.
- Never recreate the map merely because the selected basin changed.
- Maintain named `L.LayerGroup` or `L.GeoJSON` owners for each product.
- Clear and repopulate only the affected groups.
- Reject stale asynchronous basin/storm loads with a generation token or abort controller.
- Keep loading, unavailable, legitimate-empty, and stale-cache states distinct.
- Preserve completed layers while replacement data loads when safe.
- Use source timestamps rather than browser fetch time as the authoritative product time.
- Make popups keyboard reachable and links descriptive.
- Provide a text status equivalent for visible map content.
- Attribute NHC/NOAA data clearly.

## Official source inventory

Re-verify all source URLs and schemas at implementation time. NHC formats and filenames can change.

### Active-storm discovery

Primary official source:

`https://www.nhc.noaa.gov/CurrentStorms.json`

Expected fields include:

- `id`
- `name`
- `classification`
- current numeric latitude/longitude
- intensity, pressure, movement, and last update
- advisory number and issuance time
- forecast-track link
- cone link
- wind-radii links
- best-track link
- arrival-time links
- probability and surge links when issued

The feed currently includes `AL`, `EP`, and `CP` storms.

### Graphical Tropical Weather Outlook

Atlantic latest directory:

`https://www.nhc.noaa.gov/archive/xgtwo/atl/latest/`

Expected products:

- `xgtwo_atl.json`
- `gtwo_atl.kmz`
- zipped shapefiles
- official 2-day and 7-day raster graphics

Eastern and Central Pacific latest directory:

`https://www.nhc.noaa.gov/archive/xgtwo/epac/latest/`

Expected products:

- `xgtwo_pac.json`
- `gtwo_pac.kmz`
- `xgtwo_cpac.json`
- `gtwo_cpac.kmz`
- zipped shapefiles
- official 2-day and 7-day raster graphics

Do not assume that the `xgtwo_*.json` files are GeoJSON. Inspect and document their current schema first. Prefer their geometry if it is complete and stable; otherwise convert the official KMZ to normalized GeoJSON.

### Storm-specific GIS products

Use the exact URLs advertised for each storm by `CurrentStorms.json` when available:

- Forecast track.
- Cone of uncertainty.
- Watches and warnings.
- Initial wind extent.
- Forecast wind radii.
- Preliminary best track.
- Earliest reasonable arrival time of tropical-storm-force winds.
- Most likely arrival time.
- Wind-speed probabilities.
- Storm-surge products when issued.

For archives, retain locally cached normalized products; do not depend on a storm remaining in `CurrentStorms.json`.

## Cache and normalization pipeline

Do not make every browser download and parse zipped shapefiles or KMZ files. Build an application-owned cache that publishes browser-ready JSON/GeoJSON.

Preferred flow:

```text
NHC JSON / KMZ
      -> bounded server-side fetch
      -> schema and storm-ID validation
      -> KMZ unzip and KML parse when required
      -> geometry normalization
      -> atomic JSON/GeoJSON publication
      -> last-known-good retention
      -> Leaflet consumer
```

PHP `ZipArchive` plus XML parsing can handle the selected KMZ products without adding a browser dependency. If the hosting PHP build lacks the required extensions, document that early and choose a bounded alternative rather than silently shifting expensive conversion into every browser.

### Suggested overview cache

```text
active/cache/tropical-map/
  overview-atl.json
  overview-epac.json
  overview-cpac.json
```

Each overview package should contain:

- Schema version.
- Basin key.
- Source issuance/update times.
- Cache generation time.
- Source URLs.
- Stale/fresh status metadata.
- Outlook disturbance points.
- Outlook development polygons.
- Active-storm point summaries.
- Simplified current forecast tracks.
- Simplified cone polygons.
- Empty arrays for legitimate no-activity states.

### Suggested storm cache

```text
active/storms/{ATCF_ID}/map/
  manifest.json
  current-position.geojson
  best-track.geojson
  forecast-track.geojson
  cone.geojson
  watches-warnings.geojson
  wind-radii.geojson
  surge-watches-warnings.geojson
  arrival-time.geojson
```

The manifest should record:

- Exact uppercase ATCF ID.
- Advisory number.
- Source issuance time.
- Source URLs.
- Product availability.
- Product-specific timestamps.
- Cache-generation time.
- Archive/live status.
- Schema version.

### Publication rules

- Validate the requested storm ID against the payload before publication.
- Never serve one storm directory under another storm ID.
- Write temporary files and rename atomically.
- Keep the last valid package on transient upstream failure.
- Mark stale data visibly rather than replacing it with an empty success response.
- Represent a legitimate no-outlook/no-storm state as successful empty data.
- Bound downloads, retries, parsing time, and output size.
- Do not commit generated live cache unless the owner explicitly wants fixtures.

## Central Pacific and international date line

Central Pacific support is a first-class requirement, not an afterthought.

- Basin UI key: `cpac`.
- Storm prefix: `CP`.
- Normalize longitudes consistently.
- Split LineStrings and polygon rings that cross the international date line.
- Prevent `fitBounds()` from choosing a nearly global span for a small feature crossing 180 degrees.
- Prevent duplicate markers on wrapped world copies.
- Decide whether the basemap permits world wrapping; configure `noWrap`, `worldCopyJump`, and maximum bounds deliberately.
- Test a real or fixed Central Pacific fixture near the date line at desktop and mobile widths.

## Page 1: Unified tropical basin overview

### Role

Provide a fast, uncluttered basin-level answer. It is not the detailed hazard-analysis page.

### Top-level layout

```text
NCHurric[spin]ne branding and shared navigation

Tropical Weather
Official NHC outlook areas and active tropical cyclones

[ Atlantic ] [ Eastern Pacific ] [ Central Pacific ]

Persistent Leaflet map
  - active-storm markers
  - simplified forecast tracks
  - cones
  - outlook disturbance points
  - outlook development areas

Legend / status / issuance time

Active systems summary
Tropical text products
Satellite imagery
Official graphics and source links
```

### Basin tabs

- Implement actual buttons with `role="tab"`, `aria-selected`, `aria-controls`, and roving `tabindex`.
- Support click, left/right arrow, Home, and End.
- Update `?basin=` using `history.replaceState` or `pushState` without reloading.
- Handle `popstate` so browser Back/Forward restores the selected basin.
- Default invalid or absent basin values to Atlantic.
- Changing basin updates heading, descriptive copy, map view, layers, status, and basin-specific supporting products.

### Basin view presets

Choose and verify explicit centers/bounds during implementation. Do not fit an empty basin to the entire world.

- Atlantic: Gulf, Caribbean, western and central Atlantic, and eastern tropical Atlantic.
- Eastern Pacific: Mexico and Central America westward toward the Central Pacific boundary.
- Central Pacific: Hawaiian region and Central Pacific responsibility area with correct dateline handling.

### Default overview layers

Always visible:

- Outlook disturbance points.
- Outlook development polygons.
- Active-storm markers.
- Simplified forecast track.
- Cone of uncertainty.

Do not include granular wind radii, arrival-time, wind probabilities, or surge rasters on the overview map.

### Storm markers and popups

Use consistent classification-aware symbols. Popup content should remain compact:

- Classification and storm name.
- Current intensity and pressure when available.
- Current movement.
- Advisory issuance time.
- Link to `active/?storm={ATCF_ID}`.

Do not reproduce the full active-page advisory in the overview popup.

### Outlook areas and popups

- Preserve official NHC risk categories and probability values.
- Use both color and text/pattern/label distinctions.
- Show 2-day and 7-day probabilities when present.
- Show the official issuance time.
- Provide the available official outlook text or a concise source-derived label; do not invent narrative.
- Provide a direct NHC source link.

### Legend and responsive behavior

- Desktop: compact map overlay in a corner that does not cover important activity.
- Mobile: move the legend below the map using the same responsive pattern already approved on the homepage.
- Treat the isolated harness's mobile legend as provisional. Reassess its placement and density with the real unified-page content during Phase 3; do not assume the harness arrangement is the final site treatment.
- Include entries only for products present in the selected basin, plus a legitimate no-activity message.
- Keep a visible timestamp/status row outside the map.

### Existing tropical content

Preserve functional output initially:

- Atlantic and Eastern Pacific text products.
- Atlantic Spanish TWO where currently supported.
- Surface-analysis links/products.
- Existing tropical satellite sectors and products.
- Official 2-day/7-day outlook graphics as fallback or secondary official graphics, not the primary basin interface.

Central Pacific supporting content needs an explicit source inventory. Do not show Atlantic/Eastern Pacific text under the Central Pacific tab merely to fill space.

## Page 2: Atlantic compatibility entry

`tropical_at.html` should no longer own a duplicate application after the unified page is accepted.

Implementation sequence:

1. Keep it unchanged while the unified page is built and tested.
2. Update internal Atlantic links to the unified route only after parity.
3. Convert it into a compatibility entry for `tropical.html?basin=atl`.
4. Retain a visible link if automatic navigation is unavailable.
5. Preserve appropriate canonical behavior according to the final deployment decision.

Do not delete this file during the migration.

## Page 3: Eastern Pacific compatibility entry

`tropical_ep.html` follows the same migration policy:

1. Keep it operational until the unified Eastern Pacific tab passes parity.
2. Update internal Pacific links only after parity.
3. Convert it into a compatibility entry for `tropical.html?basin=epac`.
4. Preserve a visible fallback link and deliberate canonical metadata.
5. Do not delete the file.

Central Pacific exists only as a tab in the unified page unless later requirements change.

## Active storm page: detailed map and new styling

Although the route is a fourth physical file, `active/index.html` is the third application surface in this plan: unified overview, legacy basin entry points, and storm detail.

### Role

Provide storm-specific detail without repeating the basin overview.

### Recommended top layout

```text
Storm type, name, and ATCF ID
Advisory number, issuance time, and live/archive state

Latest Information card | Detailed Leaflet storm map
```

Mobile stacks summary above the map.

### Default detailed layers

- Current storm position.
- Preliminary best/past track.
- Forecast track and forecast points.
- Cone of uncertainty.

### Optional detailed layers

- Tropical-storm and hurricane watches/warnings.
- Storm-surge watches/warnings.
- Current/forecast 34-knot wind radii.
- Current/forecast 50-knot wind radii.
- Current/forecast 64-knot wind radii.
- Earliest reasonable arrival time.
- Most likely arrival time.

Keep the initial map legible. Do not enable every polygon layer by default.

### Detailed popups

Forecast point popups may show:

- Forecast hour.
- Valid time.
- Forecast classification.
- Maximum sustained wind.
- Position.

Warning and radii popups should identify the product and issuance/advisory time without reproducing excessively long bulletins.

### Existing active-page sections

Preserve the existing data and generated interfaces during the first styling pass:

- Latest Information.
- Floater satellite.
- Text advisories.
- Track and Key Messages graphics.
- Wind analysis.
- Wind graphics.
- Wind probabilities.
- Surge and rainfall graphics.
- Radii controls and tables until map parity is verified.
- Existing English/Español/Français and product-tab behavior.

After map parity and owner acceptance, the following standalone presentations may be retired to avoid duplication:

- Watches/Warnings canvas.
- Storm Surge Alerts canvas.
- Redundant track/cone presentation whose only purpose is duplicating the interactive map.
- Redundant wind-radii presentation, only if the map replacement is equally clear and accessible.

Do not remove any of these in the first implementation step.

### Satellite policy

Owner revision approved on 2026-08-19: Satellite is now one of the four panels in the unified weather-center card and uses the same `InteractiveWeatherMap` Leaflet/WMS implementation as the homepage. A later owner correction reserves storm/floater targeting for `/active`; the unified overview always uses basin presets and basin-sector NOAA STAR fallback.

The interactive satellite panel must retain the following gates:

- On the unified overview, correct geographic extent comes only from the selected basin preset. Optional floater metadata and latest-storm targeting belong only on `/active`.
- Projection compatibility.
- Frame timestamps.
- Animation lifecycle and cancellation.
- Date-line handling for Central Pacific storms.
- Reliable fallback behavior.

### Archive support

The current page rejects any storm absent from `nhc_current_storms.json` before reading its local directory. Replace that active-only gate as a separate, explicit phase.

Desired rule:

1. Validate the requested ID against `^(AL|EP|CP)\d{2}\d{4}$`.
2. Load the matching local advisory and map manifest.
3. Require the advisory/manifest ATCF ID to match the requested ID exactly.
4. Determine live versus archive status from the current-storm feed.
5. Render a valid cached archive even when it is no longer in the current-storm feed.
6. Redirect to 404 only when identity validation or required local data fails.

This removes the need to edit `nhc_current_storms.json` for archive review.

### Active-page semantics

- Replace visual label `<div>` elements with real headings.
- Ensure every `aria-labelledby` points to an existing unique ID.
- Add `id="main-content"`.
- Preserve every JavaScript-owned ID required by the current renderers.
- Do not rename or delete generated-interface hooks without tracing all callers.

## Styling implementation strategy

Use the established site weather-center shell plus page-specific styles:

```text
counties/css/county.css
css/interactive-weather-map.css
css/tropical.css
active/css/active.css
active/css/storm-graphics.css
```

- `county.css`: existing site shell, basin-selector pattern, alert chips, weather-center card, and top/subtab presentation.
- `interactive-weather-map.css`: shared Leaflet map, fallback, timestamp, scrubber, legend, and note presentation.
- `tropical.css`: tropical-only overview, support-content, and responsive overrides.
- `active.css`: storm summary, detailed map layout, active-page generated interfaces.
- `storm-graphics.css`: keep only graphics-specific tab/media rules; align visual tokens with the shell.

Import the existing county/home weather-center selectors instead of copying them. Keep tropical overrides narrowly scoped under the tropical page.

## Failure and empty-state policy

Every product must distinguish:

- Loading.
- Fresh success with features.
- Fresh legitimate empty state.
- Last-known-good stale data.
- Partial product failure.
- Complete unavailable state.

Examples:

- No active storms is not an error.
- No outlook areas is not an error.
- An active storm with no surge product is not an error.
- A failed update with a valid prior package should show stale data and its timestamp.
- Never erase valid prior data because one upstream product is temporarily unavailable.

## Accessibility requirements

- Semantic page headings and section headings.
- Real basin tabs with keyboard navigation.
- Layer toggles with programmatic names and states.
- Visible focus indicators.
- Minimum touch targets.
- Map status text describing selected basin, active-storm count, and outlook-area count.
- Popup links reachable by keyboard.
- Non-color distinctions in legends.
- Reduced-motion handling for the hurricane wordmark and any map animation.
- No autoplay map animation.
- Ensure map keyboard controls do not trap focus.
- Preserve official-source links outside the map for users who cannot use it.

## Performance requirements

- One Leaflet instance per page.
- Basin packages loaded on demand and cached in memory after first use.
- Abort or invalidate superseded basin requests.
- Load granular storm layers only on the active page and preferably on demand.
- Simplify overview cone/track geometries only if topology and meaning remain intact.
- Keep generated packages bounded.
- Avoid parsing KMZ/shapefile archives in every browser.
- Lazy-load lower-page graphics and satellite content.
- Do not initialize hidden heavy sections until needed.

## Implementation phases

### Phase 0: reconfirm state and source contracts

1. Inventory the dirty tree and preserve unrelated changes.
2. Confirm the temporary `AL052025` current-storm edit with the owner; do not modify it.
3. Re-fetch official source examples for `AL`, `EP`, and `CP`.
4. Inspect the exact `xgtwo_*.json` schemas.
5. Download representative KMZ fixtures and document their KML structure.
6. Confirm server PHP extensions needed for bounded KMZ conversion.
7. Record selected source URLs, refresh frequencies, schemas, and fallback behavior.

Exit criterion: source contracts and conversion approach are documented and tested with fixtures before page code changes.

### Phase 1: shared normalized data packages

1. Implement overview package generation for Atlantic.
2. Extend to Eastern Pacific.
3. Extend to Central Pacific with date-line normalization.
4. Add active-storm point summaries from `CurrentStorms.json`.
5. Add overview forecast track and cone products.
6. Implement atomic publication and last-known-good behavior.
7. Add fixture-driven parser tests.

Exit criterion: all three overview packages validate and can be rendered independently of page markup.

### Phase 2: shared Leaflet engine

Implementation status: complete locally; automated checks and the isolated desktop/mobile owner smoke pass. See [`tropical-map-phase-2-shared-leaflet-engine.md`](tropical-map-phase-2-shared-leaflet-engine.md). Phase 3 was subsequently approved and implemented on the canonical overview page.

1. Implement basin view presets and common basemap ownership.
2. Implement outlook, active-storm, track, and cone groups.
3. Implement common popup and legend builders.
4. Implement responsive legend placement.
5. Implement dateline-safe rendering and fitting.
6. Add loading, empty, stale, and unavailable states.

Exit criterion: a minimal test harness switches all three basins without recreating the map, leaking layers, or producing horizontal overflow.

### Phase 3: unified tropical overview

Implementation status: the baseline is committed at `45ff1fb`. The approved 20,000-city label and scoped-favorites follow-up is implemented locally; static, automated, parser, data-generation, and local HTTP checks pass, with owner desktop/mobile smoke pending. See [`tropical-map-phase-3-unified-overview.md`](tropical-map-phase-3-unified-overview.md). Do not begin Phase 4 before owner acceptance and explicit approval.

1. Migrate `tropical.html` to the existing site weather-center shell and branding.
2. Add accessible basin tabs and URL state.
3. Mount the shared Leaflet overview map.
4. Add active-system summary links.
5. Present basin selection as the card's first tab row and Overview, Satellite, Graphics, and Text Products as its second row; use the Leaflet layers control for satellite basemap selection.
6. Present Current Systems with the county alert-chip styling.
7. Add Central Pacific supporting states without borrowing incorrect basin content.
8. Validate Back/Forward, refresh, deep links, and invalid basin normalization.
9. Match Satellite centers, zooms, responsive adjustments, and extents to Overview.
10. Add one shared local Natural Earth world-border overlay to Overview and Satellite.
11. Add shared, collision-managed world-city labels from a deterministic 20,000-record derivative of the owner-provided SimpleMaps free Basic dataset, including date-line normalization and visible CC BY 4.0 attribution.
12. Keep editorial city priorities in the separate shared `js/data/map-city-favorites.json`; seed Honolulu, Hamilton (Bermuda), and Nassau for Tropical at zoom 4, and support future `county` and `homepage` scopes without editing source datasets.

Exit criterion: Atlantic, Eastern Pacific, and Central Pacific work from one canonical page at desktop and mobile widths.

### Phase 4: compatibility routes and navigation

1. Verify overview parity against both old basin pages.
2. Update navigation to the unified tropical route.
3. Convert `tropical_at.html` into the Atlantic compatibility entry.
4. Convert `tropical_ep.html` into the Eastern Pacific compatibility entry.
5. Verify canonical, redirect, metadata, sitemap, and internal-link behavior.

Exit criterion: no existing Atlantic or Pacific link produces a dead end, redirect loop, wrong basin, or inaccessible transition.

### Phase 5: active-page shell and detailed map

1. Apply tropical branding and the shared dark shell to `active/index.html`.
2. Preserve current script-owned IDs and generated output.
3. Add the latest-information plus detailed-map top layout.
4. Generate and load detailed storm packages.
5. Add past track, forecast track/points, cone, warnings, surge warnings, and selectable radii.
6. Add optional arrival-time products only after the core map is stable.
7. Restyle all existing generated tabs, controls, text, graphics, loading, error, and empty states.
8. Keep current standalone hazard/radii views until owner-approved parity.

Exit criterion: at least one active-style fixture and `AL052025` render correctly with detailed layers and all prior non-map content remains usable.

### Phase 6: archive support

1. Replace the active-only gate with exact local package validation.
2. Display a clear Archived Storm status.
3. Ensure archive pages never request nonexistent current-only products without a fallback.
4. Verify exact-ID fail-closed behavior.
5. Remove the need for a temporary current-storm-list edit.

Exit criterion: `active/?storm=AL052025` loads from its validated archive while an unknown or mismatched ID redirects to 404.

### Phase 7: consolidation and owner decisions

1. Compare Leaflet warnings, surge, track/cone, and radii against the old standalone views.
2. Ask the owner which redundant views to retire.
3. Remove only approved duplicate presentations.
4. Keep official graphics and text products that add information beyond the map.
5. Re-run the complete regression after any removal.

## Validation plan

Report these categories separately.

### Static and parser checks

- `node --check` for every changed JavaScript module.
- `php -l` for every changed PHP/cache script.
- JSON parsing and schema validation for all generated manifests/packages.
- KMZ/KML fixture tests for points, lines, polygons, MultiGeometry, ExtendedData, and missing optional products.
- Date-line fixture tests.
- `git diff --check`.
- Reference search for superseded scripts/styles only after migration is complete.

### Runtime/API checks

- Atlantic overview with activity and with a legitimate empty fixture.
- Eastern Pacific overview with activity and with a legitimate empty fixture.
- Central Pacific overview with a real/fixed `CP` storm and date-line geometry.
- Partial upstream failure with last-known-good data.
- Complete unavailable state with no prior data.
- Stale timestamps and source attribution.
- Exact storm-ID mismatch rejection.

### Controlled-browser checks

At minimum test desktop `1280x900` and a narrow mobile viewport.

Unified overview:

- Load each basin directly from its URL.
- Switch tabs repeatedly and rapidly.
- Use keyboard tab navigation.
- Use browser Back/Forward.
- Refresh each basin.
- Open outlook and storm popups.
- Follow an active-storm link.
- Verify legend placement and contents.
- Verify no duplicated markers/layers.
- Verify no horizontal page overflow.
- Verify Central Pacific date-line behavior.

Active page:

- Load a current-storm fixture.
- Load archived `AL052025` after archive support is implemented.
- Exercise every detailed layer toggle.
- Open forecast-point and warning popups.
- Verify top summary and map at desktop/mobile widths.
- Exercise text advisory tabs.
- Exercise language/product graphics tabs.
- Exercise satellite controls.
- Exercise radii controls while they remain.
- Verify all official links.
- Verify loading, empty, stale, partial-failure, and unavailable states.
- Verify no horizontal overflow.

### Owner checks

- Approve basin tab wording and order.
- Approve overview symbology and legend density.
- Approve default detailed storm layers.
- Approve the active-page top layout.
- Decide whether standalone warning, surge, and radii views are redundant after map parity.
- Approve compatibility-route and canonical behavior before deployment.

### External-source checks

- Treat live NHC availability separately from local parser, static, and browser validation.
- Record direct source status and timestamp.
- Do not claim deployment or production success from local checks.
- Recheck live URLs during an actual advisory cycle when possible.

## Non-negotiable preservation rules

- Preserve current tropical text products until the unified replacements are verified.
- Preserve NOAA STAR static/animated satellite images as the failure fallback for the interactive WMS map.
- Preserve English/Español/Français storm-graphics behavior and product tabs.
- Preserve local archived storm files.
- Never substitute one storm's data for another storm ID.
- Do not fabricate outlook, advisory, warning, or hazard text.
- Do not silently treat upstream failure as no activity.
- Do not commit generated live cache without explicit authorization.
- Do not remove `tropical_at.html` or `tropical_ep.html`.
- Do not modify unrelated homepage, county, informational-page, or boundary work.

## Expected implementation files

Confirm exact names after Phase 0. Likely scope:

```text
tropical.html
tropical_at.html
tropical_ep.html
active/index.html
css/tropical.css
css/tropical-map-engine.css            (new)
active/css/active.css
active/css/storm-graphics.css
js/modules/tropicalMapEngine.js        (new)
js/modules/tropicalOverview.js         (new)
js/modules/tropicalSatelliteMap.js     (new)
active/js/activeStormMap.js            (new)
active/js/storm.js
active/api/tropical_map_cache.php      (new or replacement name)
active/cache/tropical-map/             (generated, normally ignored)
```

Other files may be required for navigation, sitemap, canonical routing, fixtures, or tests, but do not broaden scope without evidence.

## Ready-to-paste next-session prompt

```text
Continue the NCHurricane tropical-map migration in:

K:\Web Design\NCHurricane 2025

Start by reading the user-supplied AGENTS.md instructions and then read this file completely:

docs/tropical-map-next-session-plan.md

Next, run `git status --short` and `git log -5 --oneline`. Preserve every unrelated working-tree change. In particular, `active/cache/nhc_current_storms.json` contains a user-owned temporary AL052025 edit for archive review; do not overwrite, revert, stage, or commit it. Do not commit, push, or deploy unless I explicitly request it.

The target architecture is:

1. One canonical tabbed tropical overview at `tropical.html?basin=atl|epac|cpac`.
2. `tropical_at.html` and `tropical_ep.html` retained as compatibility entry points only after unified-page parity.
3. A shared Leaflet engine with separate overview and storm-detail modes.
4. Overview map: active storms, simplified track/cone, and NHC outlook areas only.
5. Active storm map: current/past/forecast positions, cone, warnings, surge warnings, selectable wind radii, and later optional arrival-time layers.
6. Standard site ChuckCopeland[Font Awesome bolt]WX navigation branding.
7. County/home dark weather-center language, reusing the existing site selectors with tropical-only overrides.

Begin with Phase 0 only unless I authorize implementation beyond it:

- Re-verify the official NHC CurrentStorms and Graphical Tropical Weather Outlook sources for AL, EP, and CP.
- Inspect the exact current `xgtwo_atl.json`, `xgtwo_pac.json`, and `xgtwo_cpac.json` schemas.
- Download representative official KMZ fixtures for outlook, track, cone, warnings, and radii.
- Determine whether the hosting PHP environment supports the required bounded KMZ unzip/XML conversion.
- Document the chosen source contracts, refresh policy, normalized overview/storm package schemas, date-line strategy, failure states, and exact proposed file changes.
- Make no page implementation changes during Phase 0 unless I explicitly approve them.

Keep static checks, parser/runtime tests, controlled-browser checks, owner smoke tests, and live external-source checks as separate validation categories. Do not infer one from another.
```
