import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as mod from '../../noteType';
import { markOf, NOTE_TYPES, noteTypeOf } from '../../noteType';

// Note types (specs/note-types, decision 0149): a core model, the owner's own mark on a note.

const ORDER = ['question', 'emphasis', 'idea', 'happy', 'neutral', 'sad', 'like', 'dislike'];

test('NY1: eight types in a fixed order, each with a distinct glyph and a spoken name, the lows among them', () => {
  assert.deepEqual(NOTE_TYPES.map((t) => t.id), ORDER);
  assert.equal(new Set(NOTE_TYPES.map((t) => t.glyph)).size, 8);
  assert.ok(NOTE_TYPES.every((t) => t.glyph && t.name.length > 0));
  assert.ok(NOTE_TYPES.some((t) => t.id === 'sad') && NOTE_TYPES.some((t) => t.id === 'dislike'));
});

test('NY2: a stored value outside the set reads as no type', () => {
  assert.equal(noteTypeOf('idea'), 'idea');
  for (const bad of ['', 'angry', 42, {}, null, undefined, 'IDEA']) assert.equal(noteTypeOf(bad), null);
});

test('NY3: a note\'s mark is its type\'s glyph, the generic note glyph (no mark) without one, and never on a photo, video or memo', () => {
  assert.equal(markOf({ kind: 'text', note_type: 'question' })?.id, 'question');
  assert.equal(markOf({ kind: 'text', note_type: null }), null);
  assert.equal(markOf({ kind: 'text' }), null);
  assert.equal(markOf({ kind: 'text', note_type: 'nonsense' }), null);
  for (const kind of ['photo', 'video', 'voice']) assert.equal(markOf({ kind, note_type: 'question' }), null);
});

test('NY11: every type has its own spoken name, so the glyph is never the only way to tell them apart', () => {
  assert.equal(new Set(NOTE_TYPES.map((t) => t.name)).size, 8);
});

test('NY13: nothing in the model takes a note\'s text, time or place: its functions take one stored value', () => {
  assert.ok(NOTE_TYPES.length > 0, 'the set exists');
  for (const [name, fn] of Object.entries(mod)) if (typeof fn === 'function') assert.ok(fn.length <= 1, `${name} takes at most one argument`);
});
