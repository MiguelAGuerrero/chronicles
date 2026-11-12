/**
 * Where the stage puts things (RR9-RR15): shared by the overlay views, so a
 * card tucks into the pile where the pile is drawn.
 */
import type { Faced } from '../../lib/moment';
import { metersPerPixel } from '../../lib/pins';
import type { LngLat } from '../../lib/types';

export interface StageCtx {
  width: number;
  height: number;
  insets: { top: number; bottom: number; left: number; right: number };
  /** Where the map is centred and its zoom, while it follows the walker; null when it doesn't (reduce motion). */
  center: LngLat | null;
  zoom: number | null;
  held: boolean;
  /** A viewer is open over the stage: the clock stands still and so does any sound (audit 4). */
  paused: boolean;
  reduceMotion: boolean;
  /** Opens captures in the viewer (the replay holds while it is open). */
  open(captures: Faced[]): void;
  /** A memo or video asks the stage's clock to wait for it, or lets it go (audit 20). Stable across renders. */
  wait(key: string, on: boolean): void;
}

export const PILE = { w: 64, h: 80, thumb: 56 } as const;

/** Above the map's credits button and level with the bubbles, clear of the scale bar. */
export const STAGE_BOTTOM = 44;
export const pileCenter = (c: StageCtx): [number, number] => [c.width - c.insets.right - 14 - PILE.w / 2, c.height - c.insets.bottom - STAGE_BOTTOM - PILE.h / 2];
/** Below the top row (Hold, the clock and its line, Skip). */
export const STAGE_TOP = 64;
/**
 * Below all the top can show (tend replay 11): Stage's column 12 in, the clock (36), then "N min later" and "Held" (23
 * each), 8 apart and 8 to spare. A card stands under it, so neither pill draws over a card, on a landscape phone too.
 */
export const STACK_TOP = 12 + 36 + 8 + 23 + 8 + 23 + 8;
/** A card's caption strip and frame under its picture. */
const CARD_EXTRA = 48;
/** The room between the top row and the bottom corner, where a card stands (audit 13: a landscape phone). */
const cardRoom = (c: StageCtx) => ({ top: c.insets.top + STACK_TOP, bottom: c.height - c.insets.bottom - STAGE_BOTTOM });
/** A six-line note's bubble in the bottom-left corner, with its gap. */
const BUBBLE_ROOM = 160;
/** The narrowest a card is drawn. */
const MIN_CARD = 80;
/**
 * The lowest a card reaches: above a note's bubble wherever a card of MIN_CARD still fits over it (a 320 or 375 px
 * phone, a status bar included: the card shrinks before the bubbles lose their room, tend replay 7, audit 3); a
 * landscape phone keeps the whole room.
 */
function cardFloor(c: StageCtx): number {
  const { top, bottom } = cardRoom(c);
  return bottom - BUBBLE_ROOM - top >= MIN_CARD * 1.15 + CARD_EXTRA ? bottom - BUBBLE_ROOM : bottom;
}
export function cardWidth(c: StageCtx): number {
  const { top } = cardRoom(c);
  return Math.max(MIN_CARD, Math.min((c.width - c.insets.left - c.insets.right) * 0.66, 260, (cardFloor(c) - top - CARD_EXTRA) / 1.15));
}
/** Where a card of height `h` rests: mid-room, raised as far as it must be to stay above its floor, never under the top row. */
export function restCenter(c: StageCtx, h = 0): [number, number] {
  const { top, bottom } = cardRoom(c);
  return [(c.width + c.insets.left - c.insets.right) / 2, Math.max(top + h / 2, Math.min((top + bottom) / 2, cardFloor(c) - h / 2))];
}
/** The bubbles' corner: as tall as the room under the top row. */
export const cornerHeight = (c: StageCtx) => Math.max(0, c.height - c.insets.top - STAGE_TOP - c.insets.bottom - STAGE_BOTTOM);

/** A place on screen, from its offset to the map's centre at the map's zoom; null when the map isn't held (no centre or no zoom, audit 25). */
export function project(c: StageCtx, at: LngLat): [number, number] | null {
  if (!c.center || c.zoom == null) return null;
  const mpp = metersPerPixel(c.zoom, c.center[1]);
  const east = (at[0] - c.center[0]) * 111_320 * Math.cos((c.center[1] * Math.PI) / 180);
  const north = (at[1] - c.center[1]) * 111_320;
  return [c.width / 2 + east / mpp, c.height / 2 - north / mpp];
}

/** A small, fixed tilt per capture, so the pile looks dropped, not stacked. */
export function tiltOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return [-7, 5, -3, 8, -5][Math.abs(h) % 5];
}

export const timeOf = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
