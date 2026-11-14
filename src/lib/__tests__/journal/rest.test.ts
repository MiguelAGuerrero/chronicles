/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as rs from '../../journal/rest';
import { BLANK_MIN, blankHeight } from '../../journal/rest';

test('JN31: at rest the empty page fills what the date and the last entry leave above the bar', () => {
  // A 700 px sheet, a 77 px bar pad, a 66 px date held on top, a 120 px entry.
  assert.equal(blankHeight({ view: 700, foot: 77, sticky: 66, peek: 120 }), 700 - 77 - 66 - 120);
  // Nothing kept: the date and the empty page.
  assert.equal(blankHeight({ view: 700, foot: 77, sticky: 66, peek: 0 }), 700 - 77 - 66);
});

test('JN31: a last entry too long for its share shows its end, and the empty page keeps a third of the screen', () => {
  const h = blankHeight({ view: 700, foot: 77, sticky: 66, peek: 2000 });
  assert.ok(h >= 700 / 3 - 77 - 1, `${h} px of empty page`);
  assert.ok(h < 700 - 77 - 66);
  // A very small screen still leaves somewhere to tap.
  assert.equal(blankHeight({ view: 200, foot: 77, sticky: 66, peek: 2000 }), BLANK_MIN);
});

test('JN33: the entries of the sitting stack under the one the page opened on, and the line holds a third of the way up', () => {
  const rest = rs;
  // Three entries since the page opened: all of them are above the empty page, whether or not the field has the keyboard.
  assert.equal(rest.blankHeight({ view: 700, foot: 77, sticky: 66, peek: 300 }), 700 - 77 - 66 - 300);
  // A stack longer than two thirds of the room slides up: the empty page, and the line at its top, keep a third.
  const room = 500 - 77 - 66;
  const h = rest.blankHeight({ view: 500, foot: 77, sticky: 66, peek: 2000 });
  assert.ok(Math.abs(h - Math.max(BLANK_MIN, Math.round(room / 3))) <= 1, `${h}`);
});

test('JN33: the peek begins with the entry the page opened on, until it is gone', () => {
  const rest = rs;
  const rows = [{ k: 'day', key: 'd1' }, { k: 'entry', key: 'a' }, { k: 'day', key: 'd2' }, { k: 'slip', key: 's' }, { k: 'entry', key: 'b' }, { k: 'entry', key: 'c' }];
  // Opened on b; c was written since.
  assert.equal(rest.peekStart(rows, 'b'), 4);
  assert.equal(rest.anchorOf(rows, 'b'), 'b');
  // No anchor yet, or the anchor was deleted: the last entry.
  assert.equal(rest.anchorOf(rows, null), 'c');
  assert.equal(rest.anchorOf(rows, 'gone'), 'c');
  assert.equal(rest.peekStart(rows, 'c'), 5);
  // Nothing kept: nothing peeks.
  assert.equal(rest.anchorOf([{ k: 'day', key: 'd' }], null), null);
  assert.equal(rest.peekStart([{ k: 'day', key: 'd' }], null), 1);
});

test('chronicle-journal audit 48: the date held over the peek is the peek\'s own day\'s, not the oldest drawn', () => {
  const rest = rs;
  const rows = [{ k: 'day', key: 'sept' }, { k: 'entry', key: 'a' }, { k: 'day', key: 'today' }, { k: 'entry', key: 'b' }, { k: 'entry', key: 'c' }];
  assert.equal(rest.stickyDay(rows, 3), 'today');
  assert.equal(rest.stickyDay(rows, 4), 'today');
  assert.equal(rest.stickyDay(rows, 1), 'sept');
  // The peek begins with a date of its own: nothing is held over it.
  assert.equal(rest.stickyDay(rows, 2), null);
  assert.equal(rest.stickyDay(rows, 5), 'today');
});

test('fix entry-jitter 1: the sheet is taken to its end only once the peek and its held date have been measured', () => {
  const rest = rs;
  const rows = [{ k: 'day', key: 'd' }, { k: 'entry', key: 'a' }, { k: 'entry', key: 'b' }];
  // Before any row has reported its height the empty page is sized from zeros and too tall by the whole peek: the
  // end it scrolls to is not the resting place, and the entry jumps when the heights arrive.
  assert.equal(rest.peekMeasured(rows, 1, {}), false);
  assert.equal(rest.peekMeasured(rows, 1, { a: 90 }), false);
  // Every row of the peek is in, but the date held over it is not.
  assert.equal(rest.peekMeasured(rows, 1, { a: 90, b: 70 }), false);
  assert.equal(rest.peekMeasured(rows, 1, { a: 90, b: 70, d: 66 }), true);
  // A peek that begins with a date of its own holds none.
  assert.equal(rest.peekMeasured(rows, 0, { d: 66, a: 90, b: 70 }), true);
  assert.equal(rest.peekMeasured(rows, 0, { d: 66, a: 90 }), false);
  // Nothing kept: nothing to wait for but the day's date, which is the last day drawn.
  assert.equal(rest.peekMeasured([{ k: 'day', key: 'd' }], 1, {}), false);
  assert.equal(rest.peekMeasured([{ k: 'day', key: 'd' }], 1, { d: 66 }), true);
  assert.equal(rest.peekMeasured([], 0, {}), true);
});

test('fix entry-jitter audit 1: the sheet does not open before the read has answered, however long it takes', () => {
  const rest = rs;
  // Nothing has been laid out yet.
  assert.equal(rest.sheetOpens({ view: 0, answered: true, measured: true, slack: true, hard: true }), false);
  // A slow read: the page has only today's date, which is measured; the entries are still to come.
  assert.equal(rest.sheetOpens({ view: 700, answered: false, measured: true, slack: false, hard: false }), false);
  assert.equal(rest.sheetOpens({ view: 700, answered: false, measured: true, slack: true, hard: false }), false);
  // Only a read that never answers is given up on, after the hard wait.
  assert.equal(rest.sheetOpens({ view: 700, answered: false, measured: false, slack: false, hard: true }), true);
});

test('fix entry-jitter audit 2: a row that never reports its height holds the sheet only for the slack', () => {
  const rest = rs;
  assert.equal(rest.sheetOpens({ view: 700, answered: true, measured: false, slack: false, hard: false }), false);
  assert.equal(rest.sheetOpens({ view: 700, answered: true, measured: false, slack: true, hard: false }), true);
  assert.equal(rest.sheetOpens({ view: 700, answered: true, measured: true, slack: false, hard: false }), true);
});

test('fix entry-jitter audit 3: a failed read is an answer, so the kept-this-sitting page opens as soon as it is measured', () => {
  // `answered` is true for a read that failed as for one that succeeded (MemoriesScreen passes both).
  assert.equal(rs.sheetOpens({ view: 700, answered: true, measured: true, slack: false, hard: false }), true);
});

test('fix entry-jitter 2 1: the empty page the platform lays out in the rest box is blankHeight, whatever the peek measures', () => {
  // The empty page fills what the peek leaves of the room, never under its minimum: the browser does this in the
  // same layout as the peek, so a peek that grows takes its room from the empty page and the sheet's end stays.
  for (const view of [200, 500, 700, 844]) {
    for (const sticky of [0, 48, 66]) {
      const box = rs.restBox({ view, foot: 77, sticky });
      for (const peek of [0, 40, 120, 300, 333, 600, 2000]) {
        const laid = Math.max(box.blankMin, box.room - peek);
        assert.ok(Math.abs(laid - rs.blankHeight({ view, foot: 77, sticky, peek })) <= 1, `${view} ${sticky} ${peek}: ${laid}`);
      }
    }
  }
});

const SNAP = { web: true, armed: true, pinned: true, writing: false, moving: false, sliding: false };

test('fix entry-jitter 2 audit 1: a pinned page is taken to its end before paint whether or not older entries were asked for', () => {
  // An older page that brought no rows left the ask standing for the sitting; the snap no longer depends on it.
  assert.equal(rs.snapsToEnd(SNAP), true);
  assert.equal(rs.snapsToEnd({ ...SNAP, pinned: false }), false);
  assert.equal(rs.snapsToEnd({ ...SNAP, armed: false }), false);
  // Native keeps its place itself.
  assert.equal(rs.snapsToEnd({ ...SNAP, web: false }), false);
});

test('fix entry-jitter 2 audit 2: the keyboard\'s slide is not snapped away before it starts', () => {
  // JN33: the stack slides up as the keyboard comes and goes; an animated move pending or under way is left alone.
  assert.equal(rs.snapsToEnd({ ...SNAP, moving: true }), false);
  assert.equal(rs.snapsToEnd({ ...SNAP, sliding: true }), false);
});

test('fix entry-jitter 2 audit 3: while the field has the keyboard, a keystroke does not pull the page to its end', () => {
  assert.equal(rs.snapsToEnd({ ...SNAP, writing: true }), false);
});
