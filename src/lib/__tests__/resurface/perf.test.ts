/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JOURNAL_PAGE, journalMoments, journalPage } from '../../journal/page';
import { compose } from '../../resurface/feed';
import { EMPTY_PREFS } from '../../resurface/prefs';
import { DAY, moment, NOW } from './fixtures';

test('RM24: threads and the feed for 5,000 moments take under a second', () => {
  let seed = 7;
  const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  const vocab = Array.from({ length: 400 }, (_, i) => `word${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + ((i / 26) | 0))}x`);
  const ms = Array.from({ length: 5000 }, (_, i) => moment(NOW - (i + 2) * 3 * DAY / 8, Array.from({ length: 8 }, () => vocab[(rand() * vocab.length) | 0]).join(' ')));
  const start = performance.now();
  const c = compose(ms, EMPTY_PREFS, new Set(), NOW, 's');
  journalPage(journalMoments(c.moments, [], new Set()), NOW, JOURNAL_PAGE);
  const took = performance.now() - start;
  assert.ok(c.threads.length > 0 && c.order.length > 0);
  assert.ok(took < 1000, `took ${Math.round(took)} ms`);
});
