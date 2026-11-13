/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LOCATION_OFF, locateNotice } from '../../locate/notice';

// T17 (the owner's yes, decision 0154): a refused location is a quiet notice (the cream banner, dark text), not a
// fault. `locate/` is the moments feature's, so its test lives here, where `npm run test:feature moments` and its
// coverage reach it (tend map audit 18).

test('tend map T17: refused, Locate says where to turn location on, as a quiet notice; a phone offers Open Settings (beside locate/, tend map audit 18)', () => {
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
