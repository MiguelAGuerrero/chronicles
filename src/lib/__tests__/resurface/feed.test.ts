/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compose, lately } from '../../resurface/feed';
import { EMPTY_PREFS } from '../../resurface/prefs';
import { at, moment, NOW } from './fixtures';

test('RM17: with no thread it is plainly newest first', () => {
  const ms = [at(2026, 11, 1), at(2026, 11, 4), at(2026, 10, 2)].map((t, i) => moment(t, ['bench', 'orchard', 'fountain'][i], { id: `p${i}` }));
  const c = compose(ms, EMPTY_PREFS, new Set(), NOW, 's');
  assert.deepEqual(lately(c.moments, NOW, 20).items.map((m) => m.id), ['p1', 'p0', 'p2']);
});

test('RM17: twenty at first, then twenty more', () => {
  const ms = Array.from({ length: 45 }, (_, i) => moment(NOW - (i + 1) * 3_600_000, `n${i}`));
  const c = compose(ms, EMPTY_PREFS, new Set(), NOW, 's');
  const first = lately(c.moments, NOW, 20);
  assert.equal(first.items.length, 20);
  assert.equal(first.more, true);
  const third = lately(c.moments, NOW, 60);
  assert.equal(third.items.length, 45);
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

test('RM20: Not this one keeps the moment in Lately', () => {
  const m = moment(at(2026, 3, 1), 'bench');
  const c = compose([m], { ...EMPTY_PREFS, hidden: [m.id] }, new Set(), NOW, 's');
  assert.equal(c.order.length, 0);
  assert.equal(lately(c.moments, NOW, 20).items.length, 1);
});

test('MC13: Lately is strictly newest first, a thread gives no priority, ties broken by id', () => {
  const thr = [at(2026, 9, 1), at(2026, 9, 8), at(2026, 10, 30)].map((t) => moment(t, 'harbor', { id: `h${t}` }));
  const newer = moment(at(2026, 11, 4), 'bench', { id: 'newer' });
  const tieA = moment(at(2026, 10, 31), 'orchard', { id: 'a-tie' });
  const tieB = moment(at(2026, 10, 31), 'fountain', { id: 'b-tie' });
  const c = compose([...thr, newer, tieB, tieA], EMPTY_PREFS, new Set(), NOW, 's');
  const ids = lately(c.moments, NOW, 20).items.map((m: { id: string }) => m.id);
  assert.deepEqual(ids.slice(0, 3), ['newer', 'a-tie', 'b-tie']);
  assert.equal(ids[3], thr[2].id, 'the thread moment is where its time puts it');
});
