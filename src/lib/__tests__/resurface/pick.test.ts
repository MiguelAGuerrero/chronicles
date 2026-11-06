/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_EXTRACTORS } from '../../resurface/extractors';
import { pickResurfaced, resurfaceOrder } from '../../resurface/pick';
import { EMPTY_PREFS } from '../../resurface/prefs';
import { deriveThreads } from '../../resurface/threads';
import { at, moment, NOW } from './fixtures';

const ctx = (ms: ReturnType<typeof moment>[], prefs = EMPTY_PREFS, seed = 's1') => ({ now: NOW, seed, prefs, threads: deriveThreads(ms, DEFAULT_EXTRACTORS, prefs, NOW), extractors: DEFAULT_EXTRACTORS });

test('RM7: the same inputs give the same moment', () => {
  const ms = [at(2026, 3, 1), at(2026, 4, 1), at(2026, 5, 1), at(2026, 6, 1)].map((t) => moment(t, 'a quiet bench'));
  assert.equal(pickResurfaced(ms, ctx(ms))!.moment.id, pickResurfaced(ms, ctx(ms))!.moment.id);
});

test('RM7: nothing from the last day, nothing in Not this one, nothing without its media', () => {
  const recent = moment(NOW - 3_600_000, 'just now');
  const hidden = moment(at(2026, 3, 1), 'hidden one');
  const nofile = moment(at(2026, 3, 2), 'photo gone', { kind: 'photo', hasMedia: false });
  const empty = moment(at(2026, 3, 3), '   ');
  const ok = moment(at(2026, 3, 4), 'the good one');
  const ms = [recent, hidden, nofile, empty, ok];
  assert.deepEqual(resurfaceOrder(ms, ctx(ms, { ...EMPTY_PREFS, hidden: [hidden.id] })).map((p) => p.moment.id), [ok.id]);
});

test('RM7: an anniversary first, then a moment in a thread, then the same month, then any older', () => {
  const thr = [at(2026, 2, 1), at(2026, 2, 8), at(2026, 2, 15)].map((t) => moment(t, 'harbor'));
  const month = moment(at(2025, 11, 20), 'another november');
  const anniv = moment(at(2025, 11, 5), 'a year ago');
  const older = moment(at(2026, 5, 5), 'plain old');
  const ms = [...thr, month, anniv, older];
  const kinds = resurfaceOrder(ms, ctx(ms)).map((p) => p.reason.kind);
  assert.deepEqual(kinds, ['anniversary', 'thread', 'thread', 'thread', 'month', 'older']);
  assert.deepEqual(resurfaceOrder(ms, ctx(ms))[0].reason, { kind: 'anniversary', years: 1 });
});

test('RM6: a moment in a thread says so in the thread\'s own name', () => {
  const ms = [at(2026, 2, 1), at(2026, 2, 8), at(2026, 2, 15)].map((t) => moment(t, 'harbor'));
  assert.deepEqual(pickResurfaced(ms, ctx(ms))!.reason, { kind: 'thread', name: 'Harbor' });
});

test('RM8: Another steps through every eligible moment once, and the last one shown does not start the next open', () => {
  const ms = [at(2026, 3, 1), at(2026, 4, 1), at(2026, 5, 1)].map((t) => moment(t, 'bench'));
  const order = resurfaceOrder(ms, ctx(ms)).map((p) => p.moment.id);
  assert.equal(new Set(order).size, 3);
  const again = resurfaceOrder(ms, ctx(ms, { ...EMPTY_PREFS, lastShown: order[0] }));
  assert.notEqual(again[0].moment.id, order[0]);
  assert.equal(again.length, 3);
});

test('RM8: with one eligible moment, it is shown again', () => {
  const ms = [moment(at(2026, 3, 1), 'bench')];
  assert.equal(resurfaceOrder(ms, ctx(ms, { ...EMPTY_PREFS, lastShown: ms[0].id }))[0].moment.id, ms[0].id);
});

test('RM10: only recent moments, nothing to resurface', () => {
  const ms = [moment(NOW - 1000, 'just now')];
  assert.equal(pickResurfaced(ms, ctx(ms)), null);
});

test('RM20: show less like this sends a moment, and its terms, to the back of its group', () => {
  const a = moment(at(2026, 3, 1), 'harbor'), b = moment(at(2026, 3, 2), 'bench'), c = moment(at(2026, 3, 3), 'orchard');
  const ms = [a, b, c];
  const dimmed = resurfaceOrder(ms, ctx(ms, { ...EMPTY_PREFS, dim: [a.id], less: ['bench'] })).map((p) => p.moment.id);
  assert.equal(dimmed[0], c.id);
  assert.deepEqual(new Set(dimmed.slice(1)), new Set([a.id, b.id]));
});
