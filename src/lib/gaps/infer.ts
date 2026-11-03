import { bearingDeg, boundsOf, distanceM, distanceToLinesM, isBreak, pointSegmentDist, projector, type Bounds } from '../geo';
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
 * GAP_RULES.maxMs, at least GAP_RULES.minM apart, with no pause or ride
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
    if (distanceM(pos(a), pos(b)) < GAP_RULES.minM) continue;
    pace ??= movingPace(tr);
    out.push({ t0: a.t, t1: b.t, from: pos(a), to: pos(b), pace });
  }
  return out;
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
  for (let i = 0; i < w.length; i++) {
    const p = w[i];
    let v = p.speed != null && p.speed > 0 ? p.speed : null;
    if (v == null && i > 0) {
      const dt = (p.t - w[i - 1].t) / 1000;
      if (dt > 0 && dt <= 30) v = distanceM(pos(w[i - 1]), pos(p)) / dt;
    }
    if (v != null && v >= GAP_RULES.movingSpeed && v <= GAP_RULES.maxPace * 2) speeds.push(v);
  }
  if (!speeds.length) return GAP_RULES.defaultPace;
  speeds.sort((a, b) => a - b);
  return speeds[speeds.length >> 1];
}

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
class PieceGraph {
  readonly pts: LngLat[] = [];
  readonly adj: Edge[][] = [];
  /** Each street edge once: its ends and piece, for joining a fix to the nearest streets. */
  /** Live street edges (a split one is replaced by its two halves). */
  lines = new Set<Line>();
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
function shortestWays(graph: PieceGraph, a: number, b: number, limit: number, first: Way, k: number): Way[] {
  const found: Way[] = [first];
  const pending: Way[] = [];
  const key = (w: Way) => w.edges.join(',');
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
      const skipNodes = new Set(prev.nodes.slice(0, i));
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

/** Where a way turns: at a junction (more than two edges), by more than 45°. */
function turnsOf(graph: PieceGraph, w: Way): number {
  let n = 0;
  for (let i = 1; i < w.nodes.length - 1; i++) {
    if (graph.adj[w.nodes[i]].length <= 2) continue;
    const [p, q, r] = [graph.pts[w.nodes[i - 1]], graph.pts[w.nodes[i]], graph.pts[w.nodes[i + 1]]];
    const turn = Math.abs(((bearingDeg(q, r) - bearingDeg(p, q) + 540) % 360) - 180);
    if (turn > 45) n++;
  }
  return n;
}

/** A join from a fix to a street, not a street itself. */
const JOIN = -1;

/**
 * Reads one gap (G2-G7): filled by itself, offered, or null when there is no walkable way to offer. `segments` are the streets around it and
 * `coverage` the box they were read whole over (G8; null when not read):
 * a budget whose prism leaves the box can't be judged, so nothing is
 * claimed under it.
 */
export function inferGap(g: Gap, segments: StreetSegment[], coverage: Bounds | null): Inference | null {
  if (!coverage || !segments.length) return null;
  const graph = new PieceGraph(g.from);
  for (let s = 0; s < segments.length; s++) {
    for (const line of segments[s].geometry) {
      let prev = -1;
      line.forEach((p, k) => {
        const i = graph.node(p, k === 0 || k === line.length - 1);
        if (prev >= 0 && prev !== i) graph.street(prev, i, s);
        prev = i;
      });
    }
  }
  // Each end joins every street within GAP_RULES.joinM of its fix, where it is nearest on that
  // street: the street edge is split there (an end of it is used as it is). Both ends on one
  // edge: the second splits the half it lies on, so the way runs straight along it.
  const join = (p: LngLat): number | null => {
    const xy = graph.proj(p);
    const near: { e: Line; t: number }[] = [];
    for (const e of graph.lines) {
      const a = graph.proj(graph.pts[e.a]);
      const b = graph.proj(graph.pts[e.b]);
      if (pointSegmentDist(xy, a, b) > GAP_RULES.joinM) continue;
      const len2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
      const t = len2 ? Math.max(0, Math.min(1, ((xy[0] - a[0]) * (b[0] - a[0]) + (xy[1] - a[1]) * (b[1] - a[1])) / len2)) : 0;
      near.push({ e, t });
    }
    if (!near.length) return null;
    const end = graph.node(p, false);
    const joined = new Set<number>();
    for (const { e, t } of near) {
      const a = graph.pts[e.a];
      const b = graph.pts[e.b];
      const len = distanceM(a, b);
      let k: number;
      if (t * len < 0.5) k = e.a;
      else if ((1 - t) * len < 0.5) k = e.b;
      else {
        k = graph.node([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], false);
        graph.split(e, k);
      }
      if (joined.has(k)) continue;
      joined.add(k);
      graph.link(end, k, JOIN);
    }
    return end;
  };
  const a = join(g.from);
  const b = join(g.to);
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
    const ways = shortestWays(graph, a, b, timeRead ? time : direct, likely, GAP_RULES.fitWays).filter((w) => turnsOf(graph, w) <= turnsAllowed);
    const best = ways.reduce((x, y) => (off(y) < off(x) ? y : x));
    if (best !== likely && off(best) <= GAP_RULES.fitCloser * off(likely)) way = best;
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
    lengthM: way.m,
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
