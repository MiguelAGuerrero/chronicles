import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readJoin } from '../../explore/explore';
import type { LngLat } from '../../types';

// tend explore 15: `exploreRead` handed the read already running to any caller, whatever its centre. A route probe made
// while a fix's read ran was told its own area was read, and the route effect never asked again, so that stretch got no
// faint marks (E22). Only a caller asking for the same centre shares the running read; another waits for it to end, then
// reads its own: still one read at a time (E5).

const fix: LngLat = [-71.4, 41.812];
const probe: LngLat = [-71.39, 41.82];

test('tend explore 15: with no read running, a read starts', () => {
  assert.equal(readJoin(null, fix), 'start');
});

test('tend explore 15: the same centre shares the read already running', () => {
  assert.equal(readJoin(fix, [fix[0], fix[1]]), 'join');
  // The read's own key rounds to five places (about a metre): within it, the same read.
  assert.equal(readJoin(fix, [fix[0] + 0.000001, fix[1]]), 'join');
});

test('tend explore 15: another centre is never told the running read was its own; it waits, then reads', () => {
  assert.equal(readJoin(fix, probe), 'wait');
});
