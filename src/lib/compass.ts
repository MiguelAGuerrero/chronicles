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
