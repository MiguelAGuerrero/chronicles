import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceM } from '../../geo';
import { pickStops } from '../../outing/pick';
import { planOuting } from '../../outing/plan';
import { retracedM } from '../../kindWalk/plan';
import { leg } from '../walk-planner/grid';
import { FROM, SHOPS, shop } from './fixtures';

const ANTIQUES = { what: ['antiques'] } as const;
const CEILING = 3500;

test('QC9: the same inputs give the same stops; ties go to the more southern, then western place', { todo: 'test first' }, () => {
  const a = pickStops(SHOPS, ANTIQUES, FROM, CEILING);
  assert.deepEqual(a.map((c) => c.id), pickStops([...SHOPS].reverse(), ANTIQUES, FROM, CEILING).map((c) => c.id));
  const tie = [shop('n', 0, 300, ['antiques']), shop('s', 0, -300, ['antiques']), shop('w', -300, 0, ['antiques']), shop('e', 300, 0, ['antiques'])];
  assert.deepEqual(pickStops(tie, ANTIQUES, FROM, CEILING).map((c) => c.id).slice(0, 2), ['s', 'w']);
});

test('QC9: a field of popularity, rating or anything else on a candidate changes nothing', { todo: 'test first' }, () => {
  const loud = SHOPS.map((c) => ({ ...c, rating: 5, popularity: 99 }));
  assert.deepEqual(pickStops(loud, ANTIQUES, FROM, CEILING).map((c) => c.id), pickStops(SHOPS, ANTIQUES, FROM, CEILING).map((c) => c.id));
});

test('QC7: entries only widen the set; two entries with the second far off still plan', { todo: 'test first' }, () => {
  const only = planOuting({ cands: SHOPS, match: { what: ['antiques', 'books'] }, from: FROM, mode: 'oneway', ceilingM: CEILING }, leg);
  assert.ok(only.outing, 'a proposal');
  assert.ok(only.outing!.stops.every((s) => s.facets.what.some((w) => w === 'antiques' || w === 'books')));
  assert.deepEqual(only.reasons, [], 'nothing is said of an entry that won no stop');
});

test('QC8: two or three stops; fewer than two reachable proposes nothing and says why', { todo: 'test first' }, () => {
  const r = planOuting({ cands: SHOPS, match: ANTIQUES, from: FROM, mode: 'oneway', ceilingM: CEILING }, leg);
  assert.ok(r.outing && r.outing.stops.length >= 2 && r.outing.stops.length <= 3);
  const few = planOuting({ cands: [shop('a1', 360, 120, ['antiques'])], match: ANTIQUES, from: FROM, mode: 'oneway', ceilingM: CEILING }, leg);
  assert.equal(few.outing, null);
  assert.deepEqual(few.reasons, ['few']);
});

test('QC6: one proposal, never several', { todo: 'test first' }, () => {
  const r = planOuting({ cands: SHOPS, match: ANTIQUES, from: FROM, mode: 'loop', ceilingM: CEILING }, leg);
  assert.ok(!Array.isArray(r.outing));
});

test('QC10: the ceiling is hard and the circuit retraces by no more than a tenth', { todo: 'test first' }, () => {
  for (const mode of ['loop', 'oneway'] as const) {
    const r = planOuting({ cands: SHOPS, match: ANTIQUES, from: FROM, mode, ceilingM: CEILING }, leg);
    if (!r.outing) continue;
    assert.ok(r.outing.lengthM <= CEILING, `${mode} within the ceiling`);
    assert.ok(retracedM(r.outing.path) <= 0.1 * r.outing.lengthM + 1, `${mode} retrace`);
  }
  assert.equal(planOuting({ cands: SHOPS, match: ANTIQUES, from: FROM, mode: 'oneway', ceilingM: 200 }, leg).outing, null, 'nothing fits 200 m');
});

test('QC10: a one-way ends at its last stop; a loop ends where it began', { todo: 'test first' }, () => {
  const one = planOuting({ cands: SHOPS, match: ANTIQUES, from: FROM, mode: 'oneway', ceilingM: CEILING }, leg).outing!;
  assert.ok(distanceM(one.path[one.path.length - 1], one.stops[one.stops.length - 1].at) < 5);
  const loop = planOuting({ cands: SHOPS, match: ANTIQUES, from: FROM, mode: 'loop', ceilingM: CEILING }, leg);
  if (loop.outing) assert.ok(distanceM(loop.outing.path[0], loop.outing.path[loop.outing.path.length - 1]) < 5);
  else assert.deepEqual(loop.reasons, ['noLoop']);
});

test('QC20 and QC30: with no position nothing is proposed (no simulation)', { todo: 'test first' }, () => {
  const r = planOuting({ cands: SHOPS, match: ANTIQUES, from: null, mode: 'loop', ceilingM: CEILING }, leg);
  assert.equal(r.outing, null);
  assert.deepEqual(r.reasons, ['noPosition']);
});

test('QC37: a fixture second dimension and a fixture non-shop source plan through the same code', { todo: 'test first' }, () => {
  const how = SHOPS.map((c, i) => ({ ...c, facets: { ...c.facets, how: [i % 2 ? 'thrift' : 'vintage'] } }));
  const r = planOuting({ cands: how, match: { what: ['antiques'], how: ['vintage'] }, from: FROM, mode: 'oneway', ceilingM: CEILING }, leg);
  if (r.outing) assert.ok(r.outing.stops.every((s) => s.facets.how.includes('vintage')));
  const murals = [shop('m1', 240, 120, []), shop('m2', 480, 360, [])].map((c) => ({ ...c, facets: { kind: ['mural'] } }));
  assert.ok(planOuting({ cands: murals, match: { kind: ['mural'] }, from: FROM, mode: 'oneway', ceilingM: CEILING }, leg).outing);
});

test('QC4: adding an entry needs no planner code: a fixture entry plans', { todo: 'test first' }, () => {
  const r = planOuting({ cands: SHOPS, match: { what: ['books'] }, from: FROM, mode: 'oneway', ceilingM: 4000 }, leg);
  assert.ok(r.outing);
});
