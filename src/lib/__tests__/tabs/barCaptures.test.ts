/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as band from '../../captureBand';
import * as bar from '../../recordingBar';

// The recording bar keeps a memo and a note (specs/recording-bar-captures, BC1-BC10, from T11). The bar's own checks
// are in the `barcaptures` journey; these are its decisions.

// Read loosely, so the file loads before the functions exist (written first, TG24).
const fn = (m: object, name: string) => (m as Record<string, unknown>)[name] as ((...a: unknown[]) => unknown) | undefined;

test('BC1: the bar\'s camera, mic and pencil show on every tab but Memories', () => {
  const captures = fn(band, 'barCaptures');
  assert.ok(captures, 'barCaptures exists');
  assert.deepEqual(captures('/', 'memories'), []);
  assert.deepEqual(captures('/', 'walks'), ['photo', 'voice', 'note']);
  assert.deepEqual(captures('/explore', 'memories'), ['photo', 'voice', 'note']);
  assert.deepEqual(captures('/day/2026-11-09', 'memories'), ['photo', 'voice', 'note']);
});

test('BC6: the line\'s words are the time alone; the distance stays in its spoken name', () => {
  const on = bar.recordingLine({ startedAt: 0, pauses: [], now: 12 * 60_000 + 5_000, distanceM: 1300 }) as ReturnType<typeof bar.recordingLine> & { time?: string };
  assert.equal(on.time, '12 min');
  assert.match(on.label, /1\.3[  ]km walked in 12 min/);
  const paused = bar.recordingLine({ startedAt: 0, pauses: [{ started_at: 60_000, ended_at: null }], now: 30 * 60_000, distanceM: 84 }) as typeof on;
  assert.equal(paused.time, '1 min');
  assert.equal(paused.word, 'Paused');
  assert.match(paused.label, /^Walk paused, 84[  ]m walked/);
});

test('BC6: the chevron shows on the line, never while a memo records', () => {
  const chevron = fn(bar, 'barChevron');
  assert.ok(chevron, 'barChevron exists');
  // At 320 px too since T58 (the owner's yes, Nov 22): the dot gives way there, not the chevron (`tend tabs T58`).
  assert.equal(chevron(360, false), true);
  assert.equal(chevron(390, false), true);
  assert.equal(chevron(390, true), false);
  assert.equal(chevron(640, true), false);
});

test('BC6: while a memo records the line says its time, and its name says the walk is paused when it is', () => {
  const memo = fn(bar, 'memoLine');
  assert.ok(memo, 'memoLine exists');
  const r = memo({ startedAt: 1_000, now: 8_400, paused: false }) as { time: string; label: string };
  assert.equal(r.time, '0:07');
  assert.equal(r.label, 'Recording voice memo, 0:07. Saves it and returns to the walk');
  const p = memo({ startedAt: 0, now: 75_000, paused: true }) as { time: string; label: string };
  assert.equal(p.time, '1:15');
  assert.equal(p.label, 'Recording voice memo, 1:15, walk paused. Saves it and returns to the walk');
  // Never a negative time from a clock read before the stamp.
  assert.equal((memo({ startedAt: 5_000, now: 4_000, paused: false }) as { time: string }).time, '0:00');
});

// The diff review (Nov 22): regression tests, each written to fail before its fix.

test('recording-bar-captures audit 1: a memo is saved when a full-screen card folds the bar away (Plan an outing, the area card)', () => {
  const saves = fn(bar, 'barMemoSaves');
  assert.ok(saves, 'barMemoSaves exists');
  assert.equal(saves({ memoOn: true, moved: false, captures: true, covered: true }), true);
  assert.equal(saves({ memoOn: true, moved: false, captures: true, covered: false }), false);
  assert.equal(saves({ memoOn: false, moved: true, captures: false, covered: true }), false);
});

test('recording-bar-captures audit 2: a change of Chronicle\'s section with the bar in sight keeps the memo recording', () => {
  const saves = fn(bar, 'barMemoSaves');
  assert.ok(saves, 'barMemoSaves exists');
  // Walks to Days: the path is the same, the captures stay in sight.
  assert.equal(saves({ memoOn: true, moved: false, captures: true, covered: false }), false);
  // Another tab: saved.
  assert.equal(saves({ memoOn: true, moved: true, captures: true, covered: false }), true);
});

test('recording-bar-captures audit 3: a memo recording where the bar holds no captures (Memories) is saved, however it began there', () => {
  const saves = fn(bar, 'barMemoSaves');
  assert.ok(saves, 'barMemoSaves exists');
  assert.equal(saves({ memoOn: true, moved: false, captures: false, covered: false }), true);
});

test('recording-bar-captures audit 4: the mic and the pencil are off while the bar\'s Stop runs, as while a capture is kept', () => {
  const off = fn(bar, 'barCapturesOff');
  assert.ok(off, 'barCapturesOff exists');
  assert.equal(off({ capturing: false, stopping: true }), true);
  assert.equal(off({ capturing: true, stopping: false }), true);
  assert.equal(off({ capturing: false, stopping: false }), false);
});

// T58 (the owner's yes, Nov 22, "Keep chevron, drop dot (Recommended)"): at 320 px the line keeps its chevron, the way
// back the cold find could not place without it, and leaves out the red dot; from 360 px both. Paused, the glyph shows.
test('tend tabs T58: at 320 px the bar keeps its chevron and leaves out the red dot; from 360 px both', () => {
  const chevron = fn(bar, 'barChevron');
  const dot = fn(bar, 'barDot');
  assert.ok(chevron && dot, 'barChevron and barDot exist');
  assert.equal(chevron(320, false), true);
  assert.equal(chevron(359, false), true);
  assert.equal(chevron(320, true), false);
  assert.equal(dot(320), false);
  assert.equal(dot(359), false);
  assert.equal(dot(360), true);
  assert.equal(dot(390), true);
  // Paused below 360 px the chevron gives way to the pause glyph, so the time stays whole (the owner, Nov 22, Paused320).
  assert.equal(chevron(320, false, true), false);
  assert.equal(chevron(359, false, true), false);
  assert.equal(chevron(360, false, true), true);
  assert.equal(chevron(390, false, true), true);
});
