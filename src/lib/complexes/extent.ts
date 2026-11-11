// @layer core
import type { LngLat } from '../types';

/** CX16: at most this many z14 tiles per area read (core constant). */
export const COMPLEX_TILE_BUDGET = 9;

/** CX16: the z14 tiles within an area's reach, nearest its point first, at most the budget; `partial` when more were needed. */
export function tilesFor(_area: { at: LngLat; reachM: number }): { tiles: [number, number][]; partial: boolean } {
  throw new Error('complexes: not implemented');
}
