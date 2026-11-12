// @layer core
import { distanceM } from '../geo';
import type { LngLat } from '../types';
import { AREA_REACH_M } from './rules';
import { bboxOf, inPolygons, polygonsAreaM2, representative, ringAreaM2 } from './shapes';
import type { HoodOutline, PlaceCandidate, TownOutline } from './types';

/*
 * Town outlines (TO1-TO6), the pure part: which town's border a point is
 * inside, with label points as the fallback. Where outlines come from sits
 * behind `OutlineTile` (today Overture's divisions, `divisionTiles.ts`); the
 * reads and the cache are `outlineRead.ts`.
 */

/** Outlines are read from tiles at this zoom: a few metres' detail, 80-170 KB a tile. */
export const OUTLINE_ZOOM = 12;
/** Borders are drawn from tiles at this zoom (TB6): about 40 km across, so a town comes whole. */
export const BORDER_ZOOM = 10;
/** A read asks for at most this many tiles (TO12); past it, the caller places by points. */
export const OUTLINE_TILES_MAX = 12;

/** One town's piece of border in one tile, as a source hands it over. */
export interface OutlinePiece {
  id: string;
  name: string;
  polygons: LngLat[][][];
}

/** One neighborhood's piece of shape in one tile, as a source hands it over (HB1). */
export interface HoodPiece extends OutlinePiece {
  subtype: 'neighborhood' | 'macrohood';
}

/** Cache (TO12, TB7): what one tile held, so it is never read twice. Keyed `z/x/y`. */
export interface OutlineTile {
  key: string;
  /** OUTLINE_ZOOM to decide, BORDER_ZOOM to draw. */
  z: number;
  x: number;
  y: number;
  /** The source's edition it came from (an Overture release). */
  release: string;
  read_at: number;
  pieces: OutlinePiece[];
  /** The source's own points for towns, by the id their pieces carry. */
  points: { id: string; at: LngLat }[];
  /** Neighborhood shapes in the tile (HB1); a tile stored before the decoder that read them has none. */
  hoods?: HoodPiece[];
  /** Fresh from the decoder only, never stored: ids of the localities it found nested in another (wards), for the reader to remember. */
  nested?: string[];
}

/**
 * sub2: neighborhood shapes are cut too (neighborhood boundaries, HB1).
 * The decoder that cut a kept tile (fix ward-subdivision): tiles are stored with it after their
 * release, and one stored without it (an older decoder, which read wards as towns) is read again.
 */
export const OUTLINE_DECODE = 'sub2';
export const stampRelease = (release: string) => `${release}#${OUTLINE_DECODE}`;
export const tileCurrent = (t: Pick<OutlineTile, 'release'>) => t.release.endsWith(`#${OUTLINE_DECODE}`);

/** The tiles without the pieces and points of localities known to be wards (fix ward-subdivision audit 1). */
export const withoutNested = (tiles: OutlineTile[], ids: ReadonlySet<string>): OutlineTile[] =>
  ids.size
    ? tiles.map((t) => (t.pieces.some((p) => ids.has(p.id)) || t.points.some((p) => ids.has(p.id))
        ? { ...t, pieces: t.pieces.filter((p) => !ids.has(p.id)), points: t.points.filter((p) => !ids.has(p.id)) }
        : t))
    : tiles;

/** The outlines known around some points: which tiles were read, and the towns in them. */
export interface OutlineSet {
  tiles: ReadonlySet<string>;
  towns: TownOutline[];
  /** The neighborhood shapes in those tiles, merged by id (HB1). */
  hoods?: HoodOutline[];
}

export const outlineTileKey = (x: number, y: number, z: number = OUTLINE_ZOOM) => `${z}/${x}/${y}`;

/** The tile a point lies in, at OUTLINE_ZOOM unless asked. */
export function outlineTileOf([lon, lat]: LngLat, z: number = OUTLINE_ZOOM): [number, number] {
  const n = 2 ** z;
  const r = (lat * Math.PI) / 180;
  return [Math.floor(((lon + 180) / 360) * n), Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n)];
}

/** The tiles under these points, once each; null when there are more than `cap` (TO12). */
export function outlineTilesFor(points: LngLat[], cap = OUTLINE_TILES_MAX, z: number = OUTLINE_ZOOM): [number, number][] | null {
  const out = new Map<string, [number, number]>();
  for (const p of points) {
    const t = outlineTileOf(p, z);
    out.set(outlineTileKey(t[0], t[1], z), t);
    if (out.size > cap) return null;
  }
  return [...out.values()];
}

/** The towns in these tiles: each town's pieces merged by its id, with its own point where a tile holds it. */
export function outlineSet(tiles: OutlineTile[]): OutlineSet {
  const towns = new Map<string, TownOutline>();
  const points = new Map<string, LngLat>();
  for (const t of tiles) for (const p of t.points) points.set(p.id, p.at);
  for (const t of tiles) {
    for (const piece of t.pieces) {
      const town = towns.get(piece.id) ?? { id: piece.id, name: piece.name, at: null, polygons: [], bbox: [Infinity, Infinity, -Infinity, -Infinity], areaM2: 0 };
      for (const poly of piece.polygons) {
        if (!poly.length) continue;
        town.polygons.push(poly);
        town.areaM2 += ringAreaM2(poly[0]) - poly.slice(1).reduce((s, h) => s + ringAreaM2(h), 0);
        for (const [x, y] of poly[0]) {
          town.bbox = [Math.min(town.bbox[0], x), Math.min(town.bbox[1], y), Math.max(town.bbox[2], x), Math.max(town.bbox[3], y)];
        }
      }
      towns.set(piece.id, town);
    }
  }
  for (const town of towns.values()) town.at = points.get(town.id) ?? null;
  // HB1: a neighborhood's pieces merged by id, with a point inside its shape.
  const hoods = new Map<string, HoodOutline>();
  for (const t of tiles) {
    for (const piece of t.hoods ?? []) {
      const polygons = piece.polygons.filter((rings) => rings[0]?.length);
      if (!polygons.length) continue;
      const h = hoods.get(piece.id);
      if (h) h.polygons.push(...polygons);
      else hoods.set(piece.id, { id: piece.id, name: piece.name, subtype: piece.subtype, at: [0, 0], polygons: [...polygons], bbox: [0, 0, 0, 0], areaM2: 0 });
    }
  }
  for (const h of hoods.values()) {
    h.bbox = bboxOf(h.polygons);
    h.areaM2 = polygonsAreaM2(h.polygons);
    h.at = representative(h.polygons);
  }
  return { tiles: new Set(tiles.map((t) => t.key)), towns: [...towns.values()].filter((t) => t.polygons.length), hoods: [...hoods.values()] };
}

/** Whether the outlines were read where this point is: only then can they say a town does not hold it. */
export const coveredBy = (set: OutlineSet | null | undefined, p: LngLat): boolean => {
  if (!set) return false;
  const [x, y] = outlineTileOf(p);
  return set.tiles.has(outlineTileKey(x, y));
};

/** Whether a point is inside a town's outline (any piece, outside its holes). */
export function inOutline(p: LngLat, t: Pick<TownOutline, 'polygons' | 'bbox'>): boolean {
  const [w, s, e, n] = t.bbox;
  if (p[0] < w || p[0] > e || p[1] < s || p[1] > n) return false;
  return inPolygons(p, t.polygons);
}

/** Where an outline-only town's star goes without its own point: the middle of what was read of it (TO4). */
export const outlineCentre = (t: TownOutline): LngLat => t.at ?? [(t.bbox[0] + t.bbox[2]) / 2, (t.bbox[1] + t.bbox[3]) / 2];

export const sameName = (a: string, b: string) => a.normalize('NFC').trim().toLowerCase() === b.normalize('NFC').trim().toLowerCase();

/** Metres from a point to an outline's box (0 inside it). */
export function boxDistanceM(p: LngLat, [w, s, e, n]: TownOutline['bbox']): number {
  return distanceM(p, [Math.min(Math.max(p[0], w), e), Math.min(Math.max(p[1], s), n)]);
}

/**
 * TO4, TO5: the candidates with the outlines joined in. A town's label point
 * and its outline are one candidate, at the label point, when the point is
 * inside the outline (or lies beyond the tiles read, near it). An outline with
 * no label point is a town of its own, at the source's point, else the middle
 * of what was read.
 */
export function withOutlines(candidates: PlaceCandidate[], set: OutlineSet | null | undefined): PlaceCandidate[] {
  if (!set || (!set.towns.length && !set.hoods?.length)) return candidates;
  const out = candidates.slice();
  for (const t of set.towns) {
    let matched = false;
    out.forEach((c, i) => {
      if (c.level !== 'town' || !sameName(c.name, t.name)) return;
      const mine = inOutline(c.at, t) || (!coveredBy(set, c.at) && boxDistanceM(c.at, t.bbox) <= AREA_REACH_M.town);
      if (!mine) return;
      // Of two outlines of one name over a point (never seen), the smaller stands.
      if (c.outline && c.outline.areaM2 <= t.areaM2) return;
      out[i] = { ...c, outline: t };
      matched = true;
    });
    if (!matched) out.push({ level: 'town', name: t.name, at: outlineCentre(t), reachM: AREA_REACH_M.town, kind: 'outline', outline: t });
  }
  return withHoods(out, set);
}

/**
 * HB5, HB6: the candidates with neighborhood shapes joined in. A tile's place point and a shape of one name,
 * the point inside the shape (or beyond the tiles read), are one neighborhood at the point; a shape with no
 * point is a neighborhood of its own at a point inside it. Where the shapes were read at a point, a point-only
 * neighborhood lying inside another's shape is dropped: the shape's owner stands.
 */
export function withHoods(candidates: PlaceCandidate[], set: OutlineSet | null | undefined): PlaceCandidate[] {
  const hoods = set?.hoods;
  if (!set || !hoods?.length) return candidates;
  const out = candidates.slice();
  for (const h of hoods) {
    let matched = false;
    out.forEach((c, i) => {
      if (c.level !== 'neighborhood' || !sameName(c.name, h.name)) return;
      if (!inOutline(c.at, h) && coveredBy(set, c.at)) return;
      // Of two shapes of one name over a point (never seen), the smaller stands.
      if (c.hoodOutline && c.hoodOutline.areaM2 <= h.areaM2) return;
      out[i] = { ...c, hoodOutline: h };
      matched = true;
    });
    if (!matched) out.push({ level: 'neighborhood', name: h.name, at: h.at, reachM: AREA_REACH_M.neighborhood, kind: 'polygon', hoodOutline: h });
  }
  const shaped = out.filter((c) => c.level === 'neighborhood' && c.hoodOutline);
  return out.filter((c) => c.level !== 'neighborhood' || c.hoodOutline || !(coveredBy(set, c.at) && shaped.some((o) => inOutline(c.at, o.hoodOutline!))));
}

/** The town a point is in, and how it was decided. */
export interface TownPick {
  c: PlaceCandidate;
  by: 'outline' | 'point';
}

/**
 * TO1-TO3: the town a point is in. Where the outlines were read at the point,
 * the smallest outline holding it (the municipality; the borough before the
 * city). Otherwise the nearest town point within reach, the closer for its
 * size, as before outlines; where they were read, a town whose outline doesn't
 * hold the point is never taken by its point. Candidates come through
 * `withOutlines` first.
 */
export function townAt(
  p: LngLat,
  candidates: PlaceCandidate[],
  set: OutlineSet | null | undefined,
  /** `within`: how far from its point a town is still taken by it (its reach unless capped); the closer for its size wins. */
  o: { allowed?: (c: PlaceCandidate) => boolean; within?: (c: PlaceCandidate) => number } = {},
): TownPick | null {
  const allowed = o.allowed ?? (() => true);
  const within = o.within ?? ((c: PlaceCandidate) => c.reachM);
  const covered = coveredBy(set, p);
  if (covered) {
    let best: PlaceCandidate | null = null;
    for (const c of candidates) {
      if (c.level !== 'town' || !c.outline || !allowed(c) || !inOutline(p, c.outline)) continue;
      const smaller = !best || c.outline.areaM2 < best.outline!.areaM2;
      const tie = best && c.outline.areaM2 === best.outline!.areaM2 && distanceM(p, c.at) < distanceM(p, best.at);
      if (smaller || tie) best = c;
    }
    if (best) return { c: best, by: 'outline' };
  }
  let best: { c: PlaceCandidate; score: number } | null = null;
  for (const c of candidates) {
    if (c.level !== 'town' || (covered && c.outline) || !allowed(c)) continue;
    const d = distanceM(p, c.at);
    if (d <= within(c) && (!best || d / c.reachM < best.score)) best = { c, score: d / c.reachM };
  }
  return best ? { c: best.c, by: 'point' } : null;
}

/**
 * TO6: a neighborhood point counts for a point in a town only when it is
 * inside that town's outline. Where the town was found by its point, or the
 * outlines weren't read at the neighborhood's point, it counts as before.
 */
export function hoodAllowed(hood: PlaceCandidate, town: TownPick | null, set: OutlineSet | null | undefined): boolean {
  // Whole-towns audit 7: a hamlet is a neighborhood only inside the town border that decided the piece; out of town, never.
  if (hood.kind === 'hamlet') return !!town && town.by === 'outline' && !!town.c.outline && coveredBy(set, hood.at) && inOutline(hood.at, town.c.outline);
  if (!town || town.by !== 'outline' || !town.c.outline || !coveredBy(set, hood.at)) return true;
  return inOutline(hood.at, town.c.outline);
}

/**
 * TO4: whether a town is worth listing around a point: any label point, an
 * outline-only town with the source's own point, or the one holding the point
 * (whose star otherwise sits at the middle of what was read of it).
 */
export const listable = (c: PlaceCandidate, at: LngLat): boolean =>
  c.kind !== 'outline' || !!c.outline?.at || (!!c.outline && inOutline(at, c.outline));

/** Candidates as stored with a read: without their outlines, which the outline cache keeps (TO12). */
export const withoutOutlines = (cs: PlaceCandidate[]): PlaceCandidate[] => cs.map(({ outline: _o, hoodOutline: _h, ...c }) => c);
