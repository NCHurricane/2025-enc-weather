/**
 * utils.js
 * Utility functions for the weather application
 */

/**
 * Safely sets the text content of an element
 * @param {string|Element} target - Element ID string or DOM Element
 * @param {string} text - Text content to set
 * @returns {boolean} - Success status
 */
export function safeSetText(target, text) {
  try {
    const element = typeof target === 'string' ? document.getElementById(target) : target;
    if (!element) {
      console.warn(`Element not found: ${target}`);
      return false;
    }
    element.innerText = text;
    return true;
  } catch (error) {
    console.error(`Error setting text: ${error.message}`);
    return false;
  }
}

/**
 * Safely sets the HTML content of an element
 * @param {string|Element} target - Element ID string or DOM Element
 * @param {string} html - HTML content to set
 * @returns {boolean} - Success status
 */
export function safeSetHTML(target, html) {
  try {
    const element = typeof target === 'string' ? document.getElementById(target) : target;
    if (!element) {
      console.warn(`Element not found: ${target}`);
      return false;
    }
    element.innerHTML = html;
    return true;
  } catch (error) {
    console.error(`Error setting HTML: ${error.message}`);
    return false;
  }
}

/**
 * Creates a DOM element with attributes and content
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Element attributes
 * @param {string|Element|Array} children - Child content/elements
 * @returns {Element} - Created DOM element
 */
export function createElement(tag, attributes = {}, children = null) {
  try {
    const element = document.createElement(tag);

    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
      } else {
        element.setAttribute(key, value);
      }
    });

    // Add children
    if (children) {
      if (Array.isArray(children)) {
        children.forEach(child => {
          if (child instanceof Element) {
            element.appendChild(child);
          } else {
            element.appendChild(document.createTextNode(String(child)));
          }
        });
      } else if (children instanceof Element) {
        element.appendChild(children);
      } else {
        element.textContent = String(children);
      }
    }

    return element;
  } catch (error) {
    console.error(`Error creating element: ${error.message}`);
    return document.createElement(tag); // Return bare element as fallback
  }
}

/**
 * Converts degrees to cardinal direction
 * @param {number} deg - Degrees (0-360)
 * @returns {string} - Cardinal direction
 */
export function degreesToCardinal(deg) {
  if (deg === undefined || deg === null) return 'N/A';

  // Ensure deg is between 0-360
  deg = ((deg % 360) + 360) % 360;

  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return directions[Math.floor((deg / 22.5) + 0.5) % 16];
}

/**
 * Formats a date to display string
 * @param {Date|string} date - Date object or date string
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted date string
 */
export function formatDate(date, options = {}) {
  try {
    const dateObj = date instanceof Date ? date : new Date(date);

    const defaultOptions = {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };

    const mergedOptions = { ...defaultOptions, ...options };
    return dateObj.toLocaleString('en-US', mergedOptions);
  } catch (error) {
    console.error(`Error formatting date: ${error.message}`);
    return 'Invalid Date';
  }
}

/**
 * Converts Celsius to Fahrenheit
 * @param {number} celsius - Temperature in Celsius
 * @returns {number} - Temperature in Fahrenheit
 */
export function celsiusToFahrenheit(celsius) {
  if (celsius === null || celsius === undefined || isNaN(celsius)) {
    return null;
  }
  return Math.round((celsius * 9 / 5) + 32);
}

/**
 * Converts meters to miles
 * @param {number} meters - Distance in meters
 * @returns {number} - Distance in miles
 */
export function metersToMiles(meters) {
  if (meters === null || meters === undefined || isNaN(meters)) {
    return null;
  }
  return Math.round(meters * 0.000621371 * 10) / 10; // Round to 1 decimal
}

/**
 * Converts pascals to millibars
 * @param {number} pascals - Pressure in pascals
 * @returns {number} - Pressure in millibars
 */
export function pascalsToMillibars(pascals) {
  if (pascals === null || pascals === undefined || isNaN(pascals)) {
    return null;
  }
  return Math.round(pascals / 100);
}

/**
 * Converts pascals to inches of mercury (inHg)
 * @param {number} pascals - Pressure in pascals
 * @returns {number} - Pressure in inHg
 */
export function pascalsToInHg(pascals) {
  if (pascals === null || pascals === undefined || isNaN(pascals)) {
    return null;
  }
  return Math.round((pascals / 3386.389) * 100) / 100; // Round to 2 decimals
}

/**
 * Throttles a function call
 * @param {Function} func - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Throttled function
 */
export function throttle(func, delay = 300) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return func.apply(this, args);
    }
  };
}

/**
 * Debounces a function call
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Validates API data against expected structure
 * @param {Object} data - API response data
 * @param {Array} requiredProps - Array of required property paths (dot notation)
 * @returns {boolean} - Whether data is valid
 */
export function validateApiData(data, requiredProps = []) {
  try {
    if (!data) return false;

    return requiredProps.every(prop => {
      const props = prop.split('.');
      let value = data;

      for (const p of props) {
        if (value === undefined || value === null || !Object.prototype.hasOwnProperty.call(value, p)) {
          return false;
        }
        value = value[p];
      }

      return true;
    });
  } catch (error) {
    console.error(`Error validating API data: ${error.message}`);
    return false;
  }
}

/**
 * Safely retrieves a deeply nested property from an object
 * @param {Object} obj - Object to retrieve from
 * @param {string} path - Property path (dot notation)
 * @param {*} defaultValue - Default value if property doesn't exist
 * @returns {*} - Property value or default
 */
export function getNestedProperty(obj, path, defaultValue = null) {
  try {
    const props = path.split('.');
    let value = obj;

    for (const prop of props) {
      if (value === undefined || value === null || !Object.prototype.hasOwnProperty.call(value, prop)) {
        return defaultValue;
      }
      value = value[prop];
    }

    return value !== undefined ? value : defaultValue;
  } catch (error) {
    console.error(`Error getting nested property: ${error.message}`);
    return defaultValue;
  }
}

/**
 * Check if the current date is within the Atlantic hurricane season
 * @param {Date} date - Date to check (defaults to current date)
 * @returns {boolean} - Whether date is in hurricane season
 */
export function isDateInHurricaneSeason(date = new Date()) {
  // Get hurricane season dates from site config if available
  const config = window.siteConfig?.tropicalWeather?.season || {
    start: '05-15', // May 15
    end: '11-30'    // November 30
  };

  const year = date.getFullYear();
  const seasonStart = new Date(`${year}-${config.start}`);
  const seasonEnd = new Date(`${year}-${config.end}`);
  
  return date >= seasonStart && date <= seasonEnd;
}

/**
 * Gets appropriate weather icon class based on condition text
 * @param {string} condition - Weather condition text
 * @returns {string} - CSS class or icon name
 */
export function getWeatherIconClass(condition) {
  if (!condition || condition === 'N/A') {
    return 'weather-unknown';
  }
  
  const conditionLower = condition.toLowerCase();
  
  if (conditionLower.includes('thunderstorm') || conditionLower.includes('lightning')) {
    return 'weather-storm';
  } else if (conditionLower.includes('rain') && conditionLower.includes('snow')) {
    return 'weather-mixed';
  } else if (conditionLower.includes('rain') || conditionLower.includes('drizzle') || conditionLower.includes('shower')) {
    return 'weather-rain';
  } else if (conditionLower.includes('snow') || conditionLower.includes('flurr')) {
    return 'weather-snow';
  } else if (conditionLower.includes('sleet') || conditionLower.includes('pellets') || conditionLower.includes('ice')) {
    return 'weather-sleet';
  } else if (conditionLower.includes('fog') || conditionLower.includes('haze') || conditionLower.includes('mist')) {
    return 'weather-fog';
  } else if (conditionLower.includes('cloud')) {
    if (conditionLower.includes('few') || conditionLower.includes('partly')) {
      return 'weather-partly-cloudy';
    } else {
      return 'weather-cloudy';
    }
  } else if (conditionLower.includes('clear') || conditionLower.includes('sunny') || conditionLower.includes('fair')) {
    return 'weather-clear';
  } else {
    return 'weather-default';
  }
}

/**
 * Format a number string with commas for thousands
 * @param {number|string} num - Number to format
 * @returns {string} - Formatted number string
 */
export function formatNumberWithCommas(num) {
  if (num === null || num === undefined) return 'N/A';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export default {
  safeSetText,
  safeSetHTML,
  createElement,
  degreesToCardinal,
  formatDate,
  celsiusToFahrenheit,
  metersToMiles,
  pascalsToMillibars,
  pascalsToInHg,
  throttle,
  debounce,
  validateApiData,
  getNestedProperty,
  isDateInHurricaneSeason,
  getWeatherIconClass,
  formatNumberWithCommas
};