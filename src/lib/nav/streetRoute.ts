// @layer core
import { distanceM, pointSegmentDist, projector } from '../geo';
import type { LngLat, StreetSegment } from '../types';
import { WalkGraph } from './graph';
import { NAV } from './rules';
import type { Route, RouteHint, RouteSource } from './types';

/**
 * What a metre of street costs a scenic route (SR6): from its two ends and its length. `key` names
 * an edge of the street graph (the same both ways), for a cache; null for the joins of one query.
 */
export type EdgeCost = (a: LngLat, b: LngLat, m: number, key: string | null) => number;

/** The streets as a route source, plus what a scenic route needs of them. */
export interface StreetSource extends RouteSource {
  /** The cheapest route by `cost` (its length still in metres); `hScale` is the least cost per metre. */
  routeWith(from: LngLat, to: LngLat, hint: RouteHint | undefined, cost: EdgeCost, hScale: number): Route | null;
  /** Where a point joins the streets, and how far off them it is; null past NAV.joinM. */
  snap(p: LngLat): { on: LngLat; m: number } | null;
  /** The walking distance from `from` to any point (through its join), within `maxM`; null past it. */
  reach(from: LngLat, maxM: number): (q: LngLat) => number | null;
}

/** Street pieces whose ends lie this close are the same junction (tile edges, rounding). */
const MERGE_M = 3;

/**
 * Routes over the streets the app derived from cached map tiles (N3). The
 * pieces become a graph (their vertices, with ends within MERGE_M merged),
 * each end of the route joins the nearest street within NAV.joinM, and the
 * shortest path between them is the route. Nothing is asked of a server (N14).
 */
export function streetRouteSource(segments: StreetSegment[]): StreetSource {
  const first = segments[0]?.geometry[0]?.[0] ?? ([0, 0] as LngLat);
  const g = new WalkGraph(first);
  const lines: { a: number; b: number }[] = [];
  // Piece ends: the only vertices another piece's end may merge with. An inner vertex
  // (a bridge's, over a path's junction) never takes one (bridges audit 3).
  const ends = new Set<number>();
  const addEnd = (p: LngLat) => {
    const near = g.within(p, MERGE_M).find((i) => ends.has(i));
    if (near != null) return near;
    const i = g.add(p);
    ends.add(i);
    return i;
  };
  for (const s of segments) {
    for (const line of s.geometry) {
      let prev: number | null = null;
      line.forEach((p, k) => {
        // Ends merge with other pieces' ends; inner vertices are the piece's own.
        const end = k === 0 || k === line.length - 1;
        const i = end ? addEnd(p) : g.add(p);
        if (prev != null) {
          g.link(prev, i);
          lines.push({ a: prev, b: i });
        }
        prev = i;
      });
    }
  }
  const proj = projector(first);
  // The lines by cell of NAV.joinM, in the order they were added: a join looks in the 3 x 3 cells
  // around a point, never at every line (a city's corridor holds tens of thousands).
  const CELL = NAV.joinM;
  const cells = new Map<string, number[]>();
  const xyOf = lines.map((e) => [proj(g.points[e.a]), proj(g.points[e.b])] as const);
  xyOf.forEach(([a, b], i) => {
    for (let cx = Math.floor(Math.min(a[0], b[0]) / CELL); cx <= Math.floor(Math.max(a[0], b[0]) / CELL); cx++)
      for (let cy = Math.floor(Math.min(a[1], b[1]) / CELL); cy <= Math.floor(Math.max(a[1], b[1]) / CELL); cy++) {
        const k = `${cx},${cy}`;
        (cells.get(k) ?? cells.set(k, []).get(k)!).push(i);
      }
  });
  const linesNear = (xy: [number, number]): number[] => {
    const cx = Math.floor(xy[0] / CELL);
    const cy = Math.floor(xy[1] / CELL);
    const found = new Set<number>();
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const i of cells.get(`${cx + dx},${cy + dy}`) ?? []) found.add(i);
    return [...found].sort((a, b) => a - b);
  };
  /**
   * Where a point joins the streets: the nearest within NAV.joinM, which line,
   * where on it and how far off. With a heading, a street running your way
   * within NAV.headingJoinM of the nearest wins (NB7): on a bridge over a
   * path, the path below can be the nearer line.
   */
  const join = (p: LngLat, heading?: number | null): { e: { a: number; b: number }; on: LngLat; t: number; m: number } | null => {
    const xy = proj(p);
    const near: { e: { a: number; b: number }; d: number }[] = [];
    for (const i of linesNear(xy)) {
      const d = pointSegmentDist(xy, xyOf[i][0], xyOf[i][1]);
      if (d <= NAV.joinM) near.push({ e: lines[i], d });
    }
    if (!near.length) return null;
    let best = near.reduce((x, y) => (y.d < x.d ? y : x));
    if (heading != null && Number.isFinite(heading)) {
      const limit = best.d + NAV.headingJoinM;
      let along: { e: { a: number; b: number }; d: number } | null = null;
      for (const c of near) {
        if (c.d > limit || (along && c.d >= along.d)) continue;
        const [ax, ay] = proj(g.points[c.e.a]);
        const [bx, by] = proj(g.points[c.e.b]);
        if (ax === bx && ay === by) continue;
        const bearing = (Math.atan2(bx - ax, by - ay) * 180) / Math.PI;
        // Either way along the street: the difference folded into 0-90°.
        const diff = Math.abs(((bearing - heading) % 180) + 180) % 180;
        if (Math.min(diff, 180 - diff) <= NAV.headingDeg) along = c;
      }
      if (along) best = along;
    }
    const a = g.points[best.e.a];
    const b = g.points[best.e.b];
    const [ax, ay] = proj(a);
    const [bx, by] = proj(b);
    const len2 = (bx - ax) ** 2 + (by - ay) ** 2;
    const t = len2 ? Math.max(0, Math.min(1, ((xy[0] - ax) * (bx - ax) + (xy[1] - ay) * (by - ay)) / len2)) : 0;
    const on: LngLat = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    return { e: best.e, on, t, m: distanceM(p, on) };
  };
  const id = 'streets';
  const base = g.points.length;
  const routeWith = (from: LngLat, to: LngLat, hint: RouteHint | undefined, cost?: EdgeCost, hScale = 1): Route | null => {
    const a = join(from, hint?.heading);
    const b = join(to);
    if (!a || !b) return null;
    // Each end joins its line for this query only (-1 and -2 are the two ends).
    const links: [number, number, number][] = [
      [-1, a.e.a, distanceM(a.on, g.points[a.e.a])],
      [-1, a.e.b, distanceM(a.on, g.points[a.e.b])],
      [-2, b.e.a, distanceM(b.on, g.points[b.e.a])],
      [-2, b.e.b, distanceM(b.on, g.points[b.e.b])],
    ];
    // Both on one stretch of street: straight along it, not round by a corner.
    if (a.e === b.e) links.push([-1, -2, distanceM(a.on, b.on)]);
    const edgeCost = cost && ((i: number, j: number, m: number) =>
      cost(g.points[i], g.points[j], m, i < base && j < base ? (i < j ? `${i},${j}` : `${j},${i}`) : null));
    return g.withExtra([a.on, b.on], links, ([ia, ib]) => {
      const s = g.shortest(ia, ib, edgeCost, hScale);
      if (!s) return null;
      return { path: [from, ...s.path.map((i) => g.points[i]), to], lengthM: a.m + s.m + b.m, source: id };
    });
  };
  return {
    id,
    route: (from, to, hint) => routeWith(from, to, hint),
    routeWith: (from, to, hint, cost, hScale) => routeWith(from, to, hint, cost, hScale),
    snap(p) {
      const j = join(p);
      return j && { on: j.on, m: j.m };
    },
    reach(from, maxM) {
      const a = join(from);
      if (!a) return () => null;
      const dist = g.withExtra([a.on], [[-1, a.e.a, distanceM(a.on, g.points[a.e.a])], [-1, a.e.b, distanceM(a.on, g.points[a.e.b])]], ([i]) => g.distances(i, maxM));
      return (q) => {
        const b = join(q);
        if (!b) return null;
        const da = dist.get(b.e.a);
        const db = dist.get(b.e.b);
        const d = Math.min(da == null ? Infinity : da + distanceM(g.points[b.e.a], b.on), db == null ? Infinity : db + distanceM(g.points[b.e.b], b.on));
        return Number.isFinite(d) ? a.m + d + b.m : null;
      };
    },
  };
}
