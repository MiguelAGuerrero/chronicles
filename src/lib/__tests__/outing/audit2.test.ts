import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fakePorts } from '../fakes';
import { at } from '../walk-planner/grid';
import type { JourneyPlan, PlanState } from '../../outing/journeyPlan';
import type { LngLat } from '../../types';

// The second audit (Nov 18, the carried journey): one regression test per accepted finding that a unit test can hold.

const ch = (town: string, e: number, n = 0, stops: LngLat[] = [at(e, n)]) => ({ town, at: at(e, n), stops, loop: false });
const HERE = at(0, 0);

async function drive(plan: JourneyPlan, fixes: LngLat[]) {
  const { stepPlan, emptyState } = await import('../../outing/journeyPlan');
  let p: JourneyPlan | null = plan;
  let state: PlanState = emptyState(plan);
  let ahead = null as Awaited<ReturnType<typeof stepPlan>>['ahead'];
  for (const f of fixes) {
    if (!p) break;
    const r = stepPlan(p, state, f);
    p = r.plan;
    state = r.state;
    ahead = r.ahead;
  }
  return { plan: p, ahead };
}

test('outing-journey audit 34: in a town within reach of the next, the town you stand in is the one at hand, and stays in the plan', async () => {
  const plan = { chapters: [ch('Alder', 10000), ch('Birch', 12500)] };
  const r = await drive(plan, [HERE, at(9000, 0), at(10800, 0)]);
  assert.deepEqual([r.ahead!.town, r.ahead!.within], ['Alder', true]);
  assert.deepEqual(r.plan!.chapters.map((c) => c.town), ['Alder', 'Birch']);
});

test('outing-journey audit 36: a town you are leaving is not named as ahead; reached by a stop far from its point, it is at hand', async () => {
  const plan = { chapters: [ch('Alder', 10000), ch('Birch', 30000)] };
  const leaving = await drive(plan, [HERE, at(10000, 50), at(12400, 0)]);
  assert.deepEqual([leaving.ahead!.town, leaving.ahead!.within], ['Alder', true], 'between reach and left it is still the town at hand');
  const left = await drive(plan, [HERE, at(10000, 50), at(12400, 0), at(13500, 0)]);
  assert.equal(left.ahead!.town, 'Birch');
  assert.deepEqual(left.plan!.chapters.map((c) => c.town), ['Birch'], 'and the plan holds only what is ahead');
  const far = { chapters: [ch('Cedar', 10000, 0, [at(12500, 0)]), ch('Dale', 40000)] };
  const byStop = await drive(far, [HERE, at(12600, 0)]);
  assert.deepEqual([byStop.ahead!.town, byStop.ahead!.within], ['Cedar', true]);
});

test('outing-journey audit 42: a town off to one side is not dropped before you move', async () => {
  const plan = { chapters: [ch('Alder', 3000, 5000), ch('Birch', 6000, -5000)] };
  const r = await drive(plan, [HERE, at(50, 0)]);
  assert.equal(r.ahead!.town, 'Alder');
  const past = await drive(plan, [HERE, at(2000, -1500), at(4000, -3500), at(5500, -4500)]);
  assert.equal(past.ahead!.town, 'Birch', 'driven past toward the next, it is let go');
});

test('outing-journey audit 45: a town you drift away from is let go with no tap, the destination\'s included', async () => {
  const plan = { chapters: [ch('Providence', 24000)] };
  const near = await drive(plan, [HERE, at(-4000, 0)]);
  assert.equal(near.ahead!.town, 'Providence', 'a little the other way is not drifting');
  const gone = await drive(plan, [HERE, at(-8000, 0), at(-16000, 0)]);
  assert.equal(gone.plan, null);
  assert.equal(gone.ahead, null);
});

test('outing-journey audit 46: "Pass by" takes the town out of the plan the session keeps, and nothing says what became of it', async () => {
  const { passBy } = await import('../../outing/journeyPlan');
  const { createPlanStore } = await import('../../outing/planStore');
  const plan = { chapters: [ch('Alder', 10000), ch('Birch', 30000)] };
  const next = passBy(plan);
  assert.deepEqual(next!.chapters.map((c) => c.town), ['Birch']);
  assert.equal(passBy(next!), null);
  const ports = fakePorts();
  const store = createPlanStore(ports);
  await store.offer(plan);
  const id = 'w1';
  await store.load(id);
  await store.keep(id, next!);
  assert.deepEqual(await store.load(id), next);
  const raw = (await ports.db.getMeta('outing_journey')) ?? '';
  assert.doesNotMatch(raw, /Alder|passed|reached|done|skipped/);
  await store.keep(id, null);
  assert.equal(await store.load(id), null, 'with no town ahead the plan is gone for the session');
});

test('outing-journey audit 44: a plan offered for a Start that did not happen can be taken back, and a clock set back takes up nothing', async () => {
  const { createPlanStore } = await import('../../outing/planStore');
  const ports = fakePorts();
  const store = createPlanStore(ports);
  const plan = { chapters: [ch('Alder', 10000)] };
  await store.offer(plan);
  await store.withdraw();
  const a = 'w1';
  assert.equal(await store.load(a), null);
  await store.offer(plan);
  ports.clock.advance(-60_000);
  assert.equal(await store.load(a), null, 'a plan from the future is not this session\'s');
});

test('outing-journey audit 47, 48: the bar\'s and the page\'s words hold no ordinal and say only what happens', async () => {
  const w = await import('../../outing/journeyWords');
  assert.equal(w.towardLine('Providence', 24000, 'km'), 'Toward Providence. 24 km away.');
  assert.equal(w.towardLine('Providence', null, 'km'), 'Toward Providence.');
  assert.equal(w.hereLine('Emmaus'), 'Emmaus is here.');
  assert.equal(w.startLine('Emmaus'), 'Start records from here, toward Emmaus.');
  assert.equal(w.laterLine('Emmaus'), '"When I get there" keeps Emmaus only.');
  assert.equal(w.leftOutLine('Emmaus'), 'Left Emmaus out.');
  for (const s of [w.towardLine('Providence', 24000, 'km'), w.hereLine('Emmaus'), w.startLine('Emmaus'), w.laterLine('Emmaus'), w.leftOutLine('Emmaus'), w.PASS_LABEL, w.WAY_LABEL]) {
    assert.doesNotMatch(s.replace(/24 km/, ''), /\d|\b(next|then|first|last|second|done|skipped|remaining|minutes?|begins in)\b/i, s);
  }
});

test('outing-journey audit 49: "New to you." is said only when there are recorded outings to read it from', async () => {
  const { newTowns } = await import('../../outing/areas');
  const areas = [{ name: null, at: HERE }, { name: 'Alder', at: at(10000, 0), isNew: true }, { name: 'Birch', at: at(30000, 0), isNew: false }];
  assert.deepEqual([...newTowns(areas, 3)], ['Alder']);
  assert.deepEqual([...newTowns(areas, 0)], [], 'with no recorded outing every town would read as new: say nothing');
  assert.deepEqual([...newTowns(areas, null)], [], 'nor when the read of them failed');
});
