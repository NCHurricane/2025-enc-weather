// =======================
// Beaufort County Radar Module - radar.js
// Simple radar implementation with two dropdowns
//
// It will be replaced with a more robust solution later.
// ========================

class RadarModule {
    constructor() {
        this.stationSelect = null;
        this.productSelect = null;
        this.radarImage = null;
        this.radarTimestamp = null;
        this.loadingDiv = null;
        this.errorDiv = null;
        
        this.localProducts = [
            { value: 'reflectivity-static', text: 'Reflectivity Static' },
            { value: 'reflectivity-loop', text: 'Reflectivity Loop' },
            { value: 'velocity-static', text: 'Velocity Static' },
            { value: 'velocity-loop', text: 'Velocity Loop' }
        ];
        
        this.regionalProducts = [
            { value: 'reflectivity-static', text: 'Reflectivity Static' },
            { value: 'reflectivity-loop', text: 'Reflectivity Loop' }
        ];
    }

    init() {
        this.stationSelect = document.getElementById('radar-station-select');
        this.productSelect = document.getElementById('radar-product-select');
        this.radarImage = document.getElementById('radar-image');
        this.radarTimestamp = document.getElementById('radar-timestamp');
        this.loadingDiv = document.getElementById('radar-loading');
        this.errorDiv = document.getElementById('radar-error');

        if (!this.stationSelect || !this.productSelect || !this.radarImage) {
            console.warn('Radar: Required elements not found');
            return false;
        }

        this.stationSelect.addEventListener('change', () => {
            this.updateProductOptions();
            this.loadRadarImage();
        });

        this.productSelect.addEventListener('change', () => {
            this.loadRadarImage();
        });

        this.updateProductOptions();
        this.loadRadarImage();

        console.log('Radar module initialized');
        return true;
    }

    updateProductOptions() {
        const station = this.stationSelect.value;
        const currentProduct = this.productSelect.value;
        
        this.productSelect.innerHTML = '';
        
        const products = station === 'SOUTHEAST' ? this.regionalProducts : this.localProducts;
        
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.value;
            option.textContent = product.text;
            this.productSelect.appendChild(option);
        });
        
        if (products.some(p => p.value === currentProduct)) {
            this.productSelect.value = currentProduct;
        } else {
            this.productSelect.value = 'reflectivity-static';
        }
    }

    buildRadarUrl() {
        const station = this.stationSelect.value;
        const product = this.productSelect.value;
        
        const baseUrl = 'https://radar.weather.gov/ridge/standard/';
        
        if (station === 'SOUTHEAST') {
            if (product === 'reflectivity-static') {
                return `${baseUrl}SOUTHEAST_0.gif`;
            } else if (product === 'reflectivity-loop') {
                return `${baseUrl}SOUTHEAST_loop.gif`;
            }
        } else {
            if (product === 'reflectivity-static') {
                return `${baseUrl}${station}_0.gif`;
            } else if (product === 'reflectivity-loop') {
                return `${baseUrl}${station}_loop.gif`;
            } else if (product === 'velocity-static') {
                return `${baseUrl}base_velocity/${station}_0.gif`;
            } else if (product === 'velocity-loop') {
                return `${baseUrl}base_velocity/${station}_loop.gif`;
            }
        }
        
        return `${baseUrl}${station}_0.gif`;
    }

    showLoading() {
        if (this.loadingDiv) this.loadingDiv.style.display = 'flex';
        if (this.errorDiv) this.errorDiv.style.display = 'none';
    }

    hideLoading() {
        if (this.loadingDiv) this.loadingDiv.style.display = 'none';
    }

    showError() {
        if (this.errorDiv) this.errorDiv.style.display = 'flex';
        if (this.loadingDiv) this.loadingDiv.style.display = 'none';
    }

    updateTimestamp() {
        if (this.radarTimestamp) {
            const now = new Date();
            this.radarTimestamp.textContent = `Updated: ${now.toLocaleTimeString()}`;
        }
    }

    loadRadarImage() {
        const url = this.buildRadarUrl();
        
        if (!url) {
            this.showError();
            return;
        }

        this.showLoading();

        const img = new Image();
        
        img.onload = () => {
            this.radarImage.src = url;
            this.radarImage.alt = `${this.stationSelect.options[this.stationSelect.selectedIndex].text} ${this.productSelect.options[this.productSelect.selectedIndex].text}`;
            this.hideLoading();
            this.updateTimestamp();
        };

        img.onerror = () => {
            console.error('Failed to load radar image:', url);
            this.showError();
        };

        img.src = url;
    }
}

let radarModule = null;

export function initRadar() {
    if (!radarModule) {
        radarModule = new RadarModule();
    }
    return radarModule.init();
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('radar-station-select')) {
        initRadar();
    }
});