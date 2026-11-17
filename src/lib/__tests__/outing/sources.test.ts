import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { Place } from '../../discovery/types';
import { at, segs } from '../walk-planner/grid';
import { FROM, SHOPS } from './fixtures';

// Attractions as a second source of candidates (OJ36, OJ38, OJ40): Explore's own places, through the same types as a shop.

const place = (name: string, category: Place['category'], e: number, n: number, extra: Partial<Place> = {}): Place =>
  ({ key: `${category}:${name}`, name, category, at: at(e, n), generic: false, build: 'b', markable: true, ...extra });
const PLACES = [place('Old Mill', 'history', 360, 240), place('Creek Park', 'parks', 480, 360), place('Corner Cafe', 'food', 240, 240), place('Plain Hall', 'history', 600, 120, { markable: false })];

test('OJ38: a place Explore could mark is a candidate with its kind as a facet; food, shops and unmarkable places are not', async () => {
  const { placeCandidates } = await import('../../outing/sources');
  const c = placeCandidates(PLACES, new Set(), new Set());
  assert.deepEqual(c.map((x) => x.name).sort(), ['Creek Park', 'Old Mill']);
  assert.deepEqual(c.find((x) => x.name === 'Old Mill')!.facets, { kind: ['history'] });
});

test('OJ38: a kind switched off in "What I\'m into" gives no candidate', async () => {
  const { placeCandidates } = await import('../../outing/sources');
  const c = placeCandidates([place('Old Mill', 'history', 360, 240, { kind: 'monuments' as Place['kind'] })], new Set(['monuments']) as never, new Set());
  assert.deepEqual(c, []);
});

test('OJ40: a place not yet found keeps its name for arrival; a found one may be named on a tap', async () => {
  const { placeCandidates } = await import('../../outing/sources');
  const c = placeCandidates(PLACES, new Set(), new Set(['parks:Creek Park']));
  assert.equal(c.find((x) => x.name === 'Old Mill')!.unfound, true);
  assert.ok(!c.find((x) => x.name === 'Creek Park')!.unfound);
});

test('OJ38: one journey is planned from shops and attractions together, through the same planner', async () => {
  const { placeCandidates } = await import('../../outing/sources');
  const { CHIPS } = await import('../../outing/chips');
  const { matchesAny } = await import('../../outing/candidates');
  const { planOuting } = await import('../../outing/plan');
  const { legOver } = await import('../../walkPlanner/service');
  const wants = CHIPS.filter((c) => c.id === 'antiques' || c.id === 'history');
  const cands = [...SHOPS, ...placeCandidates(PLACES, new Set(), new Set())];
  const r = planOuting({ cands, match: (c) => matchesAny(wants, c), from: FROM, mode: 'oneway', ceilingM: 3000 }, legOver(segs));
  assert.ok(r.outing);
  const dims = new Set(r.outing!.stops.flatMap((s) => Object.keys(s.facets)));
  assert.deepEqual([...dims].sort(), ['kind', 'what'], 'a shop and an attraction in one proposal');
});

test('OJ38: the planning core still holds no word of a kind of place', () => {
  for (const f of ['candidates', 'pick', 'plan', 'swap', 'dest', 'arrival', 'journeys']) {
    const src = readFileSync(new URL(`../../outing/${f}.ts`, import.meta.url), 'utf8');
    assert.doesNotMatch(src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''), /antiques|books|thrift|vintage|\bshop\b|store|history|parks|viewpoint|\bart\b/i, f);
  }
});

test('OJ36: nothing under outing/ makes a place markable or writes a find', () => {
  for (const f of ['sources', 'chips', 'leanings', 'journeys']) {
    const src = readFileSync(new URL(`../../outing/${f}.ts`, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    assert.doesNotMatch(src, /markable\s*[:=]\s*true|putFind|addFind|saveFind/, f);
  }
});
