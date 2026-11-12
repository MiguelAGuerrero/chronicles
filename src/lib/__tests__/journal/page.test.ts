/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JOURNAL_PAGE, journalMoments, journalPage } from '../../journal/page';
import { dayKey } from '../../days';
import { moment } from '../resurface/fixtures';

const T = 'test first';
/** Thursday, 12 Nov 2026, 3 pm local. */
const NOW = new Date(2026, 10, 12, 15).getTime();
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const none = new Set<string>();

test('JN1: book order, oldest above, ties by id', { todo: T }, () => {
  const ms = [moment(NOW - 2 * DAY, 'b', { id: 'b' }), moment(NOW - 5 * DAY, 'a', { id: 'a' }), moment(NOW - 2 * DAY, 'c', { id: 'a2' }), moment(NOW - HOUR, 'd', { id: 'd' })];
  assert.deepEqual(journalMoments(ms, [], none).map((m) => m.id), ['a', 'a2', 'b', 'd']);
  const rows = journalPage(journalMoments(ms, [], none), NOW, JOURNAL_PAGE).rows;
  assert.deepEqual(rows.filter((r) => r.k === 'entry').map((r) => r.key), ['a', 'a2', 'b', 'd']);
});

test('JN1: only the latest page is drawn, and more is said to remain', { todo: T }, () => {
  const ms = Array.from({ length: 100 }, (_, i) => moment(NOW - (i + 1) * HOUR, `n${i}`, { id: `n${String(i).padStart(3, '0')}` }));
  const page = journalPage(journalMoments(ms, [], none), NOW, JOURNAL_PAGE);
  const entries = page.rows.filter((r) => r.k === 'entry');
  assert.equal(entries.length, JOURNAL_PAGE);
  assert.equal(entries.at(-1)?.key, 'n000');
  assert.equal(page.more, true);
  assert.equal(journalPage(journalMoments(ms, [], none), NOW, 200).more, false);
});

test('JN2: a heading per day with entries, none for an empty day, today always', { todo: T }, () => {
  const ms = [moment(NOW - 9 * DAY, 'old', { id: 'o' }), moment(NOW - 2 * DAY, 'x', { id: 'x' }), moment(NOW - 2 * DAY + HOUR, 'y', { id: 'y' })];
  const rows = journalPage(journalMoments(ms, [], none), NOW, JOURNAL_PAGE).rows;
  assert.deepEqual(rows.map((r) => r.k), ['day', 'entry', 'day', 'entry', 'entry', 'day']);
  const days = rows.filter((r) => r.k === 'day');
  assert.deepEqual(days.map((d) => d.k === 'day' && d.today), [false, false, true]);
  assert.equal(days.at(-1)?.key, `day:${dayKey(NOW)}`);
});

test('JN2: nothing kept is today\'s heading alone', { todo: T }, () => {
  const rows = journalPage([], NOW, JOURNAL_PAGE).rows;
  assert.deepEqual(rows.map((r) => r.k), ['day']);
});

test('JN8: an open walk\'s moment is on the page, in its place in time', { todo: T }, () => {
  const feed = [moment(NOW - 3 * HOUR, 'before', { id: 'f1' }), moment(NOW - HOUR, 'after', { id: 'f2' })];
  const open = [moment(NOW - 2 * HOUR, 'on the walk', { id: 'w1', walkId: 'walk' })];
  assert.deepEqual(journalMoments(feed, open, none).map((m) => m.id), ['f1', 'w1', 'f2']);
});

test('JN1: a deleted moment, or a deleted walk\'s, leaves the page at once', { todo: T }, () => {
  const feed = [moment(NOW - 3 * HOUR, 'a', { id: 'a' }), moment(NOW - 2 * HOUR, 'b', { id: 'b', walkId: 'w' })];
  assert.deepEqual(journalMoments(feed, [], new Set(['a'])).map((m) => m.id), ['b']);
  assert.deepEqual(journalMoments(feed, [], new Set(['w'])).map((m) => m.id), ['a']);
});

test('JN20: the slip sits under today\'s heading, above today\'s entries', { todo: T }, () => {
  const ms = [moment(NOW - 2 * DAY, 'x', { id: 'x' }), moment(NOW - HOUR, 'today', { id: 't' })];
  const rows = journalPage(journalMoments(ms, [], none), NOW, JOURNAL_PAGE, { slip: true }).rows;
  assert.deepEqual(rows.map((r) => r.k), ['day', 'entry', 'day', 'slip', 'entry']);
  assert.deepEqual(journalPage([], NOW, JOURNAL_PAGE, { slip: false }).rows.map((r) => r.k), ['day']);
});
