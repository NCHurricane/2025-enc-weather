// =============================
// Storm Graphics Module — active/js/storm-graphics.js
// Renders NHC storm graphics with an accessible tabbed UI.
//
// // Products handled:
//  - Standard and Experimental 3- and 5-Day Track Forecasts
//    (English, Spanish, and French)
//  - Key Messages (English and Spanish)
//  - Wind Field and History
//  - Earliest and Most Likely Arrival of Tropical-Storm-Force Winds
//  - Wind Speed Probabilities for Hours 0-60 (Tropical Storm, Gale, Hurricane)
//  - Storm Surge Peak Inundation
//  - Rainfall Forecasts (WPC and International)
//  - Excessive Rainfall Outlook (WPC)
// =============================

export function graphicFileName(localUrl) {
  try {
    return decodeURIComponent(new URL(localUrl, 'https://nchurricane.invalid/').pathname.split('/').pop() || '');
  } catch {
    return '';
  }
}

export function isGraphicAvailable(manifest, localUrl) {
  if (!manifest?.products) return true;
  const filename = graphicFileName(localUrl);
  return filename !== '' && manifest.products[filename]?.state === 'available';
}

class StormGraphics {
  constructor() {
    this.stormId = null;
    this.basin = null;
    this.manifest = null;
    this.sections = [
      {
        id: 'track-messages',
        containerId: 'track-messages-section',
        graphics: [],
        languages: [],
        hasTabs: true,
        defaultLanguage: 'en',
        defaultProduct: '5day'
      },
      {
        id: 'key-messages',
        containerId: 'key-messages-section',
        graphics: [],
        languages: [],
        hasTabs: true,
        hideProductTabs: true,
        defaultLanguage: 'en',
        defaultProduct: 'key-messages'
      },
      {
        id: 'experimental',
        containerId: 'experimental-section',
        graphics: [],
        languages: [],
        hasTabs: true,
        defaultLanguage: 'en',
        defaultProduct: '5day-experimental'
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
      },
      // Wind Analysis (MTCSWA)
      {
        id: 'wind-analysis',
        containerId: 'wind-analysis-section',
        graphics: [],
        hasTabs: true,
        defaultGraphic: 0
      }
    ];
  }

  section(id) {
    return this.sections.find(section => section.id === id);
  }

  async init(stormData) {
    if (!stormData || !stormData.id) {
      console.error('Invalid storm data');
      return;
    }

    this.stormId = stormData.id;
    this.basin = stormData.id.substring(0, 2);
    this.manifest = await this.loadManifest();
    this.isDesktop = window.innerWidth >= 768;
    this.buildGraphicsUrls();
    this.applyAvailability();
    this.render();
  }

  async loadManifest() {
    try {
      const response = await fetch(`./storms/${encodeURIComponent(this.stormId)}/graphics-manifest.json?${Date.now()}`, {
        cache: 'no-store'
      });
      if (!response.ok) return null;
      const manifest = await response.json();
      return manifest?.kind === 'storm-graphics'
        && String(manifest?.stormId || '').toUpperCase() === this.stormId
        && manifest?.products
        ? manifest
        : null;
    } catch {
      return null;
    }
  }

  applyAvailability() {
    if (!this.manifest) return;
    this.sections.forEach(section => {
      if (section.id === 'wind-analysis') return;
      if (Array.isArray(section.languages) && section.languages.length) {
        section.languages = section.languages
          .map(language => ({
            ...language,
            graphics: language.graphics.filter(graphic => isGraphicAvailable(this.manifest, graphic.localUrl))
          }))
          .filter(language => language.graphics.length);
      }
      if (Array.isArray(section.graphics) && section.graphics.length) {
        section.graphics = section.graphics.filter(graphic => {
          if (section.timeframes) {
            return section.timeframes.some(time => isGraphicAvailable(
              this.manifest,
              `${graphic.localBaseUrl}${time}${graphic.suffix}`
            ));
          }
          return isGraphicAvailable(this.manifest, graphic.localUrl);
        });
      }
    });
  }

  buildGraphicsUrls() {
    const remoteBaseUrl = 'https://www.nhc.noaa.gov/storm_graphics';
    const localBaseUrl = `./storms/${this.stormId}`;
    const basinFolder = { AL: 'AT', AT: 'AT', EP: 'EP', CP: 'CP' }[this.basin];
    if (!basinFolder) {
      console.warn(`Unsupported graphics basin: ${this.basin}`);
      return;
    }
    const stormNum = this.stormId.substring(2, 4);
    const graphicsFolder = `${basinFolder}${stormNum}`;

    const trackGraphic = (language, languageName, product, name, remoteFilename, localFilename = remoteFilename) => ({
      product,
      name,
      alt: `${languageName} ${name}${name === 'Key Messages' ? '' : ' Cone'}`,
      localUrl: `${localBaseUrl}/${localFilename}.png`,
      remoteUrl: `${remoteBaseUrl}/${graphicsFolder}/${this.stormId}_${remoteFilename}.png`,
      id: `graphic-track-${language}-${product}`,
      className: 'storm-graphic-img'
    });

    // Track and Messages
    const trackLanguages = [
      {
        id: 'en',
        label: 'English',
        graphics: [
          trackGraphic('en', 'English', '3day', '3-Day', '3day_cone', '3day_cone_no_line_and_wind'),
          trackGraphic('en', 'English', '5day', '5-Day', '5day_cone', '5day_cone_no_line_and_wind'),
          trackGraphic('en', 'English', '3day-experimental', 'Experimental 3-Day', '3day_expCone'),
          trackGraphic('en', 'English', '5day-experimental', 'Experimental 5-Day', '5day_expCone'),
          trackGraphic('en', 'English', 'key-messages', 'Key Messages', 'key_messages')
        ]
      },
      {
        id: 'es',
        label: 'Español',
        graphics: [
          trackGraphic('es', 'Spanish', '3day', '3-Day', '3day_cone_es'),
          trackGraphic('es', 'Spanish', '5day', '5-Day', '5day_cone_es'),
          trackGraphic('es', 'Spanish', '3day-experimental', 'Experimental 3-Day', '3day_expCone_es'),
          trackGraphic('es', 'Spanish', '5day-experimental', 'Experimental 5-Day', '5day_expCone_es'),
          trackGraphic('es', 'Spanish', 'key-messages', 'Key Messages', 'spanish_key_messages')
        ]
      },
      {
        id: 'fr',
        label: 'Français',
        graphics: [
          trackGraphic('fr', 'French', '3day', '3-Day', '3day_cone_fr'),
          trackGraphic('fr', 'French', '5day', '5-Day', '5day_cone_fr'),
          trackGraphic('fr', 'French', '3day-experimental', 'Experimental 3-Day', '3day_expCone_fr'),
          trackGraphic('fr', 'French', '5day-experimental', 'Experimental 5-Day', '5day_expCone_fr')
        ]
      }
    ];

    const languagesFor = (products) => trackLanguages
      .map(language => ({
        ...language,
        graphics: language.graphics.filter(graphic => products.includes(graphic.product))
      }))
      .filter(language => language.graphics.length);

    this.section('track-messages').languages = languagesFor(['3day', '5day']);
    this.section('key-messages').languages = languagesFor(['key-messages']);
    this.section('experimental').languages = languagesFor(['3day-experimental', '5day-experimental']);

    this.section('wind-graphics').graphics = [
      {
        name: 'Wind Field',
        localUrl: `${localBaseUrl}/current_wind.png`,
        remoteUrl: `${remoteBaseUrl}/${graphicsFolder}/${this.stormId}_current_wind.png`,
        id: 'graphic-wind-field',
        className: 'storm-graphic-img'
      },
      {
        name: 'Wind History',
        localUrl: `${localBaseUrl}/wind_history.png`,
        remoteUrl: `${remoteBaseUrl}/${graphicsFolder}/${this.stormId}_wind_history.png`,
        id: 'graphic-wind-history',
        className: 'storm-graphic-img'
      },
      {
        name: 'Earliest Arrival',
        localUrl: `${localBaseUrl}/3day_earliest_reasonable_toa_34.png`,
        remoteUrl: `${remoteBaseUrl}/${graphicsFolder}/${this.stormId}_3day_earliest_reasonable_toa_34.png`,
        id: 'graphic-earliest-arrival',
        className: 'storm-graphic-img'
      },
      {
        name: 'Earliest Likely Arrival',
        localUrl: `${localBaseUrl}/3day_most_likely_toa_34.png`,
        remoteUrl: `${remoteBaseUrl}/${graphicsFolder}/${this.stormId}_3day_most_likely_toa_34.png`,
        id: 'graphic-likely-arrival',
        className: 'storm-graphic-img'
      }
    ];

    this.section('wind-probability').graphics = [
      {
        name: '34 kt',
        localBaseUrl: `${localBaseUrl}/wind_probs_34_F`,
        remoteBaseUrl: `${remoteBaseUrl}/${graphicsFolder}/${this.stormId}_wind_probs_34_F`,
        suffix: `.png`,
        id: 'graphic-wind-prob-ts',
        className: 'storm-graphic-img'
      },
      {
        name: '50 kt',
        localBaseUrl: `${localBaseUrl}/wind_probs_50_F`,
        remoteBaseUrl: `${remoteBaseUrl}/${graphicsFolder}/${this.stormId}_wind_probs_50_F`,
        suffix: `.png`,
        id: 'graphic-wind-prob-gale',
        className: 'storm-graphic-img'
      },
      {
        name: '64 kt',
        localBaseUrl: `${localBaseUrl}/wind_probs_64_F`,
        remoteBaseUrl: `${remoteBaseUrl}/${graphicsFolder}/${this.stormId}_wind_probs_64_F`,
        suffix: `.png`,
        id: 'graphic-wind-prob-hurricane',
        className: 'storm-graphic-img'
      }
    ];

    const fullYear = this.stormId.substring(4, 8);
    const year = fullYear.substring(2, 4);
    const rainFileBase = `${this.basin}${stormNum}${year}`;

    this.section('surge-rain').graphics = [
      {
        name: 'Peak Surge',
        localUrl: `${localBaseUrl}/peak_surge.png`,
        remoteUrl: `${remoteBaseUrl}/${graphicsFolder}/${this.stormId}_peak_surge.png`,
        id: 'graphic-peak-surge',
        className: 'storm-graphic-img'
      },
      {
        name: 'Rainfall Forecast',
        localUrl: `${localBaseUrl}/WPCQPF.gif`,
        remoteUrl: `${remoteBaseUrl}/${graphicsFolder}/${rainFileBase}WPCQPF.gif`,
        id: 'graphic-rainfall',
        className: 'storm-graphic-img'
      },
      {
        name: 'Rainfall Forecast Int\'l',
        localUrl: `${localBaseUrl}/INTQPF.gif`,
        remoteUrl: `${remoteBaseUrl}/${graphicsFolder}/${rainFileBase}INTQPF.gif`,
        id: 'graphic-rainfall-intl',
        className: 'storm-graphic-img'
      },
      {
        name: 'Excessive Rain',
        localUrl: `${localBaseUrl}/WPCERO.gif`,
        remoteUrl: `${remoteBaseUrl}/${graphicsFolder}/${rainFileBase}WPCERO.gif`,
        optional: true,
        id: 'graphic-excess-rain',
        className: 'storm-graphic-img'
      }
    ];

    // Wind Analysis (MTCSWA)
    // OSPO link: https://www.ospo.noaa.gov/products/ocean/tropical/mtcswa/index.html?storm=AL{nn}YYYY
    // Images: wind_analysis.png, wind_analysis_zoom.png
    const mtcswaStormId = this.stormId; // e.g. AL072025
    const mtcswaStormNum = mtcswaStormId.substring(2, 4); // nn
    const mtcswaYear = mtcswaStormId.substring(4, 8); // YYYY
    const mtcswaOspoUrl = `https://www.ospo.noaa.gov/products/ocean/tropical/mtcswa/index.html?storm=${mtcswaStormId}`;
    this.section('wind-analysis').graphics = [
      {
        name: 'Wind Analysis',
        localUrl: `${localBaseUrl}/wind_analysis.png`,
        remoteUrl: '', // No remote fallback, only local
        id: 'graphic-wind-analysis',
        className: 'storm-graphic-img',
        ospoUrl: mtcswaOspoUrl
      },
      {
        name: 'Zoomed Analysis',
        localUrl: `${localBaseUrl}/wind_analysis_zoom.png`,
        remoteUrl: '',
        id: 'graphic-wind-analysis-zoom',
        className: 'storm-graphic-img',
        ospoUrl: mtcswaOspoUrl
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

      const hasContent = Array.isArray(section.languages) && section.languages.length
        ? true
        : Array.isArray(section.graphics) && section.graphics.length > 0;
      if (!hasContent) {
        const message = section.id === 'surge-rain'
          ? 'No surge or rainfall graphics are currently issued for this storm.'
          : 'No graphics are currently issued for this section.';
        container.innerHTML = `<p class="graphic-empty-state" role="status">${message}</p>`;
        return;
      }

      let html;
      if (Array.isArray(section.languages) && section.languages.length) {
        html = this.renderLanguageGraphicTabs(section);
      } else if (section.timeframes) {
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

    html += '<div class="subtabs subtabs--graphics subtabs--time">';
    section.timeframes.forEach((time, index) => {
      const hours = parseInt(time);
      const label = `${hours}h`;
      html += `
        <button class="subtabs__tab ${index === 0 ? 'is-active' : ''}" data-time="${time}">
          ${label}
        </button>
      `;
    });
    html += '</div>';

    html += '<div class="subtabs subtabs--graphics subtabs--category">';
    section.graphics.forEach((graphic, index) => {
      html += `
        <button class="subtabs__tab ${index === 0 ? 'is-active' : ''}" data-category="${index}">
          ${graphic.name}
        </button>
      `;
    });
    html += '</div>';

    html += '<div class="graphics-content-container">';
    html += '<div class="graphics-content-panel is-active" id="wind-probability-display">';
    html += '<div class="single-graphic" id="wind-probability-graphic">';

    const defaultGraphic = section.graphics[0];
    const defaultTime = section.timeframes[0];
    const defaultLocalUrl = defaultGraphic.localBaseUrl + defaultTime + defaultGraphic.suffix;
    const defaultId = `${defaultGraphic.id}-${defaultTime}`;
    html += this.renderGraphicItem(defaultGraphic.name, defaultLocalUrl, false, defaultId, '', defaultGraphic.remoteBaseUrl + defaultTime + defaultGraphic.suffix, defaultGraphic.className);

    html += '</div></div>';
    html += '</div></div>';

    return html;
  }

  renderSingleGraphicTabs(section) {
    let html = '<div class="graphics-interface">';

    html += '<div class="subtabs subtabs--graphics">';
    section.graphics.forEach((graphic, index) => {
      const isActive = index === (section.defaultGraphic || 0);
      html += `
        <button class="subtabs__tab ${isActive ? 'is-active' : ''}" data-tab="${section.id}-${index}">
          ${graphic.name}
        </button>
      `;
    });
    html += '</div>';

    html += '<div class="graphics-content-container">';
    section.graphics.forEach((graphic, index) => {
      const isActive = index === (section.defaultGraphic || 0);
      html += `
        <div class="graphics-content-panel ${isActive ? 'is-active' : ''}" id="${section.id}-${index}">
          <div class="single-graphic">
            ${this.renderGraphicItem(graphic.name, graphic.localUrl, graphic.optional, graphic.id, section.id, graphic.remoteUrl, graphic.className, graphic.ospoUrl)}
          </div>
        </div>
      `;
    });
    html += '</div></div>';

    return html;
  }

  renderLanguageGraphicTabs(section) {
    const defaultLanguage = section.languages.some(language => language.id === section.defaultLanguage)
      ? section.defaultLanguage
      : section.languages[0].id;
    let html = '<div class="graphics-interface track-graphics-interface">';

    html += '<div class="subtabs subtabs--graphics subtabs--track-language" role="tablist" aria-label="Graphic language">';
    section.languages.forEach(language => {
      const isActive = language.id === defaultLanguage;
      html += `
        <button
          type="button"
          class="subtabs__tab ${isActive ? 'is-active' : ''}"
          id="${section.id}-language-tab-${language.id}"
          data-language="${language.id}"
          role="tab"
          aria-selected="${isActive}"
          aria-controls="${section.id}-language-${language.id}">
          ${language.label}
        </button>
      `;
    });
    html += '</div><div class="track-language-panels">';

    section.languages.forEach(language => {
      const isActiveLanguage = language.id === defaultLanguage;
      const defaultProduct = language.graphics.some(graphic => graphic.product === section.defaultProduct)
        ? section.defaultProduct
        : language.graphics[0].product;

      html += `
        <div
          class="track-language-panel ${isActiveLanguage ? 'is-active' : ''}"
          id="${section.id}-language-${language.id}"
          data-language-panel="${language.id}"
          role="tabpanel"
          aria-labelledby="${section.id}-language-tab-${language.id}"
          aria-hidden="${!isActiveLanguage}"
          ${isActiveLanguage ? '' : 'hidden'}>
      `;

      if (!section.hideProductTabs) {
        html += `<div class="subtabs subtabs--graphics subtabs--track-product" role="tablist" aria-label="${language.label} products">`;
        language.graphics.forEach(graphic => {
          const isActiveProduct = graphic.product === defaultProduct;
          const tabId = `${section.id}-${language.id}-${graphic.product}`;
          html += `
            <button
              type="button"
              class="subtabs__tab ${isActiveProduct ? 'is-active' : ''}"
              id="${tabId}-tab"
              data-track-product="${tabId}"
              role="tab"
              aria-selected="${isActiveProduct}"
              aria-controls="${tabId}">
              ${graphic.name}
            </button>
          `;
        });
        html += '</div>';
      }
      html += '<div class="graphics-content-container">';

      language.graphics.forEach(graphic => {
        const isActiveProduct = graphic.product === defaultProduct;
        const tabId = `${section.id}-${language.id}-${graphic.product}`;
        html += `
          <div
            class="graphics-content-panel ${isActiveProduct ? 'is-active' : ''}"
            id="${tabId}"
            role="tabpanel"
            aria-labelledby="${section.hideProductTabs ? `${section.id}-language-tab-${language.id}` : `${tabId}-tab`}"
            aria-hidden="${!isActiveProduct}"
            ${isActiveProduct ? '' : 'hidden'}>
            <div class="single-graphic">
              ${this.renderGraphicItem(graphic.alt, graphic.localUrl, graphic.optional, graphic.id, section.id, graphic.remoteUrl, graphic.className)}
            </div>
          </div>
        `;
      });

      html += '</div></div>';
    });

    html += '</div></div>';
    return html;
  }

  renderGraphicItem(name, localUrl, optional = false, id = '', sectionId = '', remoteUrl = '', className = '', ospoUrl = '') {
    const placeholderUrl = '../images/404-image.webp';
    const errorHtml = sectionId === 'surge-rain'
      ? `<img src='${placeholderUrl}' alt='Graphic Missing or Not Issued' width='600' height='411' />`
      : `<div class='graphic-error'>Graphic Missing or Not Issued</div>`;

    // List of graphics that should NOT fallback to remote if local is missing
    const noRemoteFallback = [
      'peak_surge.png',
      'WPCQPF.gif',
      'INTQPF.gif',
      'WPCERO.gif'
    ];

    // Determine if this graphic is one of the four
    let isNoRemoteFallback = false;
    if (id && typeof id === 'string') {
      const idLower = id.toLowerCase();
      isNoRemoteFallback =
        idLower.includes('peak-surge') ||
        idLower.includes('rainfall') ||
        idLower.includes('excess-rain');
    }

    // Fallback logic
    let fallback;
    if (sectionId === 'wind-analysis') {
      fallback = `this.onerror=null; this.src='${placeholderUrl}'; this.alt='Image not available'; var actionsDiv = document.getElementById('actions-${id}'); if (actionsDiv) actionsDiv.style.display = 'none';`;
    } else if (isNoRemoteFallback) {
      // Do NOT fallback to remote for these graphics
      fallback = `this.onerror=null; this.src='${placeholderUrl}'; this.alt='Image not available'; var actionsDiv = document.getElementById('actions-${id}'); if (actionsDiv) actionsDiv.style.display = 'none';`;
    } else if (remoteUrl) {
      fallback = `this.onerror=function(){this.onerror=null; this.src='${placeholderUrl}'; this.alt='Image not available'; var actionsDiv = document.getElementById('actions-${id}'); if (actionsDiv) actionsDiv.style.display = 'none';}; this.src='${remoteUrl}';`;
    } else {
      fallback = `this.onerror=null; this.src='${placeholderUrl}'; this.alt='Image not available'; var actionsDiv = document.getElementById('actions-${id}'); if (actionsDiv) actionsDiv.style.display = 'none';`;
    }

    let actionsHtml = '';
    if (sectionId === 'wind-analysis' && ospoUrl) {
      actionsHtml = `
        <div class="text-actions" id="actions-${id}">
          <a href="${ospoUrl}" class="nhc-link-btn" id="link-${id}" target="_blank" rel="noopener">
            <i class="fa-solid fa-external-link-alt"></i> View Full MTCSWA Analysis at OSPO
          </a>
        </div>`;
    }

    return `
      <div class="graphic-item" data-optional="${optional}">
        <div class="graphic-container" ${id ? `id="${id}"` : ''}>
          <img
            src="${localUrl}"
            alt="${name}"
            class="${className || ''}"
            width="500"
            height="411"
            loading="lazy"
            onerror="${fallback.replace(/"/g, '&quot;')}"
          />
        </div>${actionsHtml}
      </div>
    `;
  }

  attachEventListeners() {
    document.querySelectorAll('[data-tab]').forEach(button => {
      button.addEventListener('click', () => {
        const tabId = button.dataset.tab;
        const tabGroup = button.parentElement;
        const wrapper = tabGroup.parentElement;
        const contentArea = wrapper.querySelector('.graphics-content-container');

        tabGroup.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('is-active'));
        button.classList.add('is-active');

        contentArea.querySelectorAll('.graphics-content-panel').forEach(pane => pane.classList.remove('is-active'));
        const target = document.getElementById(tabId);
        if (target) target.classList.add('is-active');

        // ...existing code...
      });
    });

    this.attachTrackMessageListeners();

    // Wind probability two-row tabs
    this.attachWindProbabilityListeners();

    // Add resize listener to rebuild URLs when switching between desktop/mobile
    window.addEventListener('resize', () => {
      const currentIsDesktop = window.innerWidth >= 768;
      if (currentIsDesktop !== this.isDesktop) {
        this.isDesktop = currentIsDesktop;
        this.buildGraphicsUrls();
        this.applyAvailability();
        this.render();
      }
    });
  }

  attachTrackMessageListeners() {
    document.querySelectorAll('.track-graphics-interface').forEach(interfaceElement => {
      const languageTabs = interfaceElement.querySelectorAll('[data-language]');
      const languagePanels = interfaceElement.querySelectorAll('.track-language-panel');

      languageTabs.forEach(button => {
        button.addEventListener('click', () => {
          const language = button.dataset.language;

          languageTabs.forEach(tab => {
            const isActive = tab === button;
            tab.classList.toggle('is-active', isActive);
            tab.setAttribute('aria-selected', String(isActive));
          });

          languagePanels.forEach(panel => {
            const isActive = panel.dataset.languagePanel === language;
            panel.classList.toggle('is-active', isActive);
            panel.setAttribute('aria-hidden', String(!isActive));
            panel.hidden = !isActive;
          });
        });
      });

      interfaceElement.querySelectorAll('.track-language-panel').forEach(languagePanel => {
        const productTabs = languagePanel.querySelectorAll('[data-track-product]');
        const productPanels = languagePanel.querySelectorAll('.graphics-content-panel');

        productTabs.forEach(button => {
          button.addEventListener('click', () => {
            const productPanelId = button.dataset.trackProduct;

            productTabs.forEach(tab => {
              const isActive = tab === button;
              tab.classList.toggle('is-active', isActive);
              tab.setAttribute('aria-selected', String(isActive));
            });

            productPanels.forEach(panel => {
              const isActive = panel.id === productPanelId;
              panel.classList.toggle('is-active', isActive);
              panel.setAttribute('aria-hidden', String(!isActive));
              panel.hidden = !isActive;
            });
          });
        });
      });
    });
  }

  attachWindProbabilityListeners() {
    const timeButtons = document.querySelectorAll('[data-time]');
    const categoryButtons = document.querySelectorAll('[data-category]');

    // Handle time tab clicks
    timeButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Update active time tab
        timeButtons.forEach(b => b.classList.remove('is-active'));
        button.classList.add('is-active');

        // Update graphic display
        this.updateWindProbabilityGraphic();
      });
    });

    // Handle category tab clicks  
    categoryButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Update active category tab
        categoryButtons.forEach(b => b.classList.remove('is-active'));
        button.classList.add('is-active');

        // Update graphic display

        // ...existing code...
        this.updateWindProbabilityGraphic();
      });
    });
  }

  updateWindProbabilityGraphic() {
    const activeTimeTab = document.querySelector('[data-time].is-active');
    const activeCategoryTab = document.querySelector('[data-category].is-active');
    const graphicContainer = document.getElementById('wind-probability-graphic');

    if (!activeTimeTab || !activeCategoryTab || !graphicContainer) return;

    // ...existing code...

    const selectedTime = activeTimeTab.dataset.time;
    const selectedCategoryIndex = parseInt(activeCategoryTab.dataset.category);
    const windProbabilitySection = this.sections.find(s => s.id === 'wind-probability');

    if (!windProbabilitySection) return;

    const selectedCategory = windProbabilitySection.graphics[selectedCategoryIndex];
    const localUrl = selectedCategory.localBaseUrl + selectedTime + selectedCategory.suffix;
    const remoteUrl = selectedCategory.remoteBaseUrl + selectedTime + selectedCategory.suffix;

    // Update the graphic display with ID
    graphicContainer.innerHTML = this.renderGraphicItem(
      selectedCategory.name,
      localUrl,
      false,
      `${selectedCategory.id}-${selectedTime}`,
      '',
      remoteUrl,
      selectedCategory.className
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
  return graphics.init(stormData);
}
