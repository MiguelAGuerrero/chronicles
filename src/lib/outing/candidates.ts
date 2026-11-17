// @layer core
import type { LngLat } from '../types';

/*
 * What an outing is planned over (QC37, QC38, QC40): a candidate (a position and facets by dimension) and a want (an entry the walker
 * picks: a match over facets). The core holds no word of any dimension, value or kind of place; a store is only the first source.
 */

/** A dimension's values for one candidate: `{ a: ['x'] }`, later more dimensions beside it. */
export type Facets = Readonly<Record<string, readonly string[]>>;

export interface Candidate {
  id: string;
  at: LngLat;
  facets: Facets;
  /** Held for a tap and for arrival only: never in a slot, a destination or a map layer (QC17, QC24). */
  name: string;
  /** OJ25, OJ40: a place the person has not found yet: its name waits for arrival and is not said on a tap. */
  unfound?: boolean;
}

/** What a planner is told to accept: one match over facets, or a rule of the caller's (several picks that each widen, OJ14). */
export type Accept = Facets | ((c: Candidate) => boolean);

export interface Want {
  id: string;
  label: string;
  aliases: readonly string[];
  /** The facets it matches: within a dimension any value, across dimensions all. */
  match: Facets;
  /** What a slot says before its place is named. */
  slotWord: string;
}

/** QC38: the picked entries as one match: per dimension the union of their values, so picking within a dimension widens. */
export function mergeFacets(wants: readonly Want[]): Facets {
  const out: Record<string, string[]> = {};
  for (const w of wants) {
    for (const [dim, values] of Object.entries(w.match)) {
      const have = (out[dim] ??= []);
      for (const v of values) if (!have.includes(v)) have.push(v);
    }
  }
  return out;
}

/** QC38: every dimension of `match` has a value the candidate has (across dimensions narrows); an empty match matches nothing. */
export function matches(match: Facets, c: Pick<Candidate, 'facets'>): boolean {
  const dims = Object.keys(match);
  if (!dims.length) return false;
  return dims.every((d) => (c.facets[d] ?? []).some((v) => match[d].includes(v)));
}

/** OJ14: each pick widens: a candidate is wanted when any one pick's own match holds, whatever dimensions the others use. */
export function matchesAny(wants: readonly Want[], c: Pick<Candidate, 'facets'>): boolean {
  return wants.some((w) => matches(w.match, c));
}

export const accepts = (accept: Accept, c: Candidate): boolean => (typeof accept === 'function' ? accept(c) : matches(accept, c));

/** QC40: the facets of a raw record kept to the dimensions and values `dims` knows; anything else is ignored, never an error. */
export function knownFacets(raw: unknown, dims: Readonly<Record<string, readonly string[]>>): Facets {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, string[]> = {};
  for (const [dim, allowed] of Object.entries(dims)) {
    const v = (raw as Record<string, unknown>)[dim];
    if (!Array.isArray(v)) continue;
    const keep = v.filter((x): x is string => typeof x === 'string' && allowed.includes(x));
    if (keep.length) out[dim] = [...new Set(keep)];
  }
  return out;
}
