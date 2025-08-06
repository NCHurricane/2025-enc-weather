// generate-topozones.js
// One-time Node.js script to update NC-county-topo.json by splitting Hyde and Dare into separate zones
// Handles both TopoJSON and GeoJSON inputs, outputs GeoJSON FeatureCollection matching expected schema

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { feature as topoFeature } from 'topojson-client';
import topojsonServer from 'topojson-server';
import { fileURLToPath } from 'url';

// Polyfill __dirname for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
// Script is in <project>/counties/generate-topozones.js
const countiesPath = path.join(__dirname, 'counties.json');
const topoPath = path.join(__dirname, '..', 'js', 'data', 'NC-county-topo.json');

// Load counties configuration
const rawCounties = JSON.parse(fs.readFileSync(countiesPath, 'utf8'));
const countiesConfig = rawCounties.counties;

// Helper: fetch GeoJSON geometry for a given zone code
async function fetchZoneGeometry(zoneCode) {
  const url = `https://api.weather.gov/zones/forecast/${zoneCode}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'TopoGenScript (me@domain.com)' } });
  if (!res.ok) throw new Error(`Failed to fetch ${zoneCode}: ${res.status}`);
  const json = await res.json();
  return json.geometry;
}

(async () => {
  // Read and parse the topology or geojson
  const raw = fs.readFileSync(topoPath, 'utf8');
  const data = JSON.parse(raw);

  // Determine FeatureCollection
  let featureCollection;
  if (data.type === 'Topology') {
    const objectKey = Object.keys(data.objects)[0];
    featureCollection = topoFeature(data, data.objects[objectKey]);
  } else if (data.type === 'FeatureCollection') {
    featureCollection = data;
  } else {
    throw new Error('Input file is not a valid TopoJSON or GeoJSON FeatureCollection');
  }

  // Filter out combined Hyde and Dare features by NAME
  const filtered = featureCollection.features.filter(f => {
    const n = f.properties.NAME.toLowerCase();
    return n !== 'hyde' && n !== 'dare';
  });

      // Gather zone entries for Hyde and Dare based on URL
  const zoneEntries = countiesConfig
    .filter(c => c.url === 'counties/dare/index.html' || c.url === 'counties/hyde/index.html')
    .map(c => ({ code: c.ugcCode, name: c.name }));

  // Deduplicate zone entries
  const uniqueZones = Array.from(
    new Map(zoneEntries.map(z => [z.code, z])).values()
  );

  // Fetch and append zone features
  for (const { code, name } of uniqueZones) {
    console.log(`Fetching geometry for zone ${code} (${name})...`);
    const geom = await fetchZoneGeometry(code);
    filtered.push({ type: 'Feature', geometry: geom, properties: { NAME: name, zoneCode: code } });
  }

  // Construct output FeatureCollection
  const outputFC = { type: 'FeatureCollection', features: filtered };

  // Write as GeoJSON FeatureCollection
  fs.writeFileSync(topoPath, JSON.stringify(outputFC, null, 2));
  console.log(`Updated GeoJSON FeatureCollection saved to ${topoPath}`);
})();
