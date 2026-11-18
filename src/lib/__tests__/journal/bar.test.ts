/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as core from '../../journal/bar';

const bar = async () => core;

// Corrected by tend tabs audit 34 to the owner's answer of Nov 18 (decision 0208, "Fix it in this run"): the messages
// stand above the toolbar, not beside it, so the foot keeps room for both.
test("chronicle-journal audit 62: the foot's room is the same whether the bar or the row is drawn, and holds a message over the bar", async () => {
  const { footRoom } = await bar();
  assert.equal(footRoom({ barH: 61, aboveH: 114, under: 0, lift: 0 }), 61 + 114);
  assert.equal(footRoom({ barH: 61, aboveH: 0, under: 0, lift: 0 }), 61);
});

// tend tabs audit 34 (the T37 review's ux 1, auditor 3, steward 5; the owner's answer of Nov 18, decision 0208): at
// 320 px the storage notice covered the newest entry's actions, since the foot kept room for the toolbar or its
// messages, whichever was taller, never both.
test('tend tabs audit 34: a 56 px message over a 61 px bar adds its room to the foot', async () => {
  const { footRoom } = await bar();
  assert.equal(footRoom({ barH: 61, aboveH: 56, under: 0, lift: 0 }), 117);
  assert.equal(footRoom({ barH: 61, aboveH: 56, under: 56, lift: 300 }), 117 + 56 + 300, 'and the keyboard\'s room beside it');
});

test("chronicle-journal audit 63: the room kept for an iPhone's keyboard row counts only while the keyboard is up", async () => {
  const { footRoom } = await bar();
  // barH is the bar's own height, measured without the accessory room; at rest under is 0 and nothing above moves.
  assert.equal(footRoom({ barH: 61, aboveH: 0, under: 56, lift: 300 }), 61 + 56 + 300);
  assert.equal(footRoom({ barH: 61, aboveH: 0, under: 0, lift: 0 }), 61);
});
