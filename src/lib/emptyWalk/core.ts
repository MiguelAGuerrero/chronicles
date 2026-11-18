// @layer core
import { distanceM } from '../geo';
import { keptFixes, type ReadTrace } from '../rides';
import type { Pause } from '../types';

/**
 * Empty walk (EW2, the owner's call, Nov 16): the farthest the read fixes of an empty walk may spread, in metres. The
 * measure is the spread of the fixes, never the distance from the first (a cold-start jump is read away by `readTrace`).
 */
export const EMPTY_WALK_M = 15;

export interface EmptyWalkInput {
  /** Moments made on the walk, of any kind. */
  moments: number;
  /** Pause rows, still spells, and gap decisions (kept or dismissed): any of them is evidence of a walk. */
  pauses: number;
  stills: number;
  fills: number;
  /** The walk's fixes as `readTrace` reads them, with its pauses, stills and fills passed. */
  trace: ReadTrace;
}

/**
 * The pauses that keep a walk (EW5): those resumed from. The pause still open at Stop is the way to Stop, which the walk
 * screen shows only while paused (decision 0208), so it is no evidence of a walk: `stopWalk` ends it at the walk's end.
 */
export function pausesKept(pauses: readonly Pause[], endedAt: number): number {
  return pauses.filter((p) => p.ended_at != null && p.ended_at < endedAt).length;
}

/**
 * Whether a stopped walk holds nothing: no moment, no pause, still or gap, at least one read fix, and every read
 * fix within `EMPTY_WALK_M` of every other. Uncertain means kept: no read fix at all is absence of data, not
 * evidence of standing still (EW6), and time spent never decides (EW12).
 */
export function isEmptyWalk(i: EmptyWalkInput): boolean {
  if (i.moments > 0 || i.pauses > 0 || i.stills > 0 || i.fills > 0) return false;
  const fixes = keptFixes(i.trace);
  if (!fixes.length) return false;
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const f of fixes) {
    minLon = Math.min(minLon, f.lon);
    maxLon = Math.max(maxLon, f.lon);
    minLat = Math.min(minLat, f.lat);
    maxLat = Math.max(maxLat, f.lat);
  }
  // The box's diagonal is never shorter than the farthest pair, so a doubtful walk reads as moved.
  return distanceM([minLon, minLat], [maxLon, maxLat]) <= EMPTY_WALK_M;
}
