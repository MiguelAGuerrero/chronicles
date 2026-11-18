/// <reference types="node" />
// Replay pace (specs/replay-pace/spec.md, RY1-RY22; decision 0200), written before the code: what is not built
// yet is reached through casts, so the typecheck holds while each test fails for its own reason.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import * as clockMod from '../../ceremony/clock';
import * as easeMod from '../../ceremony/ease';
import { notePause, rhythmFrame, rhythmPlan, type RhythmPlan, type Slot } from '../../ceremony/rhythm';
import { dayStory, walkStory, type WalkInput } from '../../ceremony/story';
import type { Frame, Story } from '../../ceremony/types';
import type { Day } from '../../days';
import { distanceM, stepToward } from '../../geo';
import { REPLAY_RHYTHM } from '../../motionTokens';
import { faced, facedOf, type Faced } from '../../moment';
import { timedRuns } from '../../replay';
import type { Capture, LngLat, Moment, TracePoint } from '../../types';

/** The rhythm's numbers, the new ones among them. */
const R = REPLAY_RHYTHM as unknown as Record<string, number>;
type Landing = { t0: number; land: number };
type Jump = { from: number; at: number };
const built = <T,>(mod: object, name: string): T => (mod as Record<string, unknown>)[name] as T;
const nextStop = (stops: Landing[], ms: number, aimed: number | null = null) =>
  built<(s: Landing[], ms: number, aimed: number | null) => { ms: number; t0: number } | null>(clockMod, 'nextStop')(stops, ms, aimed);
const seekClock = (c: { ms: number; held: boolean }, ms: number) => built<(c: { ms: number; held: boolean }, ms: number) => { ms: number; held: boolean }>(clockMod, 'seekClock')(c, ms);
const steady = (u: number, a: number, b: number) => built<(u: number, a: number, b: number) => number>(easeMod, 'steady')(u, a, b);
const stopsOf = (p: RhythmPlan) => (p as unknown as { stops: Landing[] }).stops;
const frameAt = (p: RhythmPlan, ms: number, jump?: Jump): Frame => (rhythmFrame as unknown as (p: RhythmPlan, ms: number, jump?: Jump) => Frame)(p, ms, jump);

const O: LngLat = [-71.4, 41.812];
const mLon = 1 / (111320 * Math.cos((O[1] * Math.PI) / 180));
/** x metres east of O. */
const east = (x: number): LngLat => [O[0] + x * mLon, O[1]];
const SPEED = 1.4;
/** When a walker who set off from O at 1.4 m/s is x metres along. */
const when = (x: number) => Math.round((x / SPEED) * 1000);

function line(from: LngLat, to: LngLat, t0: number): TracePoint[] {
  const pts: TracePoint[] = [];
  let pos = from;
  let t = t0;
  pts.push({ walk_id: 'w', t, lat: pos[1], lon: pos[0], accuracy_m: 6, speed: SPEED, course: null });
  while (distanceM(pos, to) > 0.1) {
    pos = stepToward(pos, to, SPEED * 5);
    t += 5000;
    pts.push({ walk_id: 'w', t, lat: pos[1], lon: pos[0], accuracy_m: 6, speed: SPEED, course: null });
  }
  return pts;
}
let ids = 0;
function cap(kind: Faced['kind'], t: number, x: number, body: string | null = null, walkId: string | null = 'w'): Faced {
  const p = east(x);
  return facedOf({ id: `p${++ids}`, walk_id: walkId, t, lat: p[1], lon: p[0], kind, file_path: kind === 'text' ? null : 'x', body, segment_id: null });
}
function input(fixes: TracePoint[], captures: Faced[], o: { passed?: WalkInput['passed']; pauses?: { started_at: number; ended_at: number | null }[] } = {}): WalkInput {
  const pauses = (o.pauses ?? []).map((p) => ({ walk_id: 'w', ...p }));
  return {
    walk: { id: 'w', started_at: fixes[0]?.t ?? 0, ended_at: fixes.at(-1)?.t ?? 0, title: null, epilogue: null, open: false, area: null, snapped_build: 'b' },
    fixes, walkedFixes: fixes, breaks: pauses, pauses,
    runs: timedRuns(fixes, pauses).map((r) => r.map((x) => x.p)),
    rideRuns: [], rideTimed: [], captures, passed: o.passed ?? [], stays: [],
  };
}
/** A walk east from O for `lengthM`, with what was kept along it. */
const walk = (lengthM: number, captures: Faced[], o: Parameters<typeof input>[2] = {}): Story => walkStory(input(line(O, east(lengthM), 0), captures, o));
const plan = (s: Story, reduceMotion = false) => rhythmPlan(s, { reduceMotion });
const stops = (p: RhythmPlan) => p.segs.filter((s): s is Extract<RhythmPlan['segs'][number], { k: 'stop' }> => s.k === 'stop');
const legs = (p: RhythmPlan) => p.segs.filter((s): s is Extract<RhythmPlan['segs'][number], { k: 'leg' }> => s.k === 'leg');
const slotsOf = (p: RhythmPlan): Slot[] => stops(p).flatMap((s) => s.slots);
/** How long a card's picture is fully shown: its slot less growing and shrinking. */
const shown = (s: Slot) => s.t1 - s.t0 - R.grow - R.tuck;
const near = (a: number, b: number, tol = 1) => Math.abs(a - b) <= tol;
const metres = (f: Frame) => distanceM(O, f.walker!);

// ---------------------------------------------------------------- a moment's time

test('RY1: a photo on its own grows 0.55 s, is fully shown 4.5 s and shrinks 0.45 s', { todo: 'test first' }, () => {
  assert.equal(R.grow, 550);
  assert.equal(R.tuck, 450);
  // Two photos 200 m apart: the second is neither the first nor after a long stretch.
  const p = plan(walk(500, [cap('photo', when(200), 200), cap('photo', when(400), 400)]));
  const s = slotsOf(p)[1];
  assert.ok(near(shown(s), 4500), `fully shown ${shown(s)} ms`);
  const card = (ms: number) => frameAt(p, ms).overlays.find((o) => o.kind === 'card');
  const growing = card(s.t0 + 275);
  assert.ok(growing && growing.kind === 'card' && growing.grow > 0 && growing.grow < 1);
  const held = card(s.t0 + 550 + 2250);
  assert.ok(held && held.kind === 'card' && held.grow === 1 && held.tuck === 0);
  const leaving = card(s.t1 - 200);
  assert.ok(leaving && leaving.kind === 'card' && leaving.tuck > 0);
});

test('RY2: the first photo, and one after 550 m with nothing kept, is fully shown a fifth longer', { todo: 'test first' }, () => {
  const p = plan(walk(1300, [cap('photo', when(200), 200), cap('photo', when(400), 400), cap('photo', when(1000), 1000), cap('text', when(1200), 1200, 'x')]));
  const [first, second, afterLong] = slotsOf(p);
  assert.ok(near(shown(first), 5400), `the first: ${shown(first)}`);
  assert.ok(near(shown(second), 4500), `200 m on: ${shown(second)}`);
  assert.ok(near(shown(afterLong), 5400), `after 600 m: ${shown(afterLong)}`);
});

test('RY3: photos at one stop tighten 12% each, never under 55%, the last at full time; a photo you walked to is never shortened', { todo: 'test first' }, () => {
  const at300 = (n: number) => Array.from({ length: n }, (_, i) => cap('photo', when(300) + i * 5000, 300));
  const five = plan(walk(700, [cap('photo', when(100), 100), ...at300(5), cap('photo', when(500), 500)]));
  const s = slotsOf(five);
  assert.equal(stops(five).length, 3, 'five photos 5 s apart are one stop');
  const run = s.slice(1, 6).map(shown);
  assert.ok(near(run[0], 4500) && near(run[1], 4500 * 0.88) && near(run[2], 4500 * 0.88 ** 2) && near(run[3], 4500 * 0.88 ** 3), `tightening: ${run.map(Math.round)}`);
  assert.ok(near(run[4], 4500), 'the last at one stop is at full time');
  assert.ok(near(shown(s[6]), 4500), 'the photo 200 m on is not shortened by the run before it');
  const eight = slotsOf(plan(walk(700, [cap('photo', when(100), 100), ...at300(8)]))).slice(1).map(shown);
  assert.ok(near(eight[6], 4500 * 0.55), `never under 55%: ${Math.round(eight[6])}`);
  const two = slotsOf(plan(walk(700, [cap('photo', when(100), 100), ...at300(2)]))).slice(1).map(shown);
  assert.ok(near(two[0], 4500) && near(two[1], 4500), 'two at one stop are both at full time');
  // A note between them does not start the tightening again.
  const noted = slotsOf(plan(walk(700, [cap('photo', when(100), 100), ...at300(2), cap('text', when(300) + 12_000, 300, 'x'), cap('photo', when(300) + 17_000, 300), cap('photo', when(300) + 22_000, 300)])));
  const pics = noted.filter((x) => x.kind === 'photo').slice(1).map(shown);
  assert.ok(near(pics[2], 4500 * 0.88 ** 2), `the third at the stop: ${Math.round(pics[2])}`);
});

const P = (x: number) => ({ lat: east(x)[1], lon: east(x)[0] });
const piece = (id: string, mid: string, t: number, kind: Capture['kind'], body: string | null = null): Capture => ({ id, moment_id: mid, t, kind, file_path: kind === 'text' ? null : `${id}.x`, body });
const stackOf = (videoMs: number | null): Moment => ({
  id: 's', walk_id: 'w', t: when(300), ...P(300), segment_id: null,
  pieces: [
    piece('s', 's', when(300), 'photo'), piece('s2', 's', when(300) + 4000, 'photo'), piece('s3', 's', when(300) + 8000, 'photo'),
    ...(videoMs ? [piece('s4', 's', when(300) + 12_000, 'video', String(videoMs))] : []),
  ],
});

test('RY4: a grid stays 5 s after its last piece has swiped in, or until a longer video in it ends', { todo: 'test first' }, () => {
  const grid = (m: Moment) => plan(walk(500, [faced(m)])).cards[0];
  const three = grid(stackOf(null));
  assert.ok(three.pieces && three.pieces.length === 3, 'still one grid of its pictures (MS17)');
  assert.ok(near(three.t1 - three.t0, R.grow + 2 * R.gridStagger + R.bubbleIn + 5000 + R.tuck), `three pictures: ${three.t1 - three.t0}`);
  const withVideo = grid(stackOf(9000));
  assert.ok(near(withVideo.t1 - withVideo.t0, R.grow + 3 * R.gridStagger + R.bubbleIn + 9000 + R.tuck), `with a 9 s video: ${withVideo.t1 - withVideo.t0}`);
});

test('RY5: the walker waits at a note 1.2 s for up to six words, a quarter second for each word more, at most 5 s', { todo: 'test first' }, () => {
  const words = (n: number) => Array(n).fill('w').join(' ');
  assert.equal(notePause(words(1)), 1200);
  assert.equal(notePause(words(6)), 1200);
  assert.equal(notePause(words(7)), 1450);
  assert.equal(notePause(words(14)), 3200);
  assert.equal(notePause(words(40)), 5000);
});

test('RY6: the walker stands 1 s after a memo ends, and a video\'s card stands 1 s after it ends', { todo: 'test first' }, () => {
  const p = plan(walk(600, [cap('voice', when(200), 200, '6000'), cap('video', when(400), 400, '5000')]));
  const [memo, video] = slotsOf(p);
  assert.ok(near(memo.t1 - memo.t0, 6000 + 1000), `a memo's stand: ${memo.t1 - memo.t0}`);
  assert.ok(near(video.t1 - video.t0, R.grow + 5000 + 1000 + R.tuck), `a video's card: ${video.t1 - video.t0}`);
  const after = frameAt(p, video.t0 + R.grow + 5000 + 500).overlays.find((o) => o.kind === 'card');
  assert.ok(after && after.kind === 'card' && after.tuck === 0, 'the card is still whole half a second after the video ends');
});

test('RY7: a bubble leaves when the next card opens or a break begins, but a note never before it could be read, and a memo never before it has played', { todo: 'test first' }, () => {
  const bubbleUp = (p: RhythmPlan, id: string, ms: number) => frameAt(p, ms).overlays.some((o) => o.kind === 'bubble' && o.capture.id === id && o.exit === 0);
  // A six-word note, then a photo at the same stop: the card opens after the 1.2 s wait, over the note.
  const note = cap('text', when(300), 300, 'one two three four five six');
  const same = plan(walk(500, [note, cap('photo', when(300) + 5000, 300)]));
  const b = same.bubbles[0];
  const card = same.cards[0];
  assert.ok(near(card.t0 - b.ta, 1200), 'the photo opens after the note\'s wait');
  const read = R.bubbleIn + 1500 + 6 * 300;
  assert.ok(near(b.exitAt, b.ta + read), `it stays its reading time: ${b.exitAt - b.ta} ms`);
  assert.ok(bubbleUp(same, note.id, card.t0 + 500), 'still up over the card');
  // A note with its next card a stop away leaves as that card opens.
  const far = plan(walk(900, [cap('text', when(200), 200, 'x'), cap('photo', when(700), 700)]));
  assert.ok(near(far.bubbles[0].exitAt, far.cards[0].t0), `leaves at the next card: ${far.bubbles[0].exitAt} against ${far.cards[0].t0}`);
  assert.ok(far.bubbles[0].exitAt - far.bubbles[0].ta < R.bubbleLife, 'sooner than its 9 s');
  // A break: the bubble leaves as the cut begins.
  const fixes = [...line(O, east(300), 0), ...line(east(700), east(1000), when(300) + 20 * 60_000)];
  const cutPlan = plan(walkStory(input(fixes, [cap('text', when(250), 250, 'x'), cap('text', when(300) + 20 * 60_000 + when(280), 980, 'y')])));
  const cut = cutPlan.segs.find((s) => s.k === 'cut')!;
  assert.ok(cut && near(cutPlan.bubbles[0].exitAt, Math.max(cut.t0, cutPlan.bubbles[0].ta + R.bubbleIn + 1500 + 300)), 'leaves at the cut, once readable');
  // A memo's bubble stays until it has played, whatever opens.
  const memoPlan = plan(walk(500, [cap('voice', when(300), 300, '8000'), cap('photo', when(300) + 5000, 300)]));
  assert.ok(memoPlan.bubbles[0].exitAt >= memoPlan.bubbles[0].ta + 8000);
});

// ---------------------------------------------------------------- the walker's pace

test('RY8: the walker keeps a steady pace mid-stretch, slows into a moment, and a long stretch is no steeper', { todo: 'test first' }, () => {
  assert.equal(steady(0, 0.2, 0.3), 0);
  assert.ok(near(steady(1, 0.2, 0.3), 1, 1e-9));
  const mid = [0.3, 0.4, 0.5, 0.6].map((u) => steady(u + 0.1, 0.2, 0.3) - steady(u, 0.2, 0.3));
  assert.ok(mid.every((d) => near(d, mid[0], 1e-9)), 'equal ground in equal time between the ramps');
  assert.ok(steady(0.1, 0.2, 0.3) < 0.1 && steady(0.9, 0.2, 0.3) > 0.9, 'slower at both ends');
  const p = plan(walk(1700, [cap('text', when(1500), 1500, 'x')]));
  const l = legs(p)[0];
  const dur = l.t1 - l.t0;
  const m = (u: number) => metres(frameAt(p, l.t0 + u * dur));
  const a = m(0.5) - m(0.4), b = m(0.6) - m(0.5), c = m(0.4) - m(0.3);
  assert.ok(near(a, b, 2) && near(a, c, 2), `steady mid-stretch: ${[c, a, b].map(Math.round)}`);
  const lastHalfSecond = m(1) - m(1 - 500 / dur);
  assert.ok(lastHalfSecond < (a / (0.1 * dur)) * 500 * 0.75, 'slowing over the last half second');
  // The clock rolls with the walker (audit 24).
  const f = frameAt(p, l.t0 + 0.5 * dur);
  assert.ok(near((f.clock! - when(0)) / when(1500), m(0.5) / 1500, 0.03), 'the clock keeps step with the ground covered');
  // No steeper on a long stretch: its fastest is no faster, for its length, than a short one's.
  const short = plan(walk(500, [cap('text', when(300), 300, 'x')]));
  const sl = legs(short)[0];
  const sm = (u: number) => metres(frameAt(short, sl.t0 + u * (sl.t1 - sl.t0)));
  assert.ok((m(0.55) - m(0.45)) / 1500 <= (sm(0.55) - sm(0.45)) / 300 + 1e-6, 'a long stretch is no steeper than a short one');
});

test('RY9: a stretch under 450 m takes up to 2 s, a longer one 2 s plus up to 2 s more', { todo: 'test first' }, () => {
  const legOf = (m: number) => { const l = legs(plan(walk(m + 100, [cap('text', when(m), m, 'x')])))[0]; return { dur: l.t1 - l.t0, len: l.len }; };
  const expected = (len: number) => (len >= 450 ? 2000 + 2000 * Math.max(0.35, Math.min(1, (len - 450) / 1200)) : 2000 * Math.max(0.45, len / 450));
  for (const m of [100, 440, 500, 3000]) {
    const l = legOf(m);
    assert.ok(near(l.dur, expected(l.len), 2), `${m} m: ${Math.round(l.dur)} ms for ${Math.round(l.len)} m`);
  }
  assert.ok(near(legOf(100).dur, 900, 2), 'a very short one is never under 0.45 of 2 s');
  assert.ok(near(legOf(3000).dur, 4000, 2), 'the longest takes 4 s');
});

test('RY10: nothing shrinks to fit a total: forty photos each keep their time, and a short walk is not stretched', { todo: 'test first' }, () => {
  assert.ok(!('cap' in R) && !('floors' in R), 'the cap and its floors are gone');
  const many = plan(walk(4200, Array.from({ length: 40 }, (_, i) => cap('photo', when(100 + i * 100), 100 + i * 100))));
  const s = slotsOf(many);
  assert.equal(s.length, 40);
  assert.ok(s.slice(1).every((x) => near(shown(x), 4500)), 'every photo is fully shown 4.5 s');
  assert.ok(many.total > 200_000, `plays in ${Math.round(many.total / 1000)} s`);
  assert.ok(legs(many).every((l) => near(l.t1 - l.t0, 900, 60)), 'no stretch is squeezed');
  const short = plan(walk(300, [cap('text', when(200), 200, 'x')]));
  assert.ok(near(short.total, short.segs.reduce((n, x) => n + (x.t1 - x.t0), 0)) && short.total < 8000, `a short walk: ${short.total} ms`);
});

test('RY11: with reduce motion every hold, pause and wait is the same length', { todo: 'test first' }, () => {
  const story = walk(1500, [cap('photo', when(200), 200), cap('text', when(200) + 5000, 200, 'a note of seven words or so here'), faced({ ...stackOf(7000), t: when(700), ...P(700) }), cap('voice', when(1200), 1200, '4000')]);
  const a = plan(story), b = plan(story, true);
  assert.ok(a.total > 0 && a.total === b.total);
  assert.deepEqual(a.segs.map((s) => [s.k, s.t0, s.t1]), b.segs.map((s) => [s.k, s.t0, s.t1]));
  assert.deepEqual(a.cards.map((c) => [c.t0, c.t1]), b.cards.map((c) => [c.t0, c.t1]));
  assert.deepEqual(a.bubbles.map((x) => [x.ta, x.exitAt]), b.bubbles.map((x) => [x.ta, x.exitAt]));
  assert.ok(near(shown(slotsOf(b)[0]), 5400), 'the first photo keeps its 5.4 s');
});

// ---------------------------------------------------------------- the next moment

const three = () => plan(walk(1300, [cap('photo', when(300), 300), cap('voice', when(700), 700, '6000'), cap('text', when(1100), 1100, 'the end')]));

test('RY13: a press shows the replay as it would be just before the next moment: the walker arriving, the trace and what was passed', { todo: 'test first' }, () => {
  const p = three();
  const st = stopsOf(p);
  assert.equal(st.length, 3);
  assert.deepEqual(st.map((s) => s.t0), stops(p).map((s) => s.t0));
  const first = nextStop(st, 0)!;
  assert.ok(near(first.ms, st[0].t0 - 450), `lands 0.45 s before the moment: ${st[0].t0 - first.ms}`);
  const second = nextStop(st, stops(p)[0].t0 + 1000)!;
  assert.equal(second.t0, st[1].t0);
  const f = frameAt(p, second.ms);
  assert.ok(Math.abs(metres(f) - 700) < 60, `the walker is arriving at 700 m: ${Math.round(metres(f))}`);
  assert.ok(near(metres(frameAt(p, second.t0)), 700, 25), 'and there when the moment begins');
  assert.ok(f.clock != null && f.clock <= stops(p)[1].moment.arrive + 1, 'the clock is at arriving there');
  assert.ok((f.drawn.w ?? 0) > when(600), 'the trace is drawn up to there');
  assert.ok(f.pins.includes(p.cards[0].capture.id), 'the moment passed over has its pin');
  const pile = f.overlays.find((o) => o.kind === 'pile');
  assert.ok(pile && pile.kind === 'pile' && pile.captures.length === 1, 'and its photo is in the pile');
  // Then it plays as it would have.
  assert.ok(frameAt(p, second.t0 + 400).overlays.some((o) => o.kind === 'bubble' && o.capture.kind === 'voice'));
});

test('RY14: a press never lands inside a memo or a video, and a memo playing when it is pressed is gone on landing', { todo: 'test first' }, () => {
  // A memo, then a moment 45 m on: the stretch between is shorter than the landing's lead.
  const p = plan(walk(900, [cap('voice', when(300), 300, '6000'), cap('video', when(345), 345, '5000'), cap('photo', when(800), 800)]));
  const media = slotsOf(p).filter((s) => s.kind === 'memo' || s.kind === 'video');
  for (const s of stopsOf(p)) for (const m of media) assert.ok(!(s.land > m.t0 && s.land < m.t1), `a landing at ${s.land} is inside a ${m.kind} (${m.t0}-${m.t1})`);
  const memo = p.bubbles[0];
  const from = memo.ta + 2000;
  const to = nextStop(stopsOf(p), from)!;
  const has = (f: Frame) => f.overlays.some((o) => o.kind === 'bubble' && o.capture.id === memo.capture.id);
  assert.ok(has(frameAt(p, from)), 'the memo is up when pressed');
  assert.ok(!has(frameAt(p, to.ms, { from, at: to.ms })), 'and gone on landing, so its sound stops');
  // A day's moments, on a walk or loose, are landings too.
  const morning = cap('photo', 9 * 3_600_000, 0, null, null);
  const evening = cap('voice', 18 * 3_600_000, 4000, '3000', null);
  const day: Day = { key: '2026-11-18', entries: [{ kind: 'moment', t: morning.t, capture: morning }, { kind: 'moment', t: evening.t, capture: evening }], moments: 2, walks: 0 };
  const dp = plan(dayStory(day, new Map()));
  assert.equal(stopsOf(dp).length, 2);
});

test('RY15, RY16: a press keeps the replay held, and moves it whether or not it is waiting', { todo: 'test first' }, () => {
  assert.deepEqual(seekClock({ ms: 500, held: true }, 9000), { ms: 9000, held: true });
  assert.deepEqual(seekClock({ ms: 500, held: false }, 9000), { ms: 9000, held: false });
  // Waiting for a medium holds the tick, never the press.
  const moved = seekClock({ ms: 500, held: false }, 9000);
  assert.equal(clockMod.tickClock(moved, 33, { paused: true, total: 20_000 }).clock.ms, 9000);
});

test('RY17: with no moment ahead there is nowhere to go; one aimed at is not offered twice, and one about to begin is not skipped', { todo: 'test first' }, () => {
  const p = three();
  const st = stopsOf(p);
  assert.equal(nextStop(st, st[2].t0 + 10), null, 'after the last moment has begun');
  assert.equal(nextStop(stopsOf(plan(walk(500, []))), 0), null, 'a walk with nothing kept');
  // Pressed again right after landing: the one after, not the one just aimed at.
  const a = nextStop(st, 0)!;
  const b = nextStop(st, a.ms + 100, a.t0)!;
  assert.equal(b.t0, st[1].t0);
  // Playing by itself and 0.1 s from a moment: a press does not skip that moment, and never goes back.
  const c = nextStop(st, st[0].t0 - 100)!;
  assert.equal(c.t0, st[0].t0);
  assert.ok(c.ms >= st[0].t0 - 100 && c.ms <= st[0].t0);
  assert.equal(nextStop(st, st[2].t0 - 100, st[2].t0), null, 'aimed at the last one: nothing further');
});

test('RY19: both replay screens draw the one next-moment control', { todo: 'test first' }, () => {
  const root = join(__dirname, '..', '..', '..');
  for (const f of ['app/replay/[id].tsx', 'app/day/[key].tsx']) {
    const src = readFileSync(join(root, f), 'utf8');
    assert.match(src, /<NextMoment\b/, `${f} draws it`);
    assert.match(src, /ceremony\/NextMoment'/, `${f} takes it from the stage's folder`);
  }
});

// ---------------------------------------------------------------- the lows stay in

test('RY21: a press never edits out what lay between: a passed place and "N min later" are said on landing', { todo: 'test first' }, () => {
  const fixes = [...line(O, east(600), 0), ...line(east(900), east(1300), when(600) + 43 * 60_000)];
  const story = walkStory(input(fixes, [cap('photo', when(200), 200), cap('photo', when(600) + 43 * 60_000 + when(300), 1200)], { passed: [{ name: 'Hessian Memorial', generic: false, at: east(400), t: when(400) }] }));
  const p = plan(story);
  const from = stopsOf(p)[0].t0 + 500;
  const to = nextStop(stopsOf(p), from)!;
  const jump = { from, at: to.ms };
  assert.equal(frameAt(p, to.ms + 300).line === null || /later/.test(frameAt(p, to.ms + 300).line ?? ''), true);
  const first = frameAt(p, to.ms + 300, jump);
  assert.match(first.line ?? '', /later$/, `says how much later it is: ${first.line}`);
  assert.match(first.line ?? '', /^4\d min later$/, 'the time from where you were to where you land');
  assert.ok(first.lineOpacity > 0.9);
  const lines = new Set<string>();
  for (let ms = to.ms; ms < to.ms + 8000; ms += 100) { const f = frameAt(p, ms, jump); if (f.line && f.lineOpacity > 0.5) lines.add(f.line); }
  assert.ok([...lines].some((l) => l === 'Passed Hessian Memorial without stopping'), `the passed place is said: ${[...lines].join(' | ')}`);
  // Playing by itself, the same times say nothing of the place (it whispered where it was).
  const quiet = new Set<string>();
  for (let ms = to.ms + 2500; ms < to.ms + 8000; ms += 100) { const f = frameAt(p, ms); if (f.line) quiet.add(f.line); }
  assert.ok(![...quiet].some((l) => /^Passed/.test(l)));
});

test('RY22: a whisper never starts while a card is up: it waits until the card has shrunk, then shows its full time', { todo: 'test first' }, () => {
  // Passed while standing at the photo's stop: its time falls inside the stop.
  const p = plan(walk(700, [cap('photo', when(300), 300), cap('text', when(600), 600, 'x')], { passed: [{ name: 'Hessian Memorial', generic: false, at: east(320), t: when(300) + 1000 }] }));
  const card = p.cards[0];
  assert.equal(p.whispers.length, 1);
  const w = p.whispers[0];
  assert.ok(w.tw >= card.t1, `starts once the card has gone: ${w.tw} against ${card.t1}`);
  const up = (ms: number) => frameAt(p, ms).overlays.some((o) => o.kind === 'whisper');
  assert.ok(!up(card.t0 + 1000) && !up(card.t1 - 100), 'not under the card');
  assert.ok(up(w.tw + 300) && up(w.tw + R.whisper - 300), 'then for its full time');
});
