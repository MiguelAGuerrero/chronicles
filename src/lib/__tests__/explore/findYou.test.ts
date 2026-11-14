import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCKED_LINE, findYou, type PermissionSeen } from '../../atlas/findYou';

// tend explore 8 (decision 0172, O6 and O20): with no fix, Explore showed Locate at the map's edge and Find me in the
// empty card, the same crosshair twice; after a refusal Find me stayed under the notice, a button that could only be
// refused again until location was turned on. One way to find you: the edge Locate steps aside while the card offers
// Find me, and after a refusal Find me waits until the permission changes.

const seen = (state: PermissionSeen['state'], changes = 0): PermissionSeen => ({ state, changes });

test('tend explore 8: with no fix and no refusal the card offers Find me, and the edge Locate steps aside', () => {
  assert.deepEqual(findYou({ cardEmpty: true, refused: null, permission: seen('prompt') }), { findMe: true, edgeLocate: false, blocked: false });
  assert.deepEqual(findYou({ cardEmpty: true, refused: null, permission: seen('unknown') }), { findMe: true, edgeLocate: false, blocked: false });
});

test('tend explore 8: with areas in the row there is no Find me, and the edge Locate is the way back to you', () => {
  assert.deepEqual(findYou({ cardEmpty: false, refused: null, permission: seen('granted') }), { findMe: false, edgeLocate: true, blocked: false });
});

test('tend explore 8: after a refusal Find me waits while the permission is as it was refused', () => {
  const r = findYou({ cardEmpty: true, refused: 0, permission: seen('denied', 0) });
  assert.equal(r.findMe, false, 'no Find me under the refusal');
  // No permission API (some browsers): nothing ever says it changed, so Find me stays withheld; the edge Locate stays.
  assert.equal(findYou({ cardEmpty: true, refused: 0, permission: seen('unknown', 0) }).findMe, false);
});

test('tend explore 8: the refusal\'s own change to "denied" never brings Find me back', () => {
  // The browser may report prompt -> denied just after the refusal is heard: a change, but still denied.
  assert.equal(findYou({ cardEmpty: true, refused: 0, permission: seen('denied', 1) }).findMe, false);
});

test('tend explore 8: once the permission changes from how it was refused, Find me comes back and the edge Locate steps aside', () => {
  assert.deepEqual(findYou({ cardEmpty: true, refused: 0, permission: seen('granted', 1) }), { findMe: true, edgeLocate: false, blocked: false });
  // Reset to ask again (a browser's "Reset permission"): Find me is worth a tap again.
  assert.deepEqual(findYou({ cardEmpty: true, refused: 2, permission: seen('prompt', 3) }), { findMe: true, edgeLocate: false, blocked: false });
});

// tend explore audit 8 (auditor 1, ux 1): after a refusal the edge Locate came back, a control that could only be refused
// again while the browser or the phone holds "denied". While location is blocked neither way shows; the edge Locate stays
// where a tap may still ask (a prompt dismissed, no permissions API).
test('tend explore audit 8: refused and the permission reading "denied": no Find me and no edge Locate', () => {
  assert.deepEqual(findYou({ cardEmpty: true, refused: 0, permission: seen('denied', 0) }), { findMe: false, edgeLocate: false, blocked: true });
  assert.deepEqual(findYou({ cardEmpty: true, refused: 0, permission: seen('denied', 1) }), { findMe: false, edgeLocate: false, blocked: true });
});

test('tend explore audit 8: refused while a tap may still ask ("prompt", "unknown"), the edge Locate stays', () => {
  assert.deepEqual(findYou({ cardEmpty: true, refused: 0, permission: seen('prompt', 0) }), { findMe: false, edgeLocate: true, blocked: false });
  assert.deepEqual(findYou({ cardEmpty: true, refused: 0, permission: seen('unknown', 0) }), { findMe: false, edgeLocate: true, blocked: false });
});

test('tend explore audit 8: never blocked without a refusal, or with areas in the row', () => {
  assert.equal(findYou({ cardEmpty: true, refused: null, permission: seen('denied') }).blocked, false);
  assert.deepEqual(findYou({ cardEmpty: false, refused: 0, permission: seen('denied') }), { findMe: false, edgeLocate: true, blocked: false });
});

// tend explore audit 9 (ux 2; the owner, in person, Nov 14, during the review: "Say where to turn it on"): while location
// is blocked the empty card's line is the refusal's own sentence. A phone has no browser: its line names Settings, as the
// phone's own notice does.
test('tend explore audit 9: the blocked card says where to turn location on, in the owner\'s words on the web', () => {
  assert.equal(BLOCKED_LINE.web, 'Location is off. Turn it on in your browser’s or your phone’s settings to see the areas around you.');
  assert.equal(BLOCKED_LINE.native, 'Location is turned off for Chronicles. Turn it on in Settings to see the areas around you.');
});
