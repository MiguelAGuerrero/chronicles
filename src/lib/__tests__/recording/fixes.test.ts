/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dwellsOf, filterFixes, pausedMs, positionAt, smoothDwells, splitAtGaps, traceDistanceM, withoutPauses } from '../../geo';
import type { LngLat, TracePoint } from '../../types';
import { at, dLat, dLon, O, walkAlong } from '../foxPoint';

// Reading a trace: the accuracy and jump gates, standstills and pauses
// (.claude/rules/recording-and-traces.md).

test('filterFixes drops inaccurate fixes and impossible jumps', () => {
  const base = { walk_id: 'w', speed: null, course: null };
  const pts: TracePoint[] = [
    { ...base, t: 0, lat: O[1], lon: O[0], accuracy_m: 5 },
    { ...base, t: 5000, lat: O[1] + dLat * 0.07, lon: O[0], accuracy_m: 80 },
    { ...base, t: 10000, lat: O[1] + dLat * 5, lon: O[0], accuracy_m: 5 },
    { ...base, t: 15000, lat: O[1] + dLat * 0.1, lon: O[0], accuracy_m: 5 },
  ];
  assert.deepEqual(filterFixes(pts).map((p) => p.t), [0, 15000]);
  assert.deepEqual(positionAt(filterFixes(pts), 7500)!.map((n) => n.toFixed(7)), [O[0].toFixed(7), (O[1] + dLat * 0.05).toFixed(7)]);
});

test('filterFixes: a bad first fix does not lock out the good ones after it', () => {
  const base = { walk_id: 'w', speed: null, course: null, accuracy_m: 10 };
  const bad = { ...base, t: 0, lat: O[1] + dLat * 3, lon: O[0] }; // 300 m off, looks accurate
  const good = [5, 10, 15, 20].map((s, i) => ({ ...base, t: s * 1000, lat: O[1] + dLat * 0.01 * i, lon: O[0] }));
  assert.deepEqual(filterFixes([bad, ...good]).map((p) => p.t), [5000, 10000, 15000, 20000]);
  // A cached position from before the walk began is dropped.
  assert.deepEqual(filterFixes([{ ...base, t: 0, lat: O[1], lon: O[0] }, ...good], 6000).map((p) => p.t), [5000, 10000, 15000, 20000]);
});

test('standstills: a long stay in a small radius becomes one still point, with no jitter distance', () => {
  const walkIn = walkAlong([at(0, 0), at(1, 0)]);
  // Ten minutes in a shop: fixes wandering ~15 m around one spot, every 5 s.
  const t0 = walkIn.at(-1)!.t;
  const shop: TracePoint[] = Array.from({ length: 120 }, (_, i) => ({
    walk_id: 'w1', t: t0 + (i + 1) * 5000,
    lat: at(1, 0)[1] + Math.sin(i * 1.7) * dLat * 0.12, lon: at(1, 0)[0] + Math.cos(i * 2.3) * dLon * 0.12,
    accuracy_m: 20, speed: 0, course: null,
  }));
  const walkOut = walkAlong([at(1, 0), at(2, 0)], 'w1', shop.at(-1)!.t);
  const all = [...walkIn, ...shop, ...walkOut];
  const dwells = dwellsOf(all);
  assert.equal(dwells.length, 1);
  assert.ok(dwells[0].t1 - dwells[0].t0 >= 9 * 60_000);
  const smooth = smoothDwells(all);
  const jitter = traceDistanceM(all) - traceDistanceM(smooth);
  assert.ok(jitter > 500, `the shop's jitter (${Math.round(jitter)} m) no longer counts`);
  assert.ok(Math.abs(traceDistanceM(smooth) - 200) < 40, `about 200 m walked, got ${Math.round(traceDistanceM(smooth))}`);
  // Walking past at a normal pace is never a standstill.
  assert.equal(dwellsOf(walkAlong([at(0, 0), at(3, 0)])).length, 0);
});

test('standstills: one GPS jump does not split a stay, and slow walking in circles is not one', () => {
  const walkIn = walkAlong([at(0, 0), at(1, 0)]);
  const t0 = walkIn.at(-1)!.t;
  const stay = (n: number, from: number, spot: (i: number) => LngLat, speed: number): TracePoint[] =>
    Array.from({ length: n }, (_, i) => ({
      walk_id: 'w1', t: from + (i + 1) * 1000, lon: spot(i)[0], lat: spot(i)[1], accuracy_m: 20, speed, course: null,
    }));
  // Ten still minutes with one fix 30 m off halfway through.
  const still = stay(600, t0, (i) => (i === 300 ? at(1.3, 0) : at(1, 0)), 0);
  assert.equal(dwellsOf([...walkIn, ...still]).length, 1);
  // Four minutes circling a 10 m fountain at 0.8 m/s stays walking.
  const circle = stay(240, t0, (i) => [at(1, 0.1)[0] + Math.sin(i * 0.08) * dLon * 0.1, at(1, 0.1)[1] - Math.cos(i * 0.08) * dLat * 0.1], 0.8);
  assert.equal(dwellsOf([...walkIn, ...circle]).length, 0);
  // A slow stroll that drifts 50 m over five minutes stays walking, even with no speed reported.
  const stroll = stay(300, t0, (i) => at(1 + i / 600, 0), 0.18).map((p) => ({ ...p, speed: null }));
  assert.equal(dwellsOf([...walkIn, ...stroll]).length, 0);
});

test('pauses: a short pause still breaks the trace, so nothing is measured across it', () => {
  const before = walkAlong([at(0, 0), at(1, 0)]);
  // Paused for 20 s while carried 80 m on, then walking again.
  const t = before.at(-1)!.t;
  const pause = { started_at: t + 1000, ended_at: t + 21_000 };
  const after = walkAlong([at(1.8, 0), at(2, 0)], 'w1', pause.ended_at);
  const all = [...before, ...after];
  assert.ok(Math.abs(traceDistanceM(all, [pause]) - 110) < 15, `about 110 m (not 200), got ${Math.round(traceDistanceM(all, [pause]))}`);
  assert.equal(splitAtGaps(all, 60_000, [pause]).length, 2);
});

test('pauses: fixes inside a pause are dropped, and paused time does not count', () => {
  const pts = walkAlong([at(0, 0), at(3, 0)]);
  const pause = { started_at: pts[10].t, ended_at: pts[20].t };
  const kept = withoutPauses(pts, [pause]);
  assert.ok(kept.every((p) => p.t < pause.started_at || p.t > pause.ended_at));
  assert.equal(pausedMs([pause], pts[0].t, pts.at(-1)!.t), pause.ended_at - pause.started_at);
  // An open pause runs to the end of the window.
  assert.equal(pausedMs([{ started_at: 1000, ended_at: null }], 0, 5000), 4000);
});
