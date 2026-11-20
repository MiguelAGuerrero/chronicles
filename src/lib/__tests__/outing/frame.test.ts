/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { outingHeld } from '../../outing/map';

// The outing page's map over its sheet (tend map 24 and the diff review's fixes, Nov 20).

// tend map audit 49 (the diff review's auditor 3): a change of the sheet's height frames the journey again only while
// the map is still where its last fit left it; one the person moved by hand is never taken back.
test('tend map audit 49: a sheet height change frames again only while the map was not moved by hand', () => {
  const content = 'j1';
  assert.deepEqual(outingHeld(null, content, { sheetH: 300, width: 390 }), { sheetH: 300, width: 390 });
  const moved = { content, sheetH: 300, width: 390 };
  assert.deepEqual(outingHeld(moved, content, { sheetH: 520, width: 390 }), { sheetH: 300, width: 390 }, 'held at the height the hand found');
  assert.deepEqual(outingHeld(moved, 'j2', { sheetH: 520, width: 390 }), { sheetH: 520, width: 390 }, 'a new journey frames afresh');
});
