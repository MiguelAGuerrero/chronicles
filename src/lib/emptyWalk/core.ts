// @layer core
import { distanceM } from '../geo';
import { keptFixes, type ReadTrace } from '../rides';

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
