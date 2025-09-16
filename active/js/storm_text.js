/**
 * storm_text.js - Text Products Module for Active Storm Pages
 * Handles loading and displaying NHC text products with tabbed interface
 * 
 * Products handled:
 * - TCP: Tropical Cyclone Public Advisory
 * - TCM: Tropical Cyclone Forecast/Advisory  
 * - TCD: Tropical Cyclone Discussion
 * - PWS: Wind Speed Probabilities
 * - TCU: Tropical Cyclone Update (optional)
 * - TAS: Spanish Public Advisory (Atlantic only)
 * - TDS: Spanish Discussion (Atlantic only)
 * - TUS: Spanish Update (Atlantic only)
 */
"use strict";

/* ==============================
     Config & Constants
     ============================== */
const TEXT_CONFIG = {
  STORMS_ROOT: "./storms",
  FALLBACK_MESSAGES: {
    notAvailable: "Product not available",
    loading: "Loading text product...",
    error: "Failed to load text product"
  }
};

// Text product definitions with display names and priority order
const TEXT_PRODUCTS = {
  // English Products (all basins)
  TCP: {
    name: "Advisory",
    fileName: "TCP",
    required: true,
    priority: 1,
    description: "Current conditions and forecast for the general public"
  },
    TAS: {
    name: "Advertencia",
    fileName: "TAS",
    required: false,
    priority: 2,
    atlanticOnly: true,
    description: "Condiciones actuales y pronóstico para el público general"
  },
  TCM: {
    name: "Forecast", 
    fileName: "TCM",
    required: true,
    priority: 3,
    description: "Technical forecast for marine and aviation interests"
  },
  TCD: {
    name: "Disc",
    fileName: "TCD", 
    required: true,
    priority: 4,
    description: "Meteorologist's reasoning behind the forecast"
  },
  TDS: {
    name: "Discusión",
    fileName: "TDS",
    required: false,
    priority: 5,
    atlanticOnly: true,
    description: "Razonamiento del meteorólogo detrás del pronóstico"
  },
  PWS: {
    name: "Wind",
    fileName: "PWS",
    required: true,
    priority: 6,
    description: "Probability of experiencing tropical storm/hurricane force winds"
  },
  TCU: {
    name: "Update",
    fileName: "TCU",
    required: false,
    priority: 7,
    description: "Intermediate updates between regular advisories"
  },
  TUS: {
    name: "Actualiz",
    fileName: "TUS",
    required: false,
    priority: 8,
    atlanticOnly: true,
    description: "Actualizaciones intermedias entre avisos regulares"
  }
  


};

/* ================
     DOM Elements
     ================ */
const textEls = {
  container: null,
  tabContainer: null,
  contentContainer: null
};

/* ================
     Utilities
     ================ */
function getStormParam() {
  const p = new URLSearchParams(location.search);
  return (p.get("storm") || "").trim().toUpperCase();
}

function getAdvisoryNumber(stormId) {
  // Extract storm number and map to NHC advisory number (1-5 rotating)
  const match = stormId.match(/^(AL|EP)(\d{2})(\d{4})$/);
  if (!match) return null;
  
  const stormNumber = parseInt(match[2]);
  return ((stormNumber - 1) % 5) + 1;
}

function getBasinCode(stormId) {
  if (stormId.startsWith('AL')) return 'AT';
  if (stormId.startsWith('EP')) return 'EP';
  return null;
}

async function fetchTextProduct(stormId, productType) {
  const advisoryNum = getAdvisoryNumber(stormId);
  const basinCode = getBasinCode(stormId);
  
  if (!advisoryNum || !basinCode) return null;
  
  const fileName = `${productType}${basinCode}${advisoryNum}.json`;
  const url = `${TEXT_CONFIG.STORMS_ROOT}/${encodeURIComponent(stormId)}/${fileName}?${Date.now()}`;
  
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    
    const rawText = await response.text();
    const cleanText = rawText.replace(/^\uFEFF/, "").trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.warn(`Failed to fetch text product ${productType}:`, error);
    return null;
  }
}

/* ================
     Text Extraction
     ================ */
function extractTextFromProduct(productData) {
  if (!productData?.data?.channel?.item) {
    return {
      content: TEXT_CONFIG.FALLBACK_MESSAGES.notAvailable,
      link: null,
      hasContent: false
    };
  }
  
  const item = productData.data.channel.item;
  
  // First try to get the formatted text content from our cache
  if (productData.text_content && typeof productData.text_content === 'string') {
    return {
      content: productData.text_content,
      link: item.link || null,
      hasContent: true
    };
  }
  
  // Fallback: try to extract from description field (for older cached files)
  let textContent = "";
  
  if (Array.isArray(item.description)) {
    textContent = item.description.join('\n');
  } else if (typeof item.description === 'string') {
    textContent = item.description;
  }
  
  if (textContent && textContent.trim() !== '') {
    // Format the text content (remove HTML tags, etc.)
    const formatted = formatNHCTextFromDescription(textContent);
    return {
      content: formatted,
      link: item.link || null,
      hasContent: true
    };
  }
  
  // If no text content available, provide informative message
  const link = item.link || '';
  const linkText = link.replace('https://www.nhc.noaa.gov/text/', '').replace('.shtml', '');
  const pubDate = item.pubDate ? new Date(item.pubDate).toLocaleDateString() : 'Unknown';
  
  return {
    content: `📋 NHC Text Product: ${linkText || 'Advisory'}\n\n` +
             `This text product was published on ${pubDate} but is no longer\n` +
             `actively updating as the storm has become post-tropical or\n` +
             `advisories have been discontinued.\n\n` +
             `During active storm periods, the full advisory text will be\n` +
             `displayed here automatically.\n\n` +
             `Click "View on NHC Website" below to see the archived content.`,
    link: link,
    hasContent: false
  };
}

function formatNHCTextFromDescription(rawText) {
  if (!rawText) return TEXT_CONFIG.FALLBACK_MESSAGES.notAvailable;
  
  let text = rawText;
  
  // Remove CDATA wrapper if present
  if (text.includes('<![CDATA[')) {
    text = text.replace(/<!\[CDATA\[/, '').replace(/\]\]>/, '');
  }
  
  // Convert HTML line breaks to actual line breaks
  text = text.replace(/<br\s*\/?>/gi, '\n');
  
  // Clean up HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  
  // Normalize line endings and clean up extra whitespace
  text = text.replace(/\r\n|\r/g, '\n');
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n'); // Replace multiple blank lines with double
  text = text.trim();
  
  return text;
}

function formatNHCText(rawText) {
  if (!rawText) return TEXT_CONFIG.FALLBACK_MESSAGES.notAvailable;
  
  // Basic formatting to match NHC style
  return rawText
    .replace(/\\n/g, '\n')  // Handle escaped newlines
    .replace(/\\t/g, '\t')  // Handle escaped tabs
    .trim();
}

/* ================
     Tab Interface (Modified: Header removed)
     ================ */
function createTabInterface(availableProducts) {
  const tabsHtml = availableProducts.map(product => {
    const isSpanish = product.code.startsWith('T') && product.code.endsWith('S');
    const tabClass = isSpanish ? 'text-tab spanish' : 'text-tab';
    
    return `
      <button class="${tabClass}" 
              data-product="${product.code}" 
              role="tab" 
              aria-controls="content-${product.code}"
              aria-selected="false"
              tabindex="-1">
        <span class="tab-name">${product.name}</span>
      </button>
    `;
  }).join('');
  
  const contentPanelsHtml = availableProducts.map(product => `
    <div class="text-content-panel" 
         id="content-${product.code}"
         role="tabpanel" 
         aria-labelledby="tab-${product.code}"
         hidden>
      <pre class="text-content" id="text-${product.code}">${TEXT_CONFIG.FALLBACK_MESSAGES.loading}</pre>
      <div class="text-actions" id="actions-${product.code}" style="display: none;">
        <a href="#" class="nhc-link-btn" id="link-${product.code}" target="_blank" rel="noopener">
          <i class="fa-solid fa-external-link-alt"></i> View Full Text on NHC Website
        </a>
      </div>
    </div>
  `).join('');
  
  return `
    <div class="text-products-interface">
      <div class="text-tabs" role="tablist" aria-label="Text Products">
        ${tabsHtml}
      </div>
      <div class="text-content-container">
        ${contentPanelsHtml}
      </div>
    </div>
  `;
}

function setupTabEventListeners() {
  const tabs = textEls.container.querySelectorAll('.text-tab');
  const panels = textEls.container.querySelectorAll('.text-content-panel');
  
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(tab, panels));
    tab.addEventListener('keydown', (e) => handleTabKeydown(e, tabs, panels));
  });
  
  // Activate first tab by default
  if (tabs.length > 0) {
    activateTab(tabs[0], panels);
  }
}

function activateTab(activeTab, panels) {
  const tabs = textEls.container.querySelectorAll('.text-tab');
  const productCode = activeTab.dataset.product;
  
  // Update tab states
  tabs.forEach(tab => {
    const isActive = tab === activeTab;
    tab.setAttribute('aria-selected', isActive);
    tab.tabIndex = isActive ? 0 : -1;
    tab.classList.toggle('active', isActive);
  });
  
  // Update panel visibility - use both hidden attribute and active class for consistency
  panels.forEach(panel => {
    const isActive = panel.id === `content-${productCode}`;
    panel.hidden = !isActive;
    panel.classList.toggle('active', isActive);
  });
}

function handleTabKeydown(event, tabs, panels) {
  const currentIndex = Array.from(tabs).indexOf(event.target);
  let targetIndex = currentIndex;
  
  switch (event.key) {
    case 'ArrowLeft':
      targetIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
      break;
    case 'ArrowRight':
      targetIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
      break;
    case 'Home':
      targetIndex = 0;
      break;
    case 'End':
      targetIndex = tabs.length - 1;
      break;
    default:
      return; // Don't prevent default for other keys
  }
  
  event.preventDefault();
  tabs[targetIndex].focus();
  activateTab(tabs[targetIndex], panels);
}

/* ================
     Content Loading
     ================ */
async function loadTextProducts(stormId) {
  const basin = stormId.substring(0, 2);
  const isAtlantic = basin === 'AL';
  
  // Determine which products to show
  const availableProducts = Object.entries(TEXT_PRODUCTS)
    .filter(([code, config]) => {
      // Skip Spanish products for Pacific storms
      if (config.atlanticOnly && !isAtlantic) return false;
      return true;
    })
    .sort(([,a], [,b]) => a.priority - b.priority)
    .map(([code, config]) => ({
      code,
      name: config.name,
      description: config.description,
      required: config.required
    }));
  
  // Create the tab interface
  const interfaceHtml = createTabInterface(availableProducts);
  textEls.container.innerHTML = interfaceHtml;
  
  // Set up event listeners
  setupTabEventListeners();
  
  // Activate the first tab
  const firstTab = textEls.container.querySelector('.text-tab');
  const allPanels = textEls.container.querySelectorAll('.text-content-panel');
  if (firstTab && allPanels.length > 0) {
    activateTab(firstTab, allPanels);
  }
  
  // Load each product
  for (const product of availableProducts) {
    loadSingleProduct(stormId, product.code);
  }
}

async function loadSingleProduct(stormId, productCode) {
  const textEl = textEls.container.querySelector(`#text-${productCode}`);
  const actionsEl = textEls.container.querySelector(`#actions-${productCode}`);
  const linkEl = textEls.container.querySelector(`#link-${productCode}`);
  
  if (!textEl) return;
  
  try {
    const productData = await fetchTextProduct(stormId, productCode);
    
    if (!productData) {
      textEl.textContent = TEXT_CONFIG.FALLBACK_MESSAGES.notAvailable;
      return;
    }
    
    // Extract content and metadata
    const extracted = extractTextFromProduct(productData);
    textEl.textContent = extracted.content;
    
    // Show/hide the NHC link button
    if (actionsEl && linkEl && extracted.link) {
      linkEl.href = extracted.link;
      actionsEl.style.display = 'block';
    }
    
    // Metadata update section removed - text header elements no longer exist
    
  } catch (error) {
    console.error(`Error loading ${productCode}:`, error);
    textEl.textContent = TEXT_CONFIG.FALLBACK_MESSAGES.error;
  }
}

/* ================
     Public API
     ================ */
async function initTextProducts() {
  // Find the text products container
  textEls.container = document.querySelector('#storm-text-section');
  
  if (!textEls.container) {
    console.warn('Text products container not found');
    return;
  }
  
  const stormId = getStormParam();
  if (!stormId) {
    console.warn('No storm ID provided');
    return;
  }
  
  console.info('Loading text products for storm:', stormId);
  await loadTextProducts(stormId);
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTextProducts, { once: true });
} else {
  initTextProducts();
}

// Export for manual initialization if needed
window.StormTextProducts = {
  init: initTextProducts,
  load: loadTextProducts
};