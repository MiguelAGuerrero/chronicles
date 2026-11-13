/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as nt from '../../noteType';

test('NY19: a tap on a type marks the note, a tap on the marked one clears it', { todo: 'test first' }, () => {
  const pick = (nt as unknown as { pickType: (now: string | null, tapped: string) => string | null }).pickType;
  assert.equal(pick(null, 'idea'), 'idea');
  assert.equal(pick('idea', 'sad'), 'sad');
  assert.equal(pick('idea', 'idea'), null);
  // A stored value outside the set is no type (NY2): any tap marks.
  assert.equal(pick('sparkle', 'like'), 'like');
});

test('NY24: a type chosen on a new page waits for the note, and a page with no words keeps nothing', { todo: 'test first' }, () => {
  const wish = (nt as unknown as { typeForNewNote: (o: { kept: boolean; chosen: string | null }) => 'set' | 'wait' | 'none' }).typeForNewNote;
  assert.equal(wish({ kept: false, chosen: 'idea' }), 'wait');
  assert.equal(wish({ kept: true, chosen: 'idea' }), 'set');
  assert.equal(wish({ kept: true, chosen: null }), 'set');
  assert.equal(wish({ kept: false, chosen: null }), 'none');
});
