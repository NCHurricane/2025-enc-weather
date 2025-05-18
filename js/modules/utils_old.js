/**
 * Weather App Utility Functions
 * A collection of helper functions for DOM manipulation, weather data processing, and error handling.
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
 * Adds a simple cache with expiration
 * @param {Object} storage - Storage object (localStorage, sessionStorage, or custom)
 * @returns {Object} - Cache methods
 */
export function createCache(storage = window.localStorage) {
    return {
        /**
         * Set a cache item with expiration
         * @param {string} key - Cache key
         * @param {*} value - Value to cache
         * @param {number} ttl - Time to live in seconds
         */
        set(key, value, ttl = 3600) {
            try {
                const item = {
                    value,
                    expiry: Date.now() + (ttl * 1000)
                };
                storage.setItem(key, JSON.stringify(item));
            } catch (error) {
                console.error(`Error setting cache: ${error.message}`);
            }
        },

        /**
         * Get a cache item
         * @param {string} key - Cache key
         * @returns {*} - Cached value or null if expired/missing
         */
        get(key) {
            try {
                const itemStr = storage.getItem(key);
                if (!itemStr) return null;

                const item = JSON.parse(itemStr);
                if (Date.now() > item.expiry) {
                    storage.removeItem(key);
                    return null;
                }

                return item.value;
            } catch (error) {
                console.error(`Error getting cache: ${error.message}`);
                return null;
            }
        },

        /**
         * Remove a cache item
         * @param {string} key - Cache key
         */
        remove(key) {
            try {
                storage.removeItem(key);
            } catch (error) {
                console.error(`Error removing cache: ${error.message}`);
            }
        },

        /**
         * Clear all expired cache items
         */
        clearExpired() {
            try {
                for (let i = 0; i < storage.length; i++) {
                    const key = storage.key(i);
                    if (key && key.startsWith('weather_')) {
                        this.get(key); // This will auto-remove if expired
                    }
                }
            } catch (error) {
                console.error(`Error clearing expired cache: ${error.message}`);
            }
        }
    };
}