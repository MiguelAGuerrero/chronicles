import assert from 'node:assert/strict';
import test from 'node:test';
import { ATLAS_CODE, needsNear, newRows, rowCurrent, type AtlasArea } from '../../atlas/atlas';
import { refineRead } from '../../discovery/refinements';
import { placesFromTilePois } from '../../discovery/tilePois';
import type { Place } from '../../discovery/types';
import { isStale, LANDING_CODE, LANDING_VERSION, rulesCurrent, type LandingRow } from '../../landing/view';
import * as notable from '../../presence/notable';
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

// Generalised Nov 17 (explore-subtypes, decision 0191, p6): what held at p5 holds at every later bump, nothing carried.
test('tend presence 1: the bump to p5 (and every bump since) is presence\'s, carried by the codes that hold it, and every cached area is derived again', () => {
  assert.ok(Number(PRESENCE_CODE.slice(1)) >= 5, PRESENCE_CODE);
  assert.deepEqual(PRESENCE_CARRIED, [], 'what a museum or a park reads as moved, so no p4 row stands (PS9)');
  // The codes that hold presence's carry it; their own parts are what they were at p4.
  assert.equal(ATLAS_CODE, `a14.${PRESENCE_CODE}`);
  assert.equal(LANDING_CODE, 'l4');
  assert.ok(LANDING_VERSION.startsWith(`l4:${PRESENCE_CODE}:`), LANDING_VERSION);
  // Truth vs cache: an area derived under p4 is derived again, never patched. Its row no longer stands, so the same area
  // is listed again as a new row with no profile, read afresh; a near read under p4 is made again; a remembered landing
  // area is stale until it is analyzed again.
  const at: LngLat = [-75.47, 40.6];
  for (const level of ['neighborhood', 'town'] as const) {
    const old: AtlasArea = { key: 'k', level, name: 'Old Town', at, reachM: 800, build: 'b', code: 'a14.p4', listed_at: 1, read_at: 2, failed_at: null, profile: null };
    assert.equal(rowCurrent(old, 'b'), false, `a ${level} row of a14.p4`);
    const again = newRows([old], [{ level, name: 'Old Town', at, reachM: 800 }], 'b', 10);
    assert.equal(again.length, 1, `the ${level} is listed again`);
    assert.deepEqual([again[0].code, again[0].profile, again[0].read_at], [ATLAS_CODE, null, null]);
    assert.equal(old.code, 'a14.p4', 'the old row is not patched');
    assert.equal(newRows([{ ...old, code: ATLAS_CODE }], [{ level, name: 'Old Town', at, reachM: 800 }], 'b', 10).length, 0, 'a p5 row stands');
  }
  assert.equal(needsNear({ at, build: 'b', code: 'a14.p4' } as never, at, 'b'), true, 'a near read under p4 is made again');
  assert.equal(needsNear({ at, build: 'b', code: ATLAS_CODE } as never, at, 'b'), false);
  const p4 = LANDING_VERSION.replace(`:${PRESENCE_CODE}:`, ':p4:');
  assert.equal(rulesCurrent(p4), false);
  assert.equal(isStale({ build: 'b', rules: p4 } as LandingRow, 'b'), true, 'a landing area under p4 is stale');
  assert.equal(isStale({ build: 'b', rules: LANDING_VERSION } as LandingRow, 'b'), false);
});

/** Each archaic or joined spelling of "Old Town" the owner named (Nov 16), beside the spelling it must read as. */
const ARCHAIC: [string, string][] = [
  ['Old Towne', 'Old Town'],
  ['Olde Town', 'Old Town'],
  ['Olde Towne', 'Old Town'],
  ['Oldtown', 'Old Town'],
];

test('tend presence audit 1: "Old Towne", "Olde Town", "Olde Towne" and "Oldtown" read as "Old Town", for a museum and a park', () => {
  for (const [odd, plain] of ARCHAIC) {
    assert.equal(notableBeyondNeighbourhood(`${odd} Museum`), notableBeyondNeighbourhood(`${plain} Museum`), `${odd} Museum`);
    assert.equal(named(['museum'], `${odd} Museum`).includes('historic'), false, `${odd} Museum lights no History`);
    assert.equal(named(['museum'], `${odd} Historic Museum`).includes('historic'), true, `${odd} Historic Museum`);
    for (const rest of ['Playground', 'Tot Lot']) assert.equal(kindOf(`${odd} ${rest}`), kindOf(`${plain} ${rest}`), `${odd} ${rest}`);
    assert.equal(kindOf(`${odd} Playground`), 'community_parks');
  }
  // A building keeps its "Old" ("olde" and "oldtown" are no notable word, so only "Old Towne" has one to keep).
  assert.equal(kindOf('Old Towne Hall Playground'), 'parks');
});

test('tend presence audit 1: "Old Quarters" names a building: a museum there lights History, a playground there stays a park', () => {
  assert.equal(named(['museum'], 'Old Quarters Museum').includes('historic'), true);
  assert.equal(named(['museum'], 'Officers Old Quarters Museum').includes('historic'), true);
  assert.equal(kindOf('Officers Old Quarters Playground'), 'parks');
  assert.equal(kindOf('Old Quarter Playground'), 'community_parks', 'the neighbourhood itself is still read past');
  // A possessive "Old Quarter's" cannot be told from "Old Quarters" after normalizeWords, so it keeps its museum (it errs
  // toward keeping; the coordinator's ruling on the auditor's F1).
  assert.equal(named(['museum'], "Old Quarter's Museum").includes('historic'), true);
  // The plurals and the possessive of town, city and village are the neighbourhood's own name.
  for (const n of ['Old Towns', 'Old Cities', 'Old Villages', "Old City's", "Old Village's"]) {
    assert.equal(notableBeyondNeighbourhood(`${n} Museum`), false, `${n} Museum`);
    assert.equal(kindOf(`${n} Playground`), 'community_parks', `${n} Playground`);
  }
});

test('tend presence audit 1: the read-past keeps no state between reads, and presence exports no regex to share', () => {
  for (const [k, v] of Object.entries(notable)) assert.ok(!(v instanceof RegExp), `notable.ts exports the regex ${k}`);
  const read = notable.readPastNeighbourhood;
  for (let i = 0; i < 3; i++) {
    assert.equal(read('Old Town Museum').trim(), 'museum', `read ${i + 1}`);
    assert.equal(read('Old Town Hall'), read('Old Town Hall'), `read ${i + 1}`);
  }
  // Only before a word the reader names: a park's community word (tend explore audit 1).
  const beforePlay = (rest: string) => / playground /.test(` ${rest} `.slice(0, 13));
  assert.equal(read('Old Town Playground', beforePlay).trim(), 'playground');
  assert.equal(read('Old Town Hall Playground', beforePlay), 'old town hall playground');
  assert.equal(read('Old Town Playground and Old City Hall', beforePlay).replace(/\s+/g, ' ').trim(), 'playground and old city hall', 'each phrase judged at its own place');
});
