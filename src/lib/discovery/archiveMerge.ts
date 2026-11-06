// @layer core
import { distanceM } from '../geo';
import type { LngLat } from '../types';
import { archivePlace } from './archivePois';
import archiveEdits from './archiveEdits.json';
import { normalizeName } from './places';
import type { Place } from './types';

/*
 * The places archive beside the map's own places (decision 0102): one mark per place (PW8), and the owner's
 * removals and adds (PW13, `archiveEdits.json`).
 */

/** PW8: two sources' places are one within this distance, by name, whatever category each gives. */
export const SAME_PLACE_M = 50;

const same = (a: { name: string; at: LngLat }, b: { name: string; at: LngLat }) =>
  normalizeName(a.name) === normalizeName(b.name) && distanceM(a.at, b.at) <= SAME_PLACE_M;

/** PW8: the map's places and the archive's, a place in both kept once, with the archive's category and kind. */
export function mergePlaces(tiles: Place[], archive: Place[]): Place[] {
  return [...tiles.filter((t) => !archive.some((a) => same(t, a))), ...archive];
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
