// @layer core
import { classDef } from '../presence/presence';
import type { CategoryId, Kind, Place } from './types';

/*
 * Presence and kinds (PK1-PK3, PK8-PK10, decision 0127): which presence bars a place lights, and which places a route
 * passes rather than goes into. Kinds are the switches; the bars are a grouping over presence's classes (specs/presence-readers).
 */

const HISTORY = classDef('historic').category!;

/**
 * PK1-PK3, PS2, PS11: the bars a place lights, read from its classes: its own category, and History beside it only from the
 * class `historic` (a museum the archive records, or whose name says historic, `presence.named`). A plain museum stays in
 * Culture alone, so History and Culture are not one bar twice (PK5). A place without classes (a row read before them) lights
 * its category alone.
 */
export function barsOf(p: Pick<Place, 'category'> & Partial<Pick<Place, 'classes'>>): CategoryId[] {
  return p.classes?.includes('historic') && p.category !== HISTORY ? [p.category, HISTORY] : [p.category];
}

/** PK9: the kinds a walk passes and sees from the street; museums, theatres and community spaces are gone into instead. */
export const PASS_BY: ReadonlySet<Kind> = new Set<Kind>(['monuments', 'structures', 'churches', 'cemeteries', 'public_art', 'viewpoints', 'curiosities', 'parks', 'community_parks']);

/** PK9: whether a route passes this place rather than goes into it. A place with no kind is judged by nothing: never passed. */
export const passesBy = (p: Pick<Place, 'kind'>): boolean => !!p.kind && PASS_BY.has(p.kind);
