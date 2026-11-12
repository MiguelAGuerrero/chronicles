// @layer core
import { pointSegmentDist } from '../geo';
import type { LngLat } from '../types';
import type { LandingView } from './view';

/** One busy name the map may place (DC1, DC3): a strip's at its busiest point, along its street; a pocket's at its centre. */
export interface BusyName {
  name: string;
  /** Where names compete for room, a lower order is placed first: the view lists heavier streets first (DC4). Never shown. */
  order: number;
  stale: boolean;
  at: LngLat;
  /**
   * The text's turn in degrees clockwise from level, so a street's name runs along it where it is placed; kept within
   * [-95, 85) so it never reads upside down and a north-south street reads bottom to top. 0 for a pocket's name.
   */
  angle: number;
}

/** The direction of the piece of `lines` nearest `at`, as a text rotation (DC3): clockwise degrees, within [-95, 85). */
export function alongAngle(lines: LngLat[][], at: LngLat): number {
  let best: [LngLat, LngLat] | null = null;
  let bestD = Infinity;
  for (const l of lines)
    for (let i = 1; i < l.length; i++) {
      const d = pointSegmentDist(at, l[i - 1], l[i]);
      if (d < bestD) [best, bestD] = [[l[i - 1], l[i]], d];
    }
  if (!best) return 0;
  const [a, b] = best;
  // East and north in metres near the piece; the screen's y runs down, so north is a negative turn.
  const dx = (b[0] - a[0]) * Math.cos((a[1] * Math.PI) / 180);
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return 0;
  let deg = (-Math.atan2(dy, dx) * 180) / Math.PI;
  // Upright, and anything within 5 degrees of north-south reads bottom to top (explore-dense-city ui 2): [-95, 85).
  if (deg >= 85) deg -= 180;
  if (deg < -95) deg += 180;
  // + 0 turns a -0 into 0.
  return Math.round(deg * 10) / 10 + 0;
}

/**
 * The names the map is given (DC1, DC3): one per strip, at its label point (its busiest, clear of the old pin) and turned
 * along its street there, and one per pocket without a strip, at its centre; in the view's order (heaviest first).
 * `landingView` already names a street once across areas.
 */
export function busyNames(view: LandingView | null | undefined): BusyName[] {
  if (!view) return [];
  const out: BusyName[] = [];
  for (const s of view.strips) out.push({ name: s.name, order: out.length, stale: s.stale, at: s.at, angle: alongAngle(s.lines, s.at) });
  for (const l of view.labels) out.push({ name: l.name, order: out.length, stale: !!l.stale, at: l.at, angle: 0 });
  return out;
}
