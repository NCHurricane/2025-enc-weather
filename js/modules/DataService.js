/**
 * dataService.js
 * Central module for weather data retrieval and caching with standardized data models
 */

class dataService {
  constructor() {
    // Cache configuration - TTL in milliseconds
    this.cacheTTL = {
      alerts: 2 * 60 * 1000,           // 2 minutes
      currentConditions: 30 * 60 * 1000, // 30 minutes
      forecast: 2 * 60 * 60 * 1000,     // 2 hours
      tropical: 2 * 60 * 60 * 1000,     // 2 hours
      radar: 5 * 60 * 1000,             // 5 minutes
      satellite: 15 * 60 * 1000,        // 15 minutes
      afd: 3 * 60 * 60 * 1000,          // 3 hours
      countyMapping: 1 * 60 * 60 * 1000, // 1 hour - county zone/UGC mappings
    };

    // API configurations
    this.nwsApiBase = 'https://api.weather.gov';
    this.openMeteoApiBase = 'https://api.open-meteo.com/v1/forecast';

    // Local cache paths
    this.localCachePaths = {
      base: './js/modules/cache/',
      alternate: '../../js/modules/cache/'
    };

    // Initialize cache
    this.initCache();
  }

  /**
   * Initialize localStorage cache if not exists
   */
  initCache() {
    if (!localStorage.getItem('weatherCache')) {
      localStorage.setItem('weatherCache', JSON.stringify({}));
    }
    console.log('DataService initialized with local storage cache');
  }

  /**
   * Get data with caching strategy: localStorage > server JSON cache > API
   * @param {string} dataType - Type of data (alerts, currentConditions, etc.)
   * @param {Object} params - Parameters for the request (lat, lon, county, etc.)
   * @returns {Promise<Object>} - Normalized data object
   */
  async getData(dataType, params) {
    try {
      // Try to get from localStorage cache first
      const cachedData = this.getFromLocalCache(dataType, params);
      if (cachedData) {
        console.log(`Retrieved ${dataType} from localStorage cache`);
        return cachedData;
      }

      // Try to get from server JSON cache next
      const serverCachedData = await this.getFromServerCache(dataType, params);
      if (serverCachedData) {
        // Save to localStorage for future requests
        this.saveToLocalCache(dataType, params, serverCachedData);
        console.log(`Retrieved ${dataType} from server cache`);
        return serverCachedData;
      }

      // Fall back to direct API call
      const apiData = await this.getFromApi(dataType, params);
      if (apiData) {
        // Save to localStorage for future requests
        this.saveToLocalCache(dataType, params, apiData);
        console.log(`Retrieved ${dataType} from API`);
        return apiData;
      }

      throw new Error(`Could not retrieve ${dataType} data`);
    } catch (error) {
      console.error(`Error getting ${dataType} data:`, error);
      // Return default/fallback data
      return this.getFallbackData(dataType);
    }
  }

  /**
   * Get data from localStorage if it exists and is not expired
   * @param {string} dataType - Type of data
   * @param {Object} params - Request parameters
   * @returns {Object|null} - Cached data or null if not found/expired
   */
  getFromLocalCache(dataType, params) {
    try {
      const cache = JSON.parse(localStorage.getItem('weatherCache') || '{}');
      const cacheKey = this.getCacheKey(dataType, params);

      if (cache[cacheKey]) {
        // Check if cache is still valid
        const now = Date.now();
        if (now - cache[cacheKey].timestamp < this.cacheTTL[dataType]) {
          return cache[cacheKey].data;
        } else {
          console.log(`Local cache for ${dataType} expired`);
        }
      }
      return null;
    } catch (error) {
      console.warn('Error reading from localStorage:', error);
      return null;
    }
  }

  /**
   * Save data to localStorage cache
   * @param {string} dataType - Type of data
   * @param {Object} params - Request parameters
   * @param {Object} data - Data to cache
   */
  saveToLocalCache(dataType, params, data) {
    try {
      const cache = JSON.parse(localStorage.getItem('weatherCache') || '{}');
      const cacheKey = this.getCacheKey(dataType, params);

      cache[cacheKey] = {
        data,
        timestamp: Date.now()
      };

      localStorage.setItem('weatherCache', JSON.stringify(cache));
    } catch (error) {
      console.warn('Error saving to localStorage:', error);
    }
  }

  /**
   * Generate a unique cache key based on data type and parameters
   * @param {string} dataType - Type of data
   * @param {Object} params - Request parameters
   * @returns {string} - Cache key
   */
  getCacheKey(dataType, params) {
    // Create a stable, unique key based on data type and parameters
    const paramString = Object.entries(params || {})
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, value]) => `${key}:${value}`)
      .join('_');

    return `${dataType}_${paramString}`;
  }

  /**
   * Get data from server JSON cache
   * @param {string} dataType - Type of data
   * @param {Object} params - Request parameters
   * @returns {Promise<Object|null>} - Cached data or null if not found
   */
  async getFromServerCache(dataType, params) {
    try {
      // Determine the cache file path based on data type and parameters
      const cacheFilePath = this.getServerCachePath(dataType, params);

      // Try multiple path patterns to handle different directory structures
      for (const basePath of [this.localCachePaths.base, this.localCachePaths.alternate]) {
        try {
          const response = await fetch(`${basePath}${cacheFilePath}?t=${Date.now()}`);
          if (response.ok) {
            const data = await response.json();
            // Normalize the data to ensure consistent structure
            return this.normalizeData(dataType, data);
          }
        } catch (err) {
          console.log(`Failed fetch attempt for ${basePath}${cacheFilePath}`);
          // Continue to next path pattern
        }
      }

      // If we've tried all paths and none worked
      return null;
    } catch (error) {
      console.warn(`Error fetching from server cache for ${dataType}:`, error);
      return null;
    }
  }

  /**
   * Get the server cache file path for a data type and parameters
   * @param {string} dataType - Type of data
   * @param {Object} params - Request parameters
   * @returns {string} - Cache file path
   */
  getServerCachePath(dataType, params) {
    switch (dataType) {
      case 'currentConditions':
        return `${params.county.toLowerCase()}_weather.json`;
      case 'forecast':
        return `${params.county.toLowerCase()}_forecast.json`;
      case 'alerts':
        return `${params.county.toLowerCase()}_alerts.json`;
      case 'afd':
        return `${params.wfo.toLowerCase()}_afd.json`;
      case 'tropical':
        if (params.subType === 'outlook') return 'tropical_two_at.json';
        if (params.subType === 'outlookSpanish') return 'tropical_two_sat.json';
        if (params.subType === 'discussion') return 'tropical_disc_at.json';
        return 'nhc_current_storms.json';
      default:
        return `${params.county.toLowerCase()}_${dataType}.json`;
    }
  }

  /**
   * Get data directly from API
   * @param {string} dataType - Type of data
   * @param {Object} params - Request parameters
   * @returns {Promise<Object|null>} - API data or null if request failed
   */
  async getFromApi(dataType, params) {
    try {
      let data = null;

      switch (dataType) {
        case 'currentConditions':
          // Use Open-Meteo for current conditions as specified
          data = await this.fetchOpenMeteoCurrentConditions(params);
          break;
        case 'forecast':
          data = await this.fetchNwsForecast(params);
          break;
        case 'alerts':
          data = await this.fetchNwsAlerts(params);
          break;
        case 'afd':
          data = await this.fetchNwsAfd(params);
          break;
        case 'tropical':
          data = await this.fetchTropicalData(params);
          break;
        default:
          throw new Error(`API fetch not implemented for data type: ${dataType}`);
      }

      // Normalize the data to ensure consistent structure
      return this.normalizeData(dataType, data);
    } catch (error) {
      console.error(`Error fetching ${dataType} from API:`, error);
      return null;
    }
  }

  /**
   * Fetch current conditions from Open-Meteo API
   * @param {Object} params - Parameters including lat and lon
   * @returns {Promise<Object>} - Weather data
   */
  async fetchOpenMeteoCurrentConditions(params) {
    const { lat, lon } = params;

    // Construct the Open-Meteo API URL with required parameters
    const url = `${this.openMeteoApiBase}?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit&windspeed_unit=mph&precipitation_unit=inch`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    return await response.json();
  }

  /**
   * Fetch forecast from NWS API
   * @param {Object} params - Parameters including lat and lon
   * @returns {Promise<Object>} - Forecast data
   */
  async fetchNwsForecast(params) {
    const { lat, lon } = params;

    // First call to get grid points
    const pointsResponse = await fetch(`${this.nwsApiBase}/points/${lat},${lon}`);
    if (!pointsResponse.ok) throw new Error(`HTTP error! status: ${pointsResponse.status}`);

    const pointsData = await pointsResponse.json();
    const forecastUrl = pointsData.properties.forecast;
    const hourlyForecastUrl = pointsData.properties.forecastHourly;

    // Get both daily and hourly forecasts
    const [forecastResponse, hourlyResponse] = await Promise.all([
      fetch(forecastUrl),
      fetch(hourlyForecastUrl)
    ]);

    if (!forecastResponse.ok || !hourlyResponse.ok) {
      throw new Error('Failed to fetch forecast data');
    }

    const forecastData = await forecastResponse.json();
    const hourlyData = await hourlyResponse.json();

    // Combine both forecasts into one data structure
    return {
      daily: forecastData.properties.periods,
      hourly: hourlyData.properties.periods
    };
  }

  /**
   * Fetch alerts from NWS API
   * @param {Object} params - Parameters including lat and lon
   * @returns {Promise<Object>} - Alerts data
   */
  async fetchNwsAlerts(params) {
    const { lat, lon } = params;

    const response = await fetch(`${this.nwsApiBase}/alerts/active?point=${lat},${lon}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    return await response.json();
  }

  /**
   * Fetch Area Forecast Discussion from NWS API
   * @param {Object} params - Parameters including WFO identifier
   * @returns {Promise<Object>} - AFD data
   */
  async fetchNwsAfd(params) {
    const { wfo } = params;

    // This is more complex as it requires scraping HTML
    const url = `https://forecast.weather.gov/product.php?site=${wfo}&issuedby=${wfo}&product=AFD&format=txt&version=1&glossary=0`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const html = await response.text();

    // Extract the pre tag content which contains the AFD
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const preElement = doc.querySelector("pre");

    if (!preElement) throw new Error('Could not find AFD content in page');

    const afdText = preElement.innerText;

    // Return in the format expected by the normalizer
    return {
      content: afdText,
      timestamp: Date.now() / 1000 // Convert to seconds for consistency with PHP timestamp
    };
  }

  /**
   * Fetch tropical data from NHC
   * @param {Object} params - Parameters including subType
   * @returns {Promise<Object>} - Tropical data
   */
  async fetchTropicalData(params) {
    // This is a placeholder - actual implementation would depend on what's available
    // Most tropical data is best consumed from caches due to complex formats

    if (params.subType === 'stormInfo') {
      // For active storms, try NHC API directly
      const response = await fetch('https://www.nhc.noaa.gov/CurrentStorms.json');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    }

    throw new Error('Direct API fetch not implemented for this tropical data type');
  }

  /**
   * Normalize data to ensure consistent structure regardless of source
   * @param {string} dataType - Type of data
   * @param {Object} data - Raw data to normalize
   * @returns {Object} - Normalized data
   */
  normalizeData(dataType, data) {
    if (!data) return null;

    switch (dataType) {
      case 'currentConditions':
        return this.normalizeCurrentConditions(data);
      case 'forecast':
        return this.normalizeForecast(data);
      case 'alerts':
        return this.normalizeAlerts(data);
      case 'afd':
        return this.normalizeAfd(data);
      case 'tropical':
        return this.normalizeTropical(data);
      default:
        // For types without specific normalization, return as-is
        return data;
    }
  }

  /**
   * Normalize current conditions data
   * @param {Object} data - Raw current conditions data
   * @returns {Object} - Normalized current conditions
   */
  normalizeCurrentConditions(data) {
    // Handle data from server cache
    if (data.weather) {
      // This is from our county-specific cache
      const w = data.weather;
      return {
        temp: this.formatTemperature(w.temperature),
        condition: w.skyConditions || 'Unknown',
        dewpoint: this.formatTemperature(w.dewPoint),
        humidity: this.formatPercentage(w.humidity),
        wind: this.formatWind(w.windSpeed, w.windDirectionCardinal),
        visibility: this.formatVisibility(w.visibility),
        pressure: this.formatPressure(w.pressure),
        time: w.timestamp ? new Date(w.timestamp * 1000) : new Date(),
        formattedTime: this.formatTime(w.timestamp),
        stationName: w.stationName || 'Local Station',
        iconUrl: w.iconUrl || null
      };
    }

    // Handle data from Open-Meteo API
    if (data.current_weather) {
      const cw = data.current_weather;
      const condition = this.getWeatherCondition(cw.weathercode);

      return {
        temp: this.formatTemperature(cw.temperature),
        condition: condition,
        dewpoint: 'N/A', // Open-Meteo basic endpoint doesn't provide dewpoint
        humidity: 'N/A', // Open-Meteo basic endpoint doesn't provide humidity
        wind: this.formatWind(cw.windspeed, this.degreesToCardinal(cw.winddirection)),
        visibility: 'N/A', // Open-Meteo basic endpoint doesn't provide visibility
        pressure: 'N/A', // Open-Meteo basic endpoint doesn't provide pressure
        time: new Date(cw.time * 1000),
        formattedTime: this.formatTime(cw.time),
        stationName: 'Open-Meteo',
        iconUrl: null // Open-Meteo doesn't provide icons
      };
    }

    // Fallback for unknown format
    return this.getFallbackData('currentConditions');
  }

  /**
   * Map Open-Meteo WMO weather codes to text conditions
   * @param {number} code - WMO weather code
   * @returns {string} - Text description of weather condition
   */
  getWeatherCondition(code) {
    const conditions = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Fog',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      56: 'Light freezing drizzle',
      57: 'Dense freezing drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      66: 'Light freezing rain',
      67: 'Heavy freezing rain',
      71: 'Slight snow fall',
      73: 'Moderate snow fall',
      75: 'Heavy snow fall',
      77: 'Snow grains',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      85: 'Slight snow showers',
      86: 'Heavy snow showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail'
    };

    return conditions[code] || 'Unknown';
  }

  /**
   * Normalize forecast data
   * @param {Object} data - Raw forecast data
   * @returns {Object} - Normalized forecast
   */
  normalizeForecast(data) {
    // County cache format
    if (data.forecast && (data.forecast.daily || data.forecast.hourly)) {
      return {
        daily: data.forecast.daily || [],
        hourly: data.forecast.hourly || []
      };
    }

    // Direct from NWS API format - already handled in fetchNwsForecast
    if (data.daily && data.hourly) {
      return data;
    }

    // If it's just the raw NWS API response
    if (data.properties && data.properties.periods) {
      // If we can't determine if it's daily or hourly, assume daily
      return {
        daily: data.properties.periods,
        hourly: []
      };
    }

    // Fallback
    return this.getFallbackData('forecast');
  }

  /**
   * Normalize alerts data
   * @param {Object} data - Raw alerts data
   * @returns {Object} - Normalized alerts
   */
  normalizeAlerts(data) {
    // From county cache
    if (data.alerts && Array.isArray(data.alerts)) {
      return {
        alerts: data.alerts.map(alert => {
          // Ensure each alert has a properties object for consistency
          if (!alert.properties) {
            alert.properties = {
              event: alert.event || 'Unknown Alert',
              headline: alert.headline || '',
              description: alert.description || '',
              instruction: alert.instruction || '',
              severity: alert.severity || 'Unknown',
              certainty: alert.certainty || 'Unknown',
              urgency: alert.urgency || 'Unknown'
            };
          }
          return alert;
        })
      };
    }

    // From NWS API
    if (data.features && Array.isArray(data.features)) {
      return {
        alerts: data.features
      };
    }

    // Fallback
    return this.getFallbackData('alerts');
  }

  /**
   * Normalize Area Forecast Discussion data
   * @param {Object} data - Raw AFD data
   * @returns {Object} - Normalized AFD
   */
  normalizeAfd(data) {
    // If already in the expected format
    if (data.content && data.timestamp) {
      return data;
    }

    // If it's raw text from API
    if (typeof data === 'string') {
      return {
        content: data,
        timestamp: Date.now() / 1000
      };
    }

    // Fallback
    return this.getFallbackData('afd');
  }

  /**
   * Normalize tropical data
   * @param {Object} data - Raw tropical data
   * @returns {Object} - Normalized tropical data
   */
  normalizeTropical(data) {
    // If it's already a valid tropical data format, return it
    if (data.activeStorms || data.outlook || data.discussion) {
      return data;
    }

    // If it's from NHC CurrentStorms API
    if (data.activeStorms && Array.isArray(data.activeStorms)) {
      return {
        activeStorms: data.activeStorms
      };
    }

    // Fallback
    return this.getFallbackData('tropical');
  }

  /**
   * Get fallback data when all retrieval methods fail
   * @param {string} dataType - Type of data
   * @returns {Object} - Fallback data structure
   */
  getFallbackData(dataType) {
    // Provide default/empty data structures for each data type
    switch (dataType) {
      case 'currentConditions':
        return {
          temp: 'N/A',
          condition: 'Data Unavailable',
          dewpoint: 'N/A',
          humidity: 'N/A',
          wind: 'N/A',
          visibility: 'N/A',
          pressure: 'N/A',
          time: new Date(),
          formattedTime: this.formatTime(Date.now() / 1000),
          stationName: 'Unknown Station',
          iconUrl: null
        };
      case 'forecast':
        return {
          daily: [],
          hourly: []
        };
      case 'alerts':
        return {
          alerts: []
        };
      case 'afd':
        return {
          content: 'Area Forecast Discussion not available at this time.',
          timestamp: Date.now() / 1000
        };
      case 'tropical':
        return {
          activeStorms: [],
          outlook: 'Tropical data not available at this time.'
        };
      default:
        return {
          error: 'No data available',
          timestamp: Date.now() / 1000
        };
    }
  }

  /* FORMATTING UTILITIES */

  /**
   * Format temperature ensuring it's an integer
   * @param {any} temp - Temperature to format
   * @returns {number|string} - Formatted temperature
   */
  formatTemperature(temp) {
    if (temp === null || temp === undefined || temp === 'N/A') {
      return 'N/A';
    }
    return Math.round(typeof temp === 'string' ? parseFloat(temp) : temp);
  }

  /**
   * Format percentage ensuring it's an integer
   * @param {any} value - Percentage to format
   * @returns {number|string} - Formatted percentage
   */
  formatPercentage(value) {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    return Math.round(typeof value === 'string' ? parseFloat(value) : value);
  }

  /**
   * Format wind speed and direction
   * @param {any} speed - Wind speed
   * @param {string} direction - Wind direction
   * @returns {string} - Formatted wind information
   */
  formatWind(speed, direction) {
    if (typeof speed === 'string') {
      const match = speed.match(/(\d+)/);
      if (match) {
        speed = parseInt(match[1], 10);
      } else {
        return 'N/A';
      }
    }

    if (speed === 0) {
      return 'Calm';
    } else {
      return `${Math.round(speed)} mph from ${direction || 'N/A'}`;
    }
  }

  /**
   * Format visibility
   * @param {any} visibility - Visibility to format
   * @returns {string} - Formatted visibility
   */
  formatVisibility(visibility) {
    if (visibility === null || visibility === undefined) {
      return 'N/A';
    }
    return visibility;
  }

  /**
   * Format pressure
   * @param {any} pressure - Pressure to format
   * @returns {number|string} - Formatted pressure
   */
  formatPressure(pressure) {
    if (pressure === null || pressure === undefined) {
      return 'N/A';
    }
    return pressure;
  }

  /**
   * Format time
   * @param {number} timestamp - Unix timestamp in seconds
   * @returns {string} - Formatted time string
   */
  formatTime(timestamp) {
    if (!timestamp) return 'Unknown';

    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Convert degrees to cardinal direction
   * @param {number} degrees - Direction in degrees
   * @returns {string} - Cardinal direction
   */
  degreesToCardinal(degrees) {
    if (degrees === undefined || degrees === null) return 'N/A';

    // Ensure degrees is between 0-360
    degrees = ((degrees % 360) + 360) % 360;

    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return directions[Math.round(degrees / 22.5) % 16];
  }

  /**
   * Clear all cached data (localStorage only)
   */
  clearCache() {
    localStorage.removeItem('weatherCache');
    this.initCache();
    console.log('Weather cache cleared');
  }

  /**
   * Force refresh specific data type
   * @param {string} dataType - Type of data to refresh
   * @param {Object} params - Request parameters
   * @returns {Promise<Object>} - Fresh data
   */
  async forceRefresh(dataType, params) {
    try {
      // Skip local cache, go straight to server cache or API
      const serverCachedData = await this.getFromServerCache(dataType, params);
      if (serverCachedData) {
        this.saveToLocalCache(dataType, params, serverCachedData);
        return serverCachedData;
      }

      const apiData = await this.getFromApi(dataType, params);
      if (apiData) {
        this.saveToLocalCache(dataType, params, apiData);
        return apiData;
      }

      throw new Error(`Could not refresh ${dataType} data`);
    } catch (error) {
      console.error(`Error refreshing ${dataType} data:`, error);
      return this.getFallbackData(dataType);
    }
  }
}

// Create and export singleton instance
const dataService = new dataService();
export default dataService;