import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { CLEAR_TOP, cornerPanelBox, walkClearTop } from '../../layers/layout';
import { EDGE_INDEX, layersCorner, pillsBottom } from '../../stackSlots';

// fix layers-corner: the Layers button left the right column's top, where the navigation bar's End button sat
// under it, for the bottom-left corner above the scale bar (the owner, Nov 5).

const C = { barTop: 100, sideInset: 16, scaleBottom: 12, scaleH: 32, edge: 44 };

test('fix layers-corner 1: the right column has three edge slots since the unwalked button went (WB2), and the compass is its top', () => {
  assert.deepEqual(Object.values(EDGE_INDEX).sort(), [0, 1, 2]);
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

// Where I've been (WB2): the unwalked-streets button's slot goes, and the column closes up. Written before the code.
test('WB2: the column has no unwalked slot and no gap: Walk me back sits right above Locate\'s place, the compass on top', () => {
  const slots = EDGE_INDEX as unknown as Record<string, number>;
  assert.equal('unwalked' in slots, false);
  assert.deepEqual(slots, { locate: 0, back: 1, compass: 2 });
});

// tend walk-screen audit 19 (the diff review's auditor 3): T42's two-row navigation bar is 104 px, not the 56 the corner
// panel's 152 px ceiling assumed; the ceiling grows with it, so the panel stops above the chip under the bar.
test('tend walk-screen audit 19: while navigating, the corner panel stays below the two-row bar and the chip under it', () => {
  assert.equal(walkClearTop(0, null), CLEAR_TOP);
  assert.equal(walkClearTop(20, 56), 20 + CLEAR_TOP);
  assert.equal(walkClearTop(0, 104), CLEAR_TOP + 48);
  // 320 x 700, navigating: the bar from top 4 to 108, the chip row (44) and a notice row (44) under it, 8 apart.
  const chipBottom = 4 + 104 + 8 + 44 + 8 + 44;
  const c = layersCorner({ ...C, barTop: 69 });
  const b = cornerPanelBox({ windowW: 320, windowH: 700, left: 28, bottom: c.bottom, button: 44, rightClear: 80, clearTop: walkClearTop(0, 104) });
  const panelTop = 700 - c.bottom - b.maxHeight;
  assert.ok(panelTop >= chipBottom - 8, `the panel's top ${panelTop} reaches the chips under the bar (${chipBottom})`);
  // Wired: the walk screen's Layers panel takes its ceiling from the bar's height while navigating.
  const walk = readFileSync(join(__dirname, '..', '..', '..', 'app', 'walk.tsx'), 'utf8');
  assert.match(walk, /<LayersControl map="walk"[^>]*clearTop=\{walkClearTop\(at\.insets\.top, navigation\.nav \? navBarH \|\| NAV_BAR_H : null\)\}/);
});
