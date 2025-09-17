// =======================
// Beaufort County Satellite Module - satellite.js
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
        
        this.sector = 'eus';
        this.satellite = 'GOES19';
        
        // County coordinates (Beaufort as default)
        this.lat = 35.57056;
        this.lon = -77.04972;
    }

    init() {
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

        this.productSelect.addEventListener('change', () => {
            this.loadSatelliteImage();
        });

        this.typeSelect.addEventListener('change', () => {
            this.loadSatelliteImage();
        });

        this.loadSatelliteImage();

        console.log('Satellite module initialized');
        return true;
    }

    buildSatelliteUrl() {
        const product = this.productSelect.value;
        const type = this.typeSelect.value;

        const baseUrl = `https://cdn.star.nesdis.noaa.gov/${this.satellite}/ABI/SECTOR/${this.sector}/${product}/`;

        if (type === 'static') {
            return `${baseUrl}2000x2000.jpg`;
        } else if (type === 'animated') {
            return `${baseUrl}${this.satellite}-${this.sector.toUpperCase()}-${product}-1000x1000.gif`;
        } else {
            return null;
        }
    }

    showLoading() {
        if (this.loadingDiv) this.loadingDiv.style.display = 'flex';
        if (this.errorDiv) this.errorDiv.style.display = 'none';
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
            const img = new Image();
            img.onload = () => {
                this.satelliteImage.src = url;
                this.satelliteImage.alt = `Animated Satellite Loop`;
                this.hideLoading();
                this.updateTimestamp();
            };

            img.onerror = () => {
                console.error('Failed to load animated satellite image:', url);
                this.showError();
            };

            img.src = url;
        } else {
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

let satelliteModule = null;

export function initSatellite() {
    if (!satelliteModule) {
        satelliteModule = new SatelliteModule();
    }
    return satelliteModule.init();
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('satellite-product-select')) {
        initSatellite();
    }
});