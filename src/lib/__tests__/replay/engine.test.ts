/// <reference types="node" />
// Replay ceremony, the engine (specs/replay-ceremony/spec.md, RC1-RC10, RC48; decision 0206), written before the code:
// what is not built yet is reached through casts and a guarded load, so the typecheck holds while each test fails for
// its own reason. The screen's side (RC1-RC4, RC7, RC9, RC10) is the `replay` journey's.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { test } from 'node:test';
import * as clockMod from '../../ceremony/clock';
import { rhythmFrame, rhythmPlan } from '../../ceremony/rhythm';
import { pathDrawnAt, walkStory, type WalkInput } from '../../ceremony/story';
import type { Frame, Jump, Landing, Showing, Story } from '../../ceremony/types';
import { distanceM, stepToward } from '../../geo';
import * as tokens from '../../motionTokens';
import { facedOf, type Faced } from '../../moment';
import { timedRuns, type TimedRun } from '../../replay';
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

// ---------------------------------------------------------------- the stepper (RC5, RC6, RC8)

type Loop = { epoch: number; ms: number; held: boolean; ended: boolean; showing: Showing | null; aimed: number | null; jump: Jump | null; at: number | null };
type StepOpts = { paused: boolean; total: number; frameMs: number };
const freshLoop = (epoch: number, showing: Showing | null) => built<(e: number, s: Showing | null) => Loop>(clockMod, 'freshLoop')(epoch, showing);
const stepLoop = (c: Loop, now: number, o: StepOpts) => built<(c: Loop, now: number, o: StepOpts) => { state: Loop; end: boolean }>(clockMod, 'stepLoop')(c, now, o);
const loopAgainst = (c: Loop, epoch: number, showing: Showing | null) => built<(c: Loop, e: number, s: Showing | null) => Loop>(clockMod, 'loopAgainst')(c, epoch, showing);
const holdLoop = (c: Loop) => built<(c: Loop) => Loop>(clockMod, 'holdLoop')(c);
const nextLoop = (c: Loop) => built<(c: Loop) => Loop>(clockMod, 'nextLoop')(c);
const loopCanNext = (c: Loop) => built<(c: Loop) => boolean>(clockMod, 'loopCanNext')(c);
const frameMsFor = (token: number, asked?: string | null) => built<(t: number, a?: string | null) => number>(clockMod, 'frameMsFor')(token, asked);

/** A telling whose clock is its own time, a minute of walk a second, with moments beginning where `stops` say. */
const telling = (total: number, stops: Landing[] = [], clockAt: (ms: number) => number = (ms) => ms * 60): Showing => ({
  total,
  stops,
  frame: (ms: number) => ({ clock: clockAt(ms) }) as Frame,
});
/** Runs the loop over display frames `every` ms apart for `ms` of real time, and counts the frames it took. */
function run(c: Loop, from: number, ms: number, every: number, o: StepOpts): { state: Loop; taken: number; ends: number } {
  let state = c;
  let taken = 0;
  let ends = 0;
  for (let t = from; t <= from + ms + 1e-6; t += every) {
    const r = stepLoop(state, t, o);
    if (r.state !== state) taken++;
    if (r.end) ends++;
    state = r.state;
  }
  return { state, taken, ends };
}
const FREE: StepOpts = { paused: false, total: 60_000, frameMs: 0 };

test('RC5: the replay advances by the time that really passed, whatever the frame rate', { todo: 'test first' }, () => {
  for (const every of [1000 / 120, 1000 / 60, 1000 / 30, 1000 / 12, 200]) {
    const r = run(freshLoop(1, telling(60_000)), 5000, 3000, every, FREE);
    assert.ok(Math.abs(r.state.ms - 3000) <= every + 0.001, `frames ${every.toFixed(1)} ms apart reach ${r.state.ms.toFixed(1)} ms in 3 s`);
  }
  // The first frame of a beat draws its start: no time has passed yet, whenever the page's clock reads.
  assert.equal(stepLoop(freshLoop(1, telling(60_000)), 987_654, FREE).state.ms, 0);
});

test('RC5: a frame longer than a quarter second counts as a quarter second, so a locked screen waits (audit 6)', { todo: 'test first' }, () => {
  const a = stepLoop(freshLoop(1, telling(60_000)), 1000, FREE).state;
  const b = stepLoop(a, 1000 + 40_000, FREE);
  assert.equal(b.state.ms, 250, 'forty seconds away are a quarter second of replay');
  assert.equal(b.end, false, 'and it never skips to the card');
  assert.equal(stepLoop(b.state, 41_100, FREE).state.ms, 350, 'then it goes on by the time that passes');
  // A clock that runs back (a changed system clock) moves nothing.
  assert.equal(stepLoop(b.state, 20_000, FREE).state.ms, 250);
});

test('RC6: the engine has one number for the most frames it draws a second; set to 30, it draws 30', { todo: 'test first' }, () => {
  const engine = built<{ frameMs: number }>(tokens, 'REPLAY_ENGINE');
  assert.equal(typeof engine.frameMs, 'number');
  // The token's own value: every display frame, 60 a second on a 60 Hz screen.
  const sixty = run(freshLoop(1, telling(60_000)), 0, 1000, 1000 / 60, { ...FREE, frameMs: frameMsFor(engine.frameMs) });
  assert.ok(sixty.taken >= 60 && sixty.taken <= 61, `${sixty.taken} frames in a second at the default`);
  for (const display of [60, 120]) {
    const thirty = run(freshLoop(1, telling(60_000)), 0, 1000, 1000 / display, { ...FREE, frameMs: frameMsFor(engine.frameMs, '30') });
    assert.ok(thirty.taken >= 30 && thirty.taken <= 31, `${thirty.taken} frames in a second on a ${display} Hz screen, asked for 30`);
    assert.ok(Math.abs(thirty.state.ms - 1000) <= 1000 / 30 + 0.001, `and the time that passed is the real second (${thirty.state.ms.toFixed(1)})`);
  }
  // Display frames that come a little early (16.2 then 17.1 ms) are not dropped to half the rate.
  let c = freshLoop(1, telling(60_000));
  let taken = 0;
  let t = 0;
  for (let k = 0; k < 60; k++) {
    t += k % 2 ? 17.1 : 16.2;
    const r = stepLoop(c, t, { ...FREE, frameMs: 1000 / 60 });
    if (r.state !== c) taken++;
    c = r.state;
  }
  assert.ok(taken >= 59, `${taken} of 60 jittered frames drawn at a ceiling of 60`);
  // What the route may ask: a whole number of frames a second from 5 to 120; anything else is the token.
  assert.equal(frameMsFor(0, '30'), 1000 / 30);
  assert.equal(frameMsFor(0, '60'), 1000 / 60);
  for (const odd of [null, undefined, '', 'fast', '0', '-3', '1000']) assert.equal(frameMsFor(0, odd), 0, `"${odd}" is not a ceiling`);
  assert.equal(frameMsFor(1000 / 30, null), 1000 / 30);
});

test('RC8: Hold and a wait stand the time still, and going on never leaps', { todo: 'test first' }, () => {
  const s = telling(60_000);
  const a = run(freshLoop(1, s), 0, 1000, 1000 / 60, FREE).state;
  const held = holdLoop(a);
  assert.equal(held.held, true);
  const h = run(held, 1000, 5000, 1000 / 60, FREE);
  assert.equal(h.state.ms, a.ms, 'held: the time stands');
  const on = stepLoop(holdLoop(h.state), 6000 + 1000 / 60, FREE).state;
  assert.ok(on.ms - a.ms <= 20, `released, it goes on from where it stood (${(on.ms - a.ms).toFixed(1)} ms)`);
  // A viewer open over it, or a memo catching up: paused the same way, and not held.
  const p = run(a, 1000, 5000, 1000 / 60, { ...FREE, paused: true });
  assert.equal(p.state.ms, a.ms);
  assert.equal(p.state.held, false);
  assert.ok(stepLoop(p.state, 6000 + 1000 / 60, FREE).state.ms - a.ms <= 20);
});

test('RC8: it ends once at the total, even a total of 0 or one that shrank (audit 2)', { todo: 'test first' }, () => {
  const r = run(freshLoop(1, telling(500)), 0, 2000, 1000 / 60, { ...FREE, total: 500 });
  assert.equal(r.state.ms, 500);
  assert.equal(r.state.ended, true);
  assert.equal(r.ends, 1, 'the end is said once');
  const zero = stepLoop(freshLoop(1, telling(0)), 0, { ...FREE, total: 0 });
  assert.equal(zero.end, true);
  const a = run(freshLoop(1, telling(60_000)), 0, 3000, 1000 / 60, FREE).state;
  assert.equal(stepLoop(a, 3100, { ...FREE, total: 1000 }).end, true, 'a telling rebuilt shorter than the time ends');
  // Held at the end it still does not end.
  assert.equal(stepLoop(holdLoop(a), 3100, { ...FREE, total: 1000 }).end, false);
});

test('RC8: Next goes to the next moment, held stays held, and two quick presses are two moments (RY13-RY17)', { todo: 'test first' }, () => {
  const stops = [{ t0: 5000, land: 4550 }, { t0: 9000, land: 8550 }];
  const s = telling(20_000, stops);
  const a = run(freshLoop(1, s), 0, 1000, 1000 / 60, { ...FREE, total: 20_000 }).state;
  assert.equal(loopCanNext(a), true);
  const one = nextLoop(holdLoop(a));
  assert.equal(one.ms, 4550);
  assert.equal(one.held, true, 'a held replay stays held');
  assert.deepEqual(one.jump, { from: a.ms, at: 4550 });
  const two = nextLoop(one);
  assert.equal(two.ms, 8550, 'the second press goes to the moment after, not the same one');
  assert.equal(loopCanNext(two), false, 'no moment lies ahead');
  assert.equal(nextLoop(two), two, 'a press with nothing ahead moves nothing');
  // The press moves the time and nothing else: the next frame goes on from there by the time that passed.
  const b = stepLoop({ ...one, held: false }, (a.at ?? 0) + 1000 / 60, { ...FREE, total: 20_000 }).state;
  assert.ok(b.ms >= 4550 && b.ms <= 4550 + 20, `on from the landing (${b.ms})`);
});

test('RC8: a telling rebuilt mid-path takes up at the same time of day and forgets the press; a new beat starts afresh', { todo: 'test first' }, () => {
  // The old telling: a minute of walk a second. The new one has four seconds more ahead of every time of day.
  const old = telling(20_000, [{ t0: 5000, land: 4550 }]);
  const next = telling(24_000, [{ t0: 9000, land: 8550 }], (ms) => Math.max(0, ms - 4000) * 60);
  const a = nextLoop(run(freshLoop(7, old), 0, 1000, 1000 / 60, { ...FREE, total: 20_000 }).state);
  assert.ok(a.jump && a.aimed === 5000);
  const b = loopAgainst(a, 7, next);
  assert.ok(Math.abs(b.ms - (a.ms + 4000)) <= 2, `the same time of day: ${a.ms} becomes ${b.ms}`);
  assert.equal(b.showing, next);
  assert.equal(b.jump, null, 'the press said nothing of the new telling');
  assert.equal(b.aimed, null);
  assert.equal(loopAgainst(b, 7, next), b, 'read against the same telling, nothing changes');
  // Watch again, or the path after the fog: a new epoch is a new beat, from its start, not held and not ended.
  const again = loopAgainst({ ...holdLoop(b), ended: true }, 8, next);
  assert.deepEqual({ ms: again.ms, held: again.held, ended: again.ended, at: again.at, epoch: again.epoch }, { ms: 0, held: false, ended: false, at: null, epoch: 8 });
});

// ---------------------------------------------------------------- the line, revealed (RC1, RC3)

const O: LngLat = [-71.4, 41.812];
const mLat = 1 / 111320;
const mLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
const at = (x: number, y: number): LngLat => [O[0] + x * mLon, O[1] + y * mLat];
const MIN = 60_000;
function line(from: LngLat, to: LngLat, t0: number, speed = 1.4): TracePoint[] {
  const pts: TracePoint[] = [];
  let pos = from;
  let t = t0;
  pts.push({ walk_id: 'w', t, lat: pos[1], lon: pos[0], accuracy_m: 6, speed, course: null });
  while (distanceM(pos, to) > 0.1) {
    pos = stepToward(pos, to, speed * 5);
    t += 5000;
    pts.push({ walk_id: 'w', t, lat: pos[1], lon: pos[0], accuracy_m: 6, speed, course: null });
  }
  return pts;
}
let ids = 0;
const cap = (kind: Faced['kind'], t: number, p: LngLat, body: string | null = null): Faced =>
  facedOf({ id: `e${++ids}`, walk_id: 'w', t, lat: p[1], lon: p[0], kind, file_path: kind === 'text' ? null : 'x', body, segment_id: null });
function input(fixes: TracePoint[], captures: Faced[], rides: TimedRun[] = []): WalkInput {
  return {
    walk: { id: 'w', started_at: fixes[0].t, ended_at: fixes[fixes.length - 1].t, title: null, epilogue: null, open: false, area: null, snapped_build: 'b' },
    fixes, walkedFixes: fixes, breaks: [], pauses: [],
    runs: timedRuns(fixes, []).map((r) => r.map((x) => x.p)),
    rideRuns: rides.map((r) => r.map((x) => x.p)), rideTimed: rides,
    captures, passed: [], stays: [],
  };
}
/** 600 m east with a photo at its end, a corner, 400 m north, 20 minutes with no fixes, then 300 m more and a note. */
function cornerWalk(): Story {
  const ab = line(at(0, 0), at(600, 0), 0);
  const bc = line(at(600, 0), at(600, 400), ab[ab.length - 1].t + 5000);
  const de = line(at(900, 400), at(1200, 400), bc[bc.length - 1].t + 20 * MIN);
  return walkStory(input([...ab, ...bc, ...de], [cap('photo', ab[ab.length - 1].t, at(600, 0)), cap('text', de[de.length - 1].t, at(1200, 400), 'There.')]));
}

type LineReveal = { done: LngLat[][]; doneKey: string; run: LngLat[] | null; p: number; end: LngLat | null };
type Reveal = { walked: LineReveal; rides: LineReveal };
const revealMod = () => mod('lib/ceremony/reveal');
const revealOf = (story: Story, drawn: Record<string, number>) => built<(s: Story, d: Record<string, number>) => Reveal>(revealMod(), 'revealOf')(story, drawn);
const cutRun = (r: LngLat[], p: number) => built<(r: LngLat[], p: number) => LngLat[]>(revealMod(), 'cutRun')(r, p);
const revealedRuns = (l: LineReveal) => built<(l: LineReveal) => LngLat[][]>(revealMod(), 'revealedRuns')(l);
/** A run's length up to each point, as a map measures a line's progress (Web Mercator). */
function mercatorShare(runLine: LngLat[], end: LngLat): number {
  const y = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * (180 / Math.PI);
  const d = (a: LngLat, b: LngLat) => Math.hypot(b[0] - a[0], y(b[1]) - y(a[1]));
  let total = 0;
  for (let i = 1; i < runLine.length; i++) total += d(runLine[i - 1], runLine[i]);
  let best = { gap: Infinity, along: 0 };
  let along = 0;
  for (let i = 1; i < runLine.length; i++) {
    const seg = d(runLine[i - 1], runLine[i]);
    const u = seg ? Math.max(0, Math.min(1, ((end[0] - runLine[i - 1][0]) * (runLine[i][0] - runLine[i - 1][0]) + (y(end[1]) - y(runLine[i - 1][1])) * (y(runLine[i][1]) - y(runLine[i - 1][1]))) / (seg * seg))) : 0;
    const at: LngLat = [runLine[i - 1][0] + (runLine[i][0] - runLine[i - 1][0]) * u, runLine[i - 1][1] + (runLine[i][1] - runLine[i - 1][1]) * u];
    const gap = distanceM(at, end);
    if (gap < best.gap) best = { gap, along: along + seg * u };
    along += seg;
  }
  return best.along / total;
}

test('RC1: in every frame the revealed line ends where the walker stands, and is the line the data drew', { todo: 'test first' }, () => {
  const story = cornerWalk();
  const plan = rhythmPlan(story, { reduceMotion: false });
  let moving = 0;
  for (let ms = 0; ms < plan.total; ms += 16) {
    const f = rhythmFrame(plan, ms);
    const r = revealOf(story, f.drawn).walked;
    const drew = pathDrawnAt(story.paths.w, f.drawn.w ?? -Infinity).trace;
    // The same line as the one sent as data until now: the same runs whole, the same end.
    assert.equal(revealedRuns(r).length, f.drawn.w == null ? 0 : drew.length, `at ${ms} ms`);
    const tip = drew.at(-1)?.at(-1) ?? null;
    if (tip) assert.ok(r.end && distanceM(r.end, tip) < 0.01, `at ${ms} ms the line ends where the drawn trace did`);
    if (!r.run || r.p <= 0 || r.p >= 1 || !f.walker) continue;
    moving++;
    assert.ok(distanceM(r.end!, f.walker) < 0.01, `at ${ms} ms the line's end is ${distanceM(r.end!, f.walker).toFixed(2)} m from the walker`);
    // The share of the run that is revealed is the share of its length up to the walker, as the map measures it.
    assert.ok(Math.abs(r.p - mercatorShare(r.run, f.walker)) < 1e-4, `at ${ms} ms the reveal is ${r.p}, the walker ${mercatorShare(r.run, f.walker)} along`);
    const cut = cutRun(r.run, r.p);
    assert.ok(distanceM(cut[cut.length - 1], f.walker) < 0.05, 'a map that cannot reveal a line is given the same line, cut');
  }
  assert.ok(moving > 100, `the walker was on the line in ${moving} frames`);
});

test('RC1: a ride is revealed as the walk is, apart from it', { todo: 'test first' }, () => {
  const walked = line(at(0, 0), at(300, 0), 0);
  const t0 = walked[walked.length - 1].t + 5000;
  const ride: TimedRun = line(at(300, 0), at(2300, 0), t0, 10).map((p) => ({ t: p.t, p: [p.lon, p.lat] as LngLat }));
  const after = line(at(2300, 0), at(2500, 0), ride[ride.length - 1].t + 5000);
  const story = walkStory(input([...walked, ...ride.map((x) => ({ walk_id: 'w', t: x.t, lat: x.p[1], lon: x.p[0], accuracy_m: 6, speed: 10, course: null })), ...after], [cap('text', after[after.length - 1].t, at(2500, 0), 'Off the bus.')], [ride]));
  const mid = (ride[0].t + ride[ride.length - 1].t) / 2;
  const r = revealOf(story, { w: mid });
  assert.ok(r.rides.run && r.rides.p > 0.4 && r.rides.p < 0.6, `half-way through the ride, half of it is revealed (${r.rides.p})`);
  assert.equal(r.rides.done.length, 0);
  assert.ok(r.walked.done.length >= 1, 'the stretch walked before it is whole');
  const whole = revealOf(story, { w: Infinity });
  assert.equal(whole.rides.done.length, 1);
  assert.equal(whole.rides.run, null);
});

test('RC3: as time passes on a stretch the line is the same data: it changes only when a run begins or ends', { todo: 'test first' }, () => {
  const story = cornerWalk();
  const plan = rhythmPlan(story, { reduceMotion: false });
  let sends = 0;
  let last: { doneKey: string; run: LngLat[] | null } = { doneKey: '', run: null };
  for (let ms = 0; ms < plan.total; ms += 16) {
    const r = revealOf(story, rhythmFrame(plan, ms).drawn).walked;
    if (r.doneKey !== last.doneKey) sends++;
    if (r.run && r.run !== last.run) sends++;
    last = { doneKey: r.doneKey, run: r.run ?? last.run };
  }
  const runs = story.paths.w.drawn.length;
  assert.equal(runs, 2, 'the walk has two runs');
  assert.ok(sends >= runs && sends <= 2 * runs, `${sends} sends for ${runs} runs over ${Math.round(plan.total / 16)} frames`);
});

// ---------------------------------------------------------------- the stage, off the screen (RC7)

type Live = { frame(): Frame | null; shape(): string; set(f: Frame | null, telling?: unknown): void; subscribe(l: () => void): () => void };
const createStageLive = () => built<() => Live>(mod('lib/ceremony/live'), 'createStageLive')();

test('RC7: every frame reaches the stage\'s leaves, and its shape changes only when something arrives or leaves', { todo: 'test first' }, () => {
  const story = cornerWalk();
  const plan = rhythmPlan(story, { reduceMotion: false });
  const live = createStageLive();
  let told = 0;
  const off = live.subscribe(() => told++);
  let shapes = 0;
  let frames = 0;
  let moved = 0;
  let last = live.shape();
  let lastCard = '';
  for (let ms = 0; ms < plan.total; ms += 16) {
    const f = rhythmFrame(plan, ms);
    live.set(f, plan);
    frames++;
    assert.equal(live.frame(), f, 'the frame on stage is the one just set');
    if (live.shape() !== last) shapes++;
    last = live.shape();
    const card = f.overlays.find((o) => o.kind === 'card');
    const pose = card && card.kind === 'card' ? `${card.grow}:${card.tuck}` : '';
    if (pose && lastCard && pose !== lastCard) moved++;
    lastCard = pose;
  }
  assert.equal(told, frames, 'a listener is told of every frame');
  assert.ok(moved > 30, `the card moved in ${moved} frames`);
  // The photo's card comes and goes, the pile comes, the note's bubble comes: a handful of shapes in hundreds of frames.
  assert.ok(shapes >= 3 && shapes <= 8, `${shapes} shapes in ${frames} frames`);
  // A telling rebuilt (a note edited) is another shape though its overlays keep their keys: they may hold other captures.
  const before = live.shape();
  live.set(live.frame(), { rebuilt: true });
  assert.notEqual(live.shape(), before);
  off();
  live.set(null);
  assert.equal(told, frames + 1, 'a listener let go hears no more');
  assert.equal(live.shape(), '');
});

// ---------------------------------------------------------------- the same collection (RC4)

type Sent = { data: object; sig: string };
const nextSend = (lastSent: Sent | undefined, data: object) => built<(l: Sent | undefined, d: object) => { send: boolean; sent: Sent }>(mod('components/map/sent'), 'nextSend')(lastSent, data);
const lines = (...runs: LngLat[][]) => ({ type: 'FeatureCollection', features: runs.map((r) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: r } })) });

test('RC4: a collection is sent only when it changed: not the same again, not empty after empty', { todo: 'test first' }, () => {
  const a: LngLat[] = [at(0, 0), at(10, 0), at(20, 0)];
  // A source starts empty: an empty collection first is not a send.
  const first = nextSend(undefined, lines());
  assert.equal(first.send, false, 'empty at the start');
  assert.equal(nextSend(first.sent, lines()).send, false, 'empty after empty, another object');
  const one = nextSend(first.sent, lines(a));
  assert.equal(one.send, true);
  assert.equal(nextSend(one.sent, one.sent.data).send, false, 'the same object');
  assert.equal(nextSend(one.sent, lines([...a.map((p) => [...p] as LngLat)])).send, false, 'the same shape, built again');
  // Any change is sent: a point more, a point moved in the middle with the ends where they were, a property, back to empty.
  assert.equal(nextSend(one.sent, lines([...a, at(30, 0)])).send, true);
  assert.equal(nextSend(one.sent, lines([a[0], at(10, 5), a[2]])).send, true, 'a middle point moved');
  assert.equal(nextSend(one.sent, lines(a, a)).send, true);
  const dashed = lines(a);
  (dashed.features[0].properties as Record<string, unknown>).grade = 2;
  assert.equal(nextSend(one.sent, dashed).send, true, 'a property changed');
  const cleared = nextSend(one.sent, lines());
  assert.equal(cleared.send, true, 'empty after something clears it');
  assert.equal(nextSend(cleared.sent, lines()).send, false);
});

test('RC4: every send the web map makes goes through the one gate', { todo: 'test first' }, () => {
  const src = readFileSync(join(SRC, 'components/map/WalkMap.web.tsx'), 'utf8');
  const calls = [...src.matchAll(/\.setData\(/g)].length;
  assert.equal(calls, 1, `${calls} places call a source's setData`);
  assert.match(src, /nextSend\(/);
});

// ---------------------------------------------------------------- one engine (RC48)

test('RC48: no interval clock is left: the replay\'s time is one frame loop', { todo: 'test first' }, () => {
  const dir = join(SRC, 'components/ceremony');
  assert.equal(existsSync(join(dir, 'useCeremonyClock.ts')), false, 'the interval clock is gone');
  const files = ['app/replay/[id].tsx', 'app/day/[key].tsx', ...readdirSync(dir).map((f) => `components/ceremony/${f}`), ...readdirSync(join(SRC, 'lib/ceremony')).map((f) => `lib/ceremony/${f}`)];
  for (const f of files) assert.doesNotMatch(readFileSync(join(SRC, f), 'utf8'), /useCeremonyClock/, `${f} still names the interval clock`);
  const loop = readFileSync(join(dir, 'useCeremonyLoop.ts'), 'utf8');
  assert.match(loop, /requestAnimationFrame\(/);
  assert.doesNotMatch(loop, /set(Interval|Timeout)\(/, 'the loop keeps no timer');
  assert.match(loop, /stepLoop\(/, 'and the stepper decides its time');
  // The screens: the day keeps no interval at all; the walk's replay keeps the fog beat's alone.
  assert.doesNotMatch(readFileSync(join(SRC, 'app/day/[key].tsx'), 'utf8'), /setInterval\(/);
  const walk = readFileSync(join(SRC, 'app/replay/[id].tsx'), 'utf8');
  const intervals = [...walk.matchAll(/setInterval\(/g)];
  assert.equal(intervals.length, 1, `${intervals.length} intervals on the walk's replay`);
  assert.match(walk.slice(Math.max(0, intervals[0].index - 200), intervals[0].index), /beat !== 'fog'/, 'its one interval is the fog beat\'s');
  // Neither screen asks the ceremony for a frame as it renders: the loop does, outside it.
  for (const f of ['app/replay/[id].tsx', 'app/day/[key].tsx']) assert.doesNotMatch(readFileSync(join(SRC, f), 'utf8'), /TRACE_STEP_MS|pathDrawnAt\(/, `${f} still builds the line as time passes`);
});

test('RC48: the engine\'s new parts know no ceremony but through the frame (replay-rhythm audit 10)', { todo: 'test first' }, () => {
  const files = ['components/ceremony/useCeremonyLoop.ts', 'components/ceremony/useLive.ts', 'lib/ceremony/live.ts', 'lib/ceremony/reveal.ts', 'components/map/sent.ts'];
  for (const f of files) {
    assert.ok(existsSync(join(SRC, f)), `${f} is not built yet`);
    assert.doesNotMatch(readFileSync(join(SRC, f), 'utf8'), /ceremony\/rhythm|\.\/rhythm|REPLAY_RHYTHM/, `${f} reaches into the rhythm`);
  }
});
