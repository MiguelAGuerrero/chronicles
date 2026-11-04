// @layer core
import { distanceM, distanceToLinesM, nearPoints } from '../geo';
import type { LngLat, StreetSegment } from '../types';

/**
 * The walk screen's fog (Streets, fog and snapping): when the streets around
 * the walker are read, and which pieces are fog. The reading itself is the
 * fog shell's (`./shell`); these are its decisions (FR1, FR2).
 */
export const FOG_RULES = {
  /** Streets around the walker are shown as fog this far out, by distance to the line. */
  nearM: 1000,
  /** The streets around the walker are read again after this far. */
  stepM: 100,
  /** A piece whose middle the live trace passed this close to counts as walked for now. */
  onTraceM: 20,
} as const;

/** The middle vertex of a piece's first line. */
export function midpointOf(s: StreetSegment): LngLat {
  const line = s.geometry[0] ?? [];
  return line[Math.floor(line.length / 2)] ?? [0, 0];
}

/**
 * Whether the streets around the walker are read now (FR1): on the first fix,
 * then once 100 m from where the last read began. Never while riding (its
 * streets aren't walked, and a bus would read the map every few seconds, rides
 * audit 13), before the tile build is known, or while a read is under way.
 */
export function fogDue(s: { here: LngLat | null; lastAt: LngLat | null; busy: boolean; riding: boolean; build: string | null }): boolean {
  if (!s.here || s.build == null || s.riding || s.busy) return false;
  return !s.lastAt || distanceM(s.lastAt, s.here) >= FOG_RULES.stepM;
}

/**
 * Fog and walked (FR2): of the pieces within 1 km of the walker, credited ones
 * are walked; the rest are fog, except those whose middle this walk's trace
 * passed within 20 m (credited only at stop, so left out of the fog until then).
 */
export function fogOf(i: { pieces: StreetSegment[]; visited: Set<string>; runs: LngLat[][]; here: LngLat }): { fog: StreetSegment[]; walked: StreetSegment[] } {
  const near = i.pieces.filter((x) => distanceToLinesM(i.here, x.geometry) <= FOG_RULES.nearM);
  const walkedNow = nearPoints(i.runs.flat(), FOG_RULES.onTraceM);
  return {
    fog: near.filter((x) => !i.visited.has(x.id) && !walkedNow(midpointOf(x))),
    walked: near.filter((x) => i.visited.has(x.id)),
  };
}
