import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Candidate } from '../../outing/candidates';
import { at, segs } from '../walk-planner/grid';
import { FROM, SHOPS, shop } from './fixtures';

// The audit of Nov 17 (specs/outing-journey, Audit): one regression test per accepted finding that a unit test can hold.

const spot = (id: string, e: number, n: number, kind: string): Candidate => ({ id, at: at(e, n), facets: { kind: [kind] }, name: id });
const SPOTS = [spot('h1', 240, 120, 'history'), spot('h2', 480, 120, 'history'), spot('h3', 360, 360, 'culture'), spot('g1', 120, 240, 'parks'), spot('g2', 240, 360, 'viewpoints'), spot('g3', 480, 480, 'parks')];
const town = (name: string, e: number, n: number) => ({ name, at: at(e, n) });

async function machine() {
  const { planJourneys } = await import('../../outing/journeys');
  const { CHIPS } = await import('../../outing/chips');
  const { LEANINGS, MIXED } = await import('../../outing/leanings');
  const { legOver } = await import('../../walkPlanner/service');
  return { planJourneys, CHIPS, LEANINGS, MIXED, leg: legOver(segs) };
}

test('outing-journey audit 2: chips across three leanings give no more than three journeys, the mixed one among them', async () => {
  const m = await machine();
  const picked = m.CHIPS.filter((c) => ['parks', 'antiques', 'history', 'books', 'viewpoints', 'culture'].includes(c.id));
  const r = m.planJourneys({ areas: [{ area: { name: null, at: FROM }, from: FROM, cands: [...SHOPS, ...SPOTS], leg: m.leg }], origin: FROM, picked, leanings: m.LEANINGS, mixed: m.MIXED, ceilingM: 3000, toward: false });
  assert.equal(r.journeys.length, 3);
  assert.equal(r.journeys[0].leaning, m.MIXED.id);
});

test('outing-journey audit 3: toward a far place the towns read are near the line and spread along the way', async () => {
  const { areasToward } = await import('../../outing/areas');
  const along = Array.from({ length: 60 }, (_, i) => town(`T${i}`, 5000 * (i + 1), 0));
  const sides = [town('SideNorth', 11000, 30000), town('SideSouth', 11000, -61000)];
  const a = areasToward([...sides, ...along], FROM, town('End', 340000, 0), []);
  const names = a.map((x) => x.name);
  assert.ok(!names.includes('SideNorth') && !names.includes('SideSouth'), names.join(','));
  const idx = names.filter((n) => n?.startsWith('T')).map((n) => Number(n!.slice(1)));
  assert.ok(Math.max(...idx) > 40 && Math.min(...idx) < 20, `spread along the way: ${names.join(',')}`);
  assert.equal(names[names.length - 1], 'End');
});

test('outing-journey audit 4: a town within the reach is never dropped because you have been there', async () => {
  const { areasAround } = await import('../../outing/areas');
  const towns = Array.from({ length: 20 }, (_, i) => town(`T${i}`, 3000 * (i + 1), 0));
  const a = areasAround(towns, FROM, 100000, [towns[0], towns[1]]);
  const names = a.map((x) => x.name);
  assert.ok(names.includes('T0') && names.includes('T1'), `the nearest are looked at, walked or not: ${names.join(',')}`);
  assert.ok(names.indexOf('T2') < names.indexOf('T0'), 'and the new ones come before them');
});

test('outing-journey audit 5: planning again over the same read builds its street graph once', async () => {
  const { createOutingService } = await import('../../outing/service');
  const service = createOutingService({ read: async () => ({ shops: [], segments: segs }), stores: null });
  const { CHIPS } = await import('../../outing/chips');
  const session = await service.open(FROM, CHIPS.slice(0, 1));
  assert.equal(service.legFor(session!), service.legFor(session!));
});

test('outing-journey audit 6: a look over several areas reads each outing\'s trace once, and a fresh page reads again', async () => {
  const { createOutingService } = await import('../../outing/service');
  const { CHIPS } = await import('../../outing/chips');
  const log: string[] = [];
  const service = createOutingService({
    read: async () => ({ shops: SHOPS.map((s) => ({ name: s.name, at: s.at, classes: ['antiques'] })), segments: segs }),
    stores: null,
    walked: {
      rows: async () => (log.push('rows'), [{ walk_id: 'w1', lon: FROM[0], lat: FROM[1], last_t: 1 }]),
      trace: async (id) => (log.push(`trace:${id}`), [{ lon: SHOPS[0].at[0], lat: SHOPS[0].at[1] }]),
      rangeM: async () => 100,
    },
  });
  const picked = CHIPS.filter((c) => c.id === 'antiques');
  const a = await service.open(FROM, picked);
  await service.open(at(600, 0), picked);
  assert.deepEqual(log, ['rows', 'trace:w1']);
  assert.deepEqual(service.candidates(a!, true).filter((c) => c.seen).map((c) => c.name), [SHOPS[0].name]);
  service.forget();
  await service.open(FROM, picked);
  assert.deepEqual(log, ['rows', 'trace:w1', 'rows', 'trace:w1']);
});

test('outing-journey audit 9: with no position a named place offers no Start; far, Start with When I get there beside it', async () => {
  const { startChoice } = await import('../../outing/choice');
  assert.equal(startChoice({ origin: null, first: at(500, 0), named: true }), 'later');
  assert.equal(startChoice({ origin: FROM, first: at(500, 0), named: true }), 'start');
  assert.equal(startChoice({ origin: FROM, first: at(5000, 0), named: true }), 'ask');
  assert.equal(startChoice({ origin: FROM, first: at(50000, 0), named: true }), 'ask', 'a session may begin wherever you are (OJ28, decision 0212)');
  assert.equal(startChoice({ origin: FROM, first: FROM, named: false }), 'start');
});

test('outing-journey audit 10: the line beside Start promises nothing the page does not keep', async () => {
  const w = await import('../../outing/journeyWords');
  assert.equal(w.startLine('Emmaus'), 'Start records from here, toward Emmaus.');
  assert.doesNotMatch(w.startLine('Emmaus'), /wait|keep|later|page|begins in/i);
});

test('outing-journey audit 11: another like this keeps a town that has no other places, and ends when no town has any', async () => {
  const m = await machine();
  const many = Array.from({ length: 9 }, (_, i) => shop(`m${i}`, 120 * (i + 1), 120, ['antiques']));
  const few = SHOPS.filter((s) => s.id.startsWith('a')).slice(0, 3);
  const areas = [{ area: { name: 'Many', at: FROM }, from: FROM, cands: many, leg: m.leg }, { area: { name: 'Few', at: FROM }, from: FROM, cands: few, leg: m.leg }];
  const base = { areas, origin: FROM, picked: m.CHIPS.filter((c) => c.id === 'antiques'), leanings: m.LEANINGS, mixed: m.MIXED, ceilingM: 3000, toward: true };
  const again = m.planJourneys({ ...base, salts: { shops: 1 } });
  assert.deepEqual(again.journeys[0].chapters.map((c) => c.area.name), ['Many', 'Few']);
  assert.deepEqual(m.planJourneys({ ...base, salts: { shops: 3 } }).journeys, [], 'past the last other places there is no other journey');
});

test('outing-journey audit 17: the words name only what is there, and make walking no measure of an outing', async () => {
  const w = await import('../../outing/journeyWords');
  const { SLOT_HINT } = await import('../../outing/words');
  assert.equal(w.nextMoveLine(true), 'Switch on another chip, or look further.');
  assert.equal(w.nextMoveLine(false), 'Switch on another chip.');
  assert.equal(w.nothingLine('Kutztown'), 'Little of that toward Kutztown.');
  assert.doesNotMatch(w.TOO_FAR_LINE, /walk/i);
  assert.equal(w.townLine(['Antiques', 'Views']), 'Antiques and views here.');
  assert.doesNotMatch(SLOT_HINT, /shop/i);
});

test('outing-journey audit 18: swapping a chapter of one stop leaves a chapter of one stop', async () => {
  const { createOutingService } = await import('../../outing/service');
  const { CHIPS } = await import('../../outing/chips');
  const service = createOutingService({ read: async () => ({ shops: SHOPS.map((s) => ({ name: s.name, at: s.at, classes: ['antiques'] })), segments: segs }), stores: null });
  const picked = CHIPS.filter((c) => c.id === 'antiques');
  const session = await service.open(FROM, picked);
  const cands = service.candidates(session!, true);
  const one = { stops: [cands[0]], path: [cands[0].at], lengthM: 0, loop: false };
  const r = service.swap({ session: session!, picked, mode: 'oneway', ceilingM: 3000, chains: true, outing: one, cands, index: 0, offered: new Set() });
  assert.equal(r.outing!.stops.length, 1);
  assert.notEqual(r.outing!.stops[0].id, cands[0].id);
  assert.deepEqual([r.outing!.path.length, r.outing!.lengthM], [1, 0]);
});

test('outing-journey audit 22, 26: a straight line is said as one, and an empty reach says the journey is around here', async () => {
  const w = await import('../../outing/journeyWords');
  assert.match(w.STRAIGHT_LINE, /straight line/);
  assert.match(w.STRAIGHT_LINE, /Maps/);
  assert.equal(w.lookedLine([]), 'No town within that reach: this is around here.');
});
