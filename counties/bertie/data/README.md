# Example County Cache Data - Bertie County

This directory contains example cached weather data for Bertie County, North Carolina. These files demonstrate the exact JSON structure produced by the county cache scripts.

## Purpose

-   **Documentation**: Shows the complete structure of county weather data
-   **Testing**: Allows frontend development without running cache scripts
-   **Development**: Provides realistic data for testing county pages
-   **Onboarding**: New developers can see what PHP scripts produce

## Data Files

### `config.json` (Required)

County configuration with zones, stations, and NWS office information:

```json
{
    "name": "Bertie",
    "zones": {
        "forecast": ["NCZ030"],
        "county": ["NCC015"]
    },
    "stations": ["KEDE"],
    "nws_office": "MHX"
}
```

### `alerts.json` (Updated every minute)

Active NWS weather alerts for the county:

```json
{
    "features": [
        {
            "properties": {
                "event": "Special Weather Statement",
                "severity": "Minor",
                "urgency": "Expected",
                "headline": "...",
                "description": "...",
                "instruction": "..."
            }
        }
    ],
    "timestamp": "2025-10-13T18:23:45Z"
}
```

### `current.json` (Updated hourly at :23)

Current weather observations from station(s):

```json
{
    "station_id": "KEDE",
    "timestamp": "2025-10-13T18:00:00Z",
    "temperature": {
        "value": 72.5,
        "unit": "F"
    },
    "dewpoint": {
        "value": 65.2,
        "unit": "F"
    },
    "humidity": 78,
    "wind": {
        "speed": 8,
        "direction": 180,
        "gust": 12
    },
    "conditions": "Partly Cloudy",
    "pressure": 30.12
}
```

### `forecast.json` (Updated every 2 hours at :15)

7-day forecast from NWS:

```json
{
    "periods": [
        {
            "number": 1,
            "name": "This Afternoon",
            "temperature": 78,
            "temperatureUnit": "F",
            "windSpeed": "5 to 10 mph",
            "windDirection": "S",
            "shortForecast": "Partly Sunny",
            "detailedForecast": "..."
        }
    ],
    "timestamp": "2025-10-13T18:15:00Z"
}
```

### `hourly.json` (Updated every 2 hours at :18)

Hourly forecast data for next 48 hours (used for meteograms):

```json
{
    "periods": [
        {
            "startTime": "2025-10-13T18:00:00-04:00",
            "temperature": 75,
            "dewpoint": 64,
            "windSpeed": "8 mph",
            "windDirection": "S",
            "shortForecast": "Partly Cloudy"
        }
    ],
    "timestamp": "2025-10-13T18:18:00Z"
}
```

### `afd.json` (Updated hourly at :30)

Area Forecast Discussion from NWS office:

```json
{
    "content": "Full text of the AFD...",
    "timestamp": "2025-10-13T17:30:00Z",
    "office": "MHX",
    "issuance_time": "2025-10-13T15:23:00Z"
}
```

## Multi-Zone Counties

Dare and Hyde counties have subdirectories for each zone:

```
counties/dare/data/
├── config.json
├── mainland/
│   ├── alerts.json
│   ├── current.json
│   └── ...
├── coastal/
│   └── ...
└── hatteras/
    └── ...
```

## Usage

### Local Testing

```bash
# Serve the site
php -S localhost:8000

# Navigate to Bertie County
http://localhost:8000/counties/bertie/
```

The county page will load this cached data automatically. No cache scripts need to run.

### Backend Testing

Test the cache scripts manually:

```bash
# From project root
php counties/bertie/api/cache_alerts.php
php counties/bertie/api/cache_current.php
php counties/bertie/api/cache_forecast.php
php counties/bertie/api/cache_hourly.php
php counties/bertie/api/cache_afd.php
```

## Data Source

These are **real cached weather products** from Bertie County. The JSON structure matches exactly what the production cache scripts generate from:

-   NWS API for alerts, forecasts, and hourly data
-   NWS observation stations for current conditions
-   NWS office text products for AFD

## Note

This is **example/archived data** for development purposes. In production, these files are regenerated on schedule by cron jobs and are excluded from version control via `.gitignore`. Only Bertie County's data is included in the repository as reference.
