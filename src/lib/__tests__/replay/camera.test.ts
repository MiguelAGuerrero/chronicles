/// <reference types="node" />
// Replay ceremony, the camera (specs/replay-ceremony/spec.md, RC11-RC16; decision 0206), written before the code: what
// is not built yet is reached through casts and a guarded load, so the typecheck holds while each test fails for its
// own reason. What the screen shows of it (RC12, RC14) is the `replay` journey's too.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { test } from 'node:test';
import { cardPose, restCenter, type StageCtx } from '../../../components/ceremony/layout';
import { rhythm, rhythmFrame, rhythmPlan, type RhythmPlan } from '../../ceremony/rhythm';
import { dayStory, walkStory, type WalkInput } from '../../ceremony/story';
import type { CardOverlay, CeremonyOptions, Frame, Story } from '../../ceremony/types';
import type { Day } from '../../days';
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
const screenOf = (width: number, height: number, top = 0): Screen => ({ width, height, insets: { top, bottom: 0, left: 0, right: 0 } });
const PHONE = screenOf(390, 844);
type Cam = { center: LngLat | null; zoom: number | null };
const cameraMod = mod('lib/ceremony/camera.ts');
const roomMod = mod('lib/ceremony/room.ts');
const project = (s: Screen, c: Cam, at: LngLat) => built<(s: Screen, c: Cam, at: LngLat) => [number, number] | null>(cameraMod, 'project')(s, c, at);
const pxPerMetre = (zoom: number, lat: number) => built<(z: number, lat: number) => number>(cameraMod, 'pxPerMetre')(zoom, lat);
const cardSize = (s: Screen, pieces = 0) => built<(s: Screen, pieces?: number) => { w: number; h: number }>(roomMod, 'cardSize')(s, pieces);

const O: LngLat = [-71.4, 41.812];
const mLat = 1 / 111320;
const mLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
/** x, y in metres east and north of O. */
const at = (x: number, y = 0): LngLat => [O[0] + x * mLon, O[1] + y * mLat];
const MIN = 60_000;

/** Fixes every 5 s from `from` to `to` at `speed` m/s, starting at t0. */
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
const endT = (pts: TracePoint[]) => pts[pts.length - 1].t;
let ids = 0;
function cap(kind: Faced['kind'], t: number, p: LngLat | null, body: string | null = null, walkId: string | null = 'w'): Faced {
  return facedOf({ id: `k${++ids}`, walk_id: walkId, t, lat: p ? p[1] : null, lon: p ? p[0] : null, kind, file_path: kind === 'text' ? null : 'x', body, segment_id: null });
}
function input(fixes: TracePoint[], captures: Faced[], o: Partial<WalkInput> = {}): WalkInput {
  return {
    walk: { id: 'w', started_at: fixes[0]?.t ?? 0, ended_at: fixes.length ? endT(fixes) : 0, title: null, epilogue: null, open: false, area: null, snapped_build: 'b' },
    fixes, walkedFixes: fixes, breaks: [], pauses: [], runs: timedRuns(fixes, []).map((r) => r.map((x) => x.p)),
    rideRuns: [], rideTimed: [], captures, passed: [], stays: [], ...o,
  };
}
const opts = (screen: Screen, reduceMotion = false) => ({ reduceMotion, screen }) as unknown as CeremonyOptions;
const plan = (s: Story, screen: Screen = PHONE, reduceMotion = false) => rhythmPlan(s, opts(screen, reduceMotion));
type Seg = RhythmPlan['segs'][number];
const legs = (p: RhythmPlan) => p.segs.filter((s): s is Extract<Seg, { k: 'leg' }> => s.k === 'leg');
const stops = (p: RhythmPlan) => p.segs.filter((s): s is Extract<Seg, { k: 'stop' }> => s.k === 'stop');
/** The camera of a frame, there to be read: a centre and a zoom. */
function cam(f: Frame): { center: LngLat; zoom: number } {
  assert.ok(f.camera.center && f.camera.zoom != null, 'the frame says where the camera is');
  return { center: f.camera.center, zoom: f.camera.zoom };
}
/** Where a place is on the screen in a frame. */
const onScreen = (screen: Screen, f: Frame, p: LngLat): [number, number] => project(screen, cam(f), p)!;
const inside = (screen: Screen, p: [number, number]) => p[0] >= 0 && p[0] <= screen.width && p[1] >= 0 && p[1] <= screen.height;
/** How far the camera's centre moved between two frames, in px at the later frame's zoom. */
const moved = (screen: Screen, a: Frame, b: Frame) => {
  const p = project(screen, cam(b), cam(a).center)!;
  return Math.hypot(p[0] - screen.width / 2, p[1] - screen.height / 2);
};
/** The share of the screen's width the walker crosses a second at `ms`: its speed over the ground, at the frame's zoom. */
function crossing(p: RhythmPlan, screen: Screen, ms: number): number {
  const a = rhythmFrame(p, ms - 2);
  const b = rhythmFrame(p, ms + 2);
  const f = rhythmFrame(p, ms);
  return ((distanceM(a.walker!, b.walker!) / 0.004) * pxPerMetre(cam(f).zoom, f.walker![1])) / screen.width;
}

/** A walk east for `lengthM` and a note at its end: one stretch, no card. */
const stretch = (lengthM: number) => {
  const fixes = line(O, at(lengthM), 0);
  return walkStory(input(fixes, [cap('text', endT(fixes), at(lengthM), 'x')]));
};
/** A walk east 120 m to a photo, then north 120 m to a note. */
const photoWalk = () => {
  const ab = line(O, at(120), 0);
  const bc = line(at(120), at(120, 120), endT(ab)).slice(1);
  const photo = cap('photo', endT(ab), at(120));
  return { photo, story: walkStory(input([...ab, ...bc], [photo, cap('text', endT(bc), at(120, 120), 'x')])) };
};

// ---------------------------------------------------------------- the walking zoom (RC11)

test('RC11: the walking zoom is 15, showing twice the ground of 16', () => {
  assert.equal(token('baseZoom'), 15);
  const p = plan(photoWalk().story);
  const stop = stops(p)[0];
  for (const ms of [stop.t0 + 400, (stop.t0 + stop.t1) / 2, stops(p)[1].t0 + 300, p.total - 100]) assert.equal(cam(rhythmFrame(p, ms)).zoom, 15, `zoom at ${ms.toFixed(0)} ms`);
  // A screen 390 px wide shows about 700 m across at 15 where it showed 350 at 16.
  const across = PHONE.width / pxPerMetre(15, O[1]);
  assert.ok(across > 650 && across < 740, `${across.toFixed(0)} m across`);
  assert.ok(Math.abs(across - (2 * PHONE.width) / pxPerMetre(16, O[1])) < 1e-6);
});

// ---------------------------------------------------------------- holding and re-framing (RC12)

test('RC12: the camera holds still while the walker is in the middle of the screen', () => {
  // 100 m east: 56 px at the walking zoom, well inside the middle (0.27 of the width each side).
  const p = plan(stretch(100));
  const leg = legs(p)[0];
  const first = rhythmFrame(p, leg.t0);
  let walked = 0;
  for (let ms = leg.t0; ms < p.total; ms += 20) {
    const f = rhythmFrame(p, ms);
    assert.deepEqual(f.camera, first.camera, `the camera moved at ${ms.toFixed(0)} ms`);
    walked = Math.max(walked, distanceM(first.walker!, f.walker!));
    assert.ok(inside(PHONE, onScreen(PHONE, f, f.walker!)));
  }
  assert.ok(walked > 90, `the walker went ${walked.toFixed(0)} m meanwhile`);
});

test('RC12: when the walker would leave the middle the camera re-frames in 1.2 s with room ahead, and does not move between re-frames', () => {
  assert.equal(token('reframe'), 1200);
  // Leaving a photo: its pin was settled low on the screen, so the walker sets off outside the middle, going north.
  const p = plan(photoWalk().story);
  const leg = legs(p)[1];
  const held = rhythmFrame(p, leg.t0 - 500);
  // Each run of frames in which the camera moves, from the photo's stop to the end.
  const runs: { t0: number; t1: number }[] = [];
  let prev = held;
  for (let ms = leg.t0 - 500; ms < p.total; ms += 10) {
    const f = rhythmFrame(p, ms);
    if (moved(PHONE, prev, f) > 1e-6) {
      const last = runs[runs.length - 1];
      if (last && ms - last.t1 <= 10) last.t1 = ms;
      else runs.push({ t0: ms - 10, t1: ms });
    }
    prev = f;
  }
  assert.equal(runs.length, 1, `the camera moved ${runs.length} times: ${JSON.stringify(runs)}`);
  const [re] = runs;
  assert.ok(Math.abs(re.t1 - re.t0 - 1200) <= 30, `the re-frame took ${re.t1 - re.t0} ms`);
  assert.ok(re.t0 >= leg.t0 - 10 && re.t0 <= leg.t0 + 80, `it began as the walker set off (${(re.t0 - leg.t0).toFixed(0)} ms in)`);
  // Before it and after it, the camera is exactly where it was: nothing drifts.
  assert.deepEqual(rhythmFrame(p, leg.t0 - 10).camera, held.camera);
  assert.deepEqual(rhythmFrame(p, p.total - 50).camera, rhythmFrame(p, re.t1 + 20).camera);
  // Where it ends the walker is back in the middle.
  const after = rhythmFrame(p, re.t1 + 20);
  const w = onScreen(PHONE, after, after.walker!);
  const focus = [PHONE.width / 2, PHONE.height * token('focusY')];
  assert.ok(Math.abs(w[0] - focus[0]) <= PHONE.width * token('holdX') && w[1] - focus[1] <= PHONE.height * token('holdDown') && focus[1] - w[1] <= PHONE.height * token('holdUp'), `the walker is at ${w.map(Math.round)} after it`);
  // And the walker never left the frame while it went.
  for (let ms = re.t0; ms <= re.t1; ms += 20) assert.ok(inside(PHONE, onScreen(PHONE, rhythmFrame(p, ms), rhythmFrame(p, ms).walker!)));
});

test('RC12: a re-frame leaves room ahead of the walker: on a wide screen a long stretch is a hold, a re-frame, a hold', () => {
  // A tablet shows 1.4 km across at the walking zoom: 1200 m east crosses it slowly enough that the camera never rises.
  const tablet = screenOf(820, 1180);
  const p = plan(stretch(1200), tablet);
  const leg = legs(p)[0];
  const focusX = tablet.width / 2;
  const edge = tablet.width * token('holdX');
  let began = -1;
  let ended = -1;
  let prev = rhythmFrame(p, leg.t0);
  for (let ms = leg.t0 + 10; ms < p.total; ms += 10) {
    const f = rhythmFrame(p, ms);
    assert.equal(cam(f).zoom, 15, 'no rise on this screen');
    const going = moved(tablet, prev, f) > 1e-6;
    if (going && began < 0) began = ms - 10;
    if (!going && began >= 0 && ended < 0) ended = ms - 10;
    assert.ok(!(going && ended >= 0), `the camera moved again at ${ms} ms, after its re-frame ended at ${ended}`);
    prev = f;
  }
  assert.ok(began > leg.t0 + 300 && Math.abs(ended - began - 1200) <= 30, `one re-frame, from ${began.toFixed(0)} to ${ended.toFixed(0)} ms (the stretch began at ${leg.t0.toFixed(0)})`);
  // It began as the walker reached the edge of the middle, not before.
  const leaving = onScreen(tablet, rhythmFrame(p, began), rhythmFrame(p, began).walker!);
  assert.ok(leaving[0] - focusX >= edge - 30 && leaving[0] - focusX <= edge + 30, `the walker was ${(leaving[0] - focusX).toFixed(0)} px east of the middle (its edge is at ${edge.toFixed(0)})`);
  // And it ends with the walker behind the middle, going east: more room ahead of it than behind.
  const landed = onScreen(tablet, rhythmFrame(p, ended), rhythmFrame(p, ended).walker!);
  assert.ok(landed[0] < focusX - 40 && landed[0] > focusX - edge, `after the re-frame the walker is at ${landed[0].toFixed(0)}, the middle at ${focusX}`);
});

// ---------------------------------------------------------------- long stretches (RC13)

/** What RC13 asks of every frame of a telling: the walker inside the frame, crossing no more than 0.35 of the width a second. */
function watched(p: RhythmPlan, screen: Screen, step = 20) {
  let fastest = 0;
  let lowest = Infinity;
  for (let ms = 10; ms < p.total - 10; ms += step) {
    const f = rhythmFrame(p, ms);
    if (!f.walker) continue;
    const w = onScreen(screen, f, f.walker);
    assert.ok(inside(screen, w), `the walker is off the screen at ${ms} ms: ${w.map(Math.round)}`);
    lowest = Math.min(lowest, cam(f).zoom);
    const seg = p.segs.find((s) => ms >= s.t0 && ms < s.t1)!;
    // On a stretch: the ground the walker covers, on the screen.
    if (seg.k === 'leg' && ms > seg.t0 + 4 && ms < seg.t1 - 4) fastest = Math.max(fastest, crossing(p, screen, ms));
  }
  return { fastest, lowest };
}

test('RC13: on a long stretch the camera rises just enough that the walker crosses 0.35 of the width a second, and is back down before the next moment', () => {
  assert.equal(token('maxCross'), 0.35);
  // 2 km with nothing kept, then a photo.
  const fixes = line(O, at(2000), 0);
  const photo = cap('photo', endT(fixes), at(2000));
  const p = plan(walkStory(input(fixes, [photo])));
  const leg = legs(p)[0];
  const stop = stops(p)[0];
  const seen = watched(p, PHONE);
  assert.ok(seen.fastest <= 0.35 * 1.01, `the walker crossed ${seen.fastest.toFixed(3)} of the width a second`);
  // Just enough: at its steady pace the walker crosses the 0.35 it may, not less.
  const mid = (leg.t0 + leg.t1) / 2;
  assert.ok(Math.abs(crossing(p, PHONE, mid) - 0.35) < 0.005, `mid-stretch it crosses ${crossing(p, PHONE, mid).toFixed(3)}`);
  assert.ok(seen.lowest < 14.5 && seen.lowest > 12, `it rose to zoom ${seen.lowest.toFixed(2)}`);
  // Back down by the time the walker stops, and it stays down while the card is up.
  for (const ms of [leg.t1 - 1, stop.t0, stop.t0 + 500, stop.t1 - 1]) assert.ok(Math.abs(cam(rhythmFrame(p, ms)).zoom - 15) < 1e-3, `zoom ${cam(rhythmFrame(p, ms)).zoom} at ${ms.toFixed(0)} ms`);
  // A narrower screen rises more: the same ground is more of its width.
  const narrow = watched(plan(walkStory(input(fixes, [photo])), screenOf(320, 568)), screenOf(320, 568));
  assert.ok(narrow.fastest <= 0.35 * 1.01 && narrow.lowest < seen.lowest, `at 320 px: ${narrow.fastest.toFixed(3)}, zoom ${narrow.lowest.toFixed(2)}`);
  // A stretch the walker crosses slowly enough never rises.
  const short = plan(stretch(100));
  for (let ms = legs(short)[0].t0; ms < short.total; ms += 20) assert.equal(cam(rhythmFrame(short, ms)).zoom, 15);
});

test('RC13: on a 20 km ride the walker stays inside the frame and crosses no more than 0.35 of the width a second', () => {
  // 200 m on foot, 20 km at 12 m/s, 200 m on foot and a note: the story's one stretch, told in four seconds.
  const a = line(O, at(200), 0);
  const ride = line(at(200), at(20_200, 3000), endT(a), 12).slice(1);
  const b = line(at(20_200, 3000), at(20_400, 3000), endT(ride)).slice(1);
  const fixes = [...a, ...ride, ...b];
  const walked = [...a, ...b];
  const rideTimed = [[a[a.length - 1], ...ride].map((f) => ({ t: f.t, p: [f.lon, f.lat] as LngLat }))];
  const story = walkStory(input(fixes, [cap('text', endT(b), at(20_400, 3000), 'x')], {
    walkedFixes: walked, breaks: [{ started_at: endT(a), ended_at: endT(ride) }],
    runs: [a, b].map((r) => r.map((f): LngLat => [f.lon, f.lat])), rideTimed, rideRuns: rideTimed.map((r) => r.map((x) => x.p)),
  }));
  for (const screen of [PHONE, screenOf(320, 568), screenOf(844, 390)]) {
    const p = plan(story, screen);
    const leg = legs(p).find((l) => l.len > 19_000)!;
    assert.ok(leg, 'the ride is one stretch');
    const seen = watched(p, screen);
    assert.ok(seen.fastest <= 0.35 * 1.01, `at ${screen.width} px the walker crossed ${seen.fastest.toFixed(3)} of the width a second`);
    assert.ok(seen.lowest < 12, `it rose to zoom ${seen.lowest.toFixed(2)}`);
    assert.ok(Math.abs(cam(rhythmFrame(p, leg.t1)).zoom - 15) < 1e-3, 'and came back down');
  }
});

test('RC13: on a day\'s travel between its entries the walker stays inside the frame', () => {
  // A photo in the morning 80 km away to the north-west, a walk, a note that evening 6 km east.
  const morning = cap('photo', 9 * 60 * MIN, at(-60_000, 52_000), null, null);
  const ab = line(O, at(600), 11 * 60 * MIN);
  const walk = input(ab, [cap('text', endT(ab), at(600), 'Here')]);
  const evening = cap('text', 18 * 60 * MIN, at(6600), 'Late', null);
  const day: Day = {
    key: '2026-11-04',
    entries: [{ kind: 'moment', t: morning.t, capture: morning }, { kind: 'walk', t: ab[0].t, walk: walk.walk, captures: walk.captures }, { kind: 'moment', t: evening.t, capture: evening }],
    moments: 3,
    walks: 1,
  };
  const story = dayStory(day, new Map([['w', walk]]));
  for (const screen of [PHONE, screenOf(320, 568)]) {
    const p = plan(story, screen);
    assert.ok(legs(p).some((l) => l.travel && l.len > 70_000), 'the morning is a long way off');
    const seen = watched(p, screen);
    assert.ok(seen.fastest <= 0.35 * 1.01, `at ${screen.width} px the walker crossed ${seen.fastest.toFixed(3)} of the width a second`);
    assert.ok(seen.lowest < 10, `it rose to zoom ${seen.lowest.toFixed(2)}`);
    for (const s of stops(p)) assert.ok(Math.abs(cam(rhythmFrame(p, s.t0 + 1200)).zoom - 15) < 1e-3, 'down again at each moment');
  }
});

// ---------------------------------------------------------------- the pin under its card (RC14)

/** Where the stage's own card rests on a screen, by the view's arithmetic: its lower edge. */
function cardFootOf(screen: Screen, pieces = 0): number {
  const { w, h } = cardSize(screen, pieces);
  const ctx = { ...screen } as unknown as StageCtx;
  const pose = cardPose({ kind: 'card', key: 'c', capture: cap('photo', 0, O), from: null, grow: 1, tuck: 0, playing: false, progress: 0, fade: false } as CardOverlay, ctx, { center: null, zoom: null }, w, h);
  assert.equal(pose.top, restCenter(ctx, h)[1] - h / 2);
  return pose.top! + h;
}

test('RC14: arriving at a photo the camera settles so that its pin shows just under where the card rests, and stays there while the card is up', () => {
  for (const screen of [PHONE, screenOf(320, 568), screenOf(375, 667, 20)]) {
    const { story, photo } = photoWalk();
    const p = plan(story, screen);
    const stop = stops(p)[0];
    const place: LngLat = [photo.lon!, photo.lat!];
    const foot = cardFootOf(screen);
    // By the time the walker stops, the pin is on its mark; the card then grows from it and rests above it.
    const arrived = rhythmFrame(p, stop.t0);
    const pin = onScreen(screen, arrived, place);
    assert.ok(Math.abs(pin[0] - screen.width / 2) < 1 && Math.abs(pin[1] - (foot + token('pinUnder'))) < 1, `at ${screen.width} px the pin is at ${pin.map(Math.round)}, the card's foot at ${foot.toFixed(0)}`);
    assert.ok(pin[1] > foot && pin[1] < screen.height, 'under the card, on the screen');
    // The pin itself (it stands 44 px tall on its place) shows whole between the card and its place.
    assert.ok(token('pinUnder') >= 44 && token('pinUnder') <= 64);
    for (let ms = stop.t0; ms < stop.t1; ms += 50) assert.deepEqual(rhythmFrame(p, ms).camera, arrived.camera, `the camera moved under the card at ${ms.toFixed(0)} ms`);
    // The card grows from that pin: its origin in the frame is the place the camera settled.
    const card = rhythmFrame(p, stop.t0 + 10).overlays.find((o) => o.kind === 'card');
    assert.ok(card && card.kind === 'card' && card.from && distanceM(card.from, place) < 1);
  }
});

test('RC14: a grid\'s pin, a video\'s, and a moment reached with no stretch before it are settled the same way', () => {
  type Part = { k: string; t0: number; t1: number; at?: LngLat; pieces?: number };
  const cameraTrack = built<(scene: { total: number; parts: Part[]; walker(ms: number): LngLat | null }, screen: Screen, foot: (pieces: number) => number) => unknown>(cameraMod, 'cameraTrack');
  const cameraAt = built<(track: unknown, ms: number) => { center: LngLat; zoom: number }>(cameraMod, 'cameraAt');
  const cardFoot = built<(s: Screen, pieces?: number) => number>(roomMod, 'cardFoot');
  // A moment of four pictures with nothing before it: the grid's card is shorter than a photo's, and its pin higher.
  for (const pieces of [0, 4, 9]) {
    const track = cameraTrack({ total: 6000, parts: [{ k: 'card', t0: 0, t1: 6000, at: at(40, 30), pieces }], walker: () => O }, PHONE, (n) => cardFoot(PHONE, n));
    const foot = cardFootOf(PHONE, pieces);
    assert.ok(Math.abs(cardFoot(PHONE, pieces) - foot) < 1e-6, 'the camera and the stage agree where the card rests');
    const pin = project(PHONE, cameraAt(track, token('settle')), at(40, 30))!;
    assert.ok(Math.abs(pin[0] - PHONE.width / 2) < 1 && Math.abs(pin[1] - (foot + token('pinUnder'))) < 1, `${pieces} pieces: the pin is at ${pin.map(Math.round)}, the card's foot at ${foot.toFixed(0)}`);
    assert.deepEqual(cameraAt(track, 5900), cameraAt(track, token('settle')));
  }
  assert.ok(cardFootOf(PHONE, 4) !== cardFootOf(PHONE, 0) || cardSize(PHONE, 4).h !== cardSize(PHONE, 0).h, 'a grid\'s card is its own size');
  // A video's card: a day's loose video, after the opening alone.
  const video = cap('video', 9 * 60 * MIN, at(300, 200), '4000', null);
  const p = plan(dayStory({ key: '2026-11-04', entries: [{ kind: 'moment', t: video.t, capture: video }], moments: 1, walks: 0 }, new Map()));
  const stop = stops(p)[0];
  const pin = onScreen(PHONE, rhythmFrame(p, stop.t0 + token('settle')), at(300, 200));
  assert.ok(Math.abs(pin[1] - (cardFootOf(PHONE) + token('pinUnder'))) < 1, `the video's pin is at ${pin.map(Math.round)}`);
  // On a landscape phone there is no room under the card: the pin stays on the screen, at its foot.
  const wide = screenOf(844, 390);
  const lp = plan(photoWalk().story, wide);
  const lpin = onScreen(wide, rhythmFrame(lp, stops(lp)[0].t0), at(120));
  assert.ok(lpin[1] <= wide.height - token('edge') + 1 && lpin[1] > wide.height / 2, `in landscape the pin is at ${lpin.map(Math.round)}`);
});

// ---------------------------------------------------------------- flat and north-up (RC15)

test('RC15: the camera is a centre and a zoom, nothing else: flat and north-up throughout', () => {
  const p = plan(photoWalk().story);
  for (let ms = 0; ms <= p.total; ms += 100) assert.deepEqual(Object.keys(rhythmFrame(p, ms).camera).sort(), ['center', 'zoom']);
  // North is up: a place due north of the camera's centre is straight above the middle of the screen.
  const f = rhythmFrame(p, stops(p)[0].t0 + 100);
  const c = cam(f).center;
  const north = onScreen(PHONE, f, [c[0], c[1] + 200 * mLat]);
  assert.ok(Math.abs(north[0] - PHONE.width / 2) < 1e-6 && north[1] < PHONE.height / 2 - 100);
  // Both maps are told so with every frame: no bearing and no pitch survives a replay.
  for (const f of ['components/map/WalkMap.web.tsx', 'components/map/WalkMap.native.tsx']) {
    const src = readFileSync(join(SRC, f), 'utf8');
    const jumps = [...src.matchAll(/jumpTo\(([^;]*)\);/g)].map((m) => m[1]).filter((a) => /zoom == null/.test(a));
    assert.ok(jumps.length >= 1, `${f} has no replay camera`);
    for (const j of jumps) assert.match(j, /FLAT_NORTH_UP/, `${f}: a replay's frame leaves the map's bearing and pitch as they were`);
  }
  assert.deepEqual(built<object>(mod('components/map/types.ts'), 'FLAT_NORTH_UP'), { bearing: 0, pitch: 0 });
});

// ---------------------------------------------------------------- the ceremony's to say (RC16)

test('RC16: where the camera is comes from the story, the time and the screen\'s size alone', () => {
  const { story } = photoWalk();
  const p = plan(story);
  // Held: the same time is the same camera, whatever was asked in between and in whatever order.
  const times = [0, 400, 1300, 2500, 4000, 7000, p.total - 300];
  const first = times.map((ms) => rhythmFrame(p, ms).camera);
  for (const ms of [...times].reverse()) rhythmFrame(p, ms + 123);
  assert.deepEqual(times.map((ms) => rhythmFrame(p, ms).camera), first);
  // After Next: a press changes what is said on landing, never where the camera is at that time.
  const land = p.stops[1].land;
  assert.deepEqual(rhythmFrame(p, land + 200, { from: 1000, at: land }).camera, rhythmFrame(p, land + 200).camera);
  // A telling built again from the same walk for the same screen has the same camera at every time (the captures' ids
  // differ between the two; the camera reads none of them).
  const rebuilt = plan(photoWalk().story);
  for (const ms of times) assert.deepEqual(rhythmFrame(rebuilt, ms).camera, rhythmFrame(p, ms).camera);
  // The screen's size is an input: another screen, another camera (its card rests elsewhere, its middle is narrower).
  const small = plan(story, screenOf(320, 568));
  const stop = stops(p)[0];
  assert.notDeepEqual(rhythmFrame(small, stop.t0 + 100).camera.center, rhythmFrame(p, stop.t0 + 100).camera.center);
  assert.equal(small.total, p.total, 'the timing is the same on any screen');
  // The ceremony takes the screen as an option, and the camera is in its frames.
  const showing = rhythm.show(story, opts(PHONE));
  assert.deepEqual(showing.frame(stop.t0 + 100).camera, rhythmFrame(p, stop.t0 + 100).camera);
  // With reduce motion the map stays still, as before (RC10, RR18).
  const still = plan(story, PHONE, true);
  for (let ms = 0; ms < still.total; ms += 200) assert.deepEqual(rhythmFrame(still, ms).camera, { center: null, zoom: null });
});

test('RC16: the screens hand the ceremony their size and work out no camera themselves', () => {
  for (const f of ['app/replay/[id].tsx', 'app/day/[key].tsx']) {
    const src = readFileSync(join(SRC, f), 'utf8');
    assert.match(src, /\.show\(story, \{ reduceMotion, screen \}\)/, `${f} tells the ceremony its screen`);
    assert.doesNotMatch(src, /ceremony\/camera|cameraAt|cameraTrack/, `${f} works out a camera`);
  }
  // The camera is worked out when the plan is built, never per frame: a frame only reads it.
  const rhythmSrc = readFileSync(join(SRC, 'lib/ceremony/rhythm.ts'), 'utf8');
  const frameFn = rhythmSrc.slice(rhythmSrc.indexOf('export function rhythmFrame'));
  assert.match(frameFn, /cameraAt\(/);
  assert.doesNotMatch(frameFn, /cameraTrack\(/, 'a frame builds the camera');
  const camera = readFileSync(join(SRC, 'lib/ceremony/camera.ts'), 'utf8');
  assert.match(camera, /^\/\/ @layer core/);
  assert.doesNotMatch(camera, /Date\.now|Math\.random|^let |^var /m, 'the camera has a hidden input');
});

// The web map waits to follow the live walk while a hand is on it or north is easing back (`followMoves`). A replay's
// camera is plan data: nothing a hand left behind before the telling began (a touch whose end never arrived) may
// drop its frames, or the map stands still and the dot crosses it alone.
test('RC16: a replay\'s camera frames reach the web map whatever a hand left behind: no follow gate stands before them', () => {
  const src = readFileSync(join(__dirname, '..', '..', '..', 'components/map/WalkMap.web.tsx'), 'utf8');
  const from = src.indexOf('const applyReplay = ');
  assert.ok(from > 0, 'the replay\'s frames have one way in');
  const body = src.slice(from, src.indexOf('\n  };\n', from));
  assert.match(body, /map\.jumpTo\(/, 'it moves the camera');
  const gated = (code: string) => /followMoves\(|pointerDown\.current|northAsked\.current/.test(code);
  assert.ok(!gated(body), 'no follow gate in the replay\'s frames');
  // Shown to fail: the write as it was.
  assert.ok(gated('if (center && followMoves({ following: true, handOnMap: pointerDown.current, northEasing: northAsked.current })) {'));
});
