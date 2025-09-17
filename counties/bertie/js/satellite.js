// ========================
// Bertie County Satellite Module - satellite.js
// Simple satellite implementation with two dropdowns
//
// It will be replaced with a more robust solution later.
// ========================

class SatelliteModule {
    constructor() {
        this.productSelect = null;
        this.typeSelect = null;
        this.satelliteImage = null;
        this.satelliteTimestamp = null;
        this.loadingDiv = null;
        this.errorDiv = null;
        
        // Eastern US sector URLs - NC is center-left, much better positioning
        this.sector = 'eus'; // Eastern US sector
        this.satellite = 'GOES19'; // Using GOES-19 for EUS
    }

    init() {
        // Get DOM elements
        this.productSelect = document.getElementById('satellite-product-select');
        this.typeSelect = document.getElementById('satellite-type-select');
        this.satelliteImage = document.getElementById('satellite-image');
        this.satelliteTimestamp = document.getElementById('satellite-timestamp');
        this.loadingDiv = document.getElementById('satellite-loading');
        this.errorDiv = document.getElementById('satellite-error');

        if (!this.productSelect || !this.typeSelect || !this.satelliteImage) {
            console.warn('Satellite: Required elements not found');
            return false;
        }

        // Add event listeners
        this.productSelect.addEventListener('change', () => {
            this.loadSatelliteImage();
        });

        this.typeSelect.addEventListener('change', () => {
            this.loadSatelliteImage();
        });

        // Initialize with default values
        this.loadSatelliteImage();

        console.log('Satellite module initialized');
        return true;
    }

    buildSatelliteUrl() {
        const product = this.productSelect.value;
        const type = this.typeSelect.value;
        
        const baseUrl = `https://cdn.star.nesdis.noaa.gov/${this.satellite}/ABI/SECTOR/${this.sector}/${product}/`;
        
        if (type === 'static') {
            // Static high-resolution image - using 2000x2000 as specified
            return `${baseUrl}2000x2000.jpg`;
        } else {
            // Animated GIF - EUS typically uses 500x500 for animated
            return `${baseUrl}${this.satellite}-${this.sector.toUpperCase()}-${product}-1000x1000.gif`;
        }
    }

    showLoading() {
        if (this.loadingDiv) this.loadingDiv.style.display = 'flex';
        if (this.errorDiv) this.errorDiv.style.display = 'none';
        // Keep image container visible but loading overlay will cover it
    }

    hideLoading() {
        if (this.loadingDiv) this.loadingDiv.style.display = 'none';
    }

    showError() {
        if (this.errorDiv) this.errorDiv.style.display = 'block';
        if (this.loadingDiv) this.loadingDiv.style.display = 'none';
    }

    updateTimestamp() {
        if (this.satelliteTimestamp) {
            const type = this.typeSelect.value;
            if (type === 'animated') {
                this.satelliteTimestamp.textContent = 'Animated Loop';
            } else {
                const now = new Date();
                const formattedTime = now.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
                this.satelliteTimestamp.textContent = `${formattedTime} (latest)`;
            }
        }
    }

    loadSatelliteImage() {
        const url = this.buildSatelliteUrl();
        
        if (!url) {
            this.showError();
            return;
        }

        this.showLoading();

        // Create a new image to test loading
        const img = new Image();
        
        img.onload = () => {
            // Image loaded successfully
            this.satelliteImage.src = url;
            
            // Update alt text
            const productText = this.productSelect.options[this.productSelect.selectedIndex].text;
            const typeText = this.typeSelect.options[this.typeSelect.selectedIndex].text;
            this.satelliteImage.alt = `GOES-19 ${productText} ${typeText} - Eastern US`;
            
            this.hideLoading();
            this.updateTimestamp();
        };

        img.onerror = () => {
            // Image failed to load
            console.error('Failed to load satellite image:', url);
            this.showError();
        };

        // Start loading
        img.src = url;
    }
}

// Initialize when DOM is ready
let satelliteModule = null;

export function initSatellite() {
    if (!satelliteModule) {
        satelliteModule = new SatelliteModule();
    }
    return satelliteModule.init();
}

// Auto-initialize if satellite elements exist
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('satellite-product-select')) {
        initSatellite();
    }
});