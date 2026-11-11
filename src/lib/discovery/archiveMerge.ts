// @layer core
import { distanceM } from '../geo';
import type { LngLat } from '../types';
import { PARK_RULES } from './parkKind';
import { normalizeName } from './places';
import type { Place } from './types';

/*
 * The places archive beside the map's own places (decision 0103): one mark per place (PW8). The owner's removals
 * and adds are applied when the archive is built, in chronicles-data (`edits.json`, decision 0108), never here.
 */

/** PW8: two sources' places are one within this distance, by name, whatever category each gives. */
export const SAME_PLACE_M = 50;

const same = (a: { name: string; at: LngLat }, b: { name: string; at: LngLat }) =>
  normalizeName(a.name) === normalizeName(b.name) && distanceM(a.at, b.at) <= SAME_PLACE_M;

/**
 * Remarkable-and-public audit 5 (the owner, Nov 9): a large place's two points can sit apart (Wikidata's at a
 * cemetery's gate, the map's mid-grounds), so the same name and category are one place within this.
 */
export const SAME_KIND_M = 200;

const samePlace = (t: Place, a: Place) =>
  same(t, a) || (t.category === a.category && normalizeName(t.name) === normalizeName(a.name) && distanceM(t.at, a.at) <= SAME_KIND_M);

/** PW8: the map's places and the archive's, a place in both kept once, with the archive's category and kind. */
export function mergePlaces(tiles: Place[], archive: Place[]): Place[] {
  // PC2: a place of the archive near a community park keeps it a park: the archive only ever promotes.
  const kept = tiles
    .filter((t) => !archive.some((a) => samePlace(t, a)))
    .map((t) => (t.kind === 'community_parks' && archive.some((a) => distanceM(a.at, t.at) <= PARK_RULES.archiveNearM) ? { ...t, kind: 'parks' as const } : t));
  return [...kept, ...archive];
}

/**
 * places-worth-the-stop audit 1-2: a place that matches a find (same name within 50 m, any category) carries the
 * find's key, so a place found under the map's key, or under an earlier archive's position, stays found and is
 * never found twice when the archive's version of it replaces it.
 */
export function keepFindKeys<T extends { key: string; name: string; at: LngLat }>(places: T[], finds: { key: string; name: string; at: LngLat }[]): T[] {
  if (!finds.length) return places;
  return places.map((p) => {
    const f = finds.find((x) => same(p, x));
    return f && f.key !== p.key ? { ...p, key: f.key } : p;
  });
}
