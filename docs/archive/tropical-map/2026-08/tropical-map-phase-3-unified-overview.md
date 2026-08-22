# Tropical Map Phase 3: Unified Overview

> Archived historical Phase 3 evidence preserved on 2026-08-22. Its statement
> that Phase 4 had not begun is a point-in-time record; Phase 4 was later
> implemented. Use the [current tropical handoff](../../../tropical-map-next-session-plan.md).

Updated: 2026-08-21
Status: complete and committed through `9e3ecb6`, synchronized with `origin/main`. The owner confirmed the shared city labels, scoped favorites, and homepage integration are working correctly, including Greenville on the Tropical and homepage scopes. Phase 4 has not begun.

## Implemented scope

- `tropical.html` is now the single canonical overview shell for Atlantic, Eastern Pacific, and Central Pacific basin state at `?basin=atl|epac|cpac`.
- `js/modules/tropicalOverview.js` owns basin URL normalization, History API updates, Back/Forward restoration, roving-tab keyboard behavior, page copy, support products, alert-style active-system summaries, and one persistent `TropicalMapEngine` instance.
- Basin revisits reuse the already validated package in page memory while retaining the engine's generation and layer-replacement protections.
- Owner viewport tuning makes each basin's configured `center` and `zoom` authoritative on the canonical overview page. Feature layers still render normally, but they no longer recenter or re-zoom the map after loading. Mobile zoom adjustments remain active.
- The page now uses the same `counties/css/county.css` weather-center shell and `css/interactive-weather-map.css` map patterns as the homepage and county pages. `css/tropical.css` contains only tropical-specific layout and responsive overrides; the temporary standalone `css/tropical-shell.css` is no longer used.
- The shared navigation retains the tropical `NCHurric` + hurricane icon + `ne` wordmark rather than inheriting the ChuckCopelandWX homepage brand.
- The three basin tabs now form the first row inside one `weather-center-map-card`; Overview, Satellite, Graphics, and Text Products form its second row. Basin selection updates every panel while Current Systems remains immediately above the card.
- The real mobile page moves a product-aware legend below the map. Its density and placement remain an owner-smoke item rather than an assumed visual acceptance.
- At the mobile breakpoint, the in-map Leaflet legend is hidden so the product-aware legend below the map is the single visible overview legend.
- Overview feature popups use the site's dark navy Leaflet treatment, Montserrat headings, light official-source links, yellow focus states, and a branded close control without affecting popups on unrelated maps.
- Popup links never expose KMZ downloads. Outlook features route to the matching human-readable NHC basin outlook page, while unrecognized KMZ sources fail closed without rendering a link.
- Current Systems uses the county-page alert-chip and legitimate-empty alert presentation. Official outlook/surface imagery and basin text remain basin-specific; Central Pacific exposes only its own outlook text.
- `js/modules/tropicalSatelliteMap.js` composes the homepage `InteractiveWeatherMap` engine for time-aware Leaflet WMS imagery, retained frame layers, animation/scrubbing, shared basemaps, and NOAA STAR image fallback. Basemap selection uses the standard Leaflet layers control inside the map rather than a toolbar dropdown.
- The Satellite panel uses the homepage/county horizontal colorbar structure and product scales: Visible 0–255, Shortwave IR 0–100, Water Vapor 0–63, the multicolor Clean IR temperature scale, and a text-only GeoColor legend.
- Clean IR is the initial Satellite product for every basin; a product chosen manually remains selected while switching basins.
- The overview Satellite panel always uses the configured Atlantic, Eastern Pacific, or Central Pacific basin center and zoom, regardless of active-system count or position. Storm/floater targeting is reserved for the storm-specific `/active` page.
- The overview NOAA STAR fallback likewise uses the selected basin sector rather than a storm floater.
- Overview and Satellite share the same basin centers, zooms, responsive adjustment, and optional extent rules, so switching sections does not change the geographic framing.
- Both maps display the same local, noninteractive Natural Earth world-border overlay.
- Both maps share one cached 20,000-record city-label asset derived from the owner-provided SimpleMaps free Basic dataset. Zoom-level rank thresholds and screen-space collision thinning keep the rendered subset bounded; Central Pacific longitudes normalize around the active map center so labels do not duplicate across the date line.
- Editorial label priorities live separately in `js/data/map-city-favorites.json`; source and generated city datasets remain untouched. Honolulu, Hamilton (Bermuda), and Nassau are Tropical favorites at zoom 4. The owner added Greenville with combined `tropical` and `homepage` scope and confirmed it works. Favorites bypass normal rank filtering and take collision priority over ordinary labels; the shared loader also supports future `county` scope.
- Overview city labels render above world borders but below outlooks, storms, cones, and hazards. Satellite city labels render above imagery and reference borders. Leaflet's visible attribution credits SimpleMaps and CC BY 4.0 whenever the city layer is present.
- Official source links remain external HTTPS links. The current Ocean Prediction Center full-basin products replace the retired color-PNG surface-analysis endpoint.

## Accessible and URL behavior

- Basin buttons are real `role="tab"` controls with one shared `tabpanel`, roving `tabindex`, click activation, Arrow Left/Right wrapping, and Home/End support.
- The four weather-center section tabs use the same roving keyboard behavior and hide inactive panels without recreating either Leaflet map.
- Basin changes use `history.pushState`; `popstate` restores the basin without adding another history entry.
- Missing or invalid basin values normalize to Atlantic. Unrelated query values and URL fragments are retained when a basin is selected.
- Page title, heading, map accessible name, and visible support content stay synchronized with the active basin.

## Validation evidence

- `node --check js/modules/tropicalMapEngine.js`: passed.
- `node --check js/modules/tropicalOverview.js`: passed.
- `node --check js/modules/tropicalSatelliteMap.js`: passed.
- `node --check js/modules/tropicalCityLabels.js`: passed.
- `node --check scripts/build-tropical-city-labels.mjs`: passed.
- `node --test test/tropical-map/*.test.mjs`: passed 44 tests, including separate favorite-data validation, scoped merging, zoom-4 rank bypass, shared city/favorite caching, collision priority, date-line normalization, attribution, world-border installation, pane ordering, and shared Overview/Satellite basin views.
- `php test/tropical-map/phase0_fixture_contract.php`: passed all Phase 0 source-fixture checks.
- `php test/tropical-map/tropical_map_parser_test.php`: passed 59 Phase 1 parser/publication checks.
- `node scripts/build-tropical-city-labels.mjs`: deterministically produced exactly 20,000 records containing only `city`, `latitude`, `longitude`, and `rank`; the compact asset is 1,444,002 bytes.
- Deterministic fixture publication produced Atlantic, Eastern Pacific, and Central Pacific packages under the ignored `active/cache/tropical-map/` smoke directory.
- Local HTTP probes returned `200` for the revised unified page, Overview controller, Satellite controller, city-label module, 1,444,002-byte city asset, and 2,067,692-byte local world-border asset.
- Follow-up HTTP probes also returned `200` for the shared favorites module, the 529-byte favorites JSON, the homepage and Bertie County pages, and both shared county weather-map controllers.
- Static page checks cover one shared basin panel, four nested weather-center panels, unique element IDs, the verified Leaflet stylesheet integrity value, exclusion of legacy page controllers, basin-specific supporting products, URL normalization, and tab-key behavior.
- `git diff --check`: passed. Line-ending conversion notices are warnings only.
- The official NHC graphical outlook page confirms the basin outlook products. Current NOAA Ocean Prediction Center Atlantic and Pacific pages confirm the full-basin analysis products used by the controller.

## Browser validation boundary

- Controlled-browser validation was not performed because the Codex in-app Browser connection remains blocked before page control by `Trusted RPC dependency must resolve within a configured trusted code path` for the bundled browser service.
- Automated, parser, source, and local HTTP results do not establish rendered layout, tile behavior, interaction feel, satellite image loading, popup usability, or absence of horizontal overflow.
- The first owner desktop/mobile smoke accepted basin switching, first-click viewport correction, responsive zooms, and map tiles. Subsequent owner review drove the shell width, Satellite framing, border, city-density, and favorites revisions; the owner then confirmed the shared city labels, favorites, and homepage workflow were working correctly. Retain the checklist below as a complete pre-deployment regression rather than an implementation blocker.

## Retained pre-deployment owner regression checklist

1. Open `http://127.0.0.1:8086/tropical.html?basin=atl&v=20260820-phase3-13` at desktop width.
2. Switch Atlantic -> Eastern Pacific -> Central Pacific -> Atlantic. Confirm each region and zoom are correct on the first click and old layers never remain.
3. Use Back and Forward, then refresh a direct Eastern or Central Pacific URL. Confirm the selected tab, heading, map, and supporting content follow the URL.
4. Open an invalid basin such as `?basin=invalid` and confirm the page safely presents Atlantic.
5. Confirm Current Systems matches the county alert styling, including the no-active-system state and any active-system detail link.
6. Exercise Overview, Satellite, Graphics, and Text Products. Confirm both tab rows stay in the same weather-center card and all content follows the selected basin.
7. In Satellite, change the product, use the Leaflet layers control to change the basemap, and exercise the scrubber and play/pause state. Confirm every basin matches its Overview center, zoom, and extent even when one or more active systems are present. Record whether interactive WMS frames load or the basin-sector NOAA STAR fallback appears.
8. Repeat at a mobile width. Confirm Atlantic and Eastern Pacific retain their accepted one-level-farther-out overview views, Central Pacific remains correct, and note any legend-density changes desired for the later site-integration tweak.
9. On both Overview and Satellite, confirm world borders remain visible without obscuring weather data. At default zoom 4, confirm Hamilton and Nassau appear in Atlantic and Honolulu appears in Central Pacific; at several zoom levels, confirm city labels remain useful rather than crowded, favorites win ordinary collisions, and the Central Pacific has no duplicated date-line labels.
10. Confirm the Leaflet attribution visibly credits SimpleMaps and CC BY 4.0 on both maps.
11. Open an outlook or storm marker popup. Confirm its dark navy surface, heading, light official-source link, close button, and yellow focus treatment remain readable on desktop and mobile.
12. Confirm keyboard basin/section switching, visible focus, usable map controls, and no horizontal page scrollbar.
13. Report visible acceptance and browser-console errors separately.

## Phase boundary

Phase 3 changes the canonical `tropical.html` overview and its shared assets. The city-favorites follow-up also teaches the existing county/homepage city-label loader to consume the same scoped editorial file. Greenville is intentionally visible on the homepage; no current record uses `county`, so county output remains unchanged. It does not change `tropical_at.html`, `tropical_ep.html`, global navigation destinations, compatibility behavior, the active-storm page, deployment state, or Git staging. Those actions belong to later approved phases.
