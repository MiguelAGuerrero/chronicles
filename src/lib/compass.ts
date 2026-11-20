// @layer core
/** Compass (CP2, CP3, CP6): pure rules for when it shows and how its needle turns. */

/** A turn this small or smaller counts as north-up: no compass. */
export const NORTH_TOLERANCE_DEG = 1;

/** Degrees folded into (-180, 180]. */
const fold = (deg: number): number => {
  const d = ((deg % 360) + 360) % 360;
  return d > 180 ? d - 360 : d;
};

/** The compass shows only while the map is turned more than a degree from north. */
export function showsCompass(bearing: number): boolean {
  return Number.isFinite(bearing) && Math.abs(fold(bearing)) > NORTH_TOLERANCE_DEG;
}

/** The needle turns against the map, so its north end keeps pointing at true north. */
export function compassRotation(bearing: number): number {
  const r = fold(-bearing);
  return r === 0 ? 0 : r;
}

/**
 * The bearing a fit is made at (CP1; tend map 2, audit 4; `replay-ceremony ui 8`): the one the map has, since a fit
 * never turns the map; north while the compass eases it there (the bearing read mid-ease would stop the map part-way);
 * and north when the fit is asked north-up, as the replay's first beat is, so the path, which is told flat and north-up
 * (RC15), finds the map so and snaps nothing.
 */
export function fitBearing(o: { north: boolean; northEasing: boolean; bearing: number }): number {
  return o.north || o.northEasing ? 0 : o.bearing;
}

/**
 * Whether the follow moves the camera to the dot now (tend map 15): while following, with no hand on the map, and never
 * while the compass eases the map north. A camera jump stops any move under way (maplibre's `jumpTo` starts with
 * `stop()`), so a follow frame mid-ease left the map turned (CP4); the next frame after the ease catches the camera up.
 */
export function followMoves(s: { following: boolean; handOnMap: boolean; northEasing: boolean }): boolean {
  return s.following && !s.handOnMap && !s.northEasing;
}
