import assert from 'node:assert/strict';
import test from 'node:test';
import { cancelLook, endLook, IDLE, isLive, startLook } from '../../atlas/look';

// tend explore 2: "What's good here?" kept one shared cancelled flag. Cancel A, start B: the flag went back to false, so
// A's read carried on, its line was shown for B's spot, and its end cleared "Looking around…" while B still read.

test('tend explore 2: one look at a time; a second start while one is live is refused', () => {
  const a = startLook(IDLE)!;
  assert.ok(a, 'a look starts when none is live');
  assert.equal(startLook(a.state), null, 'no second look while the first is live');
});

test('tend explore 2: a cancelled look stays stopped when a newer one starts', () => {
  const a = startLook(IDLE)!;
  const afterCancel = cancelLook(a.state);
  assert.equal(isLive(afterCancel, a.token), false, 'cancel stops A');
  const b = startLook(afterCancel)!;
  assert.ok(b, 'B starts after A is cancelled');
  assert.equal(isLive(b.state, a.token), false, 'A is still stopped once B has started: its read ends, and its line is never shown');
  assert.equal(isLive(b.state, b.token), true, 'B is the live look');
});

test('tend explore 2: only the live look ends the look; a stale one leaves the newer one running', () => {
  const a = startLook(IDLE)!;
  const b = startLook(cancelLook(a.state))!;
  assert.equal(endLook(b.state, a.token), b.state, 'A ending changes nothing: B still looks');
  const done = endLook(b.state, b.token);
  assert.equal(isLive(done, b.token), false);
  assert.ok(startLook(done), 'a new look may start once B is done');
});
