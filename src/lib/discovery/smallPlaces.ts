// @layer core
import { classDef, subsetOf, type PresenceClass } from '../presence/presence';
import type { Refinement } from './refine';
import type { Kind, Place } from './types';

/*
 * Small places (specs/small-places SP3-SP22, decision 0183): time capsules, plaques, little libraries and the like, from
 * the places archive (OpenStreetMap locates them, chronicles-data's SL1-SL11). Each is a subset of an existing kind with a
 * switch of its own; the repetitive ones start off. What a place is (its subset, its weight) is presence's; this module
 * says how the subsets read: their rows, their defaults, their words in a sentence and their refinements.
 */

export interface SmallSubset {
  kind: Kind;
  parent: Kind;
  /** The row in "What I'm into". */
  label: string;
  /** Said when two or more unnamed ones of the type are said together ("Passed plaques…", "Plaques" in Found). */
  plural: string;
  /** The unnamed place's own words (presence's archive label), which the plural stands for. */
  single: string;
  /** On by default (SP7, the owner's defaults of Nov 14). */
  on: boolean;
}

/** SP3, SP7, SP10: the subsets, each after its parent in "What I'm into". */
export const SMALL_SUBSETS: readonly SmallSubset[] = [
  { kind: 'plaques', parent: 'monuments', label: 'Plaques and markers', plural: 'Plaques', single: 'A plaque', on: false },
  { kind: 'small_memorials', parent: 'monuments', label: 'Small memorials', plural: 'Memorials', single: 'A memorial', on: false },
  { kind: 'old_stones', parent: 'structures', label: 'Milestones and old stones', plural: 'Old stones', single: 'An old stone', on: false },
  { kind: 'wayside_shrines', parent: 'churches', label: 'Wayside shrines and crosses', plural: 'Wayside shrines', single: 'A wayside shrine', on: false },
  { kind: 'time_capsules', parent: 'curiosities', label: 'Time capsules', plural: 'Time capsules', single: 'A time capsule', on: true },
  { kind: 'little_libraries', parent: 'community', label: 'Little libraries', plural: 'Little libraries', single: 'A little library', on: true },
];

const BY_KIND = new Map(SMALL_SUBSETS.map((s) => [s.kind, s]));

/** SP7, SP8: the subsets that start off. */
export const DEFAULT_OFF: readonly Kind[] = SMALL_SUBSETS.filter((s) => !s.on).map((s) => s.kind);

/** Whether a kind is one of the small subsets. */
export const isSmallKind = (k: Kind | undefined): boolean => !!k && BY_KIND.has(k);

/**
 * SP16, SP19: whether a place is a small place of a subset, by what it is (its classes), whatever kind a refinement has
 * given it yet. A place with no classes (read before them) is not.
 */
export const isSmallPlace = (p: Pick<Place, 'classes'>): boolean => !!p.classes && subsetOf(p.classes) != null;

/** SP3: one refinement per subset: a place of its parent kind whose classes say the subset. */
export const SMALL_REFINEMENTS: readonly Refinement[] = SMALL_SUBSETS.map((s) => ({
  id: `small:${s.kind}`,
  parent: s.parent,
  child: s.kind,
  judge: () => (p: Place) => !!p.classes && subsetOf(p.classes) === s.kind,
}));

/** SP22: an unnamed small place's words as they read in a sentence ("a plaque"); a named one as it is. */
const inSentence = (p: { name: string; generic: boolean }) => (p.generic ? p.name.charAt(0).toLowerCase() + p.name.slice(1) : p.name);

/** SP22: the plural for an unnamed small place's words ("A plaque" → "Plaques"), or null. */
export const pluralOf = (single: string): string | null => SMALL_SUBSETS.find((s) => s.single === single)?.plural ?? null;

/**
 * SP22, U13: places as they read in "Passed … without stopping": one or two by name; two unnamed of one type as its plural
 * ("plaques"); more than two, "a few places". Never a number.
 */
export function passedNames(places: readonly { name: string; generic: boolean }[]): string | null {
  if (!places.length) return null;
  if (places.length > 2) return 'a few places';
  const [a, b] = places;
  if (b && a.generic && b.generic && a.name === b.name) {
    const plural = pluralOf(a.name);
    if (plural) return plural.toLowerCase();
  }
  return places.map(inSentence).join(' and ');
}

/**
 * SP20: what a walk passed, said: small places only when nothing else was passed, so a museum skipped is never lost among
 * plaques (the lows stay in).
 */
export function keepTheLows<T extends { kind?: Kind }>(passed: readonly T[]): T[] {
  const big = passed.filter((p) => !isSmallKind(p.kind));
  return big.length ? big : [...passed];
}

/** SP21: an area's finds as rows: the unnamed ones of one type, two or more, as one row named in the plural; no number. */
export function foundRows<T extends { name: string; generic?: boolean }>(finds: readonly T[]): T[] {
  const out: T[] = [];
  const grouped = new Map<string, number>();
  for (const f of finds) if (f.generic && pluralOf(f.name)) grouped.set(f.name, (grouped.get(f.name) ?? 0) + 1);
  const said = new Set<string>();
  for (const f of finds) {
    if (f.generic && (grouped.get(f.name) ?? 0) > 1) {
      if (said.has(f.name)) continue;
      said.add(f.name);
      out.push({ ...f, name: pluralOf(f.name)! });
    } else out.push(f);
  }
  return out;
}

/** The subset a kind is, for its row's words. */
export const smallSubset = (k: Kind): SmallSubset | undefined => BY_KIND.get(k);

/** The presence classes' subsets, for a check that every subset has a class (a test reads it). */
export const subsetOfClass = (c: PresenceClass): Kind | undefined => classDef(c).subset;
