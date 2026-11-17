import assert from 'node:assert/strict';
import { test } from 'node:test';
import { at, segs } from '../walk-planner/grid';
import { FROM, SHOPS } from './fixtures';

// Visited is read from the trace (OJ47, the owner, Nov 17): a place a recorded outing came within range of on foot has been visited.

const fix = (e: number, n: number) => ({ lon: at(e, n)[0], lat: at(e, n)[1] });

test('OJ47: a place within the range of any fix is visited; one beyond it is not', async () => {
  const { visitedIds } = await import('../../outing/visited');
  const fixes = [fix(0, 0), fix(350, 120), fix(900, 900)];
  const got = visitedIds(SHOPS, fixes, 100);
  assert.deepEqual([...got].sort(), ['a1'], 'a1 is 10 m from a fix; b1 is 170 m from the nearest');
  assert.deepEqual([...visitedIds(SHOPS, fixes, 200)].sort(), ['a1', 'b1']);
  assert.deepEqual([...visitedIds(SHOPS, [], 100)], []);
  assert.deepEqual([...visitedIds([], fixes, 100)], []);
});

test('OJ47: the outings to read are those that were near the area, the newest first, no more than the rule allows', async () => {
  const { walksNear, VISITED_RULES } = await import('../../outing/visited');
  const row = (walk_id: string, e: number, n: number, last_t: number) => ({ walk_id, lon: at(e, n)[0], lat: at(e, n)[1], last_t });
  const rows = [row('old', 100, 100, 1), row('new', 200, 0, 9), row('new', 300, 0, 9), row('far', 90000, 0, 5)];
  assert.deepEqual(walksNear(rows, FROM, 5000), ['new', 'old']);
  const many = Array.from({ length: 80 }, (_, i) => row(`w${i}`, 10, 10, i));
  assert.equal(walksNear(many, FROM, 5000).length, VISITED_RULES.walksMax);
  assert.equal(walksNear(many, FROM, 5000)[0], 'w79');
});

test('OJ42, OJ47: a shop you have been to is offered after one you have not', async () => {
  const { planChapter } = await import('../../outing/journeys');
  const { CHIPS } = await import('../../outing/chips');
  const { legOver } = await import('../../walkPlanner/service');
  const wants = CHIPS.filter((c) => c.id === 'antiques');
  const cands = SHOPS.map((s) => (s.id === 'a1' || s.id === 'a3' ? { ...s, seen: true } : s));
  const c = planChapter({ area: { name: null, at: FROM }, from: FROM, cands, leg: legOver(segs) }, wants, 3000);
  const got = c!.outing.stops.map((s) => s.id);
  assert.ok(got.includes('a2') && got.includes('a4'), got.join(','));
});

test('OJ47: the service marks what the trace has been near, and reads no trace when nothing is picked', async () => {
  const { createOutingService } = await import('../../outing/service');
  const { CHIPS } = await import('../../outing/chips');
  const log = { walked: 0 };
  const service = createOutingService({
    read: async () => ({ shops: SHOPS.map((s) => ({ name: s.name, at: s.at, classes: ['antiques'] })), segments: segs }),
    stores: null,
    walked: { rows: async () => [{ walk_id: 'w', lon: FROM[0], lat: FROM[1], last_t: 1 }], trace: async () => (log.walked++, [{ lon: SHOPS[0].at[0], lat: SHOPS[0].at[1] }]), rangeM: async () => 100 },
  });
  const picked = CHIPS.filter((c) => c.id === 'antiques');
  await service.open(FROM, []);
  assert.equal(log.walked, 0);
  const session = await service.open(FROM, picked);
  assert.equal(log.walked, 1);
  const seen = service.candidates(session!, true).filter((c) => c.seen).map((c) => c.name);
  assert.deepEqual(seen, [SHOPS[0].name]);
});
