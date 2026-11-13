/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LOCATION_OFF, locateNotice } from '../../locate/notice';
import { scaleShown } from '../../scaleBar';

// T17 (the owner's yes, decision 0154): a refused location is a quiet notice in ink, not a fault, and with no fix and
// nothing drawn the map shows no scale bar over a blank world. Navigate and Explore (Locate).

test('tend map T17: refused, Locate says where to turn location on, as a quiet notice; a phone offers Open Settings', () => {
  const web = locateNotice('denied', 'web');
  assert.deepEqual(web, { message: 'Location is off for this site. Turn it on in the browser’s settings to see where you are.', tone: 'info' });
  const phone = locateNotice('denied', 'native');
  assert.equal(phone.tone, 'info');
  assert.equal(phone.openSettings, true);
  assert.equal(phone.message, LOCATION_OFF.native);
  assert.match(phone.message, /Turn it on in Settings/);
  // Not the old fault's words, on either platform.
  for (const n of [web, phone]) assert.doesNotMatch(n.message, /denied|permission/i);
  // A timeout or no location at all is still a failure, said as before.
  for (const reason of ['timeout', 'unavailable', undefined] as const) {
    assert.deepEqual(locateNotice(reason, 'web'), { message: 'Couldn’t find your position', tone: 'error' });
  }
});

test('tend map T17: with no fix and nothing drawn, no scale bar over a blank world; anything else keeps it', () => {
  // Navigate and Explore hide it over a blank world.
  assert.equal(scaleShown({ hideOnBlank: true, fix: false, drawn: false }), false);
  // Until the map has looked, it waits rather than flash "2,000 km".
  assert.equal(scaleShown({ hideOnBlank: true, fix: false, drawn: null }), false);
  assert.equal(scaleShown({ hideOnBlank: true, fix: false, drawn: true }), true);
  assert.equal(scaleShown({ hideOnBlank: true, fix: true, drawn: false }), true);
  assert.equal(scaleShown({ hideOnBlank: true, fix: true, drawn: null }), true);
  // Every other map (the walk, the replay, Chronicle) always draws its bar.
  for (const drawn of [false, null, true]) assert.equal(scaleShown({ hideOnBlank: false, fix: false, drawn }), true);
});
