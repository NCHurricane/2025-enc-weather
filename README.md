<artifact identifier="nc-hurricane-readme" type="text/markdown" title="NCHurricane Weather Website README.md">
<h1>NCHurricane.com Weather Dashboard</h1>

A comprehensive weather information website focused on Eastern North Carolina counties, providing real-time weather data, alerts, and forecasts with special emphasis on tropical weather systems.

## Features

- **County-specific Weather Pages**: Detailed weather information for multiple Eastern NC counties
- **Real-time Data**: Current conditions from NWS stations with timestamps for freshness tracking
- **Weather Alerts**: Color-coded alerts with proper prioritization for multiple concurrent warnings
- **Interactive County Map**: Visual display of temperatures and alerts by county
- **Forecasts**: 7-day forecasts with detailed daily breakdowns
- **Visual Weather Tools**:
  - Radar imagery with animation capabilities
  - Satellite imagery with multiple visualization options
  - Interactive meteogram charts showing forecast trends
- **Tropical Weather Focus**: Atlantic basin tropical system tracking and alerts

## Technical Architecture

### Frontend
- HTML5, CSS3, and vanilla JavaScript
- Responsive design for all device sizes
- Modular JavaScript architecture

### Backend
- PHP for data caching and processing
- Server-side API caching system
- Scheduled data updates via cron jobs

### Data Sources
- National Weather Service (NWS) API as primary source
- Grid-point based forecast data
- Station observation data
- Alert and warning feeds

## Project Structure

```
counties/                # County-specific pages
  ├── bertie/            # Bertie County
  |   └── windsor.html   # Windsor town page
  └── pitt/              # Pitt County
      └── greenville.html # Greenville city page
css/                     # Stylesheets
  ├── index.css          # Homepage specific styles
  └── styles.css         # Global styles
js/
  ├── modules/           # JavaScript modules
  |   ├── alertsForecastAFD.js     # Alerts and forecasts
  |   ├── currentConditions.js     # Current weather
  |   ├── imageLoader.js           # Radar/satellite imagery
  |   ├── meteogram.js             # Forecast charts
  |   ├── ncCountyMap.js           # Interactive county map
  |   ├── radar.js                 # Radar display
  |   ├── satellite.js             # Satellite imagery
  |   ├── tropical.js              # Tropical weather
  |   ├── utils.js                 # Utility functions
  |   ├── warningColors.js         # Alert styling
  |   └── weatherData.js           # Weather data handling
  ├── index.js           # Homepage functionality
  ├── main.js            # Main application entry point
  └── siteConfig.js      # Site configuration
```

## Data Flow

1. **Server-side caching**: PHP scripts collect data from NWS APIs on a scheduled basis
2. **Client-side loading**: JavaScript loads cached data first, then requests updates
3. **Progressive enhancement**: Show data immediately from cache, update when fresh data is available
4. **Alert prioritization**: Process and display multiple alerts based on severity

## Deployment

- Deployed on IONOS shared hosting with PHP support
- Cron jobs for regular data updates
- File-based caching system compatible with shared hosting environments

## Browser Compatibility

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Android Chrome)

## Contributing

Contributions may be requested in the future, but for now, this is for my testing purposes only.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- National Weather Service for their public API
- NOAA for satellite and radar imagery
</artifact>
