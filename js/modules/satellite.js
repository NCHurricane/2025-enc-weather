// js/modules/satellite.js
// Standalone satellite loader for Tropical page with sector selection support.
// Uses GOES-16 sectors for Atlantic basin imagery.

export function initSatellite(options = {}) {
  const mod = new SatelliteModule({
    sector: options.sector || 'taw', // 'taw' = Tropical Atlantic Wide
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
    this.platform = 'GOES16'; // Atlantic imagery
    this.isAnimating = false;
    this.currentSector = cfg.sector || 'taw';

    // Sector configuration
    this.sectors = {
      'taw': { name: 'Trop Atl', satellite: 'GOES19' },
      'na': { name: 'N Atl', satellite: 'GOES19' },
      'eus': { name: 'E US', satellite: 'GOES19' },
      'car': { name: 'Carib', satellite: 'GOES19' },
      'ga': { name: 'Gulf', satellite: 'GOES19' }
    };

    // DOM refs
    this.sel = null;
    this.typeSelect = null;
    this.sectorInputs = null;
    this.btn = null;
    this.img = null;
    this.container = null;
    this.loading = null;
    this.error = null;
    this.timestamp = null;

    // bound handlers
    this.onProductChange = this.onProductChange.bind(this);
    this.onTypeChange = this.onTypeChange.bind(this);
    this.onSectorChange = this.onSectorChange.bind(this);
    this.onPlayPause = this.onPlayPause.bind(this);
  }

  init() {
    // Capture elements
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

    // Listeners
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

    // Set default sector if not already selected
    const defaultSectorInput = document.querySelector(`input[name="${this.cfg.sectorSelectName}"][value="${this.cfg.sector}"]`);
    if (defaultSectorInput && !document.querySelector(`input[name="${this.cfg.sectorSelectName}"]:checked`)) {
      defaultSectorInput.checked = true;
    }

    // Initial UI state
    if (this.btn) {
      this.setPlayIcon(false);
    }
    
    // Set initial aspect ratio based on default sector
    this.updateContainerAspectRatio();
    
    this.load(); // first load as static

    console.info('[satellite] initialized');
    return true;
  }

  onProductChange() {
    this.load(); // reload current mode when product changes
  }

  onTypeChange() {
    // If type select exists, use it to determine animation state
    if (this.typeSelect) {
      this.isAnimating = this.typeSelect.value === 'animated';
      if (this.btn) {
        this.setPlayIcon(this.isAnimating);
      }
    }
    this.load(); // reload in the new mode
  }

  onSectorChange(e) {
    if (e.target.checked) {
      this.currentSector = e.target.value;
      
      // Reset to static when switching sectors
      this.isAnimating = false;
      if (this.btn) {
        this.setPlayIcon(false);
      }
      if (this.typeSelect) {
        this.typeSelect.value = 'static';
      }
      
      // Update container aspect ratio based on sector
      this.updateContainerAspectRatio();
      
      // Update satellite action button if available
      if (typeof window.updateSatelliteActionButton === 'function') {
        window.updateSatelliteActionButton(this.currentSector);
      }
      
      this.load(); // reload with new sector
    }
  }

  onPlayPause() {
    this.isAnimating = !this.isAnimating;
    this.setPlayIcon(this.isAnimating);
    // Update type select if it exists
    if (this.typeSelect) {
      this.typeSelect.value = this.isAnimating ? 'animated' : 'static';
    }
    this.load(); // reload in the new mode
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
    
    // Remove existing sector classes
    this.img.classList.remove('sector-taw', 'sector-na', 'sector-eus', 'sector-car', 'sector-ga');
    
    // Add sector-specific class for width styling
    this.img.classList.add(`sector-${this.currentSector}`);
    
    // Remove the container aspect ratio styling to prevent excess space
    this.container.style.aspectRatio = '';
  }

  urlsFor(product) {
    const sector = this.currentSector.toLowerCase();
    const sectorConfig = this.sectors[sector];
    const satellite = sectorConfig ? sectorConfig.satellite : this.platform;
    const base = `https://cdn.star.nesdis.noaa.gov/${satellite}/ABI/SECTOR/${sector}/${product}/`;

    // NOAA canonical sizes - adjust based on sector
    let staticSize, loopSize;
    
    switch (sector) {
      case 'taw': // Tropical Atlantic Wide
        staticSize = '3600x2160';
        loopSize = '900x540';
        break;
      case 'na': // North Atlantic
        staticSize = '3600x2160';
        loopSize = '900x540';
        break;
      case 'eus': // Eastern US
        staticSize = '2000x2000';
        loopSize = '1000x1000';
        break;
      case 'car': // Caribbean
        staticSize = '2000x2000';
        loopSize = '1000x1000';
        break;
      case 'ga': // Gulf of Mexico
        staticSize = '2000x2000';
        loopSize = '1000x1000';
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
    
    // Determine animation state from type select if available, otherwise use button state
    if (this.typeSelect) {
      this.isAnimating = this.typeSelect.value === 'animated';
    }
    
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
