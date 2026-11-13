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

test('chronicle-journal audit 48: the date held over the peek is the peek\'s own day\'s, not the oldest drawn', { todo: 'test first' }, () => {
  const rest = rs as unknown as { stickyDay: (rows: { k: string; key: string }[], from: number) => string | null };
  const rows = [{ k: 'day', key: 'sept' }, { k: 'entry', key: 'a' }, { k: 'day', key: 'today' }, { k: 'entry', key: 'b' }, { k: 'entry', key: 'c' }];
  assert.equal(rest.stickyDay(rows, 3), 'today');
  assert.equal(rest.stickyDay(rows, 4), 'today');
  assert.equal(rest.stickyDay(rows, 1), 'sept');
  // The peek begins with a date of its own: nothing is held over it.
  assert.equal(rest.stickyDay(rows, 2), null);
  assert.equal(rest.stickyDay(rows, 5), 'today');
});
