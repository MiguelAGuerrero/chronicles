import type { PlaceCandidate } from '../areas/types';
import type { CategoryId, Place } from '../discovery/types';
import { distanceM, projector } from '../geo';
import type { LngLat, StreetSegment } from '../types';
import mainStreets from './mainStreets.json';

/**
 * Where to start in a place (v1.5): pockets where recognized places cluster,
 * the strips inside them, and one landing point. Pure: places, streets and
 * towns come in from whatever source; nothing here knows the tile schema.
 */
export const LANDING_RULES = {
  /** The area read around the centre. */
  radiusM: 1500,
  /** A town or city point this close is the centre. */
  townM: 3000,
  /** The density grid's cell, and the flat kernel each cell counts within. */
  cellM: 50,
  kernelM: 100,
  /** A cell is dense with at least this much weight within the kernel (absolute, so a second strip beside a downtown still shows). */
  denseWeight: 4,
  /** A pocket: at least this weight, spanning more than two blocks. */
  minPocketWeight: 8,
  minSpanM: 200,
  /** A strip: places within this of a named street... */
  frontageM: 30,
  /** ...at least one weighted place per this much frontage... */
  perPlaceM: 40,
  /** ...over more than two blocks, with no gap longer than a block (STREET_MIN_M). */
  minRunM: 200,
  maxGapM: 80,
  minStripPlaces: 5,
  /** A station this close to the pocket is where to start. */
  transitM: 150,
  /** A pocket with no strip takes the neighbourhood within this. */
  neighbourhoodM: 1000,
  weights: { food: 1, shops: 1, nightlife: 1, culture: 1, history: 0.5, art: 0.5, viewpoints: 0.5, parks: 0.25 } as Record<CategoryId, number>,
} as const;

/** Common main-street names, the last fallback (L6). Data, not code. */
export const MAIN_STREET_NAMES: readonly string[] = mainStreets.names;

export interface Strip {
  name: string;
  /** End to end along the run of places. */
  lengthM: number;
  weight: number;
  /** The street pieces it covers, for drawing. */
  lines: LngLat[][];
  /** Its busiest point, on the street. */
  peak: LngLat;
}

export interface Pocket {
  name: string;
  weight: number;
  spanM: number;
  centre: LngLat;
  /** An outline for shading (the convex hull of its dense cells). */
  hull: LngLat[];
  strips: Strip[];
}

export type LandingBasis = 'density' | 'main-roads' | 'main-street' | 'centre';

export interface Landing {
  at: LngLat;
  street: string | null;
  via: 'transit' | 'strip' | 'cell' | 'fallback';
}

export interface AreaAnalysis {
  basis: LandingBasis;
  /** Says which rule placed the landing (L6). */
  reason: string;
  pockets: Pocket[];
  strips: Strip[];
  landing: Landing | null;
}

/** The centre to analyze around: the nearest town or city within 3 km, else the spot pressed (L1). */
const KIND_RANK: Record<string, number> = { city: 3, borough: 3, town: 2 };
/** The centre to analyze around: the nearest town or city within 3 km, a city before a town, never a village (L1, audit). */
export function centreFor(pressed: LngLat, towns: PlaceCandidate[]): LngLat {
  let best: LngLat = pressed;
  let bestKey: [number, number] = [0, Infinity];
  for (const t of towns) {
    if (t.level !== 'town') continue;
    const rank = t.kind ? (KIND_RANK[t.kind] ?? 0) : 2;
    if (rank === 0) continue;
    const d = distanceM(pressed, t.at);
    if (d > LANDING_RULES.townM) continue;
    if (rank > bestKey[0] || (rank === bestKey[0] && d < bestKey[1])) [best, bestKey] = [t.at, [rank, d]];
  }
  return best;
}

type XY = [number, number];

/** Nearest point on a polyline (metres in the local frame), with its distance. */
function nearestOn(p: XY, line: XY[]): { q: XY; d: number } {
  let best: XY = line[0];
  let bestD = Infinity;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1];
    const b = line[i];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
    const q: XY = [a[0] + t * dx, a[1] + t * dy];
    const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (d < bestD) [best, bestD] = [q, d];
  }
  return { q: best, d: bestD };
}

/** Points bucketed by a square grid, for "what's within r of here". */
class Buckets<T> {
  private cells = new Map<number, { p: XY; v: T }[]>();
  constructor(private size: number) {}
  private key(cx: number, cy: number) {
    return (cx + 50_000) * 100_003 + (cy + 50_000);
  }
  add(p: XY, v: T) {
    const k = this.key(Math.floor(p[0] / this.size), Math.floor(p[1] / this.size));
    const list = this.cells.get(k);
    if (list) list.push({ p, v });
    else this.cells.set(k, [{ p, v }]);
  }
  /** Calls `fn` for each point within r. */
  each(p: XY, r: number, fn: (v: T, q: XY, d: number) => void) {
    const x0 = Math.floor((p[0] - r) / this.size);
    const x1 = Math.floor((p[0] + r) / this.size);
    const y0 = Math.floor((p[1] - r) / this.size);
    const y1 = Math.floor((p[1] + r) / this.size);
    const r2 = r * r;
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++) {
        const list = this.cells.get(this.key(x, y));
        if (!list) continue;
        for (const e of list) {
          const dx = e.p[0] - p[0];
          const dy = e.p[1] - p[1];
          const d2 = dx * dx + dy * dy;
          if (d2 <= r2) fn(e.v, e.p, Math.sqrt(d2));
        }
      }
  }
  near(p: XY, r: number): { p: XY; v: T }[] {
    const out: { p: XY; v: T }[] = [];
    this.each(p, r, (v, q) => out.push({ p: q, v }));
    return out;
  }
}

function hull(points: XY[]): XY[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o: XY, a: XY, b: XY) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: XY[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: XY[] = [];
  for (const p of [...pts].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

const CLASS_RANK: Record<string, number> = { trunk: 3, primary: 3, secondary: 2, tertiary: 1 };
const rankOf = (s: StreetSegment) => CLASS_RANK[s.kind_detail.split('/')[0]] ?? 0;
const SUFFIXES = new Set(['street', 'st', 'avenue', 'ave', 'road', 'rd', 'boulevard', 'blvd', 'lane', 'ln', 'way', 'drive', 'dr', 'place', 'pl', 'square', 'sq', 'plaza', 'row', 'terrace']);
const DIRECTIONS = new Set(['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw', 'north', 'south', 'east', 'west']);

/** "North Main St. NW" → "main": directions and the street word off both ends. */
export function coreName(name: string): string {
  const words = name.toLowerCase().replace(/\./g, '').split(/\s+/).filter(Boolean);
  while (words.length > 1 && DIRECTIONS.has(words[0])) words.shift();
  while (words.length > 1 && DIRECTIONS.has(words[words.length - 1])) words.pop();
  while (words.length > 1 && SUFFIXES.has(words[words.length - 1])) words.pop();
  return words.join(' ');
}

/**
 * Groups points by single linkage within `gap` (metres), using buckets. Each
 * group's length is its shortest joining tree (the Kruskal edges, all within
 * `gap`): along a street, how far the run goes, bends and loops included.
 */
function linkWithin(points: XY[], gap: number, withLength = true): { members: number[]; length: number }[] {
  const parent = points.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  {
    // Points in one cell of side gap/√2 are all within the gap: join them at once, then join
    // neighbouring cells at their first pair within the gap.
    const side = gap / Math.SQRT2;
    const cells = new Map<number, number[]>();
    const keyOf = (cx: number, cy: number) => (cx + 50_000) * 100_003 + (cy + 50_000);
    points.forEach((p, i) => {
      const k = keyOf(Math.floor(p[0] / side), Math.floor(p[1] / side));
      const list = cells.get(k);
      if (list) {
        parent[find(i)] = find(list[0]);
        list.push(i);
      } else cells.set(k, [i]);
    });
    const g2 = gap * gap;
    for (const [k, list] of cells) {
      const cx = Math.floor(k / 100_003) - 50_000;
      const cy = (k % 100_003) - 50_000;
      for (let dx = -2; dx <= 2; dx++)
        for (let dy = -2; dy <= 2; dy++) {
          if (dx < 0 || (dx === 0 && dy <= 0)) continue;
          const other = cells.get(keyOf(cx + dx, cy + dy));
          if (!other || find(list[0]) === find(other[0])) continue;
          outer: for (const i of list)
            for (const j of other) {
              const ex = points[i][0] - points[j][0];
              const ey = points[i][1] - points[j][1];
              if (ex * ex + ey * ey <= g2) {
                parent[find(i)] = find(j);
                break outer;
              }
            }
        }
    }
  }
  const groups = new Map<number, number[]>();
  points.forEach((_, i) => {
    const r = find(i);
    const g = groups.get(r);
    if (g) g.push(i);
    else groups.set(r, [i]);
  });
  return [...groups.values()].map((members) => ({ members, length: withLength ? treeLength(members.map((i) => points[i])) : 0 }));
}

/**
 * The length of the shortest tree joining the points, on points thinned to
 * one per 10 m: along a street, how far a run goes, bends and loops included.
 */
function treeLength(all: XY[]): number {
  const seen = new Set<number>();
  const pts: XY[] = [];
  for (const p of all) {
    const k = (Math.floor(p[0] / 10) + 50_000) * 100_003 + (Math.floor(p[1] / 10) + 50_000);
    if (seen.has(k)) continue;
    seen.add(k);
    pts.push(p);
  }
  const n = pts.length;
  if (n < 2) return 0;
  const inTree = new Uint8Array(n);
  const best = new Float64Array(n).fill(Infinity);
  best[0] = 0;
  let total = 0;
  for (let k = 0; k < n; k++) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!inTree[i] && (u < 0 || best[i] < best[u])) u = i;
    inTree[u] = 1;
    total += best[u];
    for (let i = 0; i < n; i++) {
      if (inTree[i]) continue;
      const dx = pts[i][0] - pts[u][0];
      const dy = pts[i][1] - pts[u][1];
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < best[i]) best[i] = d;
    }
  }
  return total;
}

/** The longest distance between two of the points (over their hull). */
function longest(points: XY[]): number {
  const h = hull(points);
  let d = 0;
  for (let i = 0; i < h.length; i++) for (let j = i + 1; j < h.length; j++) d = Math.max(d, Math.hypot(h[i][0] - h[j][0], h[i][1] - h[j][1]));
  return d;
}

/** Where two segments cross, if they do. */
function cross(a: XY, b: XY, c: XY, d: XY): XY | null {
  const r = [b[0] - a[0], b[1] - a[1]];
  const s = [d[0] - c[0], d[1] - c[1]];
  const den = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den;
  const u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
  return t >= -0.01 && t <= 1.01 && u >= -0.01 && u <= 1.01 ? [a[0] + t * r[0], a[1] + t * r[1]] : null;
}

/** A landing never moves further than this onto a named street; beyond it, it stays put, unnamed. */
const SNAP_M = 150;

/**
 * The analysis (L4-L7). Strips are runs of places along a named street,
 * linked place to place no more than a block apart; pockets are dense places
 * linked the same way. Both are found by density alone, as many as there
 * are. With nothing dense, the fallbacks run in order.
 */
export function analyzeArea(o: {
  centre: LngLat;
  places: Place[];
  segments: StreetSegment[];
  /** Named place points (neighbourhoods name pockets). */
  towns: PlaceCandidate[];
  transit: LngLat[];
}): AreaAnalysis {
  const R = LANDING_RULES;
  const toXY = projector(o.centre);
  const kx = toXY([o.centre[0] + 1, o.centre[1]])[0];
  const ky = toXY([o.centre[0], o.centre[1] + 1])[1];
  const toLL = (p: XY): LngLat => [o.centre[0] + p[0] / kx, o.centre[1] + p[1] / ky];

  type Pt = { place: Place; xy: XY; w: number };
  const pts: Pt[] = o.places
    .map((p) => ({ place: p, xy: toXY(p.at), w: R.weights[p.category] ?? 0 }))
    .filter((p) => p.w > 0 && Math.hypot(p.xy[0], p.xy[1]) <= R.radiusM);
  const named = o.segments.filter((s) => s.name).map((s) => ({ name: s.name!, seg: s, lines: s.geometry.map((l) => l.map(toXY)) }));

  // Named pieces bucketed by points along them, for "the nearest named street".
  const pieceBuckets = new Buckets<number>(SNAP_M);
  named.forEach((n, i) => {
    for (const line of n.lines)
      for (let k = 0; k < line.length; k++) {
        pieceBuckets.add(line[k], i);
        if (k > 0) {
          const len = Math.hypot(line[k][0] - line[k - 1][0], line[k][1] - line[k - 1][1]);
          const steps = Math.floor(len / (SNAP_M / 2));
          for (let j = 1; j <= steps; j++) pieceBuckets.add([line[k - 1][0] + ((line[k][0] - line[k - 1][0]) * j) / (steps + 1), line[k - 1][1] + ((line[k][1] - line[k - 1][1]) * j) / (steps + 1)], i);
        }
      }
  });
  const nearestNamed = (p: XY, within: number, only?: (n: (typeof named)[number]) => boolean) => {
    let best: { q: XY; d: number; name: string } | null = null;
    const seen = new Set<number>();
    for (const { v: i } of pieceBuckets.near(p, within + SNAP_M / 2)) {
      if (seen.has(i)) continue;
      seen.add(i);
      if (only && !only(named[i])) continue;
      for (const l of named[i].lines) {
        const r = nearestOn(p, l);
        if (r.d <= within && (!best || r.d < best.d)) best = { ...r, name: named[i].name };
      }
    }
    return best;
  };

  // Strips: per street name, its frontage places, linked place to place.
  const placeBuckets = new Buckets<Pt>(R.frontageM * 2);
  for (const p of pts) placeBuckets.add(p.xy, p);
  const byStreet = new Map<string, typeof named>();
  for (const n of named) {
    const list = byStreet.get(n.name);
    if (list) list.push(n);
    else byStreet.set(n.name, [n]);
  }
  // Each place's nearest point on every named street within 30 m, looked up from the place (audit: fast).
  const frontage = new Map<string, Map<Pt, XY>>();
  /** Which piece (by index) each frontage point sits on, per street. */
  const onPiece = new Map<string, Map<Pt, number>>();
  for (const p of pts) {
    const best = new Map<string, { q: XY; d: number; i: number }>();
    const seen = new Set<number>();
    pieceBuckets.each(p.xy, R.frontageM + SNAP_M / 2, (i) => {
      if (seen.has(i)) return;
      seen.add(i);
      for (const l of named[i].lines) {
        const r = nearestOn(p.xy, l);
        if (r.d > R.frontageM) continue;
        const prev = best.get(named[i].name);
        if (!prev || r.d < prev.d) best.set(named[i].name, { ...r, i });
      }
    });
    for (const [name, r] of best) {
      let m = frontage.get(name);
      if (!m) frontage.set(name, (m = new Map()));
      m.set(p, r.q);
      let pm = onPiece.get(name);
      if (!pm) onPiece.set(name, (pm = new Map()));
      pm.set(p, r.i);
    }
  }
  type StripX = Strip & { members: Set<Pt> };
  const strips: StripX[] = [];
  for (const name of byStreet.keys()) {
    const front = frontage.get(name) ?? new Map<Pt, XY>();
    if (front.size < R.minStripPlaces) continue;
    const list = [...front];
    for (const group of linkWithin(list.map(([, q]) => q), R.maxGapM)) {
      if (group.members.length < R.minStripPlaces) continue;
      const run = group.members.map((i) => list[i]);
      const qs = run.map(([, q]) => q);
      const length = group.length;
      const weight = run.reduce((acc, [p]) => acc + p.w, 0);
      if (length < R.minRunM || weight < length / R.perPlaceM) continue;
      const runB = new Buckets<number>(R.maxGapM);
      qs.forEach((q, i) => runB.add(q, i));
      let peak = qs[0];
      let peakN = -1;
      for (const q of qs) {
        let n = 0;
        runB.each(q, R.maxGapM / 2, () => n++);
        if (n > peakN) [peak, peakN] = [q, n];
      }
      // The pieces the run's frontage points sit on.
      const pm = onPiece.get(name)!;
      const lines = [...new Set(run.map(([p]) => pm.get(p)!))].flatMap((i) => named[i].seg.geometry);
      strips.push({ name, lengthM: length, weight, lines, peak: toLL(peak), members: new Set(run.map(([p]) => p)) });
    }
  }

  // Pockets: places with enough weight within the kernel (cores), linked no
  // more than a block apart; places near a core join it.
  const kernel = new Buckets<Pt>(R.kernelM);
  for (const p of pts) kernel.add(p.xy, p);
  const weightNear = (p: XY) => {
    let w = 0;
    kernel.each(p, R.kernelM, (v) => (w += v.w));
    return w;
  };
  const cores = pts.filter((p) => weightNear(p.xy) >= R.denseWeight);
  const coreGroups = linkWithin(cores.map((c) => c.xy), R.maxGapM, false).map((g) => g.members);
  const groupOf = new Map<Pt, number>();
  coreGroups.forEach((g, gi) => g.forEach((i) => groupOf.set(cores[i], gi)));
  const coreBuckets = new Buckets<Pt>(R.maxGapM);
  for (const c of cores) coreBuckets.add(c.xy, c);
  const membersOf: Pt[][] = coreGroups.map((g) => g.map((i) => cores[i]));
  for (const p of pts) {
    if (groupOf.has(p)) continue;
    let best: Pt | null = null;
    let bestD: number = R.maxGapM;
    for (const { v, p: q } of coreBuckets.near(p.xy, R.maxGapM)) {
      const d = Math.hypot(q[0] - p.xy[0], q[1] - p.xy[1]);
      if (d <= bestD) [best, bestD] = [v, d];
    }
    if (best) membersOf[groupOf.get(best)!].push(p);
  }
  type PocketX = Pocket & { members: Set<Pt>; list: Pt[] };
  const pockets: PocketX[] = [];
  for (const members of membersOf) {
    const weight = members.reduce((acc, p) => acc + p.w, 0);
    if (weight < R.minPocketWeight) continue;
    const spanM = longest(members.map((p) => p.xy));
    if (spanM < R.minSpanM) continue;
    const centre: XY = [members.reduce((acc, p) => acc + p.xy[0] * p.w, 0) / weight, members.reduce((acc, p) => acc + p.xy[1] * p.w, 0) / weight];
    const pad = R.cellM / 2;
    const corners = members.flatMap((p) => [[-pad, -pad], [pad, -pad], [-pad, pad], [pad, pad]].map(([dx, dy]) => [p.xy[0] + dx, p.xy[1] + dy] as XY));
    pockets.push({ name: '', weight, spanM, centre: toLL(centre), hull: hull(corners).map(toLL), strips: [], members: new Set(members), list: members });
  }
  pockets.sort((a, b) => b.weight - a.weight);
  for (const s of strips) {
    let best: PocketX | null = null;
    let bestN = 0;
    for (const p of pockets) {
      let n = 0;
      for (const m of s.members) if (p.members.has(m)) n++;
      if (n > bestN) [best, bestN] = [p, n];
    }
    best?.strips.push(s);
  }
  for (const p of pockets) {
    p.strips.sort((a, b) => b.weight - a.weight);
    if (p.strips[0]) p.name = p.strips[0].name;
    else {
      let hood: string | null = null;
      let hoodD: number = R.neighbourhoodM;
      for (const t of o.towns) {
        if (t.level !== 'neighborhood') continue;
        const d = distanceM(t.at, p.centre);
        if (d <= hoodD) [hood, hoodD] = [t.name, d];
      }
      p.name = hood ?? 'A busy pocket';
    }
  }
  const strip = ({ members: _m, ...rest }: StripX): Strip => rest;
  const cleanStrips = strips.map(strip);
  const cleanPockets: Pocket[] = pockets.map(({ members: _m, list: _l, strips: ps, ...p }) => ({ ...p, strips: ps.map((x) => strip(x as StripX)) }));
  /** Onto a named street within reach, else where it is, unnamed (audit). */
  const land = (p: XY, via: Landing['via']): Landing => {
    const n = nearestNamed(p, SNAP_M);
    return n ? { at: toLL(n.q), street: n.name, via } : { at: toLL(p), street: null, via };
  };

  if (pockets.length || strips.length) {
    const top = pockets[0];
    const topStrips = top ? (top.strips as StripX[]) : [...strips].sort((a, b) => b.weight - a.weight);
    let landing: Landing | null = null;
    // A station by the pocket first, landing on the pocket's own street (L7).
    if (top) {
      const memberBuckets = new Buckets<Pt>(R.transitM);
      for (const m of top.list) memberBuckets.add(m.xy, m);
      let station: XY | null = null;
      let stationD: number = R.transitM;
      for (const t of o.transit) {
        const xy = toXY(t);
        for (const { p } of memberBuckets.near(xy, R.transitM)) {
          const d = Math.hypot(p[0] - xy[0], p[1] - xy[1]);
          if (d <= stationD) [station, stationD] = [xy, d];
        }
      }
      if (station) {
        const own = new Set(topStrips.map((x) => x.name));
        const onOwn = own.size ? nearestNamed(station, R.transitM + R.frontageM, (n) => own.has(n.name)) : null;
        landing = onOwn ? { at: toLL(onOwn.q), street: onOwn.name, via: 'transit' } : null;
        if (!landing && !own.size) landing = land(station, 'transit');
      }
    }
    if (!landing && topStrips[0]) {
      const peak = toXY(topStrips[0].peak);
      const n = nearestNamed(peak, 5, (x) => x.name === topStrips[0].name);
      landing = { at: n ? toLL(n.q) : topStrips[0].peak, street: topStrips[0].name, via: 'strip' };
    }
    if (!landing && top) {
      let densest = top.list[0];
      let densestW = -1;
      for (const m of top.list) {
        const w = weightNear(m.xy);
        if (w > densestW) [densest, densestW] = [m, w];
      }
      landing = land(densest.xy, 'cell');
    }
    return { basis: 'density', reason: 'Busiest area', pockets: cleanPockets, strips: cleanStrips, landing };
  }

  // Fallbacks, only with nothing dense (L6).
  const nearestTo = (list: typeof named) => {
    let best: { q: XY; d: number; name: string } | null = null;
    for (const n of list)
      for (const l of n.lines) {
        const r = nearestOn([0, 0], l);
        if (!best || r.d < best.d) best = { ...r, name: n.name };
      }
    return best;
  };
  // (a) the crossing nearest the centre of the highest-class pair of named streets that do cross.
  const ranked = [...byStreet]
    .map(([name, pieces]) => ({ name, pieces, rank: Math.max(...pieces.map((p) => rankOf(p.seg))), d: nearestTo(pieces)!.d }))
    .filter((x) => x.rank > 0 && x.d <= R.radiusM)
    .sort((a, b) => b.rank - a.rank || a.d - b.d)
    .slice(0, 8);
  for (let i = 0; i < ranked.length; i++)
    for (let j = i + 1; j < ranked.length; j++) {
      const A = ranked[i];
      const B = ranked[j];
      let at: XY | null = null;
      for (const la of A.pieces.flatMap((p) => p.lines))
        for (const lb of B.pieces.flatMap((p) => p.lines))
          for (let x = 1; x < la.length; x++)
            for (let y = 1; y < lb.length; y++) {
              const c = cross(la[x - 1], la[x], lb[y - 1], lb[y]);
              if (c && Math.hypot(c[0], c[1]) <= R.radiusM && (!at || Math.hypot(c[0], c[1]) < Math.hypot(at[0], at[1]))) at = c;
            }
      if (at) {
        return {
          basis: 'main-roads', reason: `Main roads: ${A.name} & ${B.name}`, pockets: [], strips: [],
          landing: { at: toLL(at), street: A.name, via: 'fallback' },
        };
      }
    }
  // (b) a street on the main-street list, in its usual forms.
  const listed = new Set(MAIN_STREET_NAMES.map((n) => n.toLowerCase()));
  const main = nearestTo(named.filter((n) => listed.has(n.name.toLowerCase()) || listed.has(coreName(n.name))));
  if (main && main.d <= R.radiusM) {
    return { basis: 'main-street', reason: `A main street: ${main.name}`, pockets: [], strips: [], landing: { at: toLL(main.q), street: main.name, via: 'fallback' } };
  }
  // (c) the town centre, on its nearest named street.
  const any = nearestTo(named);
  return {
    basis: 'centre', reason: 'Town centre', pockets: [], strips: [],
    landing: any ? { at: toLL(any.q), street: any.name, via: 'fallback' } : { at: o.centre, street: null, via: 'fallback' },
  };
}
