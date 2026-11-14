/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { LOCATION_OFF, locateNotice } from '../../locate/notice';

// T17 (the owner's yes, decision 0154): a refused location is a quiet notice (the cream banner, dark text), not a
// fault. `locate/` is the moments feature's, so its test lives here, where `npm run test:feature moments` and its
// coverage reach it (tend map audit 18).

test('tend map T17: refused, Locate says where to turn location on, as a quiet notice; a phone offers Open Settings (beside locate/, tend map audit 18)', () => {
  const web = locateNotice('denied', 'web');
  assert.deepEqual(web, { message: LOCATION_OFF.web, tone: 'info', refused: true });
  const phone = locateNotice('denied', 'native');
  assert.equal(phone.tone, 'info');
  assert.equal(phone.openSettings, true);
  assert.equal(phone.message, LOCATION_OFF.native);
  assert.match(phone.message, /Turn it on in Settings/);
  // Not the old fault's words, on either platform.
  for (const n of [web, phone]) assert.doesNotMatch(n.message, /denied|permission/i);
  // A timeout or no location at all is not a refusal (tend walk-screen 5 below gives it its words and its tone).
  for (const reason of ['timeout', 'unavailable', undefined] as const) assert.notEqual(locateNotice(reason, 'web').refused, true);
});

// tend walk-screen 4 (decision 0172, O19, amending 0154's words): a phone can keep location off for the browser itself
// (iOS Settings › Privacy › Location Services › Safari Websites), where "the browser’s settings" sent the person to the
// wrong place. The web's refusal names both, as Explore's empty card does.
test("tend walk-screen 4: Locate refused on the web says to turn location on in your browser's or your phone's settings", () => {
  assert.equal(LOCATION_OFF.web, 'Location is off for this site. Turn it on in your browser’s or your phone’s settings to see where you are.');
  assert.deepEqual(locateNotice('denied', 'web'), { message: LOCATION_OFF.web, tone: 'info', refused: true });
  // A phone's own refusal names its Settings, which the notice opens: unchanged.
  assert.equal(LOCATION_OFF.native, 'Location is turned off for Chronicles. Turn it on in Settings to find your position.');
});

// tend walk-screen 5 (decision 0172, O21): Locate's timeout said "Couldn’t find your position" in red, a fault's alert,
// and named no next step. It is no fault of the person's, and waiting is the way: it says so, in the quiet notice's
// tone. The tone no longer says a refusal: `refused` does, so Explore holds Find me back after a refusal, never after a
// timeout (tend explore 8).
test('tend walk-screen 5: a Locate that found nothing in time says to try again in a moment, quietly, and is no refusal', () => {
  for (const platform of ['web', 'native'] as const) {
    for (const reason of ['timeout', 'unavailable', undefined] as const) {
      assert.deepEqual(locateNotice(reason, platform), { message: 'Couldn’t find your position. Try again in a moment.', tone: 'info' });
    }
    assert.equal(locateNotice('denied', platform).refused, true);
  }
});

test('tend walk-screen 5: Explore tells a refusal by `refused`, never by the quiet tone a timeout shares', () => {
  const src = readFileSync(join(__dirname, '../../../app/(tabs)/explore.tsx'), 'utf8');
  assert.doesNotMatch(src, /tone === 'info'/, 'no refusal read from the tone');
  assert.match(src, /if \(e\.refused\) setRefused\(/, "Locate's refusal holds Find me back");
  assert.match(src, /setLocError\(\(e\) => \(e\?\.refused \? null : e\)\)/, 'the permission given back takes only the refusal down');
});
