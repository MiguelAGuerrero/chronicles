/// <reference types="node" />
// Replay rhythm (specs/replay-rhythm/spec.md, RR1-RR22), written before the code.
// A replay is a story (what happened) told by a ceremony (how it is shown);
// the rhythm is the first ceremony (decisions 0085, 0086).
import { type Faced, facedOf } from '../../moment';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceM, dwellsOf, smoothDwells, splitAtGaps, stepToward } from '../../geo';
import { timedRuns } from '../../replay';
import { REPLAY_RHYTHM as R } from '../../motionTokens';
import { dayStory, storySteps, walkStory, type WalkInput } from '../../ceremony/story';
import { laterLine, notePause, rhythm, rhythmFrame, rhythmPlan, type RhythmPlan } from '../../ceremony/rhythm';
import { CEREMONIES, ceremonyFor, DEFAULT_CEREMONY } from '../../ceremony/registry';
import { msAtClock, reanchor, tickClock } from '../../ceremony/clock';
import { mediaWait, trackWait } from '../../ceremony/media';
import { project, type StageCtx } from '../../../components/ceremony/layout';
import { readTrace, rideRuns, smoothKept, timedRideRuns } from '../../rides';
import { dayWithout } from '../../days';
import { stepAt } from '../../ceremony/story';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { OVERLAY_KINDS, type Ceremony, type Frame, type Story } from '../../ceremony/types';
import type { Day } from '../../days';
import type { LngLat, TracePoint } from '../../types';

const O: LngLat = [-71.4, 41.812];
const mLat = 1 / 111320;
const mLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
/** x, y in metres east and north of O. */
const at = (x: number, y: number): LngLat => [O[0] + x * mLon, O[1] + y * mLat];
const MIN = 60_000;

/** Fixes every 5 s from `from` to `to` at `speed` m/s, starting at t0. */
function line(from: LngLat, to: LngLat, t0: number, speed = 1.4, walkId = 'w'): TracePoint[] {
  const pts: TracePoint[] = [];
  let pos = from;
  let t = t0;
  pts.push({ walk_id: walkId, t, lat: pos[1], lon: pos[0], accuracy_m: 6, speed, course: null });
  while (distanceM(pos, to) > 0.1) {
    pos = stepToward(pos, to, speed * 5);
    t += 5000;
    pts.push({ walk_id: walkId, t, lat: pos[1], lon: pos[0], accuracy_m: 6, speed, course: null });
  }
  return pts;
}
/** Standing at a spot for `ms`, a fix every 5 s. */
function stand(p: LngLat, t0: number, ms: number, walkId = 'w'): TracePoint[] {
  const pts: TracePoint[] = [];
  for (let t = t0 + 5000; t <= t0 + ms; t += 5000) pts.push({ walk_id: walkId, t, lat: p[1], lon: p[0], accuracy_m: 6, speed: 0, course: null });
  return pts;
}
const endT = (pts: TracePoint[]) => pts[pts.length - 1].t;

let ids = 0;
function cap(kind: Faced['kind'], t: number, p: LngLat | null, body: string | null = null, walkId: string | null = 'w'): Faced {
  return facedOf({ id: `c${++ids}`, walk_id: walkId, t, lat: p ? p[1] : null, lon: p ? p[0] : null, kind, file_path: kind === 'text' ? null : 'x', body, segment_id: null });
}

function input(fixes: TracePoint[], captures: Faced[], o: { id?: string; passed?: WalkInput['passed']; pauses?: { started_at: number; ended_at: number | null }[]; stays?: WalkInput['stays'] } = {}): WalkInput {
  const id = o.id ?? 'w';
  const pauses = (o.pauses ?? []).map((p) => ({ walk_id: id, ...p }));
  return {
    walk: { id, started_at: fixes[0]?.t ?? 0, ended_at: fixes.length ? endT(fixes) : 0, title: null, epilogue: null, open: false, area: null, snapped_build: 'b' },
    fixes,
    walkedFixes: fixes,
    breaks: pauses,
    pauses,
    runs: timedRuns(fixes, pauses).map((r) => r.map((x) => x.p)),
    rideRuns: [],
    rideTimed: [],
    captures,
    passed: o.passed ?? [],
    stays: o.stays ?? [],
  };
}

const A = at(0, 0);
const B = at(600, 0);
const C = at(600, 1200);
const D = at(900, 1200);
const D2 = at(1200, 1200);

/** A→B (600 m), ten minutes at B with a photo, B→C (1200 m), a 20-minute gap, D→D2 (300 m), a note at the end. */
function sampleWalk(extra: Faced[] = [], passed: WalkInput['passed'] = []) {
  const ab = line(A, B, 0);
  const still = stand(B, endT(ab), 10 * MIN);
  const bc = line(B, C, endT(still));
  const dd = line(D, D2, endT(bc) + 20 * MIN);
  const fixes = [...ab, ...still, ...bc, ...dd];
  const photo = cap('photo', endT(ab) + 5 * MIN, B);
  const note = cap('text', endT(dd), D2, 'Legs done. Worth it.');
  return { fixes, photo, note, ab, still, bc, dd, story: walkStory(input(fixes, [photo, note, ...extra], { passed })) };
}

const plan = (s: Story, reduceMotion = false) => rhythmPlan(s, { reduceMotion });
const legs = (p: RhythmPlan) => p.segs.filter((s) => s.k === 'leg');
const frames = (p: RhythmPlan, step = 50): Frame[] => {
  const out: Frame[] = [];
  for (let ms = 0; ms < p.total; ms += step) out.push(rhythmFrame(p, ms));
  return out;
};

// ---------------------------------------------------------------- the story (RR20, RR22)

test('RR20: a walk\'s story holds its paths, moments with arrival and leaving, breaks and passes, and no timing', () => {
  const { story, ab, still, photo, dd } = sampleWalk([], [{ name: 'Hessian Memorial', generic: false, at: at(300, 40), t: 3.5 * MIN }]);
  assert.deepEqual(story.events.map((e) => e.kind), ['move', 'moment', 'move', 'break', 'move', 'moment']);
  const m = story.events[1];
  assert.ok(m.kind === 'moment');
  assert.ok(Math.abs(m.arrive - endT(ab)) <= 30_000, 'arrived when the walker came within reach of B');
  assert.ok(Math.abs(m.leave - endT(still)) <= 30_000, 'left when it moved on');
  assert.ok(m.arrive <= photo.t && m.leave >= photo.t);
  const brk = story.events[3];
  assert.ok(brk.kind === 'break' && brk.t1 === dd[0].t, 'the break ends where the trace starts again');
  assert.equal(story.passes.length, 1);
  assert.equal(story.passes[0].name, 'Hessian Memorial');
  assert.ok(story.paths.w && story.paths.w.ts.length > 0);
  const mv = story.events[0];
  assert.ok(mv.kind === 'move' && mv.m1 - mv.m0 > 600 - 30 && mv.m1 - mv.m0 <= 600, 'a move knows its metres, up to where the stop begins');
  for (const k of ['total', 'ms', 'duration', 'frame']) assert.ok(!(k in story), `no ${k} in a story`);
});

test('RR20: a day\'s story has the same shape, with travel between its entries', () => {
  const morning = cap('photo', 9 * 60 * MIN, at(-2000, 0), null, null);
  const ab = line(A, B, 11 * 60 * MIN);
  const walk = input(ab, [cap('text', endT(ab), B, 'Here')]);
  const evening = cap('text', 18 * 60 * MIN, at(5000, 0), 'Late', null);
  const day: Day = {
    key: '2026-11-04',
    entries: [
      { kind: 'moment', t: morning.t, capture: morning },
      { kind: 'walk', t: ab[0].t, walk: walk.walk, captures: walk.captures },
      { kind: 'moment', t: evening.t, capture: evening },
    ],
    moments: 3,
    walks: 1,
  };
  const s = dayStory(day, new Map([['w', walk]]));
  assert.deepEqual(s.events.map((e) => e.kind), ['moment', 'travel', 'move', 'moment', 'travel', 'moment']);
  const tr = s.events[1];
  assert.ok(tr.kind === 'travel' && Math.abs(tr.m - 2000) < 5 && tr.t1 - tr.t0 === 2 * 60 * MIN);
  assert.deepEqual(Object.keys(s).sort(), Object.keys(sampleWalk().story).sort(), 'the same kind of story');
  assert.deepEqual(s.captures.map((c) => c.id), [morning.id, walk.captures[0].id, evening.id]);
});

test('RR22: the screen reader\'s steps are the story\'s moments, in order', () => {
  const { story, photo, note } = sampleWalk();
  assert.deepEqual(storySteps(story).map((g) => g.map((c) => c.id)), [[photo.id], [note.id]]);
});

// ---------------------------------------------------------------- the rhythm

test('RR1: a stretch\'s time follows its length, not the minutes walked; standing takes none', () => {
  const at0 = line(A, B, 0); // 600 m at 1.4 m/s
  const slow = line(A, B, 0, 0.7); // the same 600 m in twice the time
  const noteFast = cap('text', endT(at0), B, 'x');
  const noteSlow = cap('text', endT(slow), B, 'x');
  const pf = plan(walkStory(input(at0, [noteFast])));
  const ps = plan(walkStory(input(slow, [noteSlow])));
  assert.equal(legs(pf)[0].t1 - legs(pf)[0].t0, legs(ps)[0].t1 - legs(ps)[0].t0, 'the same length takes the same time');
  const long = legs(pf)[0];
  assert.ok(long.t1 - long.t0 > R.glide && long.t1 - long.t0 <= R.glide + R.zip, 'a long stretch is a glide plus up to the zip');
  // A short stretch takes less than a glide, never under 0.45 of it.
  const short = plan(walkStory(input(line(A, at(100, 0), 0), [cap('text', 72_000, at(100, 0), 'x')])));
  const d = legs(short)[0].t1 - legs(short)[0].t0;
  assert.ok(d >= 0.45 * R.glide - 1 && d < R.glide, `a 100 m stretch takes ${d} ms`);
  // A very long stretch is still capped at glide + zip.
  const far = plan(walkStory(input(line(A, at(5000, 0), 0, 3), [])));
  assert.ok(Math.max(...legs(far).map((l) => l.t1 - l.t0)) <= R.glide + R.zip);
  // Standing ten minutes more at the stop changes nothing.
  const { fixes, photo, note } = sampleWalk();
  const longer = [...fixes.filter((f) => f.t <= photo.t), ...stand(B, photo.t, 30 * MIN), ...fixes.filter((f) => f.t > photo.t).map((f) => ({ ...f, t: f.t + 30 * MIN }))];
  const a = plan(walkStory(input(fixes, [photo, note])));
  const b = plan(walkStory(input(longer, [photo, { ...note, t: note.t + 30 * MIN }])));
  assert.equal(a.total, b.total);
});

/** Metres along the path where the walker is, at a frame. */
function metresOf(p: RhythmPlan, f: Frame): number {
  const path = Object.values(p.story.paths)[0];
  let best = 0, bestD = Infinity;
  path.ps.forEach((pt, i) => {
    const d = f.walker ? distanceM(pt, f.walker) : Infinity;
    if (d < bestD) { bestD = d; best = path.ms[i]; }
  });
  return best;
}

test('RR2: the walker slows into a moment and away from it; a long stretch covers most ground mid-way', () => {
  const short = plan(walkStory(input(line(A, at(300, 0), 0), [cap('text', 215_000, at(300, 0), 'x')])));
  const sl = legs(short)[0];
  const f = (p: RhythmPlan, l: { t0: number; t1: number }, u: number) => metresOf(p, rhythmFrame(p, l.t0 + u * (l.t1 - l.t0)));
  assert.ok(f(short, sl, 0.1) < 0.1 * 300, 'slow away from the start');
  assert.ok(f(short, sl, 0.9) > 0.85 * 300, 'slow into the moment');
  const long = plan(walkStory(input(line(A, at(1500, 0), 0), [cap('text', 1_075_000, at(1500, 0), 'x')])));
  const ll = legs(long)[0];
  assert.ok(f(long, ll, 0.25) / 1500 < f(short, sl, 0.25) / 300, 'a long stretch eases more steeply');
  assert.ok(f(long, ll, 0.75) / 1500 > f(short, sl, 0.75) / 300 - 0.01);
});

test('RR3: the camera pulls back mid-way through a long stretch and not between nearby moments', () => {
  const { story } = sampleWalk();
  const p = plan(story);
  const long = legs(p).find((l) => l.len > 1000)!;
  const mid = rhythmFrame(p, (long.t0 + long.t1) / 2);
  assert.ok(pull(mid) > 1.5 && pull(mid) <= R.zoomOut + 1e-6, `pulled back ${pull(mid)}`);
  assert.ok(pull(rhythmFrame(p, long.t1 - 1)) < 1.05, 'close again at the moment');
  const near = plan(walkStory(input(line(A, at(100, 0), 0), [cap('text', 72_000, at(100, 0), 'x')])));
  const nl = legs(near)[0];
  assert.equal(pull(rhythmFrame(near, (nl.t0 + nl.t1) / 2)), 1);
});

test('RR4: a break in the trace is a cut with "N min later"; the walker never crosses it', () => {
  const { story, bc, dd } = sampleWalk();
  const p = plan(story);
  const cut = p.segs.find((s) => s.k === 'cut')!;
  assert.equal(cut.t1 - cut.t0, R.cut);
  const ends = [bc[bc.length - 1], dd[0]].map((f): LngLat => [f.lon, f.lat]);
  for (let ms = cut.t0; ms < cut.t1; ms += 20) {
    const f = rhythmFrame(p, ms);
    assert.ok(f.walker && Math.min(distanceM(f.walker, ends[0]), distanceM(f.walker, ends[1])) < 1, 'only ever at one side or the other');
    assert.equal(f.line, '20 min later');
  }
  assert.ok(rhythmFrame(p, (cut.t0 + cut.t1) / 2).dim > 0.5, 'the map dims across it');
  assert.equal(rhythmFrame(p, cut.t1 + R.lineAfter + 50).lineOpacity, 0);
});

test('RR4: laterLine says minutes and hours', () => {
  assert.equal(laterLine(43 * MIN), '43 min later');
  assert.equal(laterLine(120 * MIN), '2 h later');
  assert.equal(laterLine(80 * MIN), '1 h 20 min later');
  assert.equal(laterLine(20_000), 'Moments later');
});

test('RR5: a plan over 60 s shrinks to fit, above its floors; memos and videos keep their length', () => {
  const pts: TracePoint[] = [];
  const caps: Faced[] = [];
  let t = 0;
  let x = 0;
  for (let i = 0; i < 40; i++) {
    const seg = line(at(x, 0), at(x + 300, 0), t);
    pts.push(...(i ? seg.slice(1) : seg));
    t = endT(seg);
    x += 300;
    caps.push(cap(i === 20 ? 'voice' : 'photo', t, at(x, 0), i === 20 ? '12000' : null));
    const st = stand(at(x, 0), t, 3 * MIN);
    pts.push(...st);
    t = endT(st);
  }
  const p = plan(walkStory(input(pts, caps)));
  const memoSlot = p.segs.flatMap((s) => (s.k === 'stop' ? s.slots : [])).find((s) => s.capture.kind === 'voice')!;
  assert.equal(memoSlot.t1 - memoSlot.t0, 12000 + R.mediaTail, 'the memo plays in full');
  for (const s of p.segs.flatMap((x) => (x.k === 'stop' ? x.slots : []))) if (s.capture.kind === 'photo') assert.ok(s.t1 - s.t0 >= R.floors.photo - 1);
  for (const l of legs(p)) assert.ok(l.t1 - l.t0 >= R.floors.leg - 1);
  assert.ok(p.total <= R.cap + 12000 + R.mediaTail + 1 || legs(p).every((l) => l.t1 - l.t0 <= R.floors.leg + 1), `plays in ${p.total}`);
  // A short walk is not stretched to fill the cap.
  assert.ok(plan(sampleWalk().story).total < R.cap / 2);
  // A walk that can fit is shrunk to fit, with room left above the floors (audit: the test above can't fit).
  const pts2: TracePoint[] = [];
  const caps2: Faced[] = [];
  let t2 = 0;
  for (let i = 0; i < 20; i++) {
    const seg = line(at(i * 300, 0), at(i * 300 + 300, 0), t2);
    pts2.push(...(i ? seg.slice(1) : seg));
    t2 = endT(seg);
    caps2.push(cap('photo', t2, at(i * 300 + 300, 0)));
    const st = stand(at(i * 300 + 300, 0), t2, 3 * MIN);
    pts2.push(...st);
    t2 = endT(st);
  }
  const fit = plan(walkStory(input(pts2, caps2)));
  assert.ok(fit.total <= R.cap + 1 && fit.total > R.cap - 1000, `fits the cap: ${fit.total} ms`);
  for (const s of fit.segs.flatMap((x) => (x.k === 'stop' ? x.slots : []))) assert.ok(s.t1 - s.t0 > R.floors.photo && s.t1 - s.t0 < R.photo, 'photos shrunk, above their floor');
});

test('RR7: a frame is a function of the time alone, so holding the time holds everything', () => {
  const p = plan(sampleWalk().story);
  const a = rhythmFrame(p, 4200);
  rhythmFrame(p, 9000);
  rhythmFrame(p, 100);
  assert.deepEqual(rhythmFrame(p, 4200), a);
  // Held, or paused by a viewer, the clock stands where it is; let go, it goes on (tend replay 14: the frame alone said nothing of Hold).
  const total = p.total;
  assert.deepEqual(tickClock({ ms: 4200, held: true }, 33, { paused: false, total }), { clock: { ms: 4200, held: true }, end: false });
  assert.deepEqual(tickClock({ ms: 4200, held: false }, 33, { paused: true, total }), { clock: { ms: 4200, held: false }, end: false });
  assert.deepEqual(tickClock({ ms: 4200, held: false }, 33, { paused: false, total }), { clock: { ms: 4233, held: false }, end: false });
});

test('RR8: the clock runs from arrival to leaving at a moment, with the walker between, and through a cut', () => {
  const { story } = sampleWalk();
  const p = plan(story);
  const stop = p.segs.find((s) => s.k === 'stop')!;
  assert.ok(stop.k === 'stop');
  assert.ok(Math.abs(rhythmFrame(p, stop.t0).clock! - stop.moment.arrive) < 1000);
  assert.ok(Math.abs(rhythmFrame(p, stop.t1 - 1).clock! - stop.moment.leave) < 1000);
  let prev = -Infinity;
  for (const f of frames(p)) {
    assert.ok(f.clock != null && f.clock >= prev - 1, 'the clock never runs back');
    prev = f.clock;
  }
  const cut = p.segs.find((s) => s.k === 'cut')!;
  const c0 = rhythmFrame(p, cut.t0 + 10).clock!;
  const c1 = rhythmFrame(p, cut.t1 - 10).clock!;
  assert.ok(c1 - c0 > 18 * MIN, 'it rolls through the gap');
  assert.equal(rhythmFrame(p, p.total).clock, null, 'gone at the card');
});

test('RR9: notes enter as the walker arrives, at most three, each out after 9 s or when pushed', () => {
  const pts: TracePoint[] = [];
  const caps: Faced[] = [];
  let t = 0;
  for (let i = 0; i < 6; i++) {
    const seg = line(at(i * 200, 0), at(i * 200 + 200, 0), t);
    pts.push(...(i ? seg.slice(1) : seg));
    t = endT(seg);
    caps.push(cap('text', t, at(i * 200 + 200, 0), `Note ${i}`));
  }
  const p = plan(walkStory(input(pts, caps)));
  const stops = p.segs.filter((s) => s.k === 'stop');
  for (const f of frames(p, 25)) {
    const shown = f.overlays.filter((o) => o.kind === 'bubble' && o.exit === 0);
    assert.ok(shown.length <= R.bubbles, `${shown.length} at once`);
  }
  // The first note enters as its stop begins.
  const first = rhythmFrame(p, stops[0].t0 + 1).overlays.find((o) => o.kind === 'bubble');
  assert.ok(first && first.kind === 'bubble' && first.capture.id === caps[0].id);
  // When the fourth arrives, the first is on its way out.
  const fourth = rhythmFrame(p, stops[3].t0 + R.bubbleOut / 2).overlays.find((o) => o.kind === 'bubble' && o.capture.id === caps[0].id);
  // It must still be there, leaving (tend replay 14: `!fourth ||` passed with no bubble at all).
  assert.ok(fourth && fourth.kind === 'bubble' && fourth.exit > 0, 'the first note is on its way out');
  // A lone note leaves after its life.
  // The walk goes on past it, with photos further on, so the plan outlasts the note's life (tend replay 14: the `if` never ran).
  const ab = line(A, B, 0);
  const bc = line(B, C, endT(ab)).slice(1);
  const cd = line(C, D, endT(bc)).slice(1);
  const dd2 = line(D, D2, endT(cd)).slice(1);
  const later = [cap('photo', endT(bc), C), cap('photo', endT(cd), D), cap('photo', endT(dd2), D2)];
  const lone = plan(walkStory(input([...ab, ...bc, ...cd, ...dd2], [cap('text', endT(ab), B, 'Alone'), ...later])));
  const st = lone.segs.find((s) => s.k === 'stop')!;
  const until = st.t0 + R.bubbleLife + R.bubbleOut + 10;
  assert.ok(until < lone.total, `the walk outlasts the note (${until} of ${lone.total} ms)`);
  assert.ok(rhythmFrame(lone, st.t0 + R.bubbleLife - 10).overlays.some((o) => o.kind === 'bubble'), 'there through its life');
  assert.ok(!rhythmFrame(lone, until).overlays.some((o) => o.kind === 'bubble'), 'gone after it');
});

test('RR9: a note\'s pause grows with its words, at most 3 s', () => {
  assert.equal(notePause('Five words in this note'), R.note);
  assert.equal(notePause(Array(22).fill('w').join(' ')), R.note + 2 * R.notePerFive);
  assert.equal(notePause(Array(400).fill('w').join(' ')), R.noteMax);
  assert.equal(notePause(null), R.note);
});

test('RR10: a memo holds the walker for its length, in a bubble', () => {
  const memo = cap('voice', 430_000, B, '6000');
  const p = plan(walkStory(input(line(A, B, 0), [memo])));
  const stop = p.segs.find((s) => s.k === 'stop')!;
  assert.equal(stop.t1 - stop.t0, 6000 + R.mediaTail);
  const mid = rhythmFrame(p, stop.t0 + 3000).overlays.find((o) => o.kind === 'bubble');
  assert.ok(mid && mid.kind === 'bubble' && mid.playing && Math.abs(mid.progress - 0.5) < 0.01);
  assert.ok(!rhythmFrame(p, stop.t0 + 3000).overlays.some((o) => o.kind === 'card'));
});

test('RR11: a photo grows, holds 2.4 s, tucks, and stays in the pile', () => {
  const { story, photo } = sampleWalk();
  const p = plan(story);
  const stop = p.segs.find((s) => s.k === 'stop')!;
  assert.equal(stop.t1 - stop.t0, R.photo);
  const card = (ms: number) => rhythmFrame(p, ms).overlays.find((o) => o.kind === 'card');
  const g = card(stop.t0 + R.grow / 2);
  assert.ok(g && g.kind === 'card' && g.grow > 0 && g.grow < 1 && g.tuck === 0);
  const h = card(stop.t0 + R.photo / 2);
  assert.ok(h && h.kind === 'card' && h.grow === 1 && h.tuck === 0);
  const k = card(stop.t1 - R.tuck / 2);
  assert.ok(k && k.kind === 'card' && k.tuck > 0);
  assert.ok(!card(stop.t1 + 10));
  const pile = rhythmFrame(p, stop.t1 + 10).overlays.find((o) => o.kind === 'pile');
  assert.ok(pile && pile.kind === 'pile' && pile.captures[0].id === photo.id);
  assert.ok(!rhythmFrame(p, stop.t0 + 10).overlays.some((o) => o.kind === 'pile'), 'no pile before anything is in it');
});

test('RR12: a video holds for its length plus the grow and the tuck', () => {
  const video = cap('video', 430_000, B, '5000');
  const p = plan(walkStory(input(line(A, B, 0), [video])));
  const stop = p.segs.find((s) => s.k === 'stop')!;
  assert.equal(stop.t1 - stop.t0, 5000 + R.grow + R.tuck);
  const mid = rhythmFrame(p, stop.t0 + R.grow + 2500).overlays.find((o) => o.kind === 'card');
  assert.ok(mid && mid.kind === 'card' && mid.playing && Math.abs(mid.progress - 0.5) < 0.01);
});

test('RR14: moments taken together play in time order at one stop; a pin appears as the walker arrives', () => {
  const ab = line(A, B, 0);
  const photo = cap('photo', endT(ab) + 1000, B);
  const note = cap('text', endT(ab) + 30_000, B, 'Plums');
  const p = plan(walkStory(input(ab, [note, photo])));
  const stops = p.segs.filter((s) => s.k === 'stop');
  assert.equal(stops.length, 1);
  assert.ok(stops[0].k === 'stop');
  assert.deepEqual(stops[0].slots.map((s) => s.capture.id), [photo.id, note.id]);
  assert.deepEqual(rhythmFrame(p, stops[0].t0 - 1).pins, []);
  assert.deepEqual(rhythmFrame(p, stops[0].t0).pins, [photo.id, note.id]);
});

test('RR15: a passed place whispers as the walker reaches it, without slowing it', () => {
  const ab = line(A, B, 0);
  const note = cap('text', endT(ab), B, 'x');
  const plain = plan(walkStory(input(ab, [note])));
  const passed = plan(walkStory(input(ab, [note], { passed: [{ name: 'Hessian Memorial', generic: false, at: at(300, 30), t: ab[43].t }] })));
  assert.equal(passed.total, plain.total, 'the walker is not slowed');
  const shown = frames(passed, 20).filter((f) => f.overlays.some((o) => o.kind === 'whisper' && o.opacity > 0.9));
  assert.ok(shown.length > 0);
  const w = shown[0].overlays.find((o) => o.kind === 'whisper')!;
  assert.ok(w.kind === 'whisper' && w.text === 'Passed Hessian Memorial without stopping');
  const first = frames(passed, 20).find((f) => f.overlays.some((o) => o.kind === 'whisper'))!;
  assert.ok(first.walker && distanceM(first.walker, at(300, 0)) < 40, 'it comes as the walker reaches the place');
});

test('RP19: a replay past many places whispers once, as the card says it', () => {
  const ab = line(A, B, 0);
  const note = cap('text', endT(ab), B, 'x');
  const pass = (name: string, i: number) => ({ name, generic: false, at: at(100 + i * 50, 30), t: ab[10 + i * 8].t });
  const many = plan(walkStory(input(ab, [note], { passed: ['Hessian Memorial', 'Moravian Book Shop', 'Sun Inn', 'Kemerer Museum'].map(pass) })));
  assert.deepEqual(many.whispers.map((w) => w.text), ['Passed a few places without stopping'], 'more than two: one whisper, as the card says it');
  const two = plan(walkStory(input(ab, [note], { passed: ['Hessian Memorial', 'Sun Inn'].map(pass) })));
  assert.deepEqual(two.whispers.map((w) => w.text), ['Passed Hessian Memorial without stopping', 'Passed Sun Inn without stopping'], 'one or two: each by name (RR15)');
});

test('remarkable-and-public audit 14: with more than two passes, the one whisper comes at the last pass, when it is true', () => {
  const ab = line(A, B, 0);
  const note = cap('text', endT(ab), B, 'x');
  const pass = (name: string, i: number) => ({ name, generic: false, at: at(100 + i * 50, 30), t: ab[10 + i * 8].t });
  const p = plan(walkStory(input(ab, [note], { passed: ['Hessian Memorial', 'Moravian Book Shop', 'Sun Inn', 'Kemerer Museum'].map(pass) })));
  assert.equal(p.whispers.length, 1);
  const last = pass('Kemerer Museum', 3);
  assert.deepEqual(p.whispers[0].at, last.at, 'at the last passed place');
  const first = frames(p, 20).find((f) => f.overlays.some((o) => o.kind === 'whisper'))!;
  assert.ok(first.walker && distanceM(first.walker, at(250, 0)) < 40, 'it comes as the walker reaches the last one');
});

test('remarkable-and-public audit 9: a day replay bounds each walk\'s passes by that walk\'s card', () => {
  const walks = [9, 11, 13].map((h, i) => {
    const id = `w${i + 1}`;
    const ab = line(A, B, h * 60 * MIN, 1.4, id);
    return input(ab, [cap('text', endT(ab), B, 'x', id)], { id, passed: [{ name: `Place ${i + 1}`, generic: false, at: at(300, 30), t: ab[43].t }] });
  });
  const day: Day = { key: '2026-11-04', entries: walks.map((w) => ({ kind: 'walk' as const, t: w.walk.started_at, walk: w.walk, captures: w.captures })), moments: 3, walks: 3 };
  const p = plan(dayStory(day, new Map(walks.map((w) => [w.walk.id, w]))));
  assert.deepEqual(p.whispers.map((w) => w.text), ['Passed Place 1 without stopping', 'Passed Place 2 without stopping', 'Passed Place 3 without stopping'],
    'each walk passed one place, so each whispers it by name');
});

test('RR16: a day glides between its entries, says how much later, and plays each walk\'s rhythm', () => {
  const morning = cap('photo', 9 * 60 * MIN, at(-500, 0), null, null);
  const ab = line(A, B, 11 * 60 * MIN);
  const walk = input(ab, [cap('text', endT(ab), B, 'Here')]);
  const day: Day = {
    key: '2026-11-04',
    entries: [{ kind: 'moment', t: morning.t, capture: morning }, { kind: 'walk', t: ab[0].t, walk: walk.walk, captures: walk.captures }],
    moments: 2,
    walks: 1,
  };
  const p = plan(dayStory(day, new Map([['w', walk]])));
  const ls = legs(p);
  assert.ok(ls[0].travel, 'a glide from the morning\'s pin to the walk');
  const mid = rhythmFrame(p, (ls[0].t0 + ls[0].t1) / 2);
  assert.equal(mid.line, '2 h later');
  assert.ok(ls[1].move, 'then the walk\'s own path');
  // One pile and one clock for the whole day.
  const end = rhythmFrame(p, p.total - 1);
  assert.ok(end.overlays.some((o) => o.kind === 'pile' && o.captures[0].id === morning.id));
  // A placeless moment is shown where the map is.
  const nowhere = cap('text', 12 * 60 * MIN, null, 'Somewhere', null);
  const p2 = plan(dayStory({ ...day, entries: [...day.entries, { kind: 'moment', t: nowhere.t, capture: nowhere }] }, new Map([['w', walk]])));
  const last = p2.segs.filter((s) => s.k === 'stop').at(-1)!;
  const f = rhythmFrame(p2, last.t0 + 10);
  assert.ok(f.walker && distanceM(f.walker, B) < 1);
});

test('RR18: with reduce motion there is no pull-back and cards fade instead of moving', () => {
  const p = plan(sampleWalk().story, true);
  for (const f of frames(p, 100)) {
    assert.equal(pull(f), 1);
    for (const o of f.overlays) if (o.kind === 'card') assert.equal(o.fade, true);
  }
});

// ---------------------------------------------------------------- ceremonies are views (RR21)

test('RR21: the registry gives the rhythm by default, and any ceremony honouring the interface plays through the same frame contract', () => {
  assert.equal(DEFAULT_CEREMONY, 'rhythm');
  assert.equal(ceremonyFor(undefined).id, 'rhythm');
  assert.equal(ceremonyFor('no such ceremony').id, 'rhythm');
  assert.equal(CEREMONIES.rhythm, rhythm);
  // A stand-in ceremony: every moment in turn, one second each, nothing else.
  const still: Ceremony = {
    id: 'still',
    overlays: ['card'],
    show(story) {
      const steps = storySteps(story).flat();
      return {
        total: steps.length * 1000,
        frame: (ms) => {
          const c = steps[Math.floor(ms / 1000)];
          return {
            done: ms >= steps.length * 1000, walker: null, camera: { center: null, zoom: null }, drawn: {}, pins: c ? [c.id] : [],
            dim: 0, clock: c?.t ?? null, line: null, lineOpacity: 0,
            overlays: c ? [{ kind: 'card', key: c.id, capture: c, from: null, grow: 1, tuck: 0, playing: false, progress: 0, fade: true }] : [],
          };
        },
      };
    },
  };
  const sw = sampleWalk();
  const showing = still.show(sw.story, { reduceMotion: false });
  assert.equal(showing.total, 2000);
  assert.equal(showing.frame(1500).overlays[0].kind, 'card');
  // What it shows comes from the app's story, in the walk's order: the photo, then the note (tend replay 14: the
  // stand-in asserted only its own shape).
  const { photo, note } = sw;
  assert.deepEqual([showing.frame(500).pins, showing.frame(1500).pins], [[photo.id], [note.id]]);
  assert.equal(showing.frame(2000).done, true);
});

test('RR21: every overlay kind a ceremony draws is one the stage knows', () => {
  for (const c of Object.values(CEREMONIES)) {
    for (const k of c.overlays) assert.ok((OVERLAY_KINDS as readonly string[]).includes(k), `${c.id}: ${k}`);
    const { story } = sampleWalk([cap('voice', 430_000, B, '3000'), cap('video', 431_000, B, '3000')], [{ name: 'X', generic: false, at: at(300, 30), t: 200_000 }]);
    const s = c.show(story, { reduceMotion: false });
    for (let ms = 0; ms < s.total; ms += 50) for (const o of s.frame(ms).overlays) assert.ok(c.overlays.includes(o.kind), `${c.id} drew ${o.kind}`);
  }
});

// ---------------------------------------------------------------- audit, round 1

/** How far the camera is pulled back in a frame (1 is the walking zoom). */
const pull = (f: Frame) => (f.camera.zoom == null ? 1 : 2 ** (R.baseZoom - f.camera.zoom));

test('replay-rhythm audit 1: a memo\'s bubble stays until the memo has played', () => {
  const memo = cap('voice', 430_000, B, '30000');
  const p = plan(walkStory(input(line(A, B, 0), [memo])));
  const stop = p.segs.find((s) => s.k === 'stop')!;
  const late = rhythmFrame(p, stop.t0 + 29_000).overlays.find((o) => o.kind === 'bubble');
  assert.ok(late && late.kind === 'bubble' && late.playing && late.exit === 0, 'still there, still playing, 29 s in');
});

test('replay-rhythm audit 2: the clock ends the ceremony when total is 0 or shrinks below the time', () => {
  assert.equal(tickClock({ ms: 0, held: false }, 33, { paused: false, total: 0 }).end, true, 'nothing to play ends at once');
  assert.equal(tickClock({ ms: 9000, held: false }, 33, { paused: false, total: 5000 }).end, true, 'a plan rebuilt shorter ends');
  assert.equal(tickClock({ ms: 9000, held: false }, 33, { paused: true, total: 5000 }).end, false, 'not while a viewer is open');
  const t = tickClock({ ms: 100, held: false }, 33, { paused: false, total: 5000 });
  assert.deepEqual([t.clock.ms, t.end], [133, false]);
});

test('replay-rhythm audit 5: a stand read as loadReplay reads it is not a cut', () => {
  const ab = line(A, B, 0);
  const raw = [...ab, ...jitterStand(B, endT(ab), 14 * MIN), ...line(B, C, endT(ab) + 14 * MIN + 5000)];
  assert.ok(!walkStory(asLoaded(raw, [])).events.some((e) => e.kind === 'break'), 'a 14-minute stand is no gap');
});

test('replay-rhythm audit 5: a dwell with no moment is not a cut; a pause still is', () => {
  // smoothDwells keeps a 14-minute stand as its two end fixes, 14 minutes apart, at one spot.
  const ab = line(A, B, 0);
  const bc = line(B, C, endT(ab) + 14 * MIN);
  const fixes = [...ab, ...bc];
  const stays = [{ t0: endT(ab), t1: bc[0].t }];
  assert.ok(!walkStory(input(fixes, [], { stays })).events.some((e) => e.kind === 'break'), 'standing is not the app closed');
  assert.ok(walkStory(input(fixes, [])).events.some((e) => e.kind === 'break'), 'with no stay known there, the same hole is a gap');
  const paused = walkStory(input(fixes, [], { stays, pauses: [{ started_at: endT(ab) + MIN, ended_at: endT(ab) + 2 * MIN }] }));
  assert.ok(paused.events.some((e) => e.kind === 'break'), 'a pause is a break, however short (0009)');
  // A real gap, the walker somewhere else when the fixes come back, is still a cut.
  assert.ok(sampleWalk().story.events.some((e) => e.kind === 'break'));
});

test('replay-rhythm audit 6: a long gap between ticks does not advance the ceremony', () => {
  const t = tickClock({ ms: 1000, held: false }, 45_000, { paused: false, total: 20_000 });
  assert.equal(t.end, false, 'a locked screen does not skip to the card');
  assert.ok(t.clock.ms < 1300, `moved ${t.clock.ms - 1000} ms`);
});

test('replay-rhythm audit 9: the walker reaches a stop without a jump', () => {
  const ab = line(A, B, 0);
  const still = stand(B, endT(ab), 5 * MIN);
  const bc = line(B, C, endT(still));
  const off = cap('photo', endT(ab) + 2 * MIN, at(600, 30)); // the capture's own fix 30 m off the trace
  const p = plan(walkStory(input([...ab, ...still, ...bc], [off])));
  const stop = p.segs.find((s) => s.k === 'stop')!;
  const jump = (a: number, b: number) => distanceM(rhythmFrame(p, a).walker!, rhythmFrame(p, b).walker!);
  assert.ok(jump(stop.t0 - 1, stop.t0) < 3, `into the stop: ${jump(stop.t0 - 1, stop.t0).toFixed(1)} m`);
  assert.ok(jump(stop.t1 - 1, stop.t1) < 3, `out of the stop: ${jump(stop.t1 - 1, stop.t1).toFixed(1)} m`);
});

test('replay-rhythm audit 10: the frame carries the camera, the pins by id and a card\'s origin', () => {
  const { story, photo } = sampleWalk();
  const p = plan(story);
  const stop = p.segs.find((s) => s.k === 'stop')!;
  const f = rhythmFrame(p, stop.t0 + R.grow / 2);
  assert.ok(f.camera.center && f.camera.zoom != null && distanceM(f.camera.center, f.walker!) < 1, 'the rhythm follows the walker');
  assert.deepEqual(f.pins, [photo.id]);
  const card = f.overlays.find((o) => o.kind === 'card');
  assert.ok(card && card.kind === 'card' && card.from && distanceM(card.from, B) < 1, 'the card grows from its pin');
});

test('replay-rhythm audit 10: the screens and the stage know no ceremony but through the registry and the frame', () => {
  const root = join(__dirname, '..', '..', '..');
  const files = ['app/replay/[id].tsx', 'app/day/[key].tsx', ...readdirSync(join(root, 'components/ceremony')).map((f) => `components/ceremony/${f}`)];
  for (const f of files) {
    const src = readFileSync(join(root, f), 'utf8');
    assert.doesNotMatch(src, /ceremony\/rhythm|REPLAY_RHYTHM/, `${f} reaches into the rhythm`);
  }
});

test('replay-rhythm audit 11: many cuts still fit the cap', () => {
  const pts: TracePoint[] = [];
  let t = 0;
  for (let i = 0; i < 40; i++) {
    const seg = line(at(i * 400, 0), at(i * 400 + 100, 0), t);
    pts.push(...seg);
    t = endT(seg) + 10 * MIN; // pocketed: the next fixes come 10 min and 300 m on
  }
  const p = plan(walkStory(input(pts, [])));
  assert.ok(p.segs.filter((s) => s.k === 'cut').length >= 39);
  assert.ok(p.total <= R.cap + 1, `plays in ${p.total} ms`);
});

test('replay-rhythm audit 12: reduce motion keeps the timing and holds the camera', () => {
  const { story } = sampleWalk();
  const a = plan(story);
  const b = plan(story, true);
  assert.equal(b.total, a.total, 'the same timing');
  for (const f of frames(b, 100)) assert.equal(pull(f), 1);
});

test('replay-rhythm audit 15: a stretch short of long does not pull the camera back', () => {
  const p = plan(walkStory(input(line(A, at(470, 0), 0), [cap('text', 340_000, at(470, 0), 'x')])));
  const l = legs(p)[0];
  assert.ok(l.len < R.zipAtM, `a ${l.len.toFixed(0)} m stretch`);
  assert.equal(pull(rhythmFrame(p, (l.t0 + l.t1) / 2)), 1);
});

test('replay-rhythm audit 17: a place passed just after a gap whispers once the far side is up', () => {
  const { fixes, photo, note, dd } = sampleWalk();
  const p = plan(walkStory(input(fixes, [photo, note], { passed: [{ name: 'X', generic: false, at: at(920, 1220), t: dd[1].t }] })));
  const cut = p.segs.find((s) => s.k === 'cut')!;
  const first = frames(p, 10).findIndex((f) => f.overlays.some((o) => o.kind === 'whisper'));
  assert.ok(first * 10 >= cut.t1 - 10, `whispered at ${first * 10} ms, the cut ends at ${cut.t1}`);
});

test('replay-rhythm audit 18: the screen reader\'s steps skip a moment gone and end when none is left', () => {
  const a = cap('text', 1, A, 'a');
  const b = cap('text', 2, A, 'b');
  const c = cap('text', 3, B, 'c');
  assert.deepEqual(stepAt([[a, b], [c]], { step: 0, item: 1 }), { step: 0, item: 1 });
  assert.deepEqual(stepAt([[a], [c]], { step: 0, item: 1 }), { step: 1, item: 0 }, 'b deleted: on to c');
  assert.equal(stepAt([[a]], { step: 1, item: 0 }), null, 'c deleted: done');
  assert.equal(stepAt([], { step: 0, item: 0 }), null);
});

test('replay-rhythm audit 19: the stage takes its colours from the theme and the kinds', () => {
  const dir = join(__dirname, '..', '..', '..', 'components', 'ceremony');
  for (const f of readdirSync(dir)) assert.doesNotMatch(readFileSync(join(dir, f), 'utf8'), /['"](#[0-9a-fA-F]{3,8}|rgba?\()/, `${f} has a colour of its own`);
});

// ---------------------------------------------------------------- audit, round 2

/** A stand with GPS jitter, a fix every 5 s, as a phone records it. */
function jitterStand(p: LngLat, t0: number, ms: number): TracePoint[] {
  const out: TracePoint[] = [];
  let k = 0;
  for (let t = t0 + 5000; t <= t0 + ms; t += 5000, k++) {
    const dx = (((k * 7) % 5) - 2) * 3;
    const dy = (((k * 3) % 5) - 2) * 3;
    out.push({ walk_id: 'w', t, lat: p[1] + dy * mLat, lon: p[0] + dx * mLon, accuracy_m: 8, speed: 0, course: null });
  }
  return out;
}
/** A walk's story input read from raw fixes the way loadReplay reads it (readTrace, smoothKept, smoothDwells, dwellsOf). */
function asLoaded(raw: TracePoint[], captures: Faced[], pauses: { started_at: number; ended_at: number | null }[] = []): WalkInput {
  const ps = pauses.map((p) => ({ walk_id: 'w', ...p }));
  const tr = readTrace(raw, raw[0].t, ps, []);
  const walkedFixes = smoothDwells(tr.walked);
  return {
    walk: { id: 'w', started_at: raw[0].t, ended_at: endT(raw), title: null, epilogue: null, open: false, area: null, snapped_build: 'b' },
    fixes: smoothKept(tr), walkedFixes, breaks: tr.breaks, pauses: ps, runs: splitAtGaps(walkedFixes, 60_000, tr.breaks),
    rideRuns: rideRuns(tr), rideTimed: timedRideRuns(tr), captures, passed: [], stays: dwellsOf(tr.walked).map((d) => ({ t0: d.t0, t1: d.t1 })),
  };
}

test('replay-rhythm audit 20: the stage waits for a medium behind its slot, or not done when its slot ends, within bounds', () => {
  const base = { inSlot: true, slotOver: false, started: true, ended: false, behindMs: 0, waitedMs: 0, lenMs: 3000 };
  assert.equal(mediaWait(base), false, 'on time: no wait');
  assert.equal(mediaWait({ ...base, behindMs: 900 }), true, 'started late (muted retry, loading): wait');
  assert.equal(mediaWait({ ...base, inSlot: false, slotOver: true }), true, 'not done at the slot\'s end: wait');
  assert.equal(mediaWait({ ...base, inSlot: false, slotOver: true, ended: true }), false, 'ended: go on');
  assert.equal(mediaWait({ ...base, started: false }), true, 'not started yet: wait a little');
  assert.equal(mediaWait({ ...base, started: false, waitedMs: R.mediaStartWait }), false, 'never starts (sound refused, no tap): go on');
  assert.equal(mediaWait({ ...base, slotOver: true, inSlot: false, waitedMs: R.mediaMaxWait }), false, 'never hangs');
  assert.equal(mediaWait({ ...base, inSlot: false, slotOver: false }), false, 'outside its slot: nothing to wait for');
  assert.equal(mediaWait({ ...base, behindMs: 900, stalledMs: R.mediaStartWait }), false, 'stuck where it is (a file that won\'t play): go on');
});

test('replay-rhythm audit 21: a capture at a run\'s end or inside a pause leaves the break a cut', () => {
  const ab = line(A, B, 0);
  const back = line(B, C, endT(ab) + 20 * MIN);
  const fixes = [...ab, ...back];
  const atEnd = walkStory(input(fixes, [cap('photo', endT(ab), B)]));
  assert.ok(atEnd.events.some((e) => e.kind === 'break'), `at the run's last fix: ${atEnd.events.map((e) => e.kind)}`);
  const inside = walkStory(input(fixes, [cap('photo', endT(ab) + 10 * MIN, B)]));
  assert.ok(inside.events.some((e) => e.kind === 'break'), `inside the gap: ${inside.events.map((e) => e.kind)}`);
  // A pause, with fixes coming on at the same spot after it.
  const still = stand(B, endT(ab), 20 * MIN);
  const paused = walkStory(input([...ab, ...still.filter((f) => f.t > endT(ab) + 20 * MIN - 1), ...line(B, C, endT(ab) + 20 * MIN + 5000)], [cap('photo', endT(ab) + 10 * MIN, B)], { pauses: [{ started_at: endT(ab) + 1000, ended_at: endT(ab) + 20 * MIN - 2000 }] }));
  assert.ok(paused.events.some((e) => e.kind === 'break'), `inside a pause: ${paused.events.map((e) => e.kind)}`);
});

test('replay-rhythm audit 22: deleting a moment behind the walker skips none ahead', () => {
  const ab = line(A, B, 0);
  const c1 = cap('photo', ab[20].t, null);
  const c2 = cap('photo', ab[50].t, null);
  const c3 = cap('photo', ab[80].t, null);
  const before = rhythm.show(walkStory(input(ab, [c1, c2, c3])), { reduceMotion: false });
  // Mid-way through the second photo's card.
  let ms = 0;
  while (!before.frame(ms).overlays.some((o) => o.kind === 'card' && o.capture.id === c2.id)) ms += 20;
  ms += 600;
  const clock = before.frame(ms).clock!;
  const after = rhythm.show(walkStory(input(ab, [c2, c3])), { reduceMotion: false });
  const ms2 = msAtClock(after, clock);
  const f = after.frame(ms2);
  assert.ok(Math.abs(f.clock! - clock) < 2000, `the same time of day (${f.clock! - clock} ms off)`);
  assert.ok(f.overlays.some((o) => o.kind === 'card' && o.capture.id === c2.id), 'the same card up');
  assert.ok(!f.pins.includes(c3.id), 'the moment ahead is still ahead');
});

test('replay-rhythm audit 24: a stand with no moment rolls the clock, never leaps it', () => {
  const ab = line(A, B, 0);
  const sb = jitterStand(B, endT(ab), 7 * MIN);
  const raw = [...ab, ...sb, ...line(B, C, endT(sb) + 5000)];
  const p = plan(walkStory(asLoaded(raw, [])));
  let worst = 0;
  let prev: number | null = null;
  for (let ms = 0; ms < p.total; ms += 33) {
    const c = rhythmFrame(p, ms).clock;
    if (prev != null && c != null) worst = Math.max(worst, c - prev);
    prev = c;
  }
  assert.ok(worst < 2 * MIN, `the clock jumped ${(worst / MIN).toFixed(1)} min in one frame`);
});

test('replay-rhythm audit 25: a frame\'s camera, with or without a zoom, is where the stage projects', () => {
  const ctx: StageCtx = { width: 400, height: 800, insets: { top: 0, bottom: 0, left: 0, right: 0 }, center: A, zoom: 16, held: false, paused: false, reduceMotion: false, open: () => {}, wait: () => {} };
  assert.deepEqual(project(ctx, A)?.map(Math.round), [200, 400], 'the centre is the middle');
  const east = project(ctx, at(100, 0));
  assert.ok(east && east[0] > 240 && Math.abs(east[1] - 400) < 1, '100 m east is to the right');
  assert.equal(project({ ...ctx, zoom: null }, at(100, 0)), null, 'no zoom: nothing is projected, never all to the middle');
  assert.equal(project({ ...ctx, center: null }, at(100, 0)), null);
});

test('replay-rhythm audit 25: both screens name the ceremony they tell with', () => {
  const root = join(__dirname, '..', '..', '..');
  for (const f of ['app/replay/[id].tsx', 'app/day/[key].tsx']) assert.match(readFileSync(join(root, f), 'utf8'), /ceremonyFor\(\s*style\s*\)/, `${f} picks its ceremony by the style parameter`);
});

test('replay-rhythm audit 26: the day card drops a moment deleted during its replay', () => {
  const loose = cap('text', 9 * 60 * MIN, A, 'x', null);
  const ab = line(A, B, 11 * 60 * MIN);
  const inWalk = cap('photo', ab[10].t, null);
  const day: Day = {
    key: '2026-11-04',
    entries: [{ kind: 'moment', t: loose.t, capture: loose }, { kind: 'walk', t: ab[0].t, walk: input(ab, []).walk, captures: [inWalk] }],
    moments: 2,
    walks: 1,
  };
  const less = dayWithout(day, new Set([loose.id, inWalk.id]));
  assert.equal(less.entries.length, 1, 'the loose moment is gone, the walk stays');
  assert.ok(less.entries[0].kind === 'walk' && less.entries[0].captures.length === 0);
  assert.equal(less.moments, 0);
  assert.equal(dayWithout(day, new Set()), day, 'nothing deleted: the same day');
});

// ---------------------------------------------------------------- audit, round 3

test('replay-rhythm audit 30: a capture inside a gap plays at its own place after one cut', () => {
  const B2 = at(600, 500);
  const ab = line(A, B, 0);
  const resume = line(B2, at(900, 500), endT(ab) + 8 * MIN);
  const photo = cap('photo', resume[0].t - 4000, B2);
  const story = walkStory(input([...ab, ...resume], [photo]));
  const p = plan(story);
  const stop = p.segs.find((s) => s.k === 'stop')!;
  const f = rhythmFrame(p, stop.t0 + 100);
  assert.ok(f.walker && distanceM(f.walker, B2) < 5, `the walker is where the photo was taken (${f.walker && distanceM(f.walker, B2).toFixed(0)} m off)`);
  assert.equal(p.segs.filter((s) => s.k === 'cut').length, 1, 'one cut, not "Moments later" after it');
  const cut = p.segs.find((s) => s.k === 'cut')!;
  assert.ok(cut.k === 'cut' && cut.to && distanceM(cut.to, B2) < 5, 'the cut lands at the photo');
});

test('replay-rhythm audit 31: a rebuilt day telling keeps its place inside a loose moment', () => {
  const photo = cap('photo', 9 * 60 * MIN, at(-500, 0), null, null);
  const memo = cap('voice', 12 * 60 * MIN, A, '20000', null);
  const note = cap('text', 15 * 60 * MIN, B, 'Late', null);
  const day = (caps: Faced[]): Day => ({ key: '2026-11-04', entries: caps.map((c) => ({ kind: 'moment', t: c.t, capture: c })), moments: caps.length, walks: 0 });
  const before = rhythm.show(dayStory(day([photo, memo, note]), new Map()), { reduceMotion: false });
  let ms = 0;
  while (!before.frame(ms).overlays.some((o) => o.kind === 'bubble' && o.capture.id === memo.id)) ms += 20;
  ms += 12_000;
  const after = rhythm.show(dayStory(day([memo, note]), new Map()), { reduceMotion: false });
  const b = after.frame(reanchor(before, after, ms)).overlays.find((o) => o.kind === 'bubble' && o.capture.id === memo.id);
  assert.ok(b && b.kind === 'bubble' && Math.abs(b.progress - 0.6) < 0.05, `still 12 s into the memo (${b && b.kind === 'bubble' ? b.progress.toFixed(2) : 'gone'})`);
  // The day's first entry, 1.5 s into its card: a rebuild keeps it there, never back to the intro.
  let m2 = 0;
  while (!before.frame(m2).overlays.some((o) => o.kind === 'card' && o.capture.id === photo.id)) m2 += 20;
  m2 += 1500;
  const less = rhythm.show(dayStory(day([photo, memo]), new Map()), { reduceMotion: false });
  assert.ok(Math.abs(reanchor(before, less, m2) - m2) < 100, 'the same place in the first card');
});

test('replay-rhythm audit 32: a memo paused by hand isn\'t waited for; played again by hand, it is, to its end', () => {
  const base = { stopped: false, inSlot: false, slotOver: true, started: true, ended: false, planMs: 20_000, lenMs: 20_000 };
  let book = { waited: 0, stalled: 0, lastPos: 5000, last: 0 };
  // Standing still where it was paused, while the stage waits: given up after the stall time.
  let w = true;
  for (let t = 100; t <= 2600; t += 100) ({ book, wait: w } = trackWait(book, { ...base, t, pos: 5000 }));
  assert.equal(w, false, 'a player that doesn\'t move is not waited for forever');
  // Played again by hand: it moves, so the stall resets and the stage waits for its end.
  ({ book, wait: w } = trackWait(book, { ...base, t: 2700, pos: 5100 }));
  ({ book, wait: w } = trackWait(book, { ...base, t: 2800, pos: 5200 }));
  assert.equal(w, true, 'waited for again once it plays');
  assert.equal(book.stalled, 0);
});

test('replay-rhythm audit 33: a rebuilt telling is re-anchored before its first frame', () => {
  const ab = line(A, B, 0);
  const old = cap('photo', ab[10].t, null);
  const video = cap('video', ab[60].t, null, '5000');
  const before = rhythm.show(walkStory(input(ab, [old, video])), { reduceMotion: false });
  let ms = 0;
  while (!before.frame(ms).overlays.some((o) => o.kind === 'card' && o.capture.id === video.id)) ms += 20;
  ms += 3500;
  const after = rhythm.show(walkStory(input(ab, [video])), { reduceMotion: false });
  const card = after.frame(reanchor(before, after, ms)).overlays.find((o) => o.kind === 'card' && o.capture.id === video.id);
  assert.ok(card && card.kind === 'card' && card.playing && card.progress > 0.5, 'the same video, still playing, past half way');
});

test('replay-rhythm audit 35: any style, even an object\'s own key, tells with a real ceremony', () => {
  for (const id of ['constructor', '__proto__', 'toString', 'hasOwnProperty', '', 'nope']) {
    const c = ceremonyFor(id);
    assert.equal(c.id, 'rhythm', id);
    assert.equal(typeof c.show, 'function');
  }
});

test('replay-rhythm audit 36: check:affected names the replay journey for the rhythm\'s numbers', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { e2eFor } = require('../../../../scripts/affected.js') as { e2eFor: (c: string[]) => { scenarios: { name: string }[] } };
  for (const f of ['src/lib/motionTokens.ts', 'src/lib/explore/explore.ts', 'src/components/ui.tsx']) {
    assert.ok(e2eFor([f]).scenarios.some((s) => s.name === 'replay'), f);
  }
});
