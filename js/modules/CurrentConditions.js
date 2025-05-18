/**
 * CurrentConditionsModule.js
 * Handles fetching, processing and displaying current weather conditions
 */

import dataService from './DataService.js';
import { safeSetText, safeSetHTML } from './utils.js';

class CurrentConditionsModule {
  constructor(options = {}) {
    // Default configuration
    this.config = {
      tempElementId: 'current-temp',
      descElementId: 'current-desc',
      dewpointElementId: 'current-dewpoint',
      humidityElementId: 'current-humidity',
      windElementId: 'current-wind',
      visibilityElementId: 'current-visibility',
      pressureElementId: 'current-pressure',
      timeElementId: 'current-obs-time',
      locationElementId: 'current-location',
      lastUpdateElementId: 'last-update-time',
      backgroundElementId: 'weather-background',
      backgroundIconClass: 'weather-icon',
      refreshInterval: 30 * 60 * 1000, // 30 minutes
      updateLastTimeInterval: 60 * 1000, // 1 minute
      ...options
    };

    // Current weather data
    this.weatherData = null;
    this.lastUpdateTime = null;
    this.updateTimer = null;
    this.refreshTimer = null;
  }

  /**
   * Initialize the current conditions module
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {string} county - County name
   * @param {Object} preloadedData - Optional preloaded data
   * @returns {Promise<boolean>} - Success status
   */
  async init(lat, lon, county, preloadedData = null) {
    try {
      if (!lat || !lon) {
        console.error('Invalid coordinates provided for current conditions');
        return false;
      }

      // Store these for later use
      this.lat = lat;
      this.lon = lon;
      this.county = county;

      // If we have preloaded data (e.g., from PHP), use it
      if (preloadedData) {
        this.weatherData = preloadedData;
        this.updateDOM();
        this.lastUpdateTime = new Date();
      } else {
        // Otherwise fetch fresh data
        await this.fetchWeatherData();
      }

      // Setup update timers
      this.startTimers();

      // Create the last update element if it doesn't exist
      this.createLastUpdateElement();

      console.log('CurrentConditionsModule initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing CurrentConditionsModule:', error);
      return false;
    }
  }

  /**
   * Fetch current weather data using the data service
   * @returns {Promise<Object>} - Weather data
   */
  async fetchWeatherData() {
    try {
      // Fetch data through the data service
      const data = await dataService.getData('currentConditions', {
        lat: this.lat,
        lon: this.lon,
        county: this.county
      });

      if (!data) {
        throw new Error('No data returned from data service');
      }

      // Store the data
      this.weatherData = data;
      this.lastUpdateTime = new Date();

      // Update the DOM with new data
      this.updateDOM();

      return data;
    } catch (error) {
      console.error('Error fetching weather data:', error);
      // If we have no existing data, use fallback
      if (!this.weatherData) {
        this.weatherData = this.getFallbackData();
        this.updateDOM();
      }
      return this.weatherData;
    }
  }

  /**
   * Update the DOM with current weather data
   */
  updateDOM() {
    if (!this.weatherData) return;

    // Start the animation frame for smoother UI updates
    requestAnimationFrame(() => {
      // Update each element if it exists
      if (this.weatherData.temp !== 'N/A') {
        safeSetText(this.config.tempElementId, `${this.weatherData.temp}°`);
      } else {
        safeSetText(this.config.tempElementId, `N/A`);
      }
      
      safeSetText(this.config.descElementId, this.weatherData.condition || 'Sky Conditions N/A');
      safeSetHTML(this.config.dewpointElementId, `<strong>Dew Point:</strong> ${this.weatherData.dewpoint !== 'N/A' ? `${this.weatherData.dewpoint}°F` : 'N/A'}`);
      safeSetHTML(this.config.humidityElementId, `<strong>Humidity:</strong> ${this.weatherData.humidity !== 'N/A' ? `${this.weatherData.humidity}%` : 'N/A'}`);
      safeSetHTML(this.config.windElementId, `<strong>Wind:</strong> ${this.weatherData.wind}`);
      safeSetHTML(this.config.visibilityElementId, `<strong>Visibility:</strong> ${this.weatherData.visibility !== 'N/A' ? `${this.weatherData.visibility} mi` : 'N/A'}`);
      safeSetHTML(this.config.pressureElementId, `<strong>Pressure:</strong> ${this.weatherData.pressure !== 'N/A' ? `${this.weatherData.pressure} mb` : 'N/A'}`);
      safeSetText(this.config.timeElementId, this.weatherData.formattedTime || 'N/A');
      safeSetText(this.config.locationElementId, this.weatherData.stationName || 'Unknown Station');

      // Update the background
      this.setWeatherBackground();

      // Update the last update time
      this.updateLastUpdateTime();
    });
  }

  /**
   * Set weather background based on conditions
   */
  setWeatherBackground() {
    const weatherBgElement = document.getElementById(this.config.backgroundElementId);
    if (!weatherBgElement) return;

    // Check if we have an icon URL
    if (this.weatherData.iconUrl) {
      weatherBgElement.classList.add('weather-bg');

      // Find or create the icon element
      let weatherIconDiv = weatherBgElement.querySelector(`.${this.config.backgroundIconClass}`);
      if (!weatherIconDiv) {
        weatherIconDiv = document.createElement('div');
        weatherIconDiv.className = this.config.backgroundIconClass;
        weatherBgElement.appendChild(weatherIconDiv);
      }

      // Set the background image
      weatherIconDiv.style.backgroundImage = `url("${this.weatherData.iconUrl}")`;
      weatherIconDiv.style.display = 'block';
    } else {
      // If no icon, use a weather condition-based class
      this.applyWeatherClass(weatherBgElement);
    }
  }

  /**
   * Apply weather class based on conditions
   * @param {HTMLElement} element - Element to apply class to
   */
  applyWeatherClass(element) {
    // Remove any existing weather classes
    const weatherClasses = [
      'weather-clear', 'weather-cloudy', 'weather-rain',
      'weather-snow', 'weather-storm', 'weather-fog'
    ];
    
    weatherClasses.forEach(cls => {
      element.classList.remove(cls);
    });

    // Determine appropriate class based on condition
    const condition = this.weatherData.condition?.toLowerCase() || '';
    
    if (condition.includes('clear') || condition.includes('sunny') || condition.includes('fair')) {
      element.classList.add('weather-clear');
    } else if (condition.includes('cloud') || condition.includes('overcast')) {
      element.classList.add('weather-cloudy');
    } else if (condition.includes('rain') || condition.includes('shower') || condition.includes('drizzle')) {
      element.classList.add('weather-rain');
    } else if (condition.includes('snow') || condition.includes('flurr')) {
      element.classList.add('weather-snow');
    } else if (condition.includes('thunder') || condition.includes('storm') || condition.includes('lightning')) {
      element.classList.add('weather-storm');
    } else if (condition.includes('fog') || condition.includes('mist') || condition.includes('haze')) {
      element.classList.add('weather-fog');
    }
  }

  /**
   * Create the last update element to show data age
   * @returns {HTMLElement|null} - Created element or null if creation failed
   */
  createLastUpdateElement() {
    let lastUpdateElement = document.getElementById(this.config.lastUpdateElementId);
    if (lastUpdateElement) {
      return lastUpdateElement;
    }

    const detailsElement = document.querySelector('.details');
    if (!detailsElement) return null;

    lastUpdateElement = document.createElement('p');
    lastUpdateElement.id = this.config.lastUpdateElementId;
    lastUpdateElement.className = 'last-update';
    lastUpdateElement.style.color = '#fff200';
    lastUpdateElement.style.fontSize = '.8rem';
    lastUpdateElement.innerText = 'Data age: Unknown';

    const br = detailsElement.querySelector('br');
    if (br) {
      detailsElement.insertBefore(lastUpdateElement, br);
    } else {
      detailsElement.appendChild(lastUpdateElement);
    }

    return lastUpdateElement;
  }

  /**
   * Update the last update timestamp text
   */
  updateLastUpdateTime() {
    if (!this.lastUpdateTime) return;
    
    const lastUpdateElement = document.getElementById(this.config.lastUpdateElementId);
    if (!lastUpdateElement) return;

    const now = new Date();
    const diffMs = now - this.lastUpdateTime;
    const diffMins = Math.floor(diffMs / 60000);

    let ageText;
    if (diffMins < 1) {
      ageText = 'Data age: Less than a minute';
    } else if (diffMins === 1) {
      ageText = 'Data age: 1 minute';
    } else if (diffMins < 60) {
      ageText = `Data age: ${diffMins} minutes`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const remainingMins = diffMins % 60;
      
      if (hours === 1) {
        if (remainingMins === 0) {
          ageText = 'Data age: 1 hour';
        } else {
          ageText = `Data age: 1 hour, ${remainingMins} min`;
        }
      } else {
        if (remainingMins === 0) {
          ageText = `Data age: ${hours} hours`;
        } else {
          ageText = `Data age: ${hours} hr, ${remainingMins} min`;
        }
      }
    }

    safeSetText(lastUpdateElement, ageText);
  }

  /**
   * Start timers for data refresh and last update time
   */
  startTimers() {
    // Clear any existing timers
    this.stopTimers();

    // Timer to refresh the data
    this.refreshTimer = setInterval(() => {
      this.fetchWeatherData();
    }, this.config.refreshInterval);

    // Timer to update the "last updated" text
    this.updateTimer = setInterval(() => {
      this.updateLastUpdateTime();
    }, this.config.updateLastTimeInterval);
  }

  /**
   * Stop all timers
   */
  stopTimers() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  /**
   * Force refresh the weather data
   * @returns {Promise<boolean>} - Success status
   */
  async refresh() {
    try {
      await this.fetchWeatherData();
      return true;
    } catch (error) {
      console.error('Error refreshing weather data:', error);
      return false;
    }
  }

  /**
   * Get fallback data when all retrieval methods fail
   * @returns {Object} - Fallback data
   */
  getFallbackData() {
    return {
      temp: 'N/A',
      condition: 'Data Unavailable',
      dewpoint: 'N/A',
      humidity: 'N/A',
      wind: 'N/A',
      visibility: 'N/A',
      pressure: 'N/A',
      time: new Date(),
      formattedTime: 'N/A',
      stationName: 'Unknown Station',
      iconUrl: null
    };
  }

  /**
   * Clean up resources when the module is no longer needed
   */
  destroy() {
    this.stopTimers();
    this.weatherData = null;
  }
}

export default CurrentConditionsModule;