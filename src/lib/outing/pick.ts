// @layer core
import type { LngLat } from '../types';
import type { Candidate, Facets } from './candidates';

/** QC8: a few stops: two or three. */
export const MIN_STOPS = 2;
export const MAX_STOPS = 3;

/**
 * QC7, QC9: the candidates the picked match accepts, within reach of `from` for the ceiling, nearest first; a tie goes to the more
 * southern, then the more western place. Reads position and facets and nothing else. `offered` holds ids already given for a slot.
 */
export function pickStops(_cands: readonly Candidate[], _match: Facets, _from: LngLat, _ceilingM: number, _offered: ReadonlySet<string> = new Set()): Candidate[] {
  throw new Error('not built: quick-circuit QC9');
}
