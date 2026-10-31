import { distanceM, pointSegmentDist, projector } from '../geo';
import type { LngLat, StreetSegment } from '../types';
import { WalkGraph } from './graph';
import { NAV } from './rules';
import type { RouteSource } from './types';

/** Street pieces whose ends lie this close are the same junction (tile edges, rounding). */
const MERGE_M = 3;

/**
 * Routes over the streets the app derived from cached map tiles (N3). The
 * pieces become a graph (their vertices, with ends within MERGE_M merged),
 * each end of the route joins the nearest street within NAV.joinM, and the
 * shortest path between them is the route. Nothing is asked of a server (N14).
 */
export function streetRouteSource(segments: StreetSegment[]): RouteSource {
  const first = segments[0]?.geometry[0]?.[0] ?? ([0, 0] as LngLat);
  const g = new WalkGraph(first);
  const lines: { a: number; b: number }[] = [];
  for (const s of segments) {
    for (const line of s.geometry) {
      let prev: number | null = null;
      line.forEach((p, k) => {
        // Ends merge with other pieces' ends; inner vertices are the piece's own.
        const end = k === 0 || k === line.length - 1;
        const i = g.add(p, end ? MERGE_M : 0);
        if (prev != null) {
          g.link(prev, i);
          lines.push({ a: prev, b: i });
        }
        prev = i;
      });
    }
  }
  const proj = projector(first);
  /** The nearest point on any street within NAV.joinM: which line, where on it, and how far off. */
  const join = (p: LngLat): { e: { a: number; b: number }; on: LngLat; t: number; m: number } | null => {
    const xy = proj(p);
    let best: { e: { a: number; b: number }; d: number } | null = null;
    for (const e of lines) {
      const d = pointSegmentDist(xy, proj(g.points[e.a]), proj(g.points[e.b]));
      if (d <= NAV.joinM && (!best || d < best.d)) best = { e, d };
    }
    if (!best) return null;
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
  return {
    id,
    route(from, to) {
      const a = join(from);
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
      return g.withExtra([a.on, b.on], links, ([ia, ib]) => {
        const s = g.shortest(ia, ib);
        if (!s) return null;
        return { path: [from, ...s.path.map((i) => g.points[i]), to], lengthM: a.m + s.m + b.m, source: id };
      });
    },
  };
}
