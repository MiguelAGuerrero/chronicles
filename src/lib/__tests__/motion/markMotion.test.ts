/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { markEnter } from '../../enter';
import { MARK_MOTION, arrivalEnter, dampingRatio, growsNow, inBounds, leaveAt, markContext, markDraw, markMoves, markOrigin, marksSettled, recentlyLeft, settleStep, springPeak, springSettleMs } from '../../markMotion';
import { MOTION } from '../../motionTokens';

const ctx = { places: true, rangeM: 100, hidden: [] as string[], keys: ['a', 'b', 'c'], route: null, riding: false };
const all = () => true;
const none = new Set<string>();

test('PI4: off screen, a mark comes and goes at once', () => {
  const m = markMoves({ prev: new Set(['a']), prevContext: 'x', ids: ['b'], context: 'x', recentlyLeft: none, leaving: none, inView: (id: string) => id !== 'b' && id !== 'a' });
  assert.deepEqual([...m.arriving], []);
  assert.deepEqual([...m.leaving], []);
  assert.equal(inBounds([1, 1], [0, 0, 2, 2]), true, 'inside the visible bounds');
  assert.equal(inBounds([3, 1], [0, 0, 2, 2]), false, 'east of them');
  assert.equal(inBounds([1, 1], null), false, 'no bounds known yet: nothing moves');
});

test('PI5: first sight moves nothing', () => {
  const m = markMoves({ prev: null, prevContext: null, ids: ['a', 'b'], context: 'x', recentlyLeft: none, leaving: none, inView: all });
  assert.equal(m.arriving.size + m.leaving.size, 0);
});

test('PI6: a mark back while leaving is shown once', () => {
  const m = markMoves({ prev: new Set(['b']), prevContext: 'x', ids: ['a', 'b'], context: 'x', recentlyLeft: new Set(['a']), leaving: new Set(['a']), inView: all });
  assert.deepEqual([...m.back], ['a'], 'its leave is cut and the one marker kept');
  assert.equal(m.arriving.has('a'), false, 'it does not arrive a second time');
});

test('PI7: a mark that stays never arrives again', () => {
  // Spread, name hidden, revealed, found, faint to full: the same id, so the same mark.
  const m = markMoves({ prev: new Set(['a', 'b']), prevContext: 'x', ids: ['a', 'b'], context: 'x', recentlyLeft: none, leaving: none, inView: all });
  assert.equal(m.arriving.size + m.leaving.size, 0);
});

test('PI7: a reveal or find mid-arrival turns or pulses', () => {
  assert.equal(arrivalEnter(true, markEnter({ revealed: false }, { revealed: true })), 'flip', 'the turn wins over the rest of the arrival');
  assert.equal(arrivalEnter(true, markEnter({ revealed: true }, { revealed: true, found: true })), 'pulse');
  assert.equal(arrivalEnter(true, null), 'grow');
  assert.equal(arrivalEnter(false, null), null);
});

test('PI9: from 80%, opaque, damping ratio 0.5 or more, peak 1.03 or less, settled within 400 ms', () => {
  assert.ok(MARK_MOTION.fromScale >= 0.8);
  assert.equal(MARK_MOTION.fromOpacity, 1);
  assert.ok(dampingRatio(MARK_MOTION.spring) >= 0.5);
  const peak = springPeak(MARK_MOTION.spring, MARK_MOTION.fromScale);
  assert.ok(peak > 1 && peak <= 1.03, `overshoots slightly (${peak})`);
  assert.ok(springSettleMs(MARK_MOTION.spring, MARK_MOTION.fromScale) <= 400);
});

test('PI9: leaving takes no longer than MOTION.lift', () => {
  assert.ok(MARK_MOTION.leaveMs <= MOTION.lift);
});

test('PI9: a change\'s arrivals are one set', () => {
  const m = markMoves({ prev: new Set(['a']), prevContext: 'x', ids: ['a', 'b', 'c'], context: 'x', recentlyLeft: none, leaving: none, inView: all });
  assert.deepEqual([...m.arriving].sort(), ['b', 'c']);
});

test('PI11: with no context nothing moves', () => {
  const m = markMoves({ prev: new Set(['a']), prevContext: null, ids: ['b'], context: null, recentlyLeft: none, leaving: none, inView: all });
  assert.equal(m.arriving.size + m.leaving.size, 0);
});

test('PI12: the context holds Places, range, kinds, places read, route and riding, never the position', () => {
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

test('PI12: a changed context moves nothing', () => {
  const m = markMoves({ prev: new Set(['a']), prevContext: 'x', ids: ['b'], context: 'y', recentlyLeft: none, leaving: none, inView: all });
  assert.equal(m.arriving.size + m.leaving.size, 0);
});

test('PI13: a mark back within 30 s arrives still', () => {
  assert.equal(MARK_MOTION.backStillMs, 30_000);
  const left = recentlyLeft(new Map([['b', 1000], ['c', 1000 - 1]]), 1000 + MARK_MOTION.backStillMs);
  assert.deepEqual([...left], ['b'], 'within 30 s, not past it');
  const m = markMoves({ prev: new Set(['a']), prevContext: 'x', ids: ['a', 'b', 'c'], context: 'x', recentlyLeft: left, leaving: none, inView: all });
  assert.deepEqual([...m.arriving], ['c']);
});

test('PI13: riding moves nothing', () => {
  assert.equal(markContext({ ...ctx, riding: true }), null);
});

// The UI review's accepted findings (Nov 20; specs/poi-transitions, "UI review").
test('poi-transitions ui 2: a mark that left moments ago leaves still too, so the range edge never shrinks on every jitter', () => {
  const m = markMoves({ prev: new Set(['a', 'b']), prevContext: 'x', ids: ['b'], context: 'x', recentlyLeft: new Set(['a']), leaving: none, inView: all });
  assert.deepEqual([...m.leaving], []);
});

test('poi-transitions ui 3: the leave fades over its first two thirds and shrinks on the exit curve, so it never holds then pops', () => {
  assert.equal(leaveAt(0).opacity, 1);
  assert.ok(leaveAt(0.5).opacity <= 0.3, 'mostly faded by half way');
  assert.equal(leaveAt(2 / 3).opacity, 0);
  assert.ok(leaveAt(0.5).scale > 0.9, 'the exit curve shrinks late');
  assert.ok(Math.abs(leaveAt(1).scale - MARK_MOTION.leaveScale) < 1e-6);
});

test('poi-transitions ui 4: a mark grows and shrinks about its point, the foot or a spread row\'s dot', () => {
  assert.deepEqual(markOrigin(undefined, 6), { x: 18, y: 44 });
  assert.deepEqual(markOrigin({ dx: 20, dy: -10 }, 6), { x: -2, y: 48 });
});

// The audit (Nov 20; specs/poi-transitions, "Audit").

test('poi-transitions audit 1: the first two positions after a mount or a return to the front draw marks still', () => {
  let s = { epoch: 0, n: 0 };
  s = settleStep(s, 0); // the mount: the position it opens with (a reload's last stored fix)
  assert.equal(marksSettled(s, 0), false);
  s = settleStep(s, 0); // the first live fix after it, which may jump far
  assert.equal(marksSettled(s, 0), true, 'settled from the second position on');
  s = settleStep(s, 1); // back to the front
  assert.equal(marksSettled(s, 1), false, 'a return starts again');
  s = settleStep(settleStep(s, 1), 1);
  assert.equal(marksSettled(s, 1), true);
});

test('poi-transitions audit 2: native, a leaving mark is drawn still until its leave is decided, never missing a render', () => {
  const d = markDraw({ ids: ['b'], context: 'x', decided: { known: new Set(['a', 'b']), context: 'x' }, leaving: new Set() });
  assert.deepEqual([...d.stillGone], ['a'], 'a left the list but is drawn until the tick decides');
  const after = markDraw({ ids: ['b'], context: 'x', decided: { known: new Set(['b']), context: 'x' }, leaving: new Set(['a']) });
  assert.deepEqual([...after.stillGone], [], 'once leaving, it is drawn as leaving, not twice');
});

test('poi-transitions audit 4: the found set is part of the context, so a find loaded or removed moves nothing', () => {
  const base = { places: true, rangeM: 100, hidden: [] as string[], keys: ['a'], route: null, riding: false, found: ['a'] };
  assert.notEqual(markContext(base), markContext({ ...base, found: [] }));
});

test('poi-transitions audit 5: with no context a new mark draws on its first render, never held back', () => {
  const d = markDraw({ ids: ['a', 'b'], context: null, decided: { known: new Set(['a']), context: null }, leaving: new Set() });
  assert.deepEqual([...d.held], []);
  const live = markDraw({ ids: ['a', 'b'], context: 'x', decided: { known: new Set(['a']), context: 'x' }, leaving: new Set() });
  assert.deepEqual([...live.held], ['b'], 'under a context, a new mark waits its tick');
});

test('poi-transitions audit 6: a mark respread right after it arrives does not grow twice', () => {
  const grow = new Map([['a', 'mark:a:r:']]);
  assert.equal(growsNow(grow, 'a', 'mark:a:r:'), true, 'its arrival mount grows');
  assert.equal(growsNow(grow, 'a', 'mark:a:r:left'), false, 'a remount under a new key does not');
});

test('poi-transitions audit 7: a mark back while leaving, not recently left, is not an arrival; a changed look is no arrival', () => {
  const back = markMoves({ prev: new Set(['b']), prevContext: 'x', ids: ['a', 'b'], context: 'x', recentlyLeft: none, leaving: new Set(['a']), inView: all });
  assert.deepEqual([...back.back], ['a']);
  assert.equal(back.arriving.has('a'), false, 'back from leaving is the same marker, not an arrival');
  // The same ids with every look changed: the rule sees ids only, so the look cannot make an arrival.
  const looks = markMoves({ prev: new Set(['a']), prevContext: 'x', ids: ['a', 'c'], context: 'x', recentlyLeft: none, leaving: none, inView: all });
  assert.deepEqual([...looks.arriving], ['c'], 'only the new id arrives');
});

test('poi-transitions audit 9: a mark the nearest-eight cap drops or brings back, still within range, comes and goes still', () => {
  const m = markMoves({
    prev: new Set(['a', 'b']), prevContext: 'x', ids: ['b', 'c'], context: 'x', recentlyLeft: none, leaving: none, inView: all,
    ...({ inRangeBefore: new Set(['a', 'b', 'c']), inRangeNow: new Set(['a', 'b', 'c']) } as any),
  });
  assert.deepEqual([...m.leaving], [], 'a is still within range: the cap dropped it');
  assert.deepEqual([...m.arriving], [], 'c was within range: the cap brought it');
});
