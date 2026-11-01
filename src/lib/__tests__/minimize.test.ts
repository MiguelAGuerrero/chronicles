/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { captureBus, mergeCaptures } from '../captureBus';
import { recordingLine } from '../recordingBar';
import { NAV_KEY, navValue, walkHerePlan } from '../startPlan';
import { notifyWalkChanged, onWalkChange } from '../walkEvents';
import type { Waypoint } from '../nav/types';
import type { Capture } from '../types';

const spot: Waypoint = { at: [-71.4, 41.812], label: 'Your spot', kind: 'point' };
const cap = (id: string, t: number, extra: Partial<Capture> = {}): Capture => ({
  id, walk_id: 'w1', t, kind: 'photo', file_path: `walks/w1/${id}.jpg`, body: null, segment_id: null, lat: 41.812, lon: -71.4, ...extra,
});

test('NV9: the recording bar shows the time walked and the distance', () => {
  const r = recordingLine({ startedAt: 0, pauses: [], now: 125_000, distanceM: 340 });
  assert.equal(r.text, '2:05 · 340 m');
  assert.equal(r.paused, false);
  assert.match(r.label, /340 m walked in 2 min/);
  assert.match(r.label, /return to the walk/i);
});

test('NV9: paused, it says Paused, and paused time is not counted', () => {
  const r = recordingLine({ startedAt: 0, pauses: [{ started_at: 60_000, ended_at: null }], now: 125_000, distanceM: 1250 });
  assert.equal(r.text, 'Paused · 1:00 · 1.3 km');
  assert.equal(r.paused, true);
  assert.match(r.label, /^Walk paused/);
});

test('NV9: an ended pause is left out of the time, and the bar is running again', () => {
  const r = recordingLine({ startedAt: 0, pauses: [{ started_at: 10_000, ended_at: 40_000 }], now: 100_000, distanceM: 0 });
  assert.equal(r.text, '1:10 · 0 m');
  assert.equal(r.paused, false);
});

test('NV9: before the walk is known, the bar shows nothing walked', () => {
  assert.equal(recordingLine({ startedAt: null, pauses: [], now: 5000, distanceM: 0 }).text, '0:00 · 0 m');
});

test('NV9: a capture from the bar reaches the walk screen once, whichever comes first, load or news (no loss, no double)', () => {
  const fromBar = cap('bar', 30);
  // News first, then the screen's load, which was read before the capture was stored.
  const afterNews = mergeCaptures([], [fromBar]);
  const stale = [cap('a', 10), cap('b', 20)];
  assert.deepEqual(mergeCaptures(stale, afterNews).map((c) => c.id), ['a', 'b', 'bar']);
  // The load already has it: still once.
  const fresh = [cap('a', 10), { ...fromBar, lat: null, lon: null }];
  const merged = mergeCaptures(fresh, afterNews);
  assert.deepEqual(merged.map((c) => c.id), ['a', 'bar']);
  // The copy held on screen wins (it carries where it is pinned until stop, and any caption).
  assert.equal(merged[1].lat, 41.812);
});

test('NV9: the capture news reaches other listeners of that walk only, never the one that made it', () => {
  const got: string[] = [];
  const me = {};
  const other = {};
  const offMe = captureBus.subscribe('w1', me, (c) => got.push(`me:${c.id}`));
  const offOther = captureBus.subscribe('w1', other, (c) => got.push(`other:${c.id}`));
  const offElse = captureBus.subscribe('w2', {}, (c) => got.push(`w2:${c.id}`));
  captureBus.emit(cap('x', 1), me);
  offOther();
  captureBus.emit(cap('y', 2), me);
  offMe();
  offElse();
  assert.deepEqual(got, ['other:x']);
});

test('NV10: with no walk open, Walk here starts one', () => {
  assert.deepEqual(walkHerePlan(null, spot), { kind: 'start' });
});

test('NV10: with a walk open, Walk here routes that walk there and returns to it, as its own Go here', () => {
  const p = walkHerePlan('w9', spot);
  assert.equal(p.kind, 'route');
  assert.deepEqual(p.kind === 'route' && p.meta, [[NAV_KEY, navValue('w9', spot)]]);
});

test('NV10: with a walk open and nowhere chosen, it only returns to the walk', () => {
  assert.deepEqual(walkHerePlan('w9', null), { kind: 'return' });
});

test('NV8: whoever keeps the open walk hears it start, pause, resume and stop', async () => {
  let n = 0;
  const off = onWalkChange(async () => {
    n++;
  });
  await notifyWalkChanged();
  await notifyWalkChanged();
  off();
  await notifyWalkChanged();
  assert.equal(n, 2);
});
