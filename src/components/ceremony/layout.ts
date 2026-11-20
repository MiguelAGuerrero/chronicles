/**
 * Where the stage puts things (RR9-RR15): shared by the overlay views, so a
 * card shrinks onto its place where its picture is then drawn. The room itself (the
 * screen's size, the top row, where a card rests) and where a camera puts a
 * place on screen are core (`lib/ceremony/room`, `lib/ceremony/camera`): a
 * ceremony's camera settles a pin under the card with the same arithmetic
 * (replay ceremony RC14).
 */
import { project, type Camera } from '../../lib/ceremony/camera';
import { easeInOut, easeOut } from '../../lib/ceremony/ease';
import type { StageLive } from '../../lib/ceremony/live';
import { cardSize, PICTURE, restCenter, STACK, STAGE_BOTTOM, STAGE_TOP, type StageRoom } from '../../lib/ceremony/room';
import { nameRoom, PASSED, saidRoom, WHISPER } from '../../lib/ceremony/said';
import type { BubbleOverlay, CardOverlay, Frame, PassedOverlay, PictureOverlay, StackEntry, WhisperOverlay } from '../../lib/ceremony/types';
import type { Faced } from '../../lib/moment';

export { project };
export { cardSize, cardWidth, PICTURE, pictureHeight, restCenter, STACK, stackSlop, STACK_TOP, STAGE_BOTTOM, STAGE_SIDE, STAGE_TOP, TOP_BUTTON, topRow } from '../../lib/ceremony/room';
export { PASSED, passedWidth, WHISPER } from '../../lib/ceremony/said';

export interface StageCtx extends StageRoom {
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

/**
 * Whether "Paused" is drawn (`replay-pace ui 2`): not under a long line. A passed place's sentence (RY21) wraps to two
 * or three lines, and "Paused" under it would reach a card standing at STACK_TOP; Pause already reads Play.
 */
export const heldShown = (held: boolean, line: string | null) => held && (line?.length ?? 0) <= 20;
/** The bubbles' corner: as tall as the room under the top row. */
export const cornerHeight = (c: StageCtx) => Math.max(0, c.height - c.insets.top - STAGE_TOP - c.insets.bottom - STAGE_BOTTOM);

/** Where a frame's camera holds the map (`lib/ceremony/camera`): the stage puts a place on screen as the map does. */
export type StageCamera = Camera;

/** A small, fixed lean per moment, so the stack looks gathered by hand, not ruled. */
export function leanOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return [-3, 2, -2, 3, -1][Math.abs(h) % 5];
}

export const timeOf = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
/**
 * The day walked, as the last view says it (replay ceremony RC26): "Saturday, October 24" where the row has `room` px
 * for it, "Sat, October 24" or "Sat, Oct 24" where it has less, so it is always one line between Pause and Skip.
 */
export const dateOf = (t: number, room = Infinity) =>
  new Date(t).toLocaleDateString(undefined, { weekday: room >= 250 ? 'long' : 'short', month: room >= 190 ? 'long' : 'short', day: 'numeric' });
/** Where the last view's date stands: in the top row, where the clock stood (12 in), between Pause and Skip. */
export const DATE_TOP = 12;
/**
 * The room the last view keeps at the top: under the top row (12 in, 48 tall, 8 to spare) and a picture standing on
 * the highest place. The whole walk is framed below it, and so is the card's map, which is the same view (replay
 * ceremony RC24, RC26): neither a control nor the date ever sits on the walk or on what stands on it.
 */
export const WHOLE_TOP = 12 + 48 + 8 + PICTURE.lift + PICTURE.size / 2;

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
  /** Whether the element takes a tap (`replay-ceremony ui 15`): switched on it as its place is, with no render. */
  pointerEvents?: 'auto' | 'none';
}

const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

/** Where a moment's picture stands on a screen: its frame's middle, `PICTURE.lift` over its place (replay ceremony RC28, RC34). */
const standsAt = (c: StageCtx, camera: StageCamera, at: CardOverlay['from']): [number, number] | null => {
  const p = at ? project(c, camera, at) : null;
  return p ? [p[0], p[1] - PICTURE.lift] : null;
};

/**
 * Where a card of `w` by `h` stands in a frame (RR11, RR12, RR18; replay ceremony RC28): it grows from its pin, where
 * the frame's camera puts the pin (audit 10), holds, and shrinks back onto its own place, to the size of the picture
 * that then stands there; one with no place fades where it rests. With reduce motion it fades in place.
 */
export function cardPose(o: CardOverlay, c: StageCtx, camera: StageCamera, w: number, h: number): LiveStyle {
  const rest = restCenter(c, h);
  let at = rest;
  let scale = 1;
  let opacity = 1;
  if (o.fade) {
    opacity = o.tuck > 0 ? 1 - o.tuck : o.grow;
  } else if (o.tuck > 0) {
    const to = standsAt(c, camera, o.from);
    const b = easeInOut(o.tuck);
    if (to) {
      at = [lerp(rest[0], to[0], b), lerp(rest[1], to[1], b)];
      scale = lerp(1, PICTURE.size / w, b);
    } else opacity = 1 - o.tuck;
  } else {
    const pin = (o.from ? project(c, camera, o.from) : null) ?? rest;
    const a = easeOut(o.grow);
    at = [lerp(pin[0], rest[0], a), lerp(pin[1], rest[1], a)];
    scale = lerp(0.08, 1, a);
    opacity = Math.min(1, o.grow * 3);
  }
  return { left: at[0] - w / 2, top: at[1] - h / 2, opacity, rotate: 0, scale };
}

/**
 * Where a picture stands in a frame (RC34): its frame over its place under the frame's camera, shown unless a later
 * one stands where it would. With no camera to place it by, it is not drawn.
 */
export function picturePose(o: PictureOverlay, c: StageCtx, camera: StageCamera): LiveStyle {
  const at = standsAt(c, camera, o.at);
  if (!at) return { left: 0, top: 0, opacity: 0 };
  return { left: at[0] - PICTURE.size / 2, top: at[1] - PICTURE.size / 2, opacity: o.shown ? 1 : 0 };
}

/**
 * Whether a standing picture takes a tap, which opens its moment (`replay-ceremony ui 1`): it shows (one under a
 * later picture takes none: the one showing does), something places it, and no card lies over it (a tap on a card
 * holds the replay; it never opens a picture nobody can see under it). Cards come after the pictures in a frame, so
 * they are read from its end, never past a picture.
 */
export function pictureTaps(f: Frame, p: PictureOverlay, c: StageCtx): boolean {
  if (!p.shown) return false;
  const at = standsAt(c, f.camera.center ? f.camera : f.still ?? f.camera, p.at);
  if (!at) return false;
  // Its tile, not its wider target: a picture just clear of a card's edge still opens.
  const half = PICTURE.size / 2;
  for (let i = f.overlays.length - 1; i >= 0; i--) {
    const o = f.overlays[i];
    if (o.kind === 'picture') break;
    if (o.kind !== 'card') continue;
    const { w, h } = cardSize(c, o.videos?.length ? 0 : o.pieces?.length ?? 0);
    const pose = cardPose(o, c, f.camera, w, h);
    const scale = pose.scale ?? 1;
    if (Math.abs(at[0] - ((pose.left ?? 0) + w / 2)) < (w * scale) / 2 + half && Math.abs(at[1] - ((pose.top ?? 0) + h / 2)) < (h * scale) / 2 + half) return false;
  }
  return true;
}

/**
 * Where a stack's entry stands in its control (RC29, RC30, RC32): `base` is the lowest place's top. Each stands
 * `STACK.pitch` over the one before; one landing is still above its place by `rise`, one under a newer one gives, and
 * the oldest sinks away under the lowest place as it drops off.
 */
export function stackPose(e: StackEntry, base: number): LiveStyle {
  return { top: base - e.slot * STACK.pitch - e.rise + e.give + (e.slot < 0 ? -e.slot * 10 : 0), opacity: e.opacity, rotate: leanOf(e.key) };
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

/**
 * Where a passed place's name stands on the last view (replay ceremony RC25): centred on its place, under the lower of
 * the place and the line where the walker passed it, or over them (`above`, the telling's to say: `said.ts`
 * `lastNames`), kept on the screen and short of the stack while that is up (`stack`). With no place (the one line) it
 * stands where the telling put it, clear of the walk (`replay-ceremony ui 14`), or, with nothing to place it by, under
 * the top row, the `index`th down.
 */
export function passedPose(o: PassedOverlay, c: StageCtx, camera: StageCamera, above: boolean, index: number, stack = false): LiveStyle {
  return { ...nameRoom({ at: o.at, by: o.by ?? null, above, top: o.top }, c, camera, index, stack), opacity: o.opacity };
}

/** The mark on a passed place itself, under its name; none where the name stands beside no place. */
export function passedDot(o: PassedOverlay, c: StageCtx, camera: StageCamera): LiveStyle {
  const p = o.at ? project(c, camera, o.at) : null;
  return p ? { left: p[0] - PASSED.dot / 2, top: p[1] - PASSED.dot / 2, opacity: o.opacity } : { left: 0, top: 0, opacity: 0 };
}

/**
 * A passed place's line as the walker goes by (RR15; `replay-ceremony ui 5`): centred on its place, under the lower
 * of the place and the line where the walker passes it (`by`), a gap clear: pins and pictures stand upward from the
 * line, and the dot and the line are over it. Where the telling says `above` (the way runs down the screen), over
 * the higher of the two instead. Where it says `beside` (the way runs up or down the screen, ui 13), in a room that
 * wide at the line's left, level with its place: beside the line, never across it. Kept on the screen and short of
 * the stack while that is up (`stack`, ui 3). Without a following map, under the clock.
 */
export function whisperPose(w: WhisperOverlay, c: StageCtx, camera: StageCamera, stack = false): LiveStyle {
  const p = project(c, camera, w.at);
  if (!p) return { left: (c.width - WHISPER.width) / 2, top: c.insets.top + 100, opacity: w.opacity };
  const by = project(c, camera, w.by) ?? p;
  const room = saidRoom(c, stack);
  const onScreen = (top: number) => Math.min(c.height - 120 - WHISPER.height, Math.max(c.insets.top + 100, top));
  if (w.beside != null) return { left: Math.max(room.left, Math.min(p[0], by[0]) - WHISPER.side - w.beside), top: onScreen(p[1] - WHISPER.height / 2), opacity: w.opacity };
  const top = w.above ? Math.min(p[1], by[1]) - WHISPER.gap - WHISPER.height : Math.max(p[1], by[1]) + WHISPER.gap;
  return { left: Math.max(room.left, Math.min(room.right - WHISPER.width, p[0] - WHISPER.width / 2)), top: onScreen(top), opacity: w.opacity };
}
