// @layer core
import type { LngLat } from '../types';
import type { Candidate } from './candidates';
import type { Store } from './stores';

/** A shop the map's own tiles carry (the fallback): its name, position and presence classes. */
export interface TileShop {
  name: string;
  at: LngLat;
  classes?: readonly string[];
}

/** QC15: one place within this distance for the same name is one stop. */
export const SAME_SHOP_M = 200;

/**
 * QC13, QC15, QC31: the pack's stores and the tiles' shops as candidates, one place once with the pack's record kept by rule (never by
 * a field of either), and a chain never a candidate. Read only by `outing/`.
 */
export function outingCandidates(_stores: readonly Store[], _tiles: readonly TileShop[]): Candidate[] {
  throw new Error('not built: quick-circuit QC15');
}
