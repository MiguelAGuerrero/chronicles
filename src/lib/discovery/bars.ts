// @layer core
import { notableName } from './noise';
import type { CategoryId, Kind, Place } from './types';

/*
 * Presence and kinds (PK1-PK3, PK8-PK10, decision 0127): which presence bars a place lights, and which places a route
 * passes rather than goes into. Kinds are the switches; the bars are a grouping over them, and a place may light two.
 */

/**
 * presence-and-kinds audit 5: a name word that says the place itself is historic. "Old" in a neighbourhood's name (Old
 * Town, Old City) or in "old and new" says nothing of the place, so those phrases are read past.
 */
const historicName = (name: string): boolean =>
  notableName(name.replace(/\bold\s+(town|city|quarter|village)\b/gi, ' ').replace(/\bold\s+(and|&)\s+new\b/gi, ' '));

/**
 * PK1-PK3: the bars a place lights: its own category, plus History for a museum or gallery the data already calls
 * historic: an archive class that says so (`alsoBars`, the archive's museum) or a word from `notable.json` in its name.
 * A plain museum stays in Culture alone, so History and Culture are not one bar twice (PK5).
 */
export function barsOf(p: Pick<Place, 'category' | 'name'> & Partial<Pick<Place, 'kind' | 'alsoBars'>>): CategoryId[] {
  const out: CategoryId[] = [p.category];
  const historic = p.kind === 'museums' && (p.alsoBars?.includes('history') || historicName(p.name));
  for (const b of [...(p.alsoBars ?? []), ...(historic ? (['history'] as const) : [])]) if (!out.includes(b)) out.push(b);
  return out;
}

/** PK9: the kinds a walk passes and sees from the street; museums, theatres and community spaces are gone into instead. */
export const PASS_BY: ReadonlySet<Kind> = new Set<Kind>(['monuments', 'structures', 'churches', 'cemeteries', 'public_art', 'viewpoints', 'curiosities', 'parks']);

/** PK9: whether a route passes this place rather than goes into it. A place with no kind is judged by nothing: never passed. */
export const passesBy = (p: Pick<Place, 'kind'>): boolean => !!p.kind && PASS_BY.has(p.kind);
