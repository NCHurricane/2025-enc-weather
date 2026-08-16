<h1 align="center">NCHurricane.com</h1>

<p align="center">
  <img src="images/2025-NCH-logo.png" alt="NCHurricane.com" height="80" />
  <br/>
  <a href="https://nchurricane.com">https://nchurricane.com</a>
</p>

A real-time local-weather and tropical-intelligence platform centered on Eastern North Carolina, with a reusable multi-market architecture and a San Diego pilot. Built with vanilla ES modules, a PHP 8.x caching layer, and file-based data storage.

---

## Table of Contents

-   [Features](#features)
-   [Architecture](#architecture)
-   [Counties & Multi-Zone Architecture](#counties--multi-zone-architecture)
-   [Data Flow & Processing](#data-flow--processing)
-   [Scheduling & Update Frequencies](#scheduling--update-frequencies)
-   [Repository Structure](#repository-structure)
-   [Requirements](#requirements)
-   [Local Development Setup](#local-development-setup)
-   [Production Deployment](#production-deployment)
-   [Key Technical Details](#key-technical-details)
-   [Data Sources & Attribution](#data-sources--attribution)
-   [Troubleshooting](#troubleshooting)
-   [Future Enhancements](#future-enhancements)
-   [License & Usage](#license--usage)
-   [Project Information](#project-information)

---

## Features

### County Weather Dashboards

-   **Real-Time Alerts**: NWS weather alerts updated every minute with severity-based color coding and automatic county highlighting on the interactive map
-   **Current Conditions**: Multi-station observation data updated hourly, including temperature, humidity, dewpoint, wind speed/direction, and conditions
-   **Detailed Forecasts**: 7-day forecast and hourly data updated every 2 hours from NWS
-   **Visual Meteorology**:
    -   Live NEXRAD radar loops from KMHX (Newport/Morehead City)
    -   GOES-East satellite imagery (multiple sectors and products)
    -   Meteograms with interactive charts showing hourly temperature, dewpoint, and wind data
-   **Area Forecast Discussion (AFD)**: Full text forecast discussions from local NWS offices, updated hourly

### Tropical Storm Center

-   **Active Storm Tracking**: Automated tracking of all Atlantic and Eastern Pacific tropical systems
-   **NHC Products**:
    -   Public Advisories (TCP) - English and Spanish
    -   Forecast/Advisory (TCM)
    -   Tropical Discussions (TCD) - English and Spanish
    -   Wind Speed Probabilities (PWS)
    -   Tropical Cyclone Updates (TCU) when issued
-   **Graphics Suite**:
    -   Forecast cone graphics (3-day and 5-day)
    -   Key messages and watches/warnings
    -   Wind field graphics and arrival time maps
    -   Surface analysis and wind probability maps
-   **Interactive Maps**: Watches and warnings overlaid on detailed coastal maps
-   **Satellite Views**: Tropical sector imagery with multiple product types (visible, infrared, water vapor)

### Home Dashboard

-   **Interactive County Map**: D3.js-powered SVG map with real-time weather data markers and alert-based county coloring
-   **Multi-Parameter Display**: Toggle between temperature, humidity, dewpoint, and wind speed displays
-   **Station Selection**: Intelligent selection of best available weather station per county based on data freshness
-   **Tropical Banner**: Dynamic display of active tropical systems with links to detailed storm pages

## Architecture

### Frontend

-   **Pure ES Modules**: No build process, bundler, or transpilation — native ES6 modules loaded directly in the browser
-   **Zero Framework**: Vanilla JavaScript with strategic library usage where appropriate
-   **Required External Libraries** (loaded via CDN):
    -   **D3.js v7** - SVG map rendering and data visualization on home page
    -   **Leaflet 1.9.4** - Interactive maps on county and tropical pages
    -   **Chart.js** - Meteogram charts on county pages
    -   **Font Awesome 6** - Icons throughout the interface
-   **Responsive Design**: Mobile-first CSS with flexbox/grid layouts
-   **Browser Support**: Modern browsers (Chrome, Firefox, Safari, Edge); IE not supported

### Backend

-   **PHP 8.4**: All server-side processing and API endpoints (tested with PHP 8.4-CLI)
-   **File-Based Storage**: JSON files for all cached data — no SQL database required
-   **Atomic Writes**: All cache scripts use temporary file + rename pattern to prevent partial/corrupted data
-   **Intelligent Caching**:
    -   Cache busting with 15-minute timestamp buckets on frontend
    -   TTL-based cache validation in PHP scripts
    -   Automatic stale data cleanup
-   **Error Resilience**: Scripts continue on individual failures, log errors for debugging, and maintain last-known-good cache files

### Data Pipeline

#### External Data Sources

-   **National Weather Service API** (`api.weather.gov`)
    -   Weather alerts (by zone)
    -   Current observations (by station)
    -   Forecast data (by grid point)
    -   Area Forecast Discussions
-   **National Hurricane Center** (`nhc.noaa.gov`)
    -   Current storms JSON
    -   Advisory XML products
    -   Storm graphics (PNG)
    -   Text products (TCP, TCM, TCD, PWS, TCU)
-   **NOAA Satellite Services** (`cdn.star.nesdis.noaa.gov`)
    -   GOES-East satellite imagery
    -   Multiple sectors and products
-   **NWS RIDGE Radar** (`radar.weather.gov`)
    -   Radar loop GIFs (hotlinked)
    -   Future enhancement: local caching planned
-   **USGS National Map** (`basemap.nationalmap.gov`)
    -   Map tiles for tropical watches/warnings overlays

## Counties & Multi-Zone Architecture

### Covered Counties

Eight counties in Eastern North Carolina and one market pilot are currently supported:

-   **Single-Zone Counties**: Beaufort, Bertie, Martin, Pitt, Tyrrell, Washington
-   **Multi-Zone Counties**:
    -   **Dare** (3 zones): Mainland, Northern Outer Banks, Hatteras Island
    -   **Hyde** (2 zones): Mainland, Ocracoke Island
-   **Other Markets**:
    -   **San Diego** (3 zones): Coastal, Inland, Mountains

### Dual-Zone Alert Strategy

To prevent missed alerts, each county uses **both** NWS zone types:

-   **Forecast Zones** (`NCZ###`): Weather forecast zones
-   **County Zones** (`NCC###`): FIPS-based county codes

The `cache_alerts.php` script fetches alerts from both zone types, then deduplicates based on alert ID. This redundancy ensures no alerts are missed due to NWS zone classification inconsistencies.

Example from `counties/bertie/data/config.json`:

```json
{
    "zones": {
        "forecast": "NCZ030",
        "county": "NCC015"
    }
}
```

### Multi-Zone Data Handling

Multi-zone counties (Dare, Hyde) maintain separate data files per zone:

```
counties/dare/data/
  ├── config.json              # Zone definitions and station lists
  ├── mainland/
  │   ├── current.json
  │   ├── forecast.json
  │   └── alerts.json
  ├── coastal/
  │   └── ...
  └── hatteras/
      └── ...
```

The frontend aggregates data across all zones and selects the best available weather station based on data age and preferred station configuration.

## Data Flow & Processing

### County Data Pipeline

Each county has four independent caching scripts in `counties/{county}/api/`:

1. **`cache_alerts.php`**:

    - Fetches alerts from both forecast and county zones
    - Deduplicates by alert ID
    - Formats descriptions with HTML (WHAT/WHERE/WHEN/IMPACTS)
    - Filters expired alerts
    - Outputs: `data/alerts.json`

2. **`cache_current.php`**:

    - Polls multiple weather stations per county
    - Converts all units to imperial (°F, mph, mb, miles)
    - Calculates observation age in minutes
    - Handles missing/null data gracefully
    - Outputs: `data/current.json` (single-zone) or `data/{zone}/current.json` (multi-zone)

The NC conditions map additionally uses `counties/api/cache_nc_conditions.php`.
It makes one statewide Synoptic request, filters observations through
`counties/nc-weather-stations.json`, and writes
`counties/data/nc-current.json`. County and zone configs still determine the
initial map center and remain the automatic fallback if either shared file is
unavailable. Non-NC pages continue using only their local config and cache.

3. **`cache_forecast.php`**:

    - Fetches from NWS points API (lat/lon → gridpoint → forecast)
    - Ensures large icon sizes (`size=large`)
    - Converts temperatures to Fahrenheit
    - Provides both period and hourly forecasts
    - Outputs: `data/forecast.json`, `data/hourly.json`

4. **`cache_afd.php`**:
    - Fetches Area Forecast Discussion from NWS office
    - Parses ATOM feed
    - Stores full text content
    - Outputs: `data/afd.json`

### Tropical Data Pipeline

The tropical pipeline consists of multiple specialized scripts that run in coordinated sequence:

1. **`tropical_data.php`** (Hourly at :05):

    - Fetches NHC `CurrentStorms.json`
    - Filters for current year storms
    - Writes to `active/cache/nhc_current_storms.json`
    - Serves as source of truth for active storms

2. **`text_products_cache.php`** (Hourly at :05 + 10s):

    - Reads active storms list
    - Fetches XML text products from NHC
    - Handles both Atlantic (AL) and Eastern Pacific (EP) basins
    - Converts XML to JSON format
    - Products: TCP, TCM, TCD, PWS, TCU (English + Spanish for Atlantic)
    - Outputs: `active/storms/{ALnn|EPnn}YYYY/{PRODUCT}.json`

3. **`advisory_writer.php` / `advisory_writer_ep.php`** (Hourly at :05 + 20s/25s):

    - Processes advisory XML into compact JSON format
    - Extracts key storm parameters (position, intensity, movement)
    - Outputs: `active/storms/{ALnn|EPnn}YYYY/advisory.json`

4. **`nhc_graphics_cache.php` / `nhc_graphics_cache_ep.php`** (Hourly at :07/:07+30s):

    - Downloads storm graphics from NHC
    - Graphics include: forecast cones, key messages, wind fields, arrival times
    - Automatically deletes files older than 24 hours
    - Outputs: `active/storms/{ALnn|EPnn}YYYY/*.png`

5. **`tcv_writer.php` / `tcv_writer_ep.php`** (Hourly at :05 + 30s/35s):

    - Creates Tropical Cyclone Viewer JSON data
    - Outputs: `active/storms/{ALnn|EPnn}YYYY/tcv.json`

6. **`cxml_writer.php` / `cxml_writer_ep.php`** (Hourly at :05 + 40s/45s):

    - Creates compact XML representations
    - Outputs: `active/storms/{ALnn|EPnn}YYYY/cxml.json`

7. **`cache_tropical.php`** (Hourly at :08):
    - Coordination guard script
    - Ensures consistency across tropical outputs
    - Can trigger regeneration if needed

### Frontend Data Aggregation

The frontend uses a modular approach to fetch and display data:

-   **`js/modules/mapAggregator.js`**:

    -   Fetches data from all county endpoints
    -   Handles both single-zone and multi-zone counties
    -   Selects best weather station based on data age and preferences
    -   Provides unified interface for county map

-   **`js/modules/ncCountyMap.js`**:

    -   Renders interactive SVG map using D3.js
    -   Loads GeoJSON county boundaries
    -   Colors counties by alert severity
    -   Displays weather station markers with live data
    -   Supports parameter switching (temp, humidity, dewpoint, wind)

-   **County Page Apps** (`counties/js/countyApp.js`):
    -   Loads and displays current conditions
    -   Renders forecast cards and hourly data
    -   Shows active alerts with color-coded severity
    -   Integrates radar and satellite imagery
    -   Generates meteogram charts

## Scheduling & Update Frequencies

All cache scripts are designed to run via cron jobs. The timing is carefully coordinated to:

-   Align with NWS/NHC update schedules
-   Avoid API rate limits through staggering
-   Ensure data consistency across dependent scripts

### Tropical Scripts

Tropical scripts run hourly, timed to catch NHC updates which typically occur near the top of the hour:

| Script                      | Frequency | Timing    | Purpose                                          |
| --------------------------- | --------- | --------- | ------------------------------------------------ |
| `tropical_data.php`         | Hourly    | :05       | Fetch active storms list from NHC                |
| `text_products_cache.php`   | Hourly    | :05 + 10s | Download NHC text products (TCP, TCM, TCD, etc.) |
| `advisory_writer.php`       | Hourly    | :05 + 20s | Process Atlantic advisory XML                    |
| `advisory_writer_ep.php`    | Hourly    | :05 + 25s | Process E. Pacific advisory XML                  |
| `tcv_writer.php`            | Hourly    | :05 + 30s | Generate TCV JSON for Atlantic                   |
| `tcv_writer_ep.php`         | Hourly    | :05 + 35s | Generate TCV JSON for E. Pacific                 |
| `cxml_writer.php`           | Hourly    | :05 + 40s | Generate compact XML for Atlantic                |
| `cxml_writer_ep.php`        | Hourly    | :05 + 45s | Generate compact XML for E. Pacific              |
| `nhc_graphics_cache.php`    | Hourly    | :07       | Download Atlantic storm graphics                 |
| `nhc_graphics_cache_ep.php` | Hourly    | :07 + 30s | Download E. Pacific storm graphics               |
| `cache_tropical.php`        | Hourly    | :08       | Coordination/consistency check                   |

**Reasoning**: NHC updates occur hourly (and more frequently during active advisories). The 5-minute offset after the hour allows NHC time to publish new data. Staggering by seconds prevents simultaneous API calls.

### County Scripts

County scripts run at different intervals based on how frequently the data changes:

| Script               | Frequency     | Stagger               | Purpose                      |
| -------------------- | ------------- | --------------------- | ---------------------------- |
| `cache_alerts.php`   | Every minute  | 7-second intervals    | Real-time alert monitoring   |
| `cache_current.php`  | Hourly        | :23-:30 (1 min apart) | Current weather observations |
| `cache_forecast.php` | Every 2 hours | :15-:22 (1 min apart) | Forecast updates             |
| `cache_afd.php`      | Hourly        | :00 (on the hour)     | Area Forecast Discussion     |
| `cache_nc_conditions.php` | Every 30 minutes | :05 and :35 | Shared NC conditions map |

**Alert Staggering Pattern** (7-second intervals to avoid API rate limits):

-   Bertie: :00 + 0s
-   Pitt: :00 + 7s
-   Beaufort: :00 + 14s
-   Martin: :00 + 21s
-   Dare: :00 + 28s
-   Hyde: :00 + 35s
-   Washington: :00 + 42s
-   Tyrrell: :00 + 49s

**Reasoning**:

-   **Alerts** update every minute because weather alerts can be issued at any time and require immediate display
-   **Current conditions** update hourly at :23-:30 because most NWS stations report hourly near :53 past each hour (NWS processing takes ~20-30 minutes)
-   **Forecasts** update every 2 hours because NWS typically updates forecast grids 2-4 times daily
-   **AFD** updates hourly as offices publish discussions 2-3 times daily

### Example Cron Configuration

```bash
# County Alerts (every minute, staggered by 7 seconds)
* * * * * sleep 0;  php /path/to/counties/bertie/api/cache_alerts.php >> /path/to/logs/cron_alerts.log 2>&1
* * * * * sleep 7;  php /path/to/counties/pitt/api/cache_alerts.php >> /path/to/logs/cron_alerts.log 2>&1
* * * * * sleep 14; php /path/to/counties/beaufort/api/cache_alerts.php >> /path/to/logs/cron_alerts.log 2>&1
# ... (continue pattern for remaining counties)

# County Current Conditions (hourly at :23-:30)
23 * * * * php /path/to/counties/bertie/api/cache_current.php >> /path/to/logs/cron_current.log 2>&1
24 * * * * php /path/to/counties/pitt/api/cache_current.php >> /path/to/logs/cron_current.log 2>&1
# ... (continue for all counties)

# Shared NC conditions map (SYNOPTIC_API_TOKEN must be in the cron environment)
5,35 * * * * php /path/to/counties/api/cache_nc_conditions.php >> /path/to/logs/cron_nc_conditions.log 2>&1

# County Forecasts (every 2 hours at :15-:22)
15 */2 * * * php /path/to/counties/bertie/api/cache_forecast.php >> /path/to/logs/cron_forecast.log 2>&1
16 */2 * * * php /path/to/counties/pitt/api/cache_forecast.php >> /path/to/logs/cron_forecast.log 2>&1
# ... (continue for all counties)

# Tropical Scripts (hourly, coordinated sequence)
5 * * * * php /path/to/active/api/tropical_data.php >> /dev/null 2>&1
5 * * * * sleep 10; php /path/to/active/api/text_products_cache.php >> /dev/null 2>&1
5 * * * * sleep 20; php /path/to/active/api/advisory_writer.php >> /dev/null 2>&1
# ... (continue for all tropical scripts)
```

> **Note**: Adjust paths according to your deployment. Production uses `php8.4-cli` explicitly.

## Repository Structure

```
.
├── index.html                      # Home page with interactive county map
├── tropical_at.html                # Atlantic tropical weather page
├── tropical_ep.html                # Eastern Pacific tropical weather page
├── 404.html                        # Custom 404 error page
│
├── active/                         # Tropical storm data and processing
│   ├── index.html                  # Active storms listing page
│   ├── api/                        # PHP cache scripts for tropical data
│   │   ├── tropical_data.php       # Fetches NHC storm list
│   │   ├── text_products_cache.php # Caches TCP, TCM, TCD, PWS products
│   │   ├── advisory_writer.php     # Processes Atlantic advisories
│   │   ├── advisory_writer_ep.php  # Processes E. Pacific advisories
│   │   ├── nhc_graphics_cache.php  # Downloads Atlantic graphics
│   │   ├── nhc_graphics_cache_ep.php # Downloads E. Pacific graphics
│   │   ├── tcv_writer.php          # Tropical Cyclone Viewer data (AT)
│   │   ├── tcv_writer_ep.php       # Tropical Cyclone Viewer data (EP)
│   │   ├── cxml_writer.php         # Compact XML format (AT)
│   │   ├── cxml_writer_ep.php      # Compact XML format (EP)
│   │   └── cache_tropical.php      # Coordination script
│   ├── cache/                      # Cached JSON outputs
│   │   ├── nhc_current_storms.json # Active storms list
│   │   ├── tropical_summary_at.json # Atlantic summary
│   │   └── *.json                  # Various tropical cache files
│   ├── storms/                     # Per-storm directories
│   │   ├── AL##YYYY/               # Atlantic storm data
│   │   │   ├── advisory.json       # Parsed advisory data
│   │   │   ├── TCPAT#.json         # Public Advisory (English)
│   │   │   ├── TCMAT#.json         # Forecast/Advisory
│   │   │   ├── TCDAT#.json         # Discussion (English)
│   │   │   ├── PWSAT#.json         # Wind Speed Probabilities
│   │   │   ├── TASAS#.json         # Public Advisory (Spanish)
│   │   │   ├── TDSAT#.json         # Discussion (Spanish)
│   │   │   └── *.png               # NHC graphics
│   │   └── EP##YYYY/               # Eastern Pacific storm data
│   ├── logs/                       # Script execution logs
│   └── js/                         # Frontend tropical modules
│
├── counties/                       # County weather data and pages
│   ├── counties.json               # County metadata and configuration
│   ├── nc-weather-stations.json    # Shared NC station catalog
│   ├── api/
│   │   └── cache_nc_conditions.php # Shared NC conditions cache
│   ├── data/
│   │   └── nc-current.json         # Generated shared observations
│   ├── {county}/                   # Per-county directories
│   │   ├── index.html              # County weather page
│   │   ├── api/                    # PHP cache scripts
│   │   │   ├── cache_alerts.php    # Weather alerts
│   │   │   ├── cache_current.php   # Current conditions
│   │   │   ├── cache_forecast.php  # Forecast data
│   │   │   └── cache_afd.php       # Area Forecast Discussion
│   │   ├── data/                   # Cached JSON data
│   │   │   ├── config.json         # County configuration
│   │   │   ├── alerts.json         # Active alerts
│   │   │   ├── current.json        # Current observations
│   │   │   ├── forecast.json       # Forecast periods
│   │   │   ├── hourly.json         # Hourly forecast
│   │   │   ├── afd.json            # Forecast discussion
│   │   │   └── {zone}/             # Multi-zone counties only
│   │   │       ├── current.json
│   │   │       ├── forecast.json
│   │   │       └── alerts.json
│   │   ├── logs/                   # Cron execution logs
│   │   │   ├── cron_alerts.log
│   │   │   ├── cron_current.log
│   │   │   ├── cron_forecast.log
│   │   │   └── cron_afd.log
│   │   └── js/                     # County-specific modules
│   │       └── countyApp.js        # Single-zone initializer
│   ├── css/                        # County page styles
│   └── js/                         # Shared county modules
│       ├── countyApp.js            # Main county page builder
│       ├── countyApp.multizone.js  # Multi-zone variant
│       ├── countyData.js           # Single-zone data loader
│       ├── countyData.multizone.js # Multi-zone data loader
│       ├── meteogram.js            # Chart generation
│       ├── radar.js                # Radar display module
│       └── satellite.js            # Satellite imagery module
│
├── js/                             # Global JavaScript modules
│   ├── siteConfig.js               # Site-wide configuration
│   ├── modules/                    # Core ES modules
│   │   ├── mapAggregator.js        # County data aggregation
│   │   ├── ncCountyMap.js          # D3 map rendering
│   │   ├── navigation.js           # Header/navigation builder
│   │   ├── satellite.js            # Tropical satellite viewer
│   │   ├── warningColors.js        # Alert color scheme
│   │   └── ...                     # Additional modules
│   └── data/                       # Static data files
│       ├── NC-county-topo.json     # County boundary GeoJSON
│       └── ...                     # Additional data files
│
├── css/                            # Global stylesheets
│   ├── styles.css                  # Base styles
│   ├── index.css                   # Home page styles
│   └── tropical.css                # Tropical page styles
│
├── images/                         # Image assets
│   ├── 2025-NCH-logo.png           # Site logo
│   ├── county/                     # County-specific images
│   └── graphics/                   # Generated graphics
│
├── fonts/                          # Local font files (OFL licensed)
│   ├── Fira_Code/
│   ├── Montserrat/
│   ├── Roboto/
│   └── Saira/
│
└── test/                           # Development and testing files
    ├── cron                        # Example cron configuration
    └── ...                         # Test scripts and utilities
```

## Requirements

### Server Requirements

-   **PHP**: 8.4 or higher (tested with 8.4-CLI)
    -   Required extensions: `curl`, `json`, `simplexml`, `dom`
    -   No database extensions needed (no MySQL/SQLite/PostgreSQL)
-   **Web Server**: Any server capable of serving static files
    -   Apache, Nginx, or PHP built-in server all work
    -   `.htaccess` files included for Apache (optional URL rewriting)
-   **Storage**: ~500MB for cached data and logs (grows during active tropical season)
-   **Cron/Scheduler**: Required for automated data updates

### Client Requirements

-   **Modern Browser**: Chrome, Firefox, Safari, or Edge (IE not supported)
-   **JavaScript**: Must be enabled for all functionality
-   **Internet Connection**: Required for CDN libraries (D3.js, Leaflet, Chart.js, Font Awesome)

### External Dependencies

All external libraries are loaded via CDN (no npm/package.json):

-   **D3.js v7**: `https://d3js.org/d3.v7.min.js`
-   **Leaflet 1.9.4**: `https://unpkg.com/leaflet@1.9.4/dist/leaflet.js`
-   **Chart.js**: `https://cdn.jsdelivr.net/npm/chart.js`
-   **Font Awesome 6**: `https://kit.fontawesome.com/...`

> **Note**: No TopoJSON library is needed despite the filename `NC-county-topo.json` — the file is standard GeoJSON format.

## Local Development Setup

### Quick Start

1. **Clone the repository**:

    ```bash
    git clone https://github.com/NCHurricane/2025-enc-weather.git
    cd 2025-enc-weather
    ```

2. **Start PHP development server** (from project root):

    ```bash
    php -S localhost:8000 -t .
    ```

3. **Open in browser**:
    ```
    http://localhost:8000
    ```

### Alternative Development Servers

**Using WAMP/XAMPP**:

-   Place project in `htdocs` or `www` directory
-   Access via `http://localhost/2025-enc-weather/`

**Using Docker**:

```bash
docker run -d -p 8000:80 -v $(pwd):/var/www/html php:8.4-apache
```

**Using VS Code Live Server**:

-   ⚠️ NOT RECOMMENDED: PHP scripts won't execute
-   Use PHP built-in server instead

### Environment Configuration

Some features (like the development dashboard) require environment variables. Copy the example configuration and customize:

```bash
cp test/.env-example test/.env
```

On PowerShell, use `Copy-Item test/.env-example test/.env`.

Edit `test/.env` and configure:

-   `DASHBOARD_ENABLED` - Must be explicitly set to `true`; otherwise the dashboard intentionally returns 404
-   `DASHBOARD_PASSWORD` - A hash produced by PHP `password_hash()`, never the plain-text password
-   `ADMIN_EMAIL` - Your email for notifications
-   `ALLOWED_IPS` - Required comma-separated IP allowlist; use `127.0.0.1,::1` for local access
-   `MAX_EXECUTIONS_PER_HOUR` - Rate limiting for cache refresh endpoints
-   `MAX_CACHE_PURGES_PER_HOUR` - Rate limiting for destructive imagery tile purges
-   `MAX_DASHBOARD_LOG_BYTES` - Rotate registered dashboard logs after this size (default 5 MB)
-   `DASHBOARD_LOG_RETAIN_BYTES` - Bytes retained from the end of a rotated log (default 2 MB)

Generate a password hash, then paste its complete output into `DASHBOARD_PASSWORD`:

```powershell
php -r "echo password_hash('choose-a-strong-local-password', PASSWORD_DEFAULT), PHP_EOL;"
```

**Example `test/.env-example`**:

```env
# Weather Dashboard Environment Configuration
# Copy this file to .env and set your actual values

# Dashboard is hidden behind a 404 unless explicitly enabled
DASHBOARD_ENABLED=true

# Paste the complete PHP password_hash() output here
DASHBOARD_PASSWORD=PASTE_PASSWORD_HASH_HERE

# Admin email for password recovery and notifications
ADMIN_EMAIL=your-email@example.com

# Local-only IP allowlist
ALLOWED_IPS=127.0.0.1,::1

# Optional: Enable additional security logging
SECURITY_LOGGING=true

# Rate limiting (executions per hour per IP)
# Prevents abuse of cache refresh endpoints
MAX_EXECUTIONS_PER_HOUR=40

# Destructive imagery tile cache purges per hour per IP
MAX_CACHE_PURGES_PER_HOUR=4

# Bound operational log growth while retaining recent entries
MAX_DASHBOARD_LOG_BYTES=5242880
DASHBOARD_LOG_RETAIN_BYTES=2097152
```

> **Security Note**: Never commit `test/.env` to version control. The `.gitignore` file already excludes it. Keep `DASHBOARD_ENABLED=false` on deployments where this maintenance surface is not needed.

### Initial Data Population

**Important**: The site requires JSON data files to function. On first load, you'll see errors until cache files are generated.

**Option 1: Manual Cache Generation**

Run each cache script manually to populate initial data:

```bash
# County data (run for each county)
php counties/bertie/api/cache_alerts.php
php counties/bertie/api/cache_current.php
php counties/bertie/api/cache_forecast.php
php counties/bertie/api/cache_afd.php

# Shared NC conditions map
SYNOPTIC_API_TOKEN=your_public_token php counties/api/cache_nc_conditions.php

# Repeat for: pitt, beaufort, martin, dare, hyde, washington, tyrrell

# Tropical data (run in sequence)
php active/api/tropical_data.php
php active/api/text_products_cache.php
php active/api/advisory_writer.php --storm=ALL
php active/api/advisory_writer_ep.php --storm=ALL
php active/api/nhc_graphics_cache.php
php active/api/nhc_graphics_cache_ep.php
```

**Option 2: Automated Development Cron** (recommended)

Create a simple cron job for development that runs every 5 minutes:

```bash
# Linux/Mac crontab
*/5 * * * * cd /path/to/project && ./dev-update.sh

# Windows Task Scheduler
# Run: php dev-update.php every 5 minutes
```

Create `dev-update.sh`:

```bash
#!/bin/bash
# Quick development cache updater

# Counties
for county in bertie pitt beaufort martin dare hyde washington tyrrell; do
  php counties/$county/api/cache_current.php &
  php counties/$county/api/cache_alerts.php &
done

# Tropical
php active/api/tropical_data.php
sleep 2
php active/api/text_products_cache.php

wait
echo "Development cache updated: $(date)"
```

### Directory Structure Setup

The PHP scripts automatically create necessary directories with proper permissions. On first run, the following directories will be created if they don't exist:

-   `active/cache/` - Tropical data cache
-   `active/logs/` - Tropical script logs
-   `active/storms/` - Per-storm data directories
-   `counties/{county}/data/` - County cache files
-   `counties/{county}/logs/` - County script logs

### Testing Without Cron

For quick testing without setting up cron jobs:

1. Run cache scripts manually (as shown above)
2. Refresh browser to see cached data
3. Cache files remain valid until manually deleted or updated

### Automated Quality Checks

-   `node scripts/validate-site.mjs` parses JSON and JSON-LD, checks duplicate HTML IDs, and verifies local HTML references.
-   PHP files are checked with `php -l`; JavaScript files are checked with `node --check`.
-   `.github/workflows/site-quality.yml` runs the same static checks on pull requests and pushes to the primary branch.
-   Controlled-browser checks remain a separate release step for keyboard behavior, responsive layouts, network requests, and console errors.

### Development Notes

-   **No Build Process**: Edit HTML/CSS/JS files directly; refresh browser to see changes
-   **Cache Busting**: Frontend uses 15-minute timestamp buckets; force reload (Ctrl+F5) to bypass
-   **PHP Errors**: Check browser DevTools Console and Network tabs for PHP script errors
-   **Data Age**: County pages show observation age; use this to verify cache freshness
-   **Logging**: All cache scripts write to log files in their respective `logs/` directories

## Production Deployment

### Server Configuration

1. **PHP Setup**:

    ```bash
    php -v  # Verify PHP 8.4+
    php -m  # Verify curl, json, simplexml, dom extensions
    ```

2. **Upload Files**:

    - Use sFTP, rsync, or git pull
    - Ensure proper ownership/permissions (scripts will create directories)

3. **Configure Cron Jobs**:

    - Copy timing patterns from `test/cron` example
    - Adjust paths for your server environment
    - Use full path to PHP binary (e.g., `/usr/bin/php8.4-cli`)
    - Redirect logs appropriately

4. **Verify Initial Setup**:

    ```bash
    # Test a single county script
    php /path/to/counties/bertie/api/cache_current.php

    # Check if JSON was created
    ls -l /path/to/counties/bertie/data/current.json

    # Test tropical script
    php /path/to/active/api/tropical_data.php
    ls -l /path/to/active/cache/nhc_current_storms.json
    ```

### Monitoring & Maintenance

**Log Files**:

-   Each script writes to its own log file
-   Logs are appended (not rotated automatically)
-   Recommended: Set up log rotation via `logrotate` or hosting control panel
-   Monitor logs for repeated errors

**Common Log Locations**:

```
counties/*/logs/cron_*.log     # County script logs
active/logs/*.log              # Tropical script logs
```

**Storage Management**:

-   Storm graphics are auto-deleted after 24 hours
-   Old storm directories should be manually archived/deleted after season
-   Logs grow indefinitely; implement rotation

**Health Monitoring**:

-   Check log timestamps to verify cron execution
-   Monitor JSON file modification times
-   County pages display observation age (warns if stale)
-   No dedicated health check endpoint currently

**Error Recovery**:

-   Scripts are idempotent; safe to re-run manually
-   Failed runs leave previous cache intact (last-known-good)
-   No automatic retry; relies on next cron cycle

### Performance Considerations

**API Rate Limits**:

-   NWS API: No documented hard limit, but be respectful
-   Staggered county alerts (7s intervals) prevent bursts
-   Tropical scripts use 5-10 second spacing

**Bandwidth**:

-   Radar images are hotlinked (not cached locally currently)
-   Satellite images loaded via NOAA CDN
-   Storm graphics cached locally (~50MB per active storm)

**Server Load**:

-   Each county cycle: ~8 PHP processes × 4 scripts = 32 processes/hour
-   Tropical cycle: ~10 processes/hour
-   All scripts complete in <30 seconds typically

## Key Technical Details

### Storm Numbering Convention

The National Hurricane Center uses a rotating advisory numbering system based on storm sequence within the season:

-   Storm #1, #6, #11, #16, #21... → advisory #1 (e.g., `TCPAT1.json`, `TCMAT1.json`)
-   Storm #2, #7, #12, #17, #22... → advisory #2 (e.g., `TCPAT2.json`)
-   Storm #3, #8, #13, #18, #23... → advisory #3
-   Storm #4, #9, #14, #19, #24... → advisory #4
-   Storm #5, #10, #15, #20, #25... → advisory #5

**Example**: If Tropical Storm "Ophelia" is the 15th named storm of the season (AL152025), its text products will use advisory number 5:

-   `TCPAT5.json` - Public Advisory
-   `TCMAT5.json` - Forecast/Advisory
-   `TCDAT5.json` - Discussion

This convention is handled automatically by `text_products_cache.php` using the formula: `($stormNumber % 5) ?: 5`

### Spanish Products

-   **Atlantic Basin**: Spanish text products available (TAS, TDS, TUS)
-   **Eastern Pacific**: English only
-   Spanish products are optional and may not be published for all Atlantic storms

### Cache File Safety

All PHP cache scripts use **atomic writes** to prevent corrupted data:

```php
function atomic_write_json($filepath, $data) {
    $temp_file = $filepath . '.tmp';
    file_put_contents($temp_file, json_encode($data), LOCK_EX);
    rename($temp_file, $filepath);  // Atomic on Unix/Linux
}
```

This ensures:

-   No partial JSON files served to frontend
-   Race conditions avoided between write and read
-   Cleanup of failed writes (orphaned `.tmp` files)

### Frontend Module Loading

Navigation is built dynamically via `js/modules/navigation.js`:

-   Supports relative paths for deployment flexibility
-   County submenus generated from configuration
-   Logo links respect current directory depth

County pages use wrapper pattern:

```javascript
// counties/bertie/js/countyApp.js
import { initializePage } from '../../js/countyApp.js';
import * as countyData from '../../js/countyData.js';
initializePage({ ...countyData });
```

Multi-zone counties import `countyData.multizone.js` instead.

## Data Sources & Attribution

### Official Data Sources

All weather data comes from official U.S. government sources:

-   **National Weather Service (NWS)**: `api.weather.gov`
    -   Weather alerts, forecasts, and current observations
    -   Area Forecast Discussions
    -   NEXRAD radar imagery via `radar.weather.gov`
-   **National Hurricane Center (NHC)**: `nhc.noaa.gov`
    -   Tropical cyclone advisories and forecasts
    -   Storm graphics and key messages
    -   Text products in English and Spanish
-   **NOAA/NESDIS**: `cdn.star.nesdis.noaa.gov`
    -   GOES-East satellite imagery
    -   Multiple sectors and product types
-   **USGS National Map**: `basemap.nationalmap.gov`
    -   Map tiles for tropical overlays

### Data Disclaimer

**This site is for informational purposes only.** For official forecasts, warnings, and life-safety decisions, always refer to:

-   **Weather alerts & forecasts**: https://weather.gov
-   **Tropical storms**: https://nhc.noaa.gov
-   **Local emergency management**: Contact your county emergency services

This site does not issue warnings, watches, or advisories. All displayed data is sourced from official NWS/NHC products but may have delays or errors in processing.

## License & Usage

### Code License

The source code (HTML, CSS, JavaScript, PHP) is licensed under the **MIT License**:

```
Copyright (c) 2026 NCHurricane.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Assets & Content

-   **Images**: Custom graphics, logos, and branding are **All Rights Reserved**. Usage by others requires explicit permission.
-   **Fonts**: Local font files retain their original licenses (SIL Open Font License). Fonts loaded via Google Fonts CDN are subject to their respective licenses.
-   **Data**: All weather data sourced from U.S. government (public domain). Processed/cached data follows source terms.

### Third-Party Dependencies

-   **D3.js**: ISC License
-   **Leaflet**: BSD-2-Clause License
-   **Chart.js**: MIT License
-   **Font Awesome**: Font Awesome Free License (icons via CDN)

### Version Control

-   **Excluded from Git**: Generated cache files, logs, large assets (via `.gitignore`)
-   **Included**: Source code, configuration templates, documentation
-   **Repository**: https://github.com/NCHurricane/2025-enc-weather

### Contributions

**Not currently accepting contributions.** This project is maintained privately but may open for community contributions in the future.

If you find bugs or have suggestions:

-   Open an issue on GitHub (read-only)
-   Contact via email (see website)

### Attribution

If you use this code or architecture as inspiration for your own project:

-   Attribution appreciated but not required (MIT License)
-   Link back to https://nchurricane.com or this repository
-   Mention data sources (NWS, NHC, NOAA) appropriately

## Project Information

### About NCHurricane.com

NCHurricane.com provides hyperlocal weather information for Eastern North Carolina with a focus on tropical storm preparedness. The platform aggregates official National Weather Service data and presents it in an accessible, real-time format for residents and visitors of coastal North Carolina.

**Coverage Area**: Eight counties in Eastern North Carolina (Beaufort, Bertie, Dare, Hyde, Martin, Pitt, Tyrrell, Washington) plus a San Diego multi-zone pilot

**Maintained by**: Chuck Copeland Weather  
**Website**: https://nchurricane.com  
**Social Media**:

-   Bluesky: https://bsky.app/profile/nchurricane.com
-   Twitter: https://twitter.com/chuckcopelandwx
-   YouTube: https://youtube.com/@nchurricane
-   Instagram: https://instagram.com/chuck_copeland_wx
-   Facebook: https://facebook.com/chuckcopelandwx

### Technical Support

For technical questions about this codebase:

-   Open an issue: https://github.com/NCHurricane/2025-enc-weather/issues
-   Review documentation in this README

For questions about the live website or weather information:

-   Visit https://nchurricane.com
-   Contact via social media channels listed above

### Acknowledgments

-   **National Weather Service**: For providing comprehensive weather data via free public API
-   **National Hurricane Center**: For tropical cyclone forecasts and graphics
-   **NOAA**: For satellite imagery and supporting infrastructure
-   **Open Source Community**: For D3.js, Leaflet, Chart.js, and other libraries

---

**Built with ☕ and ⚡ for Eastern North Carolina**

## Troubleshooting

### Missing or Stale Data

**Symptom**: "No data available" or very old timestamps

**Solutions**:

1. Check if cache script is running:
    ```bash
    tail -f counties/bertie/logs/cron_current.log
    ```
2. Verify JSON files exist and are recent:
    ```bash
    ls -lh counties/bertie/data/*.json
    ```
3. Run cache script manually to test:
    ```bash
    php counties/bertie/api/cache_current.php
    ```
4. Check for PHP errors in logs or web server error logs

### Missing Weather Alerts

**Symptom**: Alerts show on weather.gov but not on site

**Solutions**:

1. Verify both zone codes in `counties/{county}/data/config.json`:
    ```json
    {
        "zones": {
            "forecast": "NCZ030", // Must be present
            "county": "NCC015" // Must be present
        }
    }
    ```
2. Check alert cache log for errors:
    ```bash
    tail -50 counties/bertie/logs/cron_alerts.log
    ```
3. Test NWS API directly:
    ```bash
    curl -H "User-Agent: NCHurricane.com" \
         "https://api.weather.gov/alerts/active/zone/NCZ030"
    ```
4. Verify cron job is running every minute (not disabled/commented)

### Tropical Data Not Updating

**Symptom**: Storm data is stale or missing

**Solutions**:

1. Check if storms are active:
    ```bash
    cat active/cache/nhc_current_storms.json
    ```
2. Verify script execution order (must run in sequence):
    - `tropical_data.php` runs first (creates storm list)
    - `text_products_cache.php` runs second (fetches products)
    - Graphics/advisory writers run after
3. Check logs for specific script:
    ```bash
    tail -100 active/logs/text_products_cache.log
    tail -100 active/logs/advisory_writer.log
    ```
4. Manually trigger update:
    ```bash
    php active/api/tropical_data.php
    php active/api/text_products_cache.php
    ```

### Map Not Displaying

**Symptom**: County map shows blank or errors in console

**Solutions**:

1. Check browser console for JavaScript errors (F12 → Console)
2. Verify D3.js loaded from CDN:
    ```javascript
    // In console, should return object:
    typeof d3;
    ```
3. Verify GeoJSON file exists:
    ```bash
    ls -lh js/data/NC-county-topo.json
    ```
4. Check if county data is being fetched (Network tab in DevTools)
5. Verify `siteConfig.js` is loaded

### Radar/Satellite Images Not Loading

**Symptom**: Placeholder or broken images

**Solutions**:

1. Check if external URLs are accessible:
    - Radar: `https://radar.weather.gov/ridge/standard/KMHX_loop.gif`
    - Satellite: `https://cdn.star.nesdis.noaa.gov/...`
2. Check browser console for CORS errors
3. Verify internet connection (images are hotlinked, not cached)
4. Try different radar station if KMHX is offline

### Cron Jobs Not Running

**Symptom**: Cache files never update

**Solutions**:

1. Verify cron service is running:
    ```bash
    # Linux
    systemctl status cron
    service crond status
    ```
2. Check crontab syntax:
    ```bash
    crontab -l
    crontab -e  # Edit and save to validate
    ```
3. Verify PHP path is correct:
    ```bash
    which php
    which php8.4-cli
    ```
4. Check cron execution permissions:
    ```bash
    ls -l counties/bertie/api/cache_current.php  # Should be readable
    ```
5. Look for cron execution errors:

    ```bash
    # Check system mail (cron sends errors via mail)
    mail

    # Or check syslog
    grep CRON /var/log/syslog
    ```

### PHP Script Errors

**Symptom**: HTTP 500 errors or blank pages

**Solutions**:

1. Enable error display (development only):
    ```php
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
    ```
2. Check PHP version:
    ```bash
    php -v  # Must be 8.4+
    ```
3. Verify required extensions:
    ```bash
    php -m | grep -E 'curl|json|simplexml|dom'
    ```
4. Check file permissions (scripts must be readable)
5. Look in web server error logs:
    ```bash
    tail -f /var/log/apache2/error.log
    tail -f /var/log/nginx/error.log
    ```

### Frontend Shows "N/A" for All Data

**Symptom**: Weather data shows but all values are "N/A"

**Solutions**:

1. Check if stations are reporting:
    ```bash
    cat counties/bertie/data/current.json | grep temperature
    ```
2. Verify station data structure matches expected format
3. Check observation age (may be >90 minutes old)
4. Try different weather station in config

### Performance Issues

**Symptom**: Site loads slowly

**Solutions**:

1. Check CDN availability (D3, Leaflet, Chart.js)
2. Verify cache files aren't too large:
    ```bash
    du -sh counties/*/data/
    du -sh active/storms/
    ```
3. Clean up old storm directories:
    ```bash
    rm -rf active/storms/AL*2024/  # Old year
    ```
4. Implement log rotation if logs are huge:
    ```bash
    find . -name "*.log" -exec du -h {} \;
    ```
5. Check for orphaned `.tmp` files:
    ```bash
    find . -name "*.tmp" -type f -delete
    ```

## Future Enhancements

### Planned Features

-   **Storm-Specific Satellite Views**:

    -   Integration with NOAA floater satellite images
    -   Storm-centered imagery for active systems
    -   Automatic positioning based on storm coordinates

-   **Local Radar/Satellite Caching**:

    -   Store RIDGE radar images locally to reduce external dependencies
    -   Implement image cleanup and rotation
    -   Generate animated loops from cached frames

-   **County-Specific Radar/Satellite**:

    -   Per-county radar loops using NWS data
    -   Local satellite imagery for each county page
    -   Animated loops with customizable time ranges

### Technical Improvements

-   **Enhanced Error Handling**:

    -   Optional retry logic with exponential backoff
    -   Circuit breaker pattern for failing endpoints
    -   Dedicated health check endpoint

-   **Documentation**:

    -   Expanded county configuration guide
    -   Multi-zone setup walkthrough
    -   API endpoint documentation

-   **Testing**:

    -   Unit tests for PHP cache scripts
    -   Integration tests for data pipeline
    -   Automated browser regression testing beyond the current static CI gate

-   **Monitoring**:
    -   Cache health dashboard
    -   Data freshness alerts
    -   Script execution monitoring
