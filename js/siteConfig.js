/**
 * Site-wide Configuration
 * Contains settings for counties, locations, and tropical weather
 */

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
            lat: 35.64,
            lon: -77.39,
            url: "counties/pitt/greenville.html"
        },
        {
            name: "Beaufort",
            city: "Washington",
            lat: 35.5465,
            lon: -77.0519,
            url: "counties/beaufort/washington.html"
        },
        // {
        //     name: "Martin",
        //     city: "Williamston",
        //     lat: 35.8557,
        //     lon: -77.0560,
        //     url: "counties/martin/williamston.html"
        // },
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
            lat: 35.9168,
            lon: -76.2517,
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

    // Map configuration
    map: {
        // Default center coordinates for Eastern NC
        center: [35.6, -76.5],
        defaultZoom: 9,
        minZoom: 7,
        maxZoom: 11,
        // Leaflet tile layer
        tileLayer: {
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }
    }
};