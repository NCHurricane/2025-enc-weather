// =============================
// Navigation Module - js/modules/navigation.js
// Centralized navigation management for NCHurricane.com
// Handles dynamic generation of header navigation and events
// =============================

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
      {
        text: "Tropical",
        href: "#",
        hasSubmenu: true,
        submenu: [
          { text: "Atlantic", href: "tropical_at.html" },
          { text: "Pacific", href: "tropical_ep.html" },
        ]
      },
    ]
  },

  /**
   * Generate navigation HTML
   * @param {string} basePath - Base path for relative links (e.g., './', '../../')
   * @returns {string} Complete header HTML
   */
  generateNavigation(basePath = '') {
    const { logo, menuItems } = this.navData;

    const menuHTML = menuItems.map(item => {
      if (item.hasSubmenu) {
        const submenuHTML = item.submenu.map(subItem =>
          `<li><a href="${basePath}${subItem.href}">${subItem.text}</a></li>`
        ).join('');

        return `
          <li class="has-submenu">
            <a href="${item.href}" aria-haspopup="true" aria-expanded="false">${item.text}</a>
            <ul class="submenu">${submenuHTML}</ul>
          </li>
        `;
      }
      return `<li><a href="${basePath}${item.href}">${item.text}</a></li>`;
    }).join('');

    return `
      <header class="header">
        <div class="header-container">
          <a href="${basePath}index.html" class="logo-link" aria-label="Home">
            <img src="${basePath}${logo.src}" alt="${logo.alt}" />
          </a>
          <nav class="nav" aria-label="Main navigation">
            <ul class="nav-menu">${menuHTML}</ul>
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
      this.bindEvents();
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
        hamburger.setAttribute('aria-expanded', !expanded);
      });
    }

    // Submenu toggle for mobile
    document.querySelectorAll('.nav-menu .has-submenu > a').forEach(link => {
      link.addEventListener('click', (e) => {
        // Only prevent default and toggle on mobile
        if (window.innerWidth <= 768) {
          e.preventDefault();
          const parent = link.parentElement;
          parent.classList.toggle('submenu-active');

          // Close other submenus
          document.querySelectorAll('.nav-menu .has-submenu').forEach(item => {
            if (item !== parent) {
              item.classList.remove('submenu-active');
            }
          });
        }
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

          // Close all submenus
          document.querySelectorAll('.nav-menu .has-submenu').forEach(item => {
            item.classList.remove('submenu-active');
          });
        }
      }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        const nav = document.querySelector('.nav');
        const hamburger = document.getElementById('hamburger');

        if (nav && hamburger) {
          nav.classList.remove('active');
          hamburger.setAttribute('aria-expanded', 'false');

          // Close all submenus
          document.querySelectorAll('.nav-menu .has-submenu').forEach(item => {
            item.classList.remove('submenu-active');
          });
        }
      }
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