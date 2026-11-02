import type { LngLat } from './types';

/**
 * The last fix Navigate read (NV17), in memory only: Explore starts its map
 * there (NV16), so it never asks for a position of its own. Nothing tracks:
 * it is one fix, kept until the next one is read.
 */
let last: { at: LngLat; t: number } | null = null;
export const getLastFix = () => last;
export function setLastFix(at: LngLat, t = Date.now()) {
  last = { at, t };
}
