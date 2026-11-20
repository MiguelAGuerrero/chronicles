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
