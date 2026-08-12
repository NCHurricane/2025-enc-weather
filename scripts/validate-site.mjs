import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

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

for (const file of await walk(root)) {
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

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Validated ${counts.html} HTML files, ${counts.json} JSON files, and ${counts.references} local references.`);
