// @layer core
import { distanceM } from '../geo';
import type { LngLat } from '../types';
import { archivePlace } from './archivePois';
import archiveEdits from './archiveEdits.json';
import { normalizeName } from './places';
import type { Place } from './types';

/*
 * The places archive beside the map's own places (decision 0103): one mark per place (PW8), and the owner's
 * removals and adds (PW13, `archiveEdits.json`).
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
  return [...tiles.filter((t) => !archive.some((a) => samePlace(t, a))), ...archive];
}

export interface ArchiveEdits {
  remove: { name: string; at: LngLat }[];
  add: { name: string; at: LngLat; class: string }[];
}

/** PW13: the owner's removals and adds, as kept in `archiveEdits.json`. */
export const ARCHIVE_EDITS = archiveEdits as ArchiveEdits;

/** PW13: removals drop a place whichever source named it; adds are marks of their class (an unknown class is left out). */
export function applyEdits(places: Place[], edits: ArchiveEdits, version: string): Place[] {
  const kept = places.filter((p) => !edits.remove.some((r) => same(p, r)));
  const added = edits.add.map((a) => archivePlace(a.name, a.class, a.at, version)).filter((p): p is Place => p != null);
  return [...kept.filter((p) => !added.some((a) => same(p, a))), ...added];
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
