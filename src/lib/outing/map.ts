// @layer core
import { boundsOf, type Bounds } from '../geo';
import type { LngLat } from '../types';
import type { Outing } from './plan';

/**
 * What the outing's map is given (QC24): the route and plain points for the stops. It has no field for a label, a name or a place's
 * kind, so nothing here can say what a stop is; the basemap's own labels are the map style's concern.
 */
export interface OutingMap {
  route: LngLat[] | null;
  /** The stops, plain and unlabelled. */
  pins: LngLat[];
  fit: Bounds | null;
}

export function outingMap(o: Outing | null): OutingMap {
  if (!o) return { route: null, pins: [], fit: null };
  return { route: o.path, pins: o.stops.map((s) => s.at), fit: boundsOf(o.path, 40) };
}

/** The scale row's height over the sheet: the scale bar's label and line, and the credits (i) beside them (tend map audit 50). */
export const SCALE_ROW_H = 28;
/** The room under the field over the map (its foot is about 58 px below the safe area) and around the frame's sides. */
const FIELD_ROOM = 64;
const SIDE = 24;

/**
 * The outing map's frame over its sheet (tend map 24, tend map audit 50): the scale bar and the credits (i) 12 px above
 * the sheet, and the journey framed below the field and above that row, so no stop lies under the bar or the (i).
 */
export function outingFrame(o: { sheetH: number; insetTop: number }): {
  padding: { top: number; right: number; bottom: number; left: number };
  scaleInset: { bottom: number; left: number };
} {
  const scaleBottom = o.sheetH + 12;
  return {
    padding: { top: o.insetTop + FIELD_ROOM, right: SIDE, bottom: scaleBottom + SCALE_ROW_H + 8, left: SIDE },
    scaleInset: { bottom: scaleBottom, left: 12 },
  };
}

/**
 * The sheet's height and the page's width a frame is made for (tend map audit 49): the ones the page has now, unless the
 * person moved the map by hand since this journey was framed (`hand`, for the content it was moved over), when the frame
 * keeps the ones it had then, so a change of the sheet never takes their move back.
 */
export function outingHeld(
  hand: { content: string; sheetH: number; width: number } | null,
  content: string,
  now: { sheetH: number; width: number },
): { sheetH: number; width: number } {
  return hand && hand.content === content ? { sheetH: hand.sheetH, width: hand.width } : now;
}

/**
 * What the outing map frames (tend map audit 52): what the journey asks (`useJourney`'s fit: the journey, or with a
 * destination and no journey yet the destination's town), or with neither, where you stand, so the page's subject shows
 * in the band above the sheet rather than whatever the map last showed.
 */
export function outingFrameBounds(o: { fit: Bounds | null; you: LngLat | null }): Bounds | null {
  if (o.fit) return o.fit;
  return o.you ? boundsOf([o.you], 250) : null;
}
