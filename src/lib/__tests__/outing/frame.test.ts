/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { outingFrame, outingHeld, SCALE_ROW_H } from '../../outing/map';

// The outing page's map over its sheet (tend map 24 and the diff review's fixes, Nov 20).
const SRC = join(__dirname, '..', '..', '..');

// tend map audit 50 (the diff review's ux U1): the scale bar and the credits (i) sit 12 px above the sheet, so a frame
// whose foot was also the sheet's top + 12 laid its lowest stop under them.
test('tend map audit 50: the outing frame keeps its stops above the scale row, which stays 12 px over the sheet', () => {
  for (const sheetH of [0, 120, 400, 641]) {
    const f = outingFrame({ sheetH, insetTop: 0 });
    assert.equal(f.scaleInset.bottom, sheetH + 12);
    assert.ok(f.padding.bottom >= f.scaleInset.bottom + SCALE_ROW_H + 8, `${sheetH}: ${f.padding.bottom}`);
    assert.ok(f.padding.top >= 64, 'below the field');
  }
  assert.ok(SCALE_ROW_H >= 24, 'the bar\'s label and line, and the (i)\'s 24 px');
  const page = readFileSync(join(SRC, 'components', 'outing', 'OutingPage.tsx'), 'utf8');
  assert.match(page, /outingFrame\(/, 'the page frames through outingFrame');
});

// tend map audit 49 (the diff review's auditor 3): a change of the sheet's height frames the journey again only while
// the map is still where its last fit left it; one the person moved by hand is never taken back.
test('tend map audit 49: a sheet height change frames again only while the map was not moved by hand', () => {
  const content = 'j1';
  assert.deepEqual(outingHeld(null, content, { sheetH: 300, width: 390 }), { sheetH: 300, width: 390 });
  const moved = { content, sheetH: 300, width: 390 };
  assert.deepEqual(outingHeld(moved, content, { sheetH: 520, width: 390 }), { sheetH: 300, width: 390 }, 'held at the height the hand found');
  assert.deepEqual(outingHeld(moved, 'j2', { sheetH: 520, width: 390 }), { sheetH: 520, width: 390 }, 'a new journey frames afresh');
});
