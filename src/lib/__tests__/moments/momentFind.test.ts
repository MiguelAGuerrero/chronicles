import { type Faced, facedOf, momentOf } from '../../moment';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ChecklistItem } from '../../explore/explore';
import { createMomentFind } from '../../explore/momentFind/shell';
import type { LngLat } from '../../types';
import { fakePorts, type FakePorts } from '../fakes';
import { at } from '../foxPoint';

// A moment made outside a walk finds a place as a walk's capture does (M4, E8), as a shell over
// fakes (specs/shells-saved-settings, SH4). `at(x, y)` is in units of 100 m.

const item = (key: string, where: LngLat): ChecklistItem => ({ key, area_key: 'N1', name: key, category: 'art', kind: 'public_art', at: where, generic: false });
const moment = (id: string, where: LngLat | null): Faced => facedOf({
  id, walk_id: 'm1', t: 1, kind: 'photo', file_path: `m/${id}.jpg`, body: null, segment_id: null, lat: where ? where[1] : null, lon: where ? where[0] : null,
});

async function seeded(): Promise<FakePorts> {
  const p = fakePorts();
  // Two places 30 m and 50 m from the moment, one 300 m off.
  await p.db.saveChecklists({
    areas: [],
    items: [item('near', at(0.3, 0)), item('farther', at(0.5, 0)), item('away', at(3, 0))],
    read: { key: 'r', centre: at(0, 0), build: 'b1', read_at: 1, candidates: [] },
  });
  return p;
}

test('SH4 the nearest unfound place in reach is found and recorded', async () => {
  const p = await seeded();
  const finder = createMomentFind({ ...p, hidden: () => new Set() });
  const c = moment('c1', at(0, 0));
  await p.db.addMoment(momentOf(c));
  const f = await finder.findForMoment(c);
  assert.equal(f?.key, 'near');
  const kept = await p.db.listFinds();
  assert.deepEqual(kept.map((x) => [x.key, x.walk_id, x.capture_id, x.found_at]), [['near', 'm1', 'c1', p.clock.now()]]);
  // The next moment there finds the next place: the first find stands.
  const c2 = moment('c2', at(0, 0));
  await p.db.addMoment(momentOf(c2));
  assert.equal((await finder.findForMoment(c2))?.key, 'farther');
});

test('SH4 nothing found or recorded: no position, in Undo, deleted during the read, already found, nothing in reach', async () => {
  const p = await seeded();
  const hidden = new Set<string>();
  const finder = createMomentFind({ ...p, hidden: () => hidden });
  const none = async (c: Faced, why: string) => {
    const before = (await p.db.listFinds()).length;
    assert.equal(await finder.findForMoment(c), null, why);
    assert.equal((await p.db.listFinds()).length, before, `${why}: nothing recorded`);
  };
  const lost = moment('lost', null);
  await p.db.addMoment(momentOf(lost));
  await none(lost, 'no position');
  const undo = moment('undo', at(0, 0));
  await p.db.addMoment(momentOf(undo));
  hidden.add('undo');
  await none(undo, 'waiting in Undo');
  // Deleted while the places were being read: never stored, or gone by the time the find is written.
  const gone = moment('gone', at(0, 0));
  await none(gone, 'not stored');
  const midway = moment('midway', at(0, 0));
  await p.db.addMoment(momentOf(midway));
  const racing = createMomentFind({ ...p, hidden: () => hidden, db: { ...p.db, checklistItemsIn: async (b) => { hidden.add('midway'); return p.db.checklistItemsIn(b); } } });
  assert.equal(await racing.findForMoment(midway), null, 'put in Undo during the read');
  const done = moment('done', at(0, 0));
  await p.db.addMoment(momentOf(done));
  assert.equal((await finder.findForMoment(done))?.key, 'near');
  await none(done, 'already found a place');
  const far = moment('far', at(6, 0));
  await p.db.addMoment(momentOf(far));
  await none(far, 'no unfound place in reach');
});
