/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { groupCaptures, nextStop, PATH_MS, schedule, walkTimeAt } from '../../replay';
import type { Capture } from '../../types';
import { at, walkAlong } from '../foxPoint';

// The replay's schedule: the path runs in fixed time, stops at each group of
// captures, and gaps collapse (.claude/rules/replay.md).

test('replay: the path runs in fixed time and stops at each group of captures', () => {
  const trace = walkAlong([at(0, 0), at(3, 0)]);
  const cap = (id: string, t: number, x: number, kind: Capture['kind'] = 'text'): Capture => ({
    id, walk_id: 'w1', t, lat: at(x, 0)[1], lon: at(x, 0)[0], kind, file_path: null, body: kind === 'voice' ? '6000' : 'hi', segment_id: null,
  });
  const caps = [cap('a', 20_000, 0.1), cap('b', 30_000, 0.15, 'voice'), cap('c', 150_000, 2.5)];
  const groups = groupCaptures(caps);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].captures.map((c) => c.id), ['a', 'b'], 'nearby captures share one stop, in order');

  const s = schedule(trace, caps, 0);
  assert.equal(s.movingMs, PATH_MS);
  assert.ok(s.groups[0].atMs < s.groups[1].atMs);
  // The stop comes when the path reaches the group's time, and not before.
  assert.equal(nextStop(s, s.groups[0].atMs - 1, 0), null);
  assert.equal(nextStop(s, s.groups[0].atMs, 0), 0);
  assert.equal(nextStop(s, s.groups[1].atMs + 5, 1), 1);
  assert.equal(nextStop(s, PATH_MS, 2), null, 'nothing left once every group was shown');
  assert.ok(Math.abs(walkTimeAt(s, s.groups[0].atMs) - 20_000) < 1);

  // A two-hour walk's path runs in the same time as a ten-minute one.
  const long = walkAlong([at(0, 0), at(3, 0), at(0, 0), at(3, 0), at(0, 0)]);
  assert.equal(schedule(long, [], 0).movingMs, PATH_MS);
});

test('replay: gaps collapse, so a resumed walk does not crawl across the night', () => {
  const morning = walkAlong([at(0, 0), at(1, 0)]);
  const evening = walkAlong([at(1, 0), at(2, 0)], 'w1', morning.at(-1)!.t + 12 * 3600_000);
  const s = schedule([...morning, ...evening], [], 0);
  let crossed = -1;
  for (let ms = 0; ms <= s.movingMs; ms += 50) {
    if (walkTimeAt(s, ms) >= evening[0].t) { crossed = ms; break; }
  }
  const activeShare = (morning.at(-1)!.t - morning[0].t) / ((morning.at(-1)!.t - morning[0].t) + (evening.at(-1)!.t - evening[0].t));
  assert.ok(Math.abs(crossed / s.movingMs - activeShare) < 0.1, `crossed at ${crossed} ms of ${s.movingMs}`);
});

test('replay: every capture keeps its stop, and an empty walk has no path to run', () => {
  const trace = walkAlong([at(0, 0), at(3, 0)]);
  const many: Capture[] = Array.from({ length: 300 }, (_, i) => ({
    id: String(i), walk_id: 'w1', t: i * 150, lat: null, lon: null, kind: 'photo', file_path: 'x', body: null, segment_id: null,
  }));
  const s = schedule(trace, many, 0);
  assert.equal(s.groups.reduce((n, g) => n + g.captures.length, 0), 300, 'nothing dropped');
  assert.equal(schedule([], [], 0).movingMs, 0);
});

test('replay: a capture after the trace ends stops the path at its end, not after a long stand', () => {
  const trace = walkAlong([at(0, 0), at(3, 0)]);
  const last = trace.at(-1)!.t;
  const late: Capture = {
    id: 'late', walk_id: 'w1', t: last + 40 * 60_000, lat: null, lon: null, kind: 'photo', file_path: 'x', body: null, segment_id: null,
  };
  const s = schedule(trace, [late], 0);
  assert.equal(s.groups[0].atMs, PATH_MS, 'its stop comes as the path ends');
  assert.ok(Math.abs(walkTimeAt(s, PATH_MS / 2) - (trace[0].t + last) / 2) < 6000, 'the walker moves through the trace all the way');
});
