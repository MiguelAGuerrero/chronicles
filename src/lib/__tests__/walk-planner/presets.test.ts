import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceM } from '../../geo';
import type { Cell } from '../../kindWalk/density';
import { PRESET_IDS, priority } from '../../walkPlanner/presets';
import { at } from './grid';

const cell = (e: number, n: number, count: number): Cell => ({ at: at(e, n), count });
// Six dense cells: a clump of three near (200, 200) with the densest, two far east, one far north.
const cells = [cell(200, 200, 9), cell(300, 220, 7), cell(240, 320, 6), cell(1200, 200, 5), cell(1250, 260, 4), cell(220, 1200, 3)];

test('WP5: The three presets, in a fixed order by preset', () => {
  assert.deepEqual([...PRESET_IDS], ['middle', 'across', 'edge']);
});

test('WP5: "Through the middle" tries the cells nearest the middle of where the kind is first', () => {
  const p = priority('middle', cells);
  assert.equal(p.length, 6);
  assert.ok(distanceM(p[0].at, cells[0].at) < 400, 'the clump is nearest the weighted middle');
  assert.ok(distanceM(p[5].at, at(1250, 260)) < 5 || distanceM(p[5].at, at(220, 1200)) < 5, 'the furthest flung come last');
});

test('WP5: "Across the area" starts with the two cells furthest apart, then those nearest the line between them', () => {
  const p = priority('across', cells);
  const ends = [p[0], p[1]];
  const far = Math.max(...cells.flatMap((a) => cells.map((b) => distanceM(a.at, b.at))));
  assert.ok(Math.abs(distanceM(ends[0].at, ends[1].at) - far) < 1, 'the first two are the furthest apart');
});

test('WP5: "Around the edge" tries the cells furthest from the densest first, and the densest last', () => {
  const p = priority('edge', cells);
  assert.ok(distanceM(p[0].at, cells[0].at) >= distanceM(p[1].at, cells[0].at));
  assert.equal(p[p.length - 1].count, 9, 'the densest cell is last');
});

test('WP5: The same inputs give the same order, whichever way the cells arrive', () => {
  for (const id of PRESET_IDS) assert.deepEqual(priority(id, cells), priority(id, [...cells].reverse()));
});

test('WP13: A later round starts from another of the dense cells, never from a less dense set', () => {
  const r0 = priority('middle', cells, 0);
  const r1 = priority('middle', cells, 1);
  assert.notDeepEqual(r0[0], r1[0]);
  assert.deepEqual([...r1].sort((a, b) => b.count - a.count), [...r0].sort((a, b) => b.count - a.count), 'the same cells, rotated');
});
