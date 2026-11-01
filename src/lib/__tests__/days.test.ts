/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildDays, dayCard, dayKey, dayLabel, dayPlan, FLY_MS, nextDayStart, spotCount, stepFrames, watchedKey,
} from '../days';
import { schedule } from '../replay';
import type { Capture, TracePoint, Walk } from '../types';

// Moments and days (the concept doc's "Moments and days" tab), written from
// its criteria before the code. Times are built from local dates, so the
// midnight rules hold in any time zone the tests run in.

const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).getTime();
const walk = (id: string, start: number, end: number | null, open = false): Walk => ({
  id, started_at: start, ended_at: end, title: null, epilogue: null, open, area: null, snapped_build: null,
});
const cap = (id: string, t: number, walk_id: string | null, lon: number | null = -71.4, lat: number | null = 41.812): Capture => ({
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

test('M10: loose moments fly to their pin, then stop, in time order', () => {
  const [day] = buildDays([], [cap('b', at(2, 12), null, -71.41), cap('a', at(2, 9), null, -71.4)]);
  const plan = dayPlan(day, new Map());
  assert.deepEqual(plan.map((s) => s.kind), ['fly', 'stop', 'fly', 'stop']);
  assert.equal(plan[0].kind === 'fly' && plan[0].ms, FLY_MS);
  assert.deepEqual(plan[1].kind === 'stop' && plan[1].captures.map((c) => c.id), ['a']);
  assert.deepEqual(plan[0].kind === 'fly' && plan[0].to, [-71.4, 41.812]);
});

test('M10: moments close in time and place share one stop', () => {
  const [day] = buildDays([], [cap('a', at(2, 9, 0), null), cap('b', at(2, 9, 1), null)]);
  const plan = dayPlan(day, new Map());
  assert.deepEqual(plan.map((s) => s.kind), ['fly', 'stop']);
  assert.deepEqual(plan[1].kind === 'stop' && plan[1].captures.map((c) => c.id), ['a', 'b']);
});

test('M11: a walk plays its path with its moments as stops, then the day carries on', () => {
  const w = walk('w', at(2, 10), at(2, 10, 10));
  const fixes = [fix(at(2, 10, 0), -71.4), fix(at(2, 10, 5), -71.399), fix(at(2, 10, 10), -71.398)];
  const inWalk = cap('in', at(2, 10, 5), 'w', -71.399);
  const [day] = buildDays([w], [cap('before', at(2, 9), null), inWalk, cap('after', at(2, 12), null, -71.39)]);
  const sched = schedule(fixes, [inWalk], w.started_at);
  const plan = dayPlan(day, new Map([['w', { sched, start: [-71.4, 41.812] }]]));
  assert.deepEqual(plan.map((s) => s.kind), ['fly', 'stop', 'fly', 'path', 'stop', 'path', 'fly', 'stop']);
  const p1 = plan[3], p2 = plan[5];
  assert.ok(p1.kind === 'path' && p1.walkId === 'w' && p1.fromMs === 0 && p1.toMs === sched.groups[0].atMs);
  assert.ok(p2.kind === 'path' && p2.fromMs === sched.groups[0].atMs && p2.toMs === sched.movingMs);
  assert.ok(plan[4].kind === 'stop' && plan[4].walkId === 'w');
});

test('M11: a zero-length stretch of path is left out', () => {
  const w = walk('w', at(2, 10), at(2, 10, 10));
  const fixes = [fix(at(2, 10, 0), -71.4), fix(at(2, 10, 10), -71.398)];
  const first = cap('first', at(2, 10, 0), 'w');
  const [day] = buildDays([w], [first]);
  const sched = schedule(fixes, [first], w.started_at);
  const plan = dayPlan(day, new Map([['w', { sched, start: [-71.4, 41.812] }]]));
  assert.deepEqual(plan.map((s) => s.kind), ['fly', 'stop', 'path']);
});

test('M11: a walk whose replay could not load still shows its moments', () => {
  const w = walk('w', at(2, 10), at(2, 11));
  const [day] = buildDays([w], [cap('in', at(2, 10, 30), 'w')]);
  const plan = dayPlan(day, new Map());
  assert.deepEqual(plan.map((s) => s.kind), ['fly', 'stop']);
});

test('M14: a moment with no place stops without moving the map', () => {
  const [day] = buildDays([], [cap('nowhere', at(2, 9), null, null, null)]);
  assert.deepEqual(dayPlan(day, new Map()).map((s) => s.kind), ['stop']);
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

test('audit (moments 13): a placeless moment first in a group does not pull in a far one', () => {
  const near = cap('nowhere', at(2, 9, 0), null, null, null);
  const here = cap('here', at(2, 9, 1), null, -71.4, 41.812);
  const far = cap('far', at(2, 9, 1, ), null, -71.38, 41.812);
  const [day] = buildDays([], [near, here, { ...far, t: far.t + 1000 }]);
  const stops = dayPlan(day, new Map()).filter((s) => s.kind === 'stop');
  assert.deepEqual(stops.map((s) => s.kind === 'stop' && s.captures.map((c) => c.id)), [['nowhere', 'here'], ['far']]);
});

test('audit (moments 5): a day is read from its midnight to the next, whatever the day length', () => {
  assert.equal(nextDayStart('2026-11-01'), new Date(2026, 10, 2).getTime());
  assert.equal(nextDayStart('2026-12-31'), new Date(2027, 0, 1).getTime());
});

test('audit (moments 7): each fly step is framed: a walk by its trace, a pin close up', () => {
  const w = walk('w', at(2, 10), at(2, 10, 10));
  const fixes = [fix(at(2, 10, 0), -71.4), fix(at(2, 10, 10), -71.39)];
  const [day] = buildDays([w], [cap('a', at(2, 9), null, -71.41)]);
  const sched = schedule(fixes, [], w.started_at);
  const plan = dayPlan(day, new Map([['w', { sched, start: [-71.4, 41.812] }]]));
  const frames = stepFrames(plan, new Map([['w', [[-71.4, 41.812], [-71.39, 41.812]]]]));
  assert.equal(plan[0].kind, 'fly');
  const pin = frames[0]!;
  assert.ok(pin[0] < -71.41 && pin[2] > -71.41 && pin[2] - pin[0] < 0.01, 'a pin is framed close up');
  const walkFrame = frames[2]!;
  assert.ok(walkFrame[0] <= -71.4 && walkFrame[2] >= -71.39, 'a walk is framed by its trace');
  assert.equal(frames[1], null);
});
