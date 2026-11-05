// @layer core
import { distanceM, projector } from '../geo';
import type { LngLat } from '../types';

/** A binary min-heap of [key, index]. */
class Heap {
  private readonly h: [number, number][] = [];
  get size() {
    return this.h.length;
  }
  push(e: [number, number]) {
    const h = this.h;
    h.push(e);
    let i = h.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (h[parent][0] <= h[i][0]) break;
      [h[parent], h[i]] = [h[i], h[parent]];
      i = parent;
    }
  }
  pop(): [number, number] {
    const h = this.h;
    const top = h[0];
    const last = h.pop()!;
    if (h.length) {
      h[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < h.length && h[l][0] < h[m][0]) m = l;
        if (r < h.length && h[r][0] < h[m][0]) m = r;
        if (m === i) break;
        [h[m], h[i]] = [h[i], h[m]];
        i = m;
      }
    }
    return top;
  }
}

/**
 * A small walking graph: points joined by edges with lengths in meters, and
 * a shortest-path search (A*, by straight-line distance). Both route sources
 * build one; neither knows the other.
 */
export class WalkGraph {
  readonly points: LngLat[] = [];
  private readonly edges: { to: number; m: number }[][] = [];
  private readonly cells = new Map<string, number[]>();
  private readonly proj: (p: LngLat) => [number, number];

  constructor(origin: LngLat, private readonly cellM = 25) {
    this.proj = projector(origin);
  }

  private cell(p: LngLat): [number, number] {
    const [x, y] = this.proj(p);
    return [Math.floor(x / this.cellM), Math.floor(y / this.cellM)];
  }

  /** Adds a point, or returns an existing one within `mergeM` of it. */
  add(p: LngLat, mergeM = 0): number {
    if (mergeM > 0) {
      const near = this.nearest(p, mergeM);
      if (near != null) return near;
    }
    const i = this.points.length;
    this.points.push(p);
    this.edges.push([]);
    const [cx, cy] = this.cell(p);
    const k = `${cx},${cy}`;
    (this.cells.get(k) ?? this.cells.set(k, []).get(k)!).push(i);
    return i;
  }

  link(a: number, b: number, m = distanceM(this.points[a], this.points[b])): void {
    if (a === b) return;
    this.edges[a].push({ to: b, m });
    this.edges[b].push({ to: a, m });
  }

  /**
   * Runs `fn` with extra points and links added for one query, then takes
   * them away again, so routing never grows the graph. Extra points are not
   * indexed for `within`.
   */
  withExtra<T>(points: LngLat[], links: [number, number, number][], fn: (ids: number[]) => T): T {
    const base = this.points.length;
    const ids = points.map((p) => {
      this.points.push(p);
      this.edges.push([]);
      return this.points.length - 1;
    });
    const touched: number[] = [];
    const resolve = (i: number) => (i < 0 ? ids[-i - 1] : i);
    for (const [a0, b0, m] of links) {
      const a = resolve(a0);
      const b = resolve(b0);
      if (a === b) continue;
      this.edges[a].push({ to: b, m });
      this.edges[b].push({ to: a, m });
      touched.push(a, b);
    }
    try {
      return fn(ids);
    } finally {
      for (const i of touched) if (i < base) this.edges[i] = this.edges[i].filter((e) => e.to < base);
      this.points.length = base;
      this.edges.length = base;
    }
  }

  /** Points within `radiusM` of p, nearest first. */
  within(p: LngLat, radiusM: number): number[] {
    const [cx, cy] = this.cell(p);
    const r = Math.ceil(radiusM / this.cellM);
    const out: { i: number; d: number }[] = [];
    for (let dx = -r; dx <= r; dx++)
      for (let dy = -r; dy <= r; dy++)
        for (const i of this.cells.get(`${cx + dx},${cy + dy}`) ?? []) {
          const d = distanceM(p, this.points[i]);
          if (d <= radiusM) out.push({ i, d });
        }
    return out.sort((x, y) => x.d - y.d).map((x) => x.i);
  }

  nearest(p: LngLat, radiusM: number): number | null {
    return this.within(p, radiusM)[0] ?? null;
  }

  /** The nearest point at any distance (a plain scan: for joining once per route). */
  closest(p: LngLat): number | null {
    let best: { i: number; d: number } | null = null;
    for (let i = 0; i < this.points.length; i++) {
      const d = distanceM(p, this.points[i]);
      if (!best || d < best.d) best = { i, d };
    }
    return best?.i ?? null;
  }

  neighbors(i: number): { to: number; m: number }[] {
    return this.edges[i];
  }

  /** Walking distance from one point to every point within `maxM` of it along the graph (Dijkstra). */
  distances(from: number, maxM: number): Map<number, number> {
    const best = new Map<number, number>([[from, 0]]);
    const done = new Set<number>();
    const queue = new Heap();
    queue.push([0, from]);
    while (queue.size) {
      const [d, i] = queue.pop();
      if (done.has(i)) continue;
      done.add(i);
      for (const e of this.edges[i]) {
        const g = d + e.m;
        if (g <= maxM && g < (best.get(e.to) ?? Infinity)) {
          best.set(e.to, g);
          queue.push([g, e.to]);
        }
      }
    }
    return best;
  }

  /**
   * The shortest path between two points, as point indices, or null if they don't connect. `m` is
   * always the path's length in metres. With `cost`, the path is the cheapest by it instead
   * (scenic routes, SR6), and `hScale` is the least cost per metre any edge can have, so the
   * straight-line estimate never overshoots.
   */
  shortest(from: number, to: number, cost?: (a: number, b: number, m: number) => number, hScale = 1): { path: number[]; m: number } | null {
    const goal = this.points[to];
    const h = (i: number) => distanceM(this.points[i], goal) * (cost ? hScale : 1);
    const best = new Map<number, number>([[from, 0]]);
    const prev = new Map<number, number>();
    const heap = new Heap();
    heap.push([h(from), from]);
    const done = new Set<number>();
    while (heap.size) {
      const [, i] = heap.pop();
      if (done.has(i)) continue;
      done.add(i);
      if (i === to) break;
      for (const e of this.edges[i]) {
        const g = best.get(i)! + (cost ? cost(i, e.to, e.m) : e.m);
        if (g < (best.get(e.to) ?? Infinity)) {
          best.set(e.to, g);
          prev.set(e.to, i);
          heap.push([g + h(e.to), e.to]);
        }
      }
    }
    if (!best.has(to)) return null;
    const path = [to];
    while (path[0] !== from) path.unshift(prev.get(path[0])!);
    if (!cost) return { path, m: best.get(to)! };
    let m = 0;
    for (let k = 1; k < path.length; k++) m += this.edges[path[k - 1]].find((e) => e.to === path[k])!.m;
    return { path, m };
  }
}
