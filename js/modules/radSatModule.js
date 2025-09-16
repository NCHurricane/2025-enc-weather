// radSatModule.js - Add this as a new module

export class RadSatModule {
    constructor() {
        this.radarTab = document.getElementById('radar-tab');
        this.satelliteTab = document.getElementById('satellite-tab');
        this.radarPanel = document.getElementById('radar-panel');
        this.satellitePanel = document.getElementById('satellite-panel');
        this.radarImage = document.getElementById('radar-image');
        this.satelliteImage = document.getElementById('satellite-image');
        
        this.init();
    }

    init() {
        // Set up tab switching
        this.radarTab?.addEventListener('click', () => this.switchTab('radar'));
        this.satelliteTab?.addEventListener('click', () => this.switchTab('satellite'));
        
        // Refresh images when page becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.refreshImages();
            }
        });
        
        // Initial load with cache busting
        this.refreshImages();
    }

    switchTab(tab) {
        if (tab === 'radar') {
            this.radarTab.classList.add('active');
            this.satelliteTab.classList.remove('active');
            this.radarTab.setAttribute('aria-selected', 'true');
            this.satelliteTab.setAttribute('aria-selected', 'false');
            this.radarPanel.hidden = false;
            this.satellitePanel.hidden = true;
        } else {
            this.satelliteTab.classList.add('active');
            this.radarTab.classList.remove('active');
            this.satelliteTab.setAttribute('aria-selected', 'true');
            this.radarTab.setAttribute('aria-selected', 'false');
            this.satellitePanel.hidden = false;
            this.radarPanel.hidden = true;
        }
    }

    refreshImages() {
        const timestamp = Date.now();
        
        // Refresh radar image
        if (this.radarImage) {
            const radarUrl = `https://radar.weather.gov/ridge/standard/SOUTHEAST_loop.gif?t=${timestamp}`;
            this.radarImage.src = radarUrl;
        }
        
        // Refresh satellite image
        if (this.satelliteImage) {
            const satelliteUrl = `https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/se/GEOCOLOR/GOES19-SE-GEOCOLOR-600x600.gif?t=${timestamp}`;
            this.satelliteImage.src = satelliteUrl;
        }
        
        // Refresh tropical image
        const tropicalImage = document.getElementById('tropical-outlook-image');
        if (tropicalImage) {
            const tropicalUrl = `https://www.nhc.noaa.gov/xgtwo/two_atl_0d0.png?t=${timestamp}`;
            tropicalImage.src = tropicalUrl;
        }
    }
}

// Initialize when DOM is ready
export function initRadSat() {
    // The radio button functionality is handled by CSS now
    // This function can be simplified or used for other initialization
    
    // Optional: Add any additional functionality like image refresh
    const radarImage = document.getElementById('radar-image');
    const satelliteImage = document.getElementById('satellite-image');
    
    // Add cache-busting for image refresh if needed
    function refreshImage(img) {
        const src = img.src.split('?')[0];
        img.src = `${src}?t=${Date.now()}`;
    }
    
    // Optional: Refresh images periodically
    setInterval(() => {
        const radarChecked = document.getElementById('radar-tab').checked;
        if (radarChecked && radarImage) {
            refreshImage(radarImage);
        } else if (satelliteImage) {
            refreshImage(satelliteImage);
        }
    }, 300000); // Refresh every 5 minutes
    
    return {
        refreshRadar: () => refreshImage(radarImage),
        refreshSatellite: () => refreshImage(satelliteImage)
    };
}