// @layer core
import { distanceM } from '../geo';
import type { LngLat } from '../types';
import type { Cell } from './cells';

/*
 * An area said in words from its cells (specs/walkability-urban-form UF13). The shares are never shown (UF12): nothing is a
 * score, no number, percentage, rank or comparison between areas. Pure.
 */

export interface CellCounts {
  foot: number;
  car: number;
  neither: number;
  empty: number;
}

/** The cells of an area: all of them, or those whose middle is within `radiusM` of `centre` (the card's ring). */
export function countCells(cells: readonly Cell[], centre?: LngLat, radiusM?: number): CellCounts {
  const out: CellCounts = { foot: 0, car: 0, neither: 0, empty: 0 };
  for (const c of cells) {
    if (centre && radiusM !== undefined && distanceM([(c.west + c.east) / 2, (c.south + c.north) / 2], centre) > radiusM) continue;
    out[c.band]++;
  }
  return out;
}

/** Said only when most of the area's cells are judged; empty cells (a park, water) are left out of the shares. */
const SAID_MIN = 0.5;
const MOSTLY = 0.6;
const A_GOOD_SHARE = 0.25;

export function cellWords(n: CellCounts): string | null {
  const judged = n.foot + n.car + n.neither;
  const all = judged + n.empty;
  if (judged === 0 || all === 0) return null;
  // Mostly empty ground says nothing; empty cells do not count in the shares themselves.
  if (n.empty > judged && judged < 5) return null;
  const [foot, car] = [n.foot / judged, n.car / judged];
  if (foot >= MOSTLY) return 'Mostly easy on foot';
  if (car >= MOSTLY) return 'Mostly built around cars';
  if (foot >= A_GOOD_SHARE && car >= A_GOOD_SHARE) return 'A mix of easy and car-oriented streets';
  return null;
}
void SAID_MIN;
