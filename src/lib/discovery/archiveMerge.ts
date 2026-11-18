// @layer core
import { distanceM } from '../geo';
import type { LngLat } from '../types';
import { normalizeName } from './places';
import { isArtworkClass, UNNAMED_ARTWORK, type PresenceClass } from '../presence/presence';
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

/**
 * XS14 (the second review, Nov 17): an unnamed map place and an unnamed archive place of one category within this are one
 * place: the map's untyped artwork reads "Public art", the archive's statue "A statue", so their names never match.
 */
export const SAME_UNNAMED_M = 20;

/** XS14, explore-subtypes audit 3: only an unnamed artwork and an unnamed statue, mural or sculpture are one thing. */
const isArtwork = (p: { classes?: readonly PresenceClass[] }) => !!p.classes && isArtworkClass(p.classes);
const twins = (t: Place, a: Place) => t.generic && a.generic && isArtwork(t) && isArtwork(a) && distanceM(t.at, a.at) <= SAME_UNNAMED_M;

/** PW8: the map's places and the archive's, a place in both kept once, with the archive's category and kind. */
export function mergePlaces(tiles: Place[], archive: Place[]): Place[] {
  if (!archive.length) return tiles;
  // Indexed by name (performance.md: never a scan of one list inside a loop over the other); unnamed ones by category.
  const byName = new Map<string, Place[]>();
  const unnamed = new Map<string, Place[]>();
  for (const a of archive) {
    const k = normalizeName(a.name);
    byName.set(k, [...(byName.get(k) ?? []), a]);
    if (a.generic && isArtwork(a)) unnamed.set(a.category, [...(unnamed.get(a.category) ?? []), a]);
  }
  const kept = tiles.filter((t) => {
    if ((byName.get(normalizeName(t.name)) ?? []).some((a) => samePlace(t, a))) return false;
    return !(t.generic && (unnamed.get(t.category) ?? []).some((a) => twins(t, a)));
  });
  return [...kept, ...archive];
}

/**
 * places-worth-the-stop audit 1-2: a place that matches a find (same name within 50 m, any category) carries the
 * find's key, so a place found under the map's key, or under an earlier archive's position, stays found and is
 * never found twice when the archive's version of it replaces it.
 */
export function keepFindKeys<T extends { key: string; name: string; at: LngLat; generic?: boolean; classes?: readonly PresenceClass[] }>(
  places: T[],
  finds: { key: string; name: string; at: LngLat; generic?: boolean }[],
): T[] {
  if (!finds.length) return places;
  return places.map((p) => {
    // explore-subtypes audit 4: a found unnamed map artwork stays found as the archive's unnamed statue or mural it merged into.
    const art = p.generic && isArtwork(p);
    const f = finds.find((x) => same(p, x) || (art && x.generic && x.name === UNNAMED_ARTWORK && distanceM(p.at, x.at) <= SAME_UNNAMED_M));
    return f && f.key !== p.key ? { ...p, key: f.key } : p;
  });
}
