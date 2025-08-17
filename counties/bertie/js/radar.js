// counties/bertie/js/radar.js
// Simple radar implementation with two dropdowns

class RadarModule {
    constructor() {
        this.stationSelect = null;
        this.productSelect = null;
        this.radarImage = null;
        this.radarTimestamp = null;
        this.loadingDiv = null;
        this.errorDiv = null;
        
        // Product options for different station types
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
        // Get DOM elements
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

        // Add event listeners
        this.stationSelect.addEventListener('change', () => {
            this.updateProductOptions();
            this.loadRadarImage();
        });

        this.productSelect.addEventListener('change', () => {
            this.loadRadarImage();
        });

        // Initialize with default values
        this.updateProductOptions();
        this.loadRadarImage();

        console.log('Radar module initialized');
        return true;
    }

    updateProductOptions() {
        const station = this.stationSelect.value;
        const currentProduct = this.productSelect.value;
        
        // Clear existing options
        this.productSelect.innerHTML = '';
        
        // Get available products for this station type
        const products = station === 'SOUTHEAST' ? this.regionalProducts : this.localProducts;
        
        // Add options
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.value;
            option.textContent = product.text;
            this.productSelect.appendChild(option);
        });
        
        // Try to maintain current selection if available
        if (products.some(p => p.value === currentProduct)) {
            this.productSelect.value = currentProduct;
        } else {
            // Default to reflectivity static if current selection not available
            this.productSelect.value = 'reflectivity-static';
        }
    }

    buildRadarUrl() {
        const station = this.stationSelect.value;
        const product = this.productSelect.value;
        
        const baseUrl = 'https://radar.weather.gov/ridge/standard/';
        
        // Handle regional vs local stations
        if (station === 'SOUTHEAST') {
            // Regional only has reflectivity
            if (product === 'reflectivity-static') {
                return `${baseUrl}SOUTHEAST_0.gif`;
            } else if (product === 'reflectivity-loop') {
                return `${baseUrl}SOUTHEAST_loop.gif`;
            }
        } else {
            // Local stations
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
        
        // Fallback
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

        // Create a new image to test loading
        const img = new Image();
        
        img.onload = () => {
            // Image loaded successfully
            this.radarImage.src = url;
            this.radarImage.alt = `${this.stationSelect.options[this.stationSelect.selectedIndex].text} ${this.productSelect.options[this.productSelect.selectedIndex].text}`;
            this.hideLoading();
            this.updateTimestamp();
        };

        img.onerror = () => {
            // Image failed to load
            console.error('Failed to load radar image:', url);
            this.showError();
        };

        // Start loading
        img.src = url;
    }
}

// Initialize when DOM is ready
let radarModule = null;

export function initRadar() {
    if (!radarModule) {
        radarModule = new RadarModule();
    }
    return radarModule.init();
}

// Auto-initialize if radar elements exist
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('radar-station-select')) {
        initRadar();
    }
});