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

/** Said only when one kind of ground stands out; empty cells (a park, water) are left out of the shares. */
const MOSTLY = 0.6;
const A_GOOD_SHARE = 0.25;

/**
 * The card's line (UF13): what the ground is, never how much of it or what it will be like (the vision review, 2026-11-05):
 * no "most", no comparison, no outcome. Nothing when neither stands out.
 */
export function cellWords(n: CellCounts): string | null {
  const judged = n.foot + n.car + n.neither;
  if (judged === 0) return null;
  if (n.empty > judged && judged < 5) return null;
  const [foot, car] = [n.foot / judged, n.car / judged];
  if (foot >= MOSTLY) return 'Streets close together, with crossings';
  if (car >= MOSTLY) return 'Streets far apart and busy';
  if (foot >= A_GOOD_SHARE && car >= A_GOOD_SHARE) return 'Streets close together and far apart, side by side';
  return null;
}
