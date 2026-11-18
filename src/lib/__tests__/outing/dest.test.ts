import assert from 'node:assert/strict';
import { test } from 'node:test';
import { outingDest } from '../../outing/dest';
import { planOuting } from '../../outing/plan';
import { destFor } from '../../walkPlanner/dest';
import { leg } from '../walk-planner/grid';
import { FROM, SHOPS } from './fixtures';

const ANTIQUES = { what: ['antiques'] } as const;
const plan = (mode: 'loop' | 'oneway') => planOuting({ cands: SHOPS, match: ANTIQUES, from: FROM, mode, ceilingM: 3500 }, leg).outing!;

test('QC22: the destination is an ordinary suggested one: the stops as via, the path followed as planned', () => {
  const o = plan('oneway');
  const d = outingDest(o);
  assert.equal(d.suggested, true);
  assert.deepEqual(d.path, o.path);
  assert.deepEqual(d.via, o.stops.slice(0, -1).map((s) => s.at));
  const same = destFor({ preset: 'middle', stops: o.stops.map((s) => s.at), path: o.path, lengthM: o.lengthM, startM: 0, loop: false, runs: [] });
  const { outing: mark, ...rest } = d;
  assert.equal(mark, true, 'the outing mark');
  assert.deepEqual({ ...rest, label: '' }, { ...same, label: '' }, 'the planner\'s shape');
});

test('QC22: a loop ends where it began and carries its stops', () => {
  const o = plan('loop');
  const d = outingDest(o);
  assert.equal(d.loop, true);
  assert.deepEqual(d.at, o.path[0]);
  assert.deepEqual(d.via, o.stops.map((s) => s.at));
});

test('QC24: no stop name is in the destination, however it is serialised', () => {
  const o = plan('oneway');
  const json = JSON.stringify(outingDest(o));
  for (const s of o.stops) assert.ok(!json.includes(s.name), s.name);
  assert.doesNotMatch(json, /Shop|antiques|books/i);
});

test('QC23: Walk me back reads no via of the outing', () => {
  const d = outingDest(plan('oneway'));
  assert.ok(d.suggested && d.label.length > 0);
});
