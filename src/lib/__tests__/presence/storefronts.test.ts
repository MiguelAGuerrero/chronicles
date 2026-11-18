import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as presence from '../../presence/presence';
import { osmWeight, overtureWeight } from '../../activity/weights';
import { ATLAS_CODE } from '../../atlas/atlas';
import { LANDING_VERSION, rulesCurrent } from '../../landing/view';

// specs/storefronts: storefronts is presence's own reading (decision 0140); only places you walk into weigh (0180).

const NOT_STOREFRONTS = ['park', 'reserve', 'green_amenity', 'open_space', 'monument', 'memorial_site', 'artwork', 'viewpoint', 'curiosity', 'structure', 'burial_ground'] as const;
const STOREFRONTS = ['shop', 'boutique', 'eatery', 'food_counter', 'drink', 'venue', 'museum', 'arts_centre', 'theatre', 'cinema_hall', 'heritage', 'attraction', 'community', 'civic_hall', 'worship', 'service', 'health', 'lodging', 'civic', 'sport', 'office', 'vehicle'] as const;

test('SF10: presence says which classes are storefronts; only a storefront weighs toward density', () => {
  const p = presence;
  for (const c of NOT_STOREFRONTS) {
    assert.equal(p.isStorefront(c), false, `${c} is not a storefront`);
    assert.equal(p.storefrontWeight([c]), 0, `${c} weighs nothing`);
  }
  for (const c of STOREFRONTS) {
    assert.equal(p.isStorefront(c), true, `${c} is a storefront`);
    assert.equal(p.storefrontWeight([c]), presence.CLASSES[c].weight, `${c} weighs what it did`);
  }
  // Through the readers every density consumer uses (activity/points.ts).
  assert.equal(osmWeight('park', 'park'), 0, 'a park');
  assert.equal(osmWeight('monument', 'monument'), 0, 'a monument');
  assert.equal(osmWeight('art_gallery', 'artwork'), 0, 'public art');
  assert.equal(osmWeight('attraction', 'viewpoint'), 0, 'a viewpoint');
  assert.equal(osmWeight('cemetery', 'cemetery'), 0, 'a cemetery');
  assert.equal(osmWeight('restaurant', 'restaurant'), 1, 'a restaurant, as before');
  assert.equal(osmWeight('pharmacy', 'pharmacy'), 0.5, 'a pharmacy, as before');
  assert.equal(overtureWeight(['food_and_drink', 'restaurant']), 1, 'an Overture restaurant, as before');
  assert.equal(overtureWeight(['services_and_business']), 0.25, 'an office, as before');
  // A complex's shopping word keeps the old weight: a mall's art is still its own (decision 0180).
  assert.equal(presence.densityWeight(['artwork']), 1);
});

test('SF11: the reclassification re-derives what depends on it: a new presence code; p6 was carried under p7 (QC16, QC14), nothing under p8 (more attractions moved weights, decision 0198) or p9 (the more-attractions audit moved kinds and bars) or p10 (typed bridges moved a bar, MA10)', () => {
  assert.notEqual(presence.PRESENCE_CODE, 'p2');
  assert.deepEqual(presence.PRESENCE_CARRIED, [], 'p10 gives a typed suspension bridge no History bar (MA10), as p9 moved theme parks, a museum by type\'s History and a pier\'s bar (more-attractions audits 1-3), so no earlier row stands');
  assert.ok(ATLAS_CODE.endsWith(`.${presence.PRESENCE_CODE}`), 'the atlas reads its areas again');
  assert.ok(LANDING_VERSION.includes(`:${presence.PRESENCE_CODE}:`), 'the landing reads its areas again');
  assert.equal(rulesCurrent(LANDING_VERSION.replace(`:${presence.PRESENCE_CODE}:`, ':p2:')), false, 'a remembered area under p2 is read again');
  assert.equal(rulesCurrent(LANDING_VERSION.replace(`:${presence.PRESENCE_CODE}:`, ':p7:')), false, 'p7 is read again: p8 carries nothing (decision 0198)');
  assert.equal(rulesCurrent(LANDING_VERSION.replace(`:${presence.PRESENCE_CODE}:`, ':p8:')), false, 'p8 is read again: p9 carries nothing (more-attractions audits 1-3)');
  assert.equal(rulesCurrent(LANDING_VERSION.replace(`:${presence.PRESENCE_CODE}:`, ':p9:')), false, 'p9 is read again: p10 carries nothing (typed bridges, MA10)');
  assert.equal(rulesCurrent(LANDING_VERSION.replace(`:${presence.PRESENCE_CODE}:`, ':p3:')), false, 'p3 is read again: only the code just before is carried');
});
