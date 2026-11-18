/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  MEMO_LOAD_WAIT_MS,
  MEMO_PLAY_HIT,
  fileEnded,
  isRestarting,
  memoClockText,
  memoProgressText,
} from '../../journal/memoPlay';
import { createNowPlaying } from '../../journal/nowPlaying';

// The journal's in-line voice note (audit of Nov 13), written from the findings before the code.

const memoLine = () => readFileSync(join(__dirname, '..', '..', '..', 'components', 'journal', 'MemoLine.tsx'), 'utf8');

test('journal voice audit 1: right after a restart, the position it left is not the end again', () => {
  assert.equal(isRestarting(41, 41), true, 'the old end position, still reported once the press has seeked');
  assert.equal(isRestarting(20, 41), false, 'the player has moved off it');
  assert.equal(isRestarting(41, null), false, 'no restart pending');
});

test('journal voice audit 3: starting a recording stops a note that is playing', () => {
  const np = createNowPlaying();
  np.claim('piece-1');
  assert.equal(np.store.get(), 'piece-1');
  np.claim('recording');
  assert.notEqual(np.store.get(), 'piece-1', 'the note no longer holds the sound');
});

test('journal voice audit 4: pressing play on a second note takes the sound from the first', () => {
  const np = createNowPlaying();
  np.claim('a');
  np.claim('b');
  assert.equal(np.store.get(), 'b');
  np.release('a');
  assert.equal(np.store.get(), 'b', 'a note that was already told to stop does not clear the one that took over');
  np.release('b');
  assert.equal(np.store.get(), null);
});

test('journal voice audit 5: a file that will not resolve gives the row back within a few seconds', () => {
  assert.ok(MEMO_LOAD_WAIT_MS >= 1000 && MEMO_LOAD_WAIT_MS <= 6000, String(MEMO_LOAD_WAIT_MS));
  assert.match(memoLine(), /MEMO_LOAD_WAIT_MS/, 'the row uses it');
});

test('journal voice audit 7: the player is drawn in the page’s own colours, never a hard-coded one', () => {
  const src = memoLine();
  assert.equal(/#[0-9a-fA-F]{3,8}\b/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), false, 'a hex colour in MemoLine');
  assert.equal(/theme\.line\b/.test(src), false, 'the track is darker than the hairline (journal voice audit 15)');
});

test('journal voice audit 9: a note whose stored length outruns its file still counts as ended', () => {
  assert.equal(fileEnded(9.97, 10), true);
  assert.equal(fileEnded(5, 10), false);
  assert.equal(fileEnded(5, 0), false, 'no duration known');
});

test('journal voice audit 13: the play control is 48 pt in itself, not by hit slop', () => {
  assert.ok(MEMO_PLAY_HIT >= 48);
  assert.equal(/hitSlop/.test(memoLine()), false);
});

test('journal voice audit 14: the clock always reads "a / b", so the bar never jumps when play starts', () => {
  assert.equal(memoClockText(0, 39_000), '0:00 / 0:39');
  assert.equal(memoClockText(12_000, 39_000), '0:12 / 0:39');
  assert.equal(memoClockText(0, 0), '');
});

test('journal voice audit 16: the position is words for a screen reader, not only a bar', () => {
  assert.equal(memoProgressText(12_000, 39_000), '0:12 of 0:39');
  assert.match(memoLine(), /progressbar/);
});
