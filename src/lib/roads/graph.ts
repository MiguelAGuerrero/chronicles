// @layer core
import { distanceM } from '../geo';
import type { LngLat } from '../types';
import { ROAD_RULES } from './rules';
import type { Road, RoadKind } from './types';

/*
 * The road graph (RE5, RE6): every point of every road is a node, roads that share a point meet there, and a road's end within
 * `joinM` of another road's point is that point (so two halves cut at a tile edge are one road). Edges are directed: a one-way road
 * has them one way only. Held in flat arrays, since a corridor of tiles is tens of thousands of points. Built once and never
 * changed.
 */
const KIND_ID: Readonly<Record<RoadKind, number>> = { motorway: 0, trunk: 1, primary: 2, secondary: 3, tertiary: 4 };
export const KIND_OF: readonly RoadKind[] = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'];

const M_PER_DEG = 111_320;
/** The cell a point falls in, as one number, for a grid of `size` metres about a latitude. */
function cells(size: number, lat0: number) {
  const kx = (M_PER_DEG * Math.cos((lat0 * Math.PI) / 180)) / size;
  const ky = M_PER_DEG / size;
  const key = (cx: number, cy: number) => (cx + 2 ** 20) * 2 ** 22 + (cy + 2 ** 20);
  return { cx: (p: LngLat) => Math.floor(p[0] * kx), cy: (p: LngLat) => Math.floor(p[1] * ky), key };
}

/** Nodes are looked for by nearness in cells this wide. */
const FIND_M = 500;

export class RoadGraph {
  private constructor(
    private readonly lon: Float64Array,
    private readonly lat: Float64Array,
    /** Edges out of node i are `start[i]` to `start[i + 1]`. */
    private readonly start: Int32Array,
    private readonly to: Int32Array,
    private readonly len: Float32Array,
    private readonly kind: Uint8Array,
    private readonly finder: Map<number, number[]>,
    private readonly lat0: number,
  ) {}

  get nodeCount(): number {
    return this.lon.length;
  }

  at(i: number): LngLat {
    return [this.lon[i], this.lat[i]];
  }

  /** Each edge out of a node: where it goes, its length, and its kind of road. */
  eachFrom(i: number, fn: (to: number, m: number, kind: RoadKind) => void): void {
    for (let e = this.start[i]; e < this.start[i + 1]; e++) fn(this.to[e], this.len[e], KIND_OF[this.kind[e]]);
  }

  /** The node nearest a point within a distance, or null; a tie goes to the lower node. */
  nearest(p: LngLat, withinM: number): number | null {
    const g = cells(FIND_M, this.lat0);
    const reach = Math.ceil(withinM / FIND_M);
    const cx = g.cx(p);
    const cy = g.cy(p);
    let best = -1;
    let bestM = withinM;
    for (let dx = -reach; dx <= reach; dx++) {
      for (let dy = -reach; dy <= reach; dy++) {
        for (const i of this.finder.get(g.key(cx + dx, cy + dy)) ?? []) {
          const m = distanceM(p, [this.lon[i], this.lat[i]]);
          if (m < bestM || (m === bestM && best >= 0 && i < best)) {
            best = i;
            bestM = m;
          }
        }
      }
    }
    return best < 0 ? null : best;
  }

  /** The share of all road length that lies in the largest part joined together, whatever its roads' senses. */
  largestShare(): number {
    const parent = Int32Array.from({ length: this.nodeCount }, (_, i) => i);
    const find = (a: number): number => {
      while (parent[a] !== a) {
        parent[a] = parent[parent[a]];
        a = parent[a];
      }
      return a;
    };
    for (let i = 0; i < this.nodeCount; i++) for (let e = this.start[i]; e < this.start[i + 1]; e++) parent[find(i)] = find(this.to[e]);
    const by = new Map<number, number>();
    let total = 0;
    for (let i = 0; i < this.nodeCount; i++) {
      for (let e = this.start[i]; e < this.start[i + 1]; e++) {
        const r = find(i);
        by.set(r, (by.get(r) ?? 0) + this.len[e]);
        total += this.len[e];
      }
    }
    return total ? Math.max(...by.values()) / total : 0;
  }

  static build(roads: readonly Road[], joinM: number = ROAD_RULES.joinM): RoadGraph {
    const lat0 = roads[0]?.points[0]?.[1] ?? 0;
    const lon: number[] = [];
    const lat: number[] = [];
    const exact = new Map<string, number>();
    const fine = cells(joinM, lat0);
    const near = new Map<number, number[]>();
    const add = (p: LngLat): number => {
      const k = `${p[0]},${p[1]}`;
      const had = exact.get(k);
      if (had !== undefined) return had;
      const i = lon.length;
      lon.push(p[0]);
      lat.push(p[1]);
      exact.set(k, i);
      const c = fine.key(fine.cx(p), fine.cy(p));
      const cell = near.get(c);
      if (cell) cell.push(i);
      else near.set(c, [i]);
      return i;
    };
    // Every point first, in the order given by a stable sort of the roads, so the same roads in any order give the same graph.
    const ordered = [...roads].sort((a, b) => a.points[0][0] - b.points[0][0] || a.points[0][1] - b.points[0][1] || a.points.length - b.points.length || a.kind.localeCompare(b.kind));
    const ids = ordered.map((r) => r.points.map(add));
    // Then each road's ends: an end within `joinM` of another road's point is that point.
    const alias = Int32Array.from({ length: lon.length }, (_, i) => i);
    const root = (a: number): number => {
      while (alias[a] !== a) {
        alias[a] = alias[alias[a]];
        a = alias[a];
      }
      return a;
    };
    ordered.forEach((r, ri) => {
      const mine = new Set(ids[ri]);
      for (const end of [ids[ri][0], ids[ri][ids[ri].length - 1]]) {
        const p: LngLat = [lon[end], lat[end]];
        let best = -1;
        let bestM = joinM;
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            for (const i of near.get(fine.key(fine.cx(p) + dx, fine.cy(p) + dy)) ?? []) {
              if (mine.has(i)) continue;
              const m = distanceM(p, [lon[i], lat[i]]);
              if (m < bestM || (m === bestM && best >= 0 && i < best)) {
                best = i;
                bestM = m;
              }
            }
          }
        }
        if (best >= 0) {
          const a = root(end);
          const b = root(best);
          if (a !== b) alias[Math.max(a, b)] = Math.min(a, b);
        }
      }
    });
    // Edges between a road's consecutive points, by its sense.
    const from: number[] = [];
    const to: number[] = [];
    const len: number[] = [];
    const kind: number[] = [];
    ordered.forEach((r, ri) => {
      for (let j = 1; j < ids[ri].length; j++) {
        const a = root(ids[ri][j - 1]);
        const b = root(ids[ri][j]);
        if (a === b) continue;
        const m = distanceM(r.points[j - 1], r.points[j]);
        if (r.oneWay >= 0) from.push(a), to.push(b), len.push(m), kind.push(KIND_ID[r.kind]);
        if (r.oneWay <= 0) from.push(b), to.push(a), len.push(m), kind.push(KIND_ID[r.kind]);
      }
    });
    const n = lon.length;
    const start = new Int32Array(n + 1);
    for (const a of from) start[a + 1]++;
    for (let i = 0; i < n; i++) start[i + 1] += start[i];
    const fill = start.slice(0, n);
    const eTo = new Int32Array(from.length);
    const eLen = new Float32Array(from.length);
    const eKind = new Uint8Array(from.length);
    for (let e = 0; e < from.length; e++) {
      const at = fill[from[e]]++;
      eTo[at] = to[e];
      eLen[at] = len[e];
      eKind[at] = kind[e];
    }
    // Only nodes a road passes through can be found by nearness (an end taken for another point has no edges of its own).
    const coarse = cells(FIND_M, lat0);
    const finder = new Map<number, number[]>();
    for (let i = 0; i < n; i++) {
      if (start[i] === start[i + 1] && root(i) !== i) continue;
      const c = coarse.key(coarse.cx([lon[i], lat[i]]), coarse.cy([lon[i], lat[i]]));
      const cell = finder.get(c);
      if (cell) cell.push(i);
      else finder.set(c, [i]);
    }
    return new RoadGraph(Float64Array.from(lon), Float64Array.from(lat), start, eTo, eLen, eKind, finder, lat0);
  }
}
