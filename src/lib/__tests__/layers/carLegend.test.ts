/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LAYERS } from '../../layers/registry';

// Walkability car ground: the legend (CG5), written from specs/walkability-car-ground/spec.md before the code.

test('CG5: Walkability\'s legend is one row, Built around cars, its swatch the hatch and its icon the car', () => {
  const walk = LAYERS.find((l) => l.id === 'walkability')!;
  assert.equal(walk.legend.length, 1, 'one row');
  const [row] = walk.legend;
  assert.deepEqual([row.key, row.text, row.swatch, row.band], ['car', 'Built around cars', 'car', 'car']);
  assert.ok(row.tip && !/\d/.test(row.tip), 'its tip in words');
});
