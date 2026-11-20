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
/** Below the top row (Pause, the clock and its line, Skip). */
export const STAGE_TOP = 64;
/**
 * Below all the top can show (tend replay 11): Stage's column 12 in, the clock (36), then "N min later" and "Paused" (23
 * each), 8 apart and 8 to spare. A card stands under it, so neither pill draws over a card, on a landscape phone too.
 */
export const STACK_TOP = 12 + 36 + 8 + 23 + 8 + 23 + 8;
/**
 * The top row as it is laid out (`replay-ceremony ui 10`, the owner's defaults, Nov 20): a worded button `edge` in
 * from each side (Pause at the left; Skip at the right, Next under it), the clock in the middle of the screen and, on
 * the last view, the date where the clock stood; `gap` between any two. The widths are the words' own at the
 * buttons' size, in the stage's narrower padding (`TOP_BUTTON`), with the clock and the date at their widest ("10:20
 * PM", "Wed, Sep 30"): no text is measured in the core, and the `replay` journey reads the real boxes against one another.
 */
export const TOP_ROW = { edge: 12, gap: 8, clock: 110, date: 122, pause: 75, skip: 64, skipLong: 114, side: 12 + 75 + 8 } as const;
/**
 * The room each side of the top column keeps for Pause, and for Skip with Next under it (replay pace RY12): the edge, a
 * worded button and a gap. The line under the clock wraps inside what is left (`replay-pace ui 3`).
 */
export const STAGE_SIDE = TOP_ROW.side;
/** A top-row button's padding each side: a little under a button's own 16, so the longer word fits a 390 px phone. */
export const TOP_BUTTON = { paddingHorizontal: 12 } as const;
/**
 * What the top row says and leaves (`replay-ceremony ui 10`). Skip says where it goes, "Skip to end", wherever that
 * longer word's button ends a gap short of the clock and of the date at their widest; on a narrower phone it stays
 * "Skip" and is spoken "Skip to the end" (the cold reads could not tell what Skip skips). `room` is what the row
 * leaves in the middle of the screen for the line under the clock and for the date: between Pause and whatever stands
 * at the right, never under 120 px.
 */
export function topRow(width: number): { skip: string; skipSpoken: string; room: number } {
  const long = width / 2 - TOP_ROW.edge - TOP_ROW.skipLong - TOP_ROW.gap >= Math.max(TOP_ROW.clock, TOP_ROW.date) / 2;
  const side = Math.max(TOP_ROW.side, TOP_ROW.edge + (long ? TOP_ROW.skipLong : TOP_ROW.skip) + TOP_ROW.gap);
  return { skip: long ? 'Skip to end' : 'Skip', skipSpoken: long ? 'Skip to end' : 'Skip to the end', room: Math.max(120, width - 2 * side) };
}
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
 * Next under it, 8 apart, then 12 to spare: `replay-ceremony ui 2`), the gap a card keeps from it, and how wide it is
 * to a finger on Android (48 dp, X0).
 */
export const STACK = { w: 44, h: 50, pitch: 25, right: 8, top: 12 + 48 + 8 + 48 + 12, gap: 6, hit: 48 } as const;
/**
 * The room a finger gets beyond the stack's drawing (`replay-ceremony ui 2`): on Android, half of what its 44 px lacks
 * of 48 dp each side; nowhere else (44 pt is an iPhone's target, and a slop does nothing on the web).
 */
export const stackSlop = (os: string): { left: number; right: number } | undefined =>
  os === 'android' ? { left: (STACK.hit - STACK.w) / 2, right: (STACK.hit - STACK.w) / 2 } : undefined;
/**
 * Where the stack's column begins, its gap included (`replay-ceremony ui 3`): what is said over the map while the
 * stack is up (a whisper, the last view's names) ends short of it, as a card and the bubbles' corner do.
 */
export const stackEdge = (c: StageRoom): number => c.width - c.insets.right - STACK.right - STACK.w - STACK.gap;
/**
 * A picture standing on the map (RC28, RC34): its frame's size, how far over its place its middle is (a short stalk
 * joins the two), how near two places are, on the screen, for the later picture to cover the earlier, and the size of
 * the control around it that opens its moment (44 pt, `replay-ceremony ui 1`).
 */
export const PICTURE = { size: 36, lift: 30, apart: 34, hit: 44 } as const;

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
