// config.js
export const imageServiceConfig = {
    radar: {
        baseUrl: 'https://radar.weather.gov/ridge/standard/',
        defaultRegion: 'KMHX',
        regions: {
            'KMHX': 'Newport, NC',
            'KAKQ': 'Wakefield, VA',
            'KRAX': 'Raleigh, NC',
            'KLTX': 'Wilmington, NC'
        }
    },
    satellite: {
        baseUrl: 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/',
        defaultSector: 'se',
        defaultProduct: 'GEOCOLOR',
        resolutions: {
            static: '2400x2400',
            animated: '600x600'
        },
        products: {
            'GEOCOLOR': 'GeoColor',
            '02': 'Visible',
            '07': 'Shortwave IR',
            '13': 'Clean IR',
            '08': 'Water Vapor'
        }
    }
};