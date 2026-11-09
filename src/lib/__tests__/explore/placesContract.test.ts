/// <reference types="node" />
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { PMTiles, type RangeResponse, type Source } from 'pmtiles';
import { archiveTag, blockKey, parseManifest } from '../../discovery/archiveManifest';
import { ARCHIVE_CLASSES, placesFromArchive } from '../../discovery/archivePois';
import { HOSTS } from '../../net/policy';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ALLOWED_HOSTS } = require('../../../../scripts/check-vision.js') as { ALLOWED_HOSTS: Record<string, string> };

// The places pipeline's contract, the app's side (specs/places-pipeline, decision 0108). chronicles-data owns the
// contract; contract/ here is the app's pinned copy of it (its README says how to take a new one).

const ROOT = join(__dirname, '../../../..');
const C = join(__dirname, 'contract');
const read = (p: string) => JSON.parse(readFileSync(join(C, p), 'utf8'));
const PINNED_VERSION = 1;

const memory = (buf: Uint8Array): Source => ({
  getKey: () => 'memory',
  getBytes: async (offset: number, length: number): Promise<RangeResponse> => ({ data: buf.slice(offset, offset + length).buffer as ArrayBuffer }),
});

test('PP17: the app keeps to the contract it pins: the class names, the example pack and its manifest', async () => {
  const sources = read('sources.json');
  const places = read('places.schema.json');
  for (const doc of [sources, places, read('manifest.schema.json')]) assert.equal(doc.contractVersion, PINNED_VERSION, 'the contract version this app was written for');

  // The class names: exactly the contract's, each mapped to a category and kind.
  assert.deepEqual(Object.keys(ARCHIVE_CLASSES).sort(), [...sources.classes].sort());
  assert.deepEqual([...places.feature.properties.class.enum].sort(), [...sources.classes].sort());
  // A pack's feature: the four fields archivePois reads, and nothing else (PW7).
  assert.deepEqual(Object.keys(places.feature.properties).sort(), ['class', 'id', 'name', 'src']);
  assert.equal(places.feature.additionalProperties, false);

  // The example manifest parses, blocks included, and tags a point by its block.
  const manifest = parseManifest(readFileSync(join(C, 'example/manifest.json'), 'utf8'));
  assert.ok(manifest, 'the example manifest is a manifest');
  const file = manifest!.regions[0].current;
  assert.ok(file.blocks && Object.keys(file.blocks).length > 0, 'its blocks are kept');

  // The example pack: every feature is a place the app keeps, with a kind.
  const bytes = new Uint8Array(readFileSync(join(C, 'example', file.file)));
  const pm = new PMTiles(memory(bytes));
  const header = await pm.getHeader();
  assert.equal(header.maxZoom, 12, 'z12 tiles, as ARCHIVE_ZOOM');
  const z = header.maxZoom;
  const n = 2 ** z;
  const tx = (lon: number) => Math.floor(((lon + 180) / 360) * n);
  const ty = (lat: number) => { const r = (lat * Math.PI) / 180; return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n); };
  const [w, s, e, nn] = file.bounds;
  let features = 0;
  const kept: string[] = [];
  for (let x = tx(w); x <= tx(e); x++) for (let y = ty(nn); y <= ty(s); y++) {
    const t = await pm.getZxy(z, x, y);
    if (!t) continue;
    const layer = new VectorTile(new PbfReader(new Uint8Array(t.data))).layers.places;
    const fs = Array.from({ length: layer.length }, (_, i) => layer.feature(i).toGeoJSON(x, y, z));
    features += fs.length;
    for (const f of fs) assert.deepEqual(Object.keys(f.properties ?? {}).sort(), ['class', 'id', 'name', 'src']);
    const got = placesFromArchive(fs as never, file.version);
    for (const p of got) {
      assert.ok(p.kind, `${p.name} has a kind`);
      assert.match(archiveTag(file, p.at), /^b:[0-9a-f]{16}$/, `${p.name}'s block is listed (${blockKey(p.at)})`);
    }
    kept.push(...got.map((p) => p.name));
  }
  assert.ok(features > 0, 'the example pack has places');
  assert.equal(kept.length, features, 'the app keeps every place in the pack');
});

test('PP16: phones still never call a source: no host in the contract\'s sources is allowed, or named under src/', () => {
  const hosts: string[] = read('sources.json').sources.flatMap((s: { hosts: string[] }) => s.hosts);
  assert.ok(hosts.includes('query.wikidata.org'));
  for (const h of hosts) {
    assert.ok(!(h in ALLOWED_HOSTS), `${h} is not an app host`);
    assert.ok(!(h in HOSTS), `${h} is not in lib/net's table`);
  }
  const files: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) { if (e.name !== '__tests__') walk(join(d, e.name)); } else if (/\.(ts|tsx|js|json)$/.test(e.name)) files.push(join(d, e.name));
    }
  };
  walk(join(ROOT, 'src'));
  for (const f of files) for (const h of hosts) assert.ok(!readFileSync(f, 'utf8').includes(h), `${f} names ${h}`);
});
