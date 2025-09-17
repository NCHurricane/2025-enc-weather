// =============================
// Storm Graphics Module — storm-graphics.js
// Renders NHC storm graphics with an accessible tabbed UI.
//
// // Products handled:
//  - 3- and 5-Day Track Forecasts
//  - Key Messages (English and Spanish)
//  - Wind Field and History
//  - Earliest and Most Likely Arrival of Tropical-Storm-Force Winds
//  - Wind Speed Probabilities for Hours 0-60 (Tropical Storm, Gale, Hurricane)
//  - Storm Surge Peak Inundation
//  - Rainfall Forecasts (WPC and International)
//  - Excessive Rainfall Outlook (WPC)
// ==============================

class StormGraphics {
  constructor() {
    this.stormId = null;
    this.basin = null;
    this.sections = [
      {
        id: 'track-messages',
        containerId: 'track-messages-section',
        graphics: [],
        hasTabs: true,
        defaultGraphic: 1
      },
      {
        id: 'wind-graphics',
        containerId: 'wind-graphics-section',
        graphics: [],
        hasTabs: true,
        defaultGraphic: 0
      },
      {
        id: 'wind-probability',
        containerId: 'wind-probability-section',
        graphics: [],
        hasTabs: true,
        timeframes: ['000', '012', '024', '036', '048', '060']
      },
      {
        id: 'surge-rain',
        containerId: 'surge-rain-section',
        graphics: [],
        conditional: true,
        hasTabs: true,
        defaultGraphic: 0
      }
    ];
  }

  init(stormData) {
    if (!stormData || !stormData.id) {
      console.error('Invalid storm data');
      return;
    }

    this.stormId = stormData.id;
    this.basin = stormData.id.substring(0, 2);
    this.buildGraphicsUrls();
    this.render();
  }

  buildGraphicsUrls() {
    const baseUrl = 'https://www.nhc.noaa.gov/storm_graphics';
    const basinFolder = this.basin === 'AL' || this.basin === 'AT' ? 'AT' : 'EP';
    const stormNum = this.stormId.substring(2, 4);
    const graphicsFolder = `${basinFolder}${stormNum}`;

    // Track and Messages
    this.sections[0].graphics = [
      {
        name: '3-Day',
        url: `${baseUrl}/${graphicsFolder}/${this.stormId}_3day_cone_no_line_and_wind.png`,
        id: 'graphic-3day-track'
      },
      {
        name: '5-Day',
        url: `${baseUrl}/${graphicsFolder}/${this.stormId}_5day_cone_no_line_and_wind.png`,
        id: 'graphic-5day-track'
      },
      {
        name: 'Key Msg',
        url: `${baseUrl}/${graphicsFolder}/${this.stormId}_key_messages.png`,
        id: 'graphic-key-messages'
      },
      {
        name: 'Key Msg (Español)',
        url: `${baseUrl}/${graphicsFolder}/${this.stormId}_spanish_key_messages.png`,
        id: 'graphic-key-messages-spanish'
      }
    ];

    this.sections[1].graphics = [
      {
        name: 'Field',
        url: `${baseUrl}/${graphicsFolder}/${this.stormId}_current_wind.png`,
        id: 'graphic-wind-field'
      },
      {
        name: 'History',
        url: `${baseUrl}/${graphicsFolder}/${this.stormId}_wind_history.png`,
        id: 'graphic-wind-history'
      },
      {
        name: 'Earliest Arr',
        url: `${baseUrl}/${graphicsFolder}/${this.stormId}_3day_earliest_reasonable_toa_34.png`,
        id: 'graphic-earliest-arrival'
      },
      {
        name: 'Likely Arrival',
        url: `${baseUrl}/${graphicsFolder}/${this.stormId}_3day_most_likely_toa_34.png`,
        id: 'graphic-likely-arrival'
      }
    ];

    this.sections[2].graphics = [
      {
        name: 'TS',
        baseUrl: `${baseUrl}/${graphicsFolder}/${this.stormId}_wind_probs_34_F`,
        suffix: `.png`,
        id: 'graphic-wind-prob-ts'
      },
      {
        name: 'Gale',
        baseUrl: `${baseUrl}/${graphicsFolder}/${this.stormId}_wind_probs_50_F`,
        suffix: `.png`,
        id: 'graphic-wind-prob-gale'
      },
      {
        name: 'Hurricane',
        baseUrl: `${baseUrl}/${graphicsFolder}/${this.stormId}_wind_probs_64_F`,
        suffix: `.png`,
        id: 'graphic-wind-prob-hurricane'
      }
    ];

    const fullYear = this.stormId.substring(4, 8);
    const year = fullYear.substring(2, 4);
    
    this.sections[3].graphics = [
      {
        name: 'Peak Surge',
        url: `${baseUrl}/${graphicsFolder}/${this.stormId}_peak_surge.png`,
        id: 'graphic-peak-surge'
      },
      {
        name: 'Rainfall',
        url: `${baseUrl}/${graphicsFolder}/${this.stormId.substring(0, 4)}${year}WPCQPF.gif`,
        id: 'graphic-rainfall'
      },
      {
        name: 'Rainfall Int\'l',
        url: `${baseUrl}/${graphicsFolder}/${this.stormId.substring(0, 4)}${year}INTQPF.gif`,
        id: 'graphic-rainfall-intl'
      },
      {
        name: 'Excess Rain',
        url: `${baseUrl}/${graphicsFolder}/${this.stormId.substring(0, 4)}${year}WPCERO.gif`,
        optional: true,
        id: 'graphic-excess-rain'
      }
    ];
  }

  render() {
    const currentIsDesktop = window.innerWidth >= 768;
    if (currentIsDesktop !== this.isDesktop) {
      this.isDesktop = currentIsDesktop;
      this.buildGraphicsUrls();
    }
    
    this.sections.forEach(section => {
      const container = document.getElementById(section.containerId);
      if (!container) {
        console.warn(`Container ${section.containerId} not found`);
        return;
      }

      let html;
      if (section.timeframes) {
        html = this.renderTabbedContent(section);
      } else if (section.hasTabs) {
        html = this.renderSingleGraphicTabs(section);
      } else {
        html = this.renderSingleGraphicTabs(section);
      }

      container.innerHTML = html;
    });

    this.attachEventListeners();
  }

  renderTabbedContent(section) {
    let html = '<div class="graphics-interface">';

    html += '<div class="graphics-tabs time-tabs">';
    section.timeframes.forEach((time, index) => {
      const hours = parseInt(time);
      const label = `${hours}h`;
      html += `
        <button class="graphics-tab time-tab ${index === 0 ? 'active' : ''}" data-time="${time}">
          ${label}
        </button>
      `;
    });
    html += '</div>';

    html += '<div class="graphics-tabs category-tabs">';
    section.graphics.forEach((graphic, index) => {
      html += `
        <button class="graphics-tab category-tab ${index === 0 ? 'active' : ''}" data-category="${index}">
          ${graphic.name}
        </button>
      `;
    });
    html += '</div>';

    html += '<div class="graphics-content-container">';
    html += '<div class="graphics-content-panel active" id="wind-probability-display">';
    html += '<div class="single-graphic" id="wind-probability-graphic">';
    
    const defaultUrl = section.graphics[0].baseUrl + section.timeframes[0] + section.graphics[0].suffix;
    html += this.renderGraphicItem(section.graphics[0].name, defaultUrl);
    
    html += '</div></div>';
    html += '</div></div>';

    return html;
  }

  renderSingleGraphicTabs(section) {
    let html = '<div class="graphics-interface">';

    html += '<div class="graphics-tabs">';
    section.graphics.forEach((graphic, index) => {
      const isActive = index === (section.defaultGraphic || 0);
      html += `
        <button class="graphics-tab ${isActive ? 'active' : ''}" data-tab="${section.id}-${index}">
          ${graphic.name}
        </button>
      `;
    });
    html += '</div>';

    html += '<div class="graphics-content-container">';
    section.graphics.forEach((graphic, index) => {
      const isActive = index === (section.defaultGraphic || 0);
      html += `
        <div class="graphics-content-panel ${isActive ? 'active' : ''}" id="${section.id}-${index}">
          <div class="single-graphic">
            ${this.renderGraphicItem(graphic.name, graphic.url, graphic.optional, graphic.id)}
          </div>
        </div>
      `;
    });
    html += '</div></div>';

    return html;
  }

  renderGraphicItem(name, url, optional = false, id = '') {
    return `
      <div class="graphic-item" data-optional="${optional}">
        <div class="graphic-container" ${id ? `id="${id}"` : ''}>
          <img
            src="${url}"
            alt="${name}"
            loading="lazy"
            onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'graphic-error\\'>Graphic Missing or Not Issued</div>';"
          />
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    document.querySelectorAll('.graphics-tab:not(.time-tab):not(.category-tab)').forEach(button => {
      button.addEventListener('click', () => {
        const tabId = button.dataset.tab;
        const tabGroup = button.parentElement;
        const wrapper = tabGroup.parentElement;
        const contentArea = wrapper.querySelector('.graphics-content-container');

        tabGroup.querySelectorAll('.graphics-tab').forEach(b => b.classList.remove('active'));
        button.classList.add('active');

        contentArea.querySelectorAll('.graphics-content-panel').forEach(pane => pane.classList.remove('active'));
        const target = document.getElementById(tabId);
        if (target) target.classList.add('active');

        // ...existing code...
      });
    });

    // Wind probability two-row tabs
    this.attachWindProbabilityListeners();

    // Add resize listener to rebuild URLs when switching between desktop/mobile
    window.addEventListener('resize', () => {
      const currentIsDesktop = window.innerWidth >= 768;
      if (currentIsDesktop !== this.isDesktop) {
        this.isDesktop = currentIsDesktop;
        this.buildGraphicsUrls();
        this.render();
      }
    });
  }

  attachWindProbabilityListeners() {
    const timeButtons = document.querySelectorAll('.graphics-tab.time-tab');
    const categoryButtons = document.querySelectorAll('.graphics-tab.category-tab');
    
    // Handle time tab clicks
    timeButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Update active time tab
        timeButtons.forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        
        // Update graphic display
        this.updateWindProbabilityGraphic();
      });
    });

    // Handle category tab clicks  
    categoryButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Update active category tab
        categoryButtons.forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        
        // Update graphic display

        // ...existing code...
        this.updateWindProbabilityGraphic();
      });
    });
  }

  updateWindProbabilityGraphic() {
    const activeTimeTab = document.querySelector('.graphics-tab.time-tab.active');
    const activeCategoryTab = document.querySelector('.graphics-tab.category-tab.active');
    const graphicContainer = document.getElementById('wind-probability-graphic');
    
    if (!activeTimeTab || !activeCategoryTab || !graphicContainer) return;

        // ...existing code...
    
    const selectedTime = activeTimeTab.dataset.time;
    const selectedCategoryIndex = parseInt(activeCategoryTab.dataset.category);
    const windProbabilitySection = this.sections.find(s => s.id === 'wind-probability');
    
    if (!windProbabilitySection) return;
    
    const selectedCategory = windProbabilitySection.graphics[selectedCategoryIndex];
    const graphicUrl = selectedCategory.baseUrl + selectedTime + selectedCategory.suffix;
    
    // Update the graphic display with ID
    graphicContainer.innerHTML = this.renderGraphicItem(
      selectedCategory.name, 
      graphicUrl, 
      false, 
      `${selectedCategory.id}-${selectedTime}`
    );
  }

  // Collapsible helpers removed; handled in storm.js

  handleDownload(action) {
    // Download functionality removed per requirements
    console.log('Download functionality has been removed');
  }
}

// Initialize when storm data is available
export function initStormGraphics(stormData) {
  const graphics = new StormGraphics();
  graphics.init(stormData);
}
