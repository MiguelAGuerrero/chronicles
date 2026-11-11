// @layer core
import { outlineOf } from '../areas/borders';
import { BORDER_ZOOM, inOutline, outlineTileKey, type OutlineSet } from '../areas/outlines';
import type { PlaceCandidate, TownOutline } from '../areas/types';
import type { LngLat } from '../types';

/*
 * Whole towns (WT1-WT6, decision 0127): which neighborhoods a town's page holds. With the town's border known,
 * every neighborhood point inside it that no smaller town inside it owns, the hamlets inside it too, never a ward;
 * without one, the page lists by the town's reach as before (`townNeighborhoods`).
 */

const UNITS = 'first|second|third|fourth|fifth|sixth|seventh|eighth|ninth';
const ORDINALS = `${UNITS}|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|thirtieth|fortieth|fiftieth`;
const CARDINALS = 'one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty';
// Whole-towns audit 10: "Ward One", "Thirtieth Ward", "Ward 5A" too.
const WARD = new RegExp(
  `^(?:(?:\\d+(?:st|nd|rd|th)?|${ORDINALS}|(?:twenty|thirty|forty|fifty)[- ]?(?:${UNITS}))\\s+ward|ward\\s+(?:no\\.?\\s*)?(?:\\d+[a-z]?|${CARDINALS}))$`,
  'i',
);

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

/** A tile's bounds at zoom z: [west, south, east, north]. */
function tileBounds(x: number, y: number, z: number): [number, number, number, number] {
  const n = 2 ** z;
  const lat = (t: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * t) / n))) * 180) / Math.PI;
  return [(x / n) * 360 - 180, lat(y + 1), ((x + 1) / n) * 360 - 180, lat(y)];
}

/**
 * Whole-towns audit 1: a town's border read by tile is cut at the tile's edges, so a city across a z10 edge lost the
 * neighborhoods past it. Spots just beyond each edge of a read tile that the town's border reaches (corners too), in
 * tiles not read yet: read them as well and the border is whole. Empty when it already is.
 */
export function borderReach(town: { name: string; at: LngLat }, set: OutlineSet | null | undefined, z: number = BORDER_ZOOM): LngLat[] {
  const o = townBorder(town, set);
  if (!o || !set) return [];
  const out = new Map<string, LngLat>();
  for (const key of set.tiles) {
    const [tz, x, y] = key.split('/').map(Number);
    if (tz !== z) continue;
    const [w, s, e, n] = tileBounds(x, y, z);
    const tol = (e - w) * 0.05;
    const [bw, bs, be, bn] = o.bbox;
    // The border's box within this tile, and the sides it is cut at.
    const lo = Math.max(bs, s);
    const hi = Math.min(bn, n);
    const left = Math.max(bw, w);
    const right = Math.min(be, e);
    if (lo > hi || left > right) continue;
    const midLat = (lo + hi) / 2;
    const midLon = (left + right) / 2;
    const step = (e - w) * 0.1;
    const cut = { w: Math.abs(bw - w) < tol, e: Math.abs(be - e) < tol, s: Math.abs(bs - s) < tol, n: Math.abs(bn - n) < tol };
    const add = (p: LngLat) => {
      const tx = Math.floor(((p[0] + 180) / 360) * 2 ** z);
      const r = (p[1] * Math.PI) / 180;
      const ty = Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
      const k = outlineTileKey(tx, ty, z);
      if (!set.tiles.has(k)) out.set(k, p);
    };
    if (cut.w) add([w - step, midLat]);
    if (cut.e) add([e + step, midLat]);
    if (cut.s) add([midLon, s - step]);
    if (cut.n) add([midLon, n + step]);
    if (cut.w && cut.n) add([w - step, n + step]);
    if (cut.e && cut.n) add([e + step, n + step]);
    if (cut.w && cut.s) add([w - step, s - step]);
    if (cut.e && cut.s) add([e + step, s - step]);
  }
  return [...out.values()];
}
