import { distanceM, lineLengthM, pointSegmentDist, projector, stepToward } from './geo';
import { onTileEdge, tileAt, tileRect } from './tileMath';
import type { LngLat, StreetSegment } from './types';

/**
 * Turns road features read from OpenMapTiles-schema vector tiles (what
 * OpenFreeMap serves) into street segments: pieces of street from one
 * junction (or dead end) to the next. The concept doc targets the Protomaps
 * schema; only this file knows about the tile schema.
 *
 * Segment ids must come out the same whichever tiles happened to be loaded,
 * so the same street piece is the same row on every walk:
 * - each line is clipped to its own tile, which removes the buffer overlap
 *   between neighbouring tiles, and copies are stitched back together where
 *   they meet on a tile edge;
 * - pieces are cut only at junctions (found geometrically, since tile
 *   simplification drops shared nodes), then long blocks at fixed lengths
 *   from a canonical end;
 * - a piece that runs off the edge of the loaded tiles is incomplete and is
 *   left out, to be derived whole on a walk that loads its neighbour.
 */

export interface RoadFeature {
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, unknown> | null;
  /** The zoom of the tile it came from, where the map says (maplibre-gl's `_z`). */
  zoom?: number;
}

const EXCLUDED_CLASSES = new Set([
  'motorway', 'rail', 'transit', 'ferry', 'aerialway', 'raceway', 'bus_guideway', 'busway',
]);
const EXCLUDED_SERVICE = new Set(['parking_aisle', 'driveway']);
/** A footway this short that crosses a street is a crosswalk, not a path. */
const CROSSWALK_MAX_M = 30;
const SIDEWALK_MERGE_M = 15;
/** Blocks longer than this are cut further, so one long block is not all-or-nothing. */
const MAX_PIECE_M = 200;
const NAME_MATCH_M = 8;
/** A line end this close to another way counts as meeting it (a T-junction). */
const TOUCH_M = 1.5;
/** Copies of a line from neighbouring tiles meet within this distance on the edge. */
const STITCH_M = 2;
const CELL_M = 50;
/**
 * Vector tiles carry each feature clipped to the tile plus a small buffer.
 * A line overhanging its home tile by no more than this is such a copy; one
 * reaching further came untiled and is split across every tile it crosses.
 */
const TILE_BUFFER_M = 80;

type XY = [number, number];

function lines(geometry: RoadFeature['geometry']): LngLat[][] {
  if (geometry.type === 'LineString') return [geometry.coordinates as LngLat[]];
  if (geometry.type === 'MultiLineString') return geometry.coordinates as LngLat[][];
  return [];
}

function isWalkable(props: Record<string, unknown>): boolean {
  const cls = String(props.class ?? '');
  if (EXCLUDED_CLASSES.has(cls) || cls.endsWith('_construction')) return false;
  const access = String(props.access ?? '');
  if (access === 'no' || access === 'private') return false;
  if (props.indoor === 1 || props.indoor === true) return false;
  if (props.ramp === 1 || props.ramp === true) return false;
  if (cls === 'service' && EXCLUDED_SERVICE.has(String(props.service ?? ''))) return false;
  return true;
}

const isFootway = (cls: string, sub: string) => cls === 'path' && (sub === 'footway' || sub === 'pedestrian' || sub === '');

function midpointAlong(line: LngLat[]): LngLat {
  const half = lineLengthM(line) / 2;
  let acc = 0;
  for (let i = 1; i < line.length; i++) {
    const d = distanceM(line[i - 1], line[i]);
    if (acc + d >= half) return stepToward(line[i - 1], line[i], half - acc);
    acc += d;
  }
  return line[line.length - 1];
}

/** Liang-Barsky clip of a polyline to a lon/lat rectangle; returns the inside runs. */
function clipLine(line: LngLat[], w: number, s: number, e: number, n: number): LngLat[][] {
  const out: LngLat[][] = [];
  let cur: LngLat[] = [];
  const flush = () => {
    if (cur.length > 1) out.push(cur);
    cur = [];
  };
  for (let i = 1; i < line.length; i++) {
    const [x0, y0] = line[i - 1];
    const [x1, y1] = line[i];
    const dx = x1 - x0, dy = y1 - y0;
    let t0 = 0, t1 = 1;
    let inside = true;
    for (const [p, q] of [[-dx, x0 - w], [dx, e - x0], [-dy, y0 - s], [dy, n - y0]] as const) {
      if (p === 0) {
        if (q < 0) { inside = false; break; }
      } else {
        const r = q / p;
        if (p < 0) t0 = Math.max(t0, r);
        else t1 = Math.min(t1, r);
      }
    }
    if (!inside || t0 > t1) {
      flush();
      continue;
    }
    if (t0 > 0) flush();
    if (cur.length === 0) cur.push([x0 + dx * t0, y0 + dy * t0]);
    cur.push([x0 + dx * t1, y0 + dy * t1]);
    if (t1 < 1) flush();
  }
  flush();
  return out;
}

/** The line cut to tiles: its home tile if it is a buffered tile copy, else every tile it crosses. */
function perTile(line: LngLat[]): LngLat[][] {
  const home = tileAt(midpointAlong(line));
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const [x, y] of line) {
    w = Math.min(w, x); e = Math.max(e, x);
    s = Math.min(s, y); n = Math.max(n, y);
  }
  const mLon = 111320 * Math.cos((((home.n + home.s) / 2) * Math.PI) / 180);
  const overhang = Math.max((home.w - w) * mLon, (e - home.e) * mLon, (home.s - s) * 111320, (n - home.n) * 111320);
  if (overhang <= TILE_BUFFER_M) return clipLine(line, home.w, home.s, home.e, home.n);
  const sw = tileAt([w, s]);
  const ne = tileAt([e, n]);
  const out: LngLat[][] = [];
  for (let x = sw.x; x <= ne.x; x++)
    for (let y = ne.y; y <= sw.y; y++) {
      const t = tileRect(x, y);
      out.push(...clipLine(line, t.w, t.s, t.e, t.n));
    }
  return out;
}

/** A spatial index over projected edges, in CELL_M cells. */
class EdgeGrid<T> {
  private cells = new Map<string, { a: XY; b: XY; v: T }[]>();
  add(a: XY, b: XY, v: T, pad: number) {
    const x0 = Math.floor((Math.min(a[0], b[0]) - pad) / CELL_M);
    const x1 = Math.floor((Math.max(a[0], b[0]) + pad) / CELL_M);
    const y0 = Math.floor((Math.min(a[1], b[1]) - pad) / CELL_M);
    const y1 = Math.floor((Math.max(a[1], b[1]) + pad) / CELL_M);
    for (let cx = x0; cx <= x1; cx++)
      for (let cy = y0; cy <= y1; cy++) {
        const k = `${cx},${cy}`;
        const list = this.cells.get(k);
        if (list) list.push({ a, b, v });
        else this.cells.set(k, [{ a, b, v }]);
      }
  }
  at(p: XY) {
    return this.cells.get(`${Math.floor(p[0] / CELL_M)},${Math.floor(p[1] / CELL_M)}`) ?? [];
  }
  values() {
    return this.cells.values();
  }
}

/** Evenly spaced points along a projected line, each weighted by the length it stands for. */
export function* samples(line: XY[], step: number): Generator<[XY, number]> {
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1];
    const b = line[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(len / step));
    for (let k = 0; k < n; k++) {
      const f = (k + 0.5) / n;
      yield [[a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], len / n];
    }
  }
}

interface Chain {
  cls: string;
  sub: string;
  /** Name carried on the road feature itself, when the source has one. */
  name: string | null;
  pts: LngLat[];
  /** Ends that stop at a tile edge with no neighbour loaded: the street goes on beyond. */
  partialStart: boolean;
  partialEnd: boolean;
}

const r7 = (n: number) => n.toFixed(7);
const keyOf = (p: LngLat) => `${r7(p[0])},${r7(p[1])}`;

export function deriveSegments(roads: RoadFeature[], names: RoadFeature[] = [], build = ''): StreetSegment[] {
  // 1. Walkable lines, each clipped to the tile that owns it, deduplicated.
  const seen = new Set<string>();
  const raw: Chain[] = [];
  for (const f of roads) {
    const props = f.properties ?? {};
    if (!isWalkable(props)) continue;
    const cls = String(props.class ?? 'road');
    const sub = String(props.subclass ?? '');
    const name = typeof props.name === 'string' && props.name ? props.name : null;
    for (const line of lines(f.geometry)) {
      if (line.length < 2) continue;
      for (const part of perTile(line)) {
        const k = `${cls}|${sub}|${name}|${part.map(keyOf).join(';')}`;
        if (seen.has(k)) continue;
        seen.add(k);
        raw.push({ cls, sub, name, pts: part, partialStart: false, partialEnd: false });
      }
    }
  }
  if (raw.length === 0) return [];
  const proj = projector(raw[0].pts[0]);

  // 2. Stitch copies that meet on a tile edge back into one line.
  const chains = stitch(raw, proj);

  // 3. Crosswalks: short footways crossing a street. They are not streets,
  //    and must not cut the street they cross.
  const streetGrid = new EdgeGrid<number>();
  chains.forEach((c, i) => {
    if (isFootway(c.cls, c.sub)) return;
    const pl = c.pts.map(proj);
    for (let e = 1; e < pl.length; e++) streetGrid.add(pl[e - 1], pl[e], i, TOUCH_M);
  });
  const kept = chains.filter(
    (c) => !(isFootway(c.cls, c.sub) && lineLengthM(c.pts) <= CROSSWALK_MAX_M && crossesStreet(c.pts.map(proj), streetGrid)),
  );

  // 4. Junctions, then the pieces between them. A piece at a partial end of
  //    its chain is incomplete and left out.
  const { lines: withCuts, at } = withJunctions(kept.map((c) => c.pts), proj);
  const pieces: { cls: string; sub: string; name: string | null; pts: LngLat[] }[] = [];
  kept.forEach((c, i) => {
    const parts = cutAt(withCuts[i], at);
    parts.forEach((pts, j) => {
      if ((j === 0 && c.partialStart) || (j === parts.length - 1 && c.partialEnd)) return;
      for (const chunk of chunkCanonical(pts)) pieces.push({ cls: c.cls, sub: c.sub, name: c.name, pts: chunk });
    });
  });

  // 5. Sidewalks running alongside a street merge into it: walking either
  //    credits the street through the snapper's buffer.
  const streetEdges = new EdgeGrid<number>();
  pieces.forEach((p, i) => {
    if (isFootway(p.cls, p.sub)) return;
    const pl = p.pts.map(proj);
    for (let e = 1; e < pl.length; e++) streetEdges.add(pl[e - 1], pl[e], i, SIDEWALK_MERGE_M);
  });
  const nearStreet = (q: XY) => streetEdges.at(q).some((x) => pointSegmentDist(q, x.a, x.b) <= SIDEWALK_MERGE_M);
  const finalPieces = pieces.filter((p) => {
    if (!isFootway(p.cls, p.sub)) return true;
    for (const [q] of samples(p.pts.map(proj), 5)) if (!nearStreet(q)) return true;
    return false;
  });

  // 6. Names come from the name layer: the best-aligned name line nearby.
  const nameGrid = new EdgeGrid<string>();
  for (const f of names) {
    const name = f.properties?.name;
    if (typeof name !== 'string' || !name) continue;
    for (const line of lines(f.geometry)) {
      const pl = line.map(proj);
      for (let e = 1; e < pl.length; e++) nameGrid.add(pl[e - 1], pl[e], name, NAME_MATCH_M);
    }
  }

  const out = new Map<string, StreetSegment>();
  for (const p of finalPieces) {
    const id = pieceId(p.cls, p.pts);
    if (out.has(id)) continue;
    out.set(id, {
      id,
      name: p.name ?? bestName(p.pts.map(proj), nameGrid),
      kind_detail: p.sub ? `${p.cls}/${p.sub}` : p.cls,
      length_m: lineLengthM(p.pts),
      geometry: [p.pts],
      build,
    });
  }
  return [...out.values()];
}

/** Joins lines whose ends meet on a tile edge, and marks ends that meet nothing there. */
function stitch(raw: Chain[], proj: (p: LngLat) => XY): Chain[] {
  type End = { i: number; start: boolean; xy: XY };
  const ends = new Map<string, End>(); // `${i}:${start}`
  const bucket = new Map<string, End[]>();
  const cell = (v: number) => Math.round(v / STITCH_M);
  raw.forEach((c, i) => {
    for (const start of [true, false]) {
      const p = start ? c.pts[0] : c.pts[c.pts.length - 1];
      if (!onTileEdge(p)) continue;
      const end: End = { i, start, xy: proj(p) };
      ends.set(`${i}:${start}`, end);
      const k = `${cell(end.xy[0])},${cell(end.xy[1])}`;
      (bucket.get(k) ?? bucket.set(k, []).get(k)!).push(end);
    }
  });

  const partner = new Map<End, End>();
  for (const e of ends.values()) {
    if (partner.has(e)) continue;
    let best: End | null = null;
    let bestD = STITCH_M;
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (const o of bucket.get(`${cell(e.xy[0]) + dx},${cell(e.xy[1]) + dy}`) ?? []) {
          if (o.i === e.i || partner.has(o)) continue;
          if (raw[o.i].cls !== raw[e.i].cls || raw[o.i].sub !== raw[e.i].sub || raw[o.i].name !== raw[e.i].name) continue;
          const d = Math.hypot(o.xy[0] - e.xy[0], o.xy[1] - e.xy[1]);
          if (d <= bestD) { best = o; bestD = d; }
        }
    if (best) {
      partner.set(e, best);
      partner.set(best, e);
    }
  }
  const next = (i: number, start: boolean) => {
    const e = ends.get(`${i}:${start}`);
    return e ? partner.get(e) ?? null : null;
  };
  const isPartial = (i: number, start: boolean) => {
    const e = ends.get(`${i}:${start}`);
    return !!e && !partner.has(e);
  };

  const used = new Set<number>();
  const out: Chain[] = [];
  raw.forEach((c, i) => {
    if (used.has(i)) return;
    // Walk back to one end of the chain, then collect it forwards.
    let cur = i;
    let atStart = true; // the end of `cur` we walk out through
    const back = new Set([i]);
    for (;;) {
      const nx = next(cur, atStart);
      if (!nx || back.has(nx.i)) break;
      back.add(nx.i);
      cur = nx.i;
      atStart = !nx.start;
    }
    // `cur` entered through its `!atStart` end; the chain starts at its `atStart` end.
    let enterStart = atStart;
    const partialStart = isPartial(cur, enterStart);
    const pts: LngLat[] = [];
    let partialEnd = false;
    for (;;) {
      used.add(cur);
      const seg = enterStart ? raw[cur].pts : [...raw[cur].pts].reverse();
      pts.push(...(pts.length ? seg.slice(1) : seg));
      const exitStart = !enterStart;
      const nx = next(cur, exitStart);
      if (!nx) {
        partialEnd = isPartial(cur, exitStart);
        break;
      }
      if (used.has(nx.i)) break; // closed loop
      cur = nx.i;
      enterStart = nx.start;
    }
    out.push({ cls: c.cls, sub: c.sub, name: c.name, pts, partialStart, partialEnd });
  });
  return out;
}

function crossesStreet(pl: XY[], grid: EdgeGrid<number>): boolean {
  for (let i = 1; i < pl.length; i++)
    for (const q of [pl[i - 1], pl[i]])
      for (const x of grid.at(q)) if (segmentsCross(pl[i - 1], pl[i], x.a, x.b)) return true;
  return false;
}

function segmentsCross(p0: XY, p1: XY, q0: XY, q1: XY): boolean {
  const rx = p1[0] - p0[0], ry = p1[1] - p0[1];
  const sx = q1[0] - q0[0], sy = q1[1] - q0[1];
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-9) return false;
  const t = ((q0[0] - p0[0]) * sy - (q0[1] - p0[1]) * sx) / den;
  const u = ((q0[0] - p0[0]) * ry - (q0[1] - p0[1]) * rx) / den;
  return t > 0 && t < 1 && u > 0 && u < 1;
}

/**
 * Finds where lines cross or meet, including different lines of one
 * MultiLineString and a line crossing itself, and inserts a vertex there.
 * Returns the lines with those vertices added and the set of junction keys.
 */
function withJunctions(input: LngLat[][], proj: (p: LngLat) => XY): { lines: LngLat[][]; at: Set<string> } {
  const at = new Set<string>();
  if (input.length === 0) return { lines: [], at };
  const projected = input.map((line) => line.map(proj));
  type Edge = { l: number; e: number; a: XY; b: XY };
  const grid = new EdgeGrid<Edge>();
  projected.forEach((line, l) => {
    for (let e = 1; e < line.length; e++) {
      const edge: Edge = { l, e: e - 1, a: line[e - 1], b: line[e] };
      grid.add(edge.a, edge.b, edge, TOUCH_M);
    }
  });

  const splits = new Map<string, number[]>();
  const addSplit = (edge: Edge, t: number) => {
    const k = `${edge.l}/${edge.e}`;
    (splits.get(k) ?? splits.set(k, []).get(k)!).push(t);
  };
  const isLineEnd = (edge: Edge, which: 'a' | 'b') =>
    which === 'a' ? edge.e === 0 : edge.e + 1 === projected[edge.l].length - 1;
  const projectOnto = (p: XY, edge: Edge) => {
    const dx = edge.b[0] - edge.a[0];
    const dy = edge.b[1] - edge.a[1];
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - edge.a[0]) * dx + (p[1] - edge.a[1]) * dy) / len2));
    return { t, d: Math.hypot(p[0] - (edge.a[0] + t * dx), p[1] - (edge.a[1] + t * dy)) };
  };

  const pairs = new Set<string>();
  for (const list of grid.values()) {
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const p = list[i].v;
        const q = list[j].v;
        // Edges next to each other on one line share a vertex by construction.
        if (p.l === q.l && Math.abs(p.e - q.e) <= 1) continue;
        const pairKey = p.l < q.l || (p.l === q.l && p.e < q.e) ? `${p.l}/${p.e}|${q.l}/${q.e}` : `${q.l}/${q.e}|${p.l}/${p.e}`;
        if (pairs.has(pairKey)) continue;
        pairs.add(pairKey);
        const rx = p.b[0] - p.a[0], ry = p.b[1] - p.a[1];
        const sx = q.b[0] - q.a[0], sy = q.b[1] - q.a[1];
        const den = rx * sy - ry * sx;
        if (Math.abs(den) > 1e-9) {
          const t = ((q.a[0] - p.a[0]) * sy - (q.a[1] - p.a[1]) * sx) / den;
          const u = ((q.a[0] - p.a[0]) * ry - (q.a[1] - p.a[1]) * rx) / den;
          if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            addSplit(p, t);
            addSplit(q, u);
            continue;
          }
        }
        // A way ending on (or just short of) another: a T-junction.
        for (const [end, other] of [[p, q], [q, p]] as const) {
          for (const which of ['a', 'b'] as const) {
            if (!isLineEnd(end, which)) continue;
            const hit = projectOnto(end[which], other);
            if (hit.d <= TOUCH_M) {
              addSplit(other, hit.t);
              addSplit(end, which === 'a' ? 0 : 1);
            }
          }
        }
      }
  }

  // Inverse of the local projection, which is linear: measured once.
  const o = input[0][0];
  const kx = proj([o[0] + 1e-5, o[1]])[0] / 1e-5;
  const ky = proj([o[0], o[1] + 1e-5])[1] / 1e-5;
  const p0 = proj(o);
  const unproj = (q: XY): LngLat => [o[0] + (q[0] - p0[0]) / kx, o[1] + (q[1] - p0[1]) / ky];

  const EPS = 1e-6;
  const lines = input.map((line, l) => {
    const pl = projected[l];
    const out: LngLat[] = [line[0]];
    for (let e = 0; e < pl.length - 1; e++) {
      const ts = (splits.get(`${l}/${e}`) ?? []).sort((x, y) => x - y);
      let last = -1;
      for (const t of ts) {
        if (t <= EPS) at.add(keyOf(line[e]));
        else if (t >= 1 - EPS) at.add(keyOf(line[e + 1]));
        else if (t - last > 1e-4) {
          const a = pl[e], b = pl[e + 1];
          const v = unproj([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
          out.push(v);
          at.add(keyOf(v));
          last = t;
        }
      }
      out.push(line[e + 1]);
    }
    return out;
  });
  return { lines, at };
}

function cutAt(line: LngLat[], at: Set<string>): LngLat[][] {
  const out: LngLat[][] = [];
  let cur: LngLat[] = [line[0]];
  for (let i = 1; i < line.length; i++) {
    cur.push(line[i]);
    if (i < line.length - 1 && at.has(keyOf(line[i]))) {
      out.push(cur);
      cur = [line[i]];
    }
  }
  if (cur.length > 1) out.push(cur);
  return out;
}

/** Cuts long blocks into MAX_PIECE_M pieces, always measured from the same end. */
function chunkCanonical(line: LngLat[]): LngLat[][] {
  const a = line[0];
  const b = line[line.length - 1];
  const forward = a[0] < b[0] || (a[0] === b[0] && a[1] <= b[1]);
  const pts = forward ? line : [...line].reverse();
  const out: LngLat[][] = [];
  let cur: LngLat[] = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    let p = cur[cur.length - 1];
    const q = pts[i];
    let d = distanceM(p, q);
    while (acc + d > MAX_PIECE_M) {
      const cut = stepToward(p, q, MAX_PIECE_M - acc);
      cur.push(cut);
      out.push(cur);
      cur = [cut];
      acc = 0;
      p = cut;
      d = distanceM(p, q);
    }
    cur.push(q);
    acc += d;
  }
  if (cur.length > 1) out.push(cur);
  return out;
}

const r6 = (n: number) => n.toFixed(6);
/** Endpoints plus the midpoint: two different pieces between the same two junctions stay distinct. */
function pieceId(cls: string, line: LngLat[]): string {
  const m = midpointAlong(line);
  const z = line[line.length - 1];
  return `${cls}:${r6(line[0][0])},${r6(line[0][1])}:${r6(m[0])},${r6(m[1])}:${r6(z[0])},${r6(z[1])}`;
}

/** The name line running closest to and most parallel with the piece, within NAME_MATCH_M. */
function bestName(pl: XY[], grid: EdgeGrid<string>): string | null {
  const score = new Map<string, { d: number; n: number }>();
  let total = 0;
  for (let i = 1; i < pl.length; i++) {
    const dir = [pl[i][0] - pl[i - 1][0], pl[i][1] - pl[i - 1][1]];
    const len = Math.hypot(dir[0], dir[1]) || 1;
    for (const [q] of samples([pl[i - 1], pl[i]], 5)) {
      total++;
      const best = new Map<string, number>();
      for (const x of grid.at(q)) {
        const ex = [x.b[0] - x.a[0], x.b[1] - x.a[1]];
        const cos = Math.abs(dir[0] * ex[0] + dir[1] * ex[1]) / (len * (Math.hypot(ex[0], ex[1]) || 1));
        if (cos < 0.8) continue; // a cross street, not this one
        const d = pointSegmentDist(q, x.a, x.b);
        if (d <= NAME_MATCH_M && d < (best.get(x.v) ?? Infinity)) best.set(x.v, d);
      }
      for (const [name, d] of best) {
        const s = score.get(name) ?? { d: 0, n: 0 };
        s.d += d;
        s.n++;
        score.set(name, s);
      }
    }
  }
  let pick: string | null = null;
  let pickScore = -Infinity;
  for (const [name, s] of score) {
    if (s.n < total / 2) continue; // must run alongside most of the piece
    const v = s.n - s.d / NAME_MATCH_M;
    if (v > pickScore) { pick = name; pickScore = v; }
  }
  return pick;
}

/** A street is counted by name; unnamed pieces each count on their own. */
export function streetKey(s: Pick<StreetSegment, 'id' | 'name'>): string {
  return s.name ? `name:${s.name}` : s.id;
}
