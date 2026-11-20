/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

// Tests first (specs/poi-transitions): the module is loaded per test, so its absence fails only these todos.
// Tests first: the module comes with the code, and a static import with it.
const load = (): Promise<any> => import(['../..', 'markMotion'].join('/'));

const ctx = { places: true, rangeM: 100, hidden: [] as string[], keys: ['a', 'b', 'c'], route: null, riding: false };
const all = () => true;
const none = new Set<string>();

test('PI4: off screen, a mark comes and goes at once', { todo: 'test first' }, async () => {
  const { markMoves } = await load();
  const m = markMoves({ prev: new Set(['a']), prevContext: 'x', ids: ['b'], context: 'x', recentlyLeft: none, leaving: none, inView: (id: string) => id !== 'b' && id !== 'a' });
  assert.deepEqual([...m.arriving], []);
  assert.deepEqual([...m.leaving], []);
});

test('PI5: first sight moves nothing', { todo: 'test first' }, async () => {
  const { markMoves } = await load();
  const m = markMoves({ prev: null, prevContext: null, ids: ['a', 'b'], context: 'x', recentlyLeft: none, leaving: none, inView: all });
  assert.equal(m.arriving.size + m.leaving.size, 0);
});

test('PI6: a mark back while leaving is shown once', { todo: 'test first' }, async () => {
  const { markMoves } = await load();
  const m = markMoves({ prev: new Set(['b']), prevContext: 'x', ids: ['a', 'b'], context: 'x', recentlyLeft: new Set(['a']), leaving: new Set(['a']), inView: all });
  assert.deepEqual([...m.back], ['a'], 'its leave is cut and the one marker kept');
  assert.equal(m.arriving.has('a'), false, 'it does not arrive a second time');
});

test('PI7: a mark that stays never arrives again', { todo: 'test first' }, async () => {
  const { markMoves } = await load();
  // Spread, name hidden, revealed, found, faint to full: the same id, so the same mark.
  const m = markMoves({ prev: new Set(['a', 'b']), prevContext: 'x', ids: ['a', 'b'], context: 'x', recentlyLeft: none, leaving: none, inView: all });
  assert.equal(m.arriving.size + m.leaving.size, 0);
});

test('PI7: a reveal or find mid-arrival turns or pulses', { todo: 'test first' }, async () => {
  const { markEnter } = await import('../../enter');
  const { arrivalEnter } = await load();
  assert.equal(arrivalEnter(true, markEnter({ revealed: false }, { revealed: true })), 'flip', 'the turn wins over the rest of the arrival');
  assert.equal(arrivalEnter(true, markEnter({ revealed: true }, { revealed: true, found: true })), 'pulse');
  assert.equal(arrivalEnter(true, null), 'grow');
  assert.equal(arrivalEnter(false, null), null);
});

test('PI9: from 80%, opaque, damping ratio 0.5 or more, peak 1.03 or less, settled within 400 ms', { todo: 'test first' }, async () => {
  const { MARK_MOTION, springPeak, springSettleMs, dampingRatio } = await load();
  assert.ok(MARK_MOTION.fromScale >= 0.8);
  assert.equal(MARK_MOTION.fromOpacity, 1);
  assert.ok(dampingRatio(MARK_MOTION.spring) >= 0.5);
  const peak = springPeak(MARK_MOTION.spring, MARK_MOTION.fromScale);
  assert.ok(peak > 1 && peak <= 1.03, `overshoots slightly (${peak})`);
  assert.ok(springSettleMs(MARK_MOTION.spring, MARK_MOTION.fromScale) <= 400);
});

test('PI9: leaving takes no longer than MOTION.lift', { todo: 'test first' }, async () => {
  const { MARK_MOTION } = await load();
  const { MOTION } = await import('../../motionTokens');
  assert.ok(MARK_MOTION.leaveMs <= MOTION.lift);
});

test('PI9: a change\'s arrivals are one set', { todo: 'test first' }, async () => {
  const { markMoves } = await load();
  const m = markMoves({ prev: new Set(['a']), prevContext: 'x', ids: ['a', 'b', 'c'], context: 'x', recentlyLeft: none, leaving: none, inView: all });
  assert.deepEqual([...m.arriving].sort(), ['b', 'c']);
});

test('PI11: with no context nothing moves', { todo: 'test first' }, async () => {
  const { markMoves } = await load();
  const m = markMoves({ prev: new Set(['a']), prevContext: null, ids: ['b'], context: null, recentlyLeft: none, leaving: none, inView: all });
  assert.equal(m.arriving.size + m.leaving.size, 0);
});

test('PI12: the context holds Places, range, kinds, places read, route and riding, never the position', { todo: 'test first' }, async () => {
  const { markContext } = await load();
  const base = markContext(ctx);
  assert.equal(typeof base, 'string');
  assert.notEqual(markContext({ ...ctx, places: false }), base);
  assert.notEqual(markContext({ ...ctx, rangeM: 150 }), base);
  assert.notEqual(markContext({ ...ctx, hidden: ['food'] }), base);
  assert.notEqual(markContext({ ...ctx, keys: ['a', 'b'] }), base);
  assert.notEqual(markContext({ ...ctx, route: [[0, 0], [1, 1]] }), base);
  assert.equal(markContext({ ...ctx, keys: ['c', 'a', 'b'] }), base, 'the order places are read in is not a change');
  assert.equal(Object.keys(ctx).includes('here'), false);
});

test('PI12: a changed context moves nothing', { todo: 'test first' }, async () => {
  const { markMoves } = await load();
  const m = markMoves({ prev: new Set(['a']), prevContext: 'x', ids: ['b'], context: 'y', recentlyLeft: none, leaving: none, inView: all });
  assert.equal(m.arriving.size + m.leaving.size, 0);
});

test('PI13: a mark back within 30 s arrives still', { todo: 'test first' }, async () => {
  const { markMoves, MARK_MOTION, recentlyLeft } = await load();
  assert.equal(MARK_MOTION.backStillMs, 30_000);
  const left = recentlyLeft(new Map([['b', 1000], ['c', 1000 - 1]]), 1000 + MARK_MOTION.backStillMs);
  assert.deepEqual([...left], ['b'], 'within 30 s, not past it');
  const m = markMoves({ prev: new Set(['a']), prevContext: 'x', ids: ['a', 'b', 'c'], context: 'x', recentlyLeft: left, leaving: none, inView: all });
  assert.deepEqual([...m.arriving], ['c']);
});

test('PI13: riding moves nothing', { todo: 'test first' }, async () => {
  const { markContext } = await load();
  assert.equal(markContext({ ...ctx, riding: true }), null);
});
