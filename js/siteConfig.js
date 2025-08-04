/**
 * Site-wide Configuration
 * Contains settings for counties, locations, and tropical weather
 * UPDATED: Added UGC codes and zone URLs for proper alert mapping
 */

// Load the configuration
(function () {
    // Attempt to load counties from counties.json if available
    fetch('./counties/counties.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Counties JSON not available, using built-in config');
            }
            return response.json();
        })
        .then(data => {
            // Merge the loaded counties with the rest of the config
            window.siteConfig = Object.assign({}, window.siteConfig || {}, {
                counties: data.counties
            });
        })
        .catch(error => {
            console.log('Using default county configuration');
            // Default config will be used (already set below)
        });
})();

// Default configuration (used if counties.json isn't available)
// UPDATED: Added ugcCode and zoneURL for each county
window.siteConfig = {
    // County data with coordinates, page URLs, and zone information
    counties: [
        {
            name: "Bertie",
            city: "Windsor",
            lat: 35.9985,
            lon: -76.9461,
            url: "counties/bertie/index.html",
            ugcCode: "NCZ044", // Bertie County zone
            zoneURL: "https://api.weather.gov/zones/forecast/NCZ044"
        },
        {
            name: "Pitt",
            city: "Greenville",
            lat: 35.6115,
            lon: -77.3752,
            url: "counties/pitt/index.html",
            ugcCode: "NCZ029", // Pitt County zone
            zoneURL: "https://api.weather.gov/zones/forecast/NCZ029"
        },
        {
            name: "Beaufort",
            city: "Washington",
            lat: 35.5465,
            lon: -77.0519,
            url: "counties/beaufort/index.html",
            ugcCode: "NCZ045", // Beaufort County zone
            zoneURL: "https://api.weather.gov/zones/forecast/NCZ045"
        },
        {
            name: "Martin",
            city: "Williamston",
            lat: 35.86,
            lon: -77.18,
            url: "counties/martin/index.html",
            station: "KMCZ",
            ugcCode: "NCZ046", // Martin County zone
            zoneURL: "https://api.weather.gov/zones/forecast/NCZ046"
        },
        {
            name: "Dare",
            city: "Manteo",
            lat: 35.9082,
            lon: -75.6757,
            url: "counties/dare/index.html",
            // Dare County has multiple zones - using mainland as primary
            ugcCode: "NCZ047", // Mainland Dare
            zoneURL: "https://api.weather.gov/zones/forecast/NCZ047",
            // Additional zones for Dare County
            alternateZones: [
                { name: "Mainland Dare", ugcCode: "NCZ047", zoneURL: "https://api.weather.gov/zones/forecast/NCZ047" },
                { name: "Northern Outer Banks", ugcCode: "NCZ203", zoneURL: "https://api.weather.gov/zones/forecast/NCZ203" },
                { name: "Hatteras Island", ugcCode: "NCZ205", zoneURL: "https://api.weather.gov/zones/forecast/NCZ205" }
            ]
        },
        {
            name: "Washington",
            city: "Plymouth",
            lat: 35.8668,
            lon: -76.7488,
            url: "counties/washington/index.html",
            ugcCode: "NCZ043", // Washington County zone
            zoneURL: "https://api.weather.gov/zones/forecast/NCZ043"
        },
        {
            name: "Tyrrell",
            city: "Columbia",
            lat: 35.9177,
            lon: -76.2522,
            url: "counties/tyrrell/index.html",
            ugcCode: "NCZ042", // Tyrrell County zone
            zoneURL: "https://api.weather.gov/zones/forecast/NCZ042"
        },
        {
            name: "Hyde",
            city: "Swan Quarter",
            lat: 35.4085,
            lon: -76.3302,
            url: "counties/hyde/index.html",
            // Hyde County has multiple zones - using mainland as primary
            ugcCode: "NCZ081", // Mainland Hyde
            zoneURL: "https://api.weather.gov/zones/forecast/NCZ081",
            // Additional zones for Hyde County
            alternateZones: [
                { name: "Mainland Hyde", ugcCode: "NCZ081", zoneURL: "https://api.weather.gov/zones/forecast/NCZ081" },
                { name: "Ocracoke Island", ugcCode: "NCZ204", zoneURL: "https://api.weather.gov/zones/forecast/NCZ204" }
            ]
        }
    ],

    // Tropical weather configuration
    tropicalWeather: {
        // Hurricane season dates
        season: {
            start: "05-15", // May 15
            end: "11-30"    // November 30
        },
        // NHC graphics URLs
        graphics: {
            atlanticOutlook: "https://www.nhc.noaa.gov/xgtwo/two_atl_5d0.png",
            atlanticWinds: "https://www.nhc.noaa.gov/storm_graphics/AT01/AL012023_PROB34_F120_1280x1024.jpg"
        }
    },
};