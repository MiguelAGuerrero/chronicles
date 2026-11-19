/// <reference types="node" />
// Replay ceremony, the stack (specs/replay-ceremony/spec.md, RC29-RC33; decision 0206), written before the code: what
// is not built yet is reached through casts and a guarded load (`walks.ts`), so the typecheck holds while each test
// fails for its own reason. What the screen shows of it (RC29-RC31) is the `replay` journey's too.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { OVERLAY_KINDS } from '../../ceremony/types';
import type { Faced } from '../../moment';
import type { TracePoint } from '../../types';
import { at, built, cap, frameAt, mod, overlaysOf, PHONE, planOf, screenOf, several, SMALL, SRC, token, walkOf, type Screen } from './walks';

const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');
const stackMod = mod('lib/ceremony/stack.ts');
const roomMod = mod('lib/ceremony/room.ts');
type Slot = { index: number; slot: number; rise: number; give: number; opacity: number };
const stackBound = (s: Screen) => built<(s: Screen) => number>(stackMod, 'stackBound')(s);
const stackSlots = (lands: number[], ms: number, max: number, still = false) => built<(lands: number[], ms: number, max: number, still: boolean) => Slot[]>(stackMod, 'stackSlots')(lands, ms, max, still);
const STACK = () => built<{ w: number; h: number; pitch: number; right: number; top: number }>(roomMod, 'STACK');
type Entry = { key: string; capture: Faced; several: boolean; video: boolean; slot: number; rise: number; give: number; opacity: number };
type Stack = { kind: string; key: string; captures: Faced[]; entries: Entry[] };
const stackOf = (f: ReturnType<typeof frameAt>): Stack | null => (overlaysOf(f, 'stack')[0] as unknown as Stack) ?? null;
type Card = { capture: Faced; t0: number; t1: number };
const cardsOf = (p: ReturnType<typeof planOf>) => p.cards as unknown as Card[];

/** The walk of `walks.ts` with more kept on it: a video, a moment of several pieces, a memo; in walked order. */
function busyWalk() {
  let video!: Faced, market!: Faced, memo!: Faced;
  const w = walkOf([], (fixes: TracePoint[]) => {
    video = cap('video', fixes[40].t, at(280), '4000');
    market = several(['photo', 'photo', 'photo'], fixes[60].t, at(420));
    memo = cap('voice', fixes[70].t, at(490), '3000');
    return [video, market, memo];
  });
  return { ...w, video, market, memo };
}

// ---------------------------------------------------------------- what gathers (RC29)

test('RC29: the stack gathers one entry for each moment that had a picture or a video, the newest on top, each once its card has reached its pin', () => {
  const { story, photo, video, market, note, memo } = busyWalk();
  const p = planOf(story);
  const cards = cardsOf(p);
  assert.deepEqual(cards.map((c) => c.capture.id), [photo.id, video.id, market.id], 'one card a moment');
  // Nothing before the first card has shrunk onto its pin; then one more for each, a beat after it lands.
  assert.equal(stackOf(frameAt(p, cards[0].t1 - 10)), null);
  const land = token('stackLand');
  for (let k = 0; k < cards.length; k++) {
    assert.equal(stackOf(frameAt(p, cards[k].t1 + land - 5))?.entries.length ?? 0, k, `before the ${k + 1}th lands`);
    const s = stackOf(frameAt(p, cards[k].t1 + land + 5))!;
    assert.deepEqual(s.entries.map((e) => e.capture.id), cards.slice(0, k + 1).map((c) => c.capture.id));
    // The newest is the top one: the highest slot.
    assert.ok(s.entries.every((e, i) => i === 0 || e.slot > s.entries[i - 1].slot), 'each stands over the one before');
  }
  const full = stackOf(frameAt(p, p.total - 1))!;
  assert.deepEqual(full.entries.map((e) => [e.several, e.video]), [[false, false], [false, true], [true, false]], 'a moment of several is one entry with a layered edge; a video\'s has a play mark');
  assert.ok(!full.captures.some((c) => c.id === note.id || c.id === memo.id), 'a note or a memo is no entry');
  assert.ok((OVERLAY_KINDS as readonly string[]).includes('stack'));
});

// ---------------------------------------------------------------- it grows, to a bound (RC30)

test('RC30: the stack grows upward; when one more would reach the controls at the top the oldest drops off the bottom, and still opens', () => {
  // The bound is the screen's: from above the map's credits up to under Skip and Next. Skip is 12 in and 48 tall, Next
  // 8 under it and 48 tall, and the stack starts 12 under Next's foot (replay-ceremony ui 2; it was 8).
  const S = STACK();
  assert.equal(S.top, 12 + 48 + 8 + 48 + 12);
  for (const s of [PHONE, SMALL, screenOf(844, 390), screenOf(390, 844, 47)]) {
    const n = stackBound(s);
    const bottom = s.height - s.insets.bottom - 44;
    assert.ok(bottom - S.h - (n - 1) * S.pitch >= s.insets.top + S.top, `${s.width}x${s.height}: ${n} entries reach under the controls`);
    assert.ok(bottom - S.h - n * S.pitch < s.insets.top + S.top, 'and one more would not');
    assert.ok(n >= 1);
  }
  assert.ok(stackBound(PHONE) > stackBound(SMALL));
  // Twenty photos on a small phone: never more on screen than the bound, the oldest gone first, all of them kept.
  const many = walkOf([], (fixes) => Array.from({ length: 19 }, (_, i) => cap('photo', fixes[20 + i * 3].t, at(140 + i * 21))));
  const p = planOf(many.story, { screen: SMALL });
  const max = stackBound(SMALL);
  const cards = cardsOf(p);
  assert.equal(cards.length, 20);
  for (let ms = 0; ms < p.total; ms += 100) {
    const s = stackOf(frameAt(p, ms));
    if (!s) continue;
    assert.ok(s.entries.filter((e) => e.opacity > 0.99).length <= max, `${s.entries.length} entries at ${ms} ms`);
    assert.ok(s.entries.every((e) => e.slot > -1 && e.slot <= max - 1 + 1e-9), 'none stands past the bound');
  }
  const end = stackOf(frameAt(p, p.total - 1))!;
  assert.equal(end.entries.length, max);
  assert.deepEqual(end.entries.map((e) => e.capture.id), cards.slice(-max).map((c) => c.capture.id), 'first in, first out');
  assert.deepEqual(end.captures.map((c) => c.id), cards.map((c) => c.capture.id), 'an entry that dropped off is still among the photos it opens');
  // Dropping is the lowest one's: it sinks and fades as the rest step down, and it is gone once they have.
  const drop = cards[max].t1 + token('stackLand');
  const mid = stackOf(frameAt(p, drop + token('stackPop') / 2))!;
  assert.ok(mid.entries[0].capture.id === cards[0].capture.id && mid.entries[0].slot < 0 && mid.entries[0].opacity < 1, 'the oldest is on its way off');
  assert.ok(stackOf(frameAt(p, drop + token('stackPop') + 20))!.entries[0].capture.id === cards[1].capture.id);
});

test('RC30: the stack never shows a number, and at 320 px it stands clear of a card, a bubble and the line under the clock', () => {
  const S = STACK();
  const cardSize = built<(s: Screen, pieces?: number) => { w: number; h: number }>(roomMod, 'cardSize');
  for (const s of [SMALL, screenOf(320, 700), screenOf(320, 480), PHONE]) {
    const left = s.width - s.insets.right - S.right - S.w;
    assert.ok(s.width / 2 + cardSize(s).w / 2 <= left - 4, `${s.width}x${s.height}: a card reaches ${s.width / 2 + cardSize(s).w / 2}, the stack starts at ${left}`);
    // The bubbles' corner (12 in, two thirds of the width) and the line under the clock (between Hold and Skip).
    assert.ok(12 + Math.min(s.width * 0.66, 320) <= left, 'clear of a bubble');
    assert.ok(s.width / 2 + Math.max(120, s.width - 180) / 2 <= left, 'clear of the line under the clock');
  }
  // No numeral: the view draws pictures and marks, never text, and nothing it is given counts.
  const view = read('components/ceremony/Stack.tsx');
  assert.doesNotMatch(view, /<Text\b/, 'the stack draws text');
  assert.doesNotMatch(view, /\.length\}|\{\s*\w+\.length\s*\}/, 'the stack shows how many it holds');
  // Its name for a screen reader says no number either.
  assert.doesNotMatch(/accessibilityLabel="([^"]*)"/.exec(view)?.[1] ?? '0', /\d/);
});

// ---------------------------------------------------------------- one control (RC31)

test('RC31: the stack is one control of at least 44 pt, named "Photos and videos so far", that opens them at the latest; it replaces the pile', () => {
  const S = STACK();
  assert.ok(S.w >= 44 && S.h >= 44, `an entry is ${S.w} by ${S.h}`);
  // On Android a finger gets 48 dp of it, by a slop either side of the same drawing (replay-ceremony ui 2).
  const slop = built<(os: string) => { left: number; right: number } | undefined>(roomMod, 'stackSlop')('android');
  assert.ok(!!slop && S.w + slop.left + slop.right >= 48, `on Android it is hit ${slop ? S.w + slop.left + slop.right : S.w} px wide`);
  const view = read('components/ceremony/Stack.tsx');
  assert.equal([...view.matchAll(/<Pressable\b/g)].length, 1, 'one control');
  assert.match(view, /accessibilityRole="button"/);
  assert.match(view, /accessibilityLabel="Photos and videos so far"/);
  assert.match(view, /ctx\.open\(\[\.\.\.captures\]\.reverse\(\)\)/, 'it opens every one so far, the latest first');
  // Every picture it draws is a Picture, and a video is its still: no player is made for the stack.
  assert.doesNotMatch(view, /useVideoPlayer|VideoView|from 'react-native'[^\n]*\bImage\b/);
  // The pile is gone: no view, no overlay kind, no place for one.
  assert.equal(existsSync(join(SRC, 'components/ceremony/Pile.tsx')), false);
  assert.ok(!(OVERLAY_KINDS as readonly string[]).includes('pile'));
  assert.doesNotMatch(read('components/ceremony/overlays.tsx'), /\bPile\b|pile:/);
  assert.doesNotMatch(read('components/ceremony/layout.ts'), /pileCenter|\bPILE\b/);
});

// ---------------------------------------------------------------- how one settles (RC32)

test('RC32: a new entry settles with an overshoot of 1.5% and the ones under it give 3 px; with reduce motion it appears in place', () => {
  assert.equal(token('stackOver'), 0.015);
  assert.equal(token('stackGive'), 3);
  const lands = [1000, 5000];
  // The second comes down onto the stack: from above its place, past it by 1.5% of the way, and to rest.
  const drop = token('stackDrop');
  let lowest = Infinity;
  let first = NaN;
  let gave = 0;
  for (let ms = 5000; ms <= 5000 + 1500; ms += 4) {
    const [under, top] = stackSlots(lands, ms, 10);
    if (!top) continue;
    if (Number.isNaN(first)) first = top.rise;
    lowest = Math.min(lowest, top.rise);
    gave = Math.max(gave, under.give);
    assert.equal(under.rise, 0, 'the one under it does not rise again');
  }
  assert.ok(Math.abs(first - drop) < drop * 0.2, `it starts ${first} px above its place`);
  assert.ok(Math.abs(lowest + 0.015 * drop) < 0.004 * drop, `it passes its place by ${(-lowest / drop * 100).toFixed(2)}%`);
  assert.ok(Math.abs(gave - 3) < 0.2, `the one under it gives ${gave.toFixed(2)} px`);
  const rest = stackSlots(lands, 5000 + 3000, 10);
  assert.deepEqual(rest.map((e) => [e.slot, Math.abs(e.rise) < 0.01, e.give, e.opacity]), [[0, true, 0, 1], [1, true, 0, 1]]);
  // Reduce motion: there at once, in place, and nothing under it moves; the oldest goes at once too.
  assert.deepEqual(stackSlots(lands, 5001, 10, true), [{ index: 0, slot: 0, rise: 0, give: 0, opacity: 1 }, { index: 1, slot: 1, rise: 0, give: 0, opacity: 1 }]);
  assert.deepEqual(stackSlots([0, 100, 200], 201, 2, true).map((e) => [e.index, e.slot]), [[1, 0], [2, 1]]);
  // The telling says the same with reduce motion on.
  const { story } = busyWalk();
  const p = planOf(story, { reduceMotion: true });
  const s = stackOf(frameAt(p, cardsOf(p)[1].t1 + token('stackLand') + 1))!;
  assert.deepEqual(s.entries.map((e) => [e.rise, e.give, e.opacity]), [[0, 0, 1], [0, 0, 1]]);
});

// ---------------------------------------------------------------- it leaves with the path (RC33)

test('RC33: the stack stays through the last view and leaves as the card arrives; the card\'s map has the pins', () => {
  const { story, photo, video, market, note, memo } = busyWalk();
  const p = planOf(story);
  assert.equal(stackOf(frameAt(p, p.total - 1))!.entries.length, 3, 'there on the last view');
  const done = frameAt(p, p.total);
  assert.equal(done.done, true);
  assert.deepEqual(done.overlays, [], 'nothing is on stage once the path is over');
  assert.deepEqual([...done.pins].sort(), [photo.id, video.id, market.id, note.id, memo.id].sort(), 'every moment\'s pin is the card\'s');
  // The screens take the stage down when the path ends, as they did: the stack goes with it.
  assert.match(read('components/ceremony/useCeremonyLoop.ts'), /if \(telling\) return;\s*\n\s*map\.current\?\.replayFrame\(null\);\s*\n\s*live\.set\(null\);/);
});
