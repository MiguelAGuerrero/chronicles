// @layer core
import type { PresenceClass } from '../presence/presence';
import { classDef } from '../presence/presence';
import { MARK_CATEGORIES, notableName } from './noise';

/*
 * What makes a place a mark (S18-S20, AG5): curation over presence's classes, kept apart from what a place is
 * (decision 0140, PR7). Presence says a cinema is culture; curation says it is never a place to find.
 */

/** Classes that count for density and bars but are never marks (S19). */
export const NEVER_MARK: ReadonlySet<PresenceClass> = new Set<PresenceClass>(['cinema', 'green_amenity']);

/**
 * Classes that are marks only when the name says historic or notable (S20): the many plain ones are not attractions.
 * Memorials and nature reserves joined with presence (specs/presence, PR5: many and small, or large and many).
 */
export const BY_NAME: ReadonlySet<PresenceClass> = new Set<PresenceClass>(['worship', 'civic_hall', 'cemetery', 'community', 'memorial', 'nature_reserve']);

/** Whether a class can make a mark at all: a findable category, and not ruled out. */
export function markableClass(c: PresenceClass): boolean {
  const category = classDef(c).category;
  return !!category && MARK_CATEGORIES.includes(category) && !NEVER_MARK.has(c);
}

/** Whether a place of this class and name is a mark (S18-S20). */
export function isMarkFor(c: PresenceClass, name: string): boolean {
  return markableClass(c) && (!BY_NAME.has(c) || notableName(name));
}
