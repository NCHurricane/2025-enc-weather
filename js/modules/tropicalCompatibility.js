export const TROPICAL_COMPATIBILITY_BASINS = Object.freeze(['atl', 'epac']);

export function tropicalCompatibilityTarget(url, basin) {
  const normalizedBasin = String(basin || '').toLowerCase();
  if (!TROPICAL_COMPATIBILITY_BASINS.includes(normalizedBasin)) return '';

  const source = new URL(url, 'https://nchurricane.com/');
  const target = new URL('tropical.html', source);
  target.search = source.search;
  target.searchParams.set('basin', normalizedBasin);
  target.hash = source.hash;

  const destination = `${target.pathname}${target.search}${target.hash}`;
  const current = `${source.pathname}${source.search}${source.hash}`;
  return destination === current ? '' : destination;
}

export function initTropicalCompatibility({
  documentRef = globalThis.document,
  windowRef = globalThis.window,
} = {}) {
  const basin = documentRef?.body?.dataset?.tropicalCompatibilityBasin;
  const destination = tropicalCompatibilityTarget(windowRef?.location?.href, basin);
  if (!destination || typeof windowRef?.location?.replace !== 'function') return false;
  windowRef.location.replace(destination);
  return true;
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  initTropicalCompatibility();
}
