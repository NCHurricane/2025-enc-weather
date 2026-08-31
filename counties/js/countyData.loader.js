// Picks single- vs multi-zone data module based on county config or known list.

const MULTI_ZONE_COUNTIES = new Set(['dare', 'hyde']);
let implPromise = null;

export function configUsesMultipleZones(config) {
    if (config?.county?.multiZone === true || config?.multiZone === true) return true;
    if (Array.isArray(config?.zones)) return config.zones.length > 1;
    return false;
}

function getCountySlugFromPath() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const i = parts.indexOf('counties');
    return i >= 0 && parts[i + 1] ? parts[i + 1].toLowerCase() : null;
}

async function isMultiZoneCounty() {
    const county = getCountySlugFromPath();
    if (!county) return false;

    // Try per-county config first (15-min bucket cache-busting)
    const bucket = Math.floor(Date.now() / (15 * 60 * 1000));
    const url = `/counties/${county}/data/config.json?cb=${bucket}`;

    try {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
            const cfg = await res.json();
            if (configUsesMultipleZones(cfg)) return true;
        }
    } catch {
        // ignore and fall back
    }

    return MULTI_ZONE_COUNTIES.has(county);
}

async function loadImpl() {
    if (!implPromise) {
        implPromise = (async () => {
            const multi = await isMultiZoneCounty();
            return multi
                ? import('./countyData.multizone.js?v=20260826-zone-normalization-1')
                : import('./countyData.js');
        })();
    }
    return implPromise;
}

export async function getHourlyData(options) {
    const mod = await loadImpl();
    return mod.getHourlyData(options);
}
