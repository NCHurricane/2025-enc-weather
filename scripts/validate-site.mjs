import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';

import { validateTropicalStormManifest } from '../js/modules/tropicalMapEngine.js';
import {
  leafletContract,
  phase2Contract,
  phase3Contract,
  phase4Contract,
  phase5Contract,
} from './css-ownership-contract.mjs';

const root = process.cwd();
const excludedDirectories = new Set(['.git', 'node_modules', 'logs', 'output']);
const errors = [];
const counts = { html: 0, json: 0, references: 0 };
const htmlByRelativePath = new Map();

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else files.push(absolute);
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
  htmlByRelativePath.set(relative, activeHtml);

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

const cleanReference = reference => reference.split('#')[0].split('?')[0];
const htmlReferences = html => [...html.matchAll(/\s(?:href|src)=['"]([^'"]+)['"]/gi)]
  .map(match => cleanReference(match[1]));
const stylesheetReferences = html => [...html.matchAll(/<link\b[^>]*>/gi)]
  .filter(match => /\brel=['"]stylesheet['"]/i.test(match[0]))
  .map(match => match[0].match(/\bhref=['"]([^'"]+)['"]/i)?.[1])
  .filter(Boolean)
  .map(cleanReference);
const stylesheetHrefs = html => [...html.matchAll(/<link\b[^>]*>/gi)]
  .filter(match => /\brel=['"]stylesheet['"]/i.test(match[0]))
  .map(match => match[0].match(/\bhref=['"]([^'"]+)['"]/i)?.[1])
  .filter(Boolean);
const tagsForReference = (html, tagName, attribute, reference) => [...html.matchAll(
  new RegExp(`<${tagName}\\b[^>]*>`, 'gi'),
)].filter(match => cleanReference(
  match[0].match(new RegExp(`\\b${attribute}=['"]([^'"]+)['"]`, 'i'))?.[1] || '',
) === reference);

const expectedLeafletConsumers = new Set(leafletContract.consumers.map(consumer => consumer.file));
const actualLeafletConsumers = new Set();
for (const [relative, html] of htmlByRelativePath) {
  if (/\b(?:href|src)=['"](?:https?:)?\/\/[^'"]*leaflet[^'"]*['"]/i.test(html)) {
    errors.push(`${relative}: remote Leaflet reference is forbidden`);
  }
  if (htmlReferences(html).some(reference => /vendor\/leaflet\/1\.9\.4\/leaflet\.(?:css|js)$/.test(reference))) {
    actualLeafletConsumers.add(relative);
  }
}

for (const consumer of leafletContract.consumers) {
  const html = htmlByRelativePath.get(consumer.file);
  if (!html) {
    errors.push(`${consumer.file}: expected Leaflet consumer is missing from validation`);
    continue;
  }

  const cssTags = tagsForReference(html, 'link', 'href', consumer.css);
  const jsTags = tagsForReference(html, 'script', 'src', consumer.js);
  if (cssTags.length !== 1) {
    errors.push(`${consumer.file}: expected exactly one local Leaflet stylesheet reference`);
  } else if (!cssTags[0][0].includes(`integrity="${leafletContract.cssIntegrity}"`)) {
    errors.push(`${consumer.file}: local Leaflet stylesheet integrity hash is missing or incorrect`);
  }
  if (jsTags.length !== 1) {
    errors.push(`${consumer.file}: expected exactly one local Leaflet script reference`);
  } else if (!jsTags[0][0].includes(`integrity="${leafletContract.jsIntegrity}"`)) {
    errors.push(`${consumer.file}: local Leaflet script integrity hash is missing or incorrect`);
  }

  const stylesheets = stylesheetReferences(html);
  const positions = consumer.stylesheetOrder.map(reference => stylesheets.indexOf(reference));
  if (positions.some(position => position === -1)
      || positions.some((position, index) => index > 0 && position <= positions[index - 1])) {
    errors.push(`${consumer.file}: stylesheets do not follow the approved Phase 1 pre-layer order`);
  }
}

for (const consumer of actualLeafletConsumers) {
  if (!expectedLeafletConsumers.has(consumer)) {
    errors.push(`${consumer}: undeclared local Leaflet consumer; update the CSS ownership contract`);
  }
}
for (const consumer of expectedLeafletConsumers) {
  if (!actualLeafletConsumers.has(consumer)) {
    errors.push(`${consumer}: missing its declared local Leaflet dependency`);
  }
}

const phase2HtmlByRelativePath = new Map(htmlByRelativePath);
for (const page of phase2Contract.pages) {
  if (!phase2HtmlByRelativePath.has(page.file)) {
    const html = await readFile(path.join(root, ...page.file.split('/')), 'utf8').catch(() => '');
    phase2HtmlByRelativePath.set(page.file, html.replace(/<!--[\s\S]*?-->/g, ''));
  }
}

const openingTags = html => [...html.matchAll(/<([a-z][a-z0-9-]*)\b[^>]*>/gi)].map(match => ({
  name: match[1].toLowerCase(),
  source: match[0],
  classes: new Set(
    (match[0].match(/\bclass=['"]([^'"]*)['"]/i)?.[1] || '').split(/\s+/).filter(Boolean),
  ),
}));

for (const page of phase3Contract.pages) {
  const html = phase2HtmlByRelativePath.get(page.file) || '';
  const tags = openingTags(html);
  const h1Tags = tags.filter(tag => tag.name === 'h1');
  if (h1Tags.length !== 1) {
    errors.push(`${page.file}: Phase 3 requires exactly one semantic h1`);
  } else {
    for (const requiredClass of page.title) {
      if (!h1Tags[0].classes.has(requiredClass)) {
        errors.push(`${page.file}: Phase 3 page title is missing .${requiredClass}`);
      }
    }
  }

  const pageHeader = tags.find(tag => page.header.every(requiredClass => tag.classes.has(requiredClass)));
  if (!pageHeader) {
    errors.push(`${page.file}: Phase 3 page header is missing ${page.header.map(value => `.${value}`).join('')}`);
  }

  for (const requiredClass of page.requiredClasses || []) {
    if (!tags.some(tag => tag.classes.has(requiredClass))) {
      errors.push(`${page.file}: Phase 3 text-role contract is missing .${requiredClass}`);
    }
  }

  let previousHeadingLevel = 0;
  for (const tag of tags.filter(candidate => /^h[1-6]$/.test(candidate.name))) {
    const level = Number(tag.name.slice(1));
    if (previousHeadingLevel && level > previousHeadingLevel + 1) {
      errors.push(`${page.file}: semantic heading order skips from h${previousHeadingLevel} to h${level}`);
    }
    previousHeadingLevel = level;
    const requiredClass = phase3Contract.headingClasses[tag.name];
    if (requiredClass && !tag.classes.has(requiredClass)) {
      errors.push(`${page.file}: ${tag.name} must use the Phase 3 .${requiredClass} role`);
    }
  }

  if (tags.some(tag => /\brole=['"]heading['"]/i.test(tag.source))) {
    errors.push(`${page.file}: native semantic headings must replace static role=heading markup`);
  }

  if (page.forecastHeading) {
    const forecastHeading = tags.find(tag => tag.name === 'h2' && /\bid=['"]forecast-heading['"]/i.test(tag.source));
    const forecastRegion = tags.find(tag => /\bid=['"]forecast['"]/i.test(tag.source));
    if (!forecastHeading || !forecastRegion
        || !/\baria-labelledby=['"]forecast-heading['"]/i.test(forecastRegion.source)) {
      errors.push(`${page.file}: county forecast region must use the explicit #forecast-heading h2`);
    }
  }
}

for (const relative of phase3Contract.inlineTitleStylePages) {
  const html = phase2HtmlByRelativePath.get(relative) || '';
  if (/<style\b/i.test(html)) {
    errors.push(`${relative}: Phase 3 title presentation must not remain in an inline style block`);
  }
}

const classTokensForTag = (html, tagName) => {
  const tag = html.match(new RegExp(`<${tagName}\\b[^>]*>`, 'i'))?.[0] || '';
  const classes = tag.match(/\bclass=['"]([^'"]*)['"]/i)?.[1] || '';
  return { tag, classes: new Set(classes.split(/\s+/).filter(Boolean)) };
};

for (const page of phase2Contract.pages) {
  const html = phase2HtmlByRelativePath.get(page.file) || '';
  if (!html) {
    errors.push(`${page.file}: expected Phase 2 page consumer is missing`);
    continue;
  }

  const body = classTokensForTag(html, 'body');
  const main = classTokensForTag(html, 'main');
  for (const requiredClass of page.body) {
    if (!body.classes.has(requiredClass)) {
      errors.push(`${page.file}: Phase 2 body root is missing .${requiredClass}`);
    }
  }
  for (const requiredClass of page.main) {
    if (!main.classes.has(requiredClass)) {
      errors.push(`${page.file}: Phase 2 page shell is missing .${requiredClass}`);
    }
  }
  for (const requiredAttribute of page.bodyAttributes || []) {
    if (!new RegExp(`\\s${requiredAttribute}(?:\\s|=|>)`, 'i').test(body.tag)) {
      errors.push(`${page.file}: Phase 2 body hook is missing ${requiredAttribute}`);
    }
  }

  for (const match of html.matchAll(/\bclass=['"]([^'"]*)['"]/gi)) {
    const classes = new Set(match[1].split(/\s+/).filter(Boolean));
    for (const retiredClass of phase2Contract.retiredClasses) {
      if (classes.has(retiredClass)) {
        errors.push(`${page.file}: retired Phase 2 class .${retiredClass} remains`);
      }
    }
  }
}

for (const retiredFile of phase2Contract.retiredFiles) {
  try {
    await stat(path.join(root, ...retiredFile.split('/')));
    errors.push(`${retiredFile}: retired owner-directed resource must remain removed`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      errors.push(`${retiredFile}: could not verify retired resource state (${error.message})`);
    }
  }
}

const repositoryReference = (documentRelative, reference) => {
  const documentPath = path.join(root, ...documentRelative.split('/'));
  const target = localTarget(documentPath, reference);
  return target ? path.relative(root, target).replaceAll('\\', '/') : null;
};
const referenceVersion = reference => new URLSearchParams(
  reference.split('#')[0].split('?')[1] || '',
).get('v');

const actualNavigationConsumers = new Set();
for (const [relative, html] of phase2HtmlByRelativePath) {
  const references = [...html.matchAll(/\bfrom\s+['"]([^'"]*navigation\.js(?:\?[^'"]*)?)['"]/gi)]
    .map(match => match[1]);
  if (references.length > 0) actualNavigationConsumers.add(relative);
  if (!phase3Contract.navigation.consumers.includes(relative)) continue;
  if (references.length !== 1
      || repositoryReference(relative, references[0]) !== phase3Contract.navigation.script
      || referenceVersion(references[0]) !== phase3Contract.navigation.version) {
    errors.push(`${relative}: NavigationModule must use the Phase 3 cache version`);
  }
}
for (const consumer of actualNavigationConsumers) {
  if (!phase3Contract.navigation.consumers.includes(consumer)) {
    errors.push(`${consumer}: undeclared Phase 3 NavigationModule consumer`);
  }
}
for (const consumer of phase3Contract.navigation.consumers) {
  if (!actualNavigationConsumers.has(consumer)) {
    errors.push(`${consumer}: missing declared Phase 3 NavigationModule dependency`);
  }
}

for (const sourceContract of phase3Contract.dynamicHeadingSources) {
  const source = await readFile(path.join(root, ...sourceContract.file.split('/')), 'utf8').catch(() => '');
  for (const required of sourceContract.required) {
    if (!source.includes(required)) {
      errors.push(`${sourceContract.file}: missing Phase 3 dynamic heading role ${required}`);
    }
  }
}

const phase3NavigationSource = await readFile(
  path.join(root, ...phase3Contract.navigation.script.split('/')),
  'utf8',
).catch(() => '');
for (const forbidden of phase3Contract.forbiddenNavigationPatterns) {
  if (phase3NavigationSource.includes(forbidden)) {
    errors.push(`${phase3Contract.navigation.script}: retired structural heading enhancement remains`);
  }
}

for (const dependency of phase3Contract.scriptDependencies) {
  const source = phase2HtmlByRelativePath.get(dependency.consumer)
    || await readFile(path.join(root, ...dependency.consumer.split('/')), 'utf8').catch(() => '');
  const references = [...source.matchAll(/(?:\bfrom\s+|\bsrc\s*=\s*)['"]([^'"]+)['"]/gi)]
    .map(match => match[1])
    .filter(reference => repositoryReference(dependency.consumer, reference) === dependency.target);
  if (references.length !== 1 || referenceVersion(references[0]) !== phase3Contract.assetVersion) {
    errors.push(`${dependency.consumer}: ${dependency.target} must use the Phase 3 cache version`);
  }
}

for (const page of phase4Contract.weatherPages) {
  const html = phase2HtmlByRelativePath.get(page) || '';
  const tags = openingTags(html);
  for (const requiredClass of ['tabset', 'tabset__tab', 'tabset__panel', 'subtabs', 'subtabs__tab']) {
    if (!tags.some(tag => tag.classes.has(requiredClass))) {
      errors.push(`${page}: Phase 4 shared interface is missing .${requiredClass}`);
    }
  }
}

for (const page of phase4Contract.infoCardPages) {
  const html = phase2HtmlByRelativePath.get(page) || '';
  if (!openingTags(html).some(tag => tag.classes.has('content-card'))) {
    errors.push(`${page}: Phase 4 information content must use .content-card`);
  }
}

for (const page of phase4Contract.backToTopPages) {
  const html = phase2HtmlByRelativePath.get(page) || '';
  const backToTop = openingTags(html).find(tag => tag.classes.has('back-to-top'));
  if (!backToTop || !/\sdata-back-to-top(?:\s|=|>)/i.test(backToTop.source)
      || !/\shidden(?:\s|=|>)/i.test(backToTop.source)
      || /\sstyle=/i.test(backToTop.source)) {
    errors.push(`${page}: Phase 4 back-to-top control must use data-back-to-top and hidden state`);
  }
}

for (const page of phase4Contract.multizonePages) {
  const html = phase2HtmlByRelativePath.get(page) || '';
  const zoneOptions = openingTags(html).filter(tag => /\sdata-zone=/i.test(tag.source));
  if (!zoneOptions.length || zoneOptions.some(tag => !tag.classes.has('zone-selector__option')
      || !/\saria-pressed=/i.test(tag.source))) {
    errors.push(`${page}: Phase 4 zone choices must use the BEM option and aria-pressed contract`);
  }
}

for (const [relative, html] of phase2HtmlByRelativePath) {
  for (const tag of openingTags(html)) {
    for (const retiredClass of phase4Contract.retiredClasses) {
      if (tag.classes.has(retiredClass)) {
        errors.push(`${relative}: retired Phase 4 class .${retiredClass} remains`);
      }
    }
  }
}

const phase4ComponentCss = await readFile(
  path.join(root, ...phase4Contract.componentOwner.split('/')),
  'utf8',
).catch(() => '');
for (const selector of phase4Contract.requiredComponentSelectors) {
  if (!phase4ComponentCss.includes(selector)) {
    errors.push(`${phase4Contract.componentOwner}: missing Phase 4 component owner selector ${selector}`);
  }
}

for (const stylesheet of phase4Contract.ownershipStylesheets) {
  const css = (await readFile(path.join(root, ...stylesheet.split('/')), 'utf8').catch(() => ''))
    .replace(/\/\*[\s\S]*?\*\//g, '');
  for (const retiredClass of phase4Contract.retiredClasses) {
    const escaped = retiredClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\.${escaped}(?![A-Za-z0-9_-])`).test(css)) {
      errors.push(`${stylesheet}: retired Phase 4 selector .${retiredClass} remains`);
    }
  }
}

for (const stylesheet of phase4Contract.familyStylesheets) {
  const css = (await readFile(path.join(root, ...stylesheet.split('/')), 'utf8').catch(() => ''))
    .replace(/\/\*[\s\S]*?\*\//g, '');
  for (const base of ['tabset', 'subtabs', 'content-card', 'button', 'consent-dialog', 'alert-dialog']) {
    if (new RegExp(`(^|[,}\\s])\\.${base}\\s*\\{`, 'm').test(css)) {
      errors.push(`${stylesheet}: Phase 4 shared .${base} base must be owned only by css/components.css`);
    }
  }
}

for (const sourceContract of [phase4Contract.navigation, ...phase4Contract.sourceContracts]) {
  const source = await readFile(path.join(root, ...sourceContract.file.split('/')), 'utf8').catch(() => '');
  for (const required of sourceContract.required) {
    if (!source.includes(required)) {
      errors.push(`${sourceContract.file}: missing Phase 4 source contract ${required}`);
    }
  }
  for (const forbidden of sourceContract.forbidden) {
    if (source.includes(forbidden)) {
      errors.push(`${sourceContract.file}: retired Phase 4 source contract remains ${forbidden}`);
    }
  }
}

for (const dependency of phase4Contract.versionedAssets) {
  const source = phase2HtmlByRelativePath.get(dependency.file)
    || await readFile(path.join(root, ...dependency.file.split('/')), 'utf8').catch(() => '');
  const references = [...source.matchAll(/(?:\bfrom\s+|\bsrc\s*=\s*|\bhref\s*=\s*)['"]([^'"]+)['"]/gi)]
    .map(match => match[1])
    .filter(reference => repositoryReference(dependency.file, reference) === dependency.target);
  if (references.length !== 1 || referenceVersion(references[0]) !== phase4Contract.version) {
    errors.push(`${dependency.file}: ${dependency.target} must use the Phase 4 cache version`);
  }
}

for (const page of phase5Contract.mapPages) {
  const html = phase2HtmlByRelativePath.get(page) || '';
  const tags = openingTags(html);
  for (const requiredClass of ['weather-map', 'weather-map__canvas', 'map-toolbar', 'map-timeline', 'map-legend']) {
    if (!tags.some(tag => tag.classes.has(requiredClass))) {
      errors.push(`${page}: Phase 5 shared map interface is missing .${requiredClass}`);
    }
  }
  if (!tags.some(tag => tag.classes.has('status-message--loading'))
      || !tags.some(tag => tag.classes.has('status-message--error'))) {
    errors.push(`${page}: Phase 5 map loading/error states must use shared status messages`);
  }
  const mapShells = tags.filter(tag => tag.classes.has('weather-map'));
  if (!mapShells.length || mapShells.some(tag => !/\sdata-weather-map(?:\s|=|>)/i.test(tag.source))) {
    errors.push(`${page}: Phase 5 map shells must expose data-weather-map hooks`);
  }
  if (tags.some(tag => /\sstyle=['"][^'"]*display\s*:/i.test(tag.source))) {
    errors.push(`${page}: Phase 5 map consumers must use hidden/state classes instead of inline display styles`);
  }
  for (const tag of tags) {
    for (const retiredClass of phase5Contract.retiredClasses) {
      if (tag.classes.has(retiredClass)) {
        errors.push(`${page}: retired Phase 5 class .${retiredClass} remains`);
      }
    }
  }
}

for (const page of phase5Contract.cardPages) {
  const tags = openingTags(phase2HtmlByRelativePath.get(page) || '');
  for (const requiredClass of ['weather-map-card', 'weather-map__content']) {
    if (!tags.some(tag => tag.classes.has(requiredClass))) {
      errors.push(`${page}: Phase 5 map card is missing .${requiredClass}`);
    }
  }
}

const phase5OwnerCss = (await readFile(
  path.join(root, ...phase5Contract.owner.split('/')),
  'utf8',
).catch(() => '')).replace(/\/\*[\s\S]*?\*\//g, '');
for (const selector of phase5Contract.requiredOwnerSelectors) {
  if (!phase5OwnerCss.includes(selector)) {
    errors.push(`${phase5Contract.owner}: missing Phase 5 map owner selector ${selector}`);
  }
}

for (const stylesheet of phase5Contract.ownerStylesheets) {
  const css = (await readFile(path.join(root, ...stylesheet.split('/')), 'utf8').catch(() => ''))
    .replace(/\/\*[\s\S]*?\*\//g, '');
  for (const retiredClass of phase5Contract.retiredClasses) {
    const escaped = retiredClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\.${escaped}(?![A-Za-z0-9_-])`).test(css)) {
      errors.push(`${stylesheet}: retired Phase 5 selector .${retiredClass} remains`);
    }
  }
  if (stylesheet !== phase5Contract.owner) {
    for (const base of ['weather-map-card', 'weather-map', 'map-toolbar', 'map-timeline', 'map-legend', 'map-menu', 'map-place-label']) {
      if (new RegExp(`^\\s*\\.${base}\\s*\\{`, 'm').test(css)) {
        errors.push(`${stylesheet}: Phase 5 shared .${base} base must be owned only by ${phase5Contract.owner}`);
      }
    }
  }
}

for (const [stylesheet, consumers] of Object.entries(phase5Contract.stylesheets)) {
  const expectedConsumers = new Set(consumers);
  const actualConsumers = new Set();
  for (const [relative, html] of phase2HtmlByRelativePath) {
    const references = stylesheetHrefs(html).filter(
      reference => repositoryReference(relative, reference) === stylesheet,
    );
    if (references.length > 0) actualConsumers.add(relative);
    if (expectedConsumers.has(relative)
        && (references.length !== 1 || referenceVersion(references[0]) !== phase5Contract.version)) {
      errors.push(`${relative}: ${stylesheet} must use the Phase 5 cache version`);
    }
  }
  for (const consumer of actualConsumers) {
    if (!expectedConsumers.has(consumer)) {
      errors.push(`${consumer}: undeclared Phase 5 ${stylesheet} consumer`);
    }
  }
  for (const consumer of expectedConsumers) {
    if (!actualConsumers.has(consumer)) {
      errors.push(`${consumer}: missing declared Phase 5 ${stylesheet} dependency`);
    }
  }
}

for (const sourceContract of phase5Contract.sourceContracts) {
  const source = await readFile(path.join(root, ...sourceContract.file.split('/')), 'utf8').catch(() => '');
  for (const required of sourceContract.required) {
    if (!source.includes(required)) {
      errors.push(`${sourceContract.file}: missing Phase 5 source contract ${required}`);
    }
  }
  for (const forbidden of sourceContract.forbidden) {
    if (source.includes(forbidden)) {
      errors.push(`${sourceContract.file}: retired Phase 5 source contract remains ${forbidden}`);
    }
  }
}

for (const dependency of phase5Contract.versionedAssets) {
  const source = phase2HtmlByRelativePath.get(dependency.file)
    || await readFile(path.join(root, ...dependency.file.split('/')), 'utf8').catch(() => '');
  const references = [...source.matchAll(/(?:\bfrom\s+|\bsrc\s*=\s*|\bhref\s*=\s*)['"]([^'"]+)['"]/gi)]
    .map(match => match[1])
    .filter(reference => repositoryReference(dependency.file, reference) === dependency.target);
  if (references.length !== 1 || referenceVersion(references[0]) !== phase5Contract.version) {
    errors.push(`${dependency.file}: ${dependency.target} must use the Phase 5 cache version`);
  }
}

for (const [stylesheet, contract] of Object.entries(phase2Contract.stylesheets)) {
  const expectedConsumers = new Set(contract.consumers);
  const actualConsumers = new Set();
  for (const [relative, html] of phase2HtmlByRelativePath) {
    const references = stylesheetHrefs(html).filter(
      reference => repositoryReference(relative, reference) === stylesheet,
    );
    if (references.length > 0) actualConsumers.add(relative);
    if (expectedConsumers.has(relative)) {
      if (references.length !== 1) {
        errors.push(`${relative}: expected exactly one Phase 2 ${stylesheet} reference`);
      } else if (referenceVersion(references[0]) !== contract.version) {
        errors.push(`${relative}: ${stylesheet} must use cache version ${contract.version}`);
      }
    }
  }
  for (const consumer of actualConsumers) {
    if (!expectedConsumers.has(consumer)) {
      errors.push(`${consumer}: undeclared Phase 2 ${stylesheet} consumer`);
    }
  }
  for (const consumer of expectedConsumers) {
    if (!actualConsumers.has(consumer)) {
      errors.push(`${consumer}: missing declared Phase 2 ${stylesheet} dependency`);
    }
  }
}

const globalStyles = await readFile(path.join(root, 'css', 'styles.css'), 'utf8').catch(() => '');
for (const token of phase2Contract.requiredGlobalTokens) {
  if (!globalStyles.includes(`${token}:`)) {
    errors.push(`css/styles.css: missing required Phase 2 token ${token}`);
  }
}

for (const stylesheet of Object.keys(phase2Contract.stylesheets)) {
  const css = await readFile(path.join(root, ...stylesheet.split('/')), 'utf8').catch(() => '');
  for (const token of phase2Contract.retiredTokens) {
    if (css.includes(token)) {
      errors.push(`${stylesheet}: retired Phase 2 token ${token} remains`);
    }
  }
}

for (const stylesheet of phase2Contract.ownershipStylesheets) {
  const css = (await readFile(path.join(root, ...stylesheet.split('/')), 'utf8').catch(() => ''))
    .replace(/\/\*[\s\S]*?\*\//g, '');
  for (const retiredClass of phase2Contract.retiredClasses) {
    const escaped = retiredClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\.${escaped}(?![A-Za-z0-9_-])`).test(css)) {
      errors.push(`${stylesheet}: retired Phase 2 selector .${retiredClass} remains`);
    }
  }
}

const phase2ActiveCss = await readFile(path.join(root, 'active', 'css', 'active.css'), 'utf8').catch(() => '');
if (/(^|[}\s])\s*:root\s*\{/m.test(phase2ActiveCss.replace(/\/\*[\s\S]*?\*\//g, ''))) {
  errors.push('active/css/active.css: page-only variables must be owned by .site-page--active, not :root');
}

const activeHookHtml = phase2HtmlByRelativePath.get(phase2Contract.activeHook.page) || '';
const activeHookReferences = [...activeHookHtml.matchAll(/<script\b[^>]*>/gi)]
  .map(match => match[0].match(/\bsrc=['"]([^'"]+)['"]/i)?.[1])
  .filter(reference => reference
    && repositoryReference(phase2Contract.activeHook.page, reference) === phase2Contract.activeHook.script);
if (activeHookReferences.length !== 1
    || referenceVersion(activeHookReferences[0]) !== phase2Contract.activeHook.version) {
  errors.push(`${phase2Contract.activeHook.page}: Active page hook script cache version is stale or missing`);
}
const activeHookScript = await readFile(
  path.join(root, ...phase2Contract.activeHook.script.split('/')),
  'utf8',
).catch(() => '');
if (!activeHookScript.includes(`querySelector('[${phase2Contract.activeHook.attribute}]')`)
    || activeHookScript.includes('getComputedStyle(document.documentElement)')) {
  errors.push(`${phase2Contract.activeHook.script}: Active CSS variables must use the data-active-page hook`);
}

for (const [asset, expectedHash] of Object.entries(leafletContract.assets)) {
  const assetPath = path.join(root, leafletContract.vendorRoot, ...asset.split('/'));
  try {
    const hash = createHash('sha256').update(await readFile(assetPath)).digest('hex');
    if (hash !== expectedHash) {
      errors.push(`${leafletContract.vendorRoot}/${asset}: Leaflet vendor checksum mismatch`);
    }
  } catch (error) {
    errors.push(`${leafletContract.vendorRoot}/${asset}: missing Leaflet vendor asset (${error.message})`);
  }
}

const leafletCss = await readFile(
  path.join(root, leafletContract.vendorRoot, 'leaflet.css'),
  'utf8',
).catch(() => '');
for (const imageReference of ['images/layers.png', 'images/layers-2x.png', 'images/marker-icon.png']) {
  if (!leafletCss.includes(`url(${imageReference})`)) {
    errors.push(`${leafletContract.vendorRoot}/leaflet.css: missing relative ${imageReference} reference`);
  }
}
const leafletJs = await readFile(
  path.join(root, leafletContract.vendorRoot, 'leaflet.js'),
  'utf8',
).catch(() => '');
if (!leafletJs.includes('//# sourceMappingURL=leaflet.js.map')) {
  errors.push(`${leafletContract.vendorRoot}/leaflet.js: source map reference is missing`);
}
const leafletProvenance = await readFile(
  path.join(root, leafletContract.vendorRoot, 'PROVENANCE.md'),
  'utf8',
).catch(() => '');
for (const required of [
  `Version: ${leafletContract.version}`,
  leafletContract.sourceUrl,
  leafletContract.sourceSha256,
  leafletContract.license,
]) {
  if (!leafletProvenance.includes(required)) {
    errors.push(`${leafletContract.vendorRoot}/PROVENANCE.md: missing ${required}`);
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
  '../vendor/leaflet/1.9.4/leaflet.js',
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

for (const file of files.filter(file => file.endsWith('.html'))) {
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
