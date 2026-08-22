# Tropical Map Phase 1: Normalized Packages

> Archived historical Phase 1 evidence preserved on 2026-08-22. The phase gate
> and next-step statements below describe that checkpoint, not current status
> or authorization. Use the [current tropical handoff](../../../tropical-map-next-session-plan.md).

Updated: 2026-08-18
Status: implemented and validated locally; not deployed or scheduled. Phase 2 is not authorized.

## Implemented scope

- `active/api/tropical_map_lib.php` owns bounded NHC fetches, bounded `PharData` KMZ extraction, non-networked DOM parsing, exact basin/storm/advisory validation, GeoJSON normalization, date-line splitting, package construction, and atomic publication.
- `active/api/tropical_map_builder.php` is a CLI-only coordinator for `overview`, `storm`, and `all` modes. It supports immutable fixtures and live NHC inputs without modifying the existing `tropical_data.php` pipeline.
- Overview packages cover `atl`, `epac`, and `cpac` with outlook areas/points, active-storm positions, simplified forecast tracks, and cones.
- Storm packages publish a manifest last as the commit point and include current position, forecast track, cone, wind radii, and watches/warnings when officially issued.
- Central Pacific line and polygon geometries are split at the international date line. Synthetic coverage includes `MultiGeometry` and a polygon hole.
- A newer published source time cannot be replaced by an older package. A failed live overview refresh retains the last-known-good package and marks it stale.
- Generated overview files are ignored under `active/cache/tropical-map/`; storm map files remain under the existing ignored storm directories.

## Package locations

```text
active/cache/tropical-map/overview-atl.json
active/cache/tropical-map/overview-epac.json
active/cache/tropical-map/overview-cpac.json

active/storms/{ATCF_ID}/map/manifest.json
active/storms/{ATCF_ID}/map/current-position.geojson
active/storms/{ATCF_ID}/map/forecast-track.geojson
active/storms/{ATCF_ID}/map/cone.geojson
active/storms/{ATCF_ID}/map/wind-radii.geojson
active/storms/{ATCF_ID}/map/watches-warnings.geojson
```

Products that NHC did not issue are recorded as `not-issued`; a missing optional product does not make the whole storm package fail.

## Commands

Fixture-only validation and generation never access the network:

```powershell
php test/tropical-map/phase0_fixture_contract.php
php test/tropical-map/tropical_map_parser_test.php
php active/api/tropical_map_builder.php overview --fixtures --basin=all --overview-output=test/output/tropical-map-smoke/overview
php active/api/tropical_map_builder.php storm --fixtures --storm=CP012026 --storm-root=test/output/tropical-map-smoke/storms
```

Production-style commands, to be scheduled only after deployment approval:

```powershell
php active/api/tropical_map_builder.php overview --basin=all
php active/api/tropical_map_builder.php storm --storm=CP012026
```

## Validation evidence

- Static PHP syntax: passed for the library, builder, Phase 0 contract, and Phase 1 parser/publication test.
- Phase 0 source contract: passed against all nine immutable official KMZ fixtures.
- Phase 1 parser/publication suite: passed 59 checks.
- Fixture builder: produced all three overview packages and the `CP012026` storm package. The storm package contained one current position, two track lines plus nine forecast points, one cone, and 24 wind-radii features; watches/warnings correctly reported `not-issued`.
- Live external-source check: passed against the current NHC feeds on 2026-08-18, writing only to ignored `test/output/`. Atlantic published a legitimate empty package; Eastern Pacific published two outlook areas; Central Pacific published one outlook area plus one active storm, two track lines, and one cone. The live `CP012026` advisory 025 storm package was fresh with current position, forecast track, cone, 25 wind-radii features, and two watch/warning features.
- Production PHP capability: owner-reported PHP 8.4.13 with the required `curl`, `json`, `phar`, `zlib`, `dom`, and `libxml` modules. `ZipArchive` is absent and not required.
- Local TLS note: the development PHP CLI has no `curl.cainfo` value, so the live check supplied the machine's existing Git CA bundle with `php -d curl.cainfo=...`. Certificate verification remained enabled. Production must likewise expose a trusted CA bundle.
- Controlled-browser validation: not applicable to Phase 1 package code and not performed. The Codex sidebar/Chrome controller is currently blocked by an internal trusted-code-path error.
- Owner browser smoke: not performed.
- Deployment and scheduler validation: not performed; no production files, cron entries, or page code were changed.

## Phase boundary

Phase 1's normalized packages are independent of page markup and satisfy the Phase 1 exit criterion. Stop here until the owner approves Phase 2. Phase 2 will add the shared Leaflet engine and a minimal basin-switching test harness; it must not silently begin the tropical-page migrations assigned to later phases.
