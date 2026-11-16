// @layer core
import type { Candidate } from './candidates';
import type { LngLat } from '../types';

/*
 * A store as the stores pack holds it (QC11, QC12; the contract is `specs/quick-circuit/handoff.md`): an id, a name, a position, its
 * facets and its source, and nothing else. No rating, review count, price level, popularity, photo or "open now"; hours are reserved.
 */
export interface Store {
  id: string;
  name: string;
  at: LngLat;
  facets: Readonly<Record<string, readonly string[]>>;
  src: string;
}

/** The contract's dimensions and their closed lists (v1: what a shop sells). `how` is reserved and not here yet (QC40). */
export const DIMENSIONS: Readonly<Record<string, readonly string[]>> = {
  what: ['antiques', 'vintage', 'books', 'records', 'maps', 'art_supplies', 'crafts', 'second_hand'],
};

const FIELDS = ['at', 'facets', 'id', 'name', 'src'];

/** QC11: true only for exactly the five fields, facets from the closed lists; any other field fails. */
export function isStore(x: unknown): x is Store {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (Object.keys(o).sort().join() !== FIELDS.join()) return false;
  if (typeof o.id !== 'string' || !o.id || typeof o.name !== 'string' || !o.name || typeof o.src !== 'string' || !o.src) return false;
  const at = o.at;
  if (!Array.isArray(at) || at.length !== 2 || !at.every((n) => typeof n === 'number' && Number.isFinite(n))) return false;
  const f = o.facets;
  if (!f || typeof f !== 'object' || Array.isArray(f)) return false;
  const entries = Object.entries(f as Record<string, unknown>);
  if (!entries.length) return false;
  return entries.every(([dim, vs]) => dim in DIMENSIONS && Array.isArray(vs) && vs.length > 0 && vs.every((v) => typeof v === 'string' && DIMENSIONS[dim].includes(v)));
}

export function asCandidate(s: Store): Candidate {
  return { id: s.id, at: s.at, facets: s.facets, name: s.name };
}
