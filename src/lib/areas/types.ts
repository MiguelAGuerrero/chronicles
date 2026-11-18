// @layer core
import type { LngLat } from '../types';

/**
 * The places a walk was in, nested country › state › town › neighborhood.
 * These types are the whole contract: where the names and outlines come from
 * (map tiles, a bundled boundary file, a downloaded region later) sits behind
 * PlaceSource and BoundarySource, so a source can change without touching the
 * assignment or the tables, on either platform.
 */
export type AreaLevel = 'country' | 'state' | 'town' | 'neighborhood';
export const AREA_LEVELS: readonly AreaLevel[] = ['country', 'state', 'town', 'neighborhood'];

/** A named place near the walk, as some source reports it: the nearest one within reach wins its level. */
export interface PlaceCandidate {
  level: AreaLevel;
  name: string;
  at: LngLat;
  /** How far from it a walk still counts as in it (a city reaches further than a village). */
  reachM: number;
  /** The source's own word for it (city, town, village...), where it has one. */
  kind?: string;
  /** A town's real border, where one was read (town outlines, TO1): inside it decides, before any point. */
  outline?: TownOutline;
  /** A neighborhood's real shape, where one was read (neighborhood boundaries, HB5): inside it decides, before any point. */
  hoodOutline?: HoodOutline;
}

/**
 * A neighborhood's shape as read so far (HB1): the pieces of it in the tiles read, merged. `at` lies inside
 * the polygons, never outside them (a concave shape's centroid can); polygons are [lon, lat] rings, outer
 * ring first, then holes.
 */
export interface HoodOutline {
  /** The source's id for it: used only to merge its pieces, never as an area key. */
  id: string;
  name: string;
  subtype: 'neighborhood' | 'macrohood';
  at: LngLat;
  polygons: LngLat[][][];
  bbox: [number, number, number, number];
  /** Square metres of the pieces read: of two shapes over a point, the smaller owns it (HB2). */
  areaM2: number;
}

/**
 * A town's border as read so far (TO1-TO5): the pieces of it in the tiles read,
 * merged. Polygons are [lon, lat] rings, outer ring first, then holes.
 */
export interface TownOutline {
  /** The source's id for it: used only to merge its pieces, never as an area key. */
  id: string;
  name: string;
  /** The source's own point for the town, when the tiles read hold it. */
  at: LngLat | null;
  polygons: LngLat[][][];
  bbox: [number, number, number, number];
  /** Square metres of the pieces read: of two nested outlines, the smaller is the town (TO2). */
  areaM2: number;
}

/** A named region a boundary source found a point inside. */
export interface Region {
  name: string;
  code?: string;
  /** Where its star goes. */
  at: LngLat;
}

/** Answers "which country and state is this point inside?" from real outlines. */
export interface BoundarySource {
  /** Names the data behind it, so a new edition re-places every walk. */
  id: string;
  containing(at: LngLat): { country?: Region; state?: Region } | null;
}

/** Cache: one place at one level, keyed by level, name and parent, never by a source's own ids. */
export interface Area {
  key: string;
  level: AreaLevel;
  name: string;
  parent_key: string | null;
  lon: number;
  lat: number;
  /** The rules and sources it was derived with; rebuilt when they change. */
  rules: string;
}

/** Cache: how much of one walk was in one area, when, and around where. */
export interface WalkArea {
  walk_id: string;
  area_key: string;
  metres: number;
  first_t: number;
  last_t: number;
  /** The middle of what was walked in it. */
  lon: number;
  lat: number;
}
