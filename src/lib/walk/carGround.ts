// @layer core
import { projector } from '../geo';
import type { LngLat } from '../types';
import { WALK_CODE } from './bands';
import type { Cell } from './cells';

/*
 * What the Walkability layer draws (G5, decision 0232): only the ground built around cars, its neighbouring cells as one
 * area with rounded edges. The cells stay the reading; this is only their drawing, computed from them each time and never
 * stored. The car cells are sampled on a fixed lattice, smoothed with a Gaussian that ignores ground nobody read, and
 * outlined at half (marching squares). The lattice is global, so a point's shape depends only on the cells around it,
 * never on where the read was centred. The outline is drawn only where car ground meets ground that was read; toward the
 * read's own edge the hatch fades out over GROUND_FADE_M, in steps, never a straight cut. Pure.
 */

/** The lattice's step, north to south, in metres; east to west it is the same in degrees, so finer away from the equator. */
export const GROUND_STEP_M = 25;
/** How far the rounding reaches: a corner rounds over about this, and a stair of cells evens out into one slope. */
export const GROUND_SIGMA_M = 90;
const REACH = 3;
const LEVEL = 0.5;
const M_PER_DEG_LAT = 110_540;
const M_PER_DEG_LON = 111_320;
const dLat = GROUND_STEP_M / M_PER_DEG_LAT;
const dLon = GROUND_STEP_M / M_PER_DEG_LON;

/** The hatch fades out over this much toward the edge of what was read (the owner, Nov 27: "Fade over ~100 m"). */
export const GROUND_FADE_M = 100;
/** In this many steps, the faintest nearest the read's edge. */
export const GROUND_FADE_STEPS = 5;

export interface CarPiece<T> {
  /**
   * Areas: the car ground at least (GROUND_FADE_STEPS - fade) steps in from the read's edge, so the pieces nest: `fade`
   * GROUND_FADE_STEPS is all of it, 0 only what lies GROUND_FADE_M or more in. A map draws each faintly, one over
   * another (`walkFadeArea`), so the hatch builds up step by step from the read's edge to its whole strength, and two
   * steps never leave a gap between them. Edges: 0 whole, 1 to GROUND_FADE_STEPS fainter toward the read's edge.
   */
  fade: number;
  shape: T;
}

export interface CarGround {
  /** Polygons, each its outer ring then its holes; rings closed, [lon, lat]. The pieces do not overlap. */
  areas: CarPiece<LngLat[][]>[];
  /** The firm edge: where car ground meets ground that was read; never along the edge of the read itself. */
  edges: CarPiece<LngLat[]>[];
  /** Changes only when the picture does, so a map sends its data again only then. */
  key: string;
}

const NONE: CarGround = { areas: [], edges: [], key: `${WALK_CODE}|g|0` };

/** Car ground as areas and edges, from the judged cells (car cells drawn; every judged cell is ground that was read). */
export function carGroundOf(cells: readonly Cell[]): CarGround {
  const car = cells.filter((c) => c.band === 'car');
  if (!car.length) return NONE;
  let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const c of car) [w, s, e, n] = [Math.min(w, c.west), Math.min(s, c.south), Math.max(e, c.east), Math.max(n, c.north)];
  const margin = GROUND_SIGMA_M * REACH + 2 * GROUND_STEP_M;
  const maxCos = Math.cos((Math.max(Math.abs(s), Math.abs(n)) * Math.PI) / 180);
  const r0 = Math.floor((s - margin / M_PER_DEG_LAT) / dLat);
  const r1 = Math.ceil((n + margin / M_PER_DEG_LAT) / dLat);
  const q0 = Math.floor((w - margin / (M_PER_DEG_LON * maxCos)) / dLon);
  const q1 = Math.ceil((e + margin / (M_PER_DEG_LON * maxCos)) / dLon);
  const R = r1 - r0 + 1;
  const Q = q1 - q0 + 1;
  // What each lattice point lies in: 0 nothing read, 1 read ground, 2 car ground.
  const at = new Uint8Array(R * Q);
  let sum = 0;
  for (const c of cells) {
    const ra = Math.max(r0, Math.ceil(c.south / dLat - 1e-9));
    const rb = Math.min(r1, Math.ceil(c.north / dLat - 1e-9) - 1);
    const qa = Math.max(q0, Math.ceil(c.west / dLon - 1e-9));
    const qb = Math.min(q1, Math.ceil(c.east / dLon - 1e-9) - 1);
    if (ra > rb || qa > qb) continue;
    const v = c.band === 'car' ? 2 : 1;
    if (v === 2) sum = (sum + c.i * 31 + c.j * 17) % 1_000_000_007;
    else sum = (sum + c.i * 7 + c.j * 3 + 1) % 1_000_000_007;
    for (let r = ra; r <= rb; r++) for (let q = qa; q <= qb; q++) at[(r - r0) * Q + (q - q0)] = v;
  }
  const cosOf = (r: number) => Math.cos((((r + r0) * dLat) * Math.PI) / 180);
  // Smooth the car share among read ground, row by row (each row's own east-west scale), then column by column.
  const kv = kernel(GROUND_SIGMA_M / GROUND_STEP_M);
  const hc = new Float64Array(R * Q);
  const hk = new Float64Array(R * Q);
  for (let r = 0; r < R; r++) {
    const kh = kernel(GROUND_SIGMA_M / (GROUND_STEP_M * cosOf(r)));
    const h = (kh.length - 1) / 2;
    for (let q = 0; q < Q; q++) {
      let a = 0;
      let b = 0;
      for (let k = -h; k <= h; k++) {
        const qq = q + k;
        if (qq < 0 || qq >= Q) continue;
        const v = at[r * Q + qq];
        if (!v) continue;
        const wgt = kh[k + h];
        b += wgt;
        if (v === 2) a += wgt;
      }
      hc[r * Q + q] = a;
      hk[r * Q + q] = b;
    }
  }
  const hv = (kv.length - 1) / 2;
  const val = new Float64Array(R * Q);
  for (let r = 0; r < R; r++) {
    for (let q = 0; q < Q; q++) {
      // Ground nobody read takes the share of the read ground around it; the hatch is cut at the read's edge by distance.
      let a = 0;
      let b = 0;
      for (let k = -hv; k <= hv; k++) {
        const rr = r + k;
        if (rr < 0 || rr >= R) continue;
        a += kv[k + hv] * hc[rr * Q + q];
        b += kv[k + hv] * hk[rr * Q + q];
      }
      val[r * Q + q] = b > 0 ? a / b : 0;
    }
  }
  // How far each lattice point is from ground nobody read, in metres (a chamfer distance, two passes): the hatch fades
  // out over the last GROUND_FADE_M toward it, never a straight cut (decision 0232: never a missing tile).
  const dist = unreadDistance(at, R, Q, cosOf);
  const step = GROUND_FADE_M / GROUND_FADE_STEPS;
  const fadeOf = (d: number) => (d >= GROUND_FADE_M ? 0 : GROUND_FADE_STEPS - Math.floor(d / step));
  // The share above or below a half, in "metres" a thousand to the unit: where it crosses zero is where the share does,
  // and inside the car ground it is never less than the distance it is cut with, so a step's edge lies where its distance
  // says (walkability-car-ground audit 7).
  const V = (r: number, q: number) => (r < 0 || q < 0 || r >= R || q >= Q ? -1000 : (val[r * Q + q] - LEVEL) * 1000);
  const D = (r: number, q: number) => (r < 0 || q < 0 || r >= R || q >= Q ? Infinity : dist[r * Q + q]);
  const known = (r: number, q: number) => r >= 0 && q >= 0 && r < R && q < Q && at[r * Q + q] > 0;
  const toLngLat = (p: [number, number]): LngLat => [(p[1] + q0) * dLon, (p[0] + r0) * dLat];
  // The areas: nested, one a step, each the car ground at least its step in from the read's edge. Each is cut by one
  // distance alone, which the lattice interpolates exactly, so the steps are evenly spaced and meet with no gap (two
  // bands cut by a lower and an upper distance each lost a few metres a step: walkability-car-ground audit 7).
  const areas: CarPiece<LngLat[][]>[] = [];
  for (let f = 0; f <= GROUND_FADE_STEPS; f++) {
    const lo = (GROUND_FADE_STEPS - f) * step;
    const field = (r: number, q: number) => clamp(Math.min(V(r, q), D(r, q) - lo));
    for (const shape of polygons(contours(field, known, D, R, Q).map((c) => c.pts.map(toLngLat)))) areas.push({ fade: f, shape });
  }
  // The edge: the outline of the car ground alone, in the runs whose ends lie between read ground (criterion 4), each run
  // as faint as the ground it borders.
  const edges: CarPiece<LngLat[]>[] = [];
  for (const { pts, read, d } of contours((r, q) => clamp(V(r, q)), known, D, R, Q)) {
    const m = pts.length;
    const ring = pts.map(toLngLat);
    // A segment k runs from vertex k to k + 1; its fade is its middle's.
    const segFade = (k: number) => (read[k] && read[(k + 1) % m] ? fadeOf((d[k] + d[(k + 1) % m]) / 2) : -1);
    const first = [...Array(m).keys()].find((k) => segFade(k) !== segFade((k - 1 + m) % m));
    if (first === undefined) {
      if (segFade(0) >= 0) edges.push({ fade: segFade(0), shape: [...ring, ring[0]] });
      continue;
    }
    let run: LngLat[] = [ring[first]];
    let cur = segFade(first);
    for (let j = 0; j < m; j++) {
      const k = (first + j) % m;
      const fk = segFade(k);
      if (fk !== cur) {
        if (cur >= 0 && run.length >= 2) edges.push({ fade: cur, shape: run });
        run = [ring[k]];
        cur = fk;
      }
      run.push(ring[(k + 1) % m]);
    }
    if (cur >= 0 && run.length >= 2) edges.push({ fade: cur, shape: run });
  }
  return { areas, edges, key: `${WALK_CODE}|g|${car.length}|${sum}` };
}

/**
 * G5, criterion 6: the parts of the route's lines that lie inside the drawn car ground (any of its fade steps), so the
 * route's casing begins and ends where the hatch does, within a metre. Lines are walked in steps of 5 m; a crossing is
 * found between the two steps either side of it.
 */
export function insideCarGround(lines: readonly (readonly LngLat[])[], g: CarGround | null): LngLat[][] {
  if (!g || !g.areas.length || !lines.length) return [];
  const polys = g.areas.map((a) => a.shape);
  const box = polys.map((rings) => {
    let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const [x, y] of rings[0]) [w, s, e, n] = [Math.min(w, x), Math.min(s, y), Math.max(e, x), Math.max(n, y)];
    return [w, s, e, n];
  });
  const isIn = (p: LngLat) => polys.some((rings, k) => {
    const [w, s, e, n] = box[k];
    if (p[0] < w || p[0] > e || p[1] < s || p[1] > n || !inside(p, rings[0])) return false;
    return !rings.slice(1).some((h) => inside(p, h));
  });
  const out: LngLat[][] = [];
  for (const line of lines) {
    if (line.length < 2) continue;
    const project = projector(line[0]);
    let run: LngLat[] | null = null;
    let prev: { p: LngLat; in: boolean } | null = null;
    const lerp = (a: LngLat, b: LngLat, t: number): LngLat => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const edge = (a: LngLat, b: LngLat, aIn: boolean): LngLat => {
      let [lo, hi] = [0, 1];
      for (let k = 0; k < 12; k++) {
        const mid = (lo + hi) / 2;
        if (isIn(lerp(a, b, mid)) === aIn) lo = mid;
        else hi = mid;
      }
      return lerp(a, b, (lo + hi) / 2);
    };
    const visit = (p: LngLat, corner: boolean) => {
      const now = isIn(p);
      if (prev && now !== prev.in) {
        const x = edge(prev.p, p, prev.in);
        if (now) run = [x];
        else if (run) {
          run.push(x);
          if (run.length >= 2) out.push(run);
          run = null;
        }
      } else if (!prev && now) run = [p];
      if (now && run && (corner || !prev || now !== prev.in)) {
        if (run[run.length - 1] !== p) run.push(p);
      }
      prev = { p, in: now };
    };
    for (let i = 0; i < line.length; i++) {
      if (i > 0) {
        const [a, b] = [line[i - 1], line[i]];
        const [pa, pb] = [project(a), project(b)];
        const n = Math.max(1, Math.ceil(Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) / 5));
        for (let k = 1; k < n; k++) visit(lerp(a, b, k / n), false);
      }
      visit(line[i], true);
    }
    if (run && (run as LngLat[]).length >= 2) out.push(run);
  }
  return out;
}

/** Keeps a field finite (a distance with no unread ground in reach is Infinity), so a crossing is always interpolated. */
const clamp = (x: number) => Math.max(-1e6, Math.min(1e6, x));

/** Closed rings, traced with the inside on the right, as GeoJSON polygons: each outer ring with the holes inside it. */
function polygons(rings: LngLat[][]): LngLat[][][] {
  const outers: { ring: LngLat[]; area: number; holes: LngLat[][] }[] = [];
  const holes: LngLat[][] = [];
  for (const pts of rings) {
    // Clockwise outer rings and counter-clockwise holes come out; GeoJSON wants the reverse (RFC 7946, 3.1.6).
    const ring = [...pts].reverse();
    ring.push(ring[0]);
    const area = signedArea(ring);
    if (area > 0) outers.push({ ring, area, holes: [] });
    else holes.push(ring);
  }
  for (const h of holes) {
    let best: (typeof outers)[number] | null = null;
    for (const o of outers) if (inside(h[0], o.ring) && (!best || o.area < best.area)) best = o;
    best?.holes.push(h);
  }
  return outers.map((o) => [o.ring, ...o.holes]);
}

/** Metres from each lattice point to the edge of what was read, below zero outside it (Infinity with none in the lattice); two chamfer passes. */
function unreadDistance(at: Uint8Array, R: number, Q: number, cosOf: (r: number) => number): Float64Array {
  const d = new Float64Array(R * Q);
  for (let i = 0; i < R * Q; i++) d[i] = at[i] ? Infinity : 0;
  const ns = GROUND_STEP_M;
  const pass = (rows: number[], cols: number[], back: 1 | -1) => {
    for (const r of rows) {
      const ew = GROUND_STEP_M * cosOf(r);
      const dg = Math.hypot(ns, ew);
      for (const q of cols) {
        const i = r * Q + q;
        let v = d[i];
        const rr = r - back;
        const qq = q - back;
        if (qq >= 0 && qq < Q) v = Math.min(v, d[r * Q + qq] + ew);
        if (rr >= 0 && rr < R) {
          v = Math.min(v, d[rr * Q + q] + ns);
          if (q - 1 >= 0) v = Math.min(v, d[rr * Q + q - 1] + dg);
          if (q + 1 < Q) v = Math.min(v, d[rr * Q + q + 1] + dg);
        }
        d[i] = v;
      }
    }
  };
  const rows = [...Array(R).keys()];
  const cols = [...Array(Q).keys()];
  pass(rows, cols, 1);
  pass([...rows].reverse(), [...cols].reverse(), -1);
  // The read's edge lies halfway between the last point read and the first not: measure from there, outside below zero.
  for (let i = 0; i < R * Q; i++) d[i] = at[i] ? d[i] - GROUND_STEP_M / 2 : -GROUND_STEP_M / 2;
  return d;
}

function kernel(sigmaSteps: number): Float64Array {
  const h = Math.ceil(sigmaSteps * REACH);
  const k = new Float64Array(2 * h + 1);
  for (let i = -h; i <= h; i++) k[i + h] = Math.exp(-(i * i) / (2 * sigmaSteps * sigmaSteps));
  return k;
}

/**
 * The outlines where `field` crosses zero, inside (zero or more) on the right, as rings of lattice positions [row, column];
 * each vertex says whether both lattice points it lies between were read, and its distance from ground nobody read.
 * Rings start at their smallest crossing, so the same field gives the same rings.
 */
function contours(
  field: (r: number, q: number) => number,
  known: (r: number, q: number) => boolean,
  dist: (r: number, q: number) => number,
  R: number,
  Q: number,
): { pts: [number, number][]; read: boolean[]; d: number[] }[] {
  const v = field;
  // A crossing is on a lattice edge: 'h' between (r, q) and (r, q + 1), 'v' between (r, q) and (r + 1, q).
  const id = (t: 'h' | 'v', r: number, q: number) => (t === 'h' ? 2 : 1) + 4 * (q + 1 + (Q + 2) * (r + 1));
  const next = new Map<number, number>();
  const pos = new Map<number, { p: [number, number]; read: boolean; d: number }>();
  const put = (t: 'h' | 'v', r: number, q: number) => {
    const k = id(t, r, q);
    if (!pos.has(k)) {
      const [ra, qa, rb, qb] = t === 'h' ? [r, q, r, q + 1] : [r, q, r + 1, q];
      const a = v(ra, qa);
      const b = v(rb, qb);
      const f = a === b || !Number.isFinite(a - b) ? 0.5 : -a / (b - a);
      const [da, db] = [dist(ra, qa), dist(rb, qb)];
      const d = Number.isFinite(da) && Number.isFinite(db) ? da + (db - da) * f : Math.min(da, db);
      pos.set(k, { p: [ra + (rb - ra) * f, qa + (qb - qa) * f], read: known(ra, qa) && known(rb, qb), d });
    }
    return k;
  };
  for (let r = -1; r < R; r++) {
    for (let q = -1; q < Q; q++) {
      // Corners: a (r, q), b (r, q + 1), c (r + 1, q + 1), d (r + 1, q); rows run north, columns east.
      const A = v(r, q) >= 0 ? 1 : 0;
      const B = v(r, q + 1) >= 0 ? 1 : 0;
      const C = v(r + 1, q + 1) >= 0 ? 1 : 0;
      const D = v(r + 1, q) >= 0 ? 1 : 0;
      const code = A | (B << 1) | (C << 2) | (D << 3);
      if (code === 0 || code === 15) continue;
      const S = () => put('h', r, q);
      const E = () => put('v', r, q + 1);
      const N = () => put('h', r + 1, q);
      const W = () => put('v', r, q);
      const link = (from: number, to: number) => next.set(from, to);
      // Inside on the right, walking with rows up and columns right (clockwise around what is inside).
      switch (code) {
        case 1: link(W(), S()); break;
        case 2: link(S(), E()); break;
        case 3: link(W(), E()); break;
        case 4: link(E(), N()); break;
        case 6: link(S(), N()); break;
        case 7: link(W(), N()); break;
        case 8: link(N(), W()); break;
        case 9: link(N(), S()); break;
        case 11: link(N(), E()); break;
        case 12: link(E(), W()); break;
        case 13: link(E(), S()); break;
        case 14: link(S(), W()); break;
        case 5:
        case 10: {
          const mid = (Math.max(-9, Math.min(9, v(r, q))) + Math.max(-9, Math.min(9, v(r, q + 1))) + Math.max(-9, Math.min(9, v(r + 1, q + 1))) + Math.max(-9, Math.min(9, v(r + 1, q)))) / 4 >= 0;
          if (code === 5) {
            if (mid) { link(W(), N()); link(E(), S()); } else { link(W(), S()); link(E(), N()); }
          } else if (mid) { link(S(), W()); link(N(), E()); } else { link(S(), E()); link(N(), W()); }
          break;
        }
      }
    }
  }
  const out: { pts: [number, number][]; read: boolean[]; d: number[] }[] = [];
  const seen = new Set<number>();
  for (const k of [...next.keys()].sort((a, b) => a - b)) {
    if (seen.has(k)) continue;
    const pts: [number, number][] = [];
    const read: boolean[] = [];
    const d: number[] = [];
    let at2: number | undefined = k;
    while (at2 !== undefined && !seen.has(at2)) {
      seen.add(at2);
      const p = pos.get(at2)!;
      pts.push(p.p);
      read.push(p.read);
      d.push(p.d);
      at2 = next.get(at2);
    }
    if (pts.length >= 3) out.push({ pts, read, d });
  }
  return out;
}

function signedArea(ring: readonly LngLat[]): number {
  let a = 0;
  for (let i = 1; i < ring.length; i++) a += ring[i - 1][0] * ring[i][1] - ring[i][0] * ring[i - 1][1];
  return a / 2;
}

function inside(p: LngLat, ring: readonly LngLat[]): boolean {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
