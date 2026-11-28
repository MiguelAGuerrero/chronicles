// @layer core
import { projector } from '../geo';
import { metersPerPixel } from '../pins';
import type { LngLat } from '../types';
import { WALK_CODE } from './bands';
import type { Cell } from './cells';

/*
 * What the Walkability layer draws (G5, decision 0232): only the ground built around cars, its neighbouring cells as one
 * area with rounded edges. The cells stay the reading; this is only their drawing, computed from them each time and never
 * stored. The car cells are sampled on a fixed lattice, smoothed with a Gaussian that ignores ground nobody read, and
 * outlined at half (marching squares). The lattice is global, so a point's shape depends only on the cells around it,
 * never on where the read was centred. The outline is drawn only where car ground meets ground that was read; toward the
 * read's own edge the hatch fades out over GROUND_FADE_M, in steps that never overlap, never a straight cut. Pure.
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
/**
 * In this many steps, the faintest nearest the read's edge: each 50 m, two lattice steps, so each is cut from the next
 * exactly where its distance says (a step narrower than the lattice came out as slivers: walkability-car-ground audit 10).
 */
export const GROUND_FADE_STEPS = 2;

export interface CarPiece<T> {
  /** 0 drawn whole; 1 to GROUND_FADE_STEPS fainter toward the read's edge, the last the faintest. Pieces never overlap. */
  fade: number;
  shape: T;
}

export interface CarGround {
  /** Polygons, each its outer ring then its holes; rings closed, [lon, lat]. The pieces do not overlap. */
  areas: CarPiece<LngLat[][]>[];
  /** The firm edge: where car ground meets ground that was read; never along the edge of the read itself. */
  edges: CarPiece<LngLat[]>[];
  /**
   * The edge of what was read, as closed lines (T67): where the read ends and round a tile that could not be read, so
   * ground nobody read is told from plain ground. Set by `walkDrawingOf`, never by `carGroundOf`.
   */
  read?: LngLat[][];
  /**
   * Where the car ground's name is written (T68): in each car area larger than the screen at walking zoom, about once a
   * screen, each at least `CAR_LABEL.roomPx` from its edge (`carTextOf`). Set by `walkDrawingOf`, never by `carGroundOf`.
   */
  text?: LngLat[];
  /** Changes only when the picture does, so a map sends its data again only then. */
  key: string;
}

const NONE: CarGround = { areas: [], edges: [], key: `${WALK_CODE}|g|0` };

/**
 * FNV-1a over the cells, sorted: the same cells in any order give one key, different ones another (audit 15); without
 * their bands, over where they are only (the read's edge).
 */
function cellsKey(cells: readonly Cell[], bands = true): string {
  const ids = cells.map((c) => (bands ? `${c.i},${c.j},${c.band}` : `${c.i},${c.j}`)).sort();
  let h = 0x811c9dc5;
  for (const id of ids) {
    for (let k = 0; k < id.length; k++) {
      h ^= id.charCodeAt(k);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    h ^= 59;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/**
 * The global lattice around `focus` (the cells it must hold, `margin` metres past them), and what each of its points lies
 * in: 0 nothing read, 1 read ground, 2 car ground. Longitudes are taken next to the first focus cell, so a read across the
 * antimeridian is one stretch of ground, not the whole world (walkability-car-ground audit 12); what is drawn is put back
 * on the world's own copy (`home`).
 */
function latticeOf(cells: readonly Cell[], focus: readonly Cell[], margin: number) {
  const ref = (focus[0].west + focus[0].east) / 2;
  const shiftOf = (c: Cell) => (c.west - ref > 180 ? -360 : c.east - ref < -180 ? 360 : 0);
  let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const c of focus) {
    const sh = shiftOf(c);
    [w, s, e, n] = [Math.min(w, c.west + sh), Math.min(s, c.south), Math.max(e, c.east + sh), Math.max(n, c.north)];
  }
  const maxCos = Math.cos((Math.max(Math.abs(s), Math.abs(n)) * Math.PI) / 180);
  const r0 = Math.floor((s - margin / M_PER_DEG_LAT) / dLat);
  const r1 = Math.ceil((n + margin / M_PER_DEG_LAT) / dLat);
  const q0 = Math.floor((w - margin / (M_PER_DEG_LON * maxCos)) / dLon);
  const q1 = Math.ceil((e + margin / (M_PER_DEG_LON * maxCos)) / dLon);
  const R = r1 - r0 + 1;
  const Q = q1 - q0 + 1;
  const at = new Uint8Array(R * Q);
  for (const c of cells) {
    const sh = shiftOf(c);
    const ra = Math.max(r0, Math.ceil(c.south / dLat - 1e-9));
    const rb = Math.min(r1, Math.ceil(c.north / dLat - 1e-9) - 1);
    const qa = Math.max(q0, Math.ceil((c.west + sh) / dLon - 1e-9));
    const qb = Math.min(q1, Math.ceil((c.east + sh) / dLon - 1e-9) - 1);
    if (ra > rb || qa > qb) continue;
    const v = c.band === 'car' ? 2 : 1;
    for (let r = ra; r <= rb; r++) for (let q = qa; q <= qb; q++) at[(r - r0) * Q + (q - q0)] = v;
  }
  const cosOf = (r: number) => Math.cos((((r + r0) * dLat) * Math.PI) / 180);
  const toLngLat = (p: [number, number]): LngLat => [(p[1] + q0) * dLon, (p[0] + r0) * dLat];
  // Lattice positions to metres (rows north, columns east at the middle row's scale), for simplifying the outlines.
  const ewM = GROUND_STEP_M * cosOf(R / 2);
  const thin = <P extends [number, number]>(pts: P[], closed: boolean) => simplify(pts, closed, GROUND_SIMPLIFY_M / GROUND_STEP_M, ewM / GROUND_STEP_M);
  /** A shape wholly off the world's own copy is moved back onto it. */
  const home = <T extends LngLat[] | LngLat[][]>(shape: T): T => {
    const pts = (Array.isArray(shape[0][0]) ? (shape as LngLat[][]).flat() : (shape as LngLat[])) as LngLat[];
    const k = pts.every((p) => p[0] > 180) ? -360 : pts.every((p) => p[0] < -180) ? 360 : 0;
    if (!k) return shape;
    const move = (r: LngLat[]) => r.map((p) => [p[0] + k, p[1]] as LngLat);
    return (Array.isArray(shape[0][0]) ? (shape as LngLat[][]).map(move) : move(shape as LngLat[])) as T;
  };
  return { at, R, Q, r0, q0, cosOf, toLngLat, thin, home };
}

/** Car ground as areas and edges, from the judged cells (car cells drawn; every judged cell is ground that was read). */
export function carGroundOf(cells: readonly Cell[]): CarGround {
  const car = cells.filter((c) => c.band === 'car');
  if (!car.length) return NONE;
  const { at, R, Q, cosOf, toLngLat, thin, home } = latticeOf(cells, car, GROUND_SIGMA_M * REACH + 2 * GROUND_STEP_M);
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
  // The share above or below a half, in metres (a thousand to the unit), one unit with the distances it is cut by: where
  // it crosses zero is where the share does, and inside the car ground it never undercuts a step's distance.
  const V = new Float64Array(R * Q);
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
      V[r * Q + q] = ((b > 0 ? a / b : 0) - LEVEL) * 1000;
    }
  }
  // How far each lattice point is from the edge of what was read, in metres, below zero outside it (a chamfer distance):
  // the hatch fades out over the last GROUND_FADE_M toward it, never a straight cut (decision 0232: never a missing tile).
  const D = unreadDistance(at, R, Q, cosOf);
  const step = GROUND_FADE_M / GROUND_FADE_STEPS;
  const fadeOf = (d: number) => (d >= GROUND_FADE_M ? 0 : GROUND_FADE_STEPS - Math.floor(Math.max(0, d) / step));
  // The areas: the whole hatch past GROUND_FADE_M, and each fade step the car ground between two distances from the
  // read's edge, so the steps never overlap and meet where their distances say.
  const areas: CarPiece<LngLat[][]>[] = [];
  const field = new Float64Array(R * Q);
  for (let f = 0; f <= GROUND_FADE_STEPS; f++) {
    const lo = f === 0 ? GROUND_FADE_M : (GROUND_FADE_STEPS - f) * step;
    const hi = f === 0 ? Infinity : lo + step;
    for (let i = 0; i < R * Q; i++) field[i] = clamp(Math.min(V[i], D[i] - lo, hi === Infinity ? Infinity : hi - D[i]));
    for (const ring of polygons(contours(field, at, D, R, Q).map((c) => thin(c.pts, true).map(toLngLat)))) areas.push({ fade: f, shape: home(ring) });
  }
  // The edge: the outline of the car ground alone, in the runs whose ends lie between read ground (criterion 4), each run
  // as faint as the ground it borders.
  for (let i = 0; i < R * Q; i++) field[i] = clamp(V[i]);
  const edges: CarPiece<LngLat[]>[] = [];
  for (const c of contours(field, at, D, R, Q)) {
    // Thinned like the areas, keeping each kept vertex's flags, so the edge lies on the hatch's own outline.
    const keep = thin(c.pts.map((p, k) => [p[0], p[1], k] as unknown as [number, number]), true) as unknown as [number, number, number][];
    const pts = keep.map(([r, q]) => [r, q] as [number, number]);
    const read = keep.map((p) => c.read[p[2]]);
    const d = keep.map((p) => c.d[p[2]]);
    const m = pts.length;
    const ring = pts.map(toLngLat);
    // A segment k runs from vertex k to k + 1; its fade is its middle's.
    const segFade = (k: number) => (read[k] && read[(k + 1) % m] ? fadeOf((d[k] + d[(k + 1) % m]) / 2) : -1);
    const first = [...Array(m).keys()].find((k) => segFade(k) !== segFade((k - 1 + m) % m));
    if (first === undefined) {
      if (segFade(0) >= 0) edges.push({ fade: segFade(0), shape: home([...ring, ring[0]]) });
      continue;
    }
    let run: LngLat[] = [ring[first]];
    let cur = segFade(first);
    for (let j = 0; j < m; j++) {
      const k = (first + j) % m;
      const fk = segFade(k);
      if (fk !== cur) {
        if (cur >= 0 && run.length >= 2) edges.push({ fade: cur, shape: home(run) });
        run = [ring[k]];
        cur = fk;
      }
      run.push(ring[(k + 1) % m]);
    }
    if (cur >= 0 && run.length >= 2) edges.push({ fade: cur, shape: home(run) });
  }
  return { areas, edges, key: `${WALK_CODE}|g|${cellsKey(cells)}` };
}

/**
 * T67 (the owner's yes, 2026-11-27): the edge of what was read, as closed lines, so ground nobody read is told from plain
 * ground: where the read ends and round a tile that could not be read, with or without car ground. It is the outline the
 * hatch's fade is cut at (the same lattice and distance, at zero), so the hatch keeps its fade inside it. Pure, never stored.
 */
export function readEdgeOf(cells: readonly Cell[]): { lines: LngLat[][]; key: string } {
  if (!cells.length) return { lines: [], key: 'r0' };
  const { at, R, Q, cosOf, toLngLat, thin, home } = latticeOf(cells, cells, 2 * GROUND_STEP_M);
  const D = unreadDistance(at, R, Q, cosOf);
  const field = new Float64Array(R * Q);
  for (let i = 0; i < R * Q; i++) field[i] = clamp(D[i]);
  const lines = contours(field, at, D, R, Q).map((c) => {
    const ring = thin(c.pts, true).map(toLngLat);
    return home([...ring, ring[0]]);
  });
  return { lines, key: `r${cellsKey(cells, false)}` };
}

/**
 * T68 (the owner's yes, 2026-11-27): the rule for the car ground's one quiet name, in pixels at walking zoom (the walk and
 * Navigate open at 16). An area is named when a circle as wide as a phone held upright (390 px, the reference phone) fits
 * inside it, which a screen wholly inside it needs; the name sits where it has `roomPx` of car ground round it, so the words
 * stay inside the hatch from a zoom below walking zoom (`WALK_TEXT.minzoom`). Never a number on the map.
 */
export const CAR_LABEL = { screenPx: 390, zoom: 16, roomPx: 140, everyPx: 400 } as const;
/** Pixels at zoom 16 a lattice column spans (a fixed step in degrees east-west), and a row at the equator (over the cosine elsewhere). */
const COLUMN_PX = (GROUND_STEP_M / M_PER_DEG_LON) * ((512 * 2 ** CAR_LABEL.zoom) / 360);
const ROW_PX = (GROUND_STEP_M / M_PER_DEG_LAT) * ((512 * 2 ** CAR_LABEL.zoom) / 360);

/**
 * T68: where the name of each car area larger than the screen at walking zoom is written (`CarGround.text`). The room is the
 * car ground at least `CAR_LABEL.roomPx` from anything not car ground (read ground of another reading, or ground nobody
 * read), in the pieces whose deepest point is half the screen's width in, so a small area is never named. In it the name is
 * written about once a screen, as a street's name repeats along it: at the points of a staggered grid `CAR_LABEL.everyPx`
 * apart at walking zoom, fixed on the cells' global lattice so a read elsewhere puts them in the same places; a piece no
 * grid point falls in is named once, at its deepest point. Never stored. Pure.
 */
export function carTextOf(cells: readonly Cell[]): LngLat[] {
  const car = cells.filter((c) => c.band === 'car');
  if (!car.length) return [];
  const { at, R, Q, r0, q0, cosOf, toLngLat, home } = latticeOf(cells, car, 2 * GROUND_STEP_M);
  const isCar = new Uint8Array(R * Q);
  for (let i = 0; i < R * Q; i++) isCar[i] = at[i] === 2 ? 1 : 0;
  // Metres from each point to the nearest that is not car ground (the same chamfer the read's edge is measured by).
  const depth = unreadDistance(isCar, R, Q, cosOf);
  const cos = cosOf(R / 2);
  const px = metersPerPixel(CAR_LABEL.zoom, toLngLat([R / 2, 0])[1]);
  const room = CAR_LABEL.roomPx * px;
  const large = (CAR_LABEL.screenPx / 2) * px;
  // The grid, in lattice steps: rows a fixed number of pixels apart need more of them toward the poles (Mercator).
  const kr = Math.max(1, Math.round((CAR_LABEL.everyPx * cos) / ROW_PX));
  const kq = Math.max(2, Math.round(CAR_LABEL.everyPx / COLUMN_PX));
  const mod = (a: number, b: number) => ((a % b) + b) % b;
  const onGrid = (r: number, q: number) => {
    const gr = r + r0;
    return mod(gr, kr) === 0 && mod(q + q0 - (mod(Math.floor(gr / kr), 2) ? Math.floor(kq / 2) : 0), kq) === 0;
  };
  const out: LngLat[] = [];
  const seen = new Uint8Array(R * Q);
  for (let s = 0; s < R * Q; s++) {
    if (seen[s] || depth[s] < room) continue;
    // Each piece of room (four-way neighbours), with its deepest point and its grid points.
    const piece = [s];
    seen[s] = 1;
    let deepest = s;
    const marks: number[] = [];
    for (let k = 0; k < piece.length; k++) {
      const i = piece[k];
      const [r, q] = [Math.floor(i / Q), i % Q];
      if (depth[i] > depth[deepest]) deepest = i;
      if (onGrid(r, q)) marks.push(i);
      for (const n of [r > 0 ? i - Q : -1, r < R - 1 ? i + Q : -1, q > 0 ? i - 1 : -1, q < Q - 1 ? i + 1 : -1]) {
        if (n < 0 || seen[n] || depth[n] < room) continue;
        seen[n] = 1;
        piece.push(n);
      }
    }
    if (depth[deepest] < large) continue;
    for (const i of marks.length ? marks : [deepest]) out.push(home([toLngLat([Math.floor(i / Q), i % Q])])[0]);
  }
  return out;
}

/**
 * What the Walkability layer draws: the car ground (`carGroundOf`, unchanged), the read's edge beside it, and the room for
 * each large area's name (T68), keyed on the car ground and the read (the room follows from the same cells).
 */
export function walkDrawingOf(cells: readonly Cell[]): CarGround {
  const ground = carGroundOf(cells);
  const read = readEdgeOf(cells);
  return { ...ground, read: read.lines, text: carTextOf(cells), key: `${ground.key}|${read.key}` };
}

/** A piece of a route inside the drawn car ground, and how far along the route it begins and ends, in metres. */
export interface InsideRun {
  line: LngLat[];
  fromM: number;
  toM: number;
}

/** Rows of the pieces' ring edges, so a point is tested against the few edges at its latitude, not every ring (audit 11). */
const ROW_DEG = 0.0005;

/**
 * G5, criterion 6: the parts of a route inside the drawn car ground (any of its fade steps), each with where it begins
 * and ends along the route, so the route's casing begins and ends where the hatch does, within a metre. The route is
 * walked in steps of 5 m; a crossing is found by halving between the two steps either side of it. The pieces' edges are
 * indexed by latitude, so each test is a few edges.
 */
export function insideRunsAlong(path: readonly LngLat[], g: CarGround | null): InsideRun[] {
  if (!g || !g.areas.length || path.length < 2) return [];
  const rows = new Map<number, { piece: number; a: LngLat; b: LngLat }[]>();
  g.areas.forEach((area, piece) => {
    for (const ring of area.shape) {
      for (let k = 1; k < ring.length; k++) {
        const [a, b] = [ring[k - 1], ring[k]];
        const lo = Math.floor(Math.min(a[1], b[1]) / ROW_DEG);
        const hi = Math.floor(Math.max(a[1], b[1]) / ROW_DEG);
        for (let r = lo; r <= hi; r++) {
          const row = rows.get(r);
          if (row) row.push({ piece, a, b });
          else rows.set(r, [{ piece, a, b }]);
        }
      }
    }
  });
  const isIn = (p: LngLat) => {
    const odd = new Set<number>();
    for (const { piece, a, b } of rows.get(Math.floor(p[1] / ROW_DEG)) ?? []) {
      if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) {
        if (odd.has(piece)) odd.delete(piece);
        else odd.add(piece);
      }
    }
    return odd.size > 0;
  };
  const project = projector(path[0]);
  const lerp = (a: LngLat, b: LngLat, t: number): LngLat => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const out: InsideRun[] = [];
  let run: InsideRun | null = null;
  let prev: { p: LngLat; m: number; in: boolean } | null = null;
  const cross = (a: { p: LngLat; m: number; in: boolean }, b: { p: LngLat; m: number }) => {
    let [lo, hi] = [0, 1];
    for (let k = 0; k < 12; k++) {
      const mid = (lo + hi) / 2;
      if (isIn(lerp(a.p, b.p, mid)) === a.in) lo = mid;
      else hi = mid;
    }
    const t = (lo + hi) / 2;
    return { p: lerp(a.p, b.p, t), m: a.m + (b.m - a.m) * t };
  };
  const visit = (p: LngLat, m: number, corner: boolean) => {
    const now = isIn(p);
    if (prev && now !== prev.in) {
      const x = cross(prev, { p, m });
      if (now) run = { line: [x.p], fromM: x.m, toM: x.m };
      else if (run) {
        run.line.push(x.p);
        run.toM = x.m;
        if (run.line.length >= 2) out.push(run);
        run = null;
      }
    } else if (!prev && now) run = { line: [p], fromM: m, toM: m };
    if (now && run && corner && run.line[run.line.length - 1] !== p) {
      run.line.push(p);
      run.toM = m;
    }
    prev = { p, m, in: now };
  };
  let along = 0;
  for (let i = 0; i < path.length; i++) {
    if (i > 0) {
      const [a, b] = [path[i - 1], path[i]];
      const [pa, pb] = [project(a), project(b)];
      const L = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
      const n = Math.max(1, Math.ceil(L / 5));
      for (let k = 1; k < n; k++) visit(lerp(a, b, k / n), along + (L * k) / n, false);
      along += L;
    }
    visit(path[i], along, true);
  }
  if (run && (run as InsideRun).line.length >= 2) out.push(run);
  return out;
}

/** The parts of each line inside the drawn car ground (`insideRunsAlong`, line by line). */
export function insideCarGround(lines: readonly (readonly LngLat[])[], g: CarGround | null): LngLat[][] {
  return lines.flatMap((l) => insideRunsAlong(l, g).map((r) => r.line));
}

/** An outline's points closer than this to the line through their neighbours are left out (about a pixel at walking zoom). */
const GROUND_SIMPLIFY_M = 1.5;

/**
 * Douglas-Peucker over lattice positions [row, column] (a ring when `closed`), a row `1` and a column `ew` in the same
 * unit as `tol`. Deterministic: the same ring gives the same points. Extra fields on a point ride along.
 */
function simplify<P extends [number, number]>(pts: P[], closed: boolean, tol: number, ew: number): P[] {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length);
  const d2 = (p: P, a: P, b: P) => {
    const [px, py, ax, ay, bx, by] = [p[1] * ew, p[0], a[1] * ew, a[0], b[1] * ew, b[0]];
    const [dx, dy] = [bx - ax, by - ay];
    const L = dx * dx + dy * dy;
    const t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0;
    return (px - ax - dx * t) ** 2 + (py - ay - dy * t) ** 2;
  };
  const stack: [number, number][] = [];
  // A ring is split at its first point and the point farthest from it.
  let far = 0;
  if (closed) {
    let best = -1;
    for (let k = 1; k < pts.length; k++) {
      const dd = d2(pts[k], pts[0], pts[0]);
      if (dd > best) [best, far] = [dd, k];
    }
    keep[0] = keep[far] = 1;
    stack.push([0, far], [far, pts.length]);
  } else {
    keep[0] = keep[pts.length - 1] = 1;
    stack.push([0, pts.length - 1]);
  }
  const at = (k: number) => pts[k % pts.length];
  while (stack.length) {
    const [i, j] = stack.pop()!;
    let best = -1;
    let idx = -1;
    for (let k = i + 1; k < j; k++) {
      const dd = d2(at(k), at(i), at(j));
      if (dd > best) [best, idx] = [dd, k];
    }
    if (idx >= 0 && best > tol * tol) {
      keep[idx % pts.length] = 1;
      stack.push([i, idx], [idx, j]);
    }
  }
  return pts.filter((_, k) => keep[k]);
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
 * each vertex says whether both lattice points it lies between were read, and its distance from the read's edge. Only the
 * box around the points at or above zero is walked (a fade step is a strip along the read's edge: audit 11). Rings start
 * at their smallest crossing, so the same field gives the same rings.
 */
function contours(field: Float64Array, at: Uint8Array, dist: Float64Array, R: number, Q: number): { pts: [number, number][]; read: boolean[]; d: number[] }[] {
  let [rLo, rHi, qLo, qHi] = [R, -1, Q, -1];
  for (let r = 0; r < R; r++) {
    for (let q = 0; q < Q; q++) {
      if (field[r * Q + q] < 0) continue;
      if (r < rLo) rLo = r;
      if (r > rHi) rHi = r;
      if (q < qLo) qLo = q;
      if (q > qHi) qHi = q;
    }
  }
  if (rHi < 0) return [];
  const v = (r: number, q: number) => (r < 0 || q < 0 || r >= R || q >= Q ? -1e6 : field[r * Q + q]);
  const known = (r: number, q: number) => r >= 0 && q >= 0 && r < R && q < Q && at[r * Q + q] > 0;
  const D = (r: number, q: number) => (r < 0 || q < 0 || r >= R || q >= Q ? Infinity : dist[r * Q + q]);
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
      const f = a === b ? 0.5 : -a / (b - a);
      const [da, db] = [D(ra, qa), D(rb, qb)];
      const d = Number.isFinite(da) && Number.isFinite(db) ? da + (db - da) * f : Math.min(da, db);
      pos.set(k, { p: [ra + (rb - ra) * f, qa + (qb - qa) * f], read: known(ra, qa) && known(rb, qb), d });
    }
    return k;
  };
  for (let r = rLo - 1; r <= rHi; r++) {
    for (let q = qLo - 1; q <= qHi; q++) {
      // Corners: a (r, q), b (r, q + 1), c (r + 1, q + 1), d (r + 1, q); rows run north, columns east.
      const A = v(r, q) >= 0 ? 1 : 0;
      const B = v(r, q + 1) >= 0 ? 1 : 0;
      const C = v(r + 1, q + 1) >= 0 ? 1 : 0;
      const Dd = v(r + 1, q) >= 0 ? 1 : 0;
      const code = A | (B << 1) | (C << 2) | (Dd << 3);
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
          const mid = (v(r, q) + v(r, q + 1) + v(r + 1, q + 1) + v(r + 1, q)) / 4 >= 0;
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
