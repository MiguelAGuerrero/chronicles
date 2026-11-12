/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nextShown, type ShownComplexes } from '../../complexes/shown';
import type { Complex } from '../../complexes/types';

// explore-dense-city audit 10 (and DC12), written before the fix.

const c = { id: 'arcade', name: 'The Arcade' } as unknown as Complex;

test('explore-dense-city audit 10: an empty read of the area shown clears it; an empty read of another area renders nothing', { todo: 'test first' }, () => {
  const shownA: ShownComplexes = { key: 'A', complexes: [c], partial: true };
  // A read again, now in full and with none: the card must stop showing the old ones.
  assert.deepEqual(nextShown(shownA, 'A', { complexes: [], partial: false }), { key: 'A', complexes: [], partial: false });
  // B, never shown, read with none: the same object, so React renders nothing (any other key already reads as none).
  assert.equal(nextShown(shownA, 'B', { complexes: [], partial: false }), shownA);
  // B with some: shown.
  assert.deepEqual(nextShown(shownA, 'B', { complexes: [c], partial: false }), { key: 'B', complexes: [c], partial: false });
  // The same result again for the area shown: the same object.
  const shownB: ShownComplexes = { key: 'B', complexes: [c], partial: false };
  assert.equal(nextShown(shownB, 'B', { complexes: [c], partial: false }), shownB);
});
