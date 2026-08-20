// =============================
// Navigation Module - js/modules/navigation.js
// Centralized navigation management for NCHurricane.com
// Handles dynamic generation of header navigation and events
// =============================

import { initAnalytics } from './analytics.js?v=20260812-ga4';

export const NavigationModule = {
  navData: {
    logo: {
      src: "images/2025_banner.png",
      alt: "NCHurricane.com Logo"
    },
    menuItems: [
      { text: "Home", href: "index.html" },
      {
        text: "Counties",
        href: "#",
        hasSubmenu: true,
        submenu: [
          { text: "Beaufort", href: "counties/beaufort/index.html" },
          { text: "Bertie", href: "counties/bertie/index.html" },
          { text: "Dare", href: "counties/dare/?zone=mainland" },
          { text: "Hyde", href: "counties/hyde/?zone=mainland" },
          { text: "Martin", href: "counties/martin/index.html" },
          { text: "Pitt", href: "counties/pitt/index.html" },
          { text: "Tyrrell", href: "counties/tyrrell/index.html" },
          { text: "Washington", href: "counties/washington/index.html" }
        ]
      },
      { text: "Tropical", href: "tropical.html" },
      {
        text: "Other Markets",
        href: "#",
        hasSubmenu: true,
        submenu: [
          { text: "San Diego", href: "counties/san-diego/?zone=coastal" }
        ]
      },
      { text: "Case Study", href: "about.html" },
    ]
  },

  /**
   * Generate navigation HTML
   * @param {string} basePath - Base path for relative links (e.g., './', '../../')
   * @returns {string} Complete header HTML
   */
  generateNavigation(basePath = '') {
    const { logo, menuItems } = this.navData;
    const hasStructuredWordmark = logo.textBefore || logo.iconClass || logo.textAfter;
    const structuredWordmark = hasStructuredWordmark
      ? `<span class="site-wordmark"><span class="site-wordmark-name">${logo.textBefore || ''}</span>${
          logo.iconClass ? `<i class="${logo.iconClass}" aria-hidden="true"></i>` : ''
        }<span class="site-wordmark-wx">${logo.textAfter || ''}</span></span>`
      : '';
    const logoMarkup = structuredWordmark || (logo.text
      ? `<span class="site-wordmark">${logo.text}</span>`
      : `<img src="${basePath}${logo.src}" alt="${logo.alt}" />`);
    const wordmarkText = hasStructuredWordmark
      ? `${logo.textBefore || ''}${logo.textAfter || ''}`
      : logo.text;
    const logoAriaLabel = logo.ariaLabel || (wordmarkText ? `${wordmarkText} home` : 'Home');

    const menuHTML = menuItems.map((item, index) => {
      if (item.hasSubmenu) {
        const submenuId = `nav-submenu-${index}`;
        const submenuHTML = item.submenu.map(subItem =>
          `<li><a href="${basePath}${subItem.href}">${subItem.text}</a></li>`
        ).join('');

        return `
          <li class="has-submenu">
            <button type="button" class="submenu-toggle" aria-haspopup="true" aria-expanded="false" aria-controls="${submenuId}">${item.text}</button>
            <ul class="submenu" id="${submenuId}">${submenuHTML}</ul>
          </li>
        `;
      }
      return `<li><a href="${basePath}${item.href}">${item.text}</a></li>`;
    }).join('');

    return `
      <a class="skip-link" href="#main-content">Skip to main content</a>
      <header class="header">
        <div class="header-container">
          <a href="${basePath}index.html" class="logo-link" aria-label="${logoAriaLabel}">
            ${logoMarkup}
          </a>
          <nav class="nav" aria-label="Main navigation">
            <ul class="nav-menu" id="nav-menu">${menuHTML}</ul>
          </nav>
          <button class="hamburger" id="hamburger" aria-label="Menu" aria-expanded="false" aria-controls="nav-menu">
            <i class="fa-solid fa-bars" aria-hidden="true"></i>
          </button>
        </div>
      </header>
    `;
  },

  /**
   * Initialize navigation and bind events
   * @param {string} basePath - Base path for relative links
   */
  init(basePath = '') {
    const headerElement = document.querySelector('header');
    if (headerElement) {
      headerElement.outerHTML = this.generateNavigation(basePath);
      const main = document.querySelector('main');
      if (main && !main.id) main.id = 'main-content';
      this.bindEvents();
      this.enhancePage(basePath);
    } else {
      console.warn('NavigationModule: No header element found');
    }
  },

  /**
   * Bind hamburger menu and submenu events
   */
  bindEvents() {
    // Hamburger menu toggle
    const hamburger = document.getElementById('hamburger');
    const nav = document.querySelector('.nav');

    if (hamburger && nav) {
      hamburger.addEventListener('click', () => {
        nav.classList.toggle('active');
        const expanded = hamburger.getAttribute('aria-expanded') === 'true';
        hamburger.setAttribute('aria-expanded', String(!expanded));
        hamburger.classList.toggle('active', !expanded);
      });
    }

    document.querySelectorAll('.nav-menu .submenu-toggle').forEach(button => {
      button.addEventListener('click', () => {
        const parent = button.parentElement;
        const opening = !parent.classList.contains('submenu-active');
        this.closeSubmenus(parent);
        parent.classList.toggle('submenu-active', opening);
        button.setAttribute('aria-expanded', String(opening));
      });
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768) {
        const nav = document.querySelector('.nav');
        const hamburger = document.getElementById('hamburger');

        if (nav && hamburger && !nav.contains(e.target) && !hamburger.contains(e.target)) {
          nav.classList.remove('active');
          hamburger.setAttribute('aria-expanded', 'false');
          hamburger.classList.remove('active');

          // Close all submenus
          this.closeSubmenus();
        }
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      nav?.classList.remove('active');
      hamburger?.setAttribute('aria-expanded', 'false');
      hamburger?.classList.remove('active');
      this.closeSubmenus();
      hamburger?.focus();
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        const nav = document.querySelector('.nav');
        const hamburger = document.getElementById('hamburger');

        if (nav && hamburger) {
          nav.classList.remove('active');
          hamburger.setAttribute('aria-expanded', 'false');
          hamburger.classList.remove('active');

          // Close all submenus
          this.closeSubmenus();
        }
      }
    });
  },

  closeSubmenus(except = null) {
    document.querySelectorAll('.nav-menu .has-submenu').forEach(item => {
      if (item === except) return;
      item.classList.remove('submenu-active');
      item.querySelector('.submenu-toggle')?.setAttribute('aria-expanded', 'false');
    });
  },

  enhancePage(basePath) {
    initAnalytics();
    this.enhanceFooter(basePath);
    this.enhanceAccordions();
    this.enhanceTabs();
    this.enhanceExternalLinks();

    const observer = new MutationObserver((mutations) => {
      if (!mutations.some(mutation => mutation.addedNodes.length)) return;
      this.enhanceTabs();
      this.enhanceAccordions();
      this.enhanceExternalLinks();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  },

  enhanceFooter(basePath) {
    const footer = document.querySelector('.footer-content');
    if (!footer) return;

    if (!footer.querySelector('.footer-links')) {
      const links = document.createElement('nav');
      links.className = 'footer-links';
      links.setAttribute('aria-label', 'Site information');
      links.innerHTML = `
        <a href="${basePath}about.html">Case Study</a>
        <a href="${basePath}privacy.html">Privacy</a>
        <a href="${basePath}accessibility.html">Accessibility</a>
        <button type="button" class="footer-preferences" data-analytics-preferences>Analytics preferences</button>
      `;
      const disclaimer = footer.querySelector('.disclaimer');
      footer.insertBefore(links, disclaimer || footer.firstChild);
    }

    const disclaimer = footer.querySelector('.disclaimer');
    if (disclaimer) {
      disclaimer.innerHTML = disclaimer.innerHTML.replace('informative purposes', 'informational purposes');
    }
    const copyright = footer.querySelector('.copyright');
    if (copyright) {
      copyright.innerHTML = copyright.innerHTML
        .replace(/Copyright ©2003,\s*2025/, 'Copyright ©2003–2026')
        .replace('Website design by', 'Designed and developed by');
    }
  },

  enhanceExternalLinks() {
    document.querySelectorAll('a[target="_blank"]').forEach(link => {
      const rel = new Set((link.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
      rel.add('noopener');
      rel.add('noreferrer');
      link.setAttribute('rel', [...rel].join(' '));
      if (!link.getAttribute('aria-label') && link.getAttribute('title')) {
        link.setAttribute('aria-label', link.getAttribute('title'));
      }
    });
  },

  enhanceAccordions() {
    document.querySelectorAll('input[type="checkbox"][id]').forEach(input => {
      const label = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
      if (!label || label.dataset.a11yAccordion === 'true') return;
      const section = input.closest('section');
      const panel = label.nextElementSibling;
      if (!panel || (!section && !panel.classList.contains('alert-details'))) return;

      if (!panel.id) panel.id = `${input.id}-panel`;
      label.dataset.a11yAccordion = 'true';
      label.setAttribute('role', 'button');
      label.setAttribute('tabindex', '0');
      label.setAttribute('aria-controls', panel.id);
      const sync = () => {
        label.setAttribute('aria-expanded', String(input.checked));
        if (input.checked) this.hydrateLazyAssets(panel);
      };
      input.addEventListener('change', sync);
      label.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        input.click();
      });
      sync();
    });

    document.querySelectorAll('section.section-title > div:first-child').forEach(title => {
      title.setAttribute('role', 'heading');
      title.setAttribute('aria-level', '2');
    });
  },

  panelIdForInput(inputId) {
    const sharedPanels = {
      'tab-temp': 'nc-county-map',
      'tab-wind': 'nc-county-map',
      'tab-gusts': 'nc-county-map',
      'tab-humidity': 'nc-county-map',
      'tab-dewpoint': 'nc-county-map',
      'graphics-two-day': 'two-day-panel',
      'graphics-seven-day': 'seven-day-panel',
      'graphics-surface': 'surface-panel',
      'text-two': 'two-text-panel',
      'text-two-spanish': 'two-spanish-panel',
      'text-discussion': 'discussion-panel',
      'text-summary': 'summary-panel',
      'meteogram-now': 'meteogram-chart-container',
      'meteogram-24': 'meteogram-chart-container',
      'meteogram-48': 'meteogram-chart-container',
      'meteogram-72': 'meteogram-chart-container',
      'meteogram-96': 'meteogram-chart-container'
    };
    if (sharedPanels[inputId]) return sharedPanels[inputId];
    const direct = inputId.replace(/-tab$/, '-panel');
    return document.getElementById(direct) ? direct : '';
  },

  hydrateLazyAssets(container) {
    if (!container) return;
    container.querySelectorAll('[data-src]').forEach(asset => {
      const tabPanel = asset.closest('[role="tabpanel"]');
      if (tabPanel) {
        const selectedTab = document.querySelector(`[role="tab"][aria-controls="${CSS.escape(tabPanel.id)}"][aria-selected="true"]`);
        if (!selectedTab) return;
      }
      asset.setAttribute('src', asset.dataset.src);
      asset.removeAttribute('data-src');
    });
    container.querySelectorAll('[data-srcset]').forEach(asset => {
      const tabPanel = asset.closest('[role="tabpanel"]');
      if (tabPanel) {
        const selectedTab = document.querySelector(`[role="tab"][aria-controls="${CSS.escape(tabPanel.id)}"][aria-selected="true"]`);
        if (!selectedTab) return;
      }
      asset.setAttribute('srcset', asset.dataset.srcset);
      asset.removeAttribute('data-srcset');
    });
  },

  enhanceTabs() {
    document.querySelectorAll('[role="tablist"]').forEach((tablist, listIndex) => {
      const tabs = [...tablist.querySelectorAll('[role="tab"]')];
      if (!tabs.length) return;

      const sync = () => {
        tabs.forEach((tab, index) => {
          const inputId = tab.getAttribute('for');
          const input = inputId ? document.getElementById(inputId) : null;
          const selected = input ? input.checked : tab.getAttribute('aria-selected') === 'true';
          if (!tab.id) tab.id = `tab-${listIndex}-${index}`;
          tab.setAttribute('aria-selected', String(selected));
          tab.setAttribute('tabindex', selected ? '0' : '-1');
          const panelId = inputId ? this.panelIdForInput(inputId) : tab.getAttribute('aria-controls');
          if (panelId && document.getElementById(panelId)) {
            tab.setAttribute('aria-controls', panelId);
            if (selected) document.getElementById(panelId).setAttribute('aria-labelledby', tab.id);
            if (selected) this.hydrateLazyAssets(document.getElementById(panelId));
          }
        });
      };

      tabs.forEach((tab, index) => {
        if (tab.dataset.a11yTab === 'true') return;
        tab.dataset.a11yTab = 'true';
        const inputId = tab.getAttribute('for');
        const input = inputId ? document.getElementById(inputId) : null;
        input?.addEventListener('change', sync);
        tab.addEventListener('keydown', event => {
          const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', ' '];
          if (!keys.includes(event.key)) return;
          event.preventDefault();
          let targetIndex = index;
          if (event.key === 'ArrowLeft') targetIndex = (index - 1 + tabs.length) % tabs.length;
          if (event.key === 'ArrowRight') targetIndex = (index + 1) % tabs.length;
          if (event.key === 'Home') targetIndex = 0;
          if (event.key === 'End') targetIndex = tabs.length - 1;
          const target = tabs[targetIndex];
          const targetInput = target.getAttribute('for') ? document.getElementById(target.getAttribute('for')) : null;
          targetInput ? targetInput.click() : target.click();
          target.focus();
          sync();
        });
      });
      sync();
    });
  },

  /**
   * Add a new menu item
   * @param {Object} item - Menu item object {text, href, hasSubmenu?, submenu?}
   * @param {number} position - Position to insert (optional, defaults to end)
   */
  addMenuItem(item, position = null) {
    if (position !== null && position >= 0 && position < this.navData.menuItems.length) {
      this.navData.menuItems.splice(position, 0, item);
    } else {
      this.navData.menuItems.push(item);
    }
  },

  /**
   * Remove a menu item by text
   * @param {string} text - Text of the menu item to remove
   */
  removeMenuItem(text) {
    this.navData.menuItems = this.navData.menuItems.filter(item => item.text !== text);
  },

  /**
   * Update a menu item
   * @param {string} text - Current text of the menu item
   * @param {Object} newItem - New menu item data
   */
  updateMenuItem(text, newItem) {
    const index = this.navData.menuItems.findIndex(item => item.text === text);
    if (index !== -1) {
      this.navData.menuItems[index] = newItem;
    }
  }
};
