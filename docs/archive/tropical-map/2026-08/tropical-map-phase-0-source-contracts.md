# Tropical Map Phase 0: Source Contracts and Conversion Plan

> Archived historical Phase 0 evidence preserved on 2026-08-22. Live-source
> observations are dated; reverify them before implementation. Use the
> [current tropical handoff](../../../tropical-map-next-session-plan.md) for
> active status and authorization boundaries.

Updated: 2026-08-18
Repository: `K:\Web Design\NCHurricane 2025`
Status: Phase 0 complete. Local fixture contracts pass, and the production PHP CLI capability check was confirmed by the owner on 2026-08-18. No tropical page, route, navigation, cache, or production-data implementation was changed.

## Decisions

1. Use the current `/xgtwo/` JSON and KMZ endpoints, not `/archive/xgtwo/{basin}/latest/`. The archive `latest` aliases returned May 2026 data during the 2026-08-18 probe; the `/xgtwo/` files returned August 17–18 data and are the paths linked by NHC's GIS page.
2. Treat `xgtwo_*.json` as metadata/text plus raster-annotation data, not GeoJSON. Its `shapes` coordinates are image pixels and must never be passed to Leaflet as longitude/latitude.
3. Use the corresponding `gtwo_*.kmz` KML for geospatial outlook geometry. Accept only placemarks with the expected geometry and NHC `ExtendedData`; ignore Atlantic's message-only empty-state points.
4. Use `CurrentStorms.json` for current storm status, numeric position, exact advisory identity, and advertised storm-product URLs. Normalize its lowercase IDs to uppercase only after exact format validation.
5. Determine a storm's overview membership from the selected basin's `xgtwo_*.json` `storms` list, then enrich it from `CurrentStorms.json`. Do not classify only by ATCF prefix: a storm can be shown by more than one official basin outlook while crossing a responsibility boundary.
6. Fetch and convert KMZ on the server. Do not add browser KMZ or shapefile parsing.
7. Use bounded `PharData` plus `DOMDocument` as the selected local conversion path. Local PHP 8.4.13 has `Phar`, `zlib`, `dom`, `libxml`, `SimpleXML`, `json`, and `curl`, and successfully parsed every downloaded fixture without `ZipArchive`.
8. Production CLI capability was confirmed by the owner on 2026-08-18: PHP 8.4.13 exposes `curl`, `json`, `phar`, `zlib`, `dom`, and `libxml`; `zip` is absent and is not required by the selected `PharData` route.

## Live source verification

The following responses were read directly on 2026-08-18. HTTP status, content type, and source timestamps must be rechecked during implementation and during an advisory cycle.

| Product | Selected URL | Probe evidence |
| --- | --- | --- |
| Active storms | `https://www.nhc.noaa.gov/CurrentStorms.json` | HTTP 200; snapshot includes `cp012026`, advisory `023`, valid 2026-08-18 03:00 UTC |
| Atlantic outlook JSON | `https://www.nhc.noaa.gov/xgtwo/xgtwo_atl.json` | HTTP 200; `Last-Modified: Mon, 17 Aug 2026 23:31:48 GMT`; issue key `202608180000` |
| Eastern Pacific outlook JSON | `https://www.nhc.noaa.gov/xgtwo/xgtwo_pac.json` | HTTP 200; `Last-Modified: Tue, 18 Aug 2026 02:48:45 GMT`; issue key `202608180000` |
| Central Pacific outlook JSON | `https://www.nhc.noaa.gov/xgtwo/xgtwo_cpac.json` | HTTP 200; `Last-Modified: Tue, 18 Aug 2026 02:49:07 GMT`; issue key `202608180000` |
| Atlantic outlook KMZ | `https://www.nhc.noaa.gov/xgtwo/gtwo_atl.kmz` | HTTP 200, `application/vnd.google-earth.kmz`, 11,292 bytes |
| Eastern Pacific outlook KMZ | `https://www.nhc.noaa.gov/xgtwo/gtwo_pac.kmz` | HTTP 200, `application/vnd.google-earth.kmz`, 23,361 bytes |
| Central Pacific outlook KMZ | `https://www.nhc.noaa.gov/xgtwo/gtwo_cpac.kmz` | HTTP 200, `application/vnd.google-earth.kmz`, 17,415 bytes |
| Combined outlook shapefiles | `https://www.nhc.noaa.gov/xgtwo/gtwo_shapefiles.zip` | HTTP 200, `application/zip`, 21,965 bytes; retained only as a documented fallback, not the selected parser input |

### Rejected live aliases

The initially proposed archive URLs returned structurally valid but old products:

- `https://www.nhc.noaa.gov/archive/xgtwo/atl/latest/xgtwo_atl.json`
- `https://www.nhc.noaa.gov/archive/xgtwo/epac/latest/xgtwo_pac.json`
- `https://www.nhc.noaa.gov/archive/xgtwo/epac/latest/xgtwo_cpac.json`
- Corresponding `gtwo_atl.kmz`, `gtwo_pac.kmz`, and `gtwo_cpac.kmz` files under those directories.

Those responses are preserved under `test/fixtures/tropical-map/official/stale-archive-latest/` for source-age regression coverage. A response is not acceptable merely because HTTP and schema checks pass; the builder must also record and evaluate the source issuance time.

## Source schemas

### `CurrentStorms.json`

Root contract:

```text
object
└── activeStorms: array (successful empty array is legitimate no-activity)
```

Observed storm fields:

```text
id, binNumber, name, classification, intensity, pressure,
latitude, longitude, latitudeNumeric, longitudeNumeric,
movementDir, movementSpeed, lastUpdate,
publicAdvisory, forecastAdvisory, windSpeedProbabilities,
forecastDiscussion, forecastGraphics, forecastTrack,
windWatchesWarnings, trackCone, initialWindExtent,
forecastWindRadiiGIS, bestTrackGIS,
earliestArrivalTimeTSWindsGIS, mostLikelyTimeTSWindsGIS,
windSpeedProbabilitiesGIS, stormSurgeWatchWarningGIS,
potentialStormSurgeFloodingGIS, peakSurgeKML
```

Contract rules:

- Validate `id` case-insensitively against `^(AL|EP|CP)\d{2}\d{4}$`, then publish uppercase.
- `intensity` is knots; `pressure` is millibars; `movementDir` is degrees from true north; `movementSpeed` is miles per hour.
- `latitudeNumeric` and `longitudeNumeric` are authoritative for marker geometry. Preserve the display strings separately.
- Advisory numbers are strings and may include leading zeroes or an intermediate suffix in source filenames.
- Product objects can be `null`; that is a legitimate unavailable/not-issued product, not a whole-package error.
- Use each product's advertised `kmzFile`/archive URL only after HTTPS host allowlisting and exact storm/advisory validation.
- Source `issuance`, `lastUpdate`, and `fileUpdateTime` values are authoritative product times. Cache fetch time is provenance only.

### `xgtwo_*.json`

All three current files share this root:

```text
metadata
  basin, basin_web, production_time, epoch,
  satellite_time_local, satellite_available, two_issue_date_time_str
disturbances
  2d: array
  7d: array
storms: array
two
  html_en, html_es
```

Observed disturbance object:

```text
id, forecast, probability, color_code, risk_level,
shapes, details_en, details_es
```

Observed storm object:

```text
storm_name, storm_type, storm_type_code, atcf_id,
storm_bin_number, shapes, details_en, details_es
```

Important constraints:

- Source basin `pac` maps to the UI basin key `epac`. Source `atl` and `cpac` map directly.
- `disturbances.2d` and `disturbances.7d` can describe the same disturbance at different forecast windows; merge by validated disturbance ID without dropping either probability.
- `shapes[].points`, `center_x`, `center_y`, and `radius` describe NHC's raster image coordinate space. They are useful only as schema evidence and must not become map geometry.
- `metadata.epoch` and `two_issue_date_time_str` are the primary outlook issuance evidence. Parse and cross-check them; retain the original strings.
- `two.html_en` and `two.html_es` are official source text containing markup. Sanitize to the small allowed subset already used by the site before display.
- `storms[].atcf_id` provides selected-basin membership. Enrich each exact ID with the matching `CurrentStorms.json` object; fail closed on mismatches.

### Outlook KMZ/KML

Use:

- `https://www.nhc.noaa.gov/xgtwo/gtwo_atl.kmz`
- `https://www.nhc.noaa.gov/xgtwo/gtwo_pac.kmz`
- `https://www.nhc.noaa.gov/xgtwo/gtwo_cpac.kmz`

Current active placemarks are `Polygon` or `Point` geometries with `ExtendedData` keys:

```text
Disturbance
2day_percentage
2day_category
7day_percentage
7day_category
Discussion
```

The Atlantic legitimate-empty snapshot contains two message-only `Point` placemarks at fixed display locations and no `ExtendedData`. The parser must not render those as disturbances. An outlook feature requires the required NHC disturbance fields plus an allowed geometry.

### Storm KMZ/KML

Use exact URLs advertised by the matching `CurrentStorms.json` storm object. The snapshot contracts are:

| Product | Observed KML structure | Required identity handling |
| --- | --- | --- |
| Forecast track | Two `LineString` paths, nine forecast `Point` placemarks; line `ExtendedData` includes `atcfid`, `advisoryNum`, `fcstpd`, storm metadata | Require exact ATCF ID and advisory; point details provide forecast validity/intensity |
| Cone | One `Polygon`; `ExtendedData` includes exact ATCF ID and advisory | Reject identity mismatch |
| Wind warnings | One placemark per coastal `LineString`; placemark name is warning/watch type; `ExtendedData` includes exact storm/advisory | Preserve separate segments and source names |
| Initial radii | Polygons named `34`, `50`, or `64`; no `ExtendedData` in the observed KML | Identity comes from the validated advertised URL and enclosing storm manifest |
| Forecast radii | Ordered polygon groups named `34`, `50`, or `64`; no timestamps or forecast-hour fields in the observed KML | Correlate groups to validated ordered forecast points; fail the product on count/order mismatch instead of inventing times |

The standard forecast hours are 0, 12, 24, 36, 48, 60, 72, 96, and 120, but the parser must derive published point validity from the track/forecast source. A new radii group begins at each `34` polygon. The observed advisory has nine groups and nine forecast points. Missing 50/64-knot polygons within a group are legitimate.

## Refresh and freshness policy

NHC publishes routine Tropical Weather Outlooks every six hours at 0000, 0600, 1200, and 1800 UTC during each basin's routine season, with special outlooks possible at any time. Standard tropical cyclone advisory packages are issued every six hours; intermediate public advisories can be issued every three hours while coastal watches/warnings are in effect, and special packages can occur at any time.

The application policy is therefore:

- Attempt a conditional source refresh at most once per five minutes. Use `If-None-Match` and `If-Modified-Since` when NHC supplies validators.
- Keep the browser on static normalized JSON. Browser requests do not trigger upstream downloads or KMZ parsing.
- Preserve the last-known-good package during any transient failure.
- Treat cache state and source age as separate fields. `stale` means the refresh failed and the last-known-good package is being served; it does not mean the NHC issue time is the cache fetch time.
- During a routine issuance period, flag an issue-time anomaly after eight hours without a newer accepted product, but continue serving the last valid package with its exact timestamp.
- Outside routine issuance, preserve the last official outlook as `routine-inactive`; do not mislabel it as a fresh new issue or erase it as an error.
- A source with an older issuance time than the currently published last-known-good product is rejected as a regression.
- A successful, validated source containing no disturbances/storms is `empty`, not `unavailable`.

## Bounded fetch and KMZ conversion

### Required runtime capabilities

Selected path:

```text
PHP 8.4+
curl + json
Phar + zlib
dom + libxml
```

`SimpleXML` remains available for existing site scripts but is not required by the selected KML parser. `ZipArchive` is an optional fallback, not a selected requirement.

The local fixture contract proves that `PharData` can read these ZIP-based KMZ files without `ZipArchive`. It does not prove production CLI capability.

### Bounds and safety rules

- HTTPS only; allowlist `www.nhc.noaa.gov` and exact documented NOAA archive hosts.
- Connect timeout 8 seconds; total request timeout 30 seconds; at most two bounded attempts.
- Reject a response with an unexpected content type, non-2xx status, or size over 5 MiB.
- At most 64 archive entries, 8 MiB per entry, and 16 MiB total uncompressed content.
- Reject traversal names, absolute inner paths, symlinks, encrypted archives, nested archives, and more than one candidate KML document unless a product contract explicitly expects otherwise.
- Reject XML containing a document type. Parse with `LIBXML_NONET`; never enable external entity substitution.
- Accept only KML geometry types explicitly supported by the product parser: `Point`, `LineString`, `Polygon`, and `MultiGeometry` after fixture coverage exists.
- Limit coordinate count and output feature count per product; retain source precision but reject non-finite/out-of-range latitude values.
- Download to a private temporary path, validate completely, then publish JSON by same-directory temporary write plus atomic rename.
- Keep the previous valid file until all source, identity, schema, geometry, and serialization checks succeed.

## Normalized overview package

Proposed generated files:

```text
active/cache/tropical-map/overview-atl.json
active/cache/tropical-map/overview-epac.json
active/cache/tropical-map/overview-cpac.json
```

Top-level contract:

```json
{
  "schemaVersion": "1.0.0",
  "kind": "tropical-overview",
  "basin": "epac",
  "generatedAt": "2026-08-18T04:30:00Z",
  "state": "fresh",
  "stale": false,
  "sourceIssueTime": "2026-08-18T00:00:00Z",
  "sources": [],
  "counts": {
    "outlookAreas": 0,
    "activeStorms": 0,
    "forecastTracks": 0,
    "cones": 0
  },
  "layers": {
    "outlookAreas": { "type": "FeatureCollection", "features": [] },
    "stormPositions": { "type": "FeatureCollection", "features": [] },
    "forecastTracks": { "type": "FeatureCollection", "features": [] },
    "cones": { "type": "FeatureCollection", "features": [] }
  },
  "text": {
    "outlookEnglishHtml": "",
    "outlookSpanishHtml": ""
  },
  "errors": []
}
```

Allowed package states:

```text
loading       client-only state before a package resolves
fresh         all required sources succeeded
empty         all required sources succeeded with no map features
partial       one product failed but other fresh or last-known-good products remain
stale         refresh failed and an older valid package is retained
unavailable   no valid current or prior package exists
routine-inactive  latest official outlook is outside routine issuance
```

Every `sources[]` item records `product`, `url`, `httpLastModified`, `sourceIssueTime`, `fetchedAt`, `state`, and optional error code. Outlook feature properties include disturbance ID, 2-day/7-day category and percentage, official discussion, issuance time, and source URL. Storm-position properties include exact storm ID, name, classification, intensity in knots, pressure in millibars, movement direction/speed with units, advisory number, issuance time, and detail URL.

## Normalized storm package

Proposed generated files:

```text
active/storms/{ATCF_ID}/map/manifest.json
active/storms/{ATCF_ID}/map/current-position.geojson
active/storms/{ATCF_ID}/map/best-track.geojson
active/storms/{ATCF_ID}/map/forecast-track.geojson
active/storms/{ATCF_ID}/map/cone.geojson
active/storms/{ATCF_ID}/map/watches-warnings.geojson
active/storms/{ATCF_ID}/map/wind-radii.geojson
active/storms/{ATCF_ID}/map/surge-watches-warnings.geojson
active/storms/{ATCF_ID}/map/arrival-time.geojson
```

Manifest contract:

```json
{
  "schemaVersion": "1.0.0",
  "kind": "tropical-storm-map",
  "stormId": "CP012026",
  "stormState": "live",
  "advisoryNumber": "023",
  "sourceIssueTime": "2026-08-18T03:00:00Z",
  "generatedAt": "2026-08-18T04:30:00Z",
  "state": "partial",
  "products": {
    "currentPosition": { "state": "fresh", "file": "current-position.geojson" },
    "forecastTrack": { "state": "fresh", "file": "forecast-track.geojson" },
    "cone": { "state": "fresh", "file": "cone.geojson" },
    "watchesWarnings": { "state": "not-issued", "file": null },
    "windRadii": { "state": "fresh", "file": "wind-radii.geojson" }
  },
  "sources": [],
  "errors": []
}
```

Rules:

- Publish only beneath the exact validated uppercase storm directory.
- Require the requested ID, source ID, KML `atcfid` where present, existing local advisory ID, and manifest ID to agree.
- `live`/`archive` is derived from exact presence in the current feed; it never changes archive identity.
- A missing optional source is `not-issued`, not an error.
- GeoJSON feature properties carry product key, exact storm/advisory identity, valid time/forecast hour when source-derived, wind threshold in knots, warning type, source issuance time, and source URL.
- Do not publish a radii valid time when KML-to-forecast-point correlation is ambiguous.

## International date-line strategy

1. Store canonical longitudes in `[-180, 180)` in normalized GeoJSON.
2. Split any canonical `LineString` or polygon ring that crosses the antimeridian. Interpolate the boundary latitude, close polygon pieces, preserve holes and winding, and publish `MultiLineString`/`MultiPolygon` when required.
3. For rendering and fitting, unwrap each feature into a continuous longitude window around the selected basin/storm anchor. For a Central Pacific anchor near `-160`, a canonical `+175` point renders as `-185`, preventing nearly global bounds.
4. Configure Leaflet tile wrapping deliberately: tile `noWrap: false`, map `worldCopyJump: false`, and constrained basin/storm bounds. Add each application feature only once; do not duplicate markers for wrapped worlds.
5. Calculate fit bounds from the unwrapped render coordinates, not canonical min/max longitude.
6. Add synthetic tests for line, polygon, polygon hole, and `MultiGeometry` crossings because the 2026-08-18 live CP fixture does not cross 180 degrees.

## Failure-state matrix

| Condition | Published behavior |
| --- | --- |
| Valid response with no storms/disturbances | Fresh `empty` package with empty feature arrays |
| Outlook JSON succeeds; KMZ fails; prior geometry exists | `partial`; retain prior geometry and current text/timestamps separately |
| Outlook KMZ succeeds; JSON fails; prior metadata exists | `partial`; retain prior official metadata/text and do not assign a new issue time |
| Current storm product is `null` | Product `not-issued`; other products remain fresh |
| New fetch fails; last-known-good exists | Serve last-known-good as `stale` with failure time and original issue time |
| New source issue is older than last-known-good | Reject regression; keep last-known-good and report source-age anomaly |
| ATCF/advisory identity mismatch | Reject the affected product; never publish under requested storm |
| No valid new or prior package | `unavailable`; do not convert failure into no activity |
| One basin load superseded by another in the browser | Abort or ignore the old generation; never clear the newly selected basin |

## Phase 0 fixture evidence

Fixture inventory, source URLs, snapshot hashes, and observed structures are in [`test/fixtures/tropical-map/README.md`](../../../../test/fixtures/tropical-map/README.md).

Validation command:

```powershell
php test/tropical-map/phase0_fixture_contract.php
```

The 2026-08-18 run passed JSON schema checks, archive/path/size bounds, `PharData` extraction, non-networked DOM parsing, and product geometry minimums for all nine KMZ fixtures.

No controlled-browser check was performed in Phase 0 because no page implementation or page CSS changed. No owner smoke, deployment test, or production-host extension check should be inferred from the parser result.

## Exact proposed implementation files

### Phase 1: normalized packages

```text
active/api/tropical_map_builder.php        new; CLI-only coordinator and atomic publisher
active/api/tropical_map_lib.php            new; bounded fetch, KML parse, identity and geometry normalization
active/cache/tropical-map/                 generated; ignored except explicit fixtures if later approved
active/storms/{ATCF_ID}/map/               generated; already covered by the storm-directory ignore rule
.gitignore                                 add active/cache/tropical-map/
test/tropical-map/tropical_map_parser_test.php  new fixture-driven parser/date-line tests
test/fixtures/tropical-map/synthetic/      new MultiGeometry, missing-product, and date-line fixtures
README.md                                  update production requirements only after host capability is confirmed
```

Do not modify `active/api/tropical_data.php` or the committed `active/cache/nhc_current_storms.json` in Phase 1. The new builder should have an independent normalized cache so the temporary/archive test state cannot contaminate live source identity.

### Later approved phases

```text
css/tropical-shell.css
css/tropical.css
tropical.html
js/modules/tropicalMapEngine.js
js/modules/tropicalOverview.js
active/index.html
active/css/active.css
active/css/storm-graphics.css
active/js/activeStormMap.js
active/js/storm.js
tropical_at.html
tropical_ep.html
js/modules/navigation.js
sitemap.xml (only if current routing evidence requires it)
```

These page and navigation files remain untouched until Phase 1 packages pass their independent parser/runtime tests and the owner authorizes the next phase.

## Production capability evidence

The owner ran this read-only command in the production PHP CLI environment on 2026-08-18:

```bash
php -r 'echo json_encode(["php"=>PHP_VERSION,"sapi"=>PHP_SAPI,"curl"=>extension_loaded("curl"),"json"=>extension_loaded("json"),"phar"=>extension_loaded("Phar"),"zlib"=>extension_loaded("zlib"),"dom"=>extension_loaded("dom"),"libxml"=>extension_loaded("libxml"),"zip"=>extension_loaded("zip"),"pharData"=>class_exists("PharData")], JSON_PRETTY_PRINT), PHP_EOL;'
```

No public `phpinfo()` page is needed or recommended. If production lacks `PharData`/`zlib` but has `ZipArchive`, use the same bounds and parser contract through `ZipArchive`. If it has neither, stop and choose an owner-approved server-side converter; do not move decompression into the browser.

Observed production output:

```json
{
  "php": "8.4.13",
  "sapi": "cli",
  "curl": true,
  "json": true,
  "phar": true,
  "zlib": true,
  "dom": true,
  "libxml": true,
  "zip": false,
  "pharData": true
}
```

Conclusion: the selected `PharData` + `zlib` + DOM/libxml path is available in production. `ZipArchive` remains absent and is not a requirement for the selected implementation.
