import { distanceM, lineLengthM, projector, stepToward } from './geo';
import { runsAlongside } from './snapper';
import type { LngLat, StreetSegment } from './types';

/**
 * Turns road features read from OpenMapTiles-schema vector tiles (what
 * OpenFreeMap serves) into street segments. The concept doc targets the
 * Protomaps schema; only this file knows about the tile schema, so the switch
 * to a Protomaps PMTiles bucket is contained here.
 */

export interface RoadFeature {
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, unknown> | null;
  sourceLayer?: string;
}

/** Classes that are never streets you can walk. */
const EXCLUDED_CLASSES = new Set([
  'motorway', 'rail', 'transit', 'ferry', 'aerialway', 'raceway', 'bus_guideway', 'busway',
]);
const SIDEWALK_SUBCLASSES = new Set(['footway', 'sidewalk', 'crossing']);
const SIDEWALK_MERGE_M = 15;
/** Blocks longer than this are cut further, so one long block is not all-or-nothing. */
const MAX_PIECE_M = 200;
const NAME_MATCH_M = 8;

function lines(geometry: RoadFeature['geometry']): LngLat[][] {
  if (geometry.type === 'LineString') return [geometry.coordinates as LngLat[]];
  if (geometry.type === 'MultiLineString') return geometry.coordinates as LngLat[][];
  return [];
}

function isWalkable(props: Record<string, unknown>): boolean {
  const cls = String(props.class ?? '');
  if (EXCLUDED_CLASSES.has(cls)) return false;
  const access = String(props.access ?? '');
  if (access === 'no' || access === 'private') return false;
  if (props.indoor === 1 || props.indoor === true) return false;
  if (props.ramp === 1 || props.ramp === true) return false;
  return true;
}

const vertexKey = (p: LngLat) => `${p[0].toFixed(7)},${p[1].toFixed(7)}`;
/** A line end this close to another way counts as meeting it (a T-junction). */
const TOUCH_M = 1.5;
const CELL_M = 50;

/**
 * Finds where ways meet and inserts a vertex there. Shared OSM nodes cannot
 * be relied on, because tile simplification drops the node where two straight
 * streets cross, so crossings and T-junctions are found geometrically.
 * Returns the lines with those vertices added, and the set of junction keys.
 */
function withJunctions(features: LngLat[][][]): { lines: LngLat[][][]; at: Set<string> } {
  const at = new Set<string>();
  const first = features.find((f) => f.length && f[0].length)?.[0][0];
  if (!first) return { lines: features, at };
  const proj = projector(first);
  const unproj = (q: [number, number]): LngLat => {
    // Inverse of the local projection, from one meter east and north of the origin.
    const ex = proj([first[0] + 1e-5, first[1]])[0] / 1e-5;
    const ny = proj([first[0], first[1] + 1e-5])[1] / 1e-5;
    return [first[0] + q[0] / ex, first[1] + q[1] / ny];
  };

  type Edge = { f: number; l: number; e: number; a: [number, number]; b: [number, number] };
  const projected = features.map((ls) => ls.map((line) => line.map(proj)));
  const grid = new Map<string, Edge[]>();
  projected.forEach((ls, f) =>
    ls.forEach((line, l) => {
      for (let e = 1; e < line.length; e++) {
        const edge: Edge = { f, l, e: e - 1, a: line[e - 1], b: line[e] };
        const x0 = Math.floor((Math.min(edge.a[0], edge.b[0]) - TOUCH_M) / CELL_M);
        const x1 = Math.floor((Math.max(edge.a[0], edge.b[0]) + TOUCH_M) / CELL_M);
        const y0 = Math.floor((Math.min(edge.a[1], edge.b[1]) - TOUCH_M) / CELL_M);
        const y1 = Math.floor((Math.max(edge.a[1], edge.b[1]) + TOUCH_M) / CELL_M);
        for (let cx = x0; cx <= x1; cx++)
          for (let cy = y0; cy <= y1; cy++) {
            const k = `${cx},${cy}`;
            const list = grid.get(k);
            if (list) list.push(edge);
            else grid.set(k, [edge]);
          }
      }
    }),
  );

  // Split parameters per edge: key `${f}/${l}/${e}` -> fractions along that edge.
  const splits = new Map<string, number[]>();
  const addSplit = (edge: Edge, t: number) => {
    const k = `${edge.f}/${edge.l}/${edge.e}`;
    const list = splits.get(k);
    if (list) list.push(t);
    else splits.set(k, [t]);
  };
  const isLineEnd = (edge: Edge, which: 'a' | 'b') => {
    const n = projected[edge.f][edge.l].length;
    return which === 'a' ? edge.e === 0 : edge.e + 1 === n - 1;
  };
  const project = (p: [number, number], edge: Edge) => {
    const dx = edge.b[0] - edge.a[0];
    const dy = edge.b[1] - edge.a[1];
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - edge.a[0]) * dx + (p[1] - edge.a[1]) * dy) / len2));
    return { t, d: Math.hypot(p[0] - (edge.a[0] + t * dx), p[1] - (edge.a[1] + t * dy)) };
  };

  const seen = new Set<string>();
  for (const list of grid.values()) {
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const p = list[i];
        const q = list[j];
        if (p.f === q.f) continue;
        const pairKey = `${p.f}/${p.l}/${p.e}|${q.f}/${q.l}/${q.e}`;
        if (seen.has(pairKey)) continue;
        seen.add(pairKey);
        // Proper crossing.
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
            const hit = project(end[which], other);
            if (hit.d <= TOUCH_M) {
              addSplit(other, hit.t);
              addSplit(end, which === 'a' ? 0 : 1);
            }
          }
        }
      }
  }

  const EPS = 1e-6;
  const lines = features.map((ls, f) =>
    ls.map((line, l) => {
      const pl = projected[f][l];
      const out: LngLat[] = [line[0]];
      for (let e = 0; e < pl.length - 1; e++) {
        const ts = (splits.get(`${f}/${l}/${e}`) ?? []).sort((x, y) => x - y);
        let last = -1;
        for (const t of ts) {
          if (t <= EPS) {
            at.add(vertexKey(line[e]));
          } else if (t >= 1 - EPS) {
            at.add(vertexKey(line[e + 1]));
          } else if (t - last > 1e-4) {
            const a = pl[e], b = pl[e + 1];
            const v = unproj([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
            out.push(v);
            at.add(vertexKey(v));
            last = t;
          }
        }
        out.push(line[e + 1]);
      }
      return out;
    }),
  );
  return { lines, at };
}

/** Splits a line at junction vertices, then cuts any piece longer than MAX_PIECE_M. */
function pieces(line: LngLat[], at: Set<string>): LngLat[][] {
  const out: LngLat[][] = [];
  let cur: LngLat[] = [line[0]];
  for (let i = 1; i < line.length; i++) {
    cur.push(line[i]);
    if (i < line.length - 1 && at.has(vertexKey(line[i]))) {
      out.push(cur);
      cur = [line[i]];
    }
  }
  if (cur.length > 1) out.push(cur);
  return out.flatMap(chunk);
}

function chunk(line: LngLat[]): LngLat[][] {
  const out: LngLat[][] = [];
  let cur: LngLat[] = [line[0]];
  let acc = 0;
  for (let i = 1; i < line.length; i++) {
    let a = cur[cur.length - 1];
    const b = line[i];
    let d = distanceM(a, b);
    while (acc + d > MAX_PIECE_M) {
      const cut = stepToward(a, b, MAX_PIECE_M - acc);
      cur.push(cut);
      out.push(cur);
      cur = [cut];
      acc = 0;
      a = cut;
      d = distanceM(a, b);
    }
    cur.push(b);
    acc += d;
  }
  if (cur.length > 1) out.push(cur);
  return out;
}

const r6 = (n: number) => n.toFixed(6);
function pieceId(cls: string, line: LngLat[]): string {
  const a = line[0];
  const b = line[line.length - 1];
  const [p, q] = a[0] < b[0] || (a[0] === b[0] && a[1] <= b[1]) ? [a, b] : [b, a];
  return `${cls}:${r6(p[0])},${r6(p[1])}:${r6(q[0])},${r6(q[1])}`;
}

export function deriveSegments(roads: RoadFeature[], names: RoadFeature[] = []): StreetSegment[] {
  const named: { name: string; lines: LngLat[][] }[] = [];
  for (const f of names) {
    const name = f.properties?.name;
    if (typeof name === 'string' && name) named.push({ name, lines: lines(f.geometry) });
  }
  const nameFor = (line: LngLat[], props: Record<string, unknown>): string | null => {
    if (typeof props.name === 'string' && props.name) return props.name;
    for (const n of named) if (runsAlongside(line, n.lines, NAME_MATCH_M)) return n.name;
    return null;
  };

  // Overlapping tiles return the same feature more than once.
  const unique = new Map<string, RoadFeature>();
  for (const f of roads) {
    if (!isWalkable(f.properties ?? {})) continue;
    unique.set(`${String(f.properties?.class)}|${JSON.stringify(f.geometry.coordinates)}`, f);
  }
  const walkable = [...unique.values()];
  const isSidewalk = (f: RoadFeature) =>
    f.properties?.class === 'path' && SIDEWALK_SUBCLASSES.has(String(f.properties?.subclass ?? ''));
  // Sidewalks and crossings stay out of the junction search, or every
  // crosswalk would cut the street it crosses.
  const { lines: split, at } = withJunctions(walkable.map((f) => (isSidewalk(f) ? [] : lines(f.geometry))));

  const streets: StreetSegment[] = [];
  const footways: { line: LngLat[]; props: Record<string, unknown> }[] = [];
  const seen = new Set<string>();

  for (const [i, f] of walkable.entries()) {
    const props = f.properties ?? {};
    const cls = String(props.class ?? 'road');
    const sub = String(props.subclass ?? '');
    if (isSidewalk(f)) {
      for (const line of lines(f.geometry)) if (line.length > 1) footways.push({ line, props });
      continue;
    }
    for (const line of split[i]) {
      if (line.length < 2) continue;
      for (const piece of pieces(line, at)) {
        const id = pieceId(cls, piece);
        if (seen.has(id)) continue; // the same feature comes back from overlapping tiles
        seen.add(id);
        streets.push({
          id,
          name: nameFor(piece, props),
          kind_detail: sub ? `${cls}/${sub}` : cls,
          length_m: lineLengthM(piece),
          geometry: [piece],
        });
      }
    }
  }

  // Separately mapped sidewalks are merged into their street: a footway that
  // runs alongside a named street the whole way is dropped, and walking it
  // credits the street through the snapper's buffer instead.
  const streetLines = streets.filter((s) => s.name).flatMap((s) => s.geometry);
  for (const { line, props } of footways) {
    if (runsAlongside(line, streetLines, SIDEWALK_MERGE_M)) continue;
    for (const piece of pieces(line, at)) {
      const id = pieceId('path', piece);
      if (seen.has(id)) continue;
      seen.add(id);
      streets.push({
        id,
        name: nameFor(piece, props),
        kind_detail: `path/${String(props.subclass ?? '')}`,
        length_m: lineLengthM(piece),
        geometry: [piece],
      });
    }
  }
  return streets;
}

/** A street is counted by name; unnamed pieces each count on their own. */
export function streetKey(s: Pick<StreetSegment, 'id' | 'name'>): string {
  return s.name ? `name:${s.name}` : s.id;
}
