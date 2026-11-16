import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { ATLAS_CODE, needsNear, newRows, rowCurrent, type AtlasArea } from '../../atlas/atlas';
import { COMPLEX_CODE } from '../../complexes/types';
import { refineRead } from '../../discovery/refinements';
import { placesFromTilePois } from '../../discovery/tilePois';
import type { Place } from '../../discovery/types';
import { isStale, LANDING_CODE, LANDING_VERSION, rulesCurrent, type LandingRow } from '../../landing/view';
import { notableBeyondNeighbourhood } from '../../presence/notable';
import { named, PRESENCE_CARRIED, PRESENCE_CODE } from '../../presence/presence';
import type { LngLat } from '../../types';

// Decision 0172, the owner's answer to the [arch] item "The neighbourhood read-past runs on the raw name, before
// `normalizeWords`": the read-past of a neighbourhood's "Old Town" and "old and new" (0127, presence-and-kinds audit 5) runs
// after `normalizeWords`, in presence (a museum's History) and community parks alike, with a PRESENCE_CODE bump.

const O: LngLat = [-75.47, 40.6];
const park = (name: string) => ({ geometry: { type: 'Point', coordinates: O }, properties: { class: 'park', subclass: 'park', name }, zoom: 14 });
const kindOf = (name: string) => (refineRead(placesFromTilePois([park(name)] as never, 'b'), { archive: [] as Place[] }) as Place[]).find((p) => p.name === name)?.kind;

/** Each spelling the raw read missed, beside the spelling it must read as. */
const SPELLINGS: [string, string][] = [
  ['Old-Town', 'Old Town'],
  ['Old_Town', 'Old Town'],
  ['Old.Town', 'Old Town'],
  ['Old&New', 'Old & New'],
];

test('tend presence 1: a museum named "Old-Town", "Old_Town", "Old.Town" or "Old&New" is read as "Old Town" and "Old & New" are', () => {
  for (const [odd, plain] of SPELLINGS) {
    for (const rest of ['Museum', 'Gallery of Art']) {
      const a = `${odd} ${rest}`, b = `${plain} ${rest}`;
      assert.equal(notableBeyondNeighbourhood(b), false, `${b}: the neighbourhood is read past (0127)`);
      assert.equal(notableBeyondNeighbourhood(a), notableBeyondNeighbourhood(b), a);
      assert.equal(named(['museum'], a).includes('historic'), false, `${a} lights no History`);
    }
    // 0127's read-past itself stays: a notable word beside the neighbourhood still makes a museum historic.
    assert.equal(named(['museum'], `${odd} Historic Museum`).includes('historic'), true, `${odd} Historic Museum`);
  }
  // A possessive is the neighbourhood's own name: "Old Town's Museum" was read past before and still is.
  assert.equal(notableBeyondNeighbourhood("Old Town's Museum"), false);
  assert.equal(notableBeyondNeighbourhood('Old Mill Museum'), true, '"Old" before anything else is read');
});

test('tend presence 1: a park named "Old-Town", "Old_Town", "Old.Town" or "Old&New" before a community word is read as "Old Town" and "Old & New" are', () => {
  for (const [odd, plain] of SPELLINGS) {
    for (const rest of ['Playground', 'Tot Lot', 'Ball Field']) {
      const a = `${odd} ${rest}`, b = `${plain} ${rest}`;
      assert.equal(kindOf(b), 'community_parks', `${b}: the neighbourhood is read past before a community word`);
      assert.equal(kindOf(a), kindOf(b), a);
    }
    // tend explore audit 1: before anything but a community word the phrase names a building, and "Old" is read.
    assert.equal(kindOf(`${odd} Hall Playground`), 'parks', `${odd} Hall Playground`);
    assert.equal(kindOf(`${odd} Historic Playground`), 'parks', `${odd} Historic Playground`);
  }
  assert.equal(kindOf('Old Mill Playground'), 'parks');
  // The same phrases as a museum's, a possessive among them: "Old Town's Playground" is a playground of Old Town. Before,
  // the museum read it past and the park did not; one list now reads both alike.
  assert.equal(kindOf("Old Town's Playground"), 'community_parks');
});

test('tend presence 1: the bump to p5 is the only derivation code that moves, and every cached area is derived again', () => {
  const lib = join(__dirname, '..', '..');
  const src = (f: string) => readFileSync(join(lib, f), 'utf8');
  assert.equal(PRESENCE_CODE, 'p5');
  assert.deepEqual(PRESENCE_CARRIED, [], 'what a museum or a park reads as moved, so no p4 row stands (PS9)');
  // Every other derivation code is what it was at p4.
  assert.equal(ATLAS_CODE, 'a14.p5');
  assert.equal(LANDING_CODE, 'l4');
  assert.ok(LANDING_VERSION.startsWith('l4:p5:'), LANDING_VERSION);
  assert.equal(COMPLEX_CODE, 'c1');
  assert.match(src('tiles.ts'), /const STREET_CODE = '3';/);
  assert.match(src('tiles.ts'), /const SNAP_RULES = '9';/);
  assert.match(src('walk/bands.ts'), /export const WALK_CODE = 'w2';/);
  assert.match(src('areas/outlines.ts'), /export const OUTLINE_DECODE = 'sub2';/);
  // Truth vs cache: an area derived under p4 is derived again, never patched. Its row no longer stands, so the same area
  // is listed again as a new row with no profile, read afresh; a near read under p4 is made again; a remembered landing
  // area is stale until it is analyzed again.
  const at: LngLat = [-75.47, 40.6];
  for (const level of ['neighborhood', 'town'] as const) {
    const old: AtlasArea = { key: 'k', level, name: 'Old Town', at, reachM: 800, build: 'b', code: 'a14.p4', listed_at: 1, read_at: 2, failed_at: null, profile: null };
    assert.equal(rowCurrent(old, 'b'), false, `a ${level} row of a14.p4`);
    const again = newRows([old], [{ level, name: 'Old Town', at, reachM: 800 }], 'b', 10);
    assert.equal(again.length, 1, `the ${level} is listed again`);
    assert.deepEqual([again[0].code, again[0].profile, again[0].read_at], ['a14.p5', null, null]);
    assert.equal(old.code, 'a14.p4', 'the old row is not patched');
    assert.equal(newRows([{ ...old, code: 'a14.p5' }], [{ level, name: 'Old Town', at, reachM: 800 }], 'b', 10).length, 0, 'a p5 row stands');
  }
  assert.equal(needsNear({ at, build: 'b', code: 'a14.p4' } as never, at, 'b'), true, 'a near read under p4 is made again');
  assert.equal(needsNear({ at, build: 'b', code: 'a14.p5' } as never, at, 'b'), false);
  const p4 = LANDING_VERSION.replace(':p5:', ':p4:');
  assert.equal(rulesCurrent(p4), false);
  assert.equal(isStale({ build: 'b', rules: p4 } as LandingRow, 'b'), true, 'a landing area under p4 is stale');
  assert.equal(isStale({ build: 'b', rules: LANDING_VERSION } as LandingRow, 'b'), false);
});
