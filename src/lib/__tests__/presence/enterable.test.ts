// tend presence audit 2 (2026-11-20; the diff review's auditor 3 and the steward's silent 2): the owner, in person, Nov 20:
// "Manners or any other monumental structures that you can enter and browse should be counted both as storefront and points
// of interest. I'm not trying to split hairs with this because I'd rather be inclusive than being overly dismissive." On the
// shape: "Enterable counts both (Recommended)". It partly revises Nov 19's "Monument, counts nothing" (decision 0238).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { overtureWeight, osmWeight } from '../../activity/weights';
import { isMarkFor } from '../../discovery/curation';
import * as p from '../../presence/presence';

test('tend presence audit 2: a castle, a manor or a fort from the map is a place to find and a storefront; an Overture historic site a storefront with no mark; a plain monument neither', () => {
  for (const sub of ['castle', 'manor', 'fort', 'palace', 'stately']) {
    const cs = p.classesOfOsm('castle', sub);
    assert.equal(p.markClassOf(cs), 'monument', `castle/${sub} is History's Monuments and memorials`);
    assert.equal(isMarkFor(cs), true, `castle/${sub} is a place to find`);
    assert.equal(osmWeight('castle', sub), 1, `castle/${sub} is a storefront`);
  }
  // A ruin is a Ruin, never a storefront (XS12).
  assert.equal(p.markClassOf(p.classesOfOsm('castle', 'ruins')), 'ruin');
  assert.equal(osmWeight('castle', 'ruins'), 0);
  // Overture's historic site counts toward storefronts again, and is still no mark (0109).
  const site = p.classesOfOverture(['cultural_and_historic', 'historic_site']);
  assert.equal(overtureWeight(['cultural_and_historic', 'historic_site']), 1);
  assert.equal(p.markClassOf(site), null);
  // Plain monuments and statues, parks, cemeteries and memorial sites count nothing.
  assert.equal(osmWeight('monument', 'monument'), 0);
  assert.equal(p.storefrontWeight(p.classesOfArchive('statue')), 0);
  assert.equal(p.storefrontWeight(p.classesOfArchive('monument')), 0);
  for (const h of [['cultural_and_historic', 'memorial_site', 'cemetery'], ['sports_and_recreation', 'park']]) assert.equal(overtureWeight(h), 0, h.join(' > '));
});
