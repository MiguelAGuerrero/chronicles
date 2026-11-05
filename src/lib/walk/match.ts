// @layer core
import { pointSegmentDist, projector } from '../geo';
import { tileAt } from '../tileMath';
import type { LngLat } from '../types';
import { bandOf, isBeside, isCrossing } from './bands';
import type { Band, WayFacts } from './types';

/*
 * Putting the ways of a tile on the street segments the app already has (WK6, WK8, WK10). A segment
 * reads only the tile it lies in (by its midpoint), so the same segment gets the same band whichever
 * neighbours have been read; a segment whose tile was never read is `unknown`, never a neighbour's
 * band. Spatially indexed, O(n log n) over ways (AGENTS.md).
 */

export const walkTileKey = (x: number, y: number) => `${x}/${y}`;

/** A way running a street's way: within 35° (cos 35°), the rule streets.ts uses for sidewalks. */
const ALONG = Math.cos((35 * Math.PI) / 180);
/** A street's own way is the nearest one within this (m). */
const OWN_M = 15;
/** A footway counts as its sidewalk within this (m). */
const BESIDE_M = 25;
/** A crossing lifts a short car stretch when within this (m) of its end (WK8). */
const CROSSING_M = 30;
/** Only a stretch this short is lifted: the crossing stands for the 60 m around it. */
const LIFT_MAX_M = 60;
const STEP_M = 20;
const MAX_SAMPLES = 24;
const CELL_M = 40;

type XY = [number, number];
type Edge = { a: XY; b: XY; w: WayFacts };

class Index {
  private cells = new Map<string, Edge[]>();
  add(e: Edge) {
    const pad = BESIDE_M;
    const x0 = Math.floor((Math.min(e.a[0], e.b[0]) - pad) / CELL_M);
    const x1 = Math.floor((Math.max(e.a[0], e.b[0]) + pad) / CELL_M);
    const y0 = Math.floor((Math.min(e.a[1], e.b[1]) - pad) / CELL_M);
    const y1 = Math.floor((Math.max(e.a[1], e.b[1]) + pad) / CELL_M);
    for (let cx = x0; cx <= x1; cx++)
      for (let cy = y0; cy <= y1; cy++) {
        const k = `${cx},${cy}`;
        const list = this.cells.get(k);
        if (list) list.push(e);
        else this.cells.set(k, [e]);
      }
  }
  at(p: XY): Edge[] {
    return this.cells.get(`${Math.floor(p[0] / CELL_M)},${Math.floor(p[1] / CELL_M)}`) ?? [];
  }
}

interface TileIndex {
  project: (p: LngLat) => XY;
  index: Index;
  crossings: WayFacts[];
}

function indexTile(ways: readonly WayFacts[]): TileIndex {
  const first = ways.find((w) => w.line.length)?.line[0];
  const project = projector(first ?? [0, 0]);
  const index = new Index();
  const crossings: WayFacts[] = [];
  for (const w of ways) {
    if (isCrossing(w)) crossings.push(w);
    for (let i = 1; i < w.line.length; i++) index.add({ a: project(w.line[i - 1]), b: project(w.line[i]), w });
  }
  return { project, index, crossings };
}

/** Points along a projected line every STEP_M, each with the direction of the piece it lies on. */
function samplesOf(line: XY[]): { p: XY; d: XY }[] {
  const out: { p: XY; d: XY }[] = [];
  for (let i = 1; i < line.length; i++) {
    const [a, b] = [line[i - 1], line[i]];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L === 0) continue;
    const d: XY = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    const n = Math.max(1, Math.ceil(L / STEP_M));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      out.push({ p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], d });
    }
  }
  if (out.length <= MAX_SAMPLES) return out;
  const stride = out.length / MAX_SAMPLES;
  return Array.from({ length: MAX_SAMPLES }, (_, i) => out[Math.floor(i * stride)]);
}

const along = (e: Edge, d: XY) => {
  const L = Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]);
  if (L === 0) return false;
  return Math.abs(((e.b[0] - e.a[0]) * d[0] + (e.b[1] - e.a[1]) * d[1]) / L) >= ALONG;
};

interface Seg {
  id: string;
  geometry: readonly (readonly LngLat[])[];
  length_m: number;
}

/** The point halfway along a line by its length, not its middle vertex: a two-vertex way's middle is not its end (walkability audit 1b). */
export function midOf(line: readonly LngLat[]): LngLat {
  let total = 0;
  for (let i = 1; i < line.length; i++) total += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
  let left = total / 2;
  for (let i = 1; i < line.length; i++) {
    const L = Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
    if (left <= L && L > 0) {
      const t = left / L;
      return [line[i - 1][0] + (line[i][0] - line[i - 1][0]) * t, line[i - 1][1] + (line[i][1] - line[i - 1][1]) * t];
    }
    left -= L;
  }
  return line[line.length - 1];
}

/** The longest line of a segment, which stands for it. */
function mainLine(g: Seg['geometry']): readonly LngLat[] | null {
  let best: readonly LngLat[] | null = null;
  let len = -1;
  for (const l of g) {
    if (l.length > 1 && l.length > len) {
      best = l;
      len = l.length;
    }
  }
  return best;
}

/**
 * WK5-WK10: the band of every segment, from the tiles' ways (key `walkTileKey`). A segment with no
 * ways of its own tile near it is `unknown`.
 */
export function bandsFor(segments: readonly Seg[], tiles: ReadonlyMap<string, readonly WayFacts[]>): Map<string, Band> {
  const built = new Map<string, TileIndex>();
  const indexOf = (key: string): TileIndex | null => {
    const have = built.get(key);
    if (have) return have;
    const ways = tiles.get(key);
    if (!ways || !ways.length) return null;
    const t = indexTile(ways);
    built.set(key, t);
    return t;
  };
  const out = new Map<string, Band>();
  for (const s of segments) {
    const line = mainLine(s.geometry);
    if (!line) {
      out.set(s.id, 'unknown');
      continue;
    }
    const home = tileAt(midOf(line));
    const t = indexOf(walkTileKey(home.x, home.y));
    if (!t) {
      out.set(s.id, 'unknown');
      continue;
    }
    out.set(s.id, bandOfSegment(s, line, t));
  }
  return out;
}

function bandOfSegment(s: Seg, line: readonly LngLat[], t: TileIndex): Band {
  const pts = line.map(t.project);
  const samples = samplesOf(pts);
  // 1. Its own way: the nearest one running its way, by vote over the samples.
  const votes = new Map<WayFacts, { n: number; d: number }>();
  for (const { p, d } of samples) {
    let best: { w: WayFacts; dist: number } | null = null;
    for (const e of t.index.at(p)) {
      if (!along(e, d)) continue;
      const dist = pointSegmentDist(p, e.a, e.b);
      if (dist <= OWN_M && (!best || dist < best.dist)) best = { w: e.w, dist };
    }
    if (best) {
      const v = votes.get(best.w) ?? { n: 0, d: 0 };
      votes.set(best.w, { n: v.n + 1, d: v.d + best.dist });
    }
  }
  let own: WayFacts | null = null;
  let top: { n: number; d: number } | null = null;
  for (const [w, v] of votes) if (!top || v.n > top.n || (v.n === top.n && v.d < top.d)) [own, top] = [w, v];
  if (!own) return 'unknown';
  // 2. A footway beside it, on its level, for at least half the samples (WK6).
  let beside = 0;
  for (const { p, d } of samples) {
    const hit = t.index.at(p).some((e) => e.w !== own && e.w.level === own!.level && isBeside(e.w) && along(e, d) && pointSegmentDist(p, e.a, e.b) <= BESIDE_M);
    if (hit) beside++;
  }
  let band = bandOf(own, { path: samples.length > 0 && beside * 2 >= samples.length });
  // 3. A crossing near the end of a short car stretch lifts it (WK8).
  if (band === 'car' && s.length_m <= LIFT_MAX_M) {
    const ends = [pts[0], pts[pts.length - 1]];
    const crossed = t.crossings.some((c) => c.level === own!.level && c.line.some((q) => ends.some((e) => Math.hypot(t.project(q)[0] - e[0], t.project(q)[1] - e[1]) <= CROSSING_M)));
    if (crossed) band = 'mixed';
  }
  return band;
}
