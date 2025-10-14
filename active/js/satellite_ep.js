// =============================
// Satellite Image Module - js/modules/satellite.js
// Handles dynamic loading and display of tropical satellite imagery for various sectors.
// Provides product selection, animation controls, and accessibility features for the satellite viewer UI.
//
// Products handled:
// - "Clean" Enhanced Infrared ABI Band 13
// - GeoColor - ABI Bands 2, 3, 4
// - "Red" Visible - ABI Band 2
// - Upper Level Water Vapor - ABI Band 8
//
// Sectors handled:
// - Tropical Atlantic Wide (taw)
// - North Atlantic (na)
// - Eastern US (eus)
// - Caribbean (car)
// - Gulf of Mexico (ga)
// =============================

export function initSatellite(options = {}) {
    const mod = new SatelliteModule({
        sector: options.sector || 'taw',
        selectorId: options.selectorId || 'tropical-satellite-product-select',
        typeSelectId: options.typeSelectId || 'tropical-satellite-type-select',
        sectorSelectName: options.sectorSelectName || 'satellite-sector',
        playButtonId: options.playButtonId || 'tropical-satellite-play-pause',
        imageId: options.imageId || 'tropical-satellite-image',
        containerId: options.containerId || 'tropical-satellite-image-container',
        loadingId: options.loadingId || 'tropical-satellite-loading',
        errorId: options.errorId || 'tropical-satellite-error',
        timestampId: options.timestampId || 'tropical-satellite-timestamp',
    });
    mod.init();
    return mod;
}

class SatelliteModule {
    constructor(cfg) {
        this.cfg = cfg;
        this.platform = 'GOES18';
        this.isAnimating = false;
        this.currentSector = cfg.sector || 'tpw';

        // Sector configuration
        this.sectors = {
            'tpw': { name: 'Trop Pac', satellite: 'GOES18' },
            'npc': { name: 'N Pac', satellite: 'GOES18' },
            'wus': { name: 'W US', satellite: 'GOES18' },
            'mex': { name: 'Mexico', satellite: 'GOES19' },
            'hi': { name: 'Hawaii', satellite: 'GOES18' }
        };

        this.sel = null;
        this.typeSelect = null;
        this.sectorInputs = null;
        this.btn = null;
        this.img = null;
        this.container = null;
        this.loading = null;
        this.error = null;
        this.timestamp = null;

        this.onProductChange = this.onProductChange.bind(this);
        this.onTypeChange = this.onTypeChange.bind(this);
        this.onSectorChange = this.onSectorChange.bind(this);
        this.onPlayPause = this.onPlayPause.bind(this);
    }

    init() {
        this.sel = document.getElementById(this.cfg.selectorId);
        this.typeSelect = document.getElementById(this.cfg.typeSelectId);
        this.sectorInputs = document.querySelectorAll(`input[name="${this.cfg.sectorSelectName}"]`);
        this.btn = document.getElementById(this.cfg.playButtonId);
        this.img = document.getElementById(this.cfg.imageId);
        this.container = document.getElementById(this.cfg.containerId);
        this.loading = document.getElementById(this.cfg.loadingId);
        this.error = document.getElementById(this.cfg.errorId);
        this.timestamp = document.getElementById(this.cfg.timestampId);

        if (!this.sel || !this.img) {
            console.warn('[satellite] Required elements not found, aborting init');
            return false;
        }

        this.sel.addEventListener('change', this.onProductChange);
        if (this.typeSelect) {
            this.typeSelect.addEventListener('change', this.onTypeChange);
        }
        if (this.sectorInputs.length > 0) {
            this.sectorInputs.forEach(input => {
                input.addEventListener('change', this.onSectorChange);
            });
        }
        if (this.btn) {
            this.btn.addEventListener('click', this.onPlayPause);
        }

        const defaultSectorInput = document.querySelector(`input[name="${this.cfg.sectorSelectName}"][value="${this.cfg.sector}"]`);
        if (defaultSectorInput && !document.querySelector(`input[name="${this.cfg.sectorSelectName}"]:checked`)) {
            defaultSectorInput.checked = true;
        }

        if (this.btn) {
            this.setPlayIcon(false);
        }

        this.updateContainerAspectRatio();

        this.load();

        console.info('[satellite] initialized');
        return true;
    }

    onProductChange() {
        this.load();
    }

    onTypeChange() {
        if (this.typeSelect) {
            this.isAnimating = this.typeSelect.value === 'animated';
            if (this.btn) {
                this.setPlayIcon(this.isAnimating);
            }
        }
        this.load();
    }

    onSectorChange(e) {
        if (e.target.checked) {
            this.currentSector = e.target.value;

            this.isAnimating = false;
            if (this.btn) {
                this.setPlayIcon(false);
            }
            if (this.typeSelect) {
                this.typeSelect.value = 'static';
            }

            this.updateContainerAspectRatio();

            if (typeof window.updateSatelliteActionButton === 'function') {
                window.updateSatelliteActionButton(this.currentSector);
            }

            this.load();
        }
    }

    onPlayPause() {
        this.isAnimating = !this.isAnimating;
        this.setPlayIcon(this.isAnimating);
        if (this.typeSelect) {
            this.typeSelect.value = this.isAnimating ? 'animated' : 'static';
        }
        this.load();
    }

    setPlayIcon(playing) {
        if (!this.btn) return;
        const icon = this.btn.querySelector('i');
        if (!icon) return;
        icon.classList.toggle('fa-play', !playing);
        icon.classList.toggle('fa-pause', playing);
        this.btn.setAttribute(
            'aria-label',
            playing ? 'Pause satellite animation' : 'Play satellite animation'
        );
    }

    updateContainerAspectRatio() {
        if (!this.container || !this.img) return;

        this.img.classList.remove('sector-tpw', 'sector-np', 'sector-wus', 'sector-mex', 'sector-hi');

        this.img.classList.add(`sector-${this.currentSector}`);

        this.container.style.aspectRatio = '';
    }

    urlsFor(product) {
        const sector = this.currentSector.toLowerCase();
        const sectorConfig = this.sectors[sector];
        const satellite = sectorConfig ? sectorConfig.satellite : this.platform;
        const base = `https://cdn.star.nesdis.noaa.gov/${satellite}/ABI/SECTOR/${sector}/${product}/`;

        let staticSize, loopSize;

        switch (sector) {
            case 'tpw': // Tropical Atlantic Wide
                staticSize = '3600x2160';
                loopSize = '900x540';
                break;
            case 'np': // North Pacific
                staticSize = '3600x2160';
                loopSize = '900x540';
                break;
            case 'wus': // Western US
                staticSize = '2000x2000';
                loopSize = '1000x1000';
                break;
            case 'mex': // Mexico
                staticSize = '2000x2000';
                loopSize = '1000x1000';
                break;
            case 'hi': // Hawaii
                staticSize = '2400x2400';
                loopSize = '600x600';
                break;
            default:
                staticSize = '2400x2400';
                loopSize = '1000x1000';
        }

        return {
            static: `${base}${staticSize}.jpg`,
            animated: `${base}${satellite}-${sector.toUpperCase()}-${product}-${loopSize}.gif`,
        };
    }

    showLoading() {
        if (this.loading) this.loading.style.display = 'flex';
        if (this.error) this.error.style.display = 'none';
    }

    hideLoading() {
        if (this.loading) this.loading.style.display = 'none';
    }

    showError() {
        if (this.error) this.error.style.display = 'block';
        if (this.container) this.container.style.display = 'none';
        this.hideLoading();
    }

    showImage() {
        if (this.container) this.container.style.display = 'block';
        if (this.error) this.error.style.display = 'none';
    }

    updateTimestamp() {
        if (!this.timestamp) return;
        const sectorConfig = this.sectors[this.currentSector];
        const sectorName = sectorConfig ? sectorConfig.name : this.currentSector.toUpperCase();

        if (this.isAnimating) {
            this.timestamp.textContent = `${sectorName} - Animated Loop`;
            return;
        }
        const now = new Date();
        const txt = now.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
        this.timestamp.textContent = `${sectorName} - ${txt} (latest)`;
    }

    load() {
        const product = this.sel.value || 'GEOCOLOR';

        if (this.typeSelect) {
            this.isAnimating = this.typeSelect.value === 'animated';
        }

        const { static: staticUrl, animated } = this.urlsFor(product);
        const url = this.isAnimating ? animated : staticUrl;

        this.showLoading();

        const test = new Image();
        test.onload = () => {
            this.img.src = url;

            const productText =
                this.sel.options[this.sel.selectedIndex]?.text || product;
            const sectorConfig = this.sectors[this.currentSector];
            const sectorName = sectorConfig ? sectorConfig.name : this.currentSector.toUpperCase();
            const satellite = sectorConfig ? sectorConfig.satellite : this.platform;
            this.img.alt = `${satellite} ${productText} ${this.isAnimating ? 'Animated' : 'Static'} — ${sectorName}`;

            this.hideLoading();
            this.showImage();
            this.updateTimestamp();
        };
        test.onerror = () => {
            console.error('[satellite] failed to load image:', url);
            this.showError();
        };
        test.src = url;
    }
}
