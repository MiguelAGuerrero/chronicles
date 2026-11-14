/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import type { LocatePermission } from '../../atlas/findYou';
import { gapsOf } from '../../gaps/infer';
import { followPermission } from '../../recorder/followPermission';
import { readTrace } from '../../rides';
import type { TracePoint } from '../../types';

// tend walk-screen 3 (decision 0172, O22, the owner's answer to "does not say what happens once it is on: the walk is
// already open"): on the web, location turned off mid-walk stopped the recording, and turning it back on did nothing
// until the page came back to the front or was reloaded: the web recorder did not watch the permission, as Locate's
// reader does (`locate/permission.web.ts`). Now a refusal follows the site's permission, and once it changes to
// granted the walk records again by itself, with no new words.

/** A permission reader the test drives: `tell` reports a state, as the browser's `change` does. */
function fakeWatch() {
  let on: ((s: LocatePermission) => void) | null = null;
  let stopped = 0;
  const watch = (cb: (s: LocatePermission) => void) => {
    on = cb;
    return () => {
      stopped++;
      on = null;
    };
  };
  return { watch, tell: (s: LocatePermission) => on?.(s), stopped: () => stopped, live: () => on != null };
}

test('tend walk-screen 3: after a refusal, the permission changing to granted resumes the walk, once', () => {
  const w = fakeWatch();
  let resumed = 0;
  followPermission(w.watch, () => resumed++);
  w.tell('denied'); // how it stood at the refusal
  assert.equal(resumed, 0);
  w.tell('granted');
  assert.equal(resumed, 1, 'location given back: the walk records again by itself');
  assert.equal(w.live(), false, 'and stops following: the restart follows again if it is refused again');
  w.tell('granted');
  assert.equal(resumed, 1);
});

test('tend walk-screen 3: a reset to ask, or no permissions API, resumes nothing', () => {
  const w = fakeWatch();
  let resumed = 0;
  followPermission(w.watch, () => resumed++);
  w.tell('denied');
  w.tell('prompt'); // the browser's "Reset permission": no fix comes without a prompt, and no prompt without a tap
  assert.equal(resumed, 0);
  const none = fakeWatch();
  followPermission(none.watch, () => resumed++);
  none.tell('unknown');
  assert.equal(resumed, 0);
});

test('tend walk-screen 3: granted as the refusal is heard is no change: a phone that blocks the browser is not retried round and round', () => {
  // A phone with location off for the browser can refuse every fix while the site's permission reads granted: a restart
  // on that first report would be refused again at once, and follow again, for ever.
  const w = fakeWatch();
  let resumed = 0;
  followPermission(w.watch, () => resumed++);
  w.tell('granted');
  assert.equal(resumed, 0);
  w.tell('denied');
  w.tell('granted');
  assert.equal(resumed, 1, 'a real change to granted later still resumes');
});

test('tend walk-screen 3: the walk stopped or restarted meanwhile stops the following', () => {
  const w = fakeWatch();
  let resumed = 0;
  const stop = followPermission(w.watch, () => resumed++);
  w.tell('denied');
  stop();
  assert.equal(w.stopped(), 1);
  w.tell('granted');
  assert.equal(resumed, 0);
});

test('tend walk-screen 3: the off span reads as a gap in the trace, never a pause; under a minute it is no break at all', () => {
  // Nothing is stored for the time location was off: no fix and no pause row. `readTrace` reads it as it reads lost
  // GPS: over a minute between walked fixes (no pause, no ride) is a gap, offered to be filled (G1); shorter, the line
  // simply runs on.
  const fix = (t: number, i: number): TracePoint => ({ walk_id: 'w', t, lat: 41.812 + i * 0.00005, lon: -71.4, accuracy_m: 6, speed: 1.4, course: null });
  const before = Array.from({ length: 12 }, (_, i) => fix(i * 5000, i));
  const offMs = 3 * 60_000;
  const after = Array.from({ length: 12 }, (_, i) => fix(55_000 + offMs + i * 5000, 12 + i));
  const tr = readTrace([...before, ...after], 0, []);
  const gaps = gapsOf(tr);
  assert.equal(gaps.length, 1, 'one gap where location was off');
  assert.equal(gaps[0].t0, 55_000);
  assert.equal(gaps[0].t1, 55_000 + offMs, 'from the last fix before to the first after');
  const short = [...before, ...Array.from({ length: 12 }, (_, i) => fix(55_000 + 40_000 + i * 5000, 12 + i))];
  assert.equal(gapsOf(readTrace(short, 0, [])).length, 0, '40 s off: no gap, no break');
});

test('tend walk-screen 3: the web recorder follows the permission after a refusal, and stops following on a start or a stop', () => {
  // The recorder loads the app's db, which no Node test can: its wiring is read from its source.
  const src = readFileSync(join(__dirname, '../../recorder/index.web.ts'), 'utf8');
  const denied = src.slice(src.indexOf('err.PERMISSION_DENIED'), src.indexOf('{ enableHighAccuracy'));
  // tend walk-screen audit 2-4: through the follower that resumes only the store's open, unpaused walk (its behaviour is
  // run against session state in refusalFollower.test.ts).
  assert.match(denied, /follower\.refused\(id\)/, 'a refusal is handed to the follower');
  assert.match(src, /refusalFollower\(\{ watch: watchLocatePermission, walks: db, resume: \(id\) => recorder\.resume\(id\) \}\)/, 'which follows the permission and resumes the same walk');
  const stopBody = src.slice(src.indexOf('async stop()'), src.indexOf('async resume('));
  assert.match(stopBody, /unfollowPermission\(\)/, 'a stop (End, or Pause) stops following');
  const watchHead = src.slice(src.indexOf('function watch('), src.indexOf('return new Promise'));
  assert.match(watchHead, /unfollowPermission\(\)/, 'a start stops the following it supersedes');
});
