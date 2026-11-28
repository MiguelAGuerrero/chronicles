/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { readTrace } from '../../rides';
import type { TracePoint } from '../../types';

// A walk left running (specs/forgotten-stop, G16; decision 0272): where it went quiet, found the same on the web's shape
// of a forgotten walk (one long break, then standing fixes) and a phone's (a long stay of a fix a second); never a sit
// mid-walk; the walk read up to its end; the words a time of day. The decisions are core (`lib/quietEnd/core.ts`).
const mod = () => import('../../quietEnd/core');

const T0 = new Date(2026, 10, 26, 20, 0, 0).getTime();
const MIN = 60_000;
const HOUR = 60 * MIN;
// About 1.3 m a second along a grid's streets: east, then north (degrees per metre at 41.8°N).
const M_LON = 1 / 82_900;
const M_LAT = 1 / 111_000;
const LON0 = -71.4;
const LAT0 = 41.82;
const fix = (t: number, east: number, north: number, accuracy = 6): TracePoint => ({
  walk_id: 'w', t, lon: LON0 + east * M_LON, lat: LAT0 + north * M_LAT, accuracy_m: accuracy, speed: null, course: null,
});
/** `minutes` of walking from `t0`, a fix every 5 s, east then north from (e, n). */
function walking(t0: number, minutes: number, e = 0, n = 0): TracePoint[] {
  const out: TracePoint[] = [];
  const steps = (minutes * MIN) / 5000;
  for (let i = 0; i <= steps; i++) {
    const m = i * 6.5;
    const half = (steps * 6.5) / 2;
    out.push(fix(t0 + i * 5000, e + Math.min(m, half), n + Math.max(0, m - half)));
  }
  return out;
}
/** Standing near (e, n), a fix every `every` ms, wandering a few metres, from `t0` for `ms`. */
function standing(t0: number, ms: number, e: number, n: number, every = 1000, accuracy = 8): TracePoint[] {
  const out: TracePoint[] = [];
  for (let t = 0; t <= ms; t += every) {
    const k = t / every;
    out.push(fix(t0 + t, e + ((k * 7) % 11) - 5, n + ((k * 3) % 9) - 4, accuracy));
  }
  return out;
}
const read = (points: TracePoint[], pauses: { started_at: number; ended_at: number | null }[] = []) => readTrace(points, T0, pauses);
const lastOf = (ps: TracePoint[]) => ps[ps.length - 1];

// Ten minutes on the grid: the last corner is where it went quiet.
const walk = walking(T0, 10);
const corner = lastOf(walk);

test('QE1: a web-shaped tail, one long break then standing fixes 400 m away, is quiet from the last corner', { todo: 'test first' }, async () => {
  const { quietPoint, quietEndAt } = await mod();
  const home = standing(corner.t + 20 * HOUR, 5 * MIN, 3200, 200, 1000, 12);
  const tr = read([...walk, ...home]);
  const at = quietPoint({ tr, captures: [], pauses: [] });
  assert.ok(at != null, 'a point');
  assert.ok(Math.abs(at - corner.t) <= MIN, `within a minute of the last corner (${(at - corner.t) / 1000} s)`);
  assert.equal(quietEndAt({ tr, captures: [], pauses: [] }, lastOf(home).t + 5000), at, 'quiet 30 min or more at the hold');
});

test('QE1: a phone-shaped tail, two hours of a fix a second at the last corner, a lone far fix among them, gives the same point', { todo: 'test first' }, async () => {
  const { quietPoint } = await mod();
  const stay = standing(corner.t + 1000, 2 * HOUR, (corner.lon - LON0) / M_LON, (corner.lat - LAT0) / M_LAT, 1000, 10);
  // One jump 120 m off, an hour in: a lone far fix is not walking on.
  stay[3600] = { ...stay[3600], lon: stay[3600].lon + 120 * M_LON };
  const phone = quietPoint({ tr: read([...walk, ...stay]), captures: [], pauses: [] });
  const web = quietPoint({ tr: read([...walk, ...standing(corner.t + 20 * HOUR, 5 * MIN, 3200, 200, 1000, 12)]), captures: [], pauses: [] });
  assert.ok(phone != null && web != null);
  assert.ok(Math.abs(phone - corner.t) <= MIN, `within a minute of the last corner (${(phone - corner.t) / 1000} s)`);
  assert.ok(Math.abs(phone - web) <= MIN, 'the phone and the web find the same point');
});

test('QE2: a sit mid-walk followed by walking, a capture, a ride or a Resume is never the quiet end', { todo: 'test first' }, async () => {
  const { quietPoint, quietEndAt } = await mod();
  // Ten minutes, a 40-minute sit at the corner, ten more minutes on from there.
  const sit = standing(corner.t + 1000, 40 * MIN, (corner.lon - LON0) / M_LON, (corner.lat - LAT0) / M_LAT, 5000);
  const on = walking(lastOf(sit).t + 5000, 10, (corner.lon - LON0) / M_LON, (corner.lat - LAT0) / M_LAT);
  const walkedOn = quietPoint({ tr: read([...walk, ...sit, ...on]), captures: [], pauses: [] });
  assert.ok(walkedOn != null && Math.abs(walkedOn - lastOf(on).t) <= MIN, 'walking on after the sit is the point');
  // A capture near the sit's end: the walk is not quiet at the hold five minutes later.
  const tr = read([...walk, ...sit]);
  const cap = lastOf(sit).t - 5 * MIN;
  assert.equal(quietPoint({ tr, captures: [cap], pauses: [] }), cap, 'a capture after the sit is the point');
  assert.equal(quietEndAt({ tr, captures: [cap], pauses: [] }, lastOf(sit).t), null, 'not quiet: the capture was five minutes ago');
  // A ride after it, ending near the sit's end.
  const ride = { t0: corner.t + 30 * MIN, t1: corner.t + 38 * MIN, fixes: [] };
  assert.equal(quietPoint({ tr: { ...tr, rides: [ride] }, captures: [], pauses: [] }), ride.t1, 'a ride\'s end is the point');
  // A Resume after it.
  const pause = { started_at: corner.t + 20 * MIN, ended_at: corner.t + 36 * MIN };
  assert.equal(quietPoint({ tr, captures: [], pauses: [pause] }), pause.ended_at, 'a Resume is the point');
  // An open pause is no Resume.
  assert.ok((quietPoint({ tr, captures: [], pauses: [{ started_at: corner.t + 39 * MIN, ended_at: null }] }) ?? 0) < corner.t + MIN);
});

test('QE2: a slow walk (outAndBack, eastonSlow) is walking on to its end, never quiet', { todo: 'test first' }, async () => {
  const { quietPoint, quietEndAt } = await mod();
  const dir = __dirname;
  const out = JSON.parse(readFileSync(join(dir, 'outAndBack.json'), 'utf8')) as { points: Omit<TracePoint, 'walk_id'>[]; pauses: { started_at: number; ended_at: number }[] };
  const outPts = out.points.map((p) => ({ ...p, walk_id: 'w' }));
  const easton = JSON.parse(readFileSync(join(dir, 'eastonSlow.json'), 'utf8')) as TracePoint[];
  for (const [name, pts, pauses] of [['outAndBack', outPts, out.pauses], ['eastonSlow', easton, []]] as const) {
    const tr = readTrace(pts as TracePoint[], 0, pauses as never);
    const end = pts[pts.length - 1].t;
    const at = quietPoint({ tr, captures: [], pauses: pauses as never });
    assert.ok(at != null, `${name}: a point`);
    assert.ok(end - at < 5 * MIN, `${name}: walking on to within minutes of its end (${Math.round((end - at) / 1000)} s)`);
    assert.equal(quietEndAt({ tr, captures: [], pauses: pauses as never }, end), null, `${name}: never quiet at its own end`);
  }
});

test('QE3: quiet 30 min or more asks; 29 min does not', { todo: 'test first' }, async () => {
  const { quietEndAt, QUIET_MS } = await mod();
  const tr = read(walk);
  assert.equal(QUIET_MS, 30 * MIN);
  assert.equal(quietEndAt({ tr, captures: [], pauses: [] }, corner.t + 29 * MIN), null);
  assert.ok(quietEndAt({ tr, captures: [], pauses: [] }, corner.t + 31 * MIN) != null);
});

test('QE5: a walk is read up to its end, the end\'s own fix included; all of it while it has none', { todo: 'test first' }, async () => {
  const { untilEnd } = await mod();
  const pts = [...walk, ...standing(corner.t + 20 * HOUR, 8000, 3200, 200)];
  assert.deepEqual(untilEnd(pts, corner.t), walk);
  assert.equal(untilEnd(pts, null).length, pts.length);
});

test('QE9: the ask says a time of day, "yesterday" in lower case, no word for today, "on <day>" further back', { todo: 'test first' }, async () => {
  const { quietLine, endItLabel, quietRowHint, KEEP_IT_ALL, QUIET_ROW } = await mod();
  const at = new Date(2026, 10, 26, 20, 35).getTime();
  const nextDay = new Date(2026, 10, 27, 16, 36).getTime();
  assert.equal(quietLine(at, nextDay), 'This walk went quiet at 8:35 pm yesterday.');
  assert.equal(quietLine(at, at + 45 * MIN), 'This walk went quiet at 8:35 pm.');
  assert.equal(endItLabel(at), 'End it at 8:35 pm');
  assert.equal(KEEP_IT_ALL, 'Keep it all');
  assert.equal(QUIET_ROW, 'End it where it went quiet');
  assert.equal(quietRowHint(at, nextDay), 'At 8:35 pm yesterday; what came after it leaves the walk');
});

test('forgotten-stop steward 5: a quiet point three days back reads "on <dayLabel>"', { todo: 'test first' }, async () => {
  const { quietLine } = await mod();
  const { dayKey, dayLabel } = await import('../../days');
  const at = new Date(2026, 10, 24, 20, 35).getTime();
  const now = new Date(2026, 10, 27, 9, 0).getTime();
  assert.equal(quietLine(at, now), `This walk went quiet at 8:35 pm on ${dayLabel(dayKey(at), now)}.`);
});

test('forgotten-stop steward 3: a 35-minute quiet end\'s hint names no unit of time', { todo: 'test first' }, async () => {
  const { quietRowHint, quietLine } = await mod();
  const at = new Date(2026, 10, 26, 20, 35).getTime();
  for (const s of [quietRowHint(at, at + 35 * MIN), quietLine(at, at + 35 * MIN), quietRowHint(at, at + 20 * HOUR)]) {
    assert.doesNotMatch(s, /\b(hours?|minutes?|min|h)\b/i, s);
    // The clock's digits only: no count.
    assert.equal(s.replace(/\d{1,2}:\d{2}/, '').match(/\d/), null, s);
  }
});
