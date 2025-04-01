/**
 * Site-wide Configuration
 * Contains settings for counties, locations, and tropical weather
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
window.siteConfig = {
    // County data with coordinates and page URLs
    counties: [
        {
            name: "Bertie",
            city: "Windsor",
            lat: 35.9985,
            lon: -76.9461,
            url: "counties/bertie/windsor.html"
        },
        {
            name: "Pitt",
            city: "Greenville",
            lat: 35.6115,
            lon: -77.3752,
            url: "counties/pitt/greenville.html"
        },
        {
            name: "Beaufort",
            city: "Washington",
            lat: 35.5465,
            lon: -77.0519,
            url: "counties/beaufort/washington.html"
        },
        {
            name: "Martin",
            city: "Williamston",
            lat: 35.8557,
            lon: -77.0560,
            url: "counties/martin/williamston.html"
        },
        {
            name: "Dare",
            city: "Manteo",
            lat: 35.9082,
            lon: -75.6757,
            url: "counties/dare/manteo.html"
        },
        {
            name: "Washington",
            city: "Plymouth",
            lat: 35.8668,
            lon: -76.7488,
            url: "counties/washington/plymouth.html"
        },
        {
            name: "Tyrrell",
            city: "Columbia",
            lat: 35.9177,
            lon: -76.2522,
            url: "counties/tyrrell/columbia.html"
        },
        {
            name: "Hyde",
            city: "Swan Quarter",
            lat: 35.4085,
            lon: -76.3302,
            url: "counties/hyde/swanquarter.html"
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