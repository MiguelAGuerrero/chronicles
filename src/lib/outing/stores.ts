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
export const DIMENSIONS: Readonly<Record<string, readonly string[]>> = {};

/** QC11: true only for exactly the five fields, facets from the closed lists; any other field fails. */
export function isStore(_x: unknown): _x is Store {
  throw new Error('not built: quick-circuit QC11');
}

export function asCandidate(_s: Store): Candidate {
  throw new Error('not built: quick-circuit QC37');
}
