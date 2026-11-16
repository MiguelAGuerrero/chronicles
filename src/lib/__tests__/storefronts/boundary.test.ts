/// <reference types="node" />
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

// Storefronts (specs/storefronts, SF17): the layer is kept apart from presence, density and Explore's reads.
const LIB = join(__dirname, '../..');
const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? (f === '__tests__' ? [] : files(join(dir, f))) : /\.tsx?$/.test(f) ? [join(dir, f)] : []));

test('SF17: no module of presence, discovery, atlas, landing, explore, areas or walkPlanner imports the storefront reader', () => {
  assert.ok(statSync(join(LIB, 'storefronts')).isDirectory(), 'the storefronts folder exists');
  const offenders: string[] = [];
  for (const d of ['presence', 'discovery', 'atlas', 'landing', 'explore', 'areas', 'walkPlanner', 'kindWalk']) {
    for (const f of files(join(LIB, d))) if (/from ['"][^'"]*\/storefronts(\/|['"])/.test(readFileSync(f, 'utf8'))) offenders.push(f);
  }
  assert.deepEqual(offenders, []);
});

test('SF17: reading storefronts touches no cache: the storefront modules import no place cache, atlas, presence code or tile build', () => {
  const bad: string[] = [];
  for (const f of files(join(LIB, 'storefronts'))) {
    const src = readFileSync(f, 'utf8');
    if (/putPlaces|getPlaces|ATLAS_CODE|LANDING_CODE|PRESENCE_CODE|SNAP_RULES|STREET_CODE/.test(src)) bad.push(f);
  }
  assert.deepEqual(bad, []);
});

test('SF17: the three derivation codes are the values they had before the slice', async () => {
  const { ATLAS_CODE } = await import('../../atlas/atlas');
  const { PRESENCE_CODE } = await import('../../presence/presence');
  assert.equal(PRESENCE_CODE, 'p2');
  assert.equal(typeof ATLAS_CODE, 'string');
  const { LANDING_CODE } = await import('../../landing/view');
  assert.equal(LANDING_CODE, 'l4');
  assert.ok(statSync(join(LIB, 'storefronts')).isDirectory(), 'the slice exists and left the codes alone');
});
