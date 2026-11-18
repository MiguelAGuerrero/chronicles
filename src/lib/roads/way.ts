// @layer core
import { distanceM } from '../geo';
import type { LngLat } from '../types';
import type { RoadGraph } from './graph';
import { ROAD_RULES, type RoadRules } from './rules';
import type { RoadKind, RoadLeg, RoadWay } from './types';

/*
 * One way on the road (RE10-RE12, RE29): the least cost between two junctions, where a metre costs by its kind of road, found by
 * A* over the directed graph. It runs as a generator that hands back every so many junctions, so whoever drives it can give the
 * screen a turn or stop it. Ties go to the lower junction, so the same graph gives the same way.
 */
type Rules = Pick<RoadRules, 'cost' | 'snapM' | 'yieldEvery' | 'nodesMax'>;

/** A binary heap of (cost, node), least first; equal costs by the lower node. */
class Heap {
  private readonly cost: number[] = [];
  private readonly node: number[] = [];
  get size(): number {
    return this.node.length;
  }
  private less(i: number, j: number): boolean {
    return this.cost[i] < this.cost[j] || (this.cost[i] === this.cost[j] && this.node[i] < this.node[j]);
  }
  private swap(i: number, j: number): void {
    [this.cost[i], this.cost[j]] = [this.cost[j], this.cost[i]];
    [this.node[i], this.node[j]] = [this.node[j], this.node[i]];
  }
  push(c: number, n: number): void {
    let i = this.node.length;
    this.cost.push(c);
    this.node.push(n);
    while (i > 0) {
      const up = (i - 1) >> 1;
      if (!this.less(i, up)) break;
      this.swap(i, up);
      i = up;
    }
  }
  pop(): number {
    const top = this.node[0];
    const last = this.node.length - 1;
    this.swap(0, last);
    this.cost.pop();
    this.node.pop();
    for (let i = 0; ; ) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < last && this.less(l, m)) m = l;
      if (r < last && this.less(r, m)) m = r;
      if (m === i) break;
      this.swap(i, m);
      i = m;
    }
    return top;
  }
}

function* between(graph: RoadGraph, from: number, to: number, rules: Rules): Generator<void, { leg: RoadLeg; kinds: Partial<Record<RoadKind, number>> } | null> {
  const n = graph.nodeCount;
  const best = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const prevM = new Float32Array(n);
  const prevKind: (RoadKind | null)[] = new Array(n).fill(null);
  const done = new Uint8Array(n);
  const goal = graph.at(to);
  const least = Math.min(...Object.values(rules.cost));
  const heap = new Heap();
  best[from] = 0;
  heap.push(distanceM(graph.at(from), goal) * least, from);
  let looked = 0;
  while (heap.size) {
    const i = heap.pop();
    if (done[i]) continue;
    done[i] = 1;
    if (i === to) break;
    if (++looked % rules.yieldEvery === 0) yield;
    if (looked > rules.nodesMax) return null;
    graph.eachFrom(i, (j, m, kind) => {
      if (done[j]) return;
      const c = best[i] + m * rules.cost[kind];
      if (c < best[j] || (c === best[j] && i < prev[j])) {
        best[j] = c;
        prev[j] = i;
        prevM[j] = m;
        prevKind[j] = kind;
        heap.push(c + distanceM(graph.at(j), goal) * least, j);
      }
    });
  }
  if (!done[to]) return null;
  const nodes: number[] = [];
  const kinds: Partial<Record<RoadKind, number>> = {};
  let lengthM = 0;
  for (let i = to; i !== -1; i = prev[i]) {
    nodes.push(i);
    if (i !== from) {
      lengthM += prevM[i];
      const k = prevKind[i]!;
      kinds[k] = (kinds[k] ?? 0) + prevM[i];
    }
    if (i === from) break;
  }
  nodes.reverse();
  return { leg: { path: nodes.map((i) => graph.at(i)), lengthM }, kinds };
}

/**
 * RE10, RE12: the way through the points in their order. Each point is taken to the junction nearest it within `snapM`; a pair
 * with no road in reach of one of them, or no road between, is a null leg and a straight stretch of the line, and the way is then
 * not `whole`.
 */
export function* findWay(graph: RoadGraph, points: readonly LngLat[], rules: Rules = ROAD_RULES): Generator<void, RoadWay> {
  const at = points.map((p) => graph.nearest(p, rules.snapM));
  const legs: (RoadLeg | null)[] = [];
  const kinds: Partial<Record<RoadKind, number>> = {};
  const path: LngLat[] = [];
  let lengthM = 0;
  for (let i = 1; i < points.length; i++) {
    const a = at[i - 1];
    const b = at[i];
    const found = a == null || b == null ? null : a === b ? { leg: { path: [graph.at(a)], lengthM: 0 }, kinds: {} } : yield* between(graph, a, b, rules);
    if (!found) {
      legs.push(null);
      path.push(points[i - 1], points[i]);
      lengthM += distanceM(points[i - 1], points[i]);
      continue;
    }
    legs.push(found.leg);
    path.push(...found.leg.path);
    lengthM += found.leg.lengthM;
    for (const [k, m] of Object.entries(found.kinds) as [RoadKind, number][]) kinds[k] = (kinds[k] ?? 0) + m;
  }
  return { legs, path, lengthM, whole: legs.length > 0 && legs.every((l) => l !== null), kinds };
}
