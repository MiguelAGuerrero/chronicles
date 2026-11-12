// @layer core
import type { LngLat } from '../types';
import type { OutlineSet, TownPick } from './outlines';
import type { PlaceCandidate } from './types';

/*
 * Neighborhood boundaries (HB1-HB16): which neighborhood a point is in, from real shapes where the tiles
 * held them and the nearest point where they did not, and the ground a neighborhood owns for a map to draw.
 * Not written yet: the tests come first.
 */

/** A neighborhood's ground: what a map draws and a card counts across (HB9, HB11). */
export interface Ground {
  polygons: LngLat[][][];
  bbox: [number, number, number, number];
}

const todo = (): never => {
  throw new Error('neighborhood boundaries: not written yet');
};

/** A point inside the polygons (HB1). */
export const hoodRepresentative = (_polygons: LngLat[][][]): LngLat => todo();

/** The candidates with the neighborhood shapes joined in, and the point-only names a shape covers dropped (HB5, HB6). */
export const withHoods = (_candidates: PlaceCandidate[], _set: OutlineSet | null | undefined): PlaceCandidate[] => todo();

/** The neighborhood a point is in (HB2-HB4): the smallest shape holding it, else the nearest point within reach. */
export const hoodAt = (
  _p: LngLat,
  _candidates: PlaceCandidate[],
  _town: TownPick | null,
  _set: OutlineSet | null | undefined,
  _within?: (c: PlaceCandidate) => number,
): PlaceCandidate | null => todo();

/** The ground a neighborhood owns (HB9): its shape with the smaller ones cut out, or the edge of its nearest-point share. */
export const hoodGround = (_hood: PlaceCandidate, _candidates: PlaceCandidate[], _set: OutlineSet | null | undefined): Ground | null => todo();

/** The extent a neighborhood's card counts across (HB11): its shape with the smaller ones cut out; null without a shape. */
export const hoodExtentFor = (
  _area: { level: string; name: string; at: LngLat },
  _set: OutlineSet | null | undefined,
): { outline: Ground; partial: boolean } | null => todo();
