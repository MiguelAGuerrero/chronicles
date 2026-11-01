/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MEMORY_RULES, memoriesNear, needsRead, previewLine } from '../memories';
import type { Capture, LngLat } from '../types';

const O: LngLat = [-71.4, 41.812];
const dLat = 1 / 111320;
const dLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const m = (x: number, y: number): LngLat => [O[0] + x * dLon, O[1] + y * dLat];
let n = 0;
const cap = (walk: string, at: LngLat | null, o: Partial<Capture> = {}): Capture => ({
  id: `c${n++}`, walk_id: walk, t: 1e12 + n, lat: at?.[1] ?? null, lon: at?.[0] ?? null, kind: 'photo', file_path: 'p.jpg', body: null, segment_id: null, ...o,
});

test('memories MR1: earlier walks only, with a place, within 100 m, nearest first, at most 6', () => {
  assert.equal(MEMORY_RULES.reachM, 100);
  assert.equal(MEMORY_RULES.cap, 6);
  const mine = cap('now', m(5, 0));
  const near = [cap('old', m(80, 0)), cap('old', m(20, 0)), cap('older', m(0, 50))];
  const far = cap('old', m(130, 0));
  const unplaced = cap('old', null);
  const got = memoriesNear({ pool: [mine, ...near, far, unplaced], here: O, walkId: 'now', hidden: new Set() });
  assert.deepEqual(got.map((c) => c.id), [near[1].id, near[2].id, near[0].id]);
  const many = Array.from({ length: 10 }, (_, i) => cap('old', m(i * 5, 0)));
  assert.equal(memoriesNear({ pool: many, here: O, walkId: 'now', hidden: new Set() }).length, 6);
});

test('memories MR7: a capture whose reminder card is showing has no memory pin', () => {
  const a = cap('old', m(10, 0));
  const b = cap('old', m(20, 0));
  assert.deepEqual(memoriesNear({ pool: [a, b], here: O, walkId: 'now', hidden: new Set([a.id]) }).map((c) => c.id), [b.id]);
});

test('memories MR8: the area is read again only after 50 m walked, and covers more than the reach', () => {
  assert.equal(needsRead(null, O), true);
  assert.equal(needsRead(O, m(30, 0)), false);
  assert.equal(needsRead(O, m(55, 0)), true);
  assert.ok(MEMORY_RULES.readBoxM >= MEMORY_RULES.reachM + MEMORY_RULES.rereadM, 'a box wide enough that nothing in reach is missed between reads');
});

test('memories MR4: the preview line names the memory', () => {
  assert.equal(previewLine(cap('old', O, { kind: 'text', body: 'Cardamom and the river.\nSecond line' })), 'Cardamom and the river.');
  assert.equal(previewLine(cap('old', O, { kind: 'voice', body: '42000' })), 'Voice memo · 0:42');
  assert.equal(previewLine(cap('old', O, { kind: 'photo', caption: 'The old mill' })), 'The old mill');
  assert.equal(previewLine(cap('old', O, { kind: 'photo' })), 'Photo');
  assert.equal(previewLine(cap('old', O, { kind: 'video', body: '9000' })), 'Video · 0:09');
});
