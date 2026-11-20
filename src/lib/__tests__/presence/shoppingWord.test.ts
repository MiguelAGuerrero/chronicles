// tend presence audit 3 (2026-11-20; the diff review's steward, silent 3): a complex's "shopping" word counted Overture's places by
// `densityWeight`, so a cemetery or a memorial site weighed in full. The owner, in person, Nov 20: "Never (Recommended)":
// cemeteries, memorial sites and parks weigh nothing toward a complex's shopping word; a mall's own art still counts.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { kindOf, MIN_GO } from '../../complexes/rule';
import { COMPLEX_CODE } from '../../complexes/types';
import * as p from '../../presence/presence';

const places = (h: string[], n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, at: [0, 0] as [number, number], hierarchy: h }));
const B = { subtype: 'commercial', class: null };

test('tend presence audit 3: a cemetery, a memorial site or a park never helps call a complex shopping; a mall\'s own art still counts', () => {
  for (const h of [['cultural_and_historic', 'memorial_site', 'cemetery'], ['cultural_and_historic', 'memorial_site'], ['sports_and_recreation', 'park'], ['sports_and_recreation', 'recreational_trail_or_path']]) {
    assert.equal(p.densityWeight(p.classesOfOverture(h)), 0, h.join(' > '));
    assert.equal(kindOf(B, places(h, MIN_GO + 2)), null, h.join(' > '));
  }
  // The map's grounds read the same.
  for (const c of ['park', 'reserve', 'green_amenity', 'open_space', 'burial_ground', 'memorial_site'] as const) assert.equal(p.densityWeight([c]), 0, c);
  // What a mall holds still counts: its shops, its food, its art (decision 0180), a historic site you can enter.
  assert.equal(p.densityWeight(['artwork']), 1);
  assert.equal(kindOf(B, places(['shopping', 'clothing_store'], MIN_GO)), 'shopping');
  assert.equal(p.densityWeight(p.classesOfOverture(['cultural_and_historic', 'historic_site'])), 1);
  // A complex's word can change, so its stored rows are read again (CX14).
  assert.equal(COMPLEX_CODE, 'c2');
});
