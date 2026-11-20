/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { arrival } from '../../replay';

// The owner's yes to T41 (Nov 19, "Yes, as recommended"): a capture of the walk that lands after its replay opened (a memo
// still being saved through the bar's Stop, decision 0227) is taken in by the open replay: placed on its map and played in
// its next Watch again, with no new words, no indicator, and the beats and their order unchanged.
test('tend replay T41: the open replay takes in a capture of its walk that lands after it opened, at the card, never mid-telling', () => {
  // On the card and the name step its walk is read again at once, and the capture pinned there; so is a change to one
  // (its place found, its thumbnail made).
  assert.deepEqual(arrival(false, { heard: 'card' }), { late: false, read: true });
  assert.deepEqual(arrival(false, { heard: 'name' }), { late: false, read: true });
  // While the walk is read or told, nothing changes under the telling: it waits for the card.
  for (const beat of ['reading', 'fog', 'path'] as const) assert.deepEqual(arrival(false, { heard: beat }), { late: true, read: false }, beat);
  assert.deepEqual(arrival(true, { heard: 'path' }), { late: true, read: false });
  // The card comes: what waited is read, once; with nothing waiting, nothing is read.
  assert.deepEqual(arrival(true, { to: 'card' }), { late: false, read: true });
  assert.deepEqual(arrival(false, { to: 'card' }), { late: false, read: false });
  // Watch again (the fog, then the path) keeps it waiting; the name step, as the card, reads it.
  assert.deepEqual(arrival(true, { to: 'fog' }), { late: true, read: false });
  assert.deepEqual(arrival(true, { to: 'path' }), { late: true, read: false });
  assert.deepEqual(arrival(true, { to: 'name' }), { late: false, read: true });
});

test('tend replay T41: the replay screen hears its walk on the capture bus and steps each arrival and each beat through `arrival`', () => {
  const text = readFileSync(join(__dirname, '../../../app/replay/[id].tsx'), 'utf8');
  // It listens for its own walk, a capture kept and a change to one alike.
  assert.match(text, /captureBus\.subscribe\(id, self, heard, heard\)/);
  // News heard and each beat it moves to go through the one decision.
  assert.match(text, /arrival\(late\.current, \{ heard: told\.current \}\)/);
  assert.match(text, /arrival\(late\.current, \{ to: b \}\)/);
});
