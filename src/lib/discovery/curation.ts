// @layer core
import type { PresenceClass } from '../presence/presence';
import { classDef, markClassOf } from '../presence/presence';
import { MARK_CATEGORIES } from './noise';
import type { Place } from './types';

/*
 * What makes a place a mark (S18-S20, AG5): curation over presence's classes, kept apart from what a place is
 * (decision 0140, PR7). Presence says a cinema is culture, and that a name is historic or the archive records a place
 * (`historic_name`, `recorded`); curation says a cinema is never a place to find, and what a record or a name makes a mark.
 */

/** Classes that count for density and bars but are never marks (S19). */
export const NEVER_MARK: ReadonlySet<PresenceClass> = new Set<PresenceClass>(['cinema_hall', 'green_amenity']);

/**
 * Classes that are marks only when the name says historic or notable, or the places archive records the place (S20, PS6):
 * the many plain ones are not attractions. Memorials and reserves joined with presence (specs/presence, PR5).
 */
export const BY_NAME: ReadonlySet<PresenceClass> = new Set<PresenceClass>(['worship', 'civic_hall', 'burial_ground', 'community', 'memorial_site', 'reserve']);

/** PS6: what lets a `BY_NAME` class be a mark: a historic name (from the map or the archive), or the archive's record. */
const NOTED: ReadonlySet<PresenceClass> = new Set<PresenceClass>(['historic_name', 'recorded']);

/** Whether a class can make a mark at all: a findable category, and not ruled out. */
export function markableClass(c: PresenceClass): boolean {
  const category = classDef(c).category;
  return !!category && MARK_CATEGORIES.includes(category) && !NEVER_MARK.has(c);
}

/** Whether a place of these classes is a mark (S18-S20, PS6): its mark class can be one, and a `BY_NAME` class is noted. */
export function isMarkFor(classes: readonly PresenceClass[]): boolean {
  const c = markClassOf(classes);
  return !!c && markableClass(c) && (!BY_NAME.has(c) || classes.some((x) => NOTED.has(x)));
}

/**
 * AG1, PS5: whether a place counts toward its bars, the one rule of the atlas and the planner: a findable category counts
 * only places that could be marks (a plain parish church counts toward nothing); food, shops and nightlife count all.
 */
export const countsToward = (p: Pick<Place, 'category' | 'markable'>): boolean => !(p.markable === false && MARK_CATEGORIES.includes(p.category));
