import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import {
  initTropicalCompatibility,
  tropicalCompatibilityTarget,
} from '../js/modules/tropicalCompatibility.js';

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
