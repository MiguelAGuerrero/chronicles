/// <reference types="node" />
// The recording bar's Edit offer waits (decision 0149, from /tend inbox T12; amends ME23 on the bar alone): a pill above
// the bar, "Photo saved to your walk · Edit · ✕", until Edit, Close or the next capture; the line keeps its time and
// distance.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { pressHintUp } from '../../atlas/overlaySlots';
import { EDIT_OFFER_MS, offerEdit, offerLeft } from '../../editOffer';
import { barOffer, barOfferAfter, barOfferAfterHidden, barOfferShown, barOfferWords } from '../../recordingBar';

const photo = { id: 'p1', kind: 'photo' as const };

test('tend tabs T12: the bar offers Edit for its photo with no end of its own', () => {
  const o = barOffer(photo);
  assert.deepEqual(o, { id: 'p1', kind: 'photo' });
  // No clock in it: it stands for as long as its photo is the walk's.
  assert.equal('until' in o, false);
  assert.equal(barOfferShown(o, ['m0', 'p1'], new Set()), true);
});

test('tend tabs T12: the next capture ends the offer, a photo from the bar replacing it with its own', () => {
  const o = barOffer(photo);
  // A guard only: the bus tells of the bar's own photo before the bar offers it (tend tabs audit 21), so that news
  // ends the previous offer; should it ever come after, it leaves its own offer standing.
  assert.equal(barOfferAfter(o, 'p1'), o);
  // A capture from elsewhere (Memories' band, the same walk) ends it.
  assert.equal(barOfferAfter(o, 'm2'), null);
  // Nothing to end.
  assert.equal(barOfferAfter(null, 'm2'), null);
  // The bar's next photo is offered in its place.
  assert.deepEqual(barOffer({ id: 'p2', kind: 'photo' }), { id: 'p2', kind: 'photo' });
});

test('tend tabs T12: a photo no longer in the walk (deleted elsewhere) is not offered', () => {
  assert.equal(barOfferShown(barOffer(photo), ['m0'], new Set()), false);
  assert.equal(barOfferShown(null, ['p1'], new Set()), false);
});

test('tend tabs T12: the pill says what was kept, is announced with its Edit, and its Close says the photo stays', () => {
  assert.deepEqual(barOfferWords('photo'), {
    text: 'Photo saved to your walk',
    spoken: 'Photo saved to your walk. Edit is available.',
    close: 'Close, the photo stays as it is',
  });
  assert.equal(barOfferWords('video').text, 'Video saved to your walk');
  assert.equal(barOfferWords('video').close, 'Close, the video stays as it is');
  for (const k of ['photo', 'video'] as const) assert.doesNotMatch(Object.values(barOfferWords(k)).join(' '), /\d/);
});

test("tend tabs T12: ME23's other places keep their six seconds", () => {
  assert.equal(offerLeft(offerEdit(photo, 1000), 1000), EDIT_OFFER_MS);
  assert.equal(EDIT_OFFER_MS, 6000);
});

test('tend tabs audit 15: a bar photo deleted elsewhere (waiting on Undo, or gone) ends the offer and is never shown', () => {
  const o = barOffer(photo);
  // Deleted from Memories: hidden while its Undo waits, and the bar's own list still holds it.
  assert.equal(barOfferShown(o, ['m0', 'p1'], new Set(['p1'])), false);
  assert.equal(barOfferAfterHidden(o, new Set(['p1'])), null);
  // Another thing deleted leaves it as it is.
  assert.equal(barOfferAfterHidden(o, new Set(['m0'])), o);
  assert.equal(barOfferShown(o, ['m0', 'p1'], new Set(['m0'])), true);
  assert.equal(barOfferAfterHidden(null, new Set(['p1'])), null);
});

test('tend tabs audit 18: a later bar photo that fails to save ends the offer, so no pill says saved over the failure', () => {
  assert.equal(barOfferAfter(barOffer(photo), null), null);
  assert.equal(barOfferAfter(null, null), null);
});

test('tend tabs audit 19: while the walk is stopping from the bar the pill is not shown, so no edit starts that the stop would lose', () => {
  const o = barOffer(photo);
  assert.equal(barOfferShown(o, ['p1'], new Set(), true), false);
  assert.equal(barOfferShown(o, ['p1'], new Set(), false), true);
});

// /tend inbox T36 (the proxy's yes under 0157, 2026-11-18): the pill's room above the bar lifts Explore's map, so at
// 320 x 700 the walker sat under "Press and hold the map to look anywhere." The hint steps aside while the pill is up and
// shows again as it goes; its seconds on screen count only while it shows, so EC14's "after a few seconds on screen it
// is marked seen" holds.
test('tend tabs T36: Explore\'s press hint steps aside while the bar\'s Edit pill is up, and counts no time on screen meanwhile', () => {
  const unseen = { seen: false, spot: false, located: true, focused: true, covered: false, folded: false, slotTaken: false };
  assert.equal(pressHintUp({ ...unseen, barOffer: false }), true);
  assert.equal(pressHintUp({ ...unseen, barOffer: true }), false, 'stepped aside while the pill is up');
  // Nothing else moves: seen, a long press open or no place yet keep it down as before, the pill or not.
  for (const barOffer of [false, true]) {
    assert.equal(pressHintUp({ ...unseen, seen: true, barOffer }), false);
    assert.equal(pressHintUp({ ...unseen, spot: true, barOffer }), false);
    assert.equal(pressHintUp({ ...unseen, located: false, barOffer }), false);
  }
});

test('tend tabs T36: the bar tells the tabs whether its Edit pill is up, and Explore times its hint by the same reading', () => {
  const bar = readFileSync(join(__dirname, '../../../components/RecordingBar.tsx'), 'utf8');
  const explore = readFileSync(join(__dirname, '../../../app/(tabs)/explore.tsx'), 'utf8');
  // tend tabs audit 29 (the review's auditor 3): set on every change of what the bar shows and cleared as it goes, so
  // effect deps of [] (stuck false) or a read with no subscription fail here.
  assert.match(bar, /barOfferUp\.set\(offerUp\);\s*return \(\) => barOfferUp\.set\(false\);\s*\}, \[offerUp\]\);/, 'the bar publishes what it shows, and takes it with it');
  assert.match(explore, /useStore\(barOfferUp,/, 'Explore subscribes to the pill');
  // The one reading gates both the timer that marks the hint seen and what is drawn, so it is never marked seen unseen.
  assert.match(explore, /const hintShown = pressHintUp\(\{[^}]*barOffer[^}]*\}\)/);
  assert.match(explore, /if \(!hintShown\) return;/);
  assert.match(explore, /\) : hintShown \? \(/);
});

// /tend inbox T37 (the proxy's yes under 0157, 2026-11-18): the storage notice on Memories waits for the bar's Edit pill
// (the shell's half is in storage/spaceShell.test.ts); the app's instance reads the same store the bar sets.
test('tend tabs T37: the app\'s storage awareness waits on the bar\'s Edit pill, the store the bar publishes', () => {
  const index = readFileSync(join(__dirname, '../../space/index.ts'), 'utf8');
  // tend tabs audit 32: the pill is one part of where the line can be seen.
  assert.match(index, /import \{ barOfferUp, modalsUp \} from '\.\.\/tabsHidden';/);
  assert.match(index, /createSpace\(ports, probe, sightOf\(\{ pill: barOfferUp, lines: spaceLines, modals: modalsUp \}\)\)/, 'the instance is given the pill');
});

// tend tabs audit 32 (the T37 review's auditor 1, ux 2, steward 2): a line is said and marked only where it can be seen, so
// every SpaceLine counts itself mounted, before it knows whether it has a line to draw.
test('tend tabs audit 32: each SpaceLine counts itself mounted, and the instance reads that count and the Modals up', () => {
  const line = readFileSync(join(__dirname, '../../../components/SpaceLine.tsx'), 'utf8');
  assert.match(line, /useEffect\(\(\) => holdCount\(spaceLines\), \[\]\);\s*const line = useStore\(space\.store/, 'held in an effect, before the line is read');
  assert.match(line, /import \{ holdCount, spaceLines \} from '\.\.\/lib\/space\/sight';/);
});
