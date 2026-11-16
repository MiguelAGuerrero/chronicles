// @layer core
import type { LngLat } from '../types';
import type { Candidate, Facets } from './candidates';

/**
 * QC21: the other candidate, of the picked match, nearest to the stop it replaces, within the ceiling of `from`, that the circuit does
 * not hold and has not been offered for this slot; null when none. It does not wrap: the caller adds the answer to the slot's offered set.
 */
export function swapCandidate(_replacing: Candidate, _held: readonly Candidate[], _cands: readonly Candidate[], _match: Facets, _from: LngLat, _ceilingM: number, _offered: ReadonlySet<string>): Candidate | null {
  throw new Error('not built: quick-circuit QC21');
}
