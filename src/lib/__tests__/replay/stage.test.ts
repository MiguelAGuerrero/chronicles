import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bubblePose, bubbleRoom, cardPose, cardWidth, heldShown, PILE, pileCenter, project, restCenter, STACK_TOP, STAGE_BOTTOM, STAGE_SIDE, STAGE_TOP, tiltOf, WHISPER_WIDTH, whisperPose, type LiveStyle, type StageCtx } from '../../../components/ceremony/layout';
import type { BubbleOverlay, CardOverlay, WhisperOverlay } from '../../ceremony/types';
import { createStageLive } from '../../ceremony/live';

/** The stage of a phone this size, portrait or landscape, with no insets. */
const stage = (width: number, height: number): StageCtx => ({
  width, height, insets: { top: 0, bottom: 0, left: 0, right: 0 }, live: createStageLive(),
  held: false, paused: false, reduceMotion: false, open: () => {}, wait: () => {},
});
/** A photo card's height for its width, as Cards draws it (the picture at 1.15, its frame and caption strip). */
const cardH = (w: number) => w * 1.15 + 41;
/** A six-line note's bubble, from the bottom of the stage. */
const BUBBLE = 160;

test('tend replay 7: on a short phone a card stands clear of a note\'s bubble in the corner, under the top row', () => {
  for (const [w, h] of [[320, 568], [375, 667]]) {
    const c = stage(w, h);
    const cw = cardWidth(c);
    const ch = cardH(cw);
    const y = restCenter(c, ch)[1];
    assert.ok(y + ch / 2 <= h - STAGE_BOTTOM - BUBBLE, `${w}x${h}: the card's foot at ${Math.round(y + ch / 2)} reaches the bubble's ${h - STAGE_BOTTOM - BUBBLE}`);
    assert.ok(y - ch / 2 >= STAGE_TOP, `${w}x${h}: the card's head at ${Math.round(y - ch / 2)} under the top row`);
    assert.ok(cardWidth(c) >= 160, `${w}x${h}: a card no narrower than 160 (${cardWidth(c)})`);
  }
});

test('tend replay 7: where there is room, and on a landscape phone, the card stands where it did', () => {
  const tall = stage(390, 844);
  assert.equal(cardWidth(tall), 390 * 0.66);
  assert.equal(restCenter(tall, cardH(cardWidth(tall)))[1], (STACK_TOP + 844 - STAGE_BOTTOM) / 2);
  const flat = stage(844, 390);
  const fw = cardWidth(flat);
  assert.ok(Math.abs(fw - (390 - STAGE_BOTTOM - STACK_TOP - 48) / 1.15) < 0.01, `landscape keeps the whole room (${fw})`);
  assert.equal(restCenter(flat, cardH(fw))[1], (STACK_TOP + 390 - STAGE_BOTTOM) / 2);
});

test('tend replay 11: a card stands below all the top can show (the clock, "N min later", "Held"), in landscape too', () => {
  for (const [w, h] of [[844, 390], [667, 375], [390, 844], [320, 568]]) {
    const c = stage(w, h);
    const ch = cardH(cardWidth(c));
    const y = restCenter(c, ch)[1];
    assert.ok(y - ch / 2 >= STACK_TOP - 0.01, `${w}x${h}: the card's head at ${Math.round(y - ch / 2)} under the stack's ${STACK_TOP}`);
    assert.ok(y + ch / 2 <= h - STAGE_BOTTOM + 0.01, `${w}x${h}: and above the corner`);
  }
});

test('tend replay 13: the two replay screens take their colours from the theme, as the stage does', () => {
  const root = join(__dirname, '..', '..', '..');
  for (const f of ['app/replay/[id].tsx', 'app/day/[key].tsx']) {
    assert.doesNotMatch(readFileSync(join(root, f), 'utf8'), /['"](#[0-9a-fA-F]{3,8}|rgba?\()/, `${f} has a colour of its own`);
  }
});

test('tend replay audit 3: at 320 x 568 under a 20 px status bar a card still stands clear of the bubbles\' corner', () => {
  const c: StageCtx = { ...stage(320, 568), insets: { top: 20, bottom: 0, left: 0, right: 0 } };
  const cw = cardWidth(c);
  const ch = cardH(cw);
  const y = restCenter(c, ch)[1];
  assert.ok(y + ch / 2 <= 568 - STAGE_BOTTOM - BUBBLE + 0.01, `the card's foot at ${Math.round(y + ch / 2)} reaches the bubble's ${568 - STAGE_BOTTOM - BUBBLE}`);
  assert.ok(y - ch / 2 >= 20 + STACK_TOP - 0.01, `the card's head at ${Math.round(y - ch / 2)} under the stack`);
  assert.ok(cw >= 80, `no narrower than a card can be (${cw})`);
});

// Replay pace, the UI review (Nov 18): the line under the clock can now be a sentence ("Passed ... without stopping", RY21).
test('replay-pace ui 2: "Held" is not drawn under a long line, which wraps and would push it onto a card', () => {
  assert.equal(heldShown(true, null), true);
  assert.equal(heldShown(true, '43 min later'), true, 'a break\'s short line leaves it its room');
  assert.equal(heldShown(true, '1 h 20 min later'), true);
  assert.equal(heldShown(true, 'Passed Hessian Memorial without stopping'), false);
  assert.equal(heldShown(true, 'Passed a few places without stopping'), false);
  assert.equal(heldShown(false, null), false);
});

test('replay-pace ui 3: the line keeps clear of Hold and of Skip with Next under it, on a 320 px phone too', () => {
  // The edge, a worded button's width (Skip, Next: 70 px) and 8 px between.
  assert.ok(STAGE_SIDE >= 12 + 70 + 8, `each side keeps ${STAGE_SIDE} px`);
  assert.ok(320 - 2 * STAGE_SIDE >= 120, 'and the line still has room to say a place on a 320 px phone');
});

// Replay ceremony, the engine (RC7): what moves every frame is worked out from the frame alone, by the leaf that draws it.
const O: [number, number] = [-71.4, 41.812];
const eastOf = (m: number): [number, number] => [O[0] + m / (111_320 * Math.cos((O[1] * Math.PI) / 180)), O[1]];
const card = (o: Partial<CardOverlay>): CardOverlay => ({ kind: 'card', key: 'c', capture: { id: 'c' } as CardOverlay['capture'], from: eastOf(60), grow: 1, tuck: 0, playing: false, progress: 0, fade: false, ...o });

test('RC7: a card\'s place, size and fade are its frame\'s: from its pin, to rest, into the pile (RR11, audit 10)', () => {
  const c = stage(390, 844);
  const w = cardWidth(c);
  const h = w * 1.15 + 41;
  const camera = { center: O, zoom: 16 };
  const rest = restCenter(c, h);
  const pin = project(c, camera, eastOf(60))!;
  const at = (p: LiveStyle): [number, number] => [p.left! + w / 2, p.top! + h / 2];
  const born = cardPose(card({ grow: 0 }), c, camera, w, h);
  assert.deepEqual(at(born).map(Math.round), pin.map(Math.round), 'it starts on its pin, where the camera puts it');
  assert.ok(Math.abs(born.scale! - 0.08) < 1e-9 && born.opacity === 0);
  // The camera moved: the same card starts where its pin now is.
  assert.notDeepEqual(at(cardPose(card({ grow: 0 }), c, { center: eastOf(30), zoom: 16 }, w, h)).map(Math.round), pin.map(Math.round));
  const held = cardPose(card({}), c, camera, w, h);
  assert.deepEqual(at(held), rest);
  assert.deepEqual({ scale: held.scale, opacity: held.opacity, rotate: held.rotate }, { scale: 1, opacity: 1, rotate: 0 });
  const tucked = cardPose(card({ tuck: 1 }), c, camera, w, h);
  assert.deepEqual(at(tucked).map(Math.round), pileCenter(c).map(Math.round), 'it ends in the pile');
  assert.ok(Math.abs(tucked.scale! - PILE.thumb / w) < 1e-9 && tucked.rotate === tiltOf('c'));
  // With reduce motion it stays where it rests and only fades (RR18); with no camera (the map not held) it grows in place.
  const fading = cardPose(card({ fade: true, grow: 0.5 }), c, camera, w, h);
  assert.deepEqual([at(fading), fading.opacity, fading.scale], [rest, 0.5, 1]);
  assert.equal(cardPose(card({ fade: true, tuck: 0.25 }), c, camera, w, h).opacity, 0.75);
  assert.deepEqual(at(cardPose(card({ grow: 0 }), c, { center: null, zoom: null }, w, h)), rest);
});

test('RC7: a bubble\'s room and fade, and a whisper\'s side, are their frame\'s (RR9, RR15, RR18)', () => {
  const c = stage(390, 844);
  const bubble = (enter: number, exit: number): BubbleOverlay => ({ kind: 'bubble', key: 'b', capture: { id: 'b' } as BubbleOverlay['capture'], enter, exit, playing: false, progress: 0 });
  assert.deepEqual(bubbleRoom(bubble(0.5, 0), false), { maxHeight: 85 });
  assert.deepEqual(bubbleRoom(bubble(1, 0.25), false), { maxHeight: 127.5 });
  assert.deepEqual(bubbleRoom(bubble(0.5, 0), true), { maxHeight: null }, 'no height easing with reduce motion (audit 12)');
  assert.deepEqual(bubblePose(bubble(0.5, 0), false), { opacity: 0.5, translateY: 5, scale: 0.98 });
  assert.deepEqual(bubblePose(bubble(1, 0.5), false), { opacity: 0.5, translateY: -6, scale: 1 });
  assert.deepEqual(bubblePose(bubble(0.5, 0), true), { opacity: 0.5, translateY: 0, scale: 1 });
  const whisper = (m: number): WhisperOverlay => ({ kind: 'whisper', key: 'w', text: 'Passed', at: eastOf(m), opacity: 0.6 });
  const camera = { center: O, zoom: 16 };
  const west = whisperPose(whisper(-80), c, camera);
  const east = whisperPose(whisper(80), c, camera);
  assert.equal(west.textAlign, 'left', 'a place left of the middle is said to its right');
  assert.equal(east.textAlign, 'right');
  assert.ok(west.left! > project(c, camera, eastOf(-80))![0] && east.left! + WHISPER_WIDTH < project(c, camera, eastOf(80))![0]);
  assert.equal(west.opacity, 0.6);
  // Without a following map, under the clock, centred.
  assert.deepEqual(whisperPose(whisper(80), c, { center: null, zoom: null }), { left: (390 - WHISPER_WIDTH) / 2, top: 100, opacity: 0.6, textAlign: 'center' });
});
