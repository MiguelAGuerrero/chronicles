/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hoodGround } from '../../areas/hoods';
import { inOutline, outlineSet, withOutlines } from '../../areas/outlines';
import { at, hoodPoint, square, squaresTile, townPoint } from './hoodFixture';

// Neighborhood boundaries, the UX review's regression tests (decision 0145): `neighborhood-boundaries ui N`.

test('neighborhood-boundaries ui 1: a share stays inside the town border that holds its point, as the line and the border agree', () => {
  const set = outlineSet([squaresTile({ towns: [{ id: 'a', name: 'A', polygons: square(-10, -10, 10, 10) }] })]);
  const cands = withOutlines([townPoint('A', at(0, 0), 3000), hoodPoint('Edge', at(8, 0))], set);
  const g = hoodGround(cands.find((c) => c.name === 'Edge')!, cands, set)!;
  assert.ok(inOutline(at(9, 0), g), 'inside the town, within reach: its ground');
  assert.ok(!inOutline(at(12, 0), g), 'past the border, still within 1 km of its point: not its ground');
  assert.ok(!inOutline(at(12, 5), g));
});

test('neighborhood-boundaries ui 2: a share\'s edge is smooth: no corner of the grid, every turn gentle', () => {
  const set = outlineSet([squaresTile({ towns: [{ id: 'a', name: 'A', polygons: square(-60, -60, 60, 60) }] })]);
  const cands = withOutlines([townPoint('A', at(0, 0), 3000), hoodPoint('Round', at(0, 0))], set);
  const g = hoodGround(cands.find((c) => c.name === 'Round')!, cands, set)!;
  const all = g.polygons[0][0].slice(0, -1);
  const k = Math.cos((all[0][1] * Math.PI) / 180);
  // As a person sees it: the line sampled every 8 m or more (a 3 m kink is under a pixel at street zoom).
  const metres = (p: number[], q: number[]) => Math.hypot((q[0] - p[0]) * k * 111_320, (q[1] - p[1]) * 110_540);
  const ring = all.filter((p, i) => i === 0 || metres(p, all[i - 1]) > 0).reduce<number[][]>((out, p) => (!out.length || metres(out[out.length - 1], p) >= 8 ? [...out, p] : out), []);
  let worst = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[(i + ring.length - 1) % ring.length];
    const b = ring[i];
    const c = ring[(i + 1) % ring.length];
    const v1 = [(b[0] - a[0]) * k, b[1] - a[1]];
    const v2 = [(c[0] - b[0]) * k, c[1] - b[1]];
    const turn = Math.abs(Math.atan2(v1[0] * v2[1] - v1[1] * v2[0], v1[0] * v2[0] + v1[1] * v2[1])) * (180 / Math.PI);
    worst = Math.max(worst, turn);
  }
  assert.ok(worst < 50, `the sharpest turn is ${worst.toFixed(0)} degrees (a grid's corner is 90)`);
});
