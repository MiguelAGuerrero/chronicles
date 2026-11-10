#!/usr/bin/env node
// Writes manifest.json from the archives in a folder (moved from chronicles-data, a staged places build SB6,
// decision 0110), so it is tested here: node scripts/places-archive/manifest.mjs <dir>
// Each archive is places-<region>-<version>.pmtiles; the newest version of a region is current. Beside each, a
// changes-<region>-<version>.json (from assemble.mjs) gives `since`, `places_sha256` and `changed`, the z12 tiles
// that version changed; an archive without one is served without them (phones then rebuild as before).
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const NAME = /^places-([a-z0-9]+)-(\d{8}(?:\.\d+)?)\.pmtiles$/;

/** Bounds and zooms from the PMTiles v3 header (127 bytes). */
export function header(buf) {
  if (buf.toString('ascii', 0, 7) !== 'PMTiles' || buf.readUInt8(7) !== 3) throw new Error('not a PMTiles v3 archive');
  const e7 = (o) => buf.readInt32LE(o) / 1e7;
  return { minzoom: buf.readUInt8(100), maxzoom: buf.readUInt8(101), bounds: [e7(102), e7(106), e7(110), e7(114)] };
}

/**
 * SB6: the manifest from one entry per served archive, newest version of each region current; each entry keeps its
 * change list when it has one.
 * @param {{ region: string, file: string, version: string, bytes: number, sha256: string, minzoom: number, maxzoom: number,
 *   bounds: number[], places_sha256?: string, since?: string | null, changed?: number[][] }[]} entries
 */
export function manifestFrom(entries) {
  const byRegion = new Map();
  for (const { region, ...e } of entries) {
    const entry = { ...e };
    if (entry.since == null) delete entry.since;
    if (entry.changed == null) delete entry.changed;
    if (entry.places_sha256 == null) delete entry.places_sha256;
    if (!byRegion.has(region)) byRegion.set(region, []);
    byRegion.get(region).push(entry);
  }
  const regions = [...byRegion].sort(([a], [b]) => a.localeCompare(b)).map(([id, list]) => {
    list.sort((a, b) => b.version.localeCompare(a.version, 'en', { numeric: true }));
    return { id, current: list[0], previous: list.slice(1) };
  });
  return { schema: 1, regions };
}

/** The entries for every archive in a folder, with its change list if one is beside it. */
export function entriesIn(dir) {
  const out = [];
  for (const file of readdirSync(dir)) {
    const m = NAME.exec(file);
    if (!m) continue;
    const path = join(dir, file);
    const buf = readFileSync(path);
    const changesPath = join(dir, `changes-${m[1]}-${m[2]}.json`);
    const changes = existsSync(changesPath) ? JSON.parse(readFileSync(changesPath, 'utf8')) : {};
    out.push({
      region: m[1],
      file,
      version: m[2],
      bytes: statSync(path).size,
      sha256: createHash('sha256').update(buf).digest('hex'),
      ...header(buf),
      places_sha256: changes.places_sha256,
      since: changes.since,
      changed: changes.changed,
    });
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir) {
    console.error('usage: manifest.mjs <dir>');
    process.exit(1);
  }
  process.stdout.write(JSON.stringify(manifestFrom(entriesIn(dir)), null, 2) + '\n');
}
