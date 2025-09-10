// counties/bertie/js/satellite.js
// Simple satellite implementation with CSS cropping for NC region

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
        
        // County coordinates (Beaufort)
        this.lat = 35.57056;
        this.lon = -77.04972;
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
        
        if (type === 'animated') {
            // Use custom loop from PHP script
            const product = this.productSelect.value;
            return `../../active/api/satellite_loop.php?lat=${this.lat}&lon=${this.lon}&type=county&id=beaufort&product=${product}`;
        }
        
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
        const type = this.typeSelect.value;
        
        if (!url) {
            this.showError();
            return;
        }

        this.showLoading();

        if (type === 'animated') {
            // Fetch JSON from PHP script
            fetch(url)
                .then(response => response.json())
                .then(data => {
                    if (data.url) {
                        this.satelliteImage.src = data.url;
                        this.satelliteImage.alt = `Custom Satellite Loop`;
                        this.hideLoading();
                        this.updateTimestamp();
                    } else {
                        console.error('No URL in response:', data);
                        this.showError();
                    }
                })
                .catch(error => {
                    console.error('Failed to fetch satellite loop:', error);
                    this.showError();
                });
        } else {
            // Static image
            const img = new Image();
            
            img.onload = () => {
                this.satelliteImage.src = url;
                
                const productText = this.productSelect.options[this.productSelect.selectedIndex].text;
                this.satelliteImage.alt = `GOES-19 ${productText} Static - Eastern US`;
                
                this.hideLoading();
                this.updateTimestamp();
            };

            img.onerror = () => {
                console.error('Failed to load satellite image:', url);
                this.showError();
            };

            img.src = url;
        }
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