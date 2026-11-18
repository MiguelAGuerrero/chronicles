// @layer core
import { isMarkable, MARK_CATEGORIES } from '../discovery/noise';
import { isKindHidden } from '../discovery/refinements';
import { isSmallPlace, isSubtype } from '../discovery/subtypes';
import type { Kind, Place } from '../discovery/types';
import type { Candidate } from './candidates';

/*
 * Attractions as a second source of candidates (OJ36, OJ38, OJ40): the places Explore itself could mark, each with its kind as a
 * facet, through the same type a shop comes through. It only reads: nothing here makes a place a mark or a find, and a shop never
 * becomes one by passing beside these. A place not yet found keeps its name for arrival (`unfound`).
 */
export function placeCandidates(places: readonly Place[], hidden: ReadonlySet<Kind>, found: ReadonlySet<string>): Candidate[] {
  const out: Candidate[] = [];
  const seen = new Set<string>();
  for (const p of places) {
    if (!MARK_CATEGORIES.includes(p.category) || !isMarkable(p) || isKindHidden(hidden, p.kind) || isSmallPlace(p) || (p.generic && isSubtype(p.kind))) continue;
    const id = `p:${p.key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, at: p.at, facets: { kind: [p.category] }, name: p.name, ...(found.has(p.key) ? { seen: true } : { unfound: true }) });
  }
  return out;
}
