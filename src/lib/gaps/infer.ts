import { boundsOf, distanceM, distanceToLinesM, isBreak, pointSegmentDist, projector, type Bounds } from '../geo';
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
  for (let i = 1; i < w.length; i++) {
    const a = w[i - 1];
    const b = w[i];
    const dt = b.t - a.t;
    if (dt <= GAP_RULES.gapMs || dt > GAP_RULES.maxMs) continue;
    if (isBreak(a, b, tr.breaks, Infinity)) continue;
    if (distanceM(pos(a), pos(b)) < GAP_RULES.minM) continue;
    out.push({ t0: a.t, t1: b.t, from: pos(a), to: pos(b) });
  }
  return out;
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
  const budget = Math.max((GAP_RULES.pace * (g.t1 - g.t0)) / 1000, GAP_RULES.readStraight * straight);
  return prismBounds(g, Math.min(budget, GAP_RULES.readMaxM));
}

/** Street piece ends this close are one junction (tile edges, rounding), as navigation merges them. */
const MERGE_M = 3;

type Edge = { to: number; m: number; seg: number };

/** A walking graph over street pieces, each edge tagged with its piece, so a piece can be left out of a search. */
class PieceGraph {
  readonly pts: LngLat[] = [];
  readonly adj: Edge[][] = [];
  /** Each street edge once: its ends and piece, for joining a fix to the nearest streets. */
  readonly lines: { a: number; b: number; seg: number }[] = [];
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

  link(a: number, b: number, seg: number, m = distanceM(this.pts[a], this.pts[b])) {
    if (a === b) return;
    this.adj[a].push({ to: b, m, seg });
    this.adj[b].push({ to: a, m, seg });
  }

  /**
   * The shortest way from `from` to `to`, leaving out the edges of piece
   * `skip`, or null when there is none within `limit` metres (A*, pruned).
   */
  shortest(from: number, to: number, limit: number, skip = -2): { m: number; nodes: number[]; segs: number[] } | null {
    const goal = this.pts[to];
    const best = new Float64Array(this.pts.length).fill(Infinity);
    const prev = new Int32Array(this.pts.length).fill(-1);
    const prevSeg = new Int32Array(this.pts.length).fill(-1);
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
        if (e.seg === skip) continue;
        const g = best[i] + e.m;
        if (g >= best[e.to]) continue;
        const f = g + distanceM(this.pts[e.to], goal);
        if (f > limit) continue;
        best[e.to] = g;
        prev[e.to] = i;
        prevSeg[e.to] = e.seg;
        push([f, e.to]);
      }
    }
    if (best[to] === Infinity) return null;
    const nodes = [to];
    const segs: number[] = [];
    while (nodes[0] !== from) {
      segs.unshift(prevSeg[nodes[0]]);
      nodes.unshift(prev[nodes[0]]);
    }
    return { m: best[to], nodes, segs };
  }
}

/** A join from a fix to a street, not a street itself. */
const JOIN = -1;

/**
 * Reads one gap (G2-G7). `segments` are the streets around it and
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
        if (prev >= 0 && prev !== i) {
          graph.link(prev, i, s);
          graph.lines.push({ a: prev, b: i, seg: s });
        }
        prev = i;
      });
    }
  }
  // Each end joins every street within GAP_RULES.joinM of its fix, where it is nearest on that street.
  const join = (p: LngLat): number | null => {
    const xy = graph.proj(p);
    const near: { e: (typeof graph.lines)[number]; t: number; d: number }[] = [];
    for (const e of graph.lines) {
      const a = graph.proj(graph.pts[e.a]);
      const b = graph.proj(graph.pts[e.b]);
      const d = pointSegmentDist(xy, a, b);
      if (d > GAP_RULES.joinM) continue;
      const len2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
      const t = len2 ? Math.max(0, Math.min(1, ((xy[0] - a[0]) * (b[0] - a[0]) + (xy[1] - a[1]) * (b[1] - a[1])) / len2)) : 0;
      near.push({ e, t, d });
    }
    if (!near.length) return null;
    const end = graph.node(p, false);
    for (const { e, t } of near) {
      const a = graph.pts[e.a];
      const b = graph.pts[e.b];
      const on: LngLat = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      const k = graph.node(on, false);
      graph.link(k, e.a, e.seg);
      graph.link(k, e.b, e.seg);
      graph.link(end, k, JOIN);
      splits.push({ k, e, t });
    }
    return end;
  };
  const splits: { k: number; e: (typeof graph.lines)[number]; t: number }[] = [];
  const a = join(g.from);
  const firstSplits = splits.length;
  const b = join(g.to);
  if (a == null || b == null) return null;
  // Both ends on one stretch of street: straight along it, not round by its corners.
  for (const x of splits.slice(0, firstSplits))
    for (const y of splits.slice(firstSplits)) if (x.e === y.e) graph.link(x.k, y.k, x.e.seg);

  const dt = (g.t1 - g.t0) / 1000;
  const likely = graph.shortest(a, b, (GAP_RULES.maxPace * dt));
  // No way at all, or none at a walking pace (G2, G3).
  if (!likely) return null;
  const L = likely.m;
  if (L / dt > GAP_RULES.maxPace) return null;

  const direct = GAP_RULES.direct * L;
  const time = Math.max(direct, GAP_RULES.pace * dt);
  if (!contains(coverage, prismBounds(g, direct))) return null;
  const timeRead = contains(coverage, prismBounds(g, time));

  // How far each street piece of the way runs along it.
  const along = new Map<number, number>();
  for (let i = 0; i < likely.segs.length; i++) {
    const seg = likely.segs[i];
    if (seg === JOIN) continue;
    along.set(seg, (along.get(seg) ?? 0) + distanceM(graph.pts[likely.nodes[i]], graph.pts[likely.nodes[i + 1]]));
  }
  const streetM = [...along.values()].reduce((s, m) => s + m, 0);
  if (streetM <= 0) return null;
  // A piece is certain under a budget when the best way around it is longer than the budget (G4).
  let certainDirect = 0;
  let certainTime = 0;
  const limit = timeRead ? time : direct;
  for (const [seg, m] of along) {
    const around = graph.shortest(a, b, limit, seg)?.m ?? Infinity;
    if (around > direct) certainDirect += m;
    if (around > time) certainTime += m;
  }
  const shareDirect = certainDirect / streetM;
  const shareTime = timeRead ? certainTime / streetM : null;
  const level = shareTime != null && shareTime >= GAP_RULES.auto ? 'auto' : shareDirect >= GAP_RULES.offer ? 'offer' : null;
  if (!level) return null;

  // The street most of it runs along, by name.
  const byName = new Map<string, number>();
  for (const [seg, m] of along) {
    const name = segments[seg].name;
    if (name) byName.set(name, (byName.get(name) ?? 0) + m);
  }
  const street = [...byName.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? null;
  return {
    t0: g.t0,
    t1: g.t1,
    path: likely.nodes.map((i) => graph.pts[i]),
    lengthM: L,
    certainDirect: shareDirect,
    certainTime: shareTime,
    street,
    level,
  };
}

/** A decision is about a gap when their times overlap by more than half the shorter (raw fixes never move, but read-time rules can shift a gap's edge). */
function sameGap(a: { t0: number; t1: number }, b: { t0: number; t1: number }): boolean {
  const overlap = Math.min(a.t1, b.t1) - Math.max(a.t0, b.t0);
  return overlap > 0.5 * Math.min(a.t1 - a.t0, b.t1 - b.t0);
}

/** The walker's newest decision about a gap, if any (G10). */
export function decisionFor(g: { t0: number; t1: number }, decisions: GapDecision[]): GapDecision | null {
  return decisions.filter((d) => sameGap(d, g)).sort((x, y) => y.decided_at - x.decided_at)[0] ?? null;
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
    const inf = inferred.find((x) => sameGap(x, g));
    if (inf) out.push({ t0: g.t0, t1: g.t1, path: inf.path, lengthM: inf.lengthM, street: inf.street, how: inf.level });
  }
  return out;
}

/** The stretches walked: filled by itself or kept, never one only offered (G6, G11). */
export function fillsOf(stretches: Stretch[]): Fill[] {
  return stretches.filter((s) => s.how !== 'offer').map((s) => ({ t0: s.t0, t1: s.t1, path: s.path }));
}

/** The stretch a tap at `p` reaches (G9): the nearest within `radiusM`, or null. */
export function stretchAt(stretches: Stretch[], p: LngLat, radiusM: number): Stretch | null {
  let best: { s: Stretch; d: number } | null = null;
  for (const s of stretches) {
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
  const facts = `${s.lengthM < 1000 ? `${Math.round(s.lengthM)} m` : `${(s.lengthM / 1000).toFixed(1)} km`} · no GPS for ${min} min.`;
  if (s.how === 'offer') return { title: `Probably ${along}`, sub: `${facts} Keep it to count it as walked.` };
  if (s.how === 'auto') return { title: `Filled in ${along}`, sub: `${facts} There was no other way in that time.` };
  return { title: `Kept ${along}`, sub: facts };
}
