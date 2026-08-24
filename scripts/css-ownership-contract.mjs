export const leafletContract = Object.freeze({
  version: '1.9.4',
  vendorRoot: 'vendor/leaflet/1.9.4',
  sourceUrl: 'https://registry.npmjs.org/leaflet/-/leaflet-1.9.4.tgz',
  sourceSha256: '84c65a256e50657896f54c33bd857b6849ebe94c817803be818bf32a3dde0b77',
  license: 'BSD-2-Clause',
  cssIntegrity: 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=',
  jsIntegrity: 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=',
  assets: Object.freeze({
    LICENSE: '53e8dc25862014e4324741ca18fbe3611e11d42ef69f59f86ea8c5389647d4cb',
    'leaflet.css': 'a7837102824184820dfa198d1ebcd109ff6d0ff9a2672a074b9a1b4d147d04c6',
    'leaflet.js': 'db49d009c841f5ca34a888c96511ae936fd9f5533e90d8b2c4d57596f4e5641a',
    'leaflet.js.map': '600a10dc5cd110de0699510d322afcbe01c7ca90b4c5f48adc20314c70aac753',
    'images/layers-2x.png': '066daca850d8ffbef007af00b06eac0015728dee279c51f3cb6c716df7c42edf',
    'images/layers.png': '1dbbe9d028e292f36fcba8f8b3a28d5e8932754fc2215b9ac69e4cdecf5107c6',
    'images/marker-icon-2x.png': '00179c4c1ee830d3a108412ae0d294f55776cfeb085c60129a39aa6fc4ae2528',
    'images/marker-icon.png': '574c3a5cca85f4114085b6841596d62f00d7c892c7b03f28cbfa301deb1dc437',
    'images/marker-shadow.png': '264f5c640339f042dd729062cfc04c17f8ea0f29882b538e3848ed8f10edb4da',
  }),
  consumers: Object.freeze([
    {
      file: 'index.html',
      css: 'vendor/leaflet/1.9.4/leaflet.css',
      js: 'vendor/leaflet/1.9.4/leaflet.js',
      stylesheetOrder: [
        'vendor/leaflet/1.9.4/leaflet.css',
        'css/styles.css',
        'css/components.css',
        'css/interactive-weather-map.css',
        'counties/css/county.css',
        'css/home.css',
      ],
    },
    {
      file: 'tropical.html',
      css: 'vendor/leaflet/1.9.4/leaflet.css',
      js: 'vendor/leaflet/1.9.4/leaflet.js',
      stylesheetOrder: [
        'vendor/leaflet/1.9.4/leaflet.css',
        'css/styles.css',
        'css/components.css',
        'css/interactive-weather-map.css',
        'css/tropical-map-engine.css',
        'counties/css/county.css',
        'css/tropical.css',
      ],
    },
    {
      file: 'active/index.html',
      css: '../vendor/leaflet/1.9.4/leaflet.css',
      js: '../vendor/leaflet/1.9.4/leaflet.js',
      stylesheetOrder: [
        '../vendor/leaflet/1.9.4/leaflet.css',
        '../css/styles.css',
        '../css/components.css',
        '../css/interactive-weather-map.css',
        '../css/tropical-map-engine.css',
        '../counties/css/county.css',
        './css/active.css',
        './css/storm-graphics.css',
      ],
    },
    ...[
      'beaufort',
      'bertie',
      'dare',
      'hyde',
      'martin',
      'pitt',
      'san-diego',
      'tyrrell',
      'washington',
    ].map(county => ({
      file: `counties/${county}/index.html`,
      css: '../../vendor/leaflet/1.9.4/leaflet.css',
      js: '../../vendor/leaflet/1.9.4/leaflet.js',
      stylesheetOrder: [
        '../../vendor/leaflet/1.9.4/leaflet.css',
        '../../css/styles.css',
        '../../css/components.css',
        '../../css/interactive-weather-map.css',
        '../css/county.css',
      ],
    })),
    {
      file: 'counties/bertie/index_test.html',
      css: '../../vendor/leaflet/1.9.4/leaflet.css',
      js: '../../vendor/leaflet/1.9.4/leaflet.js',
      stylesheetOrder: [
        '../../vendor/leaflet/1.9.4/leaflet.css',
        '../../css/styles.css',
        '../../css/components.css',
        '../../css/interactive-weather-map.css',
        '../css/county.css',
      ],
    },
    {
      file: 'test/tropical-map/phase2-harness.html',
      css: '../../vendor/leaflet/1.9.4/leaflet.css',
      js: '../../vendor/leaflet/1.9.4/leaflet.js',
      stylesheetOrder: [
        '../../vendor/leaflet/1.9.4/leaflet.css',
        '../../css/tropical-map-engine.css',
        'phase2-harness.css',
      ],
    },
  ]),
});

const countyPages = Object.freeze([
  'beaufort',
  'bertie',
  'dare',
  'hyde',
  'martin',
  'pitt',
  'san-diego',
  'tyrrell',
  'washington',
].map(county => `counties/${county}/index.html`));

const phase2Pages = [
  { file: 'index.html', body: ['site-page', 'site-page--home'], main: ['page-shell'] },
  {
    file: 'tropical.html',
    body: ['site-page', 'site-page--tropical', 'site-page--tropical-overview'],
    main: ['page-shell'],
  },
  {
    file: 'active/index.html',
    body: ['site-page', 'site-page--active'],
    bodyAttributes: ['data-active-page'],
    main: ['page-shell'],
  },
  ...countyPages.map(file => ({
    file,
    body: [
      'site-page',
      'site-page--county',
      ...(['counties/dare/index.html', 'counties/hyde/index.html', 'counties/san-diego/index.html'].includes(file)
        ? ['site-page--county-multizone']
        : []),
      ...(file === 'counties/san-diego/index.html' ? ['site-page--county-san-diego'] : []),
    ],
    main: ['page-shell'],
  })),
  ...['about.html', 'privacy.html', 'accessibility.html'].map(file => ({
    file,
    body: ['site-page', 'site-page--info'],
    main: ['page-shell', 'page-shell--info'],
  })),
  {
    file: 'counties/bertie/index_test.html',
    body: ['site-page', 'site-page--county', 'site-page--county-prototype'],
    main: ['page-shell'],
  },
  {
    file: '404.html',
    body: ['site-page', 'site-page--info', 'site-page--not-found'],
    main: ['page-shell', 'page-shell--info'],
  },
];

const phase3Version = '20260824-phase3-1';
const phase3Pages = [
  {
    file: 'index.html',
    header: ['page-header', 'page-header--weather'],
    title: ['page-title', 'page-title--weather', 'page-title--home'],
  },
  {
    file: 'tropical.html',
    header: ['page-header', 'page-header--weather'],
    title: ['page-title', 'page-title--weather', 'page-title--tropical'],
  },
  {
    file: 'active/index.html',
    header: ['page-header', 'page-header--active'],
    title: ['page-title', 'page-title--weather', 'page-title--active'],
    requiredClasses: ['page-title__meta', 'active-module__heading', 'active-module__title'],
  },
  ...countyPages.map(file => ({
    file,
    header: ['page-header', 'page-header--weather'],
    title: ['page-title', 'page-title--weather', 'page-title--county'],
    requiredClasses: ['weather-center-forecast-source-title'],
    forecastHeading: true,
  })),
  {
    file: 'counties/bertie/index_test.html',
    header: ['page-header', 'page-header--weather'],
    title: ['page-title', 'page-title--weather', 'page-title--county'],
    requiredClasses: ['weather-center-forecast-source-title'],
    forecastHeading: true,
  },
  {
    file: 'about.html',
    header: ['page-header', 'page-header--case-study'],
    title: ['page-title', 'page-title--case-study'],
    requiredClasses: ['page-header__summary', 'text-role--eyebrow', 'text-role--helper', 'text-role--meta'],
  },
  ...['privacy.html', 'accessibility.html'].map(file => ({
    file,
    header: ['page-header', 'page-header--info'],
    title: ['page-title', 'page-title--info'],
    requiredClasses: ['page-header__summary', 'text-role--eyebrow', 'text-role--helper', 'text-role--meta'],
  })),
  {
    file: '404.html',
    header: ['page-header', 'page-header--info'],
    title: ['page-title', 'page-title--info', 'page-title--not-found'],
    requiredClasses: ['page-header__summary', 'text-role--eyebrow', 'text-role--helper', 'section-heading--not-found'],
  },
];

const countyEntryPages = [...countyPages, 'counties/bertie/index_test.html'];
const countyWrapperDependencies = countyPages.map(file => {
  const county = file.split('/')[1];
  return {
    consumer: `counties/${county}/js/countyApp.js`,
    target: ['dare', 'hyde', 'san-diego'].includes(county)
      ? 'counties/js/countyApp.multizone.js'
      : 'counties/js/countyApp.js',
  };
});

const phase2Stylesheets = {
  'css/styles.css': phase2Pages.map(page => page.file),
  'css/components.css': phase2Pages.map(page => page.file),
  'counties/css/county.css': [
    'index.html',
    'tropical.html',
    'active/index.html',
    ...countyPages,
    'counties/bertie/index_test.html',
  ],
  'css/tropical.css': ['tropical.html'],
  'active/css/active.css': ['active/index.html'],
  'css/home.css': ['index.html'],
  'css/info.css': ['about.html', 'privacy.html', 'accessibility.html', '404.html'],
};

export const phase2Contract = Object.freeze({
  version: '20260824-phase2-1',
  pages: Object.freeze(phase2Pages),
  stylesheets: Object.freeze(Object.fromEntries(
    Object.entries(phase2Stylesheets).map(([file, consumers]) => [
      file,
      Object.freeze({ version: phase3Version, consumers: Object.freeze(consumers) }),
    ]),
  )),
  retiredFiles: Object.freeze([
    'index_update.html',
    'tropical_at.html',
    'tropical_ep.html',
    'css/index.css',
    'js/modules/tropicalCompatibility.js',
  ]),
  retiredClasses: Object.freeze([
    'container',
    'site-weather-page',
    'info-page',
    'weather-center-heading',
    'main-title',
    'main-title-active',
    'info-page-heading',
    'active-module-heading',
    'eyebrow',
    'hero-summary',
    'info-updated',
    'notfound-title',
  ]),
  ownershipStylesheets: Object.freeze([
    'css/styles.css',
    'css/components.css',
    'css/home.css',
    'css/info.css',
    'css/tropical.css',
    'counties/css/county.css',
    'active/css/active.css',
  ]),
  requiredGlobalTokens: Object.freeze([
    '--space-1',
    '--space-2',
    '--space-3',
    '--space-4',
    '--space-5',
    '--space-6',
    '--space-8',
    '--section-margin',
    '--section-padding',
    '--page-gutter',
    '--page-shell-fluid-size',
    '--page-shell-max',
    '--page-shell-start',
    '--page-shell-end',
    '--border-subtle',
    '--radius-md',
    '--focus-ring-color',
    '--control-target-min',
    '--duration-fast',
    '--z-header',
    '--page-title-color',
    '--page-title-size',
    '--page-title-weight',
    '--page-title-tracking',
    '--page-title-leading',
    '--page-title-shadow',
    '--section-heading-size',
    '--card-heading-size',
    '--text-helper-color',
    '--text-meta-color',
  ]),
  retiredTokens: Object.freeze([
    '--margin-section',
    '--padding-section',
    '--site-main-width',
    '--border-radius',
    '--breakpoint-sm',
    '--breakpoint-md',
    '--breakpoint-lg',
    '--component-title-color',
    '--component-title-font-size',
    '--component-title-font-weight',
    '--component-title-letter-spacing',
    '--component-title-line-height',
  ]),
  activeHook: Object.freeze({
    page: 'active/index.html',
    script: 'active/js/ww-maps.js',
    attribute: 'data-active-page',
    version: '20260824-phase2-1',
  }),
});

export const phase3Contract = Object.freeze({
  version: phase3Version,
  pages: Object.freeze(phase3Pages),
  headingClasses: Object.freeze({ h2: 'section-heading', h3: 'card-heading' }),
  inlineTitleStylePages: Object.freeze(['tropical.html', 'active/index.html']),
  navigation: Object.freeze({
    script: 'js/modules/navigation.js',
    version: phase3Version,
    consumers: Object.freeze(phase3Pages.map(page => page.file)),
  }),
  dynamicHeadingSources: Object.freeze([
    Object.freeze({
      file: 'counties/js/countyAlerts.js',
      required: Object.freeze([
        'class="section-heading county-alert-dialog__title"',
        'class="card-heading county-alert-panel__title"',
      ]),
    }),
    Object.freeze({
      file: 'js/modules/analytics.js',
      required: Object.freeze(['class="section-heading analytics-consent__title"']),
    }),
  ]),
  forbiddenNavigationPatterns: Object.freeze([
    "section.section-title > div:first-child",
    "setAttribute('role', 'heading')",
  ]),
  scriptDependencies: Object.freeze([
    Object.freeze({ consumer: 'js/modules/navigation.js', target: 'js/modules/analytics.js' }),
    Object.freeze({ consumer: 'counties/js/countyApp.js', target: 'counties/js/countyAlerts.js' }),
    Object.freeze({ consumer: 'counties/js/countyApp.multizone.js', target: 'counties/js/countyAlerts.js' }),
    ...countyWrapperDependencies.map(dependency => Object.freeze(dependency)),
    ...countyEntryPages.map(file => Object.freeze({
      consumer: file,
      target: `counties/${file.split('/')[1]}/js/countyApp.js`,
    })),
  ]),
});
