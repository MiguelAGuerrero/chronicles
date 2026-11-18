/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chronicleSection } from '../../resurface/sectionStore';

test('chronicle-journal audit 9: a moment asked for on the map and never taken is dropped when the section leaves Map', () => {
  chronicleSection.showMoment([-71.4, 41.8]);
  assert.equal(chronicleSection.store.get(), 'map');
  // Back to Memories before the map's read took it.
  chronicleSection.set('memories');
  assert.equal(chronicleSection.takeFocus(), null);
  // Taken once when the map does read.
  chronicleSection.showMoment([-71.4, 41.8]);
  assert.deepEqual(chronicleSection.takeFocus(), [-71.4, 41.8]);
  assert.equal(chronicleSection.takeFocus(), null);
  // Another tab drops it too.
  chronicleSection.showMoment([-71.4, 41.8]);
  chronicleSection.noteRoute('/explore');
  assert.equal(chronicleSection.takeFocus(), null);
});
