// @layer core
import { boundsOf, distanceToLinesM } from '../../geo';
import { tileAt, tilesIn } from '../../tileMath';
import type { LngLat } from '../../types';

/*
 * Reachability is said, never filtered (RP20, the owner, Nov 9: "Trust the tags, but just develop a way to warn or
 * inspect whether something might or may not be accessible, but don't limit the data because of it"). A find needs a
 * capture within 60 m, so a place with no street or path that close may be one you can't reach from public ground.
 */

/** RP20: a street or path closer than this is "close by": the reach of a find (E8). */
export const REACH_M = 60;
/** With no street or path at all within this, nothing is cached there: absence is no evidence, so nothing is said. */
export const KNOWN_M = 300;

/**
 * RP20: whether a street or path lies within 60 m of `at`; null when nothing is known: no line within 300 m, or a
 * z14 tile under the 60 m disc holds no cached line (segments are clipped to their tile, so an unread neighbour's
 * street is simply missing; remarkable-and-public audit 7). A line's tile is read from its pieces' midpoints, which
 * lie inside it, never its ends, which can sit on the shared edge.
 */
export function wayNear(at: LngLat, lines: LngLat[][]): boolean | null {
  const d = distanceToLinesM(at, lines);
  if (d > KNOWN_M) return null;
  if (d <= REACH_M) return true;
  const read = new Set<string>();
  for (const l of lines)
    for (let i = 1; i < l.length; i++) {
      const t = tileAt([(l[i - 1][0] + l[i][0]) / 2, (l[i - 1][1] + l[i][1]) / 2]);
      read.add(`${t.x},${t.y}`);
    }
  const disc = tilesIn(boundsOf([at], REACH_M)!);
  return disc.every(([x, y]) => read.has(`${x},${y}`)) ? false : null;
}

/** RP20: the walk card's line for a place, or null: said only when the streets around are known and none is close. */
export const reachLine = (near: boolean | null): string | null => (near === false ? 'No street or path close by' : null);
