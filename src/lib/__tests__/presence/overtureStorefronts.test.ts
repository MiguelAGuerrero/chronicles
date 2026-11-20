// tend presence 2 (2026-11-19): SF10 says parks, monuments, memorials and cemeteries weigh nothing toward storefronts. The map's
// did not; Overture's same places did, through their roots (`cultural_and_historic` a storefront `heritage`,
// `sports_and_recreation` a storefront `sport`). The owner, in person, Nov 19: "Monument, counts nothing (Recommended)"; and Nov 20,
// "Enterable counts both (Recommended)": an Overture historic site counts again, with no mark (tend presence audit 2).
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { overtureWeight, osmWeight } from '../../activity/weights';
import * as presence from '../../presence/presence';

const SRC = join(__dirname, '..', '..', '..');

const FIXTURES = ['lib/__tests__/landing/phillipsburg.json', 'lib/__tests__/complexes/whitehall.json', 'lib/__tests__/complexes/harrisburg.json'];

test('tend presence 2: an Overture park, trail, memorial site or cemetery weighs nothing toward storefronts, as the map\'s do', () => {
  // The map's, as SF10 pins them.
  assert.equal(osmWeight('park', 'park'), 0);
  assert.equal(osmWeight('monument', 'monument'), 0);
  assert.equal(osmWeight('cemetery', 'cemetery'), 0);
  // Overture's, under the names its release uses (the three real fixtures hold each).
  for (const h of [
    ['cultural_and_historic', 'memorial_site'],
    ['cultural_and_historic', 'memorial_site', 'cemetery'],
    ['sports_and_recreation', 'park'],
    ['sports_and_recreation', 'park', 'dog_park'],
    ['sports_and_recreation', 'park', 'playground'],
    ['sports_and_recreation', 'recreational_trail_or_path'],
    ['sports_and_recreation', 'recreational_trail_or_path', 'hiking_trail'],
  ]) assert.equal(overtureWeight(h), 0, h.join(' > '));
  // Every such place in the real fixtures.
  let seen = 0;
  for (const f of FIXTURES) {
    const txt = readFileSync(join(SRC, f), 'utf8');
    for (const m of txt.matchAll(/"hierarchy":\s*(\[[^\]]*\])/g)) {
      const h: string[] = JSON.parse(m[1]);
      if (!h.some((x) => ['memorial_site', 'park', 'recreational_trail_or_path'].includes(x))) continue;
      seen++;
      assert.equal(overtureWeight(h), 0, h.join(' > '));
    }
  }
  assert.ok(seen >= 20, `the fixtures hold such places (${seen})`);
  // What still counts stays: a place of worship, a cultural centre, a sports centre, a restaurant; a historic site and a manor
  // you can walk into (tend presence audit 2, the owner, Nov 20).
  assert.equal(overtureWeight(['cultural_and_historic', 'historic_site']), 1);
  assert.equal(overtureWeight(['cultural_and_historic', 'place_of_worship']), 0.5);
  assert.equal(overtureWeight(['cultural_and_historic', 'cultural_center']), 1);
  assert.equal(overtureWeight(['cultural_and_historic']), 1);
  assert.equal(overtureWeight(['sports_and_recreation']), 0.5);
  assert.equal(overtureWeight(['food_and_drink', 'restaurant']), 1);
  assert.equal(osmWeight('castle', 'manor'), 1);
});

test('tend presence 2: a complex\'s shopping word reads the same weight for these places as before (densityWeight)', () => {
  const dw = (h: string[]) => presence.densityWeight(presence.classesOfOverture(h));
  assert.equal(dw(['cultural_and_historic', 'historic_site']), 1);
  assert.equal(dw(['cultural_and_historic', 'memorial_site', 'cemetery']), 1);
  assert.equal(dw(['sports_and_recreation', 'park']), 0.5);
  assert.equal(dw(['sports_and_recreation', 'recreational_trail_or_path']), 0.5);
});

test('tend presence 2: Overture\'s classes are read only by density and complexes, so none becomes a mark (decision 0109)', () => {
  const readers: string[] = [];
  const walk = (dir: string) => {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) {
        if (n !== '__tests__' && n !== 'node_modules') walk(p);
      } else if (/\.tsx?$/.test(n) && /\bclassesOfOverture\b/.test(readFileSync(p, 'utf8'))) readers.push(relative(SRC, p));
    }
  };
  walk(SRC);
  assert.deepEqual(readers.sort(), ['lib/activity/weights.ts', 'lib/complexes/rule.ts', 'lib/presence/presence.ts']);
  // Overture's park and trail are no category, so nothing reading them could light a bar or make a mark.
  for (const h of [['sports_and_recreation', 'park'], ['sports_and_recreation', 'recreational_trail_or_path']]) {
    assert.equal(presence.markClassOf(presence.classesOfOverture(h)), null, h.join(' > '));
  }
});

test('tend presence 2: a weight moved, so the presence code moves on with nothing carried (p11)', () => {
  assert.equal(presence.PRESENCE_CODE, 'p11');
  assert.deepEqual(presence.PRESENCE_CARRIED, []);
});
