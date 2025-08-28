/**
 * AlertsModule.js
 * Handles fetching, processing, and displaying weather alerts
 */

import dataService from "./dataService.js";
import { safeSetHTML } from "./utils.js";

class AlertsModule {
  constructor(options = {}) {
    // Default configuration
    this.config = {
      // Element ID for alerts container
      alertsElementId: "alerts",

      // Refresh interval - alerts need frequent updates
      refreshInterval: 5 * 60 * 1000, // 5 minutes

      // County zone mapping for alert filtering
      zoneToCountyMap: {
        // Hyde County zones
        NCZ081: "Hyde", // Mainland Hyde
        NCZ204: "Hyde", // Ocracoke Island

        // Dare County zones
        NCZ047: "Dare", // Mainland Dare
        NCZ203: "Dare", // Northern OBX
        NCZ205: "Dare", // Hatteras Island
      },

      // Override with any provided options
      ...options,
    };

    // Module state
    this.alertsData = null;
    this.lastUpdateTime = null;
    this.refreshTimer = null;
  }

  /**
   * Initialize the alerts module
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {string} county - County name
   * @param {Object} preloadedData - Optional preloaded data
   * @returns {Promise<boolean>} - Success status
   */
  async init(lat, lon, county, preloadedData = null) {
    try {
      if (!lat || !lon) {
        console.error("Invalid coordinates provided for alerts");
        return false;
      }

      // Store these for later use
      this.lat = lat;
      this.lon = lon;
      this.county = county;

      // If we have preloaded data, use it
      if (preloadedData) {
        this.alertsData = preloadedData;
        this.renderAlerts();
        this.lastUpdateTime = new Date();
        console.log("Initialized AlertsModule with preloaded data");
      } else {
        // Otherwise fetch fresh data
        await this.fetchAlertsData();
      }

      // Setup refresh timer
      this.startRefreshTimer();

      console.log("AlertsModule initialized successfully");
      return true;
    } catch (error) {
      console.error("Error initializing AlertsModule:", error);
      return false;
    }
  }

  /**
   * Fetch alerts data through the data service
   * @returns {Promise<Object>} - Alerts data
   */
  async fetchAlertsData() {
    try {
      // Show loading state
      this.showLoadingState();

      const data = await dataService.getData("alerts", {
        lat: this.lat,
        lon: this.lon,
        county: this.county,
      });

      // Handle different data structures based on source
      let alertsArray = [];

      if (data) {
        if (Array.isArray(data)) {
          // Direct array of alerts
          alertsArray = data;
        } else if (data.alerts && Array.isArray(data.alerts)) {
          // Cache structure: { alerts: [...] }
          alertsArray = data.alerts;
        } else if (data.features && Array.isArray(data.features)) {
          // NWS API structure: { features: [{ properties: {...} }] }
          alertsArray = data.features.map(
            (feature) => feature.properties || feature
          );
        } else if (data.properties) {
          // Single alert object
          alertsArray = [data.properties || data];
        } else {
          // Unknown structure, log for debugging
          console.warn("Unexpected alerts data structure:", data);
          alertsArray = [];
        }
      }

      // Store the processed data
      this.alertsData = {
        alerts: alertsArray,
        timestamp: Date.now(),
      };

      // Always render, even if empty (will show "No active alerts")
      this.renderAlerts();
      this.lastUpdateTime = new Date();

      console.log(`Processed ${alertsArray.length} alerts for ${this.county}`);
    } catch (error) {
      console.error("Error fetching alerts data:", error);

      // Set empty data on error
      this.alertsData = {
        alerts: [],
        timestamp: Date.now(),
      };

      this.showErrorState(error);
    }
  }

  /**
   * Check if an alert is currently active (not expired)
   * @param {Object} alert - Alert object
   * @returns {boolean} - True if alert is active
   */
  isAlertActive(alert) {
    const expires = alert.expires || alert.properties?.expires;

    if (!expires) {
      // If no expiration date, consider it active
      return true;
    }

    try {
      const expirationTime = new Date(expires);
      const currentTime = new Date();

      // Alert is active if current time is before expiration
      const isActive = currentTime < expirationTime;

      if (!isActive) {
        console.log(
          `Alert expired: ${
            alert.event || alert.properties?.event
          } (expired: ${expires})`
        );
      }

      return isActive;
    } catch (error) {
      // If we can't parse the date, assume it's active to be safe
      console.warn("Error parsing expiration date:", expires, error);
      return true;
    }
  }

  /**
   * Enhanced filterActiveAlerts method with better error handling
   */
  filterActiveAlerts(alerts) {
    // Handle non-array input gracefully
    if (!Array.isArray(alerts)) {
      console.warn(
        "filterActiveAlerts received non-array input:",
        typeof alerts
      );
      return [];
    }

    if (alerts.length === 0) {
      console.log("No alerts to filter");
      return [];
    }

    // First filter out expired alerts
    const activeAlerts = alerts.filter((alert) => {
      try {
        return this.isAlertActive(alert);
      } catch (error) {
        console.warn("Error checking if alert is active:", error);
        return true; // Include alert if we can't determine expiration
      }
    });

    // Then remove duplicates based on alert ID
    const seenIds = new Set();
    const uniqueAlerts = [];

    for (const alert of activeAlerts) {
      try {
        const alertId = this.getAlertId(alert);

        if (!seenIds.has(alertId)) {
          seenIds.add(alertId);
          uniqueAlerts.push(alert);
        } else {
          console.log(`Removed duplicate alert: ${alertId}`);
        }
      } catch (error) {
        console.warn("Error processing alert:", error);
        // Include the alert anyway to avoid losing data
        uniqueAlerts.push(alert);
      }
    }

    const removedCount = alerts.length - uniqueAlerts.length;
    if (removedCount > 0) {
      console.log(
        `Filtered out ${removedCount} expired/duplicate alerts (${uniqueAlerts.length} remaining)`
      );
    }

    return uniqueAlerts;
  }

  /**
   * NEW: Safely generate alert ID for deduplication
   * @param {Object} alert - Alert object
   * @returns {string} - Unique alert identifier
   */
  getAlertId(alert) {
    if (!alert) return `unknown-${Date.now()}`;

    return (
      alert.id ||
      alert.properties?.id ||
      `${this.getAlertEventName(alert)}-${
        alert.expires || alert.properties?.expires || Date.now()
      }`
    );
  }

  /**
   * Render alerts into the DOM
   */
  renderAlerts() {
    const alertsElement = document.getElementById(this.config.alertsElementId);
    if (!alertsElement) {
      console.warn(`Alerts element '${this.config.alertsElementId}' not found`);
      return;
    }

    // Safely get alerts from data
    const allAlerts =
      this.alertsData && this.alertsData.alerts ? this.alertsData.alerts : [];

    // Filter out expired/duplicate ones
    const activeAlerts = this.filterActiveAlerts(allAlerts);

    // Handle empty state
    if (!activeAlerts || activeAlerts.length === 0) {
      alertsElement.innerHTML =
        '<div class="alert">' +
        '<div class="alert-none">' +
        '<i class="fa-sharp-duotone fa-solid fa-circle-check fa-xl fontawesome-icon" style="color: #28a745;"></i> ' +
        "<b>No active alerts</b>" +
        "</div>" +
        "</div>";

      console.log(`No active alerts to display for ${this.county}`);
      return;
    }

    // Render active alerts
    let alertsHTML = "";
    activeAlerts.forEach((alert, index) => {
      // Handle different alert structures safely
      const eventName = this.getAlertEventName(alert);
      const description = this.getAlertDescription(alert);

      // Clean up line breaks in description
      const cleanDescription = description.replace(/\r\n/g, "\n");
      const paragraphs = cleanDescription.split(/\n\s*\n/);
      const formattedDescription = paragraphs
        .map((p) => `<p>${p.replace(/\n/g, " ")}</p>`)
        .join("");

      // Add to HTML
      alertsHTML += `
      <div class="alert">
        <input type="checkbox" id="alert-${index}" class="alert-toggle">
        <label for="alert-${index}" class="alert-title">
          <i class="fa-sharp-duotone fa-solid fa-triangle-exclamation fa-xl fontawesome-icon"></i>
          ${eventName}
        </label>
        <div class="alert-details">
          ${formattedDescription}
        </div>
      </div>
    `;
    });

    alertsElement.innerHTML = alertsHTML;

    // Log for debugging
    console.log(
      `Rendered ${activeAlerts.length} active alerts for ${this.county}`
    );
  }

  /**
   * NEW: Safely extract event name from alert object
   * @param {Object} alert - Alert object with varying structure
   * @returns {string} - Event name or fallback
   */
  getAlertEventName(alert) {
    if (!alert) return "Unknown Alert";

    return (
      alert.event ||
      alert.properties?.event ||
      alert.headline ||
      alert.properties?.headline ||
      "Unknown Alert"
    );
  }

  /**
   * NEW: Safely extract description from alert object
   * @param {Object} alert - Alert object with varying structure
   * @returns {string} - Description or fallback
   */
  getAlertDescription(alert) {
    if (!alert) return "No description available.";

    return (
      alert.description ||
      alert.properties?.description ||
      alert.instruction ||
      alert.properties?.instruction ||
      alert.summary ||
      alert.properties?.summary ||
      "No description available."
    );
  }

  /**
   * Enhanced showLoadingState method
   */
  showLoadingState() {
    const alertsElement = document.getElementById(this.config.alertsElementId);
    if (!alertsElement) return;

    alertsElement.innerHTML =
      '<div class="alert">' +
      '<div class="alert-none">' +
      '<i class="fa-solid fa-spinner fa-spin fa-xl fontawesome-icon"></i> ' +
      "<b>Loading alerts...</b>" +
      "</div>" +
      "</div>";
  }

  /**
   * Enhanced showErrorState method
   */
  showErrorState(error) {
    const alertsElement = document.getElementById(this.config.alertsElementId);
    if (!alertsElement) return;

    alertsElement.innerHTML =
      '<div class="alert">' +
      '<div class="alert-none">' +
      '<i class="fa-solid fa-triangle-exclamation fa-xl fontawesome-icon" style="color: #dc3545;"></i> ' +
      "<b>Unable to load alerts</b>" +
      '<div style="font-size: 0.9em; color: #666; margin-top: 0.5em;">Please try again later</div>' +
      "</div>" +
      "</div>";
  }

  /**
   * Start the refresh timer
   */
  startRefreshTimer() {
    this.stopRefreshTimer();

    this.refreshTimer = setInterval(() => {
      console.log("Auto-refreshing alerts data");
      this.fetchAlertsData();
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
   * Force refresh the alerts data
   * @returns {Promise<boolean>} - Success status
   */
  async refresh() {
    try {
      await this.fetchAlertsData();
      return true;
    } catch (error) {
      console.error("Error refreshing alerts data:", error);
      return false;
    }
  }

  /**
   * Get fallback data when all retrieval methods fail
   * @returns {Object} - Fallback data
   */
  getFallbackData() {
    return {
      alerts: [],
    };
  }

  /**
   * Clean up resources when the module is no longer needed
   */
  destroy() {
    this.stopRefreshTimer();
    this.alertsData = null;
  }
}

export default AlertsModule;
