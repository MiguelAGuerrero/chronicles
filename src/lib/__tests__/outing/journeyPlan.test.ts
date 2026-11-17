import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fakePorts } from '../fakes';
import { at } from '../walk-planner/grid';

// The plan a session carries (OJ26, OJ28-OJ31, OJ34, OJ48-OJ50; decision 0201): towns and positions only, the chapter ahead read
// from where you have been, nothing marked done.

const TODO = { todo: 'test first' };
const stop = (id: string, e: number, n: number) => ({ id, at: at(e, n), facets: { what: ['antiques'] }, name: `Secret ${id}` });
const chapter = (name: string | null, e: number, stops: ReturnType<typeof stop>[], loop = false) => ({ area: { name, at: at(e, 0) }, outing: { stops, path: stops.map((s) => s.at), lengthM: 500, loop } });
const JOURNEY = {
  leaning: 'shops', name: 'Among the shops', wants: [], footM: 1000,
  chapters: [chapter('Alder', 10000, [stop('a', 10000, 100), stop('b', 10200, 100)]), chapter('Birch', 30000, [stop('c', 30000, 100)]), chapter('Cedar', 50000, [stop('d', 50000, 0), stop('e', 50300, 0)], true)],
};
const HERE = at(0, 0);

test('OJ34, OJ48: the plan holds town names, points, stops\' positions and the loop, and nothing else', TODO, async () => {
  const { journeyPlan, isJourneyPlan } = await import('../../outing/journeyPlan');
  const plan = journeyPlan(JOURNEY as never);
  assert.deepEqual(plan.chapters.map((c) => Object.keys(c).sort()), [['at', 'loop', 'stops', 'town'], ['at', 'loop', 'stops', 'town'], ['at', 'loop', 'stops', 'town']]);
  assert.doesNotMatch(JSON.stringify(plan), /Secret|antiques|shops|path/);
  assert.equal(isJourneyPlan(JSON.parse(JSON.stringify(plan))), true);
  assert.equal(isJourneyPlan({ chapters: [{ town: 'x', at: [1, 2], stops: [[1, 2]], loop: false, name: 'Secret' }] }), false, 'a field more is not a plan');
  assert.equal(isJourneyPlan({ chapters: [] }), false);
});

test('OJ29, OJ49: far from every town, the first is ahead, with how far away it is', TODO, async () => {
  const { journeyPlan, chapterAhead } = await import('../../outing/journeyPlan');
  const a = chapterAhead(journeyPlan(JOURNEY as never), [HERE], HERE, new Set());
  assert.deepEqual([a!.index, a!.within], [0, false]);
  assert.ok(Math.abs(a!.awayM - 10000) < 200);
});

test('OJ30, OJ49: within reach of a town it is the one at hand; once left it is behind and the next is ahead', TODO, async () => {
  const { journeyPlan, chapterAhead } = await import('../../outing/journeyPlan');
  const plan = journeyPlan(JOURNEY as never);
  assert.deepEqual([chapterAhead(plan, [HERE, at(9500, 0)], at(9500, 0), new Set())!.index, chapterAhead(plan, [HERE, at(9500, 0)], at(9500, 0), new Set())!.within], [0, true]);
  const left = chapterAhead(plan, [HERE, at(10000, 50), at(16000, 0)], at(16000, 0), new Set());
  assert.deepEqual([left!.index, left!.within], [1, false]);
});

test('OJ31, OJ49: a town driven past without stopping is let go; "Pass this town by" does the same ahead of time', TODO, async () => {
  const { journeyPlan, chapterAhead } = await import('../../outing/journeyPlan');
  const plan = journeyPlan(JOURNEY as never);
  const past = chapterAhead(plan, [HERE, at(5000, 6000), at(22000, 6000)], at(22000, 6000), new Set());
  assert.equal(past!.index, 1, 'well past Alder toward Birch, never within reach of it');
  assert.equal(chapterAhead(plan, [HERE], HERE, new Set([0]))!.index, 1);
  assert.equal(chapterAhead(plan, [HERE, at(30000, 0)], at(30000, 0), new Set())!.index, 1, 'reaching a later town lets the earlier go');
});

test('OJ29: with every town behind there is no chapter ahead', TODO, async () => {
  const { journeyPlan, chapterAhead } = await import('../../outing/journeyPlan');
  const plan = journeyPlan(JOURNEY as never);
  assert.equal(chapterAhead(plan, [HERE, at(50000, 0), at(60000, 0)], at(60000, 0), new Set()), null);
  assert.equal(chapterAhead(plan, [HERE], HERE, new Set([0, 1, 2])), null);
});

test('OJ30: a chapter\'s way on foot is a suggested destination through its stops, positions only', TODO, async () => {
  const { journeyPlan, chapterDest } = await import('../../outing/journeyPlan');
  const plan = journeyPlan(JOURNEY as never);
  const d = chapterDest(plan.chapters[0]);
  assert.deepEqual([d.suggested, d.outing, d.kind, d.label], [true, true, 'point', 'An outing']);
  assert.deepEqual(d.at, at(10200, 100));
  assert.deepEqual(d.via, [at(10000, 100)]);
  assert.equal(d.path, undefined);
  assert.equal(chapterDest(plan.chapters[1]).via, undefined);
});

test('OJ26: a town left out is gone from the look, never the destination\'s town or where you stand', TODO, async () => {
  const { withoutAreas, areaKey } = await import('../../outing/areas');
  const areas = [{ name: null, at: at(0, 0) }, { name: 'Alder', at: at(10000, 0) }, { name: 'End', at: at(50000, 0) }];
  const left = new Set(areas.map(areaKey));
  assert.deepEqual(withoutAreas(areas, left, areaKey(areas[2])).map((a) => a.name), [null, 'End']);
  assert.deepEqual(withoutAreas(areas, new Set([areaKey(areas[1])]), null).map((a) => a.name), [null, 'End']);
});

test('OJ29, OJ31, OJ50: the bar\'s and the page\'s words: a distance, no time, no count, nothing done', TODO, async () => {
  const w = await import('../../outing/journeyWords');
  assert.equal(w.nextTownLine('Emmaus', 8200, 'km'), 'Emmaus next. 8.2 km away.');
  assert.equal(w.PASS_LABEL, 'Pass this town by');
  assert.equal(w.LEAVE_OUT_LABEL, 'Leave this town out');
  assert.equal(w.NEW_TOWN_LINE, 'New to you.');
  for (const s of [w.nextTownLine('Emmaus', 8200, 'km'), w.PASS_LABEL, w.LEAVE_OUT_LABEL, w.NEW_TOWN_LINE, w.PUT_AWAY_LABEL]) assert.doesNotMatch(s.replace(/8\.2 km/, ''), /\d|\b(minutes?|hours?|done|left|remaining|first|second|last|visited|skipped)\b/i, s);
});

test('OJ48: the plan is taken up only by the session started from the page, soon after, and goes when it stops', TODO, async () => {
  const { createPlanStore, PLAN_CLAIM_MS } = await import('../../outing/planStore');
  const { journeyPlan } = await import('../../outing/journeyPlan');
  const ports = fakePorts();
  const store = createPlanStore(ports);
  const plan = journeyPlan(JOURNEY as never);
  assert.equal(await store.load('w1'), null);
  await store.offer(plan);
  assert.doesNotMatch((await ports.db.getMeta('outing_journey')) ?? '', /Secret/);
  assert.deepEqual(await store.load('w1'), plan, 'the session started next takes it up');
  assert.deepEqual(await store.load('w1'), plan, 'and keeps it across a reload');
  assert.equal(await store.load('w2'), null, 'another session never sees it');
  await store.clear();
  assert.equal(await ports.db.getMeta('outing_journey'), null);
  await store.offer(plan);
  ports.clock.advance?.(PLAN_CLAIM_MS + 1000);
  assert.equal(await store.load('w3'), null, 'a plan offered long before is not this session\'s');
});
