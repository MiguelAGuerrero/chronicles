import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Candidate } from '../../outing/candidates';
import { at, segs } from '../walk-planner/grid';
import { FROM, SHOPS } from './fixtures';

// Up to three journeys, one per leaning the picked chips reach (OJ17-OJ19, OJ22).

const TODO = { todo: 'test first' };
const BANNED = /\b(best|top|most|popular|rated|fast(er|est)?|short(er|est)?|long(er|est)?|recommended|quick(er|est)?|first|second|third)\b|\d/i;
const spot = (id: string, e: number, n: number, kind: string): Candidate => ({ id, at: at(e, n), facets: { kind: [kind] }, name: id });
const SPOTS = [spot('h1', 240, 120, 'history'), spot('h2', 480, 120, 'history'), spot('h3', 360, 360, 'culture'), spot('g1', 120, 240, 'parks'), spot('g2', 240, 360, 'viewpoints'), spot('g3', 480, 480, 'parks')];
const ALL = [...SHOPS, ...SPOTS];

async function plan(ids: string[], cands: readonly Candidate[] = ALL) {
  const { planJourneys } = await import('../../outing/journeys');
  const { CHIPS } = await import('../../outing/chips');
  const { LEANINGS } = await import('../../outing/leanings');
  const { legOver } = await import('../../walkPlanner/service');
  return planJourneys({ cands, picked: CHIPS.filter((c) => ids.includes(c.id)), leanings: LEANINGS, from: FROM, ceilingM: 3000 }, legOver(segs));
}

test('OJ17: one journey per leaning the picked chips reach, at most three, in the leanings\' fixed order', TODO, async () => {
  const { LEANINGS } = await import('../../outing/leanings');
  const r = await plan(['parks', 'antiques', 'history', 'books', 'viewpoints', 'culture']);
  assert.equal(r.journeys.length, 3);
  assert.deepEqual(r.journeys.map((j) => j.leaning), LEANINGS.map((l) => l.id));
  const one = await plan(['antiques']);
  assert.equal(one.journeys.length, 1);
});

test('OJ17: a journey holds only stops of its own leaning\'s picked chips', TODO, async () => {
  const r = await plan(['antiques', 'history']);
  for (const j of r.journeys) {
    const dims = new Set(j.outing.stops.flatMap((s) => Object.keys(s.facets)));
    assert.equal(dims.size, 1, j.leaning);
  }
});

test('OJ18: a journey is named for its leaning in words, with no rank, number or comparison', TODO, async () => {
  const { LEANINGS } = await import('../../outing/leanings');
  for (const l of LEANINGS) assert.doesNotMatch(l.name, BANNED, l.name);
  const r = await plan(['antiques', 'history', 'parks']);
  for (const j of r.journeys) assert.deepEqual(Object.keys(j).sort(), ['leaning', 'name', 'outing', 'wants']);
});

test('OJ19: the same position, chips and data give the same journeys in the same order', TODO, async () => {
  const a = await plan(['antiques', 'history', 'parks']);
  const b = await plan(['parks', 'history', 'antiques'], [...ALL].reverse());
  assert.deepEqual(a.journeys.map((j) => [j.leaning, j.outing.stops.map((s) => s.id)]), b.journeys.map((j) => [j.leaning, j.outing.stops.map((s) => s.id)]));
});

test('OJ22: chips on and nothing to propose gives no journey and one reason', TODO, async () => {
  const r = await plan(['history'], SHOPS);
  assert.deepEqual(r.journeys, []);
  assert.deepEqual(r.reasons, ['few']);
  const none = await plan([]);
  assert.deepEqual(none.journeys, []);
});

test('OJ7: a journey is a loop when one can be made, else one way', TODO, async () => {
  const r = await plan(['antiques']);
  assert.equal(typeof r.journeys[0].outing.loop, 'boolean');
});
