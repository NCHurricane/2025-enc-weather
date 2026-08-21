import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const inputPath = path.resolve(
  repositoryRoot,
  process.argv[2] || 'js/data/world-cities.json',
);
const outputPath = path.resolve(
  repositoryRoot,
  process.argv[3] || 'js/data/tropical-city-labels.json',
);
const limit = Number(process.argv[4] || 20000);

if (!Number.isInteger(limit) || limit <= 0) {
  throw new Error('Tropical city-label limit must be a positive integer');
}

const source = JSON.parse(await readFile(inputPath, 'utf8'));
if (!Array.isArray(source)) throw new Error('World-city source must be a JSON array');

const normalized = source.map((city, index) => {
  const record = {
    city: String(city?.city || '').trim(),
    latitude: Number(city?.latitude),
    longitude: Number(city?.longitude),
    rank: Number(city?.rank),
  };
  if (
    !record.city
    || !Number.isFinite(record.latitude)
    || !Number.isFinite(record.longitude)
    || !Number.isInteger(record.rank)
    || record.rank <= 0
  ) {
    throw new Error(`Invalid world-city record at index ${index}`);
  }
  return record;
});

normalized.sort((left, right) => left.rank - right.rank || left.city.localeCompare(right.city));
if (normalized.length < limit) {
  throw new Error(`World-city source has ${normalized.length} records; ${limit} are required`);
}

const selected = normalized.slice(0, limit);
await writeFile(outputPath, `${JSON.stringify(selected)}\n`, 'utf8');

console.log(`Wrote ${selected.length} Tropical city labels to ${outputPath}`);
