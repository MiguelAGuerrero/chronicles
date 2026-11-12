/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JOURNAL_PAGE, journalMoments, journalPage } from '../../journal/page';
import { compose } from '../../resurface/feed';
import { EMPTY_PREFS } from '../../resurface/prefs';
import { at, moment, NOW } from './fixtures';

/** The page's entries, oldest first, as the journal draws them (chronicle journal JN1, which amends RM17 and MC13). */
const onPage = (ms: Parameters<typeof journalMoments>[0], limit = JOURNAL_PAGE) => journalPage(journalMoments(ms, [], new Set()), NOW, limit);
const ids = (ms: Parameters<typeof journalMoments>[0]) => onPage(ms).rows.flatMap((r) => (r.k === 'entry' ? [r.key] : []));

test('RM17: with no thread the page is plainly in the order kept, newest last (JN1)', () => {
  const ms = [at(2026, 11, 1), at(2026, 11, 4), at(2026, 10, 2)].map((t, i) => moment(t, ['bench', 'orchard', 'fountain'][i], { id: `p${i}` }));
  const c = compose(ms, EMPTY_PREFS, new Set(), NOW, 's');
  assert.deepEqual(ids(c.moments), ['p2', 'p0', 'p1']);
});

test('RM17: a page at first, then a page more (JN1)', () => {
  const ms = Array.from({ length: 2 * JOURNAL_PAGE + 5 }, (_, i) => moment(NOW - (i + 1) * 3_600_000, `n${i}`));
  const c = compose(ms, EMPTY_PREFS, new Set(), NOW, 's');
  const first = onPage(c.moments);
  assert.equal(first.rows.filter((r) => r.k === 'entry').length, JOURNAL_PAGE);
  assert.equal(first.more, true);
  const third = onPage(c.moments, 3 * JOURNAL_PAGE);
  assert.equal(third.rows.filter((r) => r.k === 'entry').length, 2 * JOURNAL_PAGE + 5);
  assert.equal(third.more, false);
});

test('RM19: a deleted moment, or a deleted walk\'s moment, leaves at once, and a thread under three leaves the rail', () => {
  const ms = [at(2026, 9, 1), at(2026, 9, 8), at(2026, 10, 3)].map((t, i) => moment(t, 'harbor', { id: `x${i}`, walkId: i === 2 ? 'w9' : null }));
  assert.equal(compose(ms, EMPTY_PREFS, new Set(), NOW, 's').threads.length, 1);
  const gone = compose(ms, EMPTY_PREFS, new Set(['x1']), NOW, 's');
  assert.deepEqual(gone.moments.map((m) => m.id), ['x0', 'x2']);
  assert.equal(gone.threads.length, 0);
  assert.deepEqual(compose(ms, EMPTY_PREFS, new Set(['w9']), NOW, 's').moments.map((m) => m.id), ['x0', 'x1']);
});

test('RM4: no moments is an empty feed', () => {
  const c = compose([], EMPTY_PREFS, new Set(), NOW, 's');
  assert.deepEqual([c.moments, c.threads, c.order], [[], [], []]);
});

test('RM20: Not this one keeps the moment on the page', () => {
  const m = moment(at(2026, 3, 1), 'bench');
  const c = compose([m], { ...EMPTY_PREFS, hidden: [m.id] }, new Set(), NOW, 's');
  assert.equal(c.order.length, 0);
  assert.equal(ids(c.moments).length, 1);
});

test('MC13: the page is strictly by time, a thread gives no priority, ties broken by id (book order since JN1)', () => {
  const thr = [at(2026, 9, 1), at(2026, 9, 8), at(2026, 10, 30)].map((t) => moment(t, 'harbor', { id: `h${t}` }));
  const newer = moment(at(2026, 11, 4), 'bench', { id: 'newer' });
  const tieA = moment(at(2026, 10, 31), 'orchard', { id: 'a-tie' });
  const tieB = moment(at(2026, 10, 31), 'fountain', { id: 'b-tie' });
  const c = compose([...thr, newer, tieB, tieA], EMPTY_PREFS, new Set(), NOW, 's');
  const order = ids(c.moments);
  assert.deepEqual(order.slice(-3), ['a-tie', 'b-tie', 'newer']);
  assert.equal(order.at(-4), thr[2].id, 'the thread moment is where its time puts it');
});
