/**
 * ForecastModule.js
 * Handles fetching, processing, and displaying forecast data
 * including both daily and detailed forecasts
 */

import dataService from './dataService.js';
import { safeSetHTML, formatDate } from './utils.js';

class ForecastModule {
  constructor(options = {}) {
    // Default configuration
    this.config = {
      // Element IDs for forecast displays
      dailyForecastElementId: 'forecast',
      detailedForecastElementId: 'detailed-forecast',

      // Refresh intervals
      refreshInterval: 60 * 60 * 1000, // 1 hour - less frequent than current conditions

      // Formatting options
      maxDailyItems: 10,
      maxDetailedItems: 10,

      // Override with any provided options
      ...options
    };

    // Module state
    this.forecastData = null;
    this.lastUpdateTime = null;
    this.refreshTimer = null;
  }

  /**
   * Initialize the forecast module
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {string} county - County name
   * @param {Object} preloadedData - Optional preloaded data
   * @returns {Promise<boolean>} - Success status
   */
  async init(lat, lon, county, preloadedData = null) {
    try {
      if (!lat || !lon) {
        console.error('Invalid coordinates provided for forecast');
        return false;
      }

      // Store these for later use
      this.lat = lat;
      this.lon = lon;
      this.county = county;

      // If we have preloaded data, use it
      if (preloadedData) {
        this.forecastData = preloadedData;
        this.renderForecasts();
        this.lastUpdateTime = new Date();
        console.log('Initialized ForecastModule with preloaded data');
      } else {
        // Otherwise fetch fresh data
        await this.fetchForecastData();
      }

      // Setup refresh timer
      this.startRefreshTimer();

      console.log('ForecastModule initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing ForecastModule:', error);
      return false;
    }
  }

  /**
   * Fetch forecast data through the data service
   * @returns {Promise<Object>} - Forecast data
   */
  async fetchForecastData() {
    try {
      // Show loading state
      this.showLoadingState();

      // Fetch data through the data service
      const data = await dataService.getData('forecast', {
        lat: this.lat,
        lon: this.lon,
        county: this.county
      });

      if (!data) {
        throw new Error('No data returned from data service');
      }

      // Store the data
      this.forecastData = data;
      this.lastUpdateTime = new Date();

      // Render forecast displays
      this.renderForecasts();

      return data;
    } catch (error) {
      console.error('Error fetching forecast data:', error);

      // Show error state
      this.showErrorState(error);

      // If we have no existing data, use fallback
      if (!this.forecastData) {
        this.forecastData = this.getFallbackData();
        this.renderForecasts();
      }

      return this.forecastData;
    }
  }

  /**
   * Render both forecast displays (daily and detailed)
   */
  renderForecasts() {
    if (!this.forecastData) return;

    // Render daily forecast
    this.renderDailyForecast();

    // Render detailed forecast
    this.renderDetailedForecast();
  }

  /**
   * Render the daily forecast
   */
  renderDailyForecast() {
    const forecastElement = document.getElementById(this.config.dailyForecastElementId);
    if (!forecastElement) return;

    // Get daily forecast data
    const periods = this.forecastData.daily;
    if (!periods || !periods.length) {
      forecastElement.innerHTML = '<div class="forecast-item">Weather forecast unavailable. Please try again later.</div>';
      return;
    }

    let forecastHTML = '';
    periods.slice(0, this.config.maxDailyItems).forEach(period => {
      // Set color based on whether it's day or night
      const tempColor = period.isDaytime ? 'red' : 'blue';

      forecastHTML += `
        <div class="forecast-item">
          <div class="forecast-cell forecast-day">${period.name}</div>
          <div class="forecast-cell forecast-icon">
            <img src="${period.icon}" alt="${period.shortForecast}">
          </div>
          <div class="forecast-cell forecast-temp" style="color: ${tempColor};">
            ${period.temperature}°
          </div>
          <div class="forecast-cell forecast-desc">${period.shortForecast}</div>
        </div>
      `;
    });

    forecastElement.innerHTML = forecastHTML;
  }

  /**
   * Render the detailed forecast
   */
  renderDetailedForecast() {
    const detailedElement = document.getElementById(this.config.detailedForecastElementId);
    if (!detailedElement) return;

    // Get daily forecast data again (same source, different presentation)
    const periods = this.forecastData.daily;
    if (!periods || !periods.length) {
      detailedElement.innerHTML = '<div class="detailed-item">Detailed forecast unavailable. Please try again later.</div>';
      return;
    }

    let detailedHTML = '';
    periods.slice(0, this.config.maxDetailedItems).forEach(period => {
      detailedHTML += `
        <div class="detailed-item">
          <div class="detailed-row">
            <div class="detailed-col-day">
              <div class="detailed-day">${period.name}</div>
            </div>
            <div class="detailed-col-icon">
              <div class="detailed-icon"><img src="${period.icon}" alt="${period.shortForecast}"></div>
            </div>
            <div class="detailed-col-forecast">
              <div class="detailed-forecast">${period.detailedForecast}</div>
            </div>
          </div>
        </div>
      `;
    });

    detailedElement.innerHTML = detailedHTML;
  }

  /**
   * Show loading state for forecasts
   */
  showLoadingState() {
    const dailyElement = document.getElementById(this.config.dailyForecastElementId);
    const detailedElement = document.getElementById(this.config.detailedForecastElementId);

    const loadingHTML = '<div class="loading-indicator"><i class="fa-solid fa-spinner fa-spin"></i> Loading forecast data...</div>';

    if (dailyElement && !dailyElement.querySelector('.loading-indicator') &&
      (!this.forecastData || !this.forecastData.daily)) {
      dailyElement.innerHTML = loadingHTML;
    }

    if (detailedElement && !detailedElement.querySelector('.loading-indicator') &&
      (!this.forecastData || !this.forecastData.daily)) {
      detailedElement.innerHTML = loadingHTML;
    }
  }

  /**
   * Show error state for forecasts
   * @param {Error} error - The error that occurred
   */
  showErrorState(error) {
    const dailyElement = document.getElementById(this.config.dailyForecastElementId);
    const detailedElement = document.getElementById(this.config.detailedForecastElementId);

    const errorHTML = `
      <div class="error-indicator">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <p>Unable to load forecast data</p>
        <small>${error.message}</small>
      </div>
    `;

    if (dailyElement && !this.forecastData) {
      dailyElement.innerHTML = errorHTML;
    }

    if (detailedElement && !this.forecastData) {
      detailedElement.innerHTML = errorHTML;
    }
  }

  /**
   * Start the refresh timer
   */
  startRefreshTimer() {
    this.stopRefreshTimer();

    this.refreshTimer = setInterval(() => {
      console.log('Auto-refreshing forecast data');
      this.fetchForecastData();
    }, this.config.refreshInterval);
  }

  /**
   * Stop the refresh timer
   */
  stopRefreshTimer() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Force refresh the forecast data
   * @returns {Promise<boolean>} - Success status
   */
  async refresh() {
    try {
      await this.fetchForecastData();
      return true;
    } catch (error) {
      console.error('Error refreshing forecast data:', error);
      return false;
    }
  }

  /**
   * Get fallback data when all retrieval methods fail
   * @returns {Object} - Fallback data
   */
  getFallbackData() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Create minimal fallback data
    return {
      daily: [
        {
          name: 'Today',
          temperature: 'N/A',
          icon: './images/weather/unknown.png',
          shortForecast: 'Data Unavailable',
          detailedForecast: 'Weather forecast data is currently unavailable. Please try again later.',
          isDaytime: true
        },
        {
          name: 'Tonight',
          temperature: 'N/A',
          icon: './images/weather/unknown.png',
          shortForecast: 'Data Unavailable',
          detailedForecast: 'Weather forecast data is currently unavailable. Please try again later.',
          isDaytime: false
        },
        {
          name: formatDate(tomorrow, { weekday: 'short' }),
          temperature: 'N/A',
          icon: './images/weather/unknown.png',
          shortForecast: 'Data Unavailable',
          detailedForecast: 'Weather forecast data is currently unavailable. Please try again later.',
          isDaytime: true
        }
      ],
      hourly: []
    };
  }

  /**
   * Clean up resources when the module is no longer needed
   */
  destroy() {
    this.stopRefreshTimer();
    this.forecastData = null;
  }
}

export default ForecastModule;