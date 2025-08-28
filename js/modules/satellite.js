// js/modules/satellite.js
// Standalone satellite loader for Tropical page (no imageLoader.js).
// Uses GOES-16 sectors and the "TAW" (Tropical Atlantic Wide) view by default.

export function initSatellite(options = {}) {
  const mod = new SatelliteModule({
    sector: options.sector || 'taw', // 'taw' = Tropical Atlantic Wide
    selectorId: options.selectorId || 'tropical-satellite-product-select',
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
    this.platform = 'GOES16'; // Atlantic imagery
    this.isAnimating = false;

    // DOM refs
    this.sel = null;
    this.btn = null;
    this.img = null;
    this.container = null;
    this.loading = null;
    this.error = null;
    this.timestamp = null;

    // bound handlers
    this.onProductChange = this.onProductChange.bind(this);
    this.onPlayPause = this.onPlayPause.bind(this);
  }

  init() {
    // Capture elements
    this.sel = document.getElementById(this.cfg.selectorId);
    this.btn = document.getElementById(this.cfg.playButtonId);
    this.img = document.getElementById(this.cfg.imageId);
    this.container = document.getElementById(this.cfg.containerId);
    this.loading = document.getElementById(this.cfg.loadingId);
    this.error = document.getElementById(this.cfg.errorId);
    this.timestamp = document.getElementById(this.cfg.timestampId);

    if (!this.sel || !this.btn || !this.img) {
      console.warn('[satellite] Required elements not found, aborting init');
      return false;
    }

    // Listeners
    this.sel.addEventListener('change', this.onProductChange);
    this.btn.addEventListener('click', this.onPlayPause);

    // Initial UI state
    this.setPlayIcon(false);
    this.load(); // first load as static

    console.info('[satellite] initialized');
    return true;
  }

  onProductChange() {
    this.load(); // reload current mode when product changes
  }

  onPlayPause() {
    this.isAnimating = !this.isAnimating;
    this.setPlayIcon(this.isAnimating);
    this.load(); // reload in the new mode
  }

  setPlayIcon(playing) {
    const icon = this.btn.querySelector('i');
    if (!icon) return;
    icon.classList.toggle('fa-play', !playing);
    icon.classList.toggle('fa-pause', playing);
    this.btn.setAttribute(
      'aria-label',
      playing ? 'Pause satellite animation' : 'Play satellite animation'
    );
  }

  urlsFor(product) {
    const sector = (this.cfg.sector || 'taw').toLowerCase();
    const base = `https://cdn.star.nesdis.noaa.gov/${this.platform}/ABI/SECTOR/${sector}/${product}/`;

    // NOAA canonical sizes
    const isTAW = sector === 'taw';
    const staticSize = isTAW ? '3600x2160' : '2400x2400';
    const loopSize = isTAW ? '900x540' : '600x600';

    return {
      static: `${base}${staticSize}.jpg`,
      animated: `${base}${this.platform}-${sector.toUpperCase()}-${product}-${loopSize}.gif`,
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
    if (this.isAnimating) {
      this.timestamp.textContent = 'Animated Loop';
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
    this.timestamp.textContent = `${txt} (latest)`;
  }

  load() {
    const product = this.sel.value || 'GEOCOLOR';
    const { static: staticUrl, animated } = this.urlsFor(product);
    const url = this.isAnimating ? animated : staticUrl;

    this.showLoading();

    const test = new Image();
    test.onload = () => {
      // swap in
      this.img.src = url;

      // alt text
      const productText =
        this.sel.options[this.sel.selectedIndex]?.text || product;
      this.img.alt = `${this.platform} ${productText} ${this.isAnimating ? 'Animated' : 'Static'} — Tropical Atlantic`;

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
