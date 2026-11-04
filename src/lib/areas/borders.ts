// @layer core
import { projector } from '../geo';
import type { LngLat } from '../types';
import { boxDistanceM, coveredBy, inOutline, sameName, type OutlineSet } from './outlines';
import { AREA_REACH_M } from './rules';
import type { TownOutline } from './types';

/*
 * Town borders (TB1-TB9), the pure part: which borders a map draws, and how.
 * The outlines come from the z10 tiles (whole towns, `outlines.borders`); the
 * town a screen tints is the one decided on the z12 tiles (`townAt`), matched
 * by the source's id, so the drawn town is the decided town (TB1).
 */

export const BORDER_RULES = {
  /** At most this many towns on one map (TB9): yours first, then the nearest. */
  cap: 40,
  /** Shapes are simplified to this many metres for drawing (TB9). */
  simplifyM: 10,
} as const;

/** tinted: a soft fill and a firm line (yours, a walk's); firm: a firm line only (the walk screen); lined: a thin line. */
export type BorderRole = 'tinted' | 'firm' | 'lined';

export interface BorderShape {
  id: string;
  name: string;
  role: BorderRole;
  polygons: LngLat[][][];
}

/** What a map draws: its shapes and a key that changes only with the towns and their roles (TB9). */
export interface BorderView {
  key: string;
  shapes: BorderShape[];
}

/**
 * TB1: the outline the town you're in was decided by: the smallest z12
 * outline holding you, named as the title is. Null when the title's town came
 * from a label point, or the z12 tile under you wasn't read.
 */
export function outlineIdHere(at: LngLat, name: string, set: OutlineSet | null | undefined): string | null {
  const best = smallestAt(at, set);
  return best && sameName(best.name, name) ? best.id : null;
}

/** TB4: the outline you're in, whatever it is called (the walk screen names no town): the smallest z12 outline holding you. */
export const outlineIdAt = (at: LngLat, set: OutlineSet | null | undefined): string | null => smallestAt(at, set)?.id ?? null;

function smallestAt(at: LngLat, set: OutlineSet | null | undefined): TownOutline | null {
  if (!set || !coveredBy(set, at)) return null;
  let best: TownOutline | null = null;
  for (const t of set.towns) if (inOutline(at, t) && (!best || t.areaM2 < best.areaM2)) best = t;
  return best;
}

/**
 * TB2, TB3, TB5: the outline of a named place (an atlas row, a walk's Area):
 * of that name, holding its point, else within a town's reach of it (a
 * town's point can sit just outside what was read); the smallest wins.
 */
export function outlineOf(place: { name: string; at: LngLat }, set: OutlineSet | null | undefined): TownOutline | null {
  if (!set) return null;
  let best: { t: TownOutline; inside: boolean } | null = null;
  for (const t of set.towns) {
    if (!sameName(t.name, place.name)) continue;
    const inside = inOutline(place.at, t);
    if (!inside && boxDistanceM(place.at, t.bbox) > AREA_REACH_M.town) continue;
    if (!best || (inside && !best.inside) || (inside === best.inside && t.areaM2 < best.t.areaM2)) best = { t, inside };
  }
  return best?.t ?? null;
}

/** TB3, TB5: the outlines of named places (a walk's or every walk's towns), each once. */
export function outlineIdsOf(places: { name: string; at: LngLat }[], set: OutlineSet | null | undefined): string[] {
  const ids = new Set<string>();
  for (const p of places) {
    const t = outlineOf(p, set);
    if (t) ids.add(t.id);
  }
  return [...ids];
}

/** The towns among a walk's (or every walk's) areas, as named places: their own points (TB3, TB5). */
export function townPlaces(areas: Iterable<{ level: string; name: string; lon: number; lat: number }>): { name: string; at: LngLat }[] {
  const out: { name: string; at: LngLat }[] = [];
  for (const a of areas) if (a.level === 'town') out.push({ name: a.name, at: [a.lon, a.lat] });
  return out;
}

/** Douglas-Peucker on a closed ring, in metres (TB9); the ring stays closed with at least four points. */
export function simplifyRing(ring: LngLat[], toleranceM: number): LngLat[] {
  if (ring.length <= 4) return ring;
  const toXY = projector(ring[0]);
  const xy = ring.map((p) => toXY(p));
  const keep = new Uint8Array(ring.length);
  keep[0] = 1;
  keep[ring.length - 1] = 1;
  // A closed ring's two ends are one point: split it at the vertex farthest from the start.
  let far = 0;
  let farD = -1;
  for (let i = 1; i < ring.length - 1; i++) {
    const d = Math.hypot(xy[i][0] - xy[0][0], xy[i][1] - xy[0][1]);
    if (d > farD) [far, farD] = [i, d];
  }
  keep[far] = 1;
  const stack: [number, number][] = [[0, far], [far, ring.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = xy[a];
    const [bx, by] = xy[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let worst = -1;
    let worstD = 0;
    for (let i = a + 1; i < b; i++) {
      const t = len2 ? Math.max(0, Math.min(1, ((xy[i][0] - ax) * dx + (xy[i][1] - ay) * dy) / len2)) : 0;
      const d = Math.hypot(xy[i][0] - (ax + t * dx), xy[i][1] - (ay + t * dy));
      if (d > worstD) [worst, worstD] = [i, d];
    }
    if (worst >= 0 && worstD > toleranceM) {
      keep[worst] = 1;
      stack.push([a, worst], [worst, b]);
    }
  }
  const out = ring.filter((_, i) => keep[i]);
  return out.length >= 4 ? out : ring;
}

/**
 * TB1-TB5, TB9: the borders a map draws. Towns in `tinted` get a fill and a
 * firm line, those in `firm` a firm line; the rest of the set a thin line,
 * unless `lined` is false. At most BORDER_RULES.cap towns: the tinted and firm
 * ones, then the nearest to `near`. Null with nothing to draw.
 */
export function bordersFor(
  set: OutlineSet | null | undefined,
  o: { tinted?: Iterable<string>; firm?: Iterable<string>; lined?: boolean; near?: LngLat | null },
): BorderView | null {
  if (!set || !set.towns.length) return null;
  const tinted = new Set(o.tinted ?? []);
  const firm = new Set(o.firm ?? []);
  const roleOf = (t: TownOutline): BorderRole | null => (tinted.has(t.id) ? 'tinted' : firm.has(t.id) ? 'firm' : o.lined === false ? null : 'lined');
  const chosen = set.towns.map((t) => ({ t, role: roleOf(t) })).filter((x): x is { t: TownOutline; role: BorderRole } => x.role != null);
  const near = o.near ?? null;
  const far = (t: TownOutline) => (near ? boxDistanceM(near, t.bbox) : 0);
  chosen.sort((a, b) => Number(a.role === 'lined') - Number(b.role === 'lined') || far(a.t) - far(b.t) || (a.t.id < b.t.id ? -1 : 1));
  const shapes: BorderShape[] = chosen.slice(0, BORDER_RULES.cap).map(({ t, role }) => ({
    id: t.id,
    name: t.name,
    role,
    polygons: t.polygons.map((rings) => rings.map((r) => simplifyRing(r, BORDER_RULES.simplifyM))),
  }));
  if (!shapes.length) return null;
  const key = shapes.map((s) => `${s.role}:${s.id}`).sort().join('|');
  return { key, shapes };
}
