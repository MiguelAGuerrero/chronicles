import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ATLAS_ORDER } from '../../atlas/atlas';
import type { Cell } from '../../kindWalk/density';
import { alsoPasses } from '../../walkPlanner/exposure';
import { alsoLine, rowWords } from '../../walkPlanner/words';
import { planRoutes } from '../../walkPlanner/planner';
import { at, cases, leg } from './grid';

const line = [at(0, 0), at(600, 0), at(1200, 0), at(1800, 0), at(2400, 0)];
const cell = (e: number, n: number, count: number): Cell => ({ at: at(e, n), count });

test('WP28: The other kinds along a route are named by kind, in the kinds\' fixed order, with how much', () => {
  const also = alsoPasses(line, { history: [cell(600, 60, 8), cell(1000, 60, 8), cell(1400, 60, 8)], art: [cell(2200, 50, 2)], food: [cell(300, 8000, 9)] }, ATLAS_ORDER, 'parks');
  assert.deepEqual(also.map((a) => a.kind), ['history', 'art'], 'food is nowhere near the route and is not named');
  assert.equal(also[0].level, 'plenty');
});

test('WP28: The kind being planned is not named again, and a route with none along it says nothing', () => {
  assert.deepEqual(alsoPasses(line, { parks: [cell(600, 60, 8)] }, ATLAS_ORDER, 'parks'), []);
  assert.equal(alsoLine([]), null);
});

test('WP28: The words name kinds and never places, with no digit', () => {
  assert.equal(alsoLine([{ kind: 'history', level: 'some' }, { kind: 'art', level: 'plenty' }]), 'Also passes some history and plenty of art');
  assert.equal(alsoLine([{ kind: 'history', level: 'some' }, { kind: 'art', level: 'some' }, { kind: 'viewpoints', level: 'some' }]), 'Also passes some history, some art and some views');
  const c = cases(3)[1];
  const r = planRoutes({ cells: c.cells, from: c.from, mode: 'oneway', ceilingM: 3500, density: 'anywhere' }, leg).routes[0];
  const w = rowWords({ ...r, also: [{ kind: 'history', level: 'some' }] }, 'km');
  assert.equal(w.also, 'Also passes some history');
  assert.ok(!/\d/.test(w.also!));
});

test('WP28: A find changes nothing: the cells count every place of a kind, found or not', () => {
  const cells = [cell(600, 60, 8), cell(1000, 60, 8)];
  assert.deepEqual(alsoPasses(line, { history: cells }, ATLAS_ORDER, 'parks'), alsoPasses(line, { history: cells.map((c) => ({ ...c })) }, ATLAS_ORDER, 'parks'));
});
