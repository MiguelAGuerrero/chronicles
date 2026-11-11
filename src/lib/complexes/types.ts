// @layer core
import type { LngLat } from '../types';

/*
 * Complexes (specs/complexes, CX1-CX16): a named, bounded place made of other places. Information only: never a mark, a find,
 * an Area or a place a walk is assigned to. Types only here; the rule is `rule.ts`, the words `lines.ts`.
 */

/** Bumped by hand when the rule, a threshold or the decoder's output changes (CX14): the stored rows are read again. */
export const COMPLEX_CODE = 'c1';

export type ComplexKind = 'shopping' | 'markets' | 'campuses' | 'stations' | 'civic';
export const COMPLEX_KINDS: readonly ComplexKind[] = ['shopping', 'markets', 'campuses', 'stations', 'civic'];

/** One tile's piece of a named building (Overture `buildings`): the polygons as the source gave them, never altered (CX2). */
export interface BuildingPiece {
  id: string;
  name: string;
  subtype: string | null;
  class: string | null;
  /** The z14 tile it was read from. */
  tile: [number, number];
  /** MultiPolygon coordinates: polygons, each a list of rings (outer first), each a list of points. */
  polygons: LngLat[][][];
}

/** An Overture place, as far as the rule reads it: where it is and its taxonomy hierarchy, root first. */
export interface PlaceIn {
  at: LngLat;
  hierarchy: string[];
}

/** A complex, derived (CX14). `id` is the building's Overture id; one complex is one row, whatever tiles cut it. */
export interface Complex {
  id: string;
  name: string;
  kind: ComplexKind;
  polygons: LngLat[][][];
  /** A point inside the outline, for Walk to and for the nearest-first order. */
  at: LngLat;
  /** [west, south, east, north]. */
  bbox: [number, number, number, number];
  release: string;
  code: string;
}

/** What the adapter reads for some z14 tiles: the named pieces and the places, and which tiles it did read. */
export type ComplexRead = { ok: true; pieces: BuildingPiece[]; places: PlaceIn[]; tiles: [number, number][] } | { ok: false };

/** CX15: the one interface the data reaches the app through. The Overture adapter is `overtureSource.ts`. */
export interface ComplexSource {
  read(release: string, tiles: [number, number][], shouldStop?: () => boolean): Promise<ComplexRead>;
}

/** Where derived complexes are kept (the `Db` implements it, CX14). */
export interface ComplexStore {
  /** Replaces every row of these buildings. */
  putComplexes(rows: Complex[]): Promise<void>;
  /** The complexes whose bounding box meets the box of `spanDeg` degrees around a point. */
  complexesNear(at: LngLat, spanDeg: number): Promise<Complex[]>;
}
