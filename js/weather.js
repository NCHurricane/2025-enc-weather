// weather.js — ES6 module version for centralized frontend interface

const BASE_URL = '/data/weather.php';

// --- Helper for API GET requests ---
const fetchData = async (type, params = {}) => {
    const url = new URL(BASE_URL, window.location.origin);
    url.searchParams.set('type', type);
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch ${type}:`, error);
        return null;
    }
};

// --- API Calls ---
const getCurrent = (lat, lon) => fetchData('current', { lat, lon });
const getForecast = (lat, lon) => fetchData('forecast', { lat, lon });
const getAlerts = (lat, lon) => fetchData('alerts', { lat, lon });
const getTropical = () => fetchData('tropical');

// --- DOM Utility Functions ---
const renderCurrentTemp = async (selector, lat, lon) => {
    const data = await getCurrent(lat, lon);
    if (data && data.temp_f !== undefined) {
        document.querySelector(selector).textContent = `${Math.round(data.temp_f)}°F`;
    }
};

const renderAlerts = async (selector, lat, lon) => {
    const data = await getAlerts(lat, lon);
    const container = document.querySelector(selector);
    container.innerHTML = '';
    if (data && Array.isArray(data) && data.length > 0) {
        data.forEach(alert => {
            const div = document.createElement('div');
            div.className = 'alert';
            div.textContent = alert.event;
            container.appendChild(div);
        });
    }
};

const renderForecast = async (selector, lat, lon) => {
    const data = await getForecast(lat, lon);
    const container = document.querySelector(selector);
    container.innerHTML = '';
    if (data && data.daily) {
        data.daily.forEach(day => {
            const div = document.createElement('div');
            div.className = 'forecast-day';
            div.innerHTML = `
                <strong>${day.name}</strong><br>
                ${day.short_forecast}<br>
                <span>H: ${day.high}°F / L: ${day.low}°F</span>
            `;
            container.appendChild(div);
        });
    }
};

export const WeatherAPI = {
    getCurrent,
    getForecast,
    getAlerts,
    getTropical,
    renderCurrentTemp,
    renderAlerts,
    renderForecast,
};
