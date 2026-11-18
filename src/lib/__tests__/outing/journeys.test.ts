import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Candidate } from '../../outing/candidates';
import { at, segs } from '../walk-planner/grid';
import { FROM, SHOPS } from './fixtures';

// The one machine (OJ17-OJ19, OJ22, OJ24, OJ43-OJ45, decision 0209): journeys of chapters over areas, with or without a destination.

const BANNED = /\b(best|top|most|popular|rated|fast(er|est)?|short(er|est)?|long(er|est)?|recommended|quick(er|est)?|first|second|third)\b|\d/i;
const spot = (id: string, e: number, n: number, kind: string, unfound = false): Candidate => ({ id, at: at(e, n), facets: { kind: [kind] }, name: id, ...(unfound ? { unfound } : { seen: true }) });
const SPOTS = [spot('h1', 240, 120, 'history'), spot('h2', 480, 120, 'history'), spot('h3', 360, 360, 'culture'), spot('g1', 120, 240, 'parks'), spot('g2', 240, 360, 'viewpoints'), spot('g3', 480, 480, 'parks')];
const ALL = [...SHOPS, ...SPOTS];

async function plan(ids: string[], cands: readonly Candidate[] = ALL, extra: Record<string, unknown> = {}) {
  const { planJourneys } = await import('../../outing/journeys');
  const { CHIPS } = await import('../../outing/chips');
  const { LEANINGS, MIXED } = await import('../../outing/leanings');
  const { legOver } = await import('../../walkPlanner/service');
  const here = { area: { name: null, at: FROM }, from: FROM, cands, leg: legOver(segs) };
  return planJourneys({ areas: [here], origin: FROM, picked: CHIPS.filter((c) => ids.includes(c.id)), leanings: LEANINGS, mixed: MIXED, ceilingM: 3000, toward: false, ...extra });
}
const stops = (j: { chapters: { outing: { stops: Candidate[] } }[] }) => j.chapters.flatMap((c) => c.outing.stops.map((s) => s.id));

test('OJ17: one journey per leaning the chips reach, in the leanings\' fixed order; with one leaning, one journey', async () => {
  const { LEANINGS } = await import('../../outing/leanings');
  const one = await plan(['antiques']);
  assert.deepEqual(one.journeys.map((j) => j.leaning), ['shops']);
  const r = await plan(['parks', 'antiques', 'history', 'books', 'viewpoints', 'culture']);
  assert.deepEqual(r.journeys.map((j) => j.leaning), ['mixed', ...LEANINGS.slice(0, 2).map((l) => l.id)], 'at most three (audit 2)');
});

test('OJ43: chips that span leanings give a mixed journey ahead of the others, holding stops of more than one leaning', async () => {
  const { MIXED } = await import('../../outing/leanings');
  const r = await plan(['antiques', 'history']);
  assert.equal(r.journeys[0].leaning, MIXED.id);
  const dims = new Set(r.journeys[0].chapters.flatMap((c) => c.outing.stops.flatMap((s) => Object.keys(s.facets))));
  assert.deepEqual([...dims].sort(), ['kind', 'what']);
  for (const j of r.journeys.slice(1)) assert.equal(new Set(j.chapters.flatMap((c) => c.outing.stops.flatMap((s) => Object.keys(s.facets)))).size, 1, j.leaning);
});

test('OJ18: a journey is named for its leaning in words, with no rank, number or comparison', async () => {
  const { LEANINGS, MIXED } = await import('../../outing/leanings');
  for (const l of [...LEANINGS, MIXED]) assert.doesNotMatch(l.name, BANNED, l.name);
  const r = await plan(['antiques', 'history', 'parks']);
  for (const j of r.journeys) assert.deepEqual(Object.keys(j).sort(), ['chapters', 'footM', 'leaning', 'name', 'wants']);
});

test('OJ19: the same position, chips and data give the same journeys in the same order', async () => {
  const a = await plan(['antiques', 'history', 'parks']);
  const b = await plan(['parks', 'history', 'antiques'], [...ALL].reverse());
  assert.deepEqual(a.journeys.map((j) => [j.leaning, stops(j)]), b.journeys.map((j) => [j.leaning, stops(j)]));
});

test('OJ22: chips on and nothing to propose gives no journey and one reason', async () => {
  const r = await plan(['history'], SHOPS);
  assert.deepEqual(r.journeys, []);
  assert.deepEqual(r.reasons, ['few']);
  assert.deepEqual((await plan([])).journeys, []);
});

test('OJ24: a place standing alone is a chapter of one stop', async () => {
  const r = await plan(['history'], [spot('h1', 240, 120, 'history')]);
  assert.equal(r.journeys.length, 1);
  assert.deepEqual(stops(r.journeys[0]), ['h1']);
  assert.equal(r.journeys[0].footM, 0);
});

test('OJ44: one machine: several areas give one journey with a chapter in each that has something; toward a place they keep their order', async () => {
  const { planJourneys } = await import('../../outing/journeys');
  const { CHIPS } = await import('../../outing/chips');
  const { LEANINGS, MIXED } = await import('../../outing/leanings');
  const { legOver } = await import('../../walkPlanner/service');
  const leg = legOver(segs);
  const area = (name: string | null, cands: Candidate[]) => ({ area: { name, at: FROM }, from: FROM, cands, leg });
  const areas = [area('Alder', SHOPS), area('Birch', []), area('Cedar', SHOPS.slice(0, 1))];
  const r = planJourneys({ areas, origin: FROM, picked: CHIPS.filter((c) => c.id === 'antiques'), leanings: LEANINGS, mixed: MIXED, ceilingM: 3000, toward: true });
  assert.deepEqual(r.journeys[0].chapters.map((c) => c.area.name), ['Alder', 'Cedar'], 'a town with nothing is not a chapter');
  assert.ok(r.journeys[0].footM > 0);
});

test('OJ42: an attraction not found yet is offered before one that is', async () => {
  const far = [spot('known1', 120, 120, 'history'), spot('known2', 240, 120, 'history'), spot('known3', 120, 240, 'history'), spot('known4', 240, 240, 'history'), spot('new1', 600, 480, 'history', true), spot('new2', 480, 600, 'history', true)];
  const r = await plan(['history'], far);
  const got = stops(r.journeys[0]);
  assert.ok(got.includes('new1') && got.includes('new2'), got.join(','));
});

test('OJ45: "Another like this" plans the same journey from other places, and says when there are no others', async () => {
  const a = await plan(['antiques', 'books']);
  const b = await plan(['antiques', 'books'], ALL, { salts: { shops: 1 } });
  assert.notDeepEqual(stops(a.journeys[0]).sort(), stops(b.journeys[0]).sort());
  const none = await plan(['antiques', 'books'], ALL, { salts: { shops: 9 } });
  assert.deepEqual(none.journeys, []);
});

test('OJ43: a mixed journey whose stops all came from one leaning is not offered beside that leaning\'s own', async () => {
  const r = await plan(['antiques', 'history'], SHOPS);
  assert.deepEqual(r.journeys.map((j) => j.leaning), ['shops']);
});
