/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { placeAt } from '../../moment';
import type { TracePoint } from '../../types';

// Moment stacks MS16 (decision 0106): where a split piece goes. Test first: the module is reached by name.
type Mod = {
  splitPlace(
    t: number,
    walk: { fixes: TracePoint[]; pauses: { started_at: number; ended_at: number | null }[] } | null,
    original: { lat: number | null; lon: number | null },
  ): { lat: number | null; lon: number | null };
};
const mod = () => import('../../splitPlace' + '') as Promise<Mod>;
const fix = (t: number, lon: number): TracePoint => ({ walk_id: 'w', t, lat: 41.8, lon, accuracy_m: 5, speed: 1, course: null });
const original = { lat: 41.9, lon: -71.3 };

test('MS16: a split piece goes on the trace at its time, at a pause\'s start, at the last fix before a gap, or at the original\'s place off a walk', async () => {
  const { splitPlace } = await mod();
  const fixes = [fix(0, -71.4), fix(10_000, -71.399), fix(20_000, -71.398), fix(200_000, -71.39)];
  assert.deepEqual(splitPlace(10_000, { fixes, pauses: [] }, original), { lat: 41.8, lon: -71.399 });
  assert.deepEqual(splitPlace(15_000, { fixes, pauses: [{ started_at: 12_000, ended_at: 18_000 }] }, original).lon, placeAt({ t: 15_000, lat: null, lon: null }, fixes, [{ started_at: 12_000, ended_at: 18_000 }], [])!.lon);
  assert.deepEqual(splitPlace(100_000, { fixes, pauses: [] }, original), { lat: 41.8, lon: -71.398 }, 'in a gap: the last fix before it');
  assert.deepEqual(splitPlace(100_000, null, original), original, 'off a walk: the original\'s place');
  assert.deepEqual(splitPlace(5_000, { fixes: [], pauses: [] }, original), original, 'no fix: the original\'s place');
});

test('MS16: splitPlace gives a lone capture\'s place as today\'s placer does', async () => {
  const { splitPlace } = await mod();
  const fixes = [fix(0, -71.4), fix(10_000, -71.399), fix(20_000, -71.398)];
  for (const t of [0, 5_000, 12_345, 20_000]) {
    const today = placeAt({ t, lat: null, lon: null }, fixes, [], [])!;
    assert.deepEqual(splitPlace(t, { fixes, pauses: [] }, original), { lat: today.lat, lon: today.lon }, `at ${t}`);
  }
});
