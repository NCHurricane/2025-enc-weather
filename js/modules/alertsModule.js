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
      const data = await dataService.getData("alerts", {
        lat: this.lat,
        lon: this.lon,
        county: this.county,
      });

      this.alertsData = {
        alerts: data.features?.map((feature) => feature.properties) || [],
        timestamp: Date.now(),
      };

      this.renderAlerts();
      this.lastUpdateTime = new Date();
    } catch (error) {
      console.error("Error fetching alerts data:", error);
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
   * Filter out expired alerts and remove duplicates
   * @param {Array} alerts - Array of alert objects
   * @returns {Array} - Filtered array of active, unique alerts
   */
  filterActiveAlerts(alerts) {
    if (!Array.isArray(alerts)) {
      return [];
    }

    // First filter out expired alerts
    const activeAlerts = alerts.filter((alert) => this.isAlertActive(alert));

    // Then remove duplicates based on alert ID
    const seenIds = new Set();
    const uniqueAlerts = [];

    for (const alert of activeAlerts) {
      const alertId =
        alert.id || alert.properties?.id || `${alert.event}-${alert.expires}`;

      if (!seenIds.has(alertId)) {
        seenIds.add(alertId);
        uniqueAlerts.push(alert);
      } else {
        console.log(`Removed duplicate alert: ${alertId}`);
      }
    }

    const removedCount = alerts.length - uniqueAlerts.length;
    if (removedCount > 0) {
      console.log(
        `Filtered out ${removedCount} expired/duplicate alerts from ${alerts.length} total`
      );
    }

    return uniqueAlerts;
  }

  /**
   * Render alerts into the DOM
   */
  renderAlerts() {
    const alertsElement = document.getElementById(this.config.alertsElementId);
    if (!alertsElement) return;

    // Get alerts from data and filter out expired/duplicate ones
    const allAlerts = this.alertsData.alerts || [];
    const activeAlerts = this.filterActiveAlerts(allAlerts);

    if (!activeAlerts || activeAlerts.length === 0) {
      alertsElement.innerHTML =
        '<div class="alert"><div class="alert-none"><i class="fa-sharp-duotone fa-solid fa-triangle-exclamation fa-xl fontawesome-icon"></i> <b>No active alerts</b></div></div>';
      return;
    }

    let alertsHTML = "";
    activeAlerts.forEach((alert, index) => {
      // Get event name based on structure
      const eventName =
        alert.properties?.event || alert.event || "Unknown Alert";

      // Get description based on structure
      let description =
        alert.properties?.description ||
        alert.description ||
        "No description available.";

      // Clean up line breaks in description
      description = description.replace(/\r\n/g, "\n");

      const paragraphs = description.split(/\n\s*\n/);
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
      `Rendered ${activeAlerts.length} active alerts (filtered from ${allAlerts.length} total)`
    );
  }

  /**
   * Show loading state for alerts
   */
  showLoadingState() {
    const alertsElement = document.getElementById(this.config.alertsElementId);
    if (!alertsElement) return;

    if (!this.alertsData) {
      alertsElement.innerHTML =
        '<div class="alert"><div class="alert-none"><i class="fa-solid fa-spinner fa-spin fa-xl fontawesome-icon"></i> <b>Loading alerts...</b></div></div>';
    }
  }

  /**
   * Show error state for alerts
   * @param {Error} error - The error that occurred
   */
  showErrorState(error) {
    const alertsElement = document.getElementById(this.config.alertsElementId);
    if (!alertsElement) return;

    if (!this.alertsData) {
      alertsElement.innerHTML = `<div class="alert"><div class="alert-none"><i class="fa-solid fa-triangle-exclamation fa-xl fontawesome-icon"></i> <b>Unable to load alerts</b></div></div>`;
    }
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
