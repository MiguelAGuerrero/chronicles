/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { labelFor, numberWord, threadLine, whenLine } from '../../resurface/lines';
import type { Thread } from '../../resurface/types';
import { at, NOW } from './fixtures';

test('RM6: when is said in words', () => {
  assert.equal(whenLine(NOW - 3_600_000, NOW), 'Today');
  assert.equal(whenLine(at(2026, 11, 4), NOW), 'Yesterday');
  assert.equal(whenLine(at(2026, 11, 2), NOW), 'Monday');
  assert.equal(whenLine(at(2026, 10, 28), NOW), 'Last week');
  assert.equal(whenLine(at(2026, 10, 15), NOW), 'Three weeks ago');
  assert.equal(whenLine(at(2026, 3, 9), NOW), 'In March');
  assert.equal(whenLine(at(2025, 10, 9), NOW), 'October last year');
  assert.equal(whenLine(at(2024, 6, 9), NOW), 'June, two years ago');
});

test('RM6: the label says why the moment is here', () => {
  assert.equal(labelFor({ kind: 'anniversary', years: 1 }, at(2025, 11, 5), NOW), 'A year ago today');
  assert.equal(labelFor({ kind: 'anniversary', years: 3 }, at(2023, 11, 5), NOW), 'Three years ago today');
  assert.equal(labelFor({ kind: 'month' }, at(2025, 10, 9), NOW), 'Last October');
  assert.equal(labelFor({ kind: 'month' }, at(2024, 11, 20), NOW), 'November, two years ago');
  assert.equal(labelFor({ kind: 'thread', name: 'The water' }, at(2026, 1, 1), NOW), 'You keep coming back to the water');
  assert.equal(labelFor({ kind: 'older' }, at(2026, 1, 1), NOW), 'A while ago');
});

const thread = (o: Partial<Thread>): Thread => ({ term: 'x', name: 'X', momentIds: ['a', 'b', 'c'], first: at(2026, 9, 1), last: at(2026, 10, 20), seasonMonth: null, score: 1, ...o });

test('RM14: a thread\'s line is a phrase, and never a number', () => {
  assert.equal(threadLine(thread({}), NOW), 'Just beginning');
  assert.equal(threadLine(thread({ first: at(2026, 1, 1), last: at(2026, 5, 1) }), NOW), 'Now and then');
  assert.equal(threadLine(thread({ first: at(2026, 1, 1), last: at(2026, 10, 25), momentIds: ['a', 'b', 'c', 'd', 'e'] }), NOW), 'Often, lately');
  assert.equal(threadLine(thread({ seasonMonth: 9 }), NOW), 'Comes back every October');
});

test('RM22: every line the feed writes holds no digit', () => {
  const lines = [
    ...[0, 1, 3, 6, 8, 20, 40, 200, 400, 900].map((d) => whenLine(NOW - d * 86_400_000, NOW)),
    labelFor({ kind: 'anniversary', years: 12 }, at(2014, 11, 5), NOW),
    labelFor({ kind: 'month' }, at(2020, 10, 9), NOW),
    threadLine(thread({ seasonMonth: 3 }), NOW),
  ];
  for (const l of lines) assert.ok(!/\d/.test(l), l);
  assert.equal(numberWord(4), 'four');
  assert.equal(numberWord(40), 'forty');
  assert.equal(numberWord(47), 'forty-seven');
  assert.equal(numberWord(60), 'many');
});
