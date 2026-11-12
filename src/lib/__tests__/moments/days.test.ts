/// <reference types="node" />
import { type Faced, facedOf } from '../../moment';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildDays, dayCard, dayKey, dayLabel, nextDayStart, spotCount, watchedKey } from '../../days';
import { timedRuns } from '../../replay';
import { dayStory, pathDrawnAt, positionAt, walkStory, type WalkInput } from '../../ceremony/story';
import { rhythmFrame, rhythmPlan } from '../../ceremony/rhythm';
import type { TracePoint, Walk } from '../../types';

// Moments and days (the concept doc's "Moments and days" tab), written from
// its criteria before the code. Times are built from local dates, so the
// midnight rules hold in any time zone the tests run in.

const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).getTime();
const walk = (id: string, start: number, end: number | null, open = false): Walk => ({
  id, started_at: start, ended_at: end, title: null, epilogue: null, open, area: null, snapped_build: null,
});
const cap = (id: string, t: number, walk_id: string | null, lon: number | null = -71.4, lat: number | null = 41.812): Faced => facedOf({
  id, walk_id, t, lat, lon, kind: 'text', file_path: null, body: id, segment_id: null,
});

test('M6: a day runs local midnight to midnight', () => {
  assert.equal(dayKey(at(3, 0, 0)), '2026-11-03');
  assert.equal(dayKey(at(3, 23, 59)), '2026-11-03');
  assert.equal(dayKey(at(4, 0, 0)), '2026-11-04');
});

test('M6: a walk belongs to the day it started, its moments with it, even past midnight', () => {
  const w = walk('w', at(3, 23, 30), at(4, 0, 40));
  const days = buildDays([w], [cap('late', at(4, 0, 10), 'w'), cap('loose', at(4, 9), null)]);
  assert.deepEqual(days.map((d) => d.key), ['2026-11-04', '2026-11-03']);
  const nov3 = days[1];
  assert.equal(nov3.entries.length, 1);
  const e = nov3.entries[0];
  assert.equal(e.kind, 'walk');
  assert.deepEqual(e.kind === 'walk' && e.captures.map((c) => c.id), ['late']);
  assert.equal(nov3.moments, 1);
  assert.equal(nov3.walks, 1);
});

test('M7: days are newest first, only days with something in them, with counts', () => {
  const days = buildDays(
    [walk('w1', at(1, 10), at(1, 11))],
    [cap('a', at(1, 12), null), cap('b', at(5, 9), null), cap('c', at(1, 10, 30), 'w1')],
  );
  assert.deepEqual(days.map((d) => d.key), ['2026-11-05', '2026-11-01']);
  assert.deepEqual([days[1].moments, days[1].walks], [2, 1]);
  assert.deepEqual([days[0].moments, days[0].walks], [1, 0]);
});

test('M8: a day lists moments and walks in time order; a walk is one row', () => {
  const days = buildDays(
    [walk('w', at(2, 10), at(2, 11))],
    [cap('after', at(2, 12), null), cap('before', at(2, 9), null), cap('in', at(2, 10, 20), 'w')],
  );
  assert.deepEqual(days[0].entries.map((e) => (e.kind === 'walk' ? `walk:${e.walk.id}` : e.capture.id)), ['before', 'walk:w', 'after']);
});

test('M8: an open walk is left out, and its captures are not loose moments', () => {
  const days = buildDays([walk('w', at(2, 10), null, true)], [cap('in', at(2, 10, 5), 'w')]);
  assert.deepEqual(days, []);
});

test('M8/M17: a capture of a walk that is gone is left out, not shown as loose', () => {
  assert.deepEqual(buildDays([], [cap('x', at(2, 10), 'missing')]), []);
});

test('M9: today and yesterday are named; older days by weekday and date', () => {
  const now = at(10, 15);
  assert.equal(dayLabel('2026-11-10', now), 'Today');
  assert.equal(dayLabel('2026-11-09', now), 'Yesterday');
  assert.match(dayLabel('2026-11-03', now), /Tue/);
  assert.match(dayLabel('2026-11-03', now), /3/);
});

// The day's replay -------------------------------------------------------

const fix = (t: number, lon: number): TracePoint => ({ walk_id: 'w', t, lat: 41.812, lon, accuracy_m: 5, speed: 1, course: null });
/** A fix every 30 s from lon a to lon b between two times. */
function fixesAlong(t0: number, t1: number, a: number, b: number): TracePoint[] {
  const n = Math.round((t1 - t0) / 30_000);
  return Array.from({ length: n + 1 }, (_, i) => fix(t0 + i * 30_000, a + ((b - a) * i) / n));
}
const input = (w: Walk, fixes: TracePoint[], captures: Faced[]): WalkInput => ({
  walk: w, fixes, walkedFixes: fixes, breaks: [], pauses: [], runs: timedRuns(fixes).map((r) => r.map((x) => x.p)), rideRuns: [], rideTimed: [], captures, passed: [],
});
const kinds = (d: ReturnType<typeof dayStory>) => d.events.map((e) => e.kind);

test('M10 (RR16): loose moments come in time order, with the way from one pin to the next', () => {
  const [day] = buildDays([], [cap('b', at(2, 12), null, -71.41), cap('a', at(2, 9), null, -71.4)]);
  const s = dayStory(day, new Map());
  assert.deepEqual(kinds(s), ['moment', 'travel', 'moment']);
  assert.deepEqual(s.captures.map((c) => c.id), ['a', 'b']);
  const tr = s.events[1];
  assert.ok(tr.kind === 'travel' && tr.from && tr.to && tr.from[0] === -71.4 && tr.to[0] === -71.41);
});

test('M10: moments close in time and place share one stop', () => {
  const [day] = buildDays([], [cap('a', at(2, 9, 0), null), cap('b', at(2, 9, 1), null)]);
  const s = dayStory(day, new Map());
  assert.deepEqual(kinds(s), ['moment']);
  assert.deepEqual(s.captures.map((c) => c.id), ['a', 'b']);
});

test('M11 (RR16): a walk plays its path with its moments, then the day carries on', () => {
  const w = walk('w', at(2, 10), at(2, 10, 10));
  const fixes = fixesAlong(at(2, 10, 0), at(2, 10, 10), -71.4, -71.398);
  const inWalk = cap('in', at(2, 10, 5), 'w', -71.399);
  const [day] = buildDays([w], [cap('before', at(2, 9), null), inWalk, cap('after', at(2, 12), null, -71.39)]);
  const s = dayStory(day, new Map([['w', input(w, fixes, [inWalk])]]));
  assert.deepEqual(kinds(s), ['moment', 'travel', 'move', 'moment', 'move', 'travel', 'moment']);
  const m = s.events[3];
  assert.ok(m.kind === 'moment' && m.pathId === 'w' && m.captures[0].id === 'in');
  const p = rhythmPlan(s, { reduceMotion: false });
  assert.ok(p.segs.some((x) => x.k === 'leg' && x.move?.pathId === 'w'), 'its own path, followed');
});

test('M11: a moment at the walk\'s very start comes first, with no empty stretch before it', () => {
  const w = walk('w', at(2, 10), at(2, 10, 10));
  const fixes = fixesAlong(at(2, 10, 0), at(2, 10, 10), -71.4, -71.398);
  const first = cap('first', at(2, 10, 0), 'w');
  const [day] = buildDays([w], [first]);
  const s = dayStory(day, new Map([['w', input(w, fixes, [first])]]));
  assert.deepEqual(kinds(s), ['moment', 'move']);
  assert.ok(s.events.every((e) => e.kind !== 'move' || e.t1 > e.t0));
});

test('M11: a walk whose replay could not load still shows its moments', () => {
  const w = walk('w', at(2, 10), at(2, 11));
  const [day] = buildDays([w], [cap('in', at(2, 10, 30), 'w')]);
  assert.deepEqual(kinds(dayStory(day, new Map())), ['moment']);
});

test('M14: a moment with no place is shown where the map is', () => {
  const [day] = buildDays([], [cap('nowhere', at(2, 9), null, null, null)]);
  const s = dayStory(day, new Map());
  assert.deepEqual(kinds(s), ['moment']);
  assert.ok(s.events[0].kind === 'moment' && s.events[0].at === null);
});

test('M12: whether a day was watched is kept per day', () => {
  assert.equal(watchedKey('2026-11-02'), 'day_watched:2026-11-02');
});

test('M13: places are spots 100 m apart; moments with no place are not one', () => {
  assert.equal(spotCount([cap('a', 1, null, -71.4, 41.812), cap('b', 2, null, -71.4005, 41.812), cap('c', 3, null, -71.39, 41.812), cap('d', 4, null, null, null)]), 2);
});

test('M13: the card is the weekday, moments, places and any walk distance; no streaks', () => {
  const [day] = buildDays([walk('w', at(3, 10), at(3, 11))], [cap('a', at(3, 9), null), cap('b', at(3, 10, 30), 'w', -71.39)]);
  const card = dayCard(day, at(20, 9), new Map([['w', 2100]]));
  assert.match(card.title, /Tue/);
  assert.equal(card.line, '2 moments · 2 places');
  assert.equal(card.walked, '2.1 km walked');
  const [loose] = buildDays([], [cap('a', at(3, 9), null)]);
  const c2 = dayCard(loose, at(20, 9), new Map());
  assert.equal(c2.line, '1 moment · 1 place');
  assert.equal(c2.walked, null);
  assert.doesNotMatch(JSON.stringify(card), /streak|badge|record/i);
});

test('tend replay 3: the day card says its distance in the units the walk card uses', () => {
  const [day] = buildDays([walk('w', at(3, 10), at(3, 11))], [cap('a', at(3, 10, 30), 'w', -71.39)]);
  assert.equal(dayCard(day, at(20, 9), new Map([['w', 2100]]), 'mi').walked, '1.3 mi walked');
  assert.equal(dayCard(day, at(20, 9), new Map([['w', 559]]), 'mi').walked, '0.3 mi walked');
  assert.equal(dayCard(day, at(20, 9), new Map([['w', 999.6]]), 'km').walked, '1.0 km walked');
});

test('audit (moments 13): a placeless moment first in a group does not pull in a far one', () => {
  const near = cap('nowhere', at(2, 9, 0), null, null, null);
  const here = cap('here', at(2, 9, 1), null, -71.4, 41.812);
  const far = cap('far', at(2, 9, 1, ), null, -71.38, 41.812);
  const [day] = buildDays([], [near, here, { ...far, t: far.t + 1000 }]);
  const stops = dayStory(day, new Map()).events.filter((e) => e.kind === 'moment');
  assert.deepEqual(stops.map((e) => e.kind === 'moment' && e.captures.map((c) => c.id)), [['nowhere', 'here'], ['far']]);
});

test('audit (moments 5): a day is read from its midnight to the next, whatever the day length', () => {
  assert.equal(nextDayStart('2026-11-01'), new Date(2026, 10, 2).getTime());
  assert.equal(nextDayStart('2026-12-31'), new Date(2027, 0, 1).getTime());
});

test('audit (moments 7, RR16): a long way between entries pulls the camera back to show it', () => {
  const [day] = buildDays([], [cap('a', at(2, 9), null, -71.4), cap('b', at(2, 11), null, -71.34)]);
  const p = rhythmPlan(dayStory(day, new Map()), { reduceMotion: false });
  const leg = p.segs.find((s) => s.k === 'leg')!;
  const z = rhythmFrame(p, (leg.t0 + leg.t1) / 2).camera.zoom!;
  assert.ok(z < 16 - Math.log2(2.5), `about 5 km: pulled well back (zoom ${z.toFixed(2)})`);
});

test('day replay: the drawn trace ends at the dot, before and after a ride', async () => {
  const { readTrace, rideRuns: ridesOf, smoothKept, timedRideRuns } = await import('../../rides');
  const { smoothDwells, splitAtGaps } = await import('../../geo');
  const O: [number, number] = [-71.4, 41.812];
  const mLat = 1 / 111320;
  const mLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
  const fixes: TracePoint[] = [];
  let x = 0;
  let y = 0;
  const legs = [{ v: 1.4, s: 120 }, { v: 12, s: 300 }, { v: 1.4, s: 120, north: true }];
  let t = 0;
  const push = (v: number) => fixes.push({ walk_id: 'w', t, lon: O[0] + x * mLon, lat: O[1] + y * mLat, accuracy_m: 8, speed: v, course: null });
  push(1.4);
  for (const l of legs) {
    for (let k = 0; k < l.s; k++) {
      if (l.north) y += l.v;
      else x += l.v;
      t += 1000;
      push(l.v);
    }
  }
  const tr = readTrace(fixes, 0, [], []);
  assert.equal(tr.rides.length, 1);
  const walkedFixes = smoothDwells(tr.walked);
  const story = walkStory({
    walk: { id: 'w', started_at: 0 } as Walk,
    fixes: smoothKept(tr),
    walkedFixes,
    breaks: tr.breaks,
    pauses: [],
    runs: splitAtGaps(walkedFixes, 60_000, tr.breaks),
    rideRuns: ridesOf(tr),
    rideTimed: timedRideRuns(tr),
    captures: [],
    passed: [],
  });
  const path = story.paths.w;
  const walkDrawnAt = (_: unknown, t: number) => ({ ...pathDrawnAt(path, t), walker: positionAt(path, t) });
  const play = null;
  const near = (a: [number, number], b: [number, number]) => Math.hypot((a[0] - b[0]) / mLon, (a[1] - b[1]) / mLat);
  for (const at of [60_000, 470_000, 520_000]) {
    const d = walkDrawnAt(play, at);
    const end = d.trace[d.trace.length - 1];
    const last = end[end.length - 1];
    assert.ok(d.walker && near(last, d.walker) < 3, `at ${at}: the trace ends ${near(last, d.walker!).toFixed(0)} m from the dot`);
    // No straight line into the dot: every step drawn is a settled fix's step.
    for (const run of d.trace) {
      for (let i = 1; i < run.length; i++) assert.ok(near(run[i - 1], run[i]) < 25, `at ${at}: a ${near(run[i - 1], run[i]).toFixed(0)} m line`);
    }
  }
  // Mid-ride, the dashed line is what reaches the dot.
  const mid = walkDrawnAt(play, 270_000);
  const ride = mid.rides[mid.rides.length - 1];
  assert.ok(mid.walker && near(ride[ride.length - 1], mid.walker) < 3);
});

// A phone (Nov 2): "undefined is not an object (evaluating 'n[a].slice')".
// The day replay timed more runs than it drew; a walk that was all ride has
// no walked run at all.
test('day replay: a walk that is all ride replays without a walked run', async () => {
  const { readTrace, rideRuns: ridesOf, smoothKept, timedRideRuns } = await import('../../rides');
  const { smoothDwells, splitAtGaps } = await import('../../geo');
  const O: [number, number] = [-71.4, 41.812];
  const mLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
  const fixes: TracePoint[] = Array.from({ length: 300 }, (_, i) => ({ walk_id: 'w', t: i * 1000, lon: O[0] + i * 12 * mLon, lat: O[1], accuracy_m: 8, speed: 12, course: null }));
  const tr = readTrace(fixes, 0, [], []);
  const walkedFixes = smoothDwells(tr.walked);
  const story = walkStory({
    walk: { id: 'w', started_at: 0 } as Walk,
    fixes: smoothKept(tr),
    walkedFixes,
    breaks: tr.breaks,
    pauses: [],
    runs: splitAtGaps(walkedFixes, 60_000, tr.breaks),
    rideRuns: ridesOf(tr),
    rideTimed: timedRideRuns(tr),
    captures: [],
    passed: [],
  });
  const path = story.paths.w;
  const walkDrawnAt = (_: unknown, t: number) => ({ ...pathDrawnAt(path, t), walker: positionAt(path, t) });
  const play = null;
  for (const at of [0, 150_000, 299_000]) assert.doesNotThrow(() => walkDrawnAt(play, at));
  assert.ok(walkDrawnAt(play, 150_000).rides.length > 0);
});

test('traceUntil: runs drawn shorter than timed stop the line, never throw', async () => {
  const { traceUntil } = await import('../../replay');
  const timed = [[{ t: 0, p: [0, 0] as [number, number] }, { t: 10, p: [1, 0] as [number, number] }], [{ t: 20, p: [2, 0] as [number, number] }, { t: 30, p: [3, 0] as [number, number] }]];
  assert.doesNotThrow(() => traceUntil(timed, [], 25));
  assert.doesNotThrow(() => traceUntil(timed, [[[0, 0]]], 25));
});
