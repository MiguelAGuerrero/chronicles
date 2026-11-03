// @layer core
import { boundsOf, type Bounds } from './geo';
import type { Capture } from './types';

/**
 * Moments outside walks as pins (M16), pure. Navigate shows them where they
 * were made; Chronicle shows them too and frames them with the places walked,
 * so a moment far from any walk is not left out of view.
 */

/** Moment pins show from neighbourhood zoom; below it Chronicle's stars stand for places. */
export const MOMENT_PIN_ZOOM = 11;
/** A lone moment is framed this far around (as the day replay frames a pin). */
export const MOMENT_FRAME_M = 150;

/** The captures that are moment pins: outside any walk, with a place. */
export function placedMoments(captures: readonly Capture[]): Capture[] {
  return captures.filter((c) => c.walk_id == null && c.lat != null && c.lon != null);
}

/** The list with `c` in it: its row replaced if there (placed after it was kept), else added. Never mutates. */
export function upsertMoment(list: readonly Capture[], c: Capture): Capture[] {
  const i = list.findIndex((x) => x.id === c.id);
  if (i < 0) return [...list, c];
  const next = list.slice();
  next[i] = c;
  return next;
}

/** The places walked widened to hold every placed moment, each framed `MOMENT_FRAME_M` around. */
export function fitWithMoments(places: Bounds | null, captures: readonly Capture[]): Bounds | null {
  const moments = placedMoments(captures);
  if (!moments.length) return places;
  const box = boundsOf(moments.map((c) => [c.lon!, c.lat!]), MOMENT_FRAME_M)!;
  if (!places) return box;
  return [Math.min(places[0], box[0]), Math.min(places[1], box[1]), Math.max(places[2], box[2]), Math.max(places[3], box[3])];
}
