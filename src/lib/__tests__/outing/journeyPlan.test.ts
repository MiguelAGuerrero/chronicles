import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fakePorts } from '../fakes';
import { at } from '../walk-planner/grid';

// The plan a session carries (OJ26, OJ28-OJ31, OJ34, OJ48-OJ50; decision 0210): towns and positions only, the chapter ahead read
// from where you have been, nothing marked done.

const stop = (id: string, e: number, n: number) => ({ id, at: at(e, n), facets: { what: ['antiques'] }, name: `Secret ${id}` });
const chapter = (name: string | null, e: number, stops: ReturnType<typeof stop>[], loop = false) => ({ area: { name, at: at(e, 0) }, outing: { stops, path: stops.map((s) => s.at), lengthM: 500, loop } });
const JOURNEY = {
  leaning: 'shops', name: 'Among the shops', wants: [], footM: 1000,
  chapters: [chapter('Alder', 10000, [stop('a', 10000, 100), stop('b', 10200, 100)]), chapter('Birch', 30000, [stop('c', 30000, 100)]), chapter('Cedar', 50000, [stop('d', 50000, 0), stop('e', 50300, 0)], true)],
};
const HERE = at(0, 0);

test('OJ34, OJ48: the plan holds town names, points, stops\' positions and the loop, and nothing else', async () => {
  const { journeyPlan, isJourneyPlan } = await import('../../outing/journeyPlan');
  const plan = journeyPlan(JOURNEY as never);
  assert.deepEqual(plan.chapters.map((c) => Object.keys(c).sort()), [['at', 'loop', 'stops', 'town'], ['at', 'loop', 'stops', 'town'], ['at', 'loop', 'stops', 'town']]);
  assert.doesNotMatch(JSON.stringify(plan), /Secret|antiques|shops|path/);
  assert.equal(isJourneyPlan(JSON.parse(JSON.stringify(plan))), true);
  assert.equal(isJourneyPlan({ chapters: [{ town: 'x', at: [1, 2], stops: [[1, 2]], loop: false, name: 'Secret' }] }), false, 'a field more is not a plan');
  assert.equal(isJourneyPlan({ chapters: [] }), false);
});

test('OJ29, OJ49: far from every town, the first is ahead with how far away it is; with no position, without a distance', async () => {
  const { journeyPlan, stepPlan, emptyState } = await import('../../outing/journeyPlan');
  const plan = journeyPlan(JOURNEY as never);
  const a = stepPlan(plan, emptyState(plan), HERE).ahead!;
  assert.deepEqual([a.town, a.within], ['Alder', false]);
  assert.ok(Math.abs(a.awayM! - 10000) < 200);
  assert.equal(stepPlan(plan, emptyState(plan), null).ahead!.awayM, null);
  assert.equal(stepPlan(plan, emptyState(plan), HERE).plan, plan, 'a step that changes nothing gives the same plan back');
});

test('OJ30: a chapter\'s way on foot is a suggested destination through its stops, positions only', async () => {
  const { journeyPlan, chapterDest } = await import('../../outing/journeyPlan');
  const plan = journeyPlan(JOURNEY as never);
  const d = chapterDest(plan.chapters[0]);
  assert.deepEqual([d.suggested, d.outing, d.kind, d.label], [true, true, 'point', 'An outing']);
  assert.deepEqual(d.at, at(10200, 100));
  assert.deepEqual(d.via, [at(10000, 100)]);
  assert.equal(d.path, undefined);
  assert.equal(chapterDest(plan.chapters[1]).via, undefined);
});

test('OJ26: a town left out is gone from the look, never the destination\'s town or where you stand', async () => {
  const { withoutAreas, areaKey } = await import('../../outing/areas');
  const areas = [{ name: null, at: at(0, 0) }, { name: 'Alder', at: at(10000, 0) }, { name: 'End', at: at(50000, 0) }];
  const left = new Set(areas.map(areaKey));
  assert.deepEqual(withoutAreas(areas, left, areaKey(areas[2])).map((a) => a.name), [null, 'End']);
  assert.deepEqual(withoutAreas(areas, new Set([areaKey(areas[1])]), null).map((a) => a.name), [null, 'End']);
});

test('OJ26, OJ50: the page\'s words for a town', async () => {
  const w = await import('../../outing/journeyWords');
  assert.equal(w.LEAVE_OUT_LABEL, 'Leave this town out');
  assert.equal(w.NEW_TOWN_LINE, 'New to you.');
});

test('OJ48: the plan is taken up only by the session started from the page, soon after, and goes when it stops', async () => {
  const { createPlanStore, PLAN_CLAIM_MS } = await import('../../outing/planStore');
  const { journeyPlan } = await import('../../outing/journeyPlan');
  const ports = fakePorts();
  const store = createPlanStore(ports);
  const plan = journeyPlan(JOURNEY as never);
  const [one, two, three] = ['w1', 'w2', 'w3'];
  assert.equal(await store.load(one), null);
  await store.offer(plan);
  assert.doesNotMatch((await ports.db.getMeta('outing_journey')) ?? '', /Secret/);
  assert.deepEqual(await store.load(one), plan, 'the session started next takes it up');
  assert.deepEqual(await store.load(one), plan, 'and keeps it across a reload');
  assert.equal(await store.load(two), null, 'another session never sees it');
  await store.clear();
  assert.ok(!(await ports.db.getMeta('outing_journey')), 'nothing is left under the key');
  await store.offer(plan);
  ports.clock.advance(PLAN_CLAIM_MS + 1000);
  assert.equal(await store.load(three), null, 'a plan offered long before is not this session\'s');
});

test('RE28: a guided drive is kept as one flag on the plan: no way, turn or road name; any other field is still not a plan', async () => {
  const { isJourneyPlan, passBy, stepPlan, emptyState } = await import('../../outing/journeyPlan');
  const c = (town: string, lon: number) => ({ town, at: [lon, 47.3] as [number, number], stops: [[lon, 47.3] as [number, number]], loop: false });
  const plan = { chapters: [c('A', 8.5), c('B', 8.9)], driving: true as const };
  assert.equal(isJourneyPlan(JSON.parse(JSON.stringify(plan))), true);
  assert.equal(isJourneyPlan({ ...plan, driving: false }), false);
  assert.equal(isJourneyPlan({ ...plan, way: [[8.5, 47.3]] }), false);
  assert.equal(isJourneyPlan({ ...plan, turn: 'Left' }), false);
  // A fix that changes nothing keeps it; a town passed by ends it.
  assert.equal(stepPlan(plan, emptyState(plan), [8.0, 47.3]).plan?.driving, true);
  assert.equal(passBy(plan)?.driving, undefined);
});

test('RE25: the mute is kept with the guiding as one more flag, and only beside it', async () => {
  const { isJourneyPlan } = await import('../../outing/journeyPlan');
  const c = { town: 'A', at: [8.5, 47.3], stops: [[8.5, 47.3]], loop: false };
  assert.equal(isJourneyPlan({ chapters: [c], driving: true, muted: true }), true);
  assert.equal(isJourneyPlan({ chapters: [c], muted: true }), true);
  assert.equal(isJourneyPlan({ chapters: [c], muted: false }), false);
  assert.equal(isJourneyPlan({ chapters: [c], driving: true, muted: true, voice: 'x' }), false);
});

test('DO7: a far place begun now is carried as a one-town plan: its name and its point, nothing else', async () => {
  const { placePlan, isJourneyPlan, stepPlan, emptyState, PLAN_RULES } = await import('../../outing/journeyPlan');
  const plan = placePlan('Cranston', [-71.44, 41.78]);
  assert.equal(isJourneyPlan(JSON.parse(JSON.stringify(plan))), true);
  assert.deepEqual(plan, { chapters: [{ town: 'Cranston', at: [-71.44, 41.78], stops: [[-71.44, 41.78]], loop: false }] });
  // Far from it the session heads toward it; within reach it is at hand, as any town of a journey.
  const far = stepPlan(plan, emptyState(plan), [-71.0, 41.78]);
  assert.equal(far.ahead?.town, 'Cranston');
  assert.equal(far.ahead?.within, false);
  assert.ok(PLAN_RULES.reachM > 0);
  assert.equal(stepPlan(plan, emptyState(plan), [-71.441, 41.78]).ahead?.within, true);
});

test('DO5, DO6: the question says "Start now", at every distance, never "Walk now"', async () => {
  const w = await import('../../outing/journeyWords');
  assert.equal(w.START_NOW_LABEL, 'Start now');
  assert.match(w.START_FAR_HINT, /records from here/i);
  assert.doesNotMatch(`${w.START_NOW_LABEL} ${w.START_FAR_HINT}`, /walk/i);
});

test('road-engine audit 3: a mute survives a town left behind and a town passed by; the guiding does not', async () => {
  const { passBy, stepPlan, emptyState } = await import('../../outing/journeyPlan');
  const c = (town: string, lon: number) => ({ town, at: [lon, 47.3] as [number, number], stops: [[lon, 47.3] as [number, number]], loop: false });
  const plan = { chapters: [c('A', 8.5), c('B', 9.2)], driving: true as const, muted: true as const };
  const passed = passBy(plan);
  assert.equal(passed?.muted, true);
  assert.equal(passed?.driving, undefined);
  // Reach A, then leave it far behind: A is let go.
  let st = emptyState(plan);
  let cur: typeof plan | ReturnType<typeof passBy> = plan;
  for (const lon of [8.5, 8.56, 8.7]) {
    const r = stepPlan(cur!, st, [lon, 47.3]);
    cur = r.plan;
    st = r.state;
  }
  assert.equal(cur?.chapters.length, 1);
  assert.equal(cur?.muted, true);
  assert.equal(cur?.driving, undefined);
});
