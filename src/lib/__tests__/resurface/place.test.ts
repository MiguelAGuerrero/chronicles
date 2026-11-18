import assert from 'node:assert/strict';
import { test } from 'node:test';
import { facedOf, momentOf } from '../../moment';
import { createResurface } from '../../resurface/shell';
import type { Walk } from '../../types';
import { fakePorts } from '../fakes';
import { at, NOW } from './fixtures';

// A moment keeps where it was made (MC18; the owner, Nov 18, decision 0211): on an outing through several towns, by any means of
// travel, its place is the one it was in at that time, never the outing's one name and never where the outing was headed.

type Any = any;
const START = at(2026, 10, 20) - 5 * 3600_000;
const MIN = 60_000;
const area = (key: string, level: string, name: string) => ({ key, level, name, parent_key: null, lon: -71.4, lat: 41.8, rules: 'r' });
const row = (area_key: string, fromMin: number, toMin: number) => ({ walk_id: 'w1', area_key, metres: 100, first_t: START + fromMin * MIN, last_t: START + toMin * MIN, lon: -71.4, lat: 41.8 });
const AREAS = [area('s', 'state', 'Rhode Island'), area('t1', 'town', 'North Scituate'), area('t2', 'town', 'Providence'), area('n2', 'neighborhood', 'Fox Point')];
const ROWS = [row('s', 0, 120), row('t1', 10, 30), row('t2', 60, 120), row('n2', 90, 110)];

test('MC18: a moment\'s place is the smallest area its outing was in at that time', async () => {
  const { placeAt } = await import('../../resurface/context');
  const where = (min: number) => placeAt(ROWS as Any, AREAS as Any, 'w1', START + min * MIN, 'Fox Point');
  assert.equal(where(20), 'North Scituate', 'in the first town, not the outing\'s one name');
  assert.equal(where(70), 'Providence');
  assert.equal(where(100), 'Fox Point', 'a neighborhood before its town');
  assert.equal(where(45), 'Rhode Island', 'between towns the interim place is what is known: the state');
  assert.equal(where(5), 'Rhode Island');
});

test('MC18: an outing that came back through a town names the one it was in then; with no rows it keeps the outing\'s own name', async () => {
  const { placeAt } = await import('../../resurface/context');
  const rows = [row('t1', 0, 120), row('t2', 40, 60)];
  assert.equal(placeAt(rows as Any, AREAS as Any, 'w1', START + 50 * MIN, null), 'Providence', 'the narrower stay wins between two towns that both span the moment');
  assert.equal(placeAt(rows as Any, AREAS as Any, 'w1', START + 100 * MIN, null), 'North Scituate');
  assert.equal(placeAt([], AREAS as Any, 'w1', START, 'Fox Point'), 'Fox Point');
  assert.equal(placeAt(ROWS as Any, AREAS as Any, 'other', START + 20 * MIN, 'Elsewhere'), 'Elsewhere', 'another outing\'s rows say nothing of this one: an outing not placed yet keeps its own name');
  assert.equal(placeAt([row('t1', 10, 30)] as Any, AREAS as Any, 'w1', START + 90 * MIN, 'North Scituate'), null, 'outside every stay nothing is said: never a town it was not in');
});

test('MC18: the context line of a moment made on the way names where it was, read once for a batch', async () => {
  const p = fakePorts({ now: NOW });
  const walk: Walk = { id: 'w1', started_at: START, ended_at: START + 120 * MIN, title: null, epilogue: null, open: false, area: 'Fox Point', snapped_build: null };
  await p.db.createWalk(walk);
  await (p.db as Any).saveSnap('w1', [], [], { walk_id: 'w1' }, { areas: AREAS, rows: ROWS });
  const cap = (id: string, min: number) => facedOf({ id, walk_id: 'w1', t: START + min * MIN, lat: 41.83, lon: -71.59, kind: 'text', file_path: null, body: id, segment_id: null });
  for (const c of [cap('a', 20), cap('b', 45), cap('c', 100)]) await p.db.addMoment(momentOf(c));
  const r = createResurface(p) as Any;
  await r.load();
  p.log.clear();
  await r.contextFor(['a', 'b', 'c']);
  const line = (id: string) => r.store.get().context[id].line as string;
  assert.match(line('a'), /^North Scituate · /);
  assert.match(line('b'), /^Rhode Island · /);
  assert.match(line('c'), /^Fox Point · /);
  assert.equal(p.log.argsOf('db.listWalkAreas').length, 1, 'the outing\'s areas are read once for the batch');
});
