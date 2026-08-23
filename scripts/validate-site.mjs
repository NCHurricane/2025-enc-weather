import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import {
  initTropicalCompatibility,
  tropicalCompatibilityTarget,
} from '../js/modules/tropicalCompatibility.js';
import { validateTropicalStormManifest } from '../js/modules/tropicalMapEngine.js';

const root = process.cwd();
const excludedDirectories = new Set(['.git', 'node_modules', 'logs', 'output']);
const excludedFiles = new Set(['index_update.html']);
const errors = [];
const counts = { html: 0, json: 0, references: 0 };

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (!excludedFiles.has(entry.name)) files.push(absolute);
  }
  return files;
}

function localTarget(documentPath, reference) {
  if (!reference || /^(?:[a-z]+:|\/\/|#)/i.test(reference)) return null;
  const clean = reference.split('#')[0].split('?')[0];
  if (!clean || clean.includes('${') || clean.includes('{{')) return null;
  if (clean.startsWith('/')) return path.resolve(root, `.${clean}`);
  return path.resolve(path.dirname(documentPath), decodeURIComponent(clean));
}

async function targetExists(target) {
  try {
    const info = await stat(target);
    if (info.isFile()) return true;
    if (info.isDirectory()) {
      const index = await stat(path.join(target, 'index.html')).catch(() => null);
      return Boolean(index?.isFile());
    }
    return false;
  } catch {
    return false;
  }
}

const files = await walk(root);

for (const file of files) {
  const relative = path.relative(root, file).replaceAll('\\', '/');

  if (file.endsWith('.json') || file.endsWith('.webmanifest')) {
    counts.json += 1;
    try {
      JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
    } catch (error) {
      errors.push(`${relative}: invalid JSON (${error.message})`);
    }
  }

  if (!file.endsWith('.html')) continue;
  counts.html += 1;
  const html = await readFile(file, 'utf8');
  const activeHtml = html.replace(/<!--[\s\S]*?-->/g, '');

  for (const match of activeHtml.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      JSON.parse(match[1].replace(/^\uFEFF/, '').trim());
    } catch (error) {
      errors.push(`${relative}: invalid JSON-LD (${error.message})`);
    }
  }

  const ids = [...activeHtml.matchAll(/\sid=["']([^"']+)["']/gi)].map(match => match[1]);
  for (const id of new Set(ids.filter((value, index) => ids.indexOf(value) !== index))) {
    errors.push(`${relative}: duplicate id "${id}"`);
  }

  const isHomeWeatherMap = relative === 'index.html';
  const isCountyWeatherMap = /^counties\/[^/]+\/index\.html$/.test(relative);
  if (isHomeWeatherMap || isCountyWeatherMap) {
    for (const requiredId of [
      'temperature-timestamp',
      'radar-timestamp',
      'radar-frame-indicator',
      'satellite-timestamp',
      'satellite-frame-indicator',
    ]) {
      if (!ids.includes(requiredId)) {
        errors.push(`${relative}: weather map status contract is missing #${requiredId}`);
      }
    }
  }
  if (isCountyWeatherMap
      && !activeHtml.includes('Select a station marker for details. Scroll to zoom, or use the map controls.')) {
    errors.push(`${relative}: county Conditions map instructions are missing`);
  }
  if (relative === 'tropical.html') {
    for (const requiredId of [
      'tropical-map-timestamp',
      'tropical-satellite-timestamp',
      'tropical-satellite-frame-indicator',
    ]) {
      if (!ids.includes(requiredId)) {
        errors.push(`${relative}: Tropical map status contract is missing #${requiredId}`);
      }
    }
  }

  for (const match of activeHtml.matchAll(/\s(?:href|src|data-src)=["']([^"']+)["']/gi)) {
    const target = localTarget(file, match[1]);
    if (!target) continue;
    counts.references += 1;
    if (!(await targetExists(target))) {
      errors.push(`${relative}: missing local reference ${match[1]}`);
    }
  }
}

const robots = await readFile(path.join(root, 'robots.txt'), 'utf8').catch(() => '');
if (!robots.includes('Sitemap: https://nchurricane.com/sitemap.xml')) {
  errors.push('robots.txt: production sitemap declaration missing');
}

const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8').catch(() => '');
if (!sitemap.includes('<urlset') || !sitemap.includes('https://nchurricane.com/')) {
  errors.push('sitemap.xml: expected URL set missing');
}

const navigation = await readFile(path.join(root, 'js', 'modules', 'navigation.js'), 'utf8').catch(() => '');
if (!navigation.includes('{ text: "Tropical", href: "tropical.html?basin=atl" }')) {
  errors.push('js/modules/navigation.js: Tropical navigation must select the canonical Atlantic overview');
}

const canonicalTropicalEntries = sitemap.match(/https:\/\/nchurricane\.com\/tropical<\/loc>/g) || [];
if (canonicalTropicalEntries.length !== 1 || /nchurricane\.com\/tropical_(?:at|ep)/.test(sitemap)) {
  errors.push('sitemap.xml: only the unified Tropical canonical URL may be listed');
}

const htaccess = await readFile(path.join(root, '.htaccess'), 'utf8').catch(() => '');
for (const [legacy, basin] of [['tropical_at', 'atl'], ['tropical_ep', 'epac']]) {
  const rule = `RewriteRule ^${legacy}(?:\\.html)?$ https://nchurricane.com/tropical?basin=${basin} [L,R=301,NE]`;
  if (!htaccess.includes(rule)) errors.push(`.htaccess: missing ${legacy} compatibility redirect`);
}

const targetChecks = [
  [
    tropicalCompatibilityTarget('http://127.0.0.1:8086/tropical_at.html?source=legacy#map', 'atl'),
    '/tropical.html?source=legacy&basin=atl#map',
    'Atlantic compatibility URL state',
  ],
  [
    tropicalCompatibilityTarget('https://nchurricane.com/tropical_ep.html?basin=atl', 'epac'),
    '/tropical.html?basin=epac',
    'Eastern Pacific compatibility basin',
  ],
  [
    tropicalCompatibilityTarget('https://nchurricane.com/tropical_at.html', 'cpac'),
    '',
    'unsupported compatibility basin',
  ],
];
for (const [actual, expected, label] of targetChecks) {
  if (actual !== expected) errors.push(`tropicalCompatibility.js: incorrect ${label}`);
}

const replacements = [];
const initialized = initTropicalCompatibility({
  documentRef: { body: { dataset: { tropicalCompatibilityBasin: 'epac' } } },
  windowRef: {
    location: {
      href: 'https://nchurricane.com/tropical_ep.html?source=bookmark#overview',
      replace: (url) => replacements.push(url),
    },
  },
});
if (!initialized || replacements.length !== 1 || replacements[0] !== '/tropical.html?source=bookmark&basin=epac#overview') {
  errors.push('tropicalCompatibility.js: compatibility navigation must replace browser history');
}

const stormManifest = {
  schemaVersion: '1.0.0',
  kind: 'tropical-storm-map',
  stormId: 'CP012026',
  stormState: 'live',
  state: 'partial',
  products: {
    currentPosition: { state: 'fresh', file: 'current-position.geojson' },
    bestTrack: { state: 'not-issued', file: null },
    surgeWarnings: { state: 'unavailable', file: null },
  },
};
try {
  validateTropicalStormManifest(stormManifest, 'CP012026');
  validateTropicalStormManifest({ ...stormManifest, stormId: 'AL052025' }, 'AL052025');
} catch (error) {
  errors.push(`tropicalMapEngine.js: valid detailed storm manifest rejected (${error.message})`);
}
try {
  validateTropicalStormManifest(stormManifest, 'AL052025');
  errors.push('tropicalMapEngine.js: detailed storm manifest identity mismatch was accepted');
} catch {
  // Expected exact-storm rejection.
}

const activePage = await readFile(path.join(root, 'active', 'index.html'), 'utf8').catch(() => '');
for (const required of [
  'id="active-storm-map"',
  'data-storm-layer="bestTrack"',
  'data-storm-layer="surgeWarnings"',
  'data-storm-layer="windRadii34"',
  'data-active-tab-group="storm"',
  'data-active-tab-group="nhc"',
  'data-active-tab-group="wind"',
  'id="active-map-imagery-source"',
  'id="active-satellite-frame-scrubber"',
  'id="active-satellite-frame-indicator"',
  'id="key-messages-section"',
  'activeStormMap.js?v=',
  'activeStormWorkspace.js?v=',
  'leaflet@1.9.4/dist/leaflet.js',
  'ariaLabel: \'NCHurricane home\'',
]) {
  if (!activePage.includes(required)) errors.push(`active/index.html: missing Phase 5 contract ${required}`);
}
if (activePage.includes('id="glass-distortion"') || !activePage.includes('id="main-content"')) {
  errors.push('active/index.html: old distortion filter remains or accessible main target is missing');
}
if (activePage.includes('src="./js/satellite.js')) {
  errors.push('active/index.html: standalone satellite controller must not compete with the combined map controller');
}
if (/tropical-banner(?:-ep)?\.js|initTropicalBanner(?:EP)?/i.test(activePage)) {
  errors.push('active/index.html: unused legacy tropical banner initialization must not run in the Active shell');
}
const activeStaticSkipLinks = activePage.match(/\bclass=["'][^"']*\bskip-link\b[^"']*["']/gi) || [];
const navigationSkipLinks = navigation.match(/\bclass=["'][^"']*\bskip-link\b[^"']*["']/gi) || [];
if (activeStaticSkipLinks.length !== 0 || navigationSkipLinks.length !== 1) {
  errors.push('active/index.html: Active shell must use exactly one navigation-owned skip link');
}
if (/active-map-status-row|active-storm-map-status|active-satellite-timestamp/.test(activePage)) {
  errors.push('active/index.html: retired Active map status row must not remain');
}

const activeCss = await readFile(path.join(root, 'active', 'css', 'active.css'), 'utf8').catch(() => '');
const retiredActiveImageRule = activeCss.match(
  /\.active-storm-map-section\s+\.active-satellite-image-container\s*\{[^}]*}/is,
)?.[0] || '';
if (/\.is-satellite-fallback\s+#active-storm-map\s*\{[^}]*visibility\s*:\s*hidden/is.test(activeCss)
    || !/display\s*:\s*none/i.test(retiredActiveImageRule)) {
  errors.push('active/css/active.css: satellite fallback must preserve the map and keep the retired image inset hidden');
}
if (/\.active-map-status-row|\.active-satellite-timestamp/.test(activeCss)) {
  errors.push('active/css/active.css: retired Active map status-row styling must not remain');
}

const stormController = await readFile(path.join(root, 'active', 'js', 'activeStormMap.js'), 'utf8').catch(() => '');
if (!stormController.includes('mode: \'storm\'')
    || !stormController.includes('./storms/${encodeURIComponent(normalized)}/map/manifest.json')
    || !stormController.includes('mapInstance: this.engine.map')
    || !stormController.includes('tropicalSatelliteSource')
    || !stormController.includes('SatelliteFallbackDialog')
    || !stormController.includes('animationUrl: this.floaterUrl(productKey)')) {
  errors.push('active/js/activeStormMap.js: detailed mode, shared satellite composition, or click-to-load floater fallback is missing');
}
if (/active-storm-map-status|active-satellite-timestamp|this\.timestamp/.test(stormController)) {
  errors.push('active/js/activeStormMap.js: retired Active map status-row wiring must not remain');
}

const satelliteSources = await readFile(path.join(root, 'js', 'modules', 'satelliteTileSources.js'), 'utf8').catch(() => '');
if (!satelliteSources.includes('/wmts/epsg3857/best')
    || !satelliteSources.includes('fallbackSources: [')
    || !satelliteSources.includes('realearth.ssec.wisc.edu/tiles')) {
  errors.push('satelliteTileSources.js: GIBS WMTS primary or RealEarth tile fallback contract is missing');
}

const satelliteFallbackDialog = await readFile(path.join(root, 'js', 'modules', 'satelliteFallbackDialog.js'), 'utf8').catch(() => '');
if (!satelliteFallbackDialog.includes("this.image.src = this.config.animationUrl")
    || !satelliteFallbackDialog.includes("this.image.removeAttribute('src')")
    || !satelliteFallbackDialog.includes('this.dialog.showModal()')) {
  errors.push('satelliteFallbackDialog.js: NOAA STAR animation must load only after the dialog is opened');
}

const tropicalSatelliteController = await readFile(path.join(root, 'js', 'modules', 'tropicalSatelliteMap.js'), 'utf8').catch(() => '');
const countyWeatherMaps = await readFile(path.join(root, 'counties', 'js', 'weatherMaps.js'), 'utf8').catch(() => '');
const countyWeatherCenter = await readFile(path.join(root, 'counties', 'js', 'weatherCenter.js'), 'utf8').catch(() => '');
for (const [file, source] of [
  ['tropicalSatelliteMap.js', tropicalSatelliteController],
  ['counties/js/weatherMaps.js', countyWeatherMaps],
]) {
  if (!source.includes('createGibsWmtsSatelliteSource')
      || !source.includes('withRealEarthFallback')
      || !source.includes('SatelliteFallbackDialog')) {
    errors.push(`${file}: shared satellite provider or click-to-load fallback composition is missing`);
  }
}
if (/\b(?:radar|satellite)-map-note\b/.test(countyWeatherMaps)) {
  errors.push('counties/js/weatherMaps.js: removed Radar/Satellite map notes must not remain runtime dependencies');
}
if (!countyWeatherCenter.includes('NWS observations · Latest')) {
  errors.push('counties/js/weatherCenter.js: Conditions map status must identify its observation source');
}

const workspaceController = await readFile(path.join(root, 'active', 'js', 'activeStormWorkspace.js'), 'utf8').catch(() => '');
for (const required of ['popstate', 'ArrowRight', 'nch:active-alerts-state', 'nch:active-workspace-panel-change']) {
  if (!workspaceController.includes(required)) {
    errors.push(`active/js/activeStormWorkspace.js: missing responsive tab contract ${required}`);
  }
}

const stormReader = await readFile(path.join(root, 'active', 'js', 'storm.js'), 'utf8').catch(() => '');
if (!stormReader.includes('/^(?:AL|EP|CP)\\d{2}\\d{4}$/')
    || !stormReader.includes('nch:active-storm-ready')
    || !stormReader.includes('activeStorm?.binNumber')) {
  errors.push('active/js/storm.js: AL/EP/CP validation or map-ready handoff is missing');
}

const tropicalMapLib = await readFile(path.join(root, 'active', 'api', 'tropical_map_lib.php'), 'utf8').catch(() => '');
for (const product of ['best-track.geojson', 'surge-warnings.geojson', 'wind-radii.geojson']) {
  if (!tropicalMapLib.includes(product)) errors.push(`tropical_map_lib.php: ${product} publisher is missing`);
}

const pacificWriterCommon = await readFile(path.join(root, 'active', 'api', 'pacific_writer_common.php'), 'utf8').catch(() => '');
if (!pacificWriterCommon.includes("isset($payload['activeStorms'])")
    || !pacificWriterCommon.includes("isset($payload['data']['activeStorms'])")) {
  errors.push('pacific_writer_common.php: official and retained current-storm schemas must both be normalized');
}
for (const [filename, implementation] of [
  ['advisory_writer_cp.php', 'advisory_writer_ep.php'],
  ['cxml_writer_cp.php', 'cxml_writer_ep.php'],
  ['tcv_writer_cp.php', 'tcv_writer_ep.php'],
]) {
  const writer = await readFile(path.join(root, 'active', 'api', filename), 'utf8').catch(() => '');
  if (!writer.includes("define('NCH_PACIFIC_BASIN', 'CP')")
      || !writer.includes("define('NCH_PACIFIC_REMOTE_STORMS_FIRST', true)")
      || !writer.includes(`require __DIR__ . '/${implementation}'`)) {
    errors.push(`${filename}: Central Pacific basin, live-feed, or shared implementation contract is missing`);
  }
}
const pacificTcvWriter = await readFile(path.join(root, 'active', 'api', 'tcv_writer_ep.php'), 'utf8').catch(() => '');
if (!pacificTcvWriter.includes('issuedby=HFO&product=TCV')
    || !pacificTcvWriter.includes('nch_classify_tcv')) {
  errors.push('tcv_writer_ep.php: Central Pacific HFO source or explicit product-state gate is missing');
}
const cpGraphicsWriter = await readFile(path.join(root, 'active', 'api', 'nhc_graphics_cache_cp.php'), 'utf8').catch(() => '');
if (!cpGraphicsWriter.includes("define('NCH_GRAPHICS_BASIN', 'CP')")
    || !cpGraphicsWriter.includes("require __DIR__ . '/nhc_graphics_cache_ep.php'")) {
  errors.push('nhc_graphics_cache_cp.php: Central Pacific graphics-cache wrapper is missing');
}
const textProductsCache = await readFile(path.join(root, 'active', 'api', 'text_products_cache.php'), 'utf8').catch(() => '');
if (!textProductsCache.includes("['AL' => 'AT', 'EP' => 'EP', 'CP' => 'CP']")
    || !textProductsCache.includes("$storm['binNumber']")) {
  errors.push('text_products_cache.php: Central Pacific bin-number routing is missing');
}
const stormText = await readFile(path.join(root, 'active', 'js', 'storm_text.js'), 'utf8').catch(() => '');
if (!stormText.includes("if (stormId.startsWith('CP')) return 'CP'")
    || !stormText.includes('storm?.binNumber')) {
  errors.push('active/js/storm_text.js: Central Pacific text-product routing is missing');
}
const stormGraphics = await readFile(path.join(root, 'active', 'js', 'storm-graphics.js'), 'utf8').catch(() => '');
if (!stormGraphics.includes("CP: 'CP'")
    || !stormGraphics.includes('graphics-manifest.json')
    || !stormGraphics.includes("state === 'available'")) {
  errors.push('active/js/storm-graphics.js: Central Pacific routing or graphics-manifest gating is missing');
}
const mtcswaFetcher = await readFile(path.join(root, 'active', 'api', 'mtcswa_fetcher.php'), 'utf8').catch(() => '');
if (!mtcswaFetcher.includes("$basin === 'CP'") || !mtcswaFetcher.includes("'Central Pacific'")) {
  errors.push('active/api/mtcswa_fetcher.php: Central Pacific storm routing is missing');
}

for (const [filename, basin, label] of [
  ['tropical_at.html', 'atl', 'Atlantic'],
  ['tropical_ep.html', 'epac', 'Eastern Pacific'],
]) {
  const html = await readFile(path.join(root, filename), 'utf8').catch(() => '');
  if (html.length >= 10000) errors.push(`${filename}: compatibility entry should remain minimal`);
  if (!html.includes('<meta name="robots" content="noindex, follow" />')) {
    errors.push(`${filename}: compatibility entry must not be independently indexed`);
  }
  if (!html.includes('<link rel="canonical" href="https://nchurricane.com/tropical" />')
      || !html.includes('<meta property="og:url" content="https://nchurricane.com/tropical" />')) {
    errors.push(`${filename}: canonical and Open Graph URLs must use the unified Tropical route`);
  }
  if (!html.includes(`data-tropical-compatibility-basin="${basin}"`)
      || !html.includes(`href="tropical.html?basin=${basin}"`)) {
    errors.push(`${filename}: compatibility basin and visible fallback link do not match`);
  }
  if (!html.includes('<a class="skip-link" href="#main-content">Skip to main content</a>')
      || !html.includes('aria-label="NCHurricane home"')
      || !/site-wordmark-name">NCHurric<[\s\S]*fa-solid fa-hurricane[\s\S]*site-wordmark-wx">ne</.test(html)) {
    errors.push(`${filename}: accessible skip link or Tropical wordmark is missing`);
  }
  if (!html.includes(`Continue to ${label} Tropical Weather`)) {
    errors.push(`${filename}: accessible fallback label is missing`);
  }
  if (!html.includes('tropicalCompatibility.js?v=')
      || /http-equiv="refresh"|active\/js\/tropical(?:_ep)?\.js|tropical-banner(?:-ep)?\.js/i.test(html)) {
    errors.push(`${filename}: compatibility navigation must use only the shared replace helper`);
  }
}

for (const file of files.filter(file => file.endsWith('.html'))) {
  if (['tropical_at.html', 'tropical_ep.html'].includes(path.basename(file))) continue;
  const html = await readFile(file, 'utf8');
  if (/href=["'][^"']*tropical_(?:at|ep)(?:\.html)?/i.test(html)) {
    errors.push(`${path.relative(root, file).replaceAll('\\', '/')}: legacy Tropical internal link remains`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Validated ${counts.html} HTML files, ${counts.json} JSON files, and ${counts.references} local references.`);
