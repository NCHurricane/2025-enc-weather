/**
 * Tropical Weather Module
 * Handles tropical weather forecasts and displays
 */

import { isDateInHurricaneSeason } from './weatherData.js';
import { formatDate } from './utils.js';

/**
 * Update the tropical weather outlook section
 * @param {string} containerId - ID of the container element to update
 */
export function updateTropicalOutlook(containerId = 'tropical-outlook') {
    const tropicalDiv = document.getElementById(containerId);
    if (!tropicalDiv) return;
    
    if (isDateInHurricaneSeason()) {
        // Active hurricane season - show current outlook
        updateActiveSeasonDisplay(tropicalDiv);
    } else {
        // Off-season - show previous season summary
        updateOffSeasonDisplay(tropicalDiv);
    }
}

/**
 * Update display for active hurricane season
 * @param {HTMLElement} container - Container element
 */
function updateActiveSeasonDisplay(container) {
    const config = window.siteConfig.tropicalWeather;
    const outfitlGraphic = config.graphics.atlanticOutlook;
    
    // Get current date for display
    const now = new Date();
    const formattedDate = formatDate(now, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: undefined,
        minute: undefined
    });
    
    container.innerHTML = `
        <h3>Current Tropical Outlook</h3>
        <p>Atlantic hurricane season is active (May 15 - November 30)</p>
        <p><small>As of ${formattedDate}</small></p>
        <img src="${outfitlGraphic}" 
             alt="NHC 5-Day Tropical Weather Outlook" 
             title="5-Day Tropical Weather Outlook">
        <p>Source: <a href="https://www.nhc.noaa.gov/" target="_blank">National Hurricane Center</a></p>
    `;
}

/**
 * Update display for off-season
 * @param {HTMLElement} container - Container element
 */
function updateOffSeasonDisplay(container) {
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;
    
    container.innerHTML = `
        <h3>Previous Hurricane Season (${lastYear})</h3>
        <p>The ${lastYear} Atlantic hurricane season is now closed. New season begins May 15, ${currentYear}.</p>
        <img src="images/tropical/previous_season_summary.jpg" 
             alt="${lastYear} Atlantic Hurricane Season Summary" 
             title="${lastYear} Hurricane Season Summary">
        <p>Prepare for the upcoming season! Review evacuation routes and emergency plans.</p>
    `;
}

/**
 * Check for active tropical systems
 * @returns {Promise<boolean>} Whether there are active systems
 */
export async function checkActiveSystemsStatus() {
    if (!isDateInHurricaneSeason()) {
        return false;
    }
    
    try {
        // This would typically involve fetching data from NHC API
        // For demonstration purposes, we'll just check if their page has "active" systems
        const response = await fetch('https://www.nhc.noaa.gov/');
        const text = await response.text();
        
        // Check if there's any mention of active systems
        // This is a simplified approach and would need to be more robust in production
        return text.includes('Active Cyclones') && !text.includes('No Active Cyclones');
    } catch (error) {
        console.error('Error checking tropical system status:', error);
        return false;
    }
}

/**
 * Add alert banner for active tropical systems
 * @param {boolean} isActive - Whether there are active systems
 */
export function updateTropicalAlertBanner(isActive) {
    // Don't show banner if user dismissed it this session
    if (sessionStorage.getItem('hideTropicalBanner') === 'true') {
        return;
    }
    
    // Remove existing banner if any
    const existingBanner = document.getElementById('tropical-alert-banner');
    if (existingBanner) {
        existingBanner.remove();
    }
    
    // If active systems, add a new banner
    if (isActive) {
        const banner = document.createElement('div');
        banner.id = 'tropical-alert-banner';
        banner.className = 'tropical-alert-banner';
        banner.innerHTML = `
            <i class="fa-solid fa-hurricane"></i>
            <span>Active tropical systems in the Atlantic basin. <a href="tropical.html">View details</a></span>
            <button class="close-button" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        `;
        
        document.body.insertBefore(banner, document.body.firstChild);
        document.body.classList.add('has-alert-banner');
        
        // Add close button functionality
        const closeButton = banner.querySelector('.close-button');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                banner.remove();
                document.body.classList.remove('has-alert-banner');
                // Store preference in session storage
                sessionStorage.setItem('hideTropicalBanner', 'true');
            });
        }
    }
}