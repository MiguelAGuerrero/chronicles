// @layer core
/**
 * The stage's room (RR9-RR15; replay ceremony RC14): how big the screen is, what its top row and bottom corner keep,
 * and so where a card of a moment rests. Pure arithmetic, shared by the stage's views (`components/ceremony/layout`,
 * which draws a card there) and by a ceremony's camera (`camera.ts`, which settles a moment's pin just under it): the
 * two can never disagree, and the core imports no view.
 */
import { gridLayout } from './grid';

/** The screen a replay is shown on, as a ceremony is told it (`CeremonyOptions.screen`): its size and its safe edges, in px. */
export interface StageRoom {
  width: number;
  height: number;
  insets: { top: number; bottom: number; left: number; right: number };
}

/** Above the map's credits button and level with the bubbles, clear of the scale bar. */
export const STAGE_BOTTOM = 44;
/** Below the top row (Hold, the clock and its line, Skip). */
export const STAGE_TOP = 64;
/**
 * Below all the top can show (tend replay 11): Stage's column 12 in, the clock (36), then "N min later" and "Held" (23
 * each), 8 apart and 8 to spare. A card stands under it, so neither pill draws over a card, on a landscape phone too.
 */
export const STACK_TOP = 12 + 36 + 8 + 23 + 8 + 23 + 8;
/** A card's caption strip and frame under its picture. */
const CARD_EXTRA = 48;
/** A card's frame over its picture and its caption strip under it, as drawn (`Cards.tsx`). */
const CARD_FRAME = { top: 7, side: 7, caption: 34 } as const;
/** A photo's or video's picture in its card, as tall as this share of the card's width. */
const CARD_ASPECT = 1.15;
/** The gap between a grid's cells. */
const GRID_GAP = 4;
/** A six-line note's bubble in the bottom-left corner, with its gap. */
const BUBBLE_ROOM = 160;
/** The narrowest a card is drawn. */
const MIN_CARD = 80;
/**
 * The stack at the right edge (replay ceremony RC29-RC31): an entry's size (one control, 44 pt at the least), how far
 * each stands over the one before, how far in from the edge, the top row it stays under (Skip, 12 in and 48 tall, and
 * Next under it, 8 apart and 8 to spare), and the gap a card keeps from it.
 */
export const STACK = { w: 44, h: 50, pitch: 25, right: 8, top: 12 + 48 + 8 + 48 + 8, gap: 6 } as const;
/**
 * A picture standing on the map (RC28, RC34): its frame's size, how far over its place its middle is (a short stalk
 * joins the two), and how near two places are, on the screen, for the later picture to cover the earlier.
 */
export const PICTURE = { size: 36, lift: 30, apart: 34 } as const;

/** The room between the top row and the bottom corner, where a card stands (audit 13: a landscape phone). */
const cardRoom = (c: StageRoom) => ({ top: c.insets.top + STACK_TOP, bottom: c.height - c.insets.bottom - STAGE_BOTTOM });

/**
 * The lowest a card reaches: above a note's bubble wherever a card of MIN_CARD still fits over it (a 320 or 375 px
 * phone, a status bar included: the card shrinks before the bubbles lose their room, tend replay 7, audit 3); a
 * landscape phone keeps the whole room.
 */
function cardFloor(c: StageRoom): number {
  const { top, bottom } = cardRoom(c);
  return bottom - BUBBLE_ROOM - top >= MIN_CARD * CARD_ASPECT + CARD_EXTRA ? bottom - BUBBLE_ROOM : bottom;
}

export function cardWidth(c: StageRoom): number {
  const { top } = cardRoom(c);
  const across = c.width - c.insets.left - c.insets.right;
  // Never under the stack at the edge (RC30): on a 320 px phone two thirds of the width would reach it.
  return Math.max(MIN_CARD, Math.min(across * 0.66, 260, (cardFloor(c) - top - CARD_EXTRA) / CARD_ASPECT, across - 2 * (STACK.right + STACK.w + STACK.gap)));
}

/** Where a card of height `h` rests: mid-room, raised as far as it must be to stay above its floor, never under the top row. */
export function restCenter(c: StageRoom, h = 0): [number, number] {
  const { top, bottom } = cardRoom(c);
  return [(c.width + c.insets.left - c.insets.right) / 2, Math.max(top + h / 2, Math.min((top + bottom) / 2, cardFloor(c) - h / 2))];
}

/** The picture's height in a card of one picture (a photo, a video): what a moment with videos keeps for all it shows in turn (RC37). */
export const pictureHeight = (width: number) => width * CARD_ASPECT;

/** A grid's height for its width: its rows of square cells (MS17). */
export function gridHeight(n: number, width: number): number {
  const g = gridLayout(n);
  const cell = (width - GRID_GAP * (g.cols - 1)) / g.cols;
  return g.rows * cell + GRID_GAP * (g.rows - 1);
}

/**
 * A card's size on a screen: its width, its picture's height and its own. A photo or a video is one picture; a
 * stack's grid (`pieces` of them, two or more) sits in a square of the card's width (MS17).
 */
export function cardSize(c: StageRoom, pieces = 0): { w: number; h: number; imgH: number } {
  const w = cardWidth(c);
  const imgH = pieces > 0 ? gridHeight(pieces, w - 2 * CARD_FRAME.side) : w * CARD_ASPECT;
  return { w, h: imgH + CARD_FRAME.top + CARD_FRAME.caption, imgH };
}

/** Where a card's lower edge rests on a screen: the y its pin is settled under (replay ceremony RC14). */
export function cardFoot(c: StageRoom, pieces = 0): number {
  const { h } = cardSize(c, pieces);
  return restCenter(c, h)[1] + h / 2;
}
