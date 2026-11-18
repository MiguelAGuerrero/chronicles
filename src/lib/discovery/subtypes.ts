// @layer core
import { classDef, subsetOf, type PresenceClass } from '../presence/presence';
import type { Refinement } from './refine';
import type { Kind, Place } from './types';

/*
 * Subtypes (specs/explore-subtypes XS1-XS28, decision 0191; from Small places, specs/small-places SP3-SP22, decision 0183):
 * each a switch of its own under its kind in "What I'm into". What a place is (its subtype, its weight) is presence's; this
 * module says how the subtypes read: their rows, their defaults, their words in a sentence, whether they are small, and
 * their refinements.
 */

export interface Subtype {
  kind: Kind;
  parent: Kind;
  /** The row in "What I'm into". */
  label: string;
  /** Said when two or more unnamed ones of the type are said together ("Passed plaques…", "Plaques" in Found). */
  plural: string;
  /** The unnamed place's own words (presence's archive label), which the plural stands for; null when it never comes unnamed. */
  single: string | null;
  /** On by default (SP7; the owner's defaults of Nov 14 and 17: small things off unless truly artistic). */
  on: boolean;
  /**
   * A small stop (SP16, SP19, SP20; XS17, XS18): never a route's lean, a scenic Sight or a reason to keep a park a park, and
   * named in a passed line only when nothing else was passed.
   */
  small: boolean;
}

/**
 * XS3, XS4: the subtypes, each after its parent in "What I'm into", in the plan's order. A label is the type's own name and
 * fits one line at 320 px (XS22, explore-subtypes audit 2): a planetarium is an observatory's, a bandstand a carousel's.
 */
export const SUBTYPES: readonly Subtype[] = [
  // Art: Public art.
  { kind: 'statues', parent: 'public_art', label: 'Statues and busts', plural: 'Statues', single: 'A statue', on: true, small: false },
  { kind: 'murals', parent: 'public_art', label: 'Murals and mosaics', plural: 'Murals', single: null, on: true, small: false },
  { kind: 'fountains', parent: 'public_art', label: 'Fountains', plural: 'Fountains', single: 'A fountain', on: false, small: true },
  { kind: 'signs', parent: 'public_art', label: 'Signs and totems', plural: 'Signs', single: null, on: true, small: true },
  // History: Monuments and memorials.
  { kind: 'markers', parent: 'monuments', label: 'Markers', plural: 'Markers', single: 'A marker', on: true, small: true },
  { kind: 'plaques', parent: 'monuments', label: 'Plaques', plural: 'Plaques', single: 'A plaque', on: false, small: true },
  { kind: 'war_memorials', parent: 'monuments', label: 'War memorials', plural: 'War memorials', single: 'A war memorial', on: true, small: false },
  { kind: 'small_memorials', parent: 'monuments', label: 'Small memorials', plural: 'Memorials', single: 'A memorial', on: false, small: true },
  { kind: 'battlefields', parent: 'monuments', label: 'Battlefields', plural: 'Battlefields', single: null, on: true, small: false },
  { kind: 'archaeological_sites', parent: 'monuments', label: 'Archaeological sites', plural: 'Archaeological sites', single: null, on: true, small: false },
  // History: Buildings and structures.
  { kind: 'bridges', parent: 'structures', label: 'Bridges', plural: 'Bridges', single: null, on: true, small: false },
  { kind: 'mills', parent: 'structures', label: 'Mills', plural: 'Mills', single: 'A mill', on: true, small: false },
  { kind: 'stations', parent: 'structures', label: 'Stations and depots', plural: 'Stations', single: null, on: true, small: false },
  { kind: 'lighthouses', parent: 'structures', label: 'Lighthouses', plural: 'Lighthouses', single: 'A lighthouse', on: true, small: false },
  { kind: 'civic_buildings', parent: 'structures', label: 'Courthouses and halls', plural: 'Civic buildings', single: null, on: true, small: false },
  { kind: 'forts', parent: 'structures', label: 'Forts and armories', plural: 'Forts', single: null, on: true, small: false },
  { kind: 'towers', parent: 'structures', label: 'Water and clock towers', plural: 'Towers', single: null, on: true, small: false },
  { kind: 'old_machines', parent: 'structures', label: 'Old machines', plural: 'Old machines', single: 'An old machine', on: true, small: false },
  { kind: 'piers', parent: 'structures', label: 'Piers and boardwalks', plural: 'Piers', single: null, on: true, small: false },
  { kind: 'taverns', parent: 'structures', label: 'Old taverns and inns', plural: 'Old taverns', single: null, on: true, small: false },
  { kind: 'old_stones', parent: 'structures', label: 'Old stones', plural: 'Old stones', single: 'An old stone', on: false, small: true },
  // History: Places of worship, Cemeteries.
  { kind: 'wayside_shrines', parent: 'churches', label: 'Wayside shrines', plural: 'Wayside shrines', single: 'A wayside shrine', on: false, small: true },
  { kind: 'mausoleums', parent: 'cemeteries', label: 'Mausoleums and tombs', plural: 'Mausoleums', single: null, on: true, small: false },
  // Parks & green spaces.
  { kind: 'gardens', parent: 'parks', label: 'Gardens', plural: 'Gardens', single: null, on: true, small: false },
  { kind: 'nature_reserves', parent: 'parks', label: 'Nature reserves', plural: 'Nature reserves', single: null, on: true, small: false },
  { kind: 'community_gardens', parent: 'parks', label: 'Community gardens', plural: 'Community gardens', single: 'A community garden', on: true, small: false },
  { kind: 'waterfalls', parent: 'nature', label: 'Waterfalls', plural: 'Waterfalls', single: 'A waterfall', on: true, small: false },
  { kind: 'caves', parent: 'nature', label: 'Caves', plural: 'Caves', single: null, on: true, small: false },
  { kind: 'hot_springs', parent: 'nature', label: 'Hot springs and geysers', plural: 'Hot springs', single: 'A hot spring', on: true, small: false },
  { kind: 'old_trees', parent: 'nature', label: 'Old trees', plural: 'Old trees', single: 'An old tree', on: false, small: true },
  // Culture.
  { kind: 'observatories', parent: 'museums', label: 'Observatories', plural: 'Observatories', single: null, on: true, small: false },
  { kind: 'concert_halls', parent: 'theatres', label: 'Concert halls', plural: 'Concert halls', single: null, on: true, small: false },
  { kind: 'little_libraries', parent: 'community', label: 'Little libraries', plural: 'Little libraries', single: 'A little library', on: true, small: true },
  { kind: 'carousels', parent: 'community', label: 'Carousels', plural: 'Carousels', single: 'A carousel', on: true, small: false },
  // Viewpoints & oddities.
  { kind: 'fire_towers', parent: 'viewpoints', label: 'Fire lookout towers', plural: 'Fire towers', single: null, on: true, small: false },
  { kind: 'old_ruins', parent: 'curiosities', label: 'Ruins', plural: 'Ruins', single: null, on: true, small: false },
  { kind: 'ghost_towns', parent: 'curiosities', label: 'Ghost towns', plural: 'Ghost towns', single: null, on: false, small: false },
  { kind: 'natural_oddities', parent: 'curiosities', label: 'Natural arches and rocks', plural: 'Natural arches', single: null, on: true, small: false },
  { kind: 'roadside_giants', parent: 'curiosities', label: 'Giants and follies', plural: 'Roadside giants', single: null, on: true, small: false },
  { kind: 'survey_marks', parent: 'curiosities', label: 'Survey marks', plural: 'Survey marks', single: null, on: false, small: true },
  { kind: 'time_capsules', parent: 'curiosities', label: 'Time capsules', plural: 'Time capsules', single: 'A time capsule', on: true, small: true },
];

const BY_KIND = new Map(SUBTYPES.map((s) => [s.kind, s]));

/** SP7, SP8, XS6: the subtypes that start off. */
export const DEFAULT_OFF: readonly Kind[] = SUBTYPES.filter((s) => !s.on).map((s) => s.kind);

/** Whether a kind is one of the small subtypes (XS17, XS18). */
export const isSmallKind = (k: Kind | undefined): boolean => !!k && !!BY_KIND.get(k)?.small;

/** Whether a kind is any subtype (a switch under its kind). */
export const isSubtype = (k: Kind | undefined): boolean => !!k && BY_KIND.has(k);

/**
 * SP16, SP19: whether a place is a small place of a subset, by what it is (its classes), whatever kind a refinement has
 * given it yet. A place with no classes (read before them) is not.
 */
export const isSmallPlace = (p: Pick<Place, 'classes'>): boolean => {
  const k = p.classes ? subsetOf(p.classes) : null;
  return !!k && !!BY_KIND.get(k)?.small;
};

/** SP3: one refinement per subset: a place of its parent kind whose classes say the subset. */
export const SUBTYPE_REFINEMENTS: readonly Refinement[] = SUBTYPES.map((s) => ({
  id: `subtype:${s.kind}`,
  parent: s.parent,
  child: s.kind,
  judge: () => (p: Place) => !!p.classes && subsetOf(p.classes) === s.kind,
}));

/** SP22: an unnamed small place's words as they read in a sentence ("a plaque"); a named one as it is. */
const inSentence = (p: { name: string; generic: boolean }) => (p.generic ? p.name.charAt(0).toLowerCase() + p.name.slice(1) : p.name);

/** SP22: the plural for an unnamed small place's words ("A plaque" → "Plaques"), or null. */
/** explore-subtypes audit 11: unnamed words that are no subtype's own, with their plural ("Public art" is a mass noun). */
const OTHER_PLURALS: Readonly<Record<string, string>> = { 'Public art': 'Public art' };

export const pluralOf = (single: string): string | null =>
  SUBTYPES.find((s) => s.single === single)?.plural ?? (Object.prototype.hasOwnProperty.call(OTHER_PLURALS, single) ? OTHER_PLURALS[single] : null);

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
export const smallSubset = (k: Kind): Subtype | undefined => BY_KIND.get(k);

/** The presence classes' subsets, for a check that every subset has a class (a test reads it). */
export const subsetOfClass = (c: PresenceClass): Kind | undefined => classDef(c).subset;
