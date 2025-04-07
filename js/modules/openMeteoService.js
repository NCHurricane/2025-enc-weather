// openMeteoService.js

// Weather code mapping based on Open-Meteo documentation
const WEATHER_CODE_MAP = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with light hail",
    99: "Thunderstorm with heavy hail"
};

/**
 * Fetch weather data from Open-Meteo API
 * @param {number} latitude - Latitude of the location
 * @param {number} longitude - Longitude of the location
 * @returns {Promise<Object>} Formatted weather data
 */
export async function fetchOpenMeteoWeather(latitude, longitude) {
    try {
        const url = new URL('https://api.open-meteo.com/v1/forecast');
        url.search = new URLSearchParams({
            latitude: latitude,
            longitude: longitude,
            current: [
                'temperature_2m',
                'relative_humidity_2m',
                'is_day',
                'weather_code',
                'wind_speed_10m',
                'wind_direction_10m',
                'surface_pressure'
            ].join(','),
            timezone: 'America/New_York',
            wind_speed_unit: 'mph',
            temperature_unit: 'fahrenheit',
            precipitation_unit: 'inch'
        });

        const response = await fetch(url.toString());

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();
        return formatOpenMeteoData(data);
    } catch (error) {
        console.error('Open-Meteo API fetch error:', error);
        return null;
    }
}

/**
 * Convert wind direction degrees to cardinal direction
 * @param {number} degrees - Wind direction in degrees
 * @returns {string} Cardinal direction
 */
function degreesToCardinal(degrees) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
        'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
}

/**
 * Format Open-Meteo data to a standardized structure
 * @param {Object} data - Raw Open-Meteo API response
 * @returns {Object} Formatted weather data
 */
function formatOpenMeteoData(data) {
    if (!data || !data.current) {
        return null;
    }

    const current = data.current;

    return {
        temp: Math.round(current.temperature_2m),
        condition: WEATHER_CODE_MAP[current.weather_code] || 'Unknown',
        humidity: Math.round(current.relative_humidity_2m),
        wind: {
            speed: Math.round(current.wind_speed_10m),
            direction: degreesToCardinal(current.wind_direction_10m),
            rawDirection: current.wind_direction_10m
        },
        pressure: Math.round(current.surface_pressure * 0.0295300), // Convert hPa to inHg
        isDay: current.is_day === 1,
        timestamp: new Date(),
        source: 'Open-Meteo'
    };
}

/**
 * Example usage function - demonstrates how to use the service
 */
export async function exampleOpenMeteoUsage() {
    // Swan Quarter coordinates
    const latitude = 35.4085;
    const longitude = -76.3302;

    try {
        const weatherData = await fetchOpenMeteoWeather(latitude, longitude);

        if (weatherData) {
            console.log('Open-Meteo Weather Data:', weatherData);

            // Example of displaying data
            console.log(`Temperature: ${weatherData.temp}°F`);
            console.log(`Condition: ${weatherData.condition}`);
            console.log(`Wind: ${weatherData.wind.speed} mph from ${weatherData.wind.direction}`);
        }
    } catch (error) {
        console.error('Error fetching Open-Meteo weather:', error);
    }
}

// Uncomment to run example when module is imported
// exampleOpenMeteoUsage();