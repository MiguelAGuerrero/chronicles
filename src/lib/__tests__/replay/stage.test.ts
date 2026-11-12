import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cardWidth, restCenter, STACK_TOP, STAGE_BOTTOM, STAGE_TOP, type StageCtx } from '../../../components/ceremony/layout';

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
  // The stack under the clock, as Stage draws it: 12 in, the clock 36, then two 23 px pills 8 apart, and 8 more.
  assert.equal(STACK_TOP, 12 + 36 + 8 + 23 + 8 + 23 + 8);
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
