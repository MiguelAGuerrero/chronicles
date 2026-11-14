/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { raisedAfter, retryRecorder } from '../../recorderRetry';
import type { RecorderStatus } from '../../recorder/types';

// QL20: back in front with the recorder in error, the walk screen starts it again once, unless paused.

const error: RecorderStatus = { kind: 'error', message: 'Location permission was denied.' };

test('recorderRetry: retries an open, unpaused walk whose recorder is in error', () => {
  assert.equal(retryRecorder(error, false, true), true);
  assert.equal(retryRecorder({ kind: 'error', message: 'Off', openSettings: true }, false, true), true);
});

test('recorderRetry: never while paused (resume is the way back)', () => {
  assert.equal(retryRecorder(error, true, true), false);
});

test('recorderRetry: never without an open walk', () => {
  assert.equal(retryRecorder(error, false, false), false);
});

test('recorderRetry: only an error is retried', () => {
  for (const s of [{ kind: 'idle' }, { kind: 'waiting' }, { kind: 'recording' }] as RecorderStatus[]) {
    assert.equal(retryRecorder(s, false, true), false, s.kind);
  }
});

// tend walk-screen 2 (the deferred item "A refused walk's quiet notice outlives a retry", the T26 review's F5): a refused walk's quiet notice outlived a retry that records again.
// Location re-allowed and the recorder restarted, the chip went and the trace grew, but the sticky notice stayed: the
// first `recording` could come before the restart settled (the web start takes the wake lock after the first fix), so
// the retry still held the raised words, and nothing took the notice down. Recording again ends the refusal whatever
// started the recorder: its notice goes, and a later refusal in the same visit is said again.
const OFF = 'Location is off for this site.';

test('tend walk-screen 2: recording again takes down the notice the refusal raised, even mid-retry', () => {
  assert.deepEqual(raisedAfter(OFF, OFF, 'recording', true), { raised: null, shown: null, clear: OFF });
  assert.deepEqual(raisedAfter(OFF, OFF, 'recording', false), { raised: null, shown: null, clear: OFF });
  // Nothing was raised: nothing to take down.
  assert.deepEqual(raisedAfter(null, null, 'recording', false), { raised: null, shown: null, clear: null });
});

test("tend walk-screen 2: a retry's own pass through waiting keeps the refusal, so a failed retry says nothing again", () => {
  assert.deepEqual(raisedAfter(OFF, OFF, 'waiting', true), { raised: OFF, shown: OFF, clear: null });
  // Not a retry: a new refusal is said again, and the notice stays until it is dismissed or recording resumes.
  assert.deepEqual(raisedAfter(OFF, OFF, 'waiting', false), { raised: null, shown: OFF, clear: null });
  assert.deepEqual(raisedAfter(OFF, OFF, 'idle', false), { raised: null, shown: OFF, clear: null });
});

test('tend walk-screen 2: a restart that is no retry of the screen\'s (the recorder resumed by itself) still takes the notice down once it records', () => {
  // Waiting first, with no retry of the screen's running: the refusal is over, but its words still show.
  const waited = raisedAfter(OFF, OFF, 'waiting', false);
  assert.deepEqual(raisedAfter(waited.raised, waited.shown, 'recording', false), { raised: null, shown: null, clear: OFF });
});
