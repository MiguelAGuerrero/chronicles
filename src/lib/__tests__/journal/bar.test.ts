/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as core from '../../journal/bar';

const bar = async () => core;

test("chronicle-journal audit 62: the foot's room is the same whether the bar or the row is drawn, and holds a message taller than the bar", async () => {
  const { footRoom } = await bar();
  assert.equal(footRoom({ barH: 61, aboveH: 114, under: 0, lift: 0 }), 114);
  assert.equal(footRoom({ barH: 61, aboveH: 0, under: 0, lift: 0 }), 61);
});

test("chronicle-journal audit 63: the room kept for an iPhone's keyboard row counts only while the keyboard is up", async () => {
  const { footRoom } = await bar();
  // barH is the bar's own height, measured without the accessory room; at rest under is 0 and nothing above moves.
  assert.equal(footRoom({ barH: 61, aboveH: 0, under: 56, lift: 300 }), 61 + 56 + 300);
  assert.equal(footRoom({ barH: 61, aboveH: 0, under: 0, lift: 0 }), 61);
});
