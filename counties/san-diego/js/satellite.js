// San Diego satellite module

class SatelliteModule {
    constructor() {
        this.productSelect = null;
        this.playButton = null;
        this.satelliteImage = null;
        this.satelliteImageContainer = null;
        this.satelliteTimestamp = null;
        this.loadingDiv = null;
        this.errorDiv = null;
        this.isPlaying = false;

        this.sector = 'wus';
        this.satellite = 'GOES18';
        this.cropSettings = {
            static: {
                x: '62%',
                y: '52%',
                width: '205%'
            },
            animated: {
                x: '62%',
                y: '52%',
                width: '220%'
            }
        };
    }

    init() {
        this.productSelect = document.getElementById('satellite-product-select');
        this.playButton = document.getElementById('satellite-play-pause');
        this.satelliteImage = document.getElementById('satellite-image');
        this.satelliteImageContainer = document.getElementById('satellite-image-container');
        this.satelliteTimestamp = document.getElementById('satellite-timestamp');
        this.loadingDiv = document.getElementById('satellite-loading');
        this.errorDiv = document.getElementById('satellite-error');

        if (!this.productSelect || !this.playButton || !this.satelliteImage) {
            console.warn('Satellite: Required elements not found');
            return false;
        }

        this.productSelect.addEventListener('change', () => this.loadSatelliteImage());
        this.playButton.addEventListener('click', () => {
            this.isPlaying = !this.isPlaying;
            this.updatePlayButton();
            this.loadSatelliteImage();
        });

        this.updatePlayButton();
        this.applyCropSettings();
        this.loadSatelliteImage();
        return true;
    }

    buildSatelliteUrl() {
        const product = this.productSelect.value;
        const baseUrl = `https://cdn.star.nesdis.noaa.gov/${this.satellite}/ABI/SECTOR/${this.sector}/${product}/`;

        if (!this.isPlaying) {
            return `${baseUrl}2000x2000.jpg`;
        }

        return `${baseUrl}${this.satellite}-${this.sector.toUpperCase()}-${product}-1000x1000.gif`;
    }

    updatePlayButton() {
        const icon = this.playButton?.querySelector('i');
        if (!icon || !this.playButton) return;

        icon.classList.toggle('fa-play', !this.isPlaying);
        icon.classList.toggle('fa-pause', this.isPlaying);
        this.playButton.setAttribute(
            'aria-label',
            this.isPlaying ? 'Pause satellite animation' : 'Play satellite animation'
        );
        this.playButton.setAttribute('aria-pressed', String(this.isPlaying));
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
        if (!this.satelliteTimestamp) return;

        if (this.isPlaying) {
            this.satelliteTimestamp.textContent = 'Animated Loop';
            return;
        }

        const now = new Date();
        const formatted = now.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        this.satelliteTimestamp.textContent = `${formatted} (latest)`;
    }

    applyCropSettings() {
        if (!this.satelliteImageContainer) return;

        const type = this.isPlaying ? 'animated' : 'static';
        const settings = this.cropSettings[type] || this.cropSettings.static;

        this.satelliteImageContainer.style.setProperty('--satellite-aoi-x', settings.x);
        this.satelliteImageContainer.style.setProperty('--satellite-aoi-y', settings.y);
        this.satelliteImageContainer.style.setProperty('--satellite-offset-x', `-${settings.x}`);
        this.satelliteImageContainer.style.setProperty('--satellite-offset-y', `-${settings.y}`);
        this.satelliteImageContainer.style.setProperty('--satellite-image-width', settings.width);
    }

    loadSatelliteImage() {
        const url = this.buildSatelliteUrl();

        if (!url) {
            this.showError();
            return;
        }

        this.showLoading();
        this.applyCropSettings();

        const img = new Image();
        img.onload = () => {
            this.satelliteImage.src = url;
            const productText = this.productSelect.options[this.productSelect.selectedIndex]?.text || '';
            const typeText = this.isPlaying ? 'Animated Loop' : 'Static';
            this.satelliteImage.alt = `GOES-18 ${productText} ${typeText} - Western US`;
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

let satelliteModule = null;

export function initSatellite() {
    if (!satelliteModule) satelliteModule = new SatelliteModule();
    return satelliteModule.init();
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('satellite-product-select')) initSatellite();
});
