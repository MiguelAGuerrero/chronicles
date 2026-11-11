// @layer shell
import type { LngLat } from '../types';
import type { Complex, ComplexSource, ComplexStore } from './types';

/**
 * Reads, judges and keeps complexes (CX12, CX14, CX16). `readArea` is the only thing that touches the network (through the
 * source); `lineFor` and `near` read the store alone, so showing a moment makes no request.
 */
export interface Complexes {
  readArea(area: { at: LngLat; reachM: number }, release: string, shouldStop?: () => boolean): Promise<{ complexes: Complex[]; partial: boolean }>;
  near(at: LngLat, spanDeg?: number): Promise<Complex[]>;
  lineFor(fix: LngLat): Promise<{ complex: Complex; near: boolean } | null>;
}

export function createComplexes(_p: { source: ComplexSource; store: ComplexStore; now: () => number }): Complexes {
  throw new Error('complexes: not implemented');
}
