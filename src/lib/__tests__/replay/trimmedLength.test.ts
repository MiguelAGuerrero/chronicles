/// <reference types="node" />
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { gridDuration } from '../../ceremony/grid';
import { rhythmFrame, rhythmPlan } from '../../ceremony/rhythm';
import { walkStory, type WalkInput } from '../../ceremony/story';
import type { MediaEdit } from '../../mediaEdit';
import { REPLAY_RHYTHM as R } from '../../motionTokens';
import { faced, type Faced } from '../../moment';
import { timedRuns } from '../../replay';
import type { Capture, LngLat, Moment, TracePoint } from '../../types';
import { at, walkAlong } from '../foxPoint';

// fix trimmed-length (Nov 18): a trim is data on the untouched file (`edit.trim`), and the players stop at its end
// (VT7, ME15). The replay's plan read the stored whole length (`body`), so a two-minute memo trimmed to 20 s left the
// walker standing for the other 100 s with nothing playing, and a trimmed video held its last frame.

function storyOf(fixes: TracePoint[], captures: Faced[]): WalkInput {
  return {
    walk: { id: 'w1', started_at: fixes[0]?.t ?? 0, ended_at: fixes.at(-1)?.t ?? 0, title: null, epilogue: null, open: false, area: null, snapped_build: null },
    fixes, walkedFixes: fixes, breaks: [], pauses: [], runs: timedRuns(fixes).map((r) => r.map((x) => x.p)), rideRuns: [], rideTimed: [], captures, passed: [],
  };
}
const trace = walkAlong([at(0, 0), at(4, 0)]);
const t0 = trace[0].t;
const P = (p: LngLat) => ({ lat: p[1], lon: p[0] });
const trimmed = (start_ms: number, end_ms: number): MediaEdit => ({ v: 1, rotate: 0, crop: null, filter: 'original', strokes: [], trim: { start_ms, end_ms } });
const piece = (id: string, mid: string, t: number, kind: Capture['kind'], body: string | null = null, edit: MediaEdit | null = null): Capture => ({
  id, moment_id: mid, t, kind, file_path: `${id}.x`, body, edit,
});
const lone = (id: string, kind: Capture['kind'], body: string, edit: MediaEdit | null): Moment => ({
  id, walk_id: 'w1', t: t0 + 60_000, ...P(at(1, 0)), segment_id: null, pieces: [piece(id, id, t0 + 60_000, kind, body, edit)],
});
const planOf = (...moments: Moment[]) => rhythmPlan(walkStory(storyOf(trace, moments.map(faced))), { reduceMotion: false });
const stopOf = (p: ReturnType<typeof planOf>) => {
  const s = p.segs.find((x) => x.k === 'stop');
  assert.ok(s && s.k === 'stop');
  return s;
};

test('fix trimmed-length 1: a trimmed memo\'s slot is its kept span', () => {
  // Two minutes, trimmed to the 20 s from 0:10 to 0:30.
  const p = planOf(lone('m', 'voice', '120000', trimmed(10_000, 30_000)));
  const stop = stopOf(p);
  assert.equal(stop.t1 - stop.t0, 20_000 + R.mediaTail, 'the walker stands for the kept part and the tail, not the two minutes');
  const bubble = (ms: number) => rhythmFrame(p, ms).overlays.find((o) => o.kind === 'bubble');
  const mid = bubble(stop.t0 + 10_000);
  assert.ok(mid && mid.kind === 'bubble' && mid.playing && Math.abs(mid.progress - 0.5) < 0.01, 'half of the kept part is half of the slot');
  // The same memo untrimmed keeps its two minutes.
  const whole = stopOf(planOf(lone('m', 'voice', '120000', null)));
  assert.equal(whole.t1 - whole.t0, 120_000 + R.mediaTail);
});

test('fix trimmed-length 2: a trimmed video\'s card holds for its kept span', () => {
  // Thirty seconds, trimmed to the 5 s from 0:20 to 0:25.
  const p = planOf(lone('v', 'video', '30000', trimmed(20_000, 25_000)));
  const stop = stopOf(p);
  assert.equal(stop.t1 - stop.t0, R.grow + 5000 + R.mediaTail + R.tuck, 'the card is up for the kept part and its moment after (RY6), not the last frame for 25 s more');
  const mid = rhythmFrame(p, stop.t0 + R.grow + 2500).overlays.find((o) => o.kind === 'card');
  assert.ok(mid && mid.kind === 'card' && mid.playing && Math.abs(mid.progress - 0.5) < 0.01, 'half of the kept part is half of the slot');
  // A trim reaching past the stored length keeps no more than there is, and a kept part is never under the shortest slot.
  const past = stopOf(planOf(lone('v', 'video', '4000', trimmed(1000, 9000))));
  assert.equal(past.t1 - past.t0, R.grow + 3000 + R.mediaTail + R.tuck);
  const sliver = stopOf(planOf(lone('v', 'video', '4000', trimmed(1000, 1200))));
  assert.equal(sliver.t1 - sliver.t0, R.grow + R.mediaMin + R.mediaTail + R.tuck);
});

test('fix trimmed-length 3: a stack\'s grid holds for its longest video\'s kept span, and a trimmed memo beside it for its own', () => {
  const stack = (videoEdit: MediaEdit | null): Moment => ({
    id: 's', walk_id: 'w1', t: t0 + 60_000, ...P(at(1, 0)), segment_id: null,
    pieces: [
      piece('s', 's', t0 + 60_000, 'photo'),
      piece('v1', 's', t0 + 70_000, 'video', '30000', videoEdit),
      piece('v2', 's', t0 + 80_000, 'video', '4000'),
      piece('m', 's', t0 + 90_000, 'voice', '120000', trimmed(0, 3000)),
    ],
  });
  const p = planOf(stack(trimmed(20_000, 26_000)));
  const grid = p.cards[0];
  assert.deepEqual(grid.pieces?.map((c) => c.piece_id), ['s', 'v1', 'v2']);
  assert.equal(grid.len, 6000, 'the longest video is the trimmed one\'s kept 6 s, not its stored 30 s');
  assert.equal(grid.t1 - grid.t0, gridDuration(3, 6000));
  const memo = p.bubbles.find((b) => b.capture.piece_id === 'm');
  assert.equal(memo?.len, 3000, 'the memo beside the grid plays its kept 3 s');
  const stop = stopOf(p);
  assert.equal(stop.t1 - stop.t0, gridDuration(3, 6000), 'the stop is the grid\'s length: no minutes of a memo\'s cut part after it');
  // Untrimmed, the same stack holds for the whole 30 s.
  assert.equal(planOf(stack(null)).cards[0].len, 30_000);
});

test('fix trimmed-length 4: the ceremony and its stage read a medium\'s length as its kept span, never from the stored one', () => {
  const root = join(__dirname, '..', '..', '..');
  const files = [...readdirSync(join(root, 'lib/ceremony')).map((f) => `lib/ceremony/${f}`), ...readdirSync(join(root, 'components/ceremony')).map((f) => `components/ceremony/${f}`)];
  for (const f of files) {
    const src = readFileSync(join(root, f), 'utf8');
    assert.ok(!/Number\(\s*[\w.?]*\bbody\s*\)/.test(src), `${f} reads a stored length itself: ask lib/voiceTrim (memoLengthMs) for the kept part`);
  }
});
