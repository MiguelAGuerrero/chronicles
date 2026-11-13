/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NOTE_SAVE_PAUSE } from '../../motionTokens';
import { startSave, stepSave, type SaveEvent, type SaveState } from '../../notePage/autosave';

// Note pages NP9 (specs/note-pages, decision 0151): what is written is kept as it is written, with no question.

const run = (s: SaveState, ...events: SaveEvent[]) => {
  const effects = [];
  for (const e of events) {
    const r = stepSave(s, e);
    s = r.state;
    effects.push(...r.effects);
  }
  return { s, effects };
};

test('NP9: a pause in typing keeps a new page as a moment, then saves it as it changes', () => {
  const a = run(startSave({ kept: false, body: '', now: 0 }), { type: 'edit', text: 'The figs', now: 100 }, { type: 'tick', now: 100 + NOTE_SAVE_PAUSE - 1 });
  assert.deepEqual(a.effects, []);
  const b = run(a.s, { type: 'tick', now: 100 + NOTE_SAVE_PAUSE });
  assert.deepEqual(b.effects, [{ type: 'create', body: 'The figs' }]);
  const c = run(b.s, { type: 'saved', text: 'The figs' }, { type: 'edit', text: 'The figs are gone', now: 5000 }, { type: 'tick', now: 5000 + NOTE_SAVE_PAUSE });
  assert.deepEqual(c.effects, [{ type: 'save', body: 'The figs are gone' }]);
});

test('NP9: leaving and the background keep what is written at once, with no question', () => {
  const kept = startSave({ kept: true, body: 'old', now: 0 });
  assert.deepEqual(run(kept, { type: 'edit', text: 'new', now: 10 }, { type: 'leave' }).effects, [{ type: 'save', body: 'new' }]);
  assert.deepEqual(run(kept, { type: 'edit', text: 'new', now: 10 }, { type: 'background' }).effects, [{ type: 'save', body: 'new' }]);
  assert.deepEqual(run(kept, { type: 'leave' }).effects, []);
});

test('NP9: a new page left with nothing written keeps nothing', () => {
  assert.deepEqual(run(startSave({ kept: false, body: '', now: 0 }), { type: 'edit', text: '  \n', now: 1 }, { type: 'tick', now: 5000 }, { type: 'leave' }).effects, []);
});

test('NP9: an emptied page never stores an empty body; only leaving it empty deletes (the steward)', () => {
  const kept = startSave({ kept: true, body: 'old words', now: 0 });
  const paused = run(kept, { type: 'edit', text: '', now: 10 }, { type: 'tick', now: 10 + NOTE_SAVE_PAUSE * 3 }, { type: 'background' });
  assert.deepEqual(paused.effects, []);
  assert.deepEqual(run(paused.s, { type: 'leave' }).effects, [{ type: 'delete' }]);
});

test('NP9: a failed save keeps the words, and is tried again on the next change and on the way out', () => {
  const a = run(startSave({ kept: true, body: 'a', now: 0 }), { type: 'edit', text: 'ab', now: 0 }, { type: 'tick', now: NOTE_SAVE_PAUSE }, { type: 'failed' });
  assert.equal(a.s.failed, true);
  assert.equal(a.s.text, 'ab');
  assert.deepEqual(run(a.s, { type: 'tick', now: NOTE_SAVE_PAUSE * 5 }).effects, []);
  assert.deepEqual(run(a.s, { type: 'edit', text: 'abc', now: 9000 }, { type: 'tick', now: 9000 + NOTE_SAVE_PAUSE }).effects, [{ type: 'save', body: 'abc' }]);
  assert.deepEqual(run(a.s, { type: 'leave' }).effects, [{ type: 'save', body: 'ab' }]);
});

test('NP9: one save at a time; words typed meanwhile are saved once it lands', () => {
  const a = run(startSave({ kept: true, body: 'a', now: 0 }), { type: 'edit', text: 'ab', now: 0 }, { type: 'tick', now: NOTE_SAVE_PAUSE });
  const b = run(a.s, { type: 'edit', text: 'abc', now: 2000 }, { type: 'tick', now: 2000 + NOTE_SAVE_PAUSE }, { type: 'leave' });
  assert.deepEqual(b.effects, []);
  assert.deepEqual(run(b.s, { type: 'saved', text: 'ab' }).effects, [{ type: 'save', body: 'abc' }]);
});
