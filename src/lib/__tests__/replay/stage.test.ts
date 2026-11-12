import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cardWidth, restCenter, STAGE_BOTTOM, STAGE_TOP, type StageCtx } from '../../../components/ceremony/layout';

/** The stage of a phone this size, portrait or landscape, with no insets. */
const stage = (width: number, height: number): StageCtx => ({
  width, height, insets: { top: 0, bottom: 0, left: 0, right: 0 }, center: null, zoom: null,
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
  }
});

test('tend replay 7: where there is room, and on a landscape phone, the card stands where it did', () => {
  const tall = stage(390, 844);
  assert.equal(cardWidth(tall), 390 * 0.66);
  assert.equal(restCenter(tall, cardH(cardWidth(tall)))[1], (STAGE_TOP + 844 - STAGE_BOTTOM) / 2);
  const flat = stage(844, 390);
  const fw = cardWidth(flat);
  assert.ok(Math.abs(fw - (390 - STAGE_BOTTOM - STAGE_TOP - 48) / 1.15) < 0.01, `landscape keeps its width (${fw})`);
  assert.equal(restCenter(flat, cardH(fw))[1], (STAGE_TOP + 390 - STAGE_BOTTOM) / 2);
});
