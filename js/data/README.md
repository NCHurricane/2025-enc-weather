# Map reference data

## Tropical city labels

`world-cities.json` is a site-owned JSON conversion of the free Basic CSV from
the [SimpleMaps World Cities Database](https://simplemaps.com/data/world-cities).
The Basic dataset is licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) and requires source
attribution.

`tropical-city-labels.json` is the browser-facing derivative used by the
Tropical Overview and Satellite maps. It contains the 20,000 highest-priority
cities and only the fields required for label rendering: `city`, `latitude`,
`longitude`, and `rank`.

Regenerate it from the repository root with:

```text
node scripts/build-tropical-city-labels.mjs
```

The maps display SimpleMaps and CC BY 4.0 attribution through Leaflet.

## Editorial city favorites

`map-city-favorites.json` is the site-owned override file for city labels that
must remain available below their dataset rank threshold. Do not add these
overrides to `world-cities.json`, `tropical-city-labels.json`,
`counties/bertie/data/us-cities-all.json`, or
`counties/bertie/data/satellite-city-labels.json`.

Each favorite requires a unique `id`, label, exact coordinates, a `maps` array,
and `minZoom`. Supported map scopes are `tropical`, `county`, and `homepage`.
Use more than one scope when a favorite belongs on multiple map families. The
record's position in the file controls priority among favorites; favorites
always take collision priority over ordinary ranked labels.

The small favorites file is revalidated once per page load and then shared from
memory by all maps on that page, so ordinary editorial changes do not require
regenerating either large city dataset.

The initial Tropical favorites use exact records from the attributed SimpleMaps
source. When adding a city from another source, retain its source information in
the project handoff or adjacent documentation.
