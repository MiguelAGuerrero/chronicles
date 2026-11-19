/// <reference types="node" />
// Replay ceremony, breaks (specs/replay-ceremony/spec.md, RC17-RC22; decision 0206), written before the code: what is
// not built yet is reached through casts and a guarded load, so the typecheck holds while each test fails for its own
// reason. What the screen shows of a break (RC17, RC18, RC20) is the `replay` journey's too.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { test } from 'node:test';
import { rhythm, rhythmFrame, rhythmPlan, type RhythmPlan } from '../../ceremony/rhythm';
import { walkStory, type WalkInput } from '../../ceremony/story';
import type { CeremonyOptions, Frame, Story } from '../../ceremony/types';
import { distanceM, stepToward } from '../../geo';
import * as tokens from '../../motionTokens';
import { facedOf, type Faced } from '../../moment';
import { timedRuns } from '../../replay';
import type { LngLat, TracePoint } from '../../types';

const SRC = join(__dirname, '..', '..', '..');
const load = createRequire(__filename);
/** A module that may not be built yet: empty until it is. */
const mod = (rel: string): Record<string, unknown> => {
  try {
    return load(join(SRC, rel)) as Record<string, unknown>;
  } catch {
    return {};
  }
};
const built = <T,>(m: object, name: string): T => {
  const f = (m as Record<string, unknown>)[name];
  assert.ok(f !== undefined, `${name} is not built yet`);
  return f as T;
};
const R = tokens.REPLAY_RHYTHM as unknown as Record<string, number>;
const token = (name: string): number => {
  assert.ok(typeof R[name] === 'number', `REPLAY_RHYTHM.${name} is not a token yet`);
  return R[name];
};

type Screen = { width: number; height: number; insets: { top: number; bottom: number; left: number; right: number } };
const PHONE: Screen = { width: 390, height: 844, insets: { top: 0, bottom: 0, left: 0, right: 0 } };
type Cam = { center: LngLat | null; zoom: number | null };
type Hop = { from: LngLat; to: LngLat; p: number };
const cameraMod = mod('lib/ceremony/camera.ts');
const revealMod = mod('lib/ceremony/reveal.ts');
const project = (c: Cam, at: LngLat) => built<(s: Screen, c: Cam, at: LngLat) => [number, number] | null>(cameraMod, 'project')(PHONE, c, at)!;
const pxPerMetre = (zoom: number, lat: number) => built<(z: number, lat: number) => number>(cameraMod, 'pxPerMetre')(zoom, lat);
const hopLines = (hops: Hop[]) => built<(h: Hop[]) => LngLat[][]>(revealMod, 'hopLines')(hops);
const hopsKey = (hops: Hop[], ms: number, every: number) => built<(h: Hop[], ms: number, every: number) => string>(revealMod, 'hopsKey')(hops, ms, every);
type Span = { from: LngLat; to: LngLat; t0: number; t1: number };
const linksWithHops = (empty: Span[], gaps: Span[], hops: Span[]) => built<(e: Span[], g: Span[], h: Span[]) => LngLat[][]>(revealMod, 'linksWithHops')(empty, gaps, hops);

const O: LngLat = [-71.4, 41.812];
const mLat = 1 / 111320;
const mLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
/** x, y in metres east and north of O. */
const at = (x: number, y = 0): LngLat => [O[0] + x * mLon, O[1] + y * mLat];
const MIN = 60_000;

/** Fixes every 5 s from `from` to `to` at 1.4 m/s, starting at t0. */
function line(from: LngLat, to: LngLat, t0: number): TracePoint[] {
  const pts: TracePoint[] = [];
  let pos = from;
  let t = t0;
  pts.push({ walk_id: 'w', t, lat: pos[1], lon: pos[0], accuracy_m: 6, speed: 1.4, course: null });
  while (distanceM(pos, to) > 0.1) {
    pos = stepToward(pos, to, 7);
    t += 5000;
    pts.push({ walk_id: 'w', t, lat: pos[1], lon: pos[0], accuracy_m: 6, speed: 1.4, course: null });
  }
  return pts;
}
const endT = (pts: TracePoint[]) => pts[pts.length - 1].t;
let ids = 0;
const note = (t: number, p: LngLat): Faced => facedOf({ id: `b${++ids}`, walk_id: 'w', t, lat: p[1], lon: p[0], kind: 'text', file_path: null, body: 'x', segment_id: null });
function input(fixes: TracePoint[], captures: Faced[], pauses: { started_at: number; ended_at: number | null }[] = []): WalkInput {
  return {
    walk: { id: 'w', started_at: fixes[0].t, ended_at: endT(fixes), title: null, epilogue: null, open: false, area: null, snapped_build: 'b' },
    fixes, walkedFixes: fixes, breaks: pauses, pauses: pauses.map((x) => ({ walk_id: 'w', ...x })), runs: timedRuns(fixes, pauses).map((r) => r.map((x) => x.p)),
    rideRuns: [], rideTimed: [], captures, passed: [], stays: [],
  };
}
const opts = (reduceMotion = false) => ({ reduceMotion, screen: PHONE }) as unknown as CeremonyOptions;
const plan = (s: Story, reduceMotion = false) => rhythmPlan(s, opts(reduceMotion));

/** 300 m east, `minutes` with no fixes, then on from `apart` metres further east for 300 m more, a note at the end. */
function brokenWalk(apart: number, minutes = 20, north = 0) {
  const a = line(O, at(300), 0);
  const from = at(300);
  const to = at(300 + apart, north);
  const b = line(to, at(600 + apart, north), endT(a) + minutes * MIN);
  return { from, to, t0: endT(a), t1: b[0].t, story: walkStory(input([...a, ...b], [note(endT(b), at(600 + apart, north))])) };
}
type Break = { k: string; t0: number; t1: number; hop?: boolean; tSwitch?: number; from: LngLat | null; to: LngLat | null };
/** The plan's breaks, as they are crossed. */
const breaksOf = (p: RhythmPlan) => (p.segs as unknown as Break[]).filter((s) => s.k === 'break');
const theBreak = (p: RhythmPlan): Break => {
  const b = breaksOf(p);
  assert.equal(b.length, 1, `the walk has ${b.length} breaks to cross`);
  return b[0];
};
const hopsIn = (f: Frame): Hop[] => {
  const hops = (f as unknown as { hops?: Hop[] }).hops;
  assert.ok(Array.isArray(hops), 'a frame says its hops');
  return hops;
};
const fadeOf = (f: Frame): number => {
  const fade = (f as unknown as { clockFade?: number }).clockFade;
  assert.ok(typeof fade === 'number', 'a frame says the clock\'s fade');
  return fade;
};
const cam = (f: Frame): { center: LngLat; zoom: number } => {
  assert.ok(f.camera.center && f.camera.zoom != null, 'the frame says where the camera is');
  return { center: f.camera.center, zoom: f.camera.zoom };
};
const inside = (p: [number, number]) => p[0] >= 0 && p[0] <= PHONE.width && p[1] >= 0 && p[1] <= PHONE.height;
/** How far a point is from the straight line a map draws between two places, in px at the walking zoom. */
function offLine(p: LngLat, a: LngLat, b: LngLat): number {
  const view = { center: a, zoom: 15 };
  const [px, py] = project(view, p);
  const [ax, ay] = project(view, a);
  const [bx, by] = project(view, b);
  const len = Math.hypot(bx - ax, by - ay) || 1;
  return Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
}

// ---------------------------------------------------------------- no dim (RC17)

test('RC17: a break never dims the map', () => {
  for (const apart of [2000, 300, 30]) {
    const p = plan(brokenWalk(apart).story);
    const b = theBreak(p);
    for (let ms = b.t0 - 200; ms <= b.t1 + 200; ms += 20) assert.ok(!('dim' in rhythmFrame(p, ms)), `a frame of a ${apart} m break carries a dim`);
  }
  // No frame can say one, and the stage has nothing to draw one with.
  assert.doesNotMatch(readFileSync(join(SRC, 'lib/ceremony/types.ts'), 'utf8'), /\bdim\b/, 'a frame can still say a dim');
  for (const f of readdirSync(join(SRC, 'components/ceremony'))) assert.doesNotMatch(readFileSync(join(SRC, 'components/ceremony', f), 'utf8'), /\bdim\b|\.dim\b/, `${f} still draws a dim`);
  assert.doesNotMatch(readFileSync(join(SRC, 'lib/ceremony/rhythm.ts'), 'utf8'), /\bdim\s*[:=,]/, 'the rhythm still works out a dim');
});

// ---------------------------------------------------------------- the hop (RC18)

test('RC18: a far break takes 4.2 s, a nearer one less, never under 58% of that', () => {
  assert.equal(token('breakFar'), 4200);
  assert.equal(token('breakNear'), 0.58);
  assert.equal(token('breakFarM'), 250);
  const took = (apart: number) => {
    const b = theBreak(plan(brokenWalk(apart).story));
    assert.equal(b.hop, true, `${apart} m apart is a hop`);
    return b.t1 - b.t0;
  };
  for (const far of [252, 400, 5000]) assert.ok(Math.abs(took(far) - 4200) < 1, `${far} m: ${took(far)} ms`);
  // Half way to far: half way between 58% and the whole (the walk's own metres are a few short of 125).
  assert.ok(Math.abs(took(125) - 4200 * (0.58 + 0.42 * 0.5)) < 15, `125 m: ${took(125)} ms`);
  assert.ok(took(60) < took(125) && took(125) < took(200) && took(200) < 4200, 'the nearer, the less');
  assert.ok(took(50) >= 4200 * 0.58 - 1, `never under 58%: ${took(50)} ms`);
});

test('RC18: the camera pulls back until both ends fit, a dotted line draws across, the walker slides along it, and the camera closes in at the far end', () => {
  // 2 km apart, to the north-east: far more than the screen shows at the walking zoom.
  const { story, from, to, t0, t1 } = brokenWalk(1600, 20, 1200);
  const p = plan(story);
  const b = theBreak(p);
  const dur = b.t1 - b.t0;
  const frameAt = (u: number) => rhythmFrame(p, b.t0 + u * dur);
  // It begins where the trace stops, at the walking zoom, and the far end is off the screen.
  assert.ok(Math.abs(cam(frameAt(0)).zoom - 15) < 1e-6 && !inside(project(cam(frameAt(0)), to)));
  // Pulled back: both ends in the frame, and held there while the line draws and the walker crosses.
  const held = cam(frameAt(token('hopPull')));
  assert.ok(held.zoom < 14, `pulled back to zoom ${held.zoom.toFixed(2)}`);
  for (let u = token('hopPull'); u <= token('hopClose'); u += 0.02) {
    const c = cam(frameAt(u));
    assert.ok(inside(project(c, from)) && inside(project(c, to)), `both ends are in view at ${u.toFixed(2)}`);
    assert.deepEqual(c, held, 'and the camera holds there');
  }
  // The dotted line draws from where the trace stops, before the walker moves.
  assert.deepEqual(hopsIn(frameAt(token('hopDraw') - 0.02)), []);
  let drawn = 0;
  for (let u = token('hopDraw') + 0.01; u < token('hopDrawn'); u += 0.02) {
    const [h] = hopsIn(frameAt(u));
    assert.ok(h && distanceM(h.from, from) < 1 && distanceM(h.to, to) < 1 && h.p > drawn && h.p < 1, `the hop is ${h?.p} drawn at ${u.toFixed(2)}`);
    drawn = h.p;
    assert.ok(distanceM(frameAt(u).walker!, from) < 1, 'the walker waits for it');
  }
  assert.equal(hopsIn(frameAt(token('hopDrawn') + 0.01))[0].p, 1);
  // The walker slides along it: on the straight line, further on in every frame, and down at the far end by `hopLand`.
  let gone = 0;
  for (let u = token('hopDrawn') + 0.01; u < token('hopLand'); u += 0.02) {
    const w = frameAt(u).walker!;
    assert.ok(offLine(w, from, to) < 0.5, `the walker is ${offLine(w, from, to).toFixed(1)} px off the line`);
    assert.ok(distanceM(from, w) >= gone, 'never back');
    gone = distanceM(from, w);
  }
  assert.ok(gone > 0.8 * distanceM(from, to) && distanceM(frameAt(token('hopLand') + 0.01).walker!, to) < 1, 'and lands where the trace picks up');
  // The trace picks up when the walker lands, never before: the far run is not drawn while the walker is on the hop.
  assert.equal(frameAt(token('hopLand') - 0.05).drawn.w, t0);
  assert.equal(frameAt(token('hopLand') + 0.01).drawn.w, t1);
  // The camera closes in at the far end: the walking zoom again, the walker in the middle of the screen.
  const end = rhythmFrame(p, b.t1);
  const w = project(cam(end), to);
  assert.ok(Math.abs(cam(end).zoom - 15) < 1e-6 && Math.abs(w[0] - PHONE.width / 2) < 1 && Math.abs(w[1] - PHONE.height * token('focusY')) < 1, `closed in at ${w.map(Math.round)}`);
  // The walker never leaves the frame, and the zoom moves one way at a time.
  let lowest = Infinity;
  for (let ms = b.t0; ms <= b.t1; ms += 20) {
    const f = rhythmFrame(p, ms);
    assert.ok(inside(project(cam(f), f.walker!)), `the walker is off the screen at ${(ms - b.t0).toFixed(0)} ms`);
    lowest = Math.min(lowest, cam(f).zoom);
  }
  assert.ok(Math.abs(lowest - held.zoom) < 1e-6);
});

// ---------------------------------------------------------------- "N min later" and the clock (RC19)

test('RC19: "N min later" shows from when both ends are in view until a little after the walker lands; the clock dissolves from one time to the other', () => {
  const { story, t0, t1 } = brokenWalk(400, 43);
  const p = plan(story);
  const b = theBreak(p);
  const dur = b.t1 - b.t0;
  const inView = b.t0 + dur * token('hopPull');
  assert.equal(rhythmFrame(p, inView - 30).line, null, 'not before both ends are in view');
  for (let ms = inView + 10; ms < b.t1 + token('breakLineAfter'); ms += 50) assert.equal(rhythmFrame(p, ms).line, '43 min later', `at ${(ms - b.t0).toFixed(0)} ms`);
  assert.ok(rhythmFrame(p, b.t0 + dur * token('hopLand')).lineOpacity > 0.95, 'there as the walker lands');
  assert.ok(token('breakLineAfter') >= 300 && token('breakLineAfter') <= 1500, 'a little after');
  assert.equal(rhythmFrame(p, b.t1 + token('breakLineAfter') + 20).line, null);
  // The clock is one time, then the other: it never shows a time between, so nothing rolls through the break.
  const seen = new Set<number>();
  let prev = -Infinity;
  for (let ms = b.t0; ms < b.t1; ms += 10) {
    const c = rhythmFrame(p, ms).clock!;
    seen.add(c);
    assert.ok(c >= prev, 'never back');
    prev = c;
  }
  assert.deepEqual([...seen], [t0, t1]);
  // It changes as the walker is mid-way, in a dissolve: faded out there, whole again a little either side.
  const tSwitch = b.tSwitch!;
  assert.ok(Math.abs(tSwitch - (b.t0 + dur * token('hopSwitch'))) < 1);
  assert.ok(fadeOf(rhythmFrame(p, tSwitch)) < 0.05, 'gone as it changes');
  assert.equal(rhythmFrame(p, tSwitch - 1).clock, t0);
  assert.equal(rhythmFrame(p, tSwitch + 1).clock, t1);
  const half = token('clockDissolve');
  assert.ok(half >= 120 && half <= 400);
  assert.equal(fadeOf(rhythmFrame(p, tSwitch - half - 10)), 1);
  assert.equal(fadeOf(rhythmFrame(p, tSwitch + half + 10)), 1);
  assert.ok(Math.abs(fadeOf(rhythmFrame(p, tSwitch - half / 2)) - 0.5) < 0.05 && Math.abs(fadeOf(rhythmFrame(p, tSwitch + half / 2)) - 0.5) < 0.05);
  // Off a break the clock is whole, once the opening has brought it in and until the close takes it out (RC23, RC26).
  const opened = p.segs.find((s) => s.k === 'intro')!.t1;
  const closing = p.segs.find((s) => (s.k as string) === 'close')!.t0;
  for (const ms of [opened, b.t0 - 100, b.t1 + 100, closing - 100]) assert.equal(fadeOf(rhythmFrame(p, ms)), 1);
  // The stage writes that fade on the clock, and its reels do not roll while it is faded.
  const stage = readFileSync(join(SRC, 'components/ceremony/Stage.tsx'), 'utf8');
  assert.match(stage, /opacity: f\.clockFade/);
  assert.match(stage, /still=\{ctx\.reduceMotion \|\| dissolving\}/);
});

// ---------------------------------------------------------------- the stand (RC20)

test('RC20: a break whose ends are under 26 px apart at the walking zoom is a stand: 1.3 s, the line and the clock\'s change, no hop, no camera move', () => {
  assert.equal(token('standPx'), 26);
  assert.equal(token('stand'), 1300);
  // 26 px at the walking zoom is about 46 m here.
  const edge = 26 / pxPerMetre(15, O[1]);
  assert.ok(edge > 40 && edge < 52, `${edge.toFixed(0)} m`);
  assert.equal(theBreak(plan(brokenWalk(edge + 4, 5).story)).hop, true, 'just over: a hop');
  const { story, from, to, t0, t1 } = brokenWalk(edge - 6, 5);
  const p = plan(story);
  const b = theBreak(p);
  assert.equal(b.hop, false, 'just under: a stand');
  assert.ok(Math.abs(b.t1 - b.t0 - 1300) < 1e-6);
  const first = rhythmFrame(p, b.t0);
  for (let ms = b.t0; ms <= b.t1; ms += 20) {
    const f = rhythmFrame(p, ms);
    assert.deepEqual(hopsIn(f), [], 'no hop');
    assert.deepEqual(f.camera, first.camera, `the camera moved at ${(ms - b.t0).toFixed(0)} ms`);
    assert.ok(Math.min(distanceM(f.walker!, from), distanceM(f.walker!, to)) < 1, 'the walker is on one side or the other');
  }
  assert.deepEqual(hopsIn(rhythmFrame(p, p.total - 100)), [], 'and none is left on the map');
  // The line under the clock, and the clock's change half way.
  assert.equal(rhythmFrame(p, b.t0 + token('standLineIn') + 10).line, '5 min later');
  assert.equal(rhythmFrame(p, b.t1 + token('breakLineAfter') - 10).line, '5 min later');
  assert.equal(rhythmFrame(p, b.t0 + 600).clock, t0);
  assert.equal(rhythmFrame(p, b.t0 + 700).clock, t1);
  assert.ok(fadeOf(rhythmFrame(p, b.t0 + 650)) < 0.05 && fadeOf(rhythmFrame(p, b.t0 + 100)) === 1);
  // A pause where you stood is a stand too, however long.
  const a = line(O, at(300), 0);
  const c = line(at(300), at(600), endT(a) + 90 * MIN);
  const paused = plan(walkStory(input([...a, ...c], [note(endT(c), at(600))], [{ started_at: endT(a) + 1000, ended_at: endT(a) + 89 * MIN }])));
  assert.equal(theBreak(paused).hop, false);
  assert.equal(rhythmFrame(paused, theBreak(paused).t0 + 400).line, '1 h 30 min later');
});

// ---------------------------------------------------------------- the dots, and what stays (RC21)

test('RC21: the hop is a gap\'s dotted link, drawn by the map in that layer, and stays on the map through the card', () => {
  const { story, from, to, t0, t1 } = brokenWalk(400);
  const p = plan(story);
  const b = theBreak(p);
  // Once made it stays: every later frame carries it whole, the last one too.
  for (let ms = b.t1; ms <= p.total + 50; ms += 100) {
    const hops = hopsIn(rhythmFrame(p, ms));
    assert.ok(hops.length === 1 && hops[0].p === 1 && distanceM(hops[0].from, from) < 1 && distanceM(hops[0].to, to) < 1, `at ${ms.toFixed(0)} ms`);
  }
  assert.equal(rhythmFrame(p, p.total).done, true);
  // The telling says its hops whole, for the card: their ends, and the walk's times they cross.
  const showing = rhythm.show(story, opts()) as unknown as { hops?: Span[] };
  assert.ok(showing.hops?.length === 1 && distanceM(showing.hops[0].from, from) < 1 && distanceM(showing.hops[0].to, to) < 1);
  assert.deepEqual([showing.hops[0].t0, showing.hops[0].t1], [t0, t1]);
  // As the lines a map draws: from where the trace stops, as far as it is drawn, straight.
  assert.deepEqual(hopLines([{ from, to, p: 1 }]), [[from, to]]);
  const [part] = hopLines([{ from, to, p: 0.5 }]);
  assert.ok(distanceM(part[0], from) < 1e-6 && Math.abs(distanceM(part[1], from) - distanceM(from, to) / 2) < 1 && offLine(part[1], from, to) < 0.01);
  // It is data while it draws, sent again at most ten times a second, and never once it is whole (RC3).
  const keys = new Set<string>();
  const dur = b.t1 - b.t0;
  for (let ms = b.t0; ms < b.t1; ms += 4) keys.add(hopsKey(hopsIn(rhythmFrame(p, ms)), ms, 100));
  const drawing = (dur * (token('hopDrawn') - token('hopDraw'))) / 100;
  assert.ok(keys.size >= 3 && keys.size <= Math.ceil(drawing) + 3, `${keys.size} sends over the hop's ${dur.toFixed(0)} ms`);
  assert.equal(hopsKey([], 500, 100), '', 'nothing to draw');
  const whole = hopsKey(hopsIn(rhythmFrame(p, b.t1 + 500)), b.t1 + 500, 100);
  for (let ms = b.t1 + 500; ms < p.total; ms += 37) assert.equal(hopsKey(hopsIn(rhythmFrame(p, ms)), ms, 100), whole, 'a whole hop is never sent again');
  // The maps draw them in the gap links' own layer: the web through its one gate, the phone in that source.
  const web = readFileSync(join(SRC, 'components/map/WalkMap.web.tsx'), 'utf8');
  assert.match(web, /sendData\(map, sent\.current, 'gap-links', traceGeoJSON\(hopLines\(f\.hops\)\)\)/);
  assert.equal([...web.matchAll(/id: 'gap-links'/g)].length, 1, 'one dotted layer, a gap\'s and a hop\'s');
  const native = readFileSync(join(SRC, 'components/map/WalkMap.native.tsx'), 'utf8');
  assert.match(native, /<GeoJSONSource id="gap-links" data=\{hops \?\? data\}/);
  // On the card the screens keep them: among the walk's own dotted links, and on the day's map.
  assert.match(readFileSync(join(SRC, 'app/replay/[id].tsx'), 'utf8'), /linksWithHops\(emptyGaps\(data\.gaps, data\.stretches\), data\.gaps, hops/);
  assert.match(readFileSync(join(SRC, 'app/day/[key].tsx'), 'utf8'), /gapLinks=\{onCard \? hopLinks : NO_RUNS\}/);
  // On the walk's card a gap keeps the card's own way of drawing it: a hop across an empty gap is that gap's dotted
  // link, drawn once (its ends are the recorded fixes', a few metres from the hop's); a hop across a gap with a way
  // offered gives way to the offer, as today; a hop across a pause or a break too long to be a gap is added.
  const gap: Span = { from: at(301), to: at(699), t0, t1 };
  const hop: Span = { from, to, t0: t0 + 1000, t1 };
  assert.deepEqual(linksWithHops([gap], [gap], [hop]), [[gap.from, gap.to]], 'the gap\'s own link, once');
  assert.deepEqual(linksWithHops([], [gap], [hop]), [], 'a gap with a way offered: the card draws the offer');
  const pause: Span = { from: at(900), to: at(1400), t0: t1 + 60_000, t1: t1 + 600_000 };
  assert.deepEqual(linksWithHops([gap], [gap], [hop, pause]), [[gap.from, gap.to], [pause.from, pause.to]]);
  assert.deepEqual(linksWithHops([], [], [hop]), [[from, to]], 'no gap there: the hop, as it was drawn');
  assert.deepEqual(linksWithHops([], [], []), []);
});

test('RC21: a gap whose way was kept or filled draws that way, as today, and no hop', () => {
  // The same hole, with the way across it filled in: the trace is read with the fill's points, so no break is left.
  const a = line(O, at(300), 0);
  const b = line(at(700), at(1000), endT(a) + 20 * MIN);
  const fill = line(at(300), at(700), endT(a)).slice(1, -1).map((f, i, all) => ({ ...f, t: endT(a) + ((i + 1) * 20 * MIN) / (all.length + 1) }));
  const holed = plan(walkStory(input([...a, ...b], [note(endT(b), at(1000))])));
  assert.equal(breaksOf(holed).length, 1);
  assert.equal(hopsIn(rhythmFrame(holed, holed.total - 50)).length, 1);
  const story = walkStory(input([...a, ...fill, ...b], [note(endT(b), at(1000))]));
  const p = plan(story);
  assert.equal(breaksOf(p).length, 0, 'no break to cross');
  for (let ms = 0; ms <= p.total; ms += 100) assert.deepEqual(hopsIn(rhythmFrame(p, ms)), []);
  assert.deepEqual((rhythm.show(story, opts()) as unknown as { hops?: unknown[] }).hops, []);
  // The walker goes the way that was kept: it passes through the middle of it.
  const mid = at(500);
  let nearest = Infinity;
  // (The walker is not shown while the opening looks at the walk whole, RC23.)
  for (let ms = 0; ms < p.total; ms += 20) nearest = Math.min(nearest, distanceM(rhythmFrame(p, ms).walker ?? O, mid));
  assert.ok(nearest < 15, `the walker came within ${nearest.toFixed(0)} m of the middle of the way`);
});

// ---------------------------------------------------------------- reduce motion (RC22)

test('RC22: with reduce motion a break is one still view with both ends and the hop drawn, and lasts as long', () => {
  const { story, from, to, t0, t1 } = brokenWalk(1600, 20, 1200);
  const moving = plan(story);
  const p = plan(story, true);
  const b = theBreak(p);
  assert.deepEqual([b.t0, b.t1, b.tSwitch], [theBreak(moving).t0, theBreak(moving).t1, theBreak(moving).tSwitch], 'it lasts as long');
  assert.equal(p.total, moving.total);
  for (let ms = b.t0; ms < b.t1; ms += 20) {
    const f = rhythmFrame(p, ms);
    // The map stays where it is (RC10, RR18): the walk whole, as the first beat left it, so both ends are in view.
    assert.deepEqual(f.camera, { center: null, zoom: null });
    // The hop is drawn, whole, from the break's first frame: nothing draws itself.
    assert.deepEqual(hopsIn(f), [{ from, to, p: 1 }]);
    // The walker is at one end, then the other: no slide; and the clock changes at once.
    assert.ok(Math.min(distanceM(f.walker!, from), distanceM(f.walker!, to)) < 1);
    assert.equal(fadeOf(f), 1);
    assert.equal(f.clock, ms < b.tSwitch! ? t0 : t1);
  }
  assert.equal(rhythmFrame(p, b.t0 + (b.t1 - b.t0) * token('hopPull') + 50).line, '20 min later');
  assert.deepEqual(hopsIn(rhythmFrame(p, b.t0 - 50)), [], 'not before the break');
});
