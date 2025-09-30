// =============================
// Satellite Module - active/js/satellite.js
// Handles dynamic loading and display of storm floater satellite imagery for active storms.
// Provides tabbed product selection, animation controls, and accessibility features for the satellite viewer UI.
// Products handled:
// - "Clean" Enhanced Infrared ABI Band 13
// - GeoColor - ABI Bands 2, 3, 4
// - "Red" Visible - ABI Band 2
// - Upper Level Water Vapor - ABI Band 8
// =============================


function getStormParam() {
    const p = new URLSearchParams(location.search);
    return (p.get("storm") || "").trim().toUpperCase();
}

export function initSatellite(options = {}) {
    const mod = new SatelliteModule({
        product: options.product || '13',
        tabsContainerId: options.tabsContainerId || 'active-satellite-product-tabs',
        playButtonId: options.playButtonId || 'active-satellite-play-pause',
        imageId: options.imageId || 'active-satellite-image',
        containerId: options.containerId || 'active-satellite-image-container',
        loadingId: options.loadingId || 'active-satellite-loading',
        errorId: options.errorId || 'active-satellite-error',
        timestampId: options.timestampId || 'active-satellite-timestamp',
    });
    mod.init();
    return mod;
}

class SatelliteModule {
    constructor(cfg) {
        this.cfg = cfg;
        this.stormId = getStormParam();
        this.platform = 'GOES19'; // Atlantic imagery
        this.isAnimating = false;
        this.currentProduct = cfg.product || '13';

        this.products = {
            '13': { name: 'Clean IR' },
            'GEOCOLOR': { name: 'GeoColor' },
            '02': { name: 'Visible' },
            '08': { name: 'W Vapor' },
        };

        // DOM refs
        this.tabsContainer = null;
        this.btn = null;
        this.img = null;
        this.container = null;
        this.loading = null;
        this.error = null;
        this.timestamp = null;

        this.onPlayPause = this.onPlayPause.bind(this);
    }

    init() {
        this.tabsContainer = document.getElementById(this.cfg.tabsContainerId);
        this.btn = document.getElementById(this.cfg.playButtonId);
        this.img = document.getElementById(this.cfg.imageId);
        this.container = document.getElementById(this.cfg.containerId);
        this.loading = document.getElementById(this.cfg.loadingId);
        this.error = document.getElementById(this.cfg.errorId);
        this.timestamp = document.getElementById(this.cfg.timestampId);

        if (!this.stormId) {
            console.warn('[active-satellite] No storm ID found in URL, aborting init.');
            const container = document.getElementById(this.cfg.containerId);
            if (container) container.style.display = 'none';
            return false;
        }

        if (!this.tabsContainer || !this.img || !this.btn) {
            console.warn('[active-satellite] Required elements not found, aborting init');
            return false;
        }

        this.createTabs();

        if (this.btn) {
            this.btn.addEventListener('click', this.onPlayPause);
        }

        if (this.btn) {
            this.setPlayIcon(false);
        }

        this.updateContainerUI();
        this.load();

        console.info('[active-satellite] initialized');
        return true;
    }

    createTabs() {
        this.tabsContainer.innerHTML = '';
        Object.keys(this.products).forEach(productId => {
            const product = this.products[productId];
            const tab = document.createElement('button');
            tab.className = 'active-satellite-tab';
            tab.textContent = product.name;
            tab.dataset.productId = productId;
            if (productId === this.currentProduct) {
                tab.classList.add('active');
            }
            tab.addEventListener('click', () => this.onProductChange(productId));
            this.tabsContainer.appendChild(tab);
        });
    }

    onProductChange(productId) {
        this.currentProduct = productId;
        this.isAnimating = false;
        this.setPlayIcon(false);
        this.updateActiveTab();
        this.load();
    }

    updateActiveTab() {
        const tabs = this.tabsContainer.querySelectorAll('.active-satellite-tab');
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.productId === this.currentProduct);
        });
    }

    onPlayPause() {
        this.isAnimating = !this.isAnimating;
        this.setPlayIcon(this.isAnimating);
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

    updateContainerUI() {
        if (!this.container || !this.img) return;
        this.container.style.aspectRatio = '16 / 9';
    }

    urlsFor(product) {
        const abi = product;
        const stormIdUpper = this.stormId.toUpperCase();
        const floaterBase = `https://cdn.star.nesdis.noaa.gov/FLOATER/${stormIdUpper}`;

        return {
            static: `${floaterBase}/${abi}/1000x1000.jpg`,
            animated: `${floaterBase}/${abi}/${stormIdUpper}-${abi}-1000x1000.gif`,
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
        const productConfig = this.products[this.currentProduct];
        const sectorName = productConfig ? productConfig.name : this.currentProduct.toUpperCase();

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
        const product = this.currentProduct;

        const { static: staticUrl, animated } = this.urlsFor(product);
        const url = this.isAnimating ? animated : staticUrl;

        this.showLoading();

        const test = new Image();
        test.onload = () => {
            this.img.src = url;

            const productConfig = this.products[this.currentProduct];
            const productName = productConfig ? productConfig.name : this.currentProduct.toUpperCase();
            this.img.alt = `${this.platform} ${productName} ${this.isAnimating ? 'Animated' : 'Static'} — ${this.stormId} Floater`;

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
