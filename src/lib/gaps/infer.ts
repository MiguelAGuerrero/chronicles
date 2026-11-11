// @layer core
import { bearingDeg, boundsOf, distanceM, lineLengthM, distanceToLinesM, isBreak, pointSegmentDist, projector, type Bounds } from '../geo';
import type { ReadTrace } from '../rides';
import type { Fill, GapDecision, LngLat, StreetSegment } from '../types';
import { GAP_RULES } from './rules';

export { GAP_RULES };

/**
 * Filling gaps (the concept doc's "Filling gaps" tab, G1-G14). Pure: no I/O,
 * no clock. A gap is read as map matching across a time limit: the likely way
 * is the shortest walk over the streets between the two fixes, and a street
 * piece of it is certain when every way within the budget uses it (the gap's
 * space-time prism allows no detour around it). Confidence is the certain
 * share of the way's street length.
 */

/** A gap in the walked trace: the last fix before and the first after. */
export interface Gap {
  t0: number;
  t1: number;
  from: LngLat;
  to: LngLat;
  /** The walk's own moving pace (GT1), for a guess that fits the time; absent, the shortest way is offered. */
  pace?: number;
  /** The way the walker was heading into the gap, and out of it, in degrees (GB3); absent when the walked fixes beside it are too close to say. */
  fromHeading?: number;
  toHeading?: number;
}

export interface Inference {
  t0: number;
  t1: number;
  /** From the fix before, along the streets, to the fix after. */
  path: LngLat[];
  lengthM: number;
  /** The certain share of the street length under the direct budget, and under the time budget (null when not read that far). */
  certainDirect: number;
  certainTime: number | null;
  /** The street most of it runs along; null when unnamed. */
  street: string | null;
  /** Filled by itself (G5), or offered (G6). */
  level: 'auto' | 'offer';
}

/** What a gap shows: filled by itself, offered, or kept (G5, G6, G10). */
export interface Stretch {
  t0: number;
  t1: number;
  path: LngLat[];
  lengthM: number;
  street: string | null;
  how: 'auto' | 'offer' | 'kept';
}

const pos = (p: { lon: number; lat: number }): LngLat => [p.lon, p.lat];

/**
 * The gaps worth reading (G1): walked fixes more than a minute apart, at most
 * GAP_RULES.maxMs, however short (the owner's rule, Nov 3), with no pause or ride
 * between. Pass the trace as read without fills.
 */
export function gapsOf(tr: ReadTrace): Gap[] {
  const out: Gap[] = [];
  const w = tr.walked;
  let pace: number | undefined;
  for (let i = 1; i < w.length; i++) {
    const a = w[i - 1];
    const b = w[i];
    const dt = b.t - a.t;
    if (dt <= GAP_RULES.gapMs || dt > GAP_RULES.maxMs) continue;
    if (isBreak(a, b, tr.breaks, Infinity)) continue;
    pace ??= movingPace(tr);
    const gap: Gap = { t0: a.t, t1: b.t, from: pos(a), to: pos(b), pace };
    const fromHeading = headingInto(tr, i - 1);
    const toHeading = headingOutOf(tr, i);
    if (fromHeading != null) gap.fromHeading = fromHeading;
    if (toHeading != null) gap.toHeading = toHeading;
    out.push(gap);
  }
  return out;
}

/** The way the walker was heading at walked fix `i`: from the fixes up to a few before it, at least GAP_RULES.headingM back, no break between (GB3). */
function headingInto(tr: ReadTrace, i: number): number | undefined {
  const w = tr.walked;
  for (let j = i - 1; j >= 0 && i - j <= 8; j--) {
    if (isBreak(w[j], w[j + 1], tr.breaks, Infinity)) return undefined;
    if (distanceM(pos(w[j]), pos(w[i])) >= GAP_RULES.headingM) return bearingDeg(pos(w[j]), pos(w[i]));
  }
  return undefined;
}

/** The way the walker was heading from walked fix `i`: to the fixes up to a few after it (GB3). */
function headingOutOf(tr: ReadTrace, i: number): number | undefined {
  const w = tr.walked;
  for (let j = i + 1; j < w.length && j - i <= 8; j++) {
    if (isBreak(w[j - 1], w[j], tr.breaks, Infinity)) return undefined;
    if (distanceM(pos(w[i]), pos(w[j])) >= GAP_RULES.headingM) return bearingDeg(pos(w[i]), pos(w[j]));
  }
  return undefined;
}

/**
 * The walk's own pace (GT1): the median speed of its walked fixes moving at
 * GAP_RULES.movingSpeed or more, the phone's reading where it gives one over 0,
 * else the movement since the fix before (up to 30 s back). Else
 * GAP_RULES.defaultPace.
 */
export function movingPace(tr: ReadTrace): number {
  const w = tr.walked;
  const speeds: number[] = [];
  // Without the phone's speed, over a minute of walked fixes with no break between: the jitter
  // settling thins fixes a second apart, and shorter spans read low (gap-drawing audit 6).
  let j = 0;
  for (let i = 1; i < w.length; i++) {
    const p = w[i];
    if (isBreak(w[i - 1], p, tr.breaks)) j = i;
    let v = p.speed != null && p.speed > 0 ? p.speed : null;
    if (v == null) {
      while (j < i - 1 && p.t - w[j + 1].t >= PACE_SPAN_MS) j++;
      const dt = (p.t - w[j].t) / 1000;
      if (dt * 1000 >= PACE_SPAN_MS) v = distanceM(pos(w[j]), pos(p)) / dt;
    }
    if (v != null && v >= GAP_RULES.movingSpeed && v <= GAP_RULES.maxPace * 2) speeds.push(v);
  }
  if (!speeds.length) return GAP_RULES.defaultPace;
  speeds.sort((a, b) => a - b);
  return speeds[speeds.length >> 1];
}

/** The span a pace is measured over without the phone's own speed. */
const PACE_SPAN_MS = 60_000;

/** The box around a gap that every way within `budgetM` stays inside: a circle on the middle, half the budget across. */
function prismBounds(g: Gap, budgetM: number): Bounds {
  const mid: LngLat = [(g.from[0] + g.to[0]) / 2, (g.from[1] + g.to[1]) / 2];
  return boundsOf([mid], budgetM / 2 + GAP_RULES.joinM)!;
}

const contains = (outer: Bounds, inner: Bounds) => inner[0] >= outer[0] && inner[1] >= outer[1] && inner[2] <= outer[2] && inner[3] <= outer[3];

/**
 * The streets to read for a gap (G8): around it, the time budget (or twice
 * the straight distance, the likely way's own budget in most towns), capped
 * at GAP_RULES.readMaxM across. A caller reads whole pieces touching it and
 * passes it back as the coverage.
 */
export function readBounds(g: Gap): Bounds {
  const straight = distanceM(g.from, g.to);
  const budget = Math.max((GAP_RULES.fastPace * (g.t1 - g.t0)) / 1000, GAP_RULES.readStraight * straight);
  return prismBounds(g, Math.min(budget, GAP_RULES.readMaxM));
}

/** Street piece ends this close are one junction (tile edges, rounding), as navigation merges them. */
const MERGE_M = 3;

type Edge = { to: number; m: number; seg: number; id: number };
/** A way through the graph: its length, nodes, and each step's piece and edge. */
type Way = { m: number; nodes: number[]; segs: number[]; edges: number[] };
type Line = { a: number; b: number; seg: number; id: number };

/** A walking graph over street pieces, each edge tagged with its piece, so a piece can be left out of a search. */
export class PieceGraph {
  readonly pts: LngLat[] = [];
  readonly adj: Edge[][] = [];
  /** Each street edge once: its ends and piece, for joining a fix to the nearest streets. */
  /** Live street edges (a split one is replaced by its two halves). */
  lines = new Set<Line>();
  /** Each piece's level, by index: 1 on a bridge, -1 in a tunnel, 0 (absent) on the ground (GB1). */
  readonly levels: number[] = [];
  private readonly cells = new Map<string, number[]>();
  readonly proj: (p: LngLat) => [number, number];

  constructor(origin: LngLat) {
    this.proj = projector(origin);
  }

  node(p: LngLat, merge: boolean): number {
    const [x, y] = this.proj(p);
    const cx = Math.floor(x / MERGE_M);
    const cy = Math.floor(y / MERGE_M);
    if (merge) {
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++)
          for (const i of this.cells.get(`${cx + dx},${cy + dy}`) ?? []) if (distanceM(p, this.pts[i]) <= MERGE_M) return i;
    }
    const i = this.pts.length;
    this.pts.push(p);
    this.adj.push([]);
    if (merge) {
      const k = `${cx},${cy}`;
      (this.cells.get(k) ?? this.cells.set(k, []).get(k)!).push(i);
    }
    return i;
  }

  private edges = 0;

  link(a: number, b: number, seg: number, m = distanceM(this.pts[a], this.pts[b])): number {
    if (a === b) return -1;
    const id = this.edges++;
    this.adj[a].push({ to: b, m, seg, id });
    this.adj[b].push({ to: a, m, seg, id });
    return id;
  }

  /** A street edge, kept for joining fixes to it. */
  street(a: number, b: number, seg: number) {
    const id = this.link(a, b, seg);
    if (id >= 0) this.lines.add({ a, b, seg, id });
  }

  /**
   * Splits a street edge at `k`: it is replaced by its two halves, so a way
   * can't leave out one half and still take the whole edge (audit 1).
   */
  split(e: Line, k: number) {
    this.adj[e.a] = this.adj[e.a].filter((x) => x.id !== e.id);
    this.adj[e.b] = this.adj[e.b].filter((x) => x.id !== e.id);
    this.lines.delete(e);
    this.street(e.a, k, e.seg);
    this.street(k, e.b, e.seg);
  }

  /** A graph of these street pieces, each edge tagged with its piece's index. */
  static of(segments: StreetSegment[], origin: LngLat): PieceGraph {
    const graph = new PieceGraph(origin);
    for (let s = 0; s < segments.length; s++) {
      graph.levels[s] = segments[s].level ?? 0;
      for (const line of segments[s].geometry) {
        let prev = -1;
        line.forEach((p, k) => {
          const i = graph.node(p, k === 0 || k === line.length - 1);
          if (prev >= 0 && prev !== i) graph.street(prev, i, s);
          prev = i;
        });
      }
    }
    return graph;
  }

  /**
   * A fix (or a tapped point) joined to every street within GAP_RULES.joinM on its level,
   * where it is nearest on each: the street edge is split there (an end of it
   * is used as it is), so a second point on the same edge splits the half it
   * lies on and a way runs straight along it. Null with no street that near.
   *
   * The level is the nearest street's (GB2), among those running the way `heading` points
   * when any does (GB3): a fix on a bridge never joins the street under it, nor a walker on
   * that street the bridge over it, whatever is shorter. Where nothing but the ground is
   * near, that is every street, as before.
   */
  joinFix(p: LngLat, heading?: number): number | null {
    const xy = this.proj(p);
    const found: { e: Line; t: number; d: number }[] = [];
    for (const e of this.lines) {
      const a = this.proj(this.pts[e.a]);
      const b = this.proj(this.pts[e.b]);
      const d = pointSegmentDist(xy, a, b);
      if (d > GAP_RULES.joinM) continue;
      const len2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
      const t = len2 ? Math.max(0, Math.min(1, ((xy[0] - a[0]) * (b[0] - a[0]) + (xy[1] - a[1]) * (b[1] - a[1])) / len2)) : 0;
      found.push({ e, t, d });
    }
    const level = this.levelOf(found, heading);
    const near = found.filter((f) => (this.levels[f.e.seg] ?? 0) === level);
    if (!near.length) return null;
    const end = this.node(p, false);
    const joined = new Set<number>();
    for (const { e, t } of near) {
      const a = this.pts[e.a];
      const b = this.pts[e.b];
      const len = distanceM(a, b);
      let k: number;
      if (t * len < 0.5) k = e.a;
      else if ((1 - t) * len < 0.5) k = e.b;
      else {
        k = this.node([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], false);
        this.split(e, k);
      }
      if (joined.has(k)) continue;
      joined.add(k);
      // A join costs twice its length, so a way runs along the street where it can, never
      // straight across from a fix to a corner it could reach along it (a short gap, Nov 3).
      this.link(end, k, JOIN, 2 * distanceM(p, this.pts[k]));
    }
    return end;
  }

  /** The level of the nearest street, among those along `heading` when any runs that way (GB2, GB3). */
  private levelOf(found: { e: Line; d: number }[], heading?: number): number {
    let pool = found;
    if (heading != null) {
      const along = found.filter(({ e }) => {
        const diff = Math.abs((((bearingDeg(this.pts[e.a], this.pts[e.b]) - heading) % 180) + 180) % 180);
        return Math.min(diff, 180 - diff) <= GAP_RULES.levelAlignDeg;
      });
      if (along.length) pool = along;
    }
    let best: { e: Line; d: number } | undefined;
    for (const f of pool) if (!best || f.d < best.d) best = f;
    return best ? (this.levels[best.e.seg] ?? 0) : 0;
  }

  /**
   * The shortest way from `from` to `to`, leaving out the edges in `skip`,
   * or null when there is none within `limit` metres (A*, pruned).
   */
  shortest(from: number, to: number, limit: number, skip?: Set<number>, skipNodes?: Set<number>): Way | null {
    const goal = this.pts[to];
    const best = new Float64Array(this.pts.length).fill(Infinity);
    const prev = new Int32Array(this.pts.length).fill(-1);
    const prevSeg = new Int32Array(this.pts.length).fill(-1);
    const prevEdge = new Int32Array(this.pts.length).fill(-1);
    const done = new Uint8Array(this.pts.length);
    best[from] = 0;
    const heap: [number, number][] = [[distanceM(this.pts[from], goal), from]];
    const push = (e: [number, number]) => {
      heap.push(e);
      let i = heap.length - 1;
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (heap[parent][0] <= heap[i][0]) break;
        [heap[parent], heap[i]] = [heap[i], heap[parent]];
        i = parent;
      }
    };
    const pop = (): [number, number] => {
      const top = heap[0];
      const last = heap.pop()!;
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1;
          const r = l + 1;
          let m = i;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i], heap[m]];
          i = m;
        }
      }
      return top;
    };
    while (heap.length) {
      const [, i] = pop();
      if (done[i]) continue;
      done[i] = 1;
      if (i === to) break;
      for (const e of this.adj[i]) {
        if (skip?.has(e.id) || skipNodes?.has(e.to)) continue;
        const g = best[i] + e.m;
        if (g >= best[e.to]) continue;
        const f = g + distanceM(this.pts[e.to], goal);
        if (f > limit) continue;
        best[e.to] = g;
        prev[e.to] = i;
        prevSeg[e.to] = e.seg;
        prevEdge[e.to] = e.id;
        push([f, e.to]);
      }
    }
    if (best[to] === Infinity) return null;
    const nodes = [to];
    const segs: number[] = [];
    const edges: number[] = [];
    while (nodes[0] !== from) {
      segs.unshift(prevSeg[nodes[0]]);
      edges.unshift(prevEdge[nodes[0]]);
      nodes.unshift(prev[nodes[0]]);
    }
    return { m: best[to], nodes, segs, edges };
  }
}

/**
 * Up to `k` shortest loopless ways from `a` to `b` within `limit` metres,
 * shortest first (Yen's algorithm, GT2). A way only branches at a junction
 * (a node with more than two edges), so a long street costs one search, not
 * one per vertex.
 */
function shortestWays(graph: PieceGraph, a: number, b: number, limit: number, first: Way, k: number, avoid: Set<number> = new Set()): Way[] {
  const found: Way[] = [first];
  const pending: Way[] = [];
  // Ways are told apart by the pieces they run along, not their edges: the same way through
  // another join at an end is the same way (gap-drawing audit 3).
  const key = (w: Way) => w.segs.filter((x, i) => x !== JOIN && x !== w.segs[i - 1]).join(',');
  const seen = new Set([key(first)]);
  for (let n = 1; n < k; n++) {
    const prev = found[n - 1];
    let rootM = 0;
    for (let i = 0; i < prev.nodes.length - 1; i++) {
      const spur = prev.nodes[i];
      if (i > 0) rootM += distanceM(graph.pts[prev.nodes[i - 1]], graph.pts[spur]);
      if (i > 0 && graph.adj[spur].length <= 2) continue;
      const rootEdges = prev.edges.slice(0, i);
      const skip = new Set<number>();
      for (const w of found) if (w.edges.length > i && w.edges.slice(0, i).join(',') === rootEdges.join(',')) skip.add(w.edges[i]);
      const skipNodes = new Set([...avoid, ...prev.nodes.slice(0, i)]);
      const tail = graph.shortest(spur, b, limit - rootM, skip, skipNodes);
      if (!tail) continue;
      const way: Way = {
        m: rootM + tail.m,
        nodes: [...prev.nodes.slice(0, i), ...tail.nodes],
        segs: [...prev.segs.slice(0, i), ...tail.segs],
        edges: [...rootEdges, ...tail.edges],
      };
      if (seen.has(key(way))) continue;
      seen.add(key(way));
      pending.push(way);
    }
    if (!pending.length) break;
    pending.sort((x, y) => x.m - y.m);
    found.push(pending.shift()!);
  }
  return found;
}

/** A piece's kind of way for the fit: its class, so a footway and a path are one kind, a road another. */
const kindOf = (s: StreetSegment) => (s.kind_detail.split('/')[0] === 'path' ? 'path' : 'road');

/** Where a way turns: at a junction (more than two edges), by more than 45°. */
function turnsOf(graph: PieceGraph, w: Way): number {
  let n = 0;
  for (let i = 1; i < w.nodes.length - 1; i++) {
    if (graph.adj[w.nodes[i]].length <= 2 || w.segs[i - 1] === JOIN || w.segs[i] === JOIN) continue;
    const [p, q, r] = [graph.pts[w.nodes[i - 1]], graph.pts[w.nodes[i]], graph.pts[w.nodes[i + 1]]];
    const turn = Math.abs(((bearingDeg(q, r) - bearingDeg(p, q) + 540) % 360) - 180);
    if (turn > 45) n++;
  }
  return n;
}

/** A join from a fix to a street, not a street itself. */
export const JOIN = -1;

/**
 * Reads one gap (G2-G7): filled by itself, offered, or null when there is no walkable way to offer. `segments` are the streets around it and
 * `coverage` the box they were read whole over (G8; null when not read):
 * a budget whose prism leaves the box can't be judged, so nothing is
 * claimed under it.
 */
export function inferGap(g: Gap, segments: StreetSegment[], coverage: Bounds | null): Inference | null {
  // Within GPS error: joined straight and filled by itself, no streets needed (the owner's rule, Nov 3).
  const straight = distanceM(g.from, g.to);
  if (straight < GAP_RULES.straightM) {
    return { t0: g.t0, t1: g.t1, path: [g.from, g.to], lengthM: straight, certainDirect: 1, certainTime: 1, street: null, level: 'auto' };
  }
  if (!coverage || !segments.length) return null;
  const graph = PieceGraph.of(segments, g.from);
  const a = graph.joinFix(g.from, g.fromHeading);
  const b = graph.joinFix(g.to, g.toHeading);
  if (a == null || b == null) return null;

  const dt = (g.t1 - g.t0) / 1000;
  const likely = graph.shortest(a, b, (GAP_RULES.maxPace * dt));
  // No way at all, or none at a walking pace (G2, G3).
  if (!likely) return null;
  const L = likely.m;
  if (L / dt > GAP_RULES.maxPace) return null;

  const direct = GAP_RULES.direct * L;
  const time = Math.max(direct, GAP_RULES.fastPace * dt);
  if (!contains(coverage, prismBounds(g, direct))) return null;
  const timeRead = contains(coverage, prismBounds(g, time));

  // How far each street piece of the way runs along it, and by which edges.
  const along = new Map<number, number>();
  const used = new Map<number, Set<number>>();
  for (let i = 0; i < likely.segs.length; i++) {
    const seg = likely.segs[i];
    if (seg === JOIN) continue;
    along.set(seg, (along.get(seg) ?? 0) + distanceM(graph.pts[likely.nodes[i]], graph.pts[likely.nodes[i + 1]]));
    (used.get(seg) ?? used.set(seg, new Set()).get(seg)!).add(likely.edges[i]);
  }
  const streetM = [...along.values()].reduce((s, m) => s + m, 0);
  // Mostly the joins to a street (a plaza, a car park): not a street stretch (audit 13).
  if (streetM < GAP_RULES.streetShare * L) return null;
  // A piece is certain under a budget when the best way that avoids the stretch of it this way
  // uses is longer than the budget (G4). Only the edges used are left out, so a way out of
  // the same piece the other way round still counts (audit 1).
  let certainDirect = 0;
  let certainTime = 0;
  const limit = timeRead ? time : direct;
  for (const [seg, m] of along) {
    const around = graph.shortest(a, b, limit, used.get(seg))?.m ?? Infinity;
    if (around > direct) certainDirect += m;
    if (around > time) certainTime += m;
  }
  const shareDirect = certainDirect / streetM;
  const shareTime = timeRead ? certainTime / streetM : null;
  // Filled by itself only when nearly all of it is certain in the time allowed (G5); any other
  // walkable way is offered faint, to keep or dismiss (G6, G7: the owner's call, Nov 3, after a park
  // path with a drive beside it showed nothing).
  const level: Inference['level'] = shareTime != null && shareTime >= GAP_RULES.auto ? 'auto' : 'offer';

  // A way that fits the time (GT2): among the shortest ways the time allows, the one closest to the
  // walk's own pace over the gap, when it is clearly closer than the shortest. Only for an offer:
  // a gap certain enough to fill by itself keeps its shortest way (GT3).
  let way: Way = likely;
  if (level === 'offer' && g.pace) {
    const expect = g.pace * dt;
    const off = (w: Way) => Math.abs(w.m - expect);
    // A way that turns corner after corner round blocks is a poor guess: time to spare in town is mostly stopped.
    const turnsAllowed = turnsOf(graph, likely) + GAP_RULES.fitTurns;
    // And it keeps to the kinds of way the shortest uses: a footpath walk isn't guessed onto a park
    // drive because the drive is longer (gap-drawing audit 1).
    const kinds = new Set(likely.segs.filter((x) => x !== JOIN).map((x) => kindOf(segments[x])));
    const offKind = (w: Way) => {
      let off = 0;
      let all = 0;
      for (let i = 0; i < w.segs.length; i++) {
        if (w.segs[i] === JOIN) continue;
        const m = distanceM(graph.pts[w.nodes[i]], graph.pts[w.nodes[i + 1]]);
        all += m;
        if (!kinds.has(kindOf(segments[w.segs[i]]))) off += m;
      }
      return all ? off / all : 0;
    };
    // Searched between the likely way's first and last street points, never out through the
    // other joins at either end: those are the same way, a few metres apart (gap-drawing audit 3).
    const n = likely.nodes.length;
    // The joins' cost as the search counts it (twice their length).
    const joinM = 2 * (distanceM(graph.pts[likely.nodes[0]], graph.pts[likely.nodes[1]]) + distanceM(graph.pts[likely.nodes[n - 2]], graph.pts[likely.nodes[n - 1]]));
    const inner: Way = { m: likely.m - joinM, nodes: likely.nodes.slice(1, -1), segs: likely.segs.slice(1, -1), edges: likely.edges.slice(1, -1) };
    const whole = (w: Way): Way => ({
      m: w.m + joinM,
      nodes: [likely.nodes[0], ...w.nodes, likely.nodes[n - 1]],
      segs: [likely.segs[0], ...w.segs, likely.segs[n - 2]],
      edges: [likely.edges[0], ...w.edges, likely.edges[n - 2]],
    });
    const ways = (n > 3 ? shortestWays(graph, inner.nodes[0], inner.nodes[inner.nodes.length - 1], (timeRead ? time : direct) - joinM, inner, GAP_RULES.fitWays, new Set([a, b])).map(whole) : [likely])
      .filter((w) => turnsOf(graph, w) <= turnsAllowed && offKind(w) <= GAP_RULES.fitOtherKinds);
    const best = ways.length ? ways.reduce((x, y) => (off(y) < off(x) ? y : x)) : likely;
    if (best.m !== likely.m && off(best) <= GAP_RULES.fitCloser * off(likely)) way = best;
  }

  // The street most of it runs along, by name.
  const byName = new Map<string, number>();
  for (let i = 0; i < way.segs.length; i++) {
    const name = way.segs[i] === JOIN ? null : segments[way.segs[i]].name;
    if (name) byName.set(name, (byName.get(name) ?? 0) + distanceM(graph.pts[way.nodes[i]], graph.pts[way.nodes[i + 1]]));
  }
  const street = [...byName.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? null;
  return {
    t0: g.t0,
    t1: g.t1,
    path: way.nodes.map((i) => graph.pts[i]),
    // Measured on the ground: a join's cost is doubled in the search, not its length.
    lengthM: lineLengthM(way.nodes.map((i) => graph.pts[i])),
    certainDirect: shareDirect,
    certainTime: shareTime,
    street,
    level,
  };
}

/**
 * A stretch is about a gap when their times overlap by more than half the
 * longer (raw fixes never move, but read-time rules can shift a gap's edge),
 * so one decision is never about two gaps (audit 4).
 */
function sameGap(a: { t0: number; t1: number }, b: { t0: number; t1: number }): boolean {
  const overlap = Math.min(a.t1, b.t1) - Math.max(a.t0, b.t0);
  return overlap > 0.5 * Math.max(a.t1 - a.t0, b.t1 - b.t0);
}

/** A line meets a gap when it runs from near its fix before to near its fix after (audit 4, 10). */
function meets(path: LngLat[], g: Gap): boolean {
  return path.length >= 2 && distanceM(path[0], g.from) <= GAP_RULES.meetsM && distanceM(path[path.length - 1], g.to) <= GAP_RULES.meetsM;
}

/** The walker's newest decision about a gap, if any (G10). */
export function decisionFor(g: Gap, decisions: GapDecision[]): GapDecision | null {
  return decisions.filter((d) => sameGap(d, g) && meets(d.path, g)).sort((x, y) => y.decided_at - x.decided_at)[0] ?? null;
}

/**
 * What each gap shows (G5, G6, G10): the walker's own decision first (the
 * newest, if several), then what was inferred. A dismissed gap shows nothing.
 * A stretch carries the gap's current times, so `readTrace` meets it exactly.
 */
export function stretchesFor(gaps: Gap[], inferred: Inference[], decisions: GapDecision[]): Stretch[] {
  const out: Stretch[] = [];
  for (const g of gaps) {
    const decision = decisionFor(g, decisions);
    if (decision?.state === 'dismissed') continue;
    if (decision) {
      out.push({ t0: g.t0, t1: g.t1, path: decision.path, lengthM: decision.length_m, street: decision.street, how: 'kept' });
      continue;
    }
    // This exact gap's own inference first; an older one only if its line still meets the gap (audit 10).
    const inf = inferred.find((x) => gapKey(x) === gapKey(g)) ?? inferred.find((x) => sameGap(x, g) && meets(x.path, g));
    if (inf) out.push({ t0: g.t0, t1: g.t1, path: inf.path, lengthM: inf.lengthM, street: inf.street, how: inf.level });
  }
  return out;
}

/** The stretches walked: filled by itself or kept, never one only offered (G6, G11). */
export function fillsOf(stretches: Stretch[]): Fill[] {
  return stretches.filter((s) => s.how !== 'offer').map((s) => ({ t0: s.t0, t1: s.t1, path: s.path }));
}

/**
 * The stretch a tap at `p` reaches (G9): the nearest within `radiusM`, or
 * null. A tap near either end is the recorded trace there, where captures
 * often are, so it is left to what happened here (audit 8).
 */
export function stretchAt(stretches: Stretch[], p: LngLat, radiusM: number): Stretch | null {
  let best: { s: Stretch; d: number } | null = null;
  for (const s of stretches) {
    if (distanceM(p, s.path[0]) <= GAP_RULES.tapEndM || distanceM(p, s.path[s.path.length - 1]) <= GAP_RULES.tapEndM) continue;
    const d = distanceToLinesM(p, [s.path]);
    if (d <= radiusM && (!best || d < best.d)) best = { s, d };
  }
  return best?.s ?? null;
}

/** A gap's identity for state keyed by gap (the card, a read in flight). */
export const gapKey = (g: { t0: number; t1: number }) => `${g.t0}:${g.t1}`;

/** The card's words for a stretch (G9): what it is, then its length and how long the GPS was out. */
export function stretchLines(s: Stretch): { title: string; sub: string } {
  const along = s.street ? `along ${s.street}` : 'this way';
  const min = Math.max(1, Math.round((s.t1 - s.t0) / 60_000));
  // "Not recorded": the app may have been closed, not only the GPS lost (audit, UI).
  const facts = `${s.lengthM < 1000 ? `${Math.round(s.lengthM)} m` : `${(s.lengthM / 1000).toFixed(1)} km`} · not recorded for ${min} min.`;
  if (s.how === 'offer') return { title: `Probably ${along}`, sub: `${facts} Keep it to count it as walked.` };
  if (s.how === 'auto') return { title: `Filled in ${along}`, sub: `${facts} The only likely way in that time.` };
  return { title: `${along[0].toUpperCase()}${along.slice(1)}, kept`, sub: facts };
}

/** Gaps with nothing drawn across them (GW2): nothing to offer, or dismissed. */
export function emptyGaps(gaps: Gap[], stretches: Stretch[]): Gap[] {
  return gaps.filter((g) => !stretches.some((s) => gapKey(s) === gapKey(g)));
}

/**
 * The gap with no line a tap at `p` reaches (GW2): its dotted join within
 * `radiusM`, away from its two ends, which are the recorded trace's.
 */
export function emptyGapAt(gaps: Gap[], p: LngLat, radiusM: number): Gap | null {
  let best: { g: Gap; d: number } | null = null;
  for (const g of gaps) {
    // Short joins keep their middle tappable (gap-drawing audit 5).
    const endM = Math.min(GAP_RULES.tapEndM, distanceM(g.from, g.to) / 4);
    if (distanceM(p, g.from) <= endM || distanceM(p, g.to) <= endM) continue;
    const d = distanceToLinesM(p, [[g.from, g.to]]);
    if (d <= radiusM && (!best || d < best.d)) best = { g, d };
  }
  return best?.g ?? null;
}

/** The card's words for a gap with no line (GW2). */
export function gapLines(g: { t0: number; t1: number }): { title: string; sub: string } {
  const min = Math.max(1, Math.round((g.t1 - g.t0) / 60_000));
  return { title: `Not recorded for ${min} min`, sub: 'Draw the way you walked, or leave it as a break.' };
}
