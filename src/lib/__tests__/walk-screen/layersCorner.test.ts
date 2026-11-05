import assert from 'node:assert/strict';
import test from 'node:test';
import { EDGE_INDEX, layersCorner, pillsBottom } from '../../stackSlots';

// fix layers-corner: the layers (walkability) button left the right column's top, where the navigation
// bar's End button sat under it, for the bottom-left corner above the scale bar (the owner, Nov 5).

test('fix layers-corner 1: the right column has four edge slots, and the compass is its top', () => {
  assert.deepEqual(Object.keys(EDGE_INDEX).sort(), ['back', 'compass', 'locate', 'unwalked']);
  assert.equal(Math.max(...Object.values(EDGE_INDEX)), EDGE_INDEX.compass);
});

test('fix layers-corner 2: the button sits above the scale bar in the left corner, on the side inset', () => {
  const c = layersCorner({ barTop: 100, sideInset: 16, scaleBottom: 12, scaleH: 32, edge: 44 });
  assert.equal(c.left, 28);
  assert.equal(c.bottom, 100 + 12 + 32 + 8);
  assert.equal(c.top, c.bottom + 44);
});

test('fix layers-corner 3: the pills stack above the button, never under it', () => {
  const c = layersCorner({ barTop: 100, sideInset: 16, scaleBottom: 12, scaleH: 32, edge: 44 });
  assert.ok(pillsBottom(c) >= c.top);
  assert.equal(pillsBottom(c), c.top + 8);
});
