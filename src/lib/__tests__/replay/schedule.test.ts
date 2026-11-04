/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rhythmFrame, rhythmPlan } from '../../ceremony/rhythm';
import { walkStory, type WalkInput } from '../../ceremony/story';
import { distanceM } from '../../geo';
import { groupCaptures, timedRuns } from '../../replay';
import type { Capture, LngLat, TracePoint } from '../../types';
import { at, walkAlong } from '../foxPoint';

// The replay's stops and its rhythm over a walk: nearby captures share a stop, gaps collapse, every
// capture keeps its stop (.claude/rules/replay.md; replay rhythm RR4).

/** A walk's story input from bare fixes and captures. */
function storyOf(fixes: TracePoint[], captures: Capture[]): WalkInput {
  return {
    walk: { id: 'w1', started_at: fixes[0]?.t ?? 0, ended_at: fixes.at(-1)?.t ?? 0, title: null, epilogue: null, open: false, area: null, snapped_build: null },
    fixes, walkedFixes: fixes, breaks: [], pauses: [], runs: timedRuns(fixes).map((r) => r.map((x) => x.p)), rideRuns: [], rideTimed: [], captures, passed: [],
  };
}

test('replay: nearby captures share one stop, in order', () => {
  const cap = (id: string, t: number, x: number, kind: Capture['kind'] = 'text'): Capture => ({
    id, walk_id: 'w1', t, lat: at(x, 0)[1], lon: at(x, 0)[0], kind, file_path: null, body: kind === 'voice' ? '6000' : 'hi', segment_id: null,
  });
  const caps = [cap('a', 20_000, 0.1), cap('b', 30_000, 0.15, 'voice'), cap('c', 150_000, 2.5)];
  const groups = groupCaptures(caps);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].captures.map((c) => c.id), ['a', 'b'], 'nearby captures share one stop, in order');
});

test('replay: gaps collapse, so a resumed walk does not crawl across the night (RR4)', () => {
  const morning = walkAlong([at(0, 0), at(1, 0)]);
  const evening = walkAlong([at(1, 0), at(2, 0)], 'w1', morning.at(-1)!.t + 12 * 3600_000);
  const p = rhythmPlan(walkStory(storyOf([...morning, ...evening], [])), { reduceMotion: false });
  const cut = p.segs.find((s) => s.k === 'cut');
  assert.ok(cut, 'the night is a cut');
  assert.equal(rhythmFrame(p, (cut.t0 + cut.t1) / 2).line, '12 h later');
  assert.ok(p.total < 10_000, `plays in ${p.total} ms`);
});

test('replay: every capture keeps its stop, and an empty walk has nothing to play', () => {
  const trace = walkAlong([at(0, 0), at(3, 0)]);
  const many: Capture[] = Array.from({ length: 300 }, (_, i) => ({
    id: String(i), walk_id: 'w1', t: i * 150, lat: null, lon: null, kind: 'photo', file_path: 'x', body: null, segment_id: null,
  }));
  const p = rhythmPlan(walkStory(storyOf(trace, many)), { reduceMotion: false });
  assert.equal(p.segs.reduce((n, s) => n + (s.k === 'stop' ? s.slots.length : 0), 0), 300, 'nothing dropped');
  assert.equal(rhythmPlan(walkStory(storyOf([], [])), { reduceMotion: false }).total, 0);
});

test('replay: a capture after the trace ends stops the path at its end, not after a long stand', () => {
  const trace = walkAlong([at(0, 0), at(3, 0)]);
  const last = trace.at(-1)!.t;
  const late: Capture = {
    id: 'late', walk_id: 'w1', t: last + 40 * 60_000, lat: null, lon: null, kind: 'photo', file_path: 'x', body: null, segment_id: null,
  };
  const p = rhythmPlan(walkStory(storyOf(trace, [late])), { reduceMotion: false });
  const stop = p.segs.find((s) => s.k === 'stop')!;
  const end: LngLat = [trace.at(-1)!.lon, trace.at(-1)!.lat];
  const f = rhythmFrame(p, stop.t0 + 10);
  assert.ok(f.walker && distanceM(f.walker, end) <= 25, 'its stop comes as the path ends (within the standstill radius, where it came to a stand)');
  const leg = p.segs.find((s) => s.k === 'leg')!;
  assert.ok(leg.k === 'leg' && leg.move && leg.move.m1 - leg.move.m0 > 250, 'the walker moves through the trace all the way');
});
