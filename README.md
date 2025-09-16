<h1 align="center">NCHurricane.com 2025 Update</h1>

<p align="center">
  <img src="images/2025-NCH-logo.png" alt="NCHurricane.com" height="80" />
  <br/>
  <a href="https://nchurricane.com">https://nchurricane.com</a>
</p>

Eastern North Carolina weather dashboards with close‑to‑realtime county alerts, current conditions, forecasts, radar/satellite imagery, and comprehensive tropical coverage for the Atlantic basin — built with ES modules and PHP caching.

## Features

- **County Dashboards**

  - Close‑to‑realtime NWS alerts with severity ordering and county highlighting
  - Current conditions with timestamps for freshness
  - Forecast overview and details from the National Weather Service
  - Radar (KMHX) and GOES‑East satellite imagery
  - Area Forecast Discussion (AFD)

- **Tropical Center**
  - Near‑realtime advisories and graphics for active storms
  - Text products: Public Advisory, Forecast/Advisory, Discussion, Update, Wind Speed Probabilities (Spanish products for Atlantic as available)
  - Outlook image and banner for active systems

## Architecture

- **Front End**

  - HTML/CSS, responsive layout, no bundler — strictly ES modules via `<script type="module">`
  - Libraries: D3 v7, TopoJSON client, Leaflet 1.9.x (loaded via CDN where needed)

- **Back End**

  - PHP 8.x compatible (production uses a supported PHP 8 version)
  - File‑based caching; no database required
  - Scheduled jobs (cron) for timely updates

- **Data Sources**
  - National Weather Service API and ATOM (forecasts, alerts, observations)
  - NOAA GOES‑East satellite imagery
  - Note: Map tile servers are not used

## Counties & Zones

- Served counties in central Eastern NC:
  - Single‑zone: Beaufort, Bertie, Martin, Pitt, Tyrrell, Washington
  - Multi‑zone: Dare (3 zones), Hyde (2 zones)
- Dual‑zone alert coverage: Each zone config may include `forecast` (NCZ…) and `county` (NCC…) codes; the backend fetches both and deduplicates to avoid misses

## Data Flow

- County pipelines

  - `cache_alerts.php`: Fetch, merge, and dedupe alerts from NWS zones (NCZ + NCC)
  - `cache_current.php`: Cache latest observations
  - `cache_forecast.php`: Cache forecast periods/details
  - `cache_afd.php`: Cache Area Forecast Discussion

- Tropical pipelines

  - `tropical_data.php`: Base storm list management
  - `text_products_cache.php`: Cache NHC text products (English + Spanish for Atlantic)
  - `advisory_writer*.php`, `tcv_writer*.php`, `cxml_writer*.php`: Process advisories/graphics
  - `cache_tropical.php`: Coordination/guard to keep outputs cohesive

- Front‑end aggregation
  - `js/modules/mapAggregator.js`: Aggregates county feeds for the home map and components
  - `js/modules/ncCountyMap.js`: Renders county visualization (D3/TopoJSON) and alert coloring

## Scheduling

- Tropical

  - Storm writers: every 30 minutes at :21 and :51
  - Base storm list: hourly at :15
  - NHC text products: hourly at :20
  - Tropical cache guard: hourly at :25

- Counties
  - Current: every 15 minutes
  - Forecast: every 30 minutes
  - Alerts: every minute, staggered per county to avoid API bursts
  - AFD: hourly on the hour

> Note: Cron paths are deployment‑specific and omitted intentionally.

## Repository Layout

- `index.html`, `tropical.html`, `404.html` — root pages
- `active/` — tropical processing endpoints and outputs
- `counties/<county>/` — county pages and API caching scripts
- `js/modules/` — ES modules (map aggregation, county map, radar/satellite, navigation, utils)
- `js/data/` — TopoJSON and data artifacts used by the front end
- `css/` — global and page styles
- `images/`, `fonts/` — assets (see Policies)

## Local Development

- Requirements: PHP 8.x locally; modern browser (IE not supported - and really, IE?)
- Quick start (serve from project root):

  ```bash
  php -S localhost:8000 -t .
  ```

  Then browse to http://localhost:8000

- Notes: No Node/bundling required; any local PHP server workflow is fine (WAMP/XAMPP/Docker/etc.)

## Operations

- Logs: Each scheduled job appends to a module‑specific log file; rotate logs via your hosting/OS policies
- Staggered alerts: County alert fetches are staggered within the minute to reduce transient misses
- Health checks: No dedicated “cache health” job currently

## Front‑End Notes

- ES modules loaded directly; D3 v7 and TopoJSON via CDN; Leaflet 1.9.x on county pages via CDN
- Navigation (`js/modules/navigation.js`) builds a common header; the logo links to the site root and respects relative paths

## Data Sources & Attribution

- National Weather Service (NWS) API and ATOM
- NOAA/NESDIS GOES‑East
- For life/property decisions, use official sources: https://weather.gov and https://nhc.noaa.gov

## Policies

- Images & Fonts

  - Images are custom and included here; usage by others requires permission
  - Fonts may be loaded via Google Fonts; any included font files keep their original licenses (e.g., OFL)

- Version Control

  - Large/generated assets and logs are excluded via `.gitignore`
  - If a README banner needs special handling, a one‑file exception can be added

- License

  - Code: MIT License (proposed and accepted)
  - Images/branding/content: All Rights Reserved
  - Third‑party fonts: their respective licenses

- Contributions
  - Not accepting contributions at this time; may open in the future

## Troubleshooting

- Alerts missing for a county

  - Confirm both `forecast` (NCZ…) and `county` (NCC…) codes in config
  - Check that the staggered alert job ran recently
  - Validate NWS endpoints manually

- Local dev issues
  - Serve from the project root using PHP’s built‑in server
  - Check browser devtools for network errors (CDN scripts must be reachable)

## Roadmap

- Expanded docs for county configs and zone management
- Optional retry/backoff in backend fetchers
- Contribution guidelines/tests when contributions open
