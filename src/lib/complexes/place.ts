// @layer core
import type { LngLat } from '../types';
import type { Complex } from './types';

/** CX11: the complex whose outline holds a fix, or lies within the street reach (40 m) of it, else null. Overlaps: one tie rule. */
export function complexAt(_fix: LngLat, _complexes: readonly Complex[]): { complex: Complex; near: boolean } | null {
  throw new Error('complexes: not implemented');
}
