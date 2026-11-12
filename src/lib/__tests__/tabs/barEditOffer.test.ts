/// <reference types="node" />
// The recording bar's Edit offer waits (decision 0149, from /tend inbox T12; amends ME23 on the bar alone): a pill above
// the bar, "Photo saved to your walk · Edit · ✕", until Edit, Close or the next capture; the line keeps its time and
// distance.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EDIT_OFFER_MS, offerEdit, offerLeft } from '../../editOffer';
import { barOffer, barOfferAfter, barOfferShown, barOfferWords } from '../../recordingBar';

const photo = { id: 'p1', kind: 'photo' as const };

test('tend tabs T12: the bar offers Edit for its photo with no end of its own', () => {
  const o = barOffer(photo);
  assert.deepEqual(o, { id: 'p1', kind: 'photo' });
  // No clock in it: it stands for as long as its photo is the walk's.
  assert.equal('until' in o, false);
  assert.equal(barOfferShown(o, ['m0', 'p1']), true);
});

test('tend tabs T12: the next capture ends the offer, a photo from the bar replacing it with its own', () => {
  const o = barOffer(photo);
  // Its own photo reaching the walk (the bus tells every path) leaves it standing.
  assert.equal(barOfferAfter(o, 'p1'), o);
  // A capture from elsewhere (Memories' band, the same walk) ends it.
  assert.equal(barOfferAfter(o, 'm2'), null);
  // Nothing to end.
  assert.equal(barOfferAfter(null, 'm2'), null);
  // The bar's next photo is offered in its place.
  assert.deepEqual(barOffer({ id: 'p2', kind: 'photo' }), { id: 'p2', kind: 'photo' });
});

test('tend tabs T12: a photo no longer in the walk (deleted elsewhere) is not offered', () => {
  assert.equal(barOfferShown(barOffer(photo), ['m0']), false);
  assert.equal(barOfferShown(null, ['p1']), false);
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
