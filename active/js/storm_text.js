// ==============================
// Text Products Module for Active Storm Pages - storm_text.js
// Handles loading and displaying NHC text products with tabbed interface
// 
// Products handled:
// - TCP: Tropical Cyclone Public Advisory
// - TCM: Tropical Cyclone Forecast/Advisory  
// - TCD: Tropical Cyclone Discussion
// - PWS: Wind Speed Probabilities
// - TCU: Tropical Cyclone Update (optional)
// - TAS: Spanish Public Advisory (Atlantic only)
// - TDS: Spanish Discussion (Atlantic only)
// - TUS: Spanish Update (Atlantic only)
//
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

const TEXT_PRODUCTS = {
  TCP: {
    name: "Public Advisory",
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
    name: "Forecast/Advisory",
    fileName: "TCM",
    required: true,
    priority: 3,
    description: "Technical forecast for marine and aviation interests"
  },
  TCD: {
    name: "Discussion",
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
    name: "Wind Probabilities",
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

const textEls = {
  container: null,
  tabContainer: null,
  contentContainer: null
};

function getStormParam() {
  const p = new URLSearchParams(location.search);
  return (p.get("storm") || "").trim().toUpperCase();
}

function getAdvisoryNumber(stormId) {
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

function extractTextFromProduct(productData) {
  if (!productData?.data?.channel?.item) {
    return {
      content: TEXT_CONFIG.FALLBACK_MESSAGES.notAvailable,
      link: null,
      hasContent: false
    };
  }

  const item = productData.data.channel.item;

  if (productData.text_content && typeof productData.text_content === 'string') {
    return {
      content: productData.text_content,
      link: item.link || null,
      hasContent: true
    };
  }

  let textContent = "";

  if (Array.isArray(item.description)) {
    textContent = item.description.join('\n');
  } else if (typeof item.description === 'string') {
    textContent = item.description;
  }

  if (textContent && textContent.trim() !== '') {
    const formatted = formatNHCTextFromDescription(textContent);
    return {
      content: formatted,
      link: item.link || null,
      hasContent: true
    };
  }

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

  if (text.includes('<![CDATA[')) {
    text = text.replace(/<!\[CDATA\[/, '').replace(/\]\]>/, '');
  }

  text = text.replace(/<br\s*\/?>/gi, '\n');

  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');

  text = text.replace(/\r\n|\r/g, '\n');
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
  text = text.trim();

  return text;
}

function formatNHCText(rawText) {
  if (!rawText) return TEXT_CONFIG.FALLBACK_MESSAGES.notAvailable;

  return rawText
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .trim();
}

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

  if (tabs.length > 0) {
    activateTab(tabs[0], panels);
  }
}

function activateTab(activeTab, panels) {
  const tabs = textEls.container.querySelectorAll('.text-tab');
  const productCode = activeTab.dataset.product;

  tabs.forEach(tab => {
    const isActive = tab === activeTab;
    tab.setAttribute('aria-selected', isActive);
    tab.tabIndex = isActive ? 0 : -1;
    tab.classList.toggle('active', isActive);
  });

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
      return;
  }

  event.preventDefault();
  tabs[targetIndex].focus();
  activateTab(tabs[targetIndex], panels);
}

function isProductFresh(productData) {
  if (!productData?.data?.channel?.item?.pubDate) {
    return false;
  }
  const pubDate = new Date(productData.data.channel.item.pubDate);
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return pubDate > threeHoursAgo;
}

async function loadTextProducts(stormId) {
  const basin = stormId.substring(0, 2);
  const isAtlantic = basin === 'AL';

  const allPossibleProducts = Object.entries(TEXT_PRODUCTS)
    .filter(([code, config]) => {
      if (config.atlanticOnly && !isAtlantic) return false;
      return true;
    })
    .sort(([, a], [, b]) => a.priority - b.priority)
    .map(([code, config]) => ({
      code,
      name: config.name,
      description: config.description,
      required: config.required
    }));

  const productDataResults = await Promise.all(
    allPossibleProducts.map(p => fetchTextProduct(stormId, p.code))
  );

  const availableProducts = allPossibleProducts.filter((product, index) => {
    const productData = productDataResults[index];
    if (product.code === 'TCU' || product.code === 'TUS') {
      return isProductFresh(productData);
    }
    return true;
  });

  const interfaceHtml = createTabInterface(availableProducts);
  textEls.container.innerHTML = interfaceHtml;

  setupTabEventListeners();

  const firstTab = textEls.container.querySelector('.text-tab');
  const allPanels = textEls.container.querySelectorAll('.text-content-panel');
  if (firstTab && allPanels.length > 0) {
    activateTab(firstTab, allPanels);
  }

  for (const product of availableProducts) {
    const productData = productDataResults[allPossibleProducts.findIndex(p => p.code === product.code)];
    loadSingleProduct(stormId, product.code, productData);
  }
}

async function loadSingleProduct(stormId, productCode, preloadedData = null) {
  const textEl = textEls.container.querySelector(`#text-${productCode}`);
  const actionsEl = textEls.container.querySelector(`#actions-${productCode}`);
  const linkEl = textEls.container.querySelector(`#link-${productCode}`);

  if (!textEl) return;

  try {
    const productData = preloadedData ?? await fetchTextProduct(stormId, productCode);

    if (!productData) {
      textEl.textContent = TEXT_CONFIG.FALLBACK_MESSAGES.notAvailable;
      return;
    }

    const extracted = extractTextFromProduct(productData);
    textEl.textContent = extracted.content;

    if (actionsEl && linkEl && extracted.link) {
      linkEl.href = extracted.link;
      actionsEl.style.display = 'block';
    }

  } catch (error) {
    console.error(`Error loading ${productCode}:`, error);
    textEl.textContent = TEXT_CONFIG.FALLBACK_MESSAGES.error;
  }
}

async function initTextProducts() {
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTextProducts, { once: true });
} else {
  initTextProducts();
}

window.StormTextProducts = {
  init: initTextProducts,
  load: loadTextProducts
};