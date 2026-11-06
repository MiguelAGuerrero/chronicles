import assert from 'node:assert/strict';
import test from 'node:test';
import { layersCorner, scaleInsetBottom } from '../../stackSlots';

// fix layers-pad: on the ready screen the map ends at the strip's top (a spacer holds the strip's place), on the walk it runs under
// the strip. The scale bar's inset is measured from the map's own bottom, so it differs; both put the bar just above the strip.

const C = { barTop: 100, sideInset: 16, scaleBottom: 12, scaleH: 32, edge: 44 };

test('fix layers-pad 3: the scale bar is just above the strip in both states, from the screen\'s bottom', () => {
  const walk = scaleInsetBottom({ barTop: 100, scaleBottom: 12, mapEndsAtStrip: false });
  const ready = scaleInsetBottom({ barTop: 100, scaleBottom: 12, mapEndsAtStrip: true });
  assert.equal(walk, 112, 'the walk\'s map runs under the strip: the strip\'s height plus the gap');
  assert.equal(ready, 12, 'the ready map ends at the strip: the gap alone');
  assert.equal(100 + ready, walk, 'the same place on the screen');
});

test('fix layers-pad 4: the Layers button clears the scale bar in both states', () => {
  const c = layersCorner(C);
  for (const mapEndsAtStrip of [true, false]) {
    const fromScreenBottom = (mapEndsAtStrip ? C.barTop : 0) + scaleInsetBottom({ barTop: C.barTop, scaleBottom: C.scaleBottom, mapEndsAtStrip });
    assert.ok(c.bottom >= fromScreenBottom + C.scaleH, `button bottom ${c.bottom} is under the scale bar's top ${fromScreenBottom + C.scaleH} (map ends at strip: ${mapEndsAtStrip})`);
  }
});
