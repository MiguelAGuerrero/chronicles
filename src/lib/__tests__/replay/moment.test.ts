/// <reference types="node" />
// Replay ceremony, a moment on screen (specs/replay-ceremony/spec.md, RC35-RC37; decision 0206), written before the
// code: what is not built yet is reached through casts and a guarded load (`walks.ts`). What the screen shows of it is
// the `replay` and `stacks` journeys' too.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import type { Faced } from '../../moment';
import type { TracePoint } from '../../types';
import { at, cap, field, frameAt, overlaysOf, planOf, several, SRC, token, walkOf } from './walks';

const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');
type Card = { capture: Faced; t0: number; t1: number; pieces?: Faced[]; videos?: unknown[] };
const cardsOf = (p: ReturnType<typeof planOf>) => p.cards as unknown as Card[];
type CardOn = { key: string; capture: Faced; grow: number; tuck: number; playing: boolean; progress: number; drift?: number; pieces?: Faced[]; videos?: Faced[]; turn?: number; turnIn?: number };
const cardOn = (f: ReturnType<typeof frameAt>) => (overlaysOf(f, 'card')[0] as unknown as CardOn) ?? null;
type Bubble = { key: string; capture: Faced; playing: boolean };
const bubblesOn = (f: ReturnType<typeof frameAt>) => overlaysOf(f, 'bubble') as unknown as Bubble[];
const scrimAt = (p: ReturnType<typeof planOf>, ms: number) => field<number>(frameAt(p, ms), 'scrim');

/** The walk of `walks.ts` with `extra` kept at one place 300 m in, in the order given. */
function stopWith(extra: (t: number) => Faced[]) {
  return walkOf([], (fixes: TracePoint[]) => extra(fixes[43].t));
}

// ---------------------------------------------------------------- the scrim (RC35)

test('RC35: while a card is up the map under it dims by a fifth; cards one after another at one stop share one dim, down once and up once', () => {
  assert.equal(token('scrim'), 0.2);
  // Two photos and a video taken at one stop, a second apart: three cards, one after another.
  const { story } = stopWith((t) => [cap('photo', t, at(300)), cap('photo', t + 1000, at(301)), cap('video', t + 2000, at(302), '4000')]);
  const p = planOf(story);
  const cards = cardsOf(p);
  assert.equal(cards.length, 4);
  // The walk's own photo, earlier and elsewhere: its own dim, down as it comes and up as it shrinks away.
  assert.equal(scrimAt(p, cards[0].t0 - 10), 0);
  assert.ok(scrimAt(p, cards[0].t0 + token('scrimIn') / 2) > 0.05 && scrimAt(p, cards[0].t0 + token('scrimIn') / 2) < 0.15);
  assert.equal(scrimAt(p, cards[0].t0 + token('scrimIn') + 500), 0.2);
  assert.ok(scrimAt(p, cards[0].t1 - token('tuck') / 2) < 0.15, 'it lifts as the card shrinks onto its place');
  assert.equal(scrimAt(p, cards[0].t1 + 10), 0);
  // The three at one stop: from the first's coming to the last's going it never lifts.
  const [a, , c] = cards.slice(1);
  let changes = 0;
  let prev = 0;
  let rising = true;
  for (let ms = a.t0 - 20; ms <= c.t1 + 20; ms += 10) {
    const s = scrimAt(p, ms);
    assert.ok(s >= 0 && s <= 0.2 + 1e-9);
    if (ms > a.t0 + token('scrimIn') && ms < c.t1 - token('tuck')) assert.equal(s, 0.2, `the dim lifted between two cards at one stop (${s} at ${ms - a.t0} ms)`);
    if (rising && s < prev - 1e-9) { rising = false; changes++; }
    if (!rising && s > prev + 1e-9) { rising = true; changes++; }
    prev = s;
  }
  assert.equal(changes, 1, 'down once and up once');
  // Never on a stretch, a break or the last view.
  for (let ms = 0; ms < p.total; ms += 50) if (!cardOn(frameAt(p, ms)) && (ms < a.t0 || ms > c.t1)) assert.equal(scrimAt(p, ms), 0, `a dim with no card at ${ms} ms`);
  // With reduce motion it does not fade: there or not.
  const still = planOf(story, { reduceMotion: true });
  for (let ms = 0; ms < still.total; ms += 25) assert.ok([0, 0.2].includes(scrimAt(still, ms)), `a fade at ${ms} ms with reduce motion`);
  // The stage lays it over the map, under the cards, in ink at the frame's strength; a break still never dims (RC17).
  const stage = read('components/ceremony/Stage.tsx');
  assert.match(stage, /opacity: f\.scrim/);
  assert.match(stage, /testID="replay-scrim"/);
  assert.doesNotMatch(read('lib/ceremony/types.ts'), /\bdim\b/);
});

// ---------------------------------------------------------------- the drift (RC36)

test('RC36: a photo held in its card drifts 3% closer over its hold; not with reduce motion', () => {
  assert.equal(token('drift'), 0.03);
  const { story } = stopWith((t) => [cap('video', t, at(300), '4000')]);
  const p = planOf(story);
  const [photo, video] = cardsOf(p);
  let last = -1;
  for (let ms = photo.t0; ms < photo.t1; ms += 40) {
    const d = cardOn(frameAt(p, ms)).drift!;
    assert.ok(d >= last - 1e-12 && d <= 0.03 + 1e-9, `the drift at ${ms - photo.t0} ms is ${d}`);
    last = d;
  }
  assert.ok(cardOn(frameAt(p, photo.t0 + 10)).drift! < 0.002 && last > 0.028, `it ends ${last} closer`);
  // A video does not drift; nor does anything with reduce motion.
  assert.equal(cardOn(frameAt(p, (video.t0 + video.t1) / 2)).drift ?? 0, 0);
  const still = planOf(story, { reduceMotion: true });
  const sp = cardsOf(still)[0];
  assert.equal(cardOn(frameAt(still, (sp.t0 + sp.t1) / 2)).drift ?? 0, 0);
  // The card writes it on the picture alone, as a scale, frame by frame.
  const cards = read('components/ceremony/Cards.tsx');
  assert.match(cards, /scale: 1 \+ \(now\.drift \?\? 0\)/);
});

// ---------------------------------------------------------------- a moment arrives whole (RC37)

test('RC37: with no video a moment\'s memos and notes play beside its grid, as before', () => {
  let market!: Faced;
  const { story } = stopWith((t) => [(market = several(['photo', 'photo', 'photo', 'voice', 'text'], t, at(300)))]);
  const p = planOf(story);
  const card = cardsOf(p).find((c) => c.capture.id === market.id)!;
  assert.equal(card.pieces?.length, 3);
  assert.ok(!card.videos?.length);
  // The memo plays while the grid is up, from its start, and the note follows it beside the grid.
  const early = frameAt(p, card.t0 + 600);
  assert.ok(cardOn(early) && bubblesOn(early).some((b) => b.capture.kind === 'voice' && b.playing), 'the memo plays beside the grid');
  assert.equal(cardOn(early).turn, 0, 'it shows its pictures, and has no video to turn to');
});

test('RC37: with videos a moment\'s pictures show as the grid, then each video plays in turn in the same card with sound, and the card stays up while its memos play', () => {
  let market!: Faced;
  const { story } = stopWith((t) => [(market = several(['photo', 'photo', 'video', 'voice', 'video', 'text'], t, at(300), [null, null, '4000', '3000', '2500', 'Loud in here.']))]);
  const p = planOf(story);
  const cards = cardsOf(p).filter((c) => c.capture.id === market.id);
  assert.equal(cards.length, 1, 'one card for the whole moment');
  const card = cards[0];
  assert.deepEqual([card.pieces?.map((x) => x.kind), card.videos?.length], [['photo', 'photo'], 2], 'its pictures are the grid; its videos are not in the cells');
  // Read through the card's time: what it shows in turn, and what sounds.
  const turns: number[] = [];
  let sounding = 0;
  let memoPlayed = 0;
  let videoPlayed = 0;
  for (let ms = card.t0; ms < card.t1; ms += 20) {
    const f = frameAt(p, ms);
    const c = cardOn(f);
    assert.ok(c && c.key === market.id, `the card left at ${ms - card.t0} ms, before the moment was over`);
    const turn = c.turn ?? 0;
    if (turns[turns.length - 1] !== turn) turns.push(turn);
    const memo = bubblesOn(f).some((b) => b.capture.kind === 'voice' && b.playing);
    const video = turn > 0 && c.playing;
    if (memo) memoPlayed += 20;
    if (video) videoPlayed += 20;
    if (memo && video) sounding += 20;
  }
  assert.deepEqual(turns, [0, 1, 2], 'the grid, then each video in turn');
  assert.ok(Math.abs(videoPlayed - 6500) < 200, `the videos played ${videoPlayed} ms`);
  assert.ok(Math.abs(memoPlayed - 3000) < 200, `the memo played ${memoPlayed} ms with the card still up`);
  assert.equal(sounding, 0, 'a memo never sounds over a video');
  // Each video is the card's own playing, with its own progress from 0 to 1, as a video on its own has.
  const one = frameAt(p, card.t0);
  assert.equal(cardOn(one).playing, false);
  const during = (turn: number) => { for (let ms = card.t0; ms < card.t1; ms += 20) { const c = cardOn(frameAt(p, ms)); if ((c.turn ?? 0) === turn && c.playing && c.progress > 0.4 && c.progress < 0.6) return c; } return null; };
  assert.ok(during(1) && during(2), 'each video plays through');
  assert.deepEqual(cardOn(frameAt(p, card.t1 - 1)).videos?.map((v) => v.kind), ['video', 'video']);
  // The note is beside from the start; nothing counts the pieces.
  assert.ok(bubblesOn(frameAt(p, card.t0 + token('grow') + 400)).some((b) => b.capture.kind === 'text'));
  // A video with a memo and nothing else is one card too: the video, then the memo with the card up.
  let pair!: Faced;
  const two = stopWith((t) => [(pair = several(['video', 'voice'], t, at(300), ['4000', '3000']))]);
  const tp = planOf(two.story);
  const pc = cardsOf(tp).filter((c) => c.capture.id === pair.id);
  assert.equal(pc.length, 1);
  assert.ok(bubblesOn(frameAt(tp, pc[0].t1 - token('tuck') - token('mediaTail') - 500)).some((b) => b.playing) && cardOn(frameAt(tp, pc[0].t1 - token('tuck') - token('mediaTail') - 500)), 'the card is up while the memo plays');
});

test('RC37: nothing counts a moment\'s pieces, and a grid\'s cells hold no player', () => {
  const grid = read('components/ceremony/Grid.tsx');
  assert.doesNotMatch(grid, /useVideoPlayer|VideoView|CellVideo/, 'a video still plays in a cell');
  const cards = read('components/ceremony/Cards.tsx');
  // The video in turn is the card's own player, made when its turn comes (keyed by its piece), never one a row.
  assert.match(cards, /key=\{[^}]*piece_id[^}]*\}/);
  for (const src of [grid, cards]) {
    assert.doesNotMatch(src, /\bof \$\{|\$\{[^}]*\} of |accessibilityRole="progressbar"|pagination|dots?\b\s*[:=]/i, 'something counts the pieces');
  }
  // The screen reader still steps through every piece (RC47).
  assert.match(read('lib/ceremony/story.ts'), /export const storySteps/);
});
