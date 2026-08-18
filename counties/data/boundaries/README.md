# TIGER cartographic boundaries

These GeoJSON files are generated from the U.S. Census Bureau's 2025 national
1:500,000 cartographic boundary shapefiles:

- `cb_2025_us_state_500k.zip`
- `cb_2025_us_county_500k.zip`

Source: <https://www.census.gov/geographies/mapping-files/2025/geo/carto-boundary-file.html>

Regenerate them with `scripts/build-tiger-boundaries.py`. The build retains
only the identifiers and names needed by the site, rounds coordinates to four
decimal places, and applies separate state/county simplification tolerances to
keep the browser payload bounded.
