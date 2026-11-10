/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rhythmPlan } from '../../ceremony/rhythm';
import { storySteps, walkStory, type WalkInput } from '../../ceremony/story';
import { REPLAY_RHYTHM as R } from '../../motionTokens';
import { faced, type Faced } from '../../moment';
import { timedRuns } from '../../replay';
import type { Capture, LngLat, Moment, TracePoint } from '../../types';
import { at, walkAlong } from '../foxPoint';

// Moment stacks MS17 (decision 0123): a stacked moment is one beat in the replay: one grid of its photos and videos,
// its memos and notes as bubbles, one pile card. Test first: the new fields are reached through casts.

function storyOf(fixes: TracePoint[], captures: Faced[], passed: WalkInput['passed'] = []): WalkInput {
  return {
    walk: { id: 'w1', started_at: fixes[0]?.t ?? 0, ended_at: fixes.at(-1)?.t ?? 0, title: null, epilogue: null, open: false, area: null, snapped_build: null },
    fixes, walkedFixes: fixes, breaks: [], pauses: [], runs: timedRuns(fixes).map((r) => r.map((x) => x.p)), rideRuns: [], rideTimed: [], captures, passed,
  };
}
const trace = walkAlong([at(0, 0), at(4, 0)]);
const t0 = trace[0].t;
const P = (p: LngLat) => ({ lat: p[1], lon: p[0] });
const piece = (id: string, mid: string, t: number, kind: Capture['kind'], body: string | null = null): Capture => ({ id, moment_id: mid, t, kind, file_path: kind === 'text' ? null : `${id}.x`, body });
const stack: Moment = {
  id: 's', walk_id: 'w1', t: t0 + 60_000, ...P(at(1, 0)), segment_id: null,
  pieces: [
    piece('s', 's', t0 + 60_000, 'photo'), piece('s2', 's', t0 + 70_000, 'photo'), piece('s3', 's', t0 + 80_000, 'photo'),
    piece('m1', 's', t0 + 90_000, 'voice', '3000'), piece('m2', 's', t0 + 100_000, 'voice', '2000'), piece('n', 's', t0 + 110_000, 'text', 'a door'),
  ],
};
const lone: Moment = { id: 'l', walk_id: 'w1', t: t0 + 400_000, ...P(at(3, 0)), segment_id: null, pieces: [piece('l', 'l', t0 + 400_000, 'photo')] };
type Card = { capture: Faced; t0: number; t1: number; pieces?: Faced[] };

test('MS17: a stacked moment is one stop with one grid of its photos, held one photo slot after its swipe-ins; memos one after another beside it; one pile card per moment; under the cap', () => {
  const plan = rhythmPlan(walkStory(storyOf(trace, [faced(stack), faced(lone)])), { reduceMotion: false });
  const cards = plan.cards as Card[];
  assert.equal(cards.length, 2, 'one card per moment');
  assert.deepEqual(cards[0].pieces?.map((c) => c.piece_id), ['s', 's2', 's3'], 'the grid holds its photos and videos');
  assert.ok(cards[0].t1 - cards[0].t0 >= R.photo, 'held at least one photo slot');
  const memos = plan.bubbles.filter((b) => b.capture.kind === 'voice');
  assert.equal(memos.length, 2);
  assert.ok(memos[1].ta >= memos[0].ta + memos[0].len, 'the second memo starts once the first has played');
  assert.ok(plan.bubbles.some((b) => b.capture.kind === 'text' && b.capture.body === 'a door'), 'its note is a bubble');
  assert.equal(plan.segs.filter((s) => s.k === 'stop').length, 2, 'one stop for the stack');
  assert.ok(plan.total <= R.cap + 5_000);
});

test('MS17: a stack\'s stop spans its first piece to its last', () => {
  const story = walkStory(storyOf(trace, [faced(stack)]));
  const stop = story.events.find((e) => e.kind === 'moment');
  assert.ok(stop && stop.kind === 'moment' && stop.leave >= t0 + 110_000, `leaves at ${stop && stop.kind === 'moment' ? stop.leave - t0 : '?'} ms`);
});

test('MS17: built through walkStory, a stack and the same pieces apart give the same passed lines in the same order', () => {
  const passed: WalkInput['passed'] = [{ name: 'Old Mill', generic: false, at: at(2, 0), t: t0 + 200_000 }, { name: 'Green Gate', generic: false, at: at(3.5, 0), t: t0 + 450_000 }];
  const apart = stack.pieces.map((p): Moment => ({ ...stack, id: p.id, t: p.t, pieces: [{ ...p, moment_id: p.id }] }));
  const together = rhythmPlan(walkStory(storyOf(trace, [faced(stack), faced(lone)], passed)), { reduceMotion: false });
  const separate = rhythmPlan(walkStory(storyOf(trace, [...apart.map(faced), faced(lone)], passed)), { reduceMotion: false });
  assert.deepEqual(together.whispers.map((w) => w.text), separate.whispers.map((w) => w.text));
});

test('MS17: the screen reader\'s steps go through a stack\'s pieces in capture order, with no position over them', async () => {
  const steps = storySteps(walkStory(storyOf(trace, [faced(stack), faced(lone)])));
  assert.deepEqual(steps[0].map((c) => c.piece_id), ['s', 's2', 's3', 'm1', 'm2', 'n']);
  const { stepPosition } = (await import('../../ceremony/story' + '')) as unknown as { stepPosition(items: Faced[], i: number): string | null };
  assert.equal(stepPosition(steps[0], 1), null, 'no "2 of 6" over a moment\'s pieces');
});
