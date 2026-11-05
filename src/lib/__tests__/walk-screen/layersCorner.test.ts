import assert from 'node:assert/strict';
import test from 'node:test';
import { cornerPanelBox } from '../../layers/layout';
import { EDGE_INDEX, layersCorner, pillsBottom } from '../../stackSlots';

// fix layers-corner: the Layers button left the right column's top, where the navigation bar's End button sat
// under it, for the bottom-left corner above the scale bar (the owner, Nov 5).

const C = { barTop: 100, sideInset: 16, scaleBottom: 12, scaleH: 32, edge: 44 };

test('fix layers-corner 1: the right column has four edge slots, and the compass is its top', () => {
  assert.deepEqual(Object.values(EDGE_INDEX).sort(), [0, 1, 2, 3]);
  assert.equal(Math.max(...Object.values(EDGE_INDEX)), EDGE_INDEX.compass);
});

test('fix layers-corner 2: the button sits above the scale bar in the left corner, on the side inset', () => {
  const c = layersCorner(C);
  assert.equal(c.left, 28);
  assert.equal(c.bottom, 100 + 12 + 32 + 8);
  assert.equal(c.top, c.bottom + 44);
});

test('fix layers-corner 3: the pills stack above the button, never under it', () => {
  const c = layersCorner(C);
  assert.equal(pillsBottom(c), c.top + 8);
});

test('fix layers-corner 4: the panel opens beside the button and stays clear of the capture column and the top overlay', () => {
  for (const [w, h] of [[360, 640], [390, 844], [1280, 800]] as const) {
    const left = Math.max(16, (w - 640) / 2) + 12;
    const rightClear = Math.max(16, (w - 640) / 2 + 16) + 56 + 8;
    const c = layersCorner({ ...C, sideInset: left - 12 });
    const b = cornerPanelBox({ windowW: w, windowH: h, left, bottom: c.bottom, button: 44, rightClear, clearTop: 152 });
    assert.ok(left + 44 + 8 + b.width <= w - rightClear, `${w}: width ${b.width} runs into the capture column`);
    assert.ok(c.bottom + 44 + b.maxHeight <= h - 152, `${w}x${h}: height ${b.maxHeight} runs into the top overlay`);
  }
});

test('fix layers-corner audit 1, 2: in the corner the Layers button is under the walk cards and the drawer', () => {
  const { readFileSync } = require('node:fs') as typeof import('node:fs');
  const { join } = require('node:path') as typeof import('node:path');
  const src = (f: string) => readFileSync(join(__dirname, '..', '..', '..', f), 'utf8');
  const z = (re: RegExp, text: string) => Number(re.exec(text)?.[1]);
  const corner = z(/CORNER_Z = (\d+)/, src('components/LayersControl.tsx'));
  const card = z(/const cardAt = \{[^}]*zIndex: (\d+)/, src('app/walk.tsx'));
  const drawer = z(/overflow: 'hidden', zIndex: (\d+)/, src('components/walk/ReadyBar.tsx'));
  assert.ok(corner < card && card < drawer, `corner ${corner}, cards ${card}, drawer ${drawer}`);
});
