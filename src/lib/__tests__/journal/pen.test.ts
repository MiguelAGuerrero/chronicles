/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PEN_START, hasWords, penStep, type PenEffect, type PenEvent, type PenState } from '../../journal/pen';
import { OPEN_MS, WALK_ON_M, initial, openId, step } from '../../openMoment';
import * as keyboardRules from '../../journal/keyboard';
import { keyboardLift, lineLift } from '../../journal/keyboard';
import { spareFresh } from '../../journal/target';
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
  assert.deepEqual(retried.effects, [{ k: 'save', ...E, body: 'A heron', now: true }]);
  assert.equal(run([{ k: 'saved', body: 'A heron' }], retried.state).state.failed, false);
  // A begin that failed holds the words too, and Retry begins again.
  const noBegin = run([{ k: 'type', body: 'A' }, { k: 'beginFailed' }]);
  assert.equal(noBegin.state.failed, true);
  assert.deepEqual(run([{ k: 'retry' }], noBegin.state).effects, [{ k: 'begin', body: 'A' }]);
});

test('JN15: Done writes what is typed, empties the line and ends the entry', () => {
  const typed = run([{ k: 'type', body: 'A' }, { k: 'began', ...E, body: 'A' }, { k: 'type', body: 'A heron' }]);
  // What is typed is written at once, and the line empties only once it is known to be kept (audit 4).
  const done = run([{ k: 'done' }], typed.state);
  assert.deepEqual(done.effects, [{ k: 'save', ...E, body: 'A heron', now: true }]);
  const kept = run([{ k: 'saved', body: 'A heron' }], done.state);
  assert.deepEqual(kept.effects, [{ k: 'clear' }, { k: 'end' }]);
  assert.deepEqual(kept.state, PEN_START);
  // Done with nothing written ends the open entry all the same (a photo's entry, closed by hand).
  assert.deepEqual(run([{ k: 'done' }]).effects, [{ k: 'end' }]);
});

test('JN15: a photo or memo kept leaves the words as their own piece, and the entry open', () => {
  const typed = run([{ k: 'type', body: 'A' }, { k: 'began', ...E, body: 'A' }, { k: 'type', body: 'A heron' }]);
  const kept = run([{ k: 'kept' }, { k: 'saved', body: 'A heron' }], typed.state);
  assert.deepEqual(kept.effects, [{ k: 'save', ...E, body: 'A heron', now: true }, { k: 'clear' }]);
  assert.deepEqual(kept.state, PEN_START);
});

test('JN15: Done while the begin is on its way still ends the entry once it is stored', () => {
  const r = run([{ k: 'type', body: 'A heron' }, { k: 'done' }, { k: 'began', ...E, body: 'A heron' }]);
  assert.deepEqual(r.effects.slice(-2), [{ k: 'clear' }, { k: 'end' }]);
  assert.deepEqual(r.state, PEN_START);
});

test('JN15: the entry that closed by itself lets go of the line', () => {
  const typed = run([{ k: 'type', body: 'A' }, { k: 'began', ...E, body: 'A' }, { k: 'type', body: 'A heron' }]);
  const closed = run([{ k: 'closed' }, { k: 'saved', body: 'A heron' }], typed.state);
  assert.deepEqual(closed.effects, [{ k: 'save', ...E, body: 'A heron', now: true }, { k: 'clear' }]);
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

test('chronicle-journal audit 4: a save that fails as the line lets go keeps the words in the line, for Retry', () => {
  const typed = run([{ k: 'type', body: 'A' }, { k: 'began', ...E, body: 'A' }, { k: 'type', body: 'A heron' }]);
  const failed = run([{ k: 'done' }, { k: 'saveFailed' }], typed.state);
  assert.ok(!failed.effects.some((e) => e.k === 'clear' || e.k === 'end'), 'the line is not emptied');
  assert.equal(failed.state.body, 'A heron');
  assert.equal(failed.state.failed, true);
  // Retry writes them; kept, the line stays as it is for the owner to go on or tap Done again.
  const retried = run([{ k: 'retry' }, { k: 'saved', body: 'A heron' }], failed.state);
  assert.deepEqual(retried.effects, [{ k: 'save', ...E, body: 'A heron', now: true }]);
  assert.equal(retried.state.failed, false);
  assert.equal(retried.state.body, 'A heron');
});

test('chronicle-journal audit 4: after a begin failed, the next words begin again by themselves', () => {
  const r = run([{ k: 'type', body: 'A' }, { k: 'beginFailed' }, { k: 'type', body: 'A h' }]);
  assert.deepEqual(r.effects, [{ k: 'begin', body: 'A' }, { k: 'begin', body: 'A h' }]);
});

test('chronicle-journal audit 10: an entry that closed while its begin was on its way is let go once it is stored', () => {
  const r = run([{ k: 'type', body: 'A heron' }, { k: 'closed' }, { k: 'began', ...E, body: 'A heron' }]);
  assert.deepEqual(r.effects.at(-1), { k: 'clear' });
  assert.deepEqual(r.state, PEN_START);
});

test('chronicle-journal audit 5: a location read left by an emptied entry is aged from when it was read', () => {
  // Begun at 9:00, emptied at 9:20: a minute later the read is twenty-one minutes old, and not used.
  const read = 0;
  assert.equal(spareFresh(read, read + 21 * 60_000), false);
  assert.equal(spareFresh(read, read + 60_000), true);
});

test('chronicle-journal audit 1: the line lifts by what the keyboard covers above what sits under it', () => {
  // A 336 px keyboard over a line with an 82 px tab bar beneath it: the line rises 254.
  assert.equal(lineLift(336, 82), 254);
  assert.equal(lineLift(0, 82), 0);
  assert.equal(lineLift(60, 82), 0);
});

test('fix journal-note-pages audit 4: a save that fails after the line gave its entry to a page is not said on the empty line', () => {
  // The line handed its entry to the page and reset; a write begun before that fails late.
  const late = run([{ k: 'saveFailed' }]);
  assert.deepEqual(late.state, PEN_START);
  assert.deepEqual(late.effects, []);
  assert.deepEqual(run([{ k: 'saved', body: 'A heron' }]).state, PEN_START);
});

test('fix keyboard-accessory: the bar clears the keyboard\'s own floating row where the phone draws one over the page', () => {
  const k = keyboardRules;
  const modern = (q: string) => q.startsWith('anchor-name');
  const old = () => false;
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
  // An iPhone whose engine is the one that floats the row (the Home Screen app's agent names no version, so the engine is asked).
  assert.equal(k.floatsAccessory({ ua: iphone, touchPoints: 5, supports: modern }), true);
  // An older iPhone docks the row to the keyboard, inside what the keyboard is measured to cover.
  assert.equal(k.floatsAccessory({ ua: iphone, touchPoints: 5, supports: old }), false);
  // An iPad asking for the desktop site says Macintosh, with touch; a Mac has no touch; Android and desktop Chrome draw no row.
  const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15';
  assert.equal(k.floatsAccessory({ ua: mac, touchPoints: 5, supports: modern }), true);
  assert.equal(k.floatsAccessory({ ua: mac, touchPoints: 0, supports: modern }), false);
  assert.equal(k.floatsAccessory({ ua: 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36', touchPoints: 5, supports: modern }), false);
  // Room only while the keyboard is up, and only where the row floats.
  assert.equal(k.accessoryRoom({ keyboard: 336, floating: true }), k.ACCESSORY_ROOM);
  assert.equal(k.accessoryRoom({ keyboard: 0, floating: true }), 0);
  assert.equal(k.accessoryRoom({ keyboard: 336, floating: false }), 0);
  assert.ok(k.ACCESSORY_ROOM >= 48);
});
