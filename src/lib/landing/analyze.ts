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
export function centreFor(pressed: LngLat, towns: PlaceCandidate[]): LngLat {
  let best: LngLat = pressed;
  let bestD: number = LANDING_RULES.townM;
  for (const t of towns) {
    if (t.level !== 'town') continue;
    const d = distanceM(pressed, t.at);
    if (d <= bestD) [best, bestD] = [t.at, d];
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
  private cells = new Map<string, { p: XY; v: T }[]>();
  constructor(private size: number) {}
  private key(x: number, y: number) {
    return `${Math.floor(x / this.size)},${Math.floor(y / this.size)}`;
  }
  add(p: XY, v: T) {
    const k = this.key(p[0], p[1]);
    const list = this.cells.get(k);
    if (list) list.push({ p, v });
    else this.cells.set(k, [{ p, v }]);
  }
  near(p: XY, r: number): { p: XY; v: T }[] {
    const out: { p: XY; v: T }[] = [];
    const x0 = Math.floor((p[0] - r) / this.size);
    const x1 = Math.floor((p[0] + r) / this.size);
    const y0 = Math.floor((p[1] - r) / this.size);
    const y1 = Math.floor((p[1] + r) / this.size);
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++)
        for (const e of this.cells.get(`${x},${y}`) ?? []) if (Math.hypot(e.p[0] - p[0], e.p[1] - p[1]) <= r) out.push(e);
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
const SUFFIX = /\s+(street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|way|drive|dr|place|pl)\.?$/i;

/**
 * The analysis (L4-L7). Pockets are connected dense cells; strips are runs of
 * frontage along named streets; both are found by density alone, as many as
 * there are. With nothing dense, the fallbacks run in order.
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

  const pts = o.places
    .map((p) => ({ place: p, xy: toXY(p.at), w: R.weights[p.category] ?? 0 }))
    .filter((p) => p.w > 0 && Math.hypot(p.xy[0], p.xy[1]) <= R.radiusM);
  const segs = o.segments.map((s) => ({ seg: s, lines: s.geometry.map((l) => l.map(toXY)) }));
  const named = segs.filter((s) => s.seg.name);

  // Strips: per named street, its frontage places in order along the street.
  const placeBuckets = new Buckets<(typeof pts)[number]>(R.frontageM * 2);
  for (const p of pts) placeBuckets.add(p.xy, p);
  const byStreet = new Map<string, typeof named>();
  for (const s of named) {
    const list = byStreet.get(s.seg.name!);
    if (list) list.push(s);
    else byStreet.set(s.seg.name!, [s]);
  }
  const strips: (Strip & { members: Set<(typeof pts)[number]> })[] = [];
  for (const [name, pieces] of byStreet) {
    const front = new Map<(typeof pts)[number], XY>();
    for (const piece of pieces)
      for (const line of piece.lines) {
        // Candidates near this piece: query around its vertices and midpoints.
        const probes: XY[] = [];
        for (let i = 0; i < line.length; i++) {
          probes.push(line[i]);
          if (i > 0) {
            const len = Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
            const n = Math.ceil(len / R.frontageM);
            for (let k = 1; k < n; k++) probes.push([line[i - 1][0] + ((line[i][0] - line[i - 1][0]) * k) / n, line[i - 1][1] + ((line[i][1] - line[i - 1][1]) * k) / n]);
          }
        }
        for (const probe of probes)
          for (const { v } of placeBuckets.near(probe, R.frontageM * 1.5)) {
            const { q, d } = nearestOn(v.xy, line);
            if (d > R.frontageM) continue;
            const prev = front.get(v);
            if (!prev || Math.hypot(v.xy[0] - q[0], v.xy[1] - q[1]) < Math.hypot(v.xy[0] - prev[0], v.xy[1] - prev[1])) front.set(v, q);
          }
      }
    if (front.size < R.minStripPlaces) continue;
    // Order along the street's main axis (its two farthest piece ends).
    const ends = pieces.flatMap((p) => p.lines.flatMap((l) => [l[0], l[l.length - 1]]));
    let a = ends[0];
    let b = ends[0];
    for (const e of ends) if (Math.hypot(e[0] - ends[0][0], e[1] - ends[0][1]) > Math.hypot(b[0] - ends[0][0], b[1] - ends[0][1])) b = e;
    for (const e of ends) if (Math.hypot(e[0] - b[0], e[1] - b[1]) > Math.hypot(a[0] - b[0], a[1] - b[1])) a = e;
    const ax = [b[0] - a[0], b[1] - a[1]];
    const axLen = Math.hypot(ax[0], ax[1]) || 1;
    const along = (q: XY) => ((q[0] - a[0]) * ax[0] + (q[1] - a[1]) * ax[1]) / axLen;
    const ordered = [...front].map(([p, q]) => ({ p, q, t: along(q) })).sort((x, y) => x.t - y.t);
    // Runs: consecutive places no more than a block apart.
    let start = 0;
    for (let i = 1; i <= ordered.length; i++) {
      const broken = i === ordered.length || Math.hypot(ordered[i].q[0] - ordered[i - 1].q[0], ordered[i].q[1] - ordered[i - 1].q[1]) > R.maxGapM;
      if (!broken) continue;
      const runList = ordered.slice(start, i);
      start = i;
      if (runList.length < R.minStripPlaces) continue;
      const first = runList[0].q;
      const last = runList[runList.length - 1].q;
      const span = Math.hypot(last[0] - first[0], last[1] - first[1]);
      const weight = runList.reduce((s, r) => s + r.p.w, 0);
      if (span < R.minRunM || weight < span / R.perPlaceM) continue;
      // The busiest point: the frontage point with the most of the run within a block.
      let peak = runList[0].q;
      let peakN = -1;
      for (const r of runList) {
        const n = runList.filter((x) => Math.hypot(x.q[0] - r.q[0], x.q[1] - r.q[1]) <= R.maxGapM).length;
        if (n > peakN) [peak, peakN] = [r.q, n];
      }
      const t0 = runList[0].t - R.frontageM;
      const t1 = runList[runList.length - 1].t + R.frontageM;
      const lines = pieces
        .flatMap((p) => p.lines)
        .filter((l) => {
          const mid = l[Math.floor(l.length / 2)];
          const tm = (along(l[0]) + along(l[l.length - 1])) / 2;
          return tm >= t0 && tm <= t1 && runList.some((r) => Math.hypot(r.q[0] - mid[0], r.q[1] - mid[1]) <= R.maxGapM + 50);
        })
        .map((l) => l.map(toLL));
      strips.push({ name, lengthM: span, weight, lines, peak: toLL(peak), members: new Set(runList.map((r) => r.p)) });
    }
  }

  // Pockets: cells with enough weight within the kernel, connected.
  const cellOf = (p: XY) => [Math.floor(p[0] / R.cellM), Math.floor(p[1] / R.cellM)] as const;
  const kernel = new Buckets<(typeof pts)[number]>(R.kernelM);
  for (const p of pts) kernel.add(p.xy, p);
  const dense = new Set<string>();
  const seen = new Set<string>();
  for (const p of pts) {
    const [cx, cy] = cellOf(p.xy);
    const reach = Math.ceil(R.kernelM / R.cellM);
    for (let x = cx - reach; x <= cx + reach; x++)
      for (let y = cy - reach; y <= cy + reach; y++) {
        const k = `${x},${y}`;
        if (seen.has(k)) continue;
        seen.add(k);
        const c: XY = [(x + 0.5) * R.cellM, (y + 0.5) * R.cellM];
        const w = kernel.near(c, R.kernelM).reduce((s, e) => s + e.v.w, 0);
        if (w >= R.denseWeight) dense.add(k);
      }
  }
  const placesByCell = new Map<string, (typeof pts)[number][]>();
  for (const p of pts) {
    const k = cellOf(p.xy).join(',');
    const list = placesByCell.get(k);
    if (list) list.push(p);
    else placesByCell.set(k, [p]);
  }
  const pockets: (Pocket & { members: Set<(typeof pts)[number]>; cells: XY[] })[] = [];
  const done = new Set<string>();
  for (const startCell of dense) {
    if (done.has(startCell)) continue;
    const queue = [startCell];
    done.add(startCell);
    const cells: string[] = [];
    while (queue.length) {
      const k = queue.pop()!;
      cells.push(k);
      const [x, y] = k.split(',').map(Number);
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++) {
          const n = `${x + dx},${y + dy}`;
          if (dense.has(n) && !done.has(n)) {
            done.add(n);
            queue.push(n);
          }
        }
    }
    const members = cells.flatMap((k) => placesByCell.get(k) ?? []);
    const weight = members.reduce((s, p) => s + p.w, 0);
    if (weight < R.minPocketWeight || !members.length) continue;
    const xs = members.map((p) => p.xy[0]);
    const ys = members.map((p) => p.xy[1]);
    const spanM = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    if (spanM < R.minSpanM) continue;
    const centre: XY = [members.reduce((s, p) => s + p.xy[0] * p.w, 0) / weight, members.reduce((s, p) => s + p.xy[1] * p.w, 0) / weight];
    const corners = cells.flatMap((k) => {
      const [x, y] = k.split(',').map(Number);
      return [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]].map(([a, b]) => [a * R.cellM, b * R.cellM] as XY);
    });
    pockets.push({
      name: '', weight, spanM, centre: toLL(centre), hull: hull(corners).map(toLL), strips: [],
      members: new Set(members), cells: cells.map((k) => {
        const [x, y] = k.split(',').map(Number);
        return [(x + 0.5) * R.cellM, (y + 0.5) * R.cellM] as XY;
      }),
    });
  }
  pockets.sort((a, b) => b.weight - a.weight);
  // A strip belongs to the pocket holding most of its places; a pocket is named by its heaviest strip.
  for (const s of strips) {
    let best: (typeof pockets)[number] | null = null;
    let bestN = 0;
    for (const p of pockets) {
      const n = [...s.members].filter((m) => p.members.has(m)).length;
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

  const onNamed = (p: XY): { at: LngLat; street: string | null } => {
    let best: { q: XY; d: number; name: string | null } = { q: p, d: Infinity, name: null };
    for (const s of named)
      for (const l of s.lines) {
        const r = nearestOn(p, l);
        if (r.d < best.d) best = { ...r, name: s.seg.name };
      }
    return { at: toLL(best.q), street: best.name };
  };
  const cleanStrips = strips.map(({ members: _m, ...s }) => s);
  const cleanPockets = pockets.map(({ members: _m, cells: _c, strips: ps, ...p }) => ({
    ...p,
    strips: ps.map((s) => {
      const { members: _x, ...rest } = s as Strip & { members?: unknown };
      return rest;
    }),
  }));

  if (pockets.length) {
    const top = pockets[0];
    // A station by the pocket first; else the heaviest strip's busiest point; else the densest cell (L7).
    let station: XY | null = null;
    let stationD: number = R.transitM;
    for (const t of o.transit) {
      const xy = toXY(t);
      const d = Math.min(...[...top.members].map((m) => Math.hypot(m.xy[0] - xy[0], m.xy[1] - xy[1])));
      if (d <= stationD) [station, stationD] = [xy, d];
    }
    let landing: Landing;
    if (station) landing = { ...onNamed(station), via: 'transit' };
    else if (top.strips[0]) landing = { ...onNamed(toXY(top.strips[0].peak)), via: 'strip' };
    else {
      let densest = top.cells[0];
      let densestW = -1;
      for (const c of top.cells) {
        const w = kernel.near(c, R.kernelM).reduce((s, e) => s + e.v.w, 0);
        if (w > densestW) [densest, densestW] = [c, w];
      }
      landing = { ...onNamed(densest), via: 'cell' };
    }
    return { basis: 'density', reason: 'Busiest area', pockets: cleanPockets, strips: cleanStrips, landing };
  }

  // Fallbacks, only with nothing dense (L6).
  const nearestTo = (list: typeof named) => {
    let best: { q: XY; d: number; name: string } | null = null;
    for (const s of list)
      for (const l of s.lines) {
        const r = nearestOn([0, 0], l);
        if (!best || r.d < best.d) best = { ...r, name: s.seg.name! };
      }
    return best;
  };
  // (a) the crossing of the two highest-class named streets nearest the centre.
  const ranked = [...byStreet]
    .map(([name, pieces]) => ({ name, pieces, rank: Math.max(...pieces.map((p) => rankOf(p.seg))), d: nearestTo(pieces)!.d }))
    .filter((s) => s.rank > 0 && s.d <= R.radiusM)
    .sort((a, b) => b.rank - a.rank || a.d - b.d);
  if (ranked.length >= 2) {
    const [A, B] = ranked;
    let crossing: XY | null = null;
    for (const pa of A.pieces)
      for (const la of pa.lines)
        for (const pb of B.pieces)
          for (const lb of pb.lines)
            for (const v of la) {
              const r = nearestOn(v, lb);
              if (r.d <= 15 && (!crossing || Math.hypot(r.q[0], r.q[1]) < Math.hypot(crossing[0], crossing[1]))) crossing = r.q;
            }
    if (crossing) {
      return {
        basis: 'main-roads', reason: `Main roads: ${A.name} & ${B.name}`, pockets: [], strips: [],
        landing: { at: toLL(crossing), street: A.name, via: 'fallback' },
      };
    }
  }
  // (b) a street on the main-street list.
  const listed = new Set(MAIN_STREET_NAMES.map((n) => n.toLowerCase()));
  const main = nearestTo(named.filter((s) => listed.has(s.seg.name!.replace(SUFFIX, '').trim().toLowerCase())));
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
