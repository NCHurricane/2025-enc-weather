// siteConfig.js - simplified, synchronous version with normalization baked in
window.siteConfig = {
    counties: [
        {
            name: "Bertie",
            city: "Windsor",
            lat: 36.0187,
            lon: -76.9461,
            url: "counties/bertie/index.html",
            ugcCode: "NCZ030",
            zoneURL: "https://api.weather.gov/zones/forecast/NCZ030"
        },
        {
            name: "Pitt",
            city: "Greenville",
            lat: 35.6115,
            lon: -77.3752,
            url: "counties/pitt/index.html",
            station: "KPGV",
            ugcCode: "NCZ044",
            zoneURL: "https://api.weather.gov/zones/forecast/NCZ044"
        },
        {
            name: "Beaufort",
            city: "Washington",
            lat: 35.5465,
            lon: -76.9519,
            url: "counties/beaufort/index.html",
            station: "KOCW",
            ugcCode: "NCZ080",
            zoneURL: "https://api.weather.gov/zones/forecast/NCZ080"
        },
        {
            name: "Martin",
            city: "Williamston",
            lat: 35.86,
            lon: -77.18,
            url: "counties/martin/index.html",
            station: "KMCZ",
            ugcCode: "NCZ029",
            zoneURL: "https://api.weather.gov/zones/forecast/NCZ029"
        },
        {
            name: "Dare",
            city: "Manteo",
            lat: 35.9082,
            lon: -75.6757,
            url: "counties/dare/?zone=mainland",
            ugcCode: "NCZ047",
            zoneURL: "https://api.weather.gov/zones/forecast/NCZ047",
            alternateZones: [
                { name: "Mainland Dare", ugcCode: "NCZ047", zoneURL: "https://api.weather.gov/zones/forecast/NCZ047" },
                { name: "Northern Outer Banks", ugcCode: "NCZ203", zoneURL: "https://api.weather.gov/zones/forecast/NCZ203" },
                { name: "Hatteras Island", ugcCode: "NCZ205", zoneURL: "https://api.weather.gov/zones/forecast/NCZ205" }
            ]
        },
        {
            name: "Washington",
            city: "Plymouth",
            lat: 35.87776758833479,
            lon: -76.61383000157353,
            url: "counties/washington/index.html",
            ugcCode: "NCZ045",
            zoneURL: "https://api.weather.gov/zones/forecast/NCZ045"
        },
        {
            name: "Tyrrell",
            city: "Columbia",
            lat: 35.9177,
            lon: -76.2522,
            url: "counties/tyrrell/index.html",
            ugcCode: "NCZ046",
            zoneURL: "https://api.weather.gov/zones/forecast/NCZ046"
        },
        {
            name: "Hyde",
            city: "Swan Quarter",
            lat: 35.4085,
            lon: -76.3302,
            url: "counties/hyde/?zone=mainland",
            ugcCode: "NCZ081",
            zoneURL: "https://api.weather.gov/zones/forecast/NCZ081",
            alternateZones: [
                { name: "Mainland Hyde", ugcCode: "NCZ081", zoneURL: "https://api.weather.gov/zones/forecast/NCZ081" },
                { name: "Ocracoke Island", ugcCode: "NCZ204", zoneURL: "https://api.weather.gov/zones/forecast/NCZ204" }
            ]
        }
    ],
    tropicalWeather: {
        season: {
            start: "05-15",
            end: "11-30"
        },
        graphics: {
            atlanticOutlook: "https://www.nhc.noaa.gov/xgtwo/two_atl_5d0.png",
            atlanticWinds: "https://www.nhc.noaa.gov/storm_graphics/AT01/AL012023_PROB34_F120_1280x1024.jpg"
        }
    }
};

// Normalize zones synchronously so consumers can rely on county.zones immediately
(function normalizeZones() {
    if (!window.siteConfig || !Array.isArray(window.siteConfig.counties)) return;
    window.siteConfig.counties.forEach(county => {
        const zones = [];
        if (county.ugcCode) zones.push(county.ugcCode);
        if (Array.isArray(county.alternateZones)) {
            county.alternateZones.forEach(alt => {
                if (alt.ugcCode && !zones.includes(alt.ugcCode)) {
                    zones.push(alt.ugcCode);
                }
            });
        }
        county.zones = [...new Set(zones)];
    });
})();