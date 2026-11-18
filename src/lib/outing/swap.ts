// @layer core
import { distanceM } from '../geo';
import type { LngLat } from '../types';
import { matches, type Candidate, type Facets } from './candidates';

/**
 * QC21: the other candidate, of the picked match, nearest to the stop it replaces, within the ceiling of `from`, that the circuit does
 * not hold and has not been offered for this slot; null when none. It does not wrap: the caller adds the answer to the slot's offered set.
 */
export function swapCandidate(replacing: Candidate, held: readonly Candidate[], cands: readonly Candidate[], match: Facets, from: LngLat, ceilingM: number, offered: ReadonlySet<string>): Candidate | null {
  const taken = new Set(held.map((h) => h.id));
  const rest = cands
    .filter((c) => !taken.has(c.id) && !offered.has(c.id) && matches(match, c) && distanceM(from, c.at) <= ceilingM)
    .map((c) => ({ c, d: Math.round(distanceM(replacing.at, c.at)) }))
    .sort((a, b) => a.d - b.d || a.c.at[1] - b.c.at[1] || a.c.at[0] - b.c.at[0] || (a.c.id < b.c.id ? -1 : 1));
  return rest[0]?.c ?? null;
}
