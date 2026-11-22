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

test('BC6: the chevron shows from 360 px wide, never while a memo records', () => {
  const chevron = fn(bar, 'barChevron');
  assert.ok(chevron, 'barChevron exists');
  assert.equal(chevron(320, false), false);
  assert.equal(chevron(359, false), false);
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
