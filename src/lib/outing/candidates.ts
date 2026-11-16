// @layer core
import type { LngLat } from '../types';

/*
 * What an outing is planned over (QC37, QC38, QC40): a candidate (a position and facets by dimension) and a want (an entry the walker
 * picks: a match over facets). The core holds no word of any dimension, value or kind of place; a store is only the first source.
 */

/** A dimension's values for one candidate: `{ what: ['antiques'] }`, later `{ how: ['thrift'] }`. */
export type Facets = Readonly<Record<string, readonly string[]>>;

export interface Candidate {
  id: string;
  at: LngLat;
  facets: Facets;
  /** Held for a tap and for arrival only: never in a slot, a destination or a map layer (QC17, QC24). */
  name: string;
}

export interface Want {
  id: string;
  label: string;
  aliases: readonly string[];
  /** The facets it matches: within a dimension any value, across dimensions all. */
  match: Facets;
  /** What a slot says before its place is named: "an antiques shop". */
  slotWord: string;
}

/** QC38: the picked entries as one match: per dimension the union of their values, so picking within a dimension widens. */
export function mergeFacets(_wants: readonly Want[]): Facets {
  throw new Error('not built: quick-circuit QC38');
}

/** QC38: every dimension of `match` has a value the candidate has (across dimensions narrows); an empty match matches nothing. */
export function matches(_match: Facets, _c: Pick<Candidate, 'facets'>): boolean {
  throw new Error('not built: quick-circuit QC38');
}

/** QC40: the facets of a raw record kept to the dimensions and values `dims` knows; anything else is ignored, never an error. */
export function knownFacets(_raw: unknown, _dims: Readonly<Record<string, readonly string[]>>): Facets {
  throw new Error('not built: quick-circuit QC40');
}
