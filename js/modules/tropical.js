/**
 * Tropical Weather Module
 * Handles tropical weather forecasts and displays
 */

import { isDateInHurricaneSeason } from './weatherData.js';
import { formatDate } from './utils.js';
// Initialize tropical satellite with TAW sector
import { initSatellite } from './satellite.js';

// DOM elements that will be used
let twoTextContent = null;
let twoSpanishContent = null;
let discussionContent = null;
let twoTextTimestamp = null;
let twoSpanishTimestamp = null;
let discussionTimestamp = null;

/**
 * Initialize when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function () {
    // Initialize satellite imagery
    initTropicalSatellite();

    // Initialize text products
    initTextProducts();

    // Initialize graphics timestamps
    updateGraphicsTimestamps();

    // Set up refresh button
    setupRefreshButton();

    // Set up tab handling
    setupTabHandling();
});

/**
 * Initialize tropical satellite display
 */
function initTropicalSatellite() {
    initSatellite({
        sector: 'taw',
        containerId: 'tropical-satellite-image-container',
        imageId: 'tropical-satellite-image',
        loadingId: 'tropical-satellite-loading',
        errorId: 'tropical-satellite-error',
        timestampId: 'tropical-satellite-timestamp',
        playButtonId: 'tropical-satellite-play-pause',
        selectorId: 'tropical-satellite-product-select'
    });
}

/**
 * Initialize text products - load cached data
 */
function initTextProducts() {
    // Cache DOM elements
    twoTextContent = document.getElementById('two-text-content');
    twoSpanishContent = document.getElementById('two-spanish-content');
    discussionContent = document.getElementById('discussion-content');
    twoTextTimestamp = document.getElementById('two-text-timestamp');
    twoSpanishTimestamp = document.getElementById('two-spanish-timestamp');
    discussionTimestamp = document.getElementById('discussion-timestamp');

    // Load each product
    loadTropicalWeatherOutlook();
    loadTropicalWeatherOutlookSpanish();
    loadTropicalDiscussion();
}

/**
 * Load Tropical Weather Outlook text
 */
function loadTropicalWeatherOutlook() {
    const loadingElement = document.getElementById('two-text-loading');
    const errorElement = document.getElementById('two-text-error');

    if (loadingElement) loadingElement.style.display = 'block';
    if (errorElement) errorElement.style.display = 'none';
    if (twoTextContent) twoTextContent.style.display = 'none';

    fetch('js/modules/cache/tropical_two_at.json?t=' + Date.now())
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            renderTwoText(data);
            if (loadingElement) loadingElement.style.display = 'none';
            if (twoTextContent) twoTextContent.style.display = 'block';
        })
        .catch(error => {
            console.error('Error loading TWO text:', error);
            if (loadingElement) loadingElement.style.display = 'none';
            if (errorElement) errorElement.style.display = 'block';
        });
}

/**
 * Load Tropical Weather Outlook text in Spanish
 */
function loadTropicalWeatherOutlookSpanish() {
    const loadingElement = document.getElementById('two-spanish-loading');
    const errorElement = document.getElementById('two-spanish-error');

    if (loadingElement) loadingElement.style.display = 'block';
    if (errorElement) errorElement.style.display = 'none';
    if (twoSpanishContent) twoSpanishContent.style.display = 'none';

    fetch('js/modules/cache/tropical_two_sat.json?t=' + Date.now())
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            renderTwoSpanishText(data);
            if (loadingElement) loadingElement.style.display = 'none';
            if (twoSpanishContent) twoSpanishContent.style.display = 'block';
        })
        .catch(error => {
            console.error('Error loading TWO Spanish text:', error);
            if (loadingElement) loadingElement.style.display = 'none';
            if (errorElement) errorElement.style.display = 'block';
        });
}

/**
 * Load Tropical Weather Discussion text
 */
function loadTropicalDiscussion() {
    const loadingElement = document.getElementById('discussion-loading');
    const errorElement = document.getElementById('discussion-error');

    if (loadingElement) loadingElement.style.display = 'block';
    if (errorElement) errorElement.style.display = 'none';
    if (discussionContent) discussionContent.style.display = 'none';

    fetch('js/modules/cache/tropical_disc_at.json?t=' + Date.now())
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            renderDiscussionText(data);
            if (loadingElement) loadingElement.style.display = 'none';
            if (discussionContent) discussionContent.style.display = 'block';
        })
        .catch(error => {
            console.error('Error loading Tropical Discussion text:', error);
            if (loadingElement) loadingElement.style.display = 'none';
            if (errorElement) errorElement.style.display = 'block';
        });
}

/**
 * Render TWO text content
 * @param {Object} data - The TWO data object
 */
function renderTwoText(data) {
    if (!twoTextContent || !data) return;

    let html = '<h3>Atlantic Tropical Weather Outlook</h3>';

    if (data.outlooks && data.outlooks.length > 0) {
        data.outlooks.forEach(outlook => {
            html += `<div class="outlook-section">`;
            html += `<h4>${outlook.timeframe}</h4>`;
            html += `<p>${outlook.text}</p>`;

            if (outlook.areas && outlook.areas.length > 0) {
                outlook.areas.forEach(area => {
                    html += `<div class="disturbance-area">`;
                    html += `<p><strong>Area ${area.id}:</strong> ${area.location}</p>`;
                    html += `<p>${area.text}</p>`;
                    html += `<p><strong>Formation Chance:</strong><br>`;
                    html += `48-Hour: ${area.formation_chance['48hour']}<br>`;
                    html += `5-Day: ${area.formation_chance['5day']}</p>`;
                    html += `</div>`;
                });
            } else {
                html += `<p><em>No disturbances currently being monitored.</em></p>`;
            }

            html += `</div>`;
        });
    } else {
        html += `<p>No tropical weather outlook data available.</p>`;
    }

    twoTextContent.innerHTML = html;

    // Update timestamp
    if (twoTextTimestamp && data.issueTime) {
        const date = new Date(data.issueTime);
        twoTextTimestamp.textContent = `Last Updated: ${formatDate(date)}`;
    }
}

/**
 * Render TWO Spanish text content
 * @param {Object} data - The TWO Spanish data object
 */
function renderTwoSpanishText(data) {
    if (!twoSpanishContent || !data) return;

    let html = '<h3>Perspectiva del Tiempo Tropical del Atlántico</h3>';

    if (data.outlooks && data.outlooks.length > 0) {
        data.outlooks.forEach(outlook => {
            html += `<div class="outlook-section">`;
            html += `<h4>${outlook.timeframe}</h4>`;
            html += `<p>${outlook.text}</p>`;

            if (outlook.areas && outlook.areas.length > 0) {
                outlook.areas.forEach(area => {
                    html += `<div class="disturbance-area">`;
                    html += `<p><strong>Área ${area.id}:</strong> ${area.location}</p>`;
                    html += `<p>${area.text}</p>`;
                    html += `<p><strong>Probabilidad de Formación:</strong><br>`;
                    html += `48 Horas: ${area.formation_chance['48hour']}<br>`;
                    html += `5 Días: ${area.formation_chance['5day']}</p>`;
                    html += `</div>`;
                });
            } else {
                html += `<p><em>No hay perturbaciones bajo vigilancia actualmente.</em></p>`;
            }

            html += `</div>`;
        });
    } else {
        html += `<p>No hay datos disponibles de la perspectiva del tiempo tropical.</p>`;
    }

    twoSpanishContent.innerHTML = html;

    // Update timestamp
    if (twoSpanishTimestamp && data.issueTime) {
        const date = new Date(data.issueTime);
        twoSpanishTimestamp.textContent = `Última Actualización: ${formatDate(date)}`;
    }
}

/**
 * Render Tropical Discussion text content
 * @param {Object} data - The Tropical Discussion data object
 */
function renderDiscussionText(data) {
    if (!discussionContent || !data) return;

    let html = '<h3>Tropical Weather Discussion</h3>';

    if (data.discussion) {
        html += data.discussion;
    } else {
        html += `<p>No tropical weather discussion data available.</p>`;
    }

    discussionContent.innerHTML = html;

    // Update timestamp
    if (discussionTimestamp && data.issueTime) {
        const date = new Date(data.issueTime);
        discussionTimestamp.textContent = `Last Updated: ${formatDate(date)}`;
    }
}

/**
 * Update timestamps for graphics images
 */
function updateGraphicsTimestamps() {
    const now = new Date();
    const formattedTime = formatDate(now);

    // Current activity timestamp
    const currentActivityTimestamp = document.getElementById('current-activity-timestamp');
    if (currentActivityTimestamp) {
        currentActivityTimestamp.textContent = `Last Retrieved: ${formattedTime}`;
    }

    // Two-day outlook timestamp
    const twoDayTimestamp = document.getElementById('two-day-timestamp');
    if (twoDayTimestamp) {
        twoDayTimestamp.textContent = `Last Retrieved: ${formattedTime}`;
    }

    // Seven-day outlook timestamp
    const sevenDayTimestamp = document.getElementById('seven-day-timestamp');
    if (sevenDayTimestamp) {
        sevenDayTimestamp.textContent = `Last Retrieved: ${formattedTime}`;
    }

    // Surface analysis timestamp
    const surfaceTimestamp = document.getElementById('surface-timestamp');
    if (surfaceTimestamp) {
        surfaceTimestamp.textContent = `Last Retrieved: ${formattedTime}`;
    }
}

/**
 * Set up refresh button functionality
 */
function setupRefreshButton() {
    const refreshButton = document.getElementById('global-refresh');
    if (refreshButton) {
        refreshButton.addEventListener('click', function () {
            this.classList.add('refreshing');

            // Refresh text products
            loadTropicalWeatherOutlook();
            loadTropicalWeatherOutlookSpanish();
            loadTropicalDiscussion();

            // Refresh graphics by forcing a reload
            const images = [
                document.getElementById('current-activity-img'),
                document.getElementById('two-day-img'),
                document.getElementById('seven-day-img'),
                document.getElementById('surface-img')
            ];

            images.forEach(img => {
                if (img) {
                    const originalSrc = img.src;
                    img.src = originalSrc + '?t=' + Date.now();
                }
            });

            // Update graphics timestamps
            updateGraphicsTimestamps();

            // Remove refreshing class after animation
            setTimeout(() => {
                this.classList.remove('refreshing');
            }, 2000);
        });
    }
}

/**
 * Set up tab handling
 */
function setupTabHandling() {
    // Graphics tabs
    const graphicsTabs = document.querySelectorAll('input[name="graphicsTab"]');
    const graphicsPanels = document.querySelectorAll('.tropical-graphics-panel');

    graphicsTabs.forEach(tab => {
        tab.addEventListener('change', function () {
            graphicsPanels.forEach(panel => {
                panel.style.display = 'none';
            });

            const panelId = this.id.replace('graphics-', '') + '-panel';
            const activePanel = document.getElementById(panelId);
            if (activePanel) {
                activePanel.style.display = 'block';
            }
        });
    });

    // Text tabs
    const textTabs = document.querySelectorAll('input[name="textTab"]');
    const textPanels = document.querySelectorAll('.tropical-text-panel');

    textTabs.forEach(tab => {
        tab.addEventListener('change', function () {
            textPanels.forEach(panel => {
                panel.style.display = 'none';
            });

            const panelId = this.id.replace('text-', '') + '-panel';
            const activePanel = document.getElementById(panelId);
            if (activePanel) {
                activePanel.style.display = 'block';
            }
        });
    });
}

// Export functions that might be needed elsewhere
export {
    loadTropicalWeatherOutlook,
    loadTropicalWeatherOutlookSpanish,
    loadTropicalDiscussion,
    updateGraphicsTimestamps
};