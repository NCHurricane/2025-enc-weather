// =======================
// Shared County Radar Module - radar.js
// Station/product selectors with a dedicated animation control.
//
// It will be replaced with a more robust solution later.
// ========================

class RadarModule {
    constructor() {
        this.stationSelect = null;
        this.productSelect = null;
        this.playButton = null;
        this.radarImage = null;
        this.radarTimestamp = null;
        this.loadingDiv = null;
        this.errorDiv = null;
        this.initialized = false;
        this.hasLoaded = false;
        this.isPlaying = false;
        
        this.localProducts = [
            { value: 'reflectivity', text: 'Reflectivity' },
            { value: 'velocity', text: 'Velocity' }
        ];
        
        this.regionalProducts = [
            { value: 'reflectivity', text: 'Reflectivity' }
        ];
    }

    init() {
        if (this.initialized) return true;
        this.stationSelect = document.getElementById('radar-station-select');
        this.productSelect = document.getElementById('radar-product-select');
        this.playButton = document.getElementById('radar-play-pause');
        this.radarImage = document.getElementById('radar-image');
        this.radarTimestamp = document.getElementById('radar-timestamp');
        this.loadingDiv = document.getElementById('radar-loading');
        this.errorDiv = document.getElementById('radar-error');

        if (!this.stationSelect || !this.productSelect || !this.playButton || !this.radarImage) {
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

        this.playButton.addEventListener('click', () => {
            this.isPlaying = !this.isPlaying;
            this.updatePlayButton();
            this.loadRadarImage();
        });

        this.updateProductOptions();
        this.updatePlayButton();
        this.initialized = true;
        const accordion = document.getElementById('radar-toggle');
        const loadWhenVisible = () => {
            if (accordion?.checked && !this.hasLoaded) this.loadRadarImage();
        };
        accordion?.addEventListener('change', loadWhenVisible);
        if (!accordion || accordion.checked) this.loadRadarImage();

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
            this.productSelect.value = 'reflectivity';
        }
    }

    updatePlayButton() {
        const icon = this.playButton?.querySelector('i');
        if (!icon || !this.playButton) return;

        icon.classList.toggle('fa-play', !this.isPlaying);
        icon.classList.toggle('fa-pause', this.isPlaying);
        this.playButton.setAttribute(
            'aria-label',
            this.isPlaying ? 'Pause radar animation' : 'Play radar animation'
        );
        this.playButton.setAttribute('aria-pressed', String(this.isPlaying));
    }

    buildRadarUrl() {
        const station = this.stationSelect.value;
        const product = this.productSelect.value;
        
        const baseUrl = 'https://radar.weather.gov/ridge/standard/';
        const suffix = this.isPlaying ? 'loop' : '0';
        
        if (station === 'SOUTHEAST') {
            return `${baseUrl}SOUTHEAST_${suffix}.gif`;
        }

        if (product === 'velocity') {
            return `${baseUrl}base_velocity/${station}_${suffix}.gif`;
        }
        
        return `${baseUrl}${station}_${suffix}.gif`;
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
        this.hasLoaded = true;
        const url = this.buildRadarUrl();
        
        if (!url) {
            this.showError();
            return;
        }

        this.showLoading();

        const img = new Image();
        
        img.onload = () => {
            this.radarImage.src = url;
            const animationText = this.isPlaying ? 'animated loop' : 'static image';
            this.radarImage.alt = `${this.stationSelect.options[this.stationSelect.selectedIndex].text} ${this.productSelect.options[this.productSelect.selectedIndex].text} ${animationText}`;
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
