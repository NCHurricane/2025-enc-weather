/**
 * AlertsModule.js
 * Handles fetching, processing, and displaying weather alerts
 */

import dataService from './dataService.js';
import { safeSetHTML } from './utils.js';

class AlertsModule {
    constructor(options = {}) {
        // Default configuration
        this.config = {
            // Element ID for alerts container
            alertsElementId: 'alerts',

            // Refresh interval - alerts need frequent updates
            refreshInterval: 5 * 60 * 1000, // 5 minutes

            // County zone mapping for alert filtering
            zoneToCountyMap: {
                // Hyde County zones
                'NCZ081': 'Hyde',     // Mainland Hyde
                'NCZ204': 'Hyde',     // Ocracoke Island

                // Dare County zones
                'NCZ047': 'Dare',     // Mainland Dare
                'NCZ203': 'Dare',     // Northern OBX
                'NCZ205': 'Dare',     // Hatteras Island
            },

            // Override with any provided options
            ...options
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
                console.error('Invalid coordinates provided for alerts');
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
                console.log('Initialized AlertsModule with preloaded data');
            } else {
                // Otherwise fetch fresh data
                await this.fetchAlertsData();
            }

            // Setup refresh timer
            this.startRefreshTimer();

            console.log('AlertsModule initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing AlertsModule:', error);
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

            // Fetch data through the data service
            const data = await dataService.getData('alerts', {
                lat: this.lat,
                lon: this.lon,
                county: this.county
            });

            if (!data) {
                throw new Error('No data returned from data service');
            }

            // Store the data
            this.alertsData = data;
            this.lastUpdateTime = new Date();

            // Render alerts display
            this.renderAlerts();

            return data;
        } catch (error) {
            console.error('Error fetching alerts data:', error);

            // Show error state
            this.showErrorState(error);

            // If we have no existing data, use fallback
            if (!this.alertsData) {
                this.alertsData = this.getFallbackData();
                this.renderAlerts();
            }

            return this.alertsData;
        }
    }

    /**
     * Render alerts into the DOM
     */
    renderAlerts() {
        const alertsElement = document.getElementById(this.config.alertsElementId);
        if (!alertsElement) return;

        // Get alerts from data
        const alerts = this.alertsData.alerts || [];

        if (!alerts || alerts.length === 0) {
            alertsElement.innerHTML = '<div class="alert"><div class="alert-none"><i class="fa-sharp-duotone fa-solid fa-triangle-exclamation fa-xl fontawesome-icon"></i> <b>No active alerts</b></div></div>';
            return;
        }

        let alertsHTML = '';
        alerts.forEach((alert, index) => {
            // Get event name based on structure
            const eventName = alert.properties?.event || alert.event || 'Unknown Alert';

            // Get description based on structure
            let description = alert.properties?.description || alert.description || 'No description available.';
            description = description.replace(/\\r\\n/g, "\\n");

            const paragraphs = description.split(/\\n\\s*\\n/);
            const formattedDescription = paragraphs.map(p => `<p>${p.replace(/\\n/g, " ")}</p>`).join("");

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
    }

    /**
     * Show loading state for alerts
     */
    showLoadingState() {
        const alertsElement = document.getElementById(this.config.alertsElementId);
        if (!alertsElement) return;

        if (!this.alertsData) {
            alertsElement.innerHTML = '<div class="alert"><div class="alert-none"><i class="fa-solid fa-spinner fa-spin fa-xl fontawesome-icon"></i> <b>Loading alerts...</b></div></div>';
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
     * Filter alerts to only those affecting this county
     * @param {Array} alerts - Array of alert objects
     * @returns {Array} - Filtered array of alerts
     */
    filterAlertsByCounty(alerts) {
        if (!alerts || !alerts.length) return [];

        return alerts.filter(alert => {
            // Skip if no properties
            if (!alert.properties) return false;

            let matchesOurCounty = false;

            // First check if the county name appears in the affected areas
            if (alert.properties.areaDesc) {
                const countyPattern = new RegExp(`\\b${this.county}\\b`, 'i');
                if (countyPattern.test(alert.properties.areaDesc)) {
                    matchesOurCounty = true;
                }
            }

            // Check if our county's UGC code matches any in the alert
            if (!matchesOurCounty && alert.properties.geocode && alert.properties.geocode.UGC) {
                // Find our county's UGC code
                const countyUGC = this.getCountyUGC(this.county);
                if (countyUGC && alert.properties.geocode.UGC.includes(countyUGC)) {
                    matchesOurCounty = true;
                }
            }

            // Check if our county's zone URL matches any affected zones
            if (!matchesOurCounty && alert.properties.affectedZones) {
                // Find our county's zone URL
                const countyZoneURL = this.getCountyZoneURL(this.county);
                if (countyZoneURL && alert.properties.affectedZones.includes(countyZoneURL)) {
                    matchesOurCounty = true;
                }
            }

            // Return true if any match was found
            return matchesOurCounty;
        });
    }

    /**
     * Get UGC code for a county
     * @param {string} countyName - County name
     * @returns {string|null} - UGC code or null
     */
    getCountyUGC(countyName) {
        const counties = window.siteConfig?.counties || [];
        const county = counties.find(c =>
            c.name.toLowerCase() === countyName.toLowerCase()
        );
        return county?.ugcCode || null;
    }

    /**
     * Get zone URL for a county
     * @param {string} countyName - County name
     * @returns {string|null} - Zone URL or null
     */
    getCountyZoneURL(countyName) {
        const counties = window.siteConfig?.counties || [];
        const county = counties.find(c =>
            c.name.toLowerCase() === countyName.toLowerCase()
        );
        return county?.zoneURL || null;
    }

    /**
     * Start the refresh timer
     */
    startRefreshTimer() {
        this.stopRefreshTimer();

        this.refreshTimer = setInterval(() => {
            console.log('Auto-refreshing alerts data');
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
            console.error('Error refreshing alerts data:', error);
            return false;
        }
    }

    /**
     * Get fallback data when all retrieval methods fail
     * @returns {Object} - Fallback data
     */
    getFallbackData() {
        return {
            alerts: []
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