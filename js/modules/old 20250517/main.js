/**
 * main.js
 * Entry point for the weather application
 */

import { initWeatherApp, refreshAll, clearCache } from './weatherApp.js';
import { 
  degreesToCardinal,
  formatDate,
  celsiusToFahrenheit,
  metersToMiles,
  pascalsToMillibars,
  pascalsToInHg,
  safeSetText,
  safeSetHTML,
  createElement,
  validateApiData,
  getNestedProperty,
  isDateInHurricaneSeason
} from './utils.js';

/**
 * Initialize when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the weather app with configuration from window.weatherConfig
  initWeatherApp(window.weatherConfig || {});
});

// Export utility functions for use in other modules
export {
  // Core app functions
  initWeatherApp,
  refreshAll,
  clearCache,
  
  // Utils functions
  degreesToCardinal,
  formatDate,
  celsiusToFahrenheit,
  metersToMiles,
  pascalsToMillibars,
  pascalsToInHg,
  safeSetText,
  safeSetHTML,
  createElement,
  validateApiData,
  getNestedProperty,
  isDateInHurricaneSeason
};