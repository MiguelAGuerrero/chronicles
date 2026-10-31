/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { splitTrace, TRACE_CHUNK } from '../../components/map/types';
import type { LngLat } from '../types';

// The live trace is drawn as a history that changes once per chunk, plus a short live tail (perf, Nov 1).

const run = (n: number, x0 = 0): LngLat[] => Array.from({ length: n }, (_, i) => [x0 + i * 1e-5, 41.8]);

test('trace: history and tail together draw every point, joined without a gap', () => {
  const runs = [run(50), run(TRACE_CHUNK * 3 + 17, 1)];
  const { history, tail } = splitTrace(runs);
  const last = runs[1];
  // The finished run is history; the open run is cut at a chunk boundary.
  assert.deepEqual(history[0], runs[0]);
  const cut = history[1];
  assert.equal(cut.length, TRACE_CHUNK * 3 + 1);
  assert.deepEqual(tail[0][0], cut[cut.length - 1], 'the tail starts where history ends');
  assert.equal(cut.length + tail[0].length - 1, last.length);
});

test('trace: history stays the same while the tail grows within a chunk', () => {
  const a = splitTrace([run(TRACE_CHUNK * 2 + 5)]);
  const b = splitTrace([run(TRACE_CHUNK * 2 + 60)]);
  assert.equal(a.historyKey, b.historyKey);
  const c = splitTrace([run(TRACE_CHUNK * 3 + 1)]);
  assert.notEqual(a.historyKey, c.historyKey);
  // A new run (after a pause or gap) moves history too.
  assert.notEqual(splitTrace([run(10), run(5, 1)]).historyKey, splitTrace([run(10)]).historyKey);
  // A short walk is all tail.
  assert.deepEqual(splitTrace([run(30)]).history, []);
});
