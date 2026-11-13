/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { NoteType } from '../../noteType';
import * as nt from '../../noteTypeChoice';

test('NY19: a tap on a type marks the note, a tap on the marked one clears it', () => {
  const pick = (now: string | null, tapped: string) => nt.pickType(now, tapped as NoteType);
  assert.equal(pick(null, 'idea'), 'idea');
  assert.equal(pick('idea', 'sad'), 'sad');
  assert.equal(pick('idea', 'idea'), null);
  // A stored value outside the set is no type (NY2): any tap marks.
  assert.equal(pick('sparkle', 'like'), 'like');
});

test('NY24: a type chosen on a new page waits for the note, and a page with no words keeps nothing', () => {
  const wish = nt.typeForNewNote;
  assert.equal(wish({ kept: false, chosen: 'idea' }), 'wait');
  assert.equal(wish({ kept: true, chosen: 'idea' }), 'set');
  assert.equal(wish({ kept: true, chosen: null }), 'set');
  assert.equal(wish({ kept: false, chosen: null }), 'none');
});
