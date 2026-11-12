/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PEN_START, hasWords, penStep, type PenEffect, type PenEvent, type PenState } from '../../journal/pen';
import { OPEN_MS, WALK_ON_M, initial, openId, step } from '../../openMoment';
import { keyboardLift } from '../../journal/keyboard';
import { refToken } from '../../refs';

const run = (events: PenEvent[], from: PenState = PEN_START) => {
  let state = from;
  const effects: PenEffect[] = [];
  for (const e of events) {
    const r = penStep(state, e);
    state = r.state;
    effects.push(...r.effects);
  }
  return { state, effects };
};
const E = { momentId: 'm1', pieceId: 'p1' };

test('JN12: the first character begins an entry, once', () => {
  const r = run([{ k: 'type', body: 'A' }, { k: 'type', body: 'A h' }]);
  assert.deepEqual(r.effects, [{ k: 'begin', body: 'A' }]);
  assert.equal(r.state.beginning, true);
  // Spaces alone begin nothing.
  assert.deepEqual(run([{ k: 'type', body: '   ' }]).effects, []);
});

test('JN13: saved as typed, never twice the same, an emptied entry removed', () => {
  const r = run([{ k: 'type', body: 'A' }, { k: 'type', body: 'A heron' }, { k: 'began', ...E, body: 'A' }]);
  assert.deepEqual(r.effects.at(-1), { k: 'save', ...E, body: 'A heron' });
  const again = run([{ k: 'saved', body: 'A heron' }, { k: 'type', body: 'A heron' }], r.state);
  assert.deepEqual(again.effects, []);
  const emptied = run([{ k: 'saved', body: 'A heron' }, { k: 'type', body: '' }], r.state);
  assert.deepEqual(emptied.effects, [{ k: 'drop', ...E }]);
  assert.equal(emptied.state.entry, null);
  // Emptied before the store answered: dropped as soon as it does.
  const early = run([{ k: 'type', body: 'A' }, { k: 'type', body: '' }, { k: 'began', ...E, body: 'A' }]);
  assert.deepEqual(early.effects.at(-1), { k: 'drop', ...E });
});

test('JN13: a failed save is said, the words held, and Retry writes them', () => {
  const typed = run([{ k: 'type', body: 'A' }, { k: 'began', ...E, body: 'A' }, { k: 'type', body: 'A heron' }]);
  const failed = run([{ k: 'saveFailed' }], typed.state);
  assert.equal(failed.state.failed, true);
  assert.equal(failed.state.body, 'A heron');
  const retried = run([{ k: 'retry' }], failed.state);
  assert.deepEqual(retried.effects, [{ k: 'save', ...E, body: 'A heron' }]);
  assert.equal(run([{ k: 'saved', body: 'A heron' }], retried.state).state.failed, false);
  // A begin that failed holds the words too, and Retry begins again.
  const noBegin = run([{ k: 'type', body: 'A' }, { k: 'beginFailed' }]);
  assert.equal(noBegin.state.failed, true);
  assert.deepEqual(run([{ k: 'retry' }], noBegin.state).effects, [{ k: 'begin', body: 'A' }]);
});

test('JN15: Done writes what is typed, empties the line and ends the entry', () => {
  const typed = run([{ k: 'type', body: 'A' }, { k: 'began', ...E, body: 'A' }, { k: 'type', body: 'A heron' }]);
  const done = run([{ k: 'done' }], typed.state);
  assert.deepEqual(done.effects.slice(-3), [{ k: 'save', ...E, body: 'A heron' }, { k: 'clear' }, { k: 'end' }]);
  assert.deepEqual(done.state, PEN_START);
  // Done with nothing written ends the open entry all the same (a photo's entry, closed by hand).
  assert.deepEqual(run([{ k: 'done' }]).effects, [{ k: 'end' }]);
});

test('JN15: a photo or memo kept leaves the words as their own piece, and the entry open', () => {
  const typed = run([{ k: 'type', body: 'A' }, { k: 'began', ...E, body: 'A' }, { k: 'type', body: 'A heron' }]);
  const kept = run([{ k: 'kept' }], typed.state);
  assert.deepEqual(kept.effects.slice(-2), [{ k: 'save', ...E, body: 'A heron' }, { k: 'clear' }]);
  assert.ok(!kept.effects.some((e) => e.k === 'end'));
  assert.deepEqual(kept.state, PEN_START);
});

test('JN15: Done while the begin is on its way still ends the entry once it is stored', () => {
  const r = run([{ k: 'type', body: 'A heron' }, { k: 'done' }, { k: 'began', ...E, body: 'A heron' }]);
  assert.deepEqual(r.effects.slice(-2), [{ k: 'clear' }, { k: 'end' }]);
  assert.deepEqual(r.state, PEN_START);
});

test('JN15: the entry that closed by itself lets go of the line', () => {
  const typed = run([{ k: 'type', body: 'A' }, { k: 'began', ...E, body: 'A' }, { k: 'type', body: 'A heron' }]);
  const closed = run([{ k: 'closed' }], typed.state);
  assert.deepEqual(closed.effects, [{ k: 'save', ...E, body: 'A heron' }, { k: 'clear' }]);
  assert.deepEqual(closed.state, PEN_START);
});

test('JN15: one entry until two minutes, leaving or 100 m; a keystroke counts as its last piece', () => {
  // The rules are moment stacks' (MS4, MS5), which the journal follows without the setting.
  let s = step(initial, { k: 'kept', id: 'm1', t: 0, walking: true });
  s = step(s, { k: 'piece', id: 'm1', t: 90_000 });
  assert.equal(openId(s, 90_000 + OPEN_MS - 1), 'm1');
  assert.equal(openId(s, 90_000 + OPEN_MS + 1), null);
  assert.equal(openId(step(s, { k: 'walked', m: WALK_ON_M + 1 }), 91_000), null);
  assert.equal(openId(step(s, { k: 'leave' }), 91_000), null);
});

test('JN16: a reference survives typing around it, and counts as words', () => {
  const ref = refToken('m9', 'the pier, Sep 11');
  assert.equal(hasWords(ref), true);
  assert.equal(hasWords(' \n '), false);
  const r = run([{ k: 'type', body: ref }, { k: 'began', ...E, body: ref }, { k: 'type', body: `Back at ${ref} again` }]);
  assert.deepEqual(r.effects.at(-1), { k: 'save', ...E, body: `Back at ${ref} again` });
});

test('JN19: the foot lifts by what the keyboard hides, and never while zoomed', () => {
  assert.equal(keyboardLift(844, 844, 0), 0);
  assert.equal(keyboardLift(844, 508, 0), 336);
  assert.equal(keyboardLift(844, 508, 40), 296);
  assert.equal(keyboardLift(844, 900, 0), 0);
  assert.equal(keyboardLift(844, 422, 100, 2), 0);
});
