/**
 * Where the stage puts things (RR9-RR15): shared by the overlay views, so a
 * card tucks into the pile where the pile is drawn.
 */
import { easeInOut, easeOut } from '../../lib/ceremony/ease';
import type { StageLive } from '../../lib/ceremony/live';
import type { BubbleOverlay, CardOverlay, WhisperOverlay } from '../../lib/ceremony/types';
import type { Faced } from '../../lib/moment';
import { metersPerPixel } from '../../lib/pins';
import type { LngLat } from '../../lib/types';

export interface StageCtx {
  width: number;
  height: number;
  insets: { top: number; bottom: number; left: number; right: number };
  /**
   * The frame on stage, as the replay's loop writes it (replay ceremony RC7): what moves every frame (a card's place, a
   * bubble's fade, where the camera holds the map) is read from it by the leaf that draws it, never handed down, so
   * nothing here changes because time passed.
   */
  live: StageLive;
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
/**
 * The room each side of the top column keeps for Hold, and for Skip with Next under it (replay pace RY12): the edge, a
 * worded button and a gap. The line under the clock wraps inside what is left (`replay-pace ui 3`).
 */
export const STAGE_SIDE = 90;
/**
 * Whether "Held" is drawn (`replay-pace ui 2`): not under a long line. A passed place's sentence (RY21) wraps to two
 * or three lines, and "Held" under it would reach a card standing at STACK_TOP; Hold already reads Play.
 */
export const heldShown = (held: boolean, line: string | null) => held && (line?.length ?? 0) <= 20;
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

/** Where a frame's camera holds the map: its centre and zoom; a null centre is a map left where it is (reduce motion). */
export interface StageCamera {
  center: LngLat | null;
  zoom: number | null;
}

/** A place on screen, from its offset to the camera's centre at its zoom; null when the map isn't held (no centre or no zoom, audit 25). */
export function project(c: Pick<StageCtx, 'width' | 'height'>, camera: StageCamera, at: LngLat): [number, number] | null {
  if (!camera.center || camera.zoom == null) return null;
  const mpp = metersPerPixel(camera.zoom, camera.center[1]);
  const east = (at[0] - camera.center[0]) * 111_320 * Math.cos((camera.center[1] * Math.PI) / 180);
  const north = (at[1] - camera.center[1]) * 111_320;
  return [c.width / 2 + east / mpp, c.height / 2 - north / mpp];
}

/** A small, fixed tilt per capture, so the pile looks dropped, not stacked. */
export function tiltOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return [-7, 5, -3, 8, -5][Math.abs(h) % 5];
}

export const timeOf = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

/**
 * What a leaf of the stage writes on its own element every frame (replay ceremony RC7): only what moves. Lengths in
 * px, `rotate` in degrees; the transform is always translate, then rotate, then scale. A null `maxHeight` is none.
 */
export interface LiveStyle {
  opacity?: number;
  left?: number;
  top?: number;
  maxHeight?: number | null;
  translateX?: number;
  translateY?: number;
  rotate?: number;
  scale?: number;
  textAlign?: 'left' | 'right' | 'center';
}

const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

/**
 * Where a card of `w` by `h` stands in a frame (RR11, RR12, RR18): it grows from its pin, where the frame's camera puts
 * the pin (audit 10), holds, and tucks into the pile; with reduce motion it fades in place.
 */
export function cardPose(o: CardOverlay, c: StageCtx, camera: StageCamera, w: number, h: number): LiveStyle {
  const rest = restCenter(c, h);
  let at = rest;
  let scale = 1;
  let tilt = 0;
  let opacity = 1;
  if (o.fade) {
    opacity = o.tuck > 0 ? 1 - o.tuck : o.grow;
  } else if (o.tuck > 0) {
    const pile = pileCenter(c);
    const b = easeInOut(o.tuck);
    at = [lerp(rest[0], pile[0], b), lerp(rest[1], pile[1], b)];
    scale = lerp(1, PILE.thumb / w, b);
    tilt = lerp(0, tiltOf(o.capture.id), b);
  } else {
    const pin = (o.from ? project(c, camera, o.from) : null) ?? rest;
    const a = easeOut(o.grow);
    at = [lerp(pin[0], rest[0], a), lerp(pin[1], rest[1], a)];
    scale = lerp(0.08, 1, a);
    opacity = Math.min(1, o.grow * 3);
  }
  return { left: at[0] - w / 2, top: at[1] - h / 2, opacity, rotate: tilt, scale };
}

/** A bubble's room in the corner as it comes and goes: none of it eased with reduce motion (RR18, audit 12). */
export function bubbleRoom(o: BubbleOverlay, reduceMotion: boolean): LiveStyle {
  return { maxHeight: reduceMotion ? null : (o.exit > 0 ? 1 - o.exit : o.enter) * 170 };
}

/** A bubble itself: it fades, and without reduce motion lifts in and sinks out. */
export function bubblePose(o: BubbleOverlay, reduceMotion: boolean): LiveStyle {
  const opacity = o.enter * (1 - o.exit);
  return reduceMotion ? { opacity, translateY: 0, scale: 1 } : { opacity, translateY: (1 - o.enter) * 10 - o.exit * 12, scale: 0.96 + 0.04 * o.enter };
}

/** A whisper's width. */
export const WHISPER_WIDTH = 180;

/** A passed place's line beside it, on the side with more room (RR15); without a following map, under the clock. */
export function whisperPose(w: WhisperOverlay, c: StageCtx, camera: StageCamera): LiveStyle {
  const p = project(c, camera, w.at);
  const right = !p || p[0] < c.width / 2;
  return {
    left: p ? Math.min(c.width - WHISPER_WIDTH - 8, Math.max(8, right ? p[0] + 10 : p[0] - 10 - WHISPER_WIDTH)) : (c.width - WHISPER_WIDTH) / 2,
    top: p ? Math.min(c.height - 120, Math.max(c.insets.top + 100, p[1] - 30)) : c.insets.top + 100,
    opacity: w.opacity,
    textAlign: p ? (right ? 'left' : 'right') : 'center',
  };
}
