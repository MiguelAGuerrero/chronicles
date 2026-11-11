// @layer core
import { outlineOf } from '../areas/borders';
import { inOutline, type OutlineSet } from '../areas/outlines';
import type { PlaceCandidate, TownOutline } from '../areas/types';
import type { LngLat } from '../types';

/*
 * Whole towns (WT1-WT6, decision 0127): which neighborhoods a town's page holds. With the town's border known,
 * every neighborhood point inside it that no smaller town inside it owns, the hamlets inside it too, never a ward;
 * without one, the page lists by the town's reach as before (`townNeighborhoods`).
 */

const ORDINALS = 'first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth';
const WARD = new RegExp(`^(?:(?:\\d+(?:st|nd|rd|th)?|${ORDINALS}|(?:twenty|thirty)[- ]?(?:${ORDINALS}))\\s+ward|ward\\s+(?:no\\.?\\s*)?\\d+)$`, 'i');

/** WT6: a ward ("1st Ward", "Eighth Ward", "Ward 5") is a voting district, not a neighborhood. Only the whole name counts. */
export const isWard = (name: string): boolean => WARD.test(name.normalize('NFC').trim());

/** The town a point is in by the outlines given: the smallest holding it (TO2), or null. */
export function ownerOutline(p: LngLat, set: OutlineSet | null | undefined): TownOutline | null {
  let best: TownOutline | null = null;
  for (const t of set?.towns ?? []) {
    if (inOutline(p, t) && (!best || t.areaM2 < best.areaM2)) best = t;
  }
  return best;
}

/** WT1, WT2: inside the town's border, and not inside a smaller town within it. */
export const insideTown = (p: LngLat, outline: TownOutline, set: OutlineSet | null | undefined): boolean =>
  inOutline(p, outline) && (ownerOutline(p, set)?.id ?? outline.id) === outline.id;

/** The town's own border in a set of whole outlines (the z10 read the borders use), or null. */
export const townBorder = (town: { name: string; at: LngLat }, set: OutlineSet | null | undefined): TownOutline | null => outlineOf(town, set);

/**
 * WT3: how a town's page lists, from its border read. A border: across it. A read that answered with no border for
 * the town: by its reach, as before. A read that failed: not yet; it is tried again, never taken for a town with none.
 */
export function listingBy(read: { complete: boolean; tooMany?: boolean } | null, outline: TownOutline | null): 'border' | 'reach' | 'retry' {
  if (outline) return 'border';
  return read && (read.complete || read.tooMany) ? 'reach' : 'retry';
}

/** WT1, WT2, WT4-WT6: the neighborhood candidates a town's page keeps from a read across its border. */
export function townHoods(o: { hoods: PlaceCandidate[]; hamlets: PlaceCandidate[]; outline: TownOutline; set: OutlineSet | null }): PlaceCandidate[] {
  return [...o.hoods.filter((c) => c.level === 'neighborhood'), ...o.hamlets].filter((c) => !isWard(c.name) && insideTown(c.at, o.outline, o.set));
}
