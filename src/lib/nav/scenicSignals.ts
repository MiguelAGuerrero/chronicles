// @layer core
import { isMarkable } from '../discovery/noise';
import type { CategoryId, Kind, Place } from '../discovery/types';
import { distanceM, projector, type Bounds } from '../geo';
import type { RoadFeature } from '../streets';
import type { LngLat } from '../types';
import { NAV, SCENIC } from './rules';

/**
 * What a scenic route leans toward (specs/scenic-routes, SR6, SR15), from one read of the tiles
 * between the two ends: green areas, places worth seeing, and the graded busy streets. Pure: the
 * read is the shell's (`scenicRead`), and these are only shapes and indexes over it.
 */

/** A park, garden or wood: its rings (the first the outside), and a name when a park point lies inside. */
export interface GreenArea {
  rings: LngLat[][];
  kind: 'park' | 'wood';
  name: string | null;
}

/** A place worth seeing, and whether it was found (only a found place is named, SR4). */
export interface Sight {
  key: string;
  at: LngLat;
  name: string;
  found: boolean;
}

/** A graded stretch of busy street (activity density, AD12). */
export interface BusyLine {
  name: string;
  grade: 1 | 2 | 3;
  lines: LngLat[][];
}

export interface Signals {
  green: GreenArea[];
  sights: Sight[];
  busy: BusyLine[];
}

/** OpenMapTiles' landcover classes that count as green (SR15): parks and gardens, and woods. */
function greenKind(props: Record<string, unknown> | null): GreenArea['kind'] | null {
  const cls = String(props?.class ?? '');
  const sub = String(props?.subclass ?? '');
  if (cls === 'wood') return 'wood';
  if (cls === 'grass' && (sub === 'park' || sub === 'garden')) return 'park';
  return null;
}

const inRings = (p: LngLat, rings: LngLat[][]): boolean => {
  // Even-odd over every ring, so a hole is outside.
  let inside = false;
  for (const ring of rings)
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
    }
  return inside;
};

/** SR15: the green areas of the tiles' landcover, each named by a park point inside it. */
export function greenFromTiles(landcover: RoadFeature[], parks: Pick<Place, 'name' | 'at'>[]): GreenArea[] {
  const out: GreenArea[] = [];
  for (const f of landcover) {
    const kind = greenKind(f.properties);
    if (!kind) continue;
    const polys =
      f.geometry.type === 'Polygon' ? [f.geometry.coordinates as LngLat[][]] : f.geometry.type === 'MultiPolygon' ? (f.geometry.coordinates as LngLat[][][]) : [];
    for (const rings of polys) {
      if (!rings.length || rings[0].length < 4) continue;
      const name = parks.find((p) => inRings(p.at, rings))?.name ?? null;
      out.push({ rings, kind, name });
    }
  }
  return out;
}

/** Whether a point is inside any green area (a plain scan; routes use `greenProbe`). */
export const insideGreen = (p: LngLat, areas: GreenArea[]): boolean => areas.some((a) => inRings(p, a.rings));

/** The categories whose places are sights; parks are green instead, food and the rest are busy streets. */
const SIGHT_CATEGORIES: readonly CategoryId[] = ['art', 'history', 'culture', 'viewpoints'];

/** SR6: the places a Sights route leans toward: marks of a kind switched on in "What I'm into". */
export function sightsFrom(places: Place[], hidden: Set<Kind>, found: Set<string>): Sight[] {
  return places
    .filter((p) => SIGHT_CATEGORIES.includes(p.category) && isMarkable(p) && !(p.kind && hidden.has(p.kind)))
    .map((p) => ({ key: p.key, at: p.at, name: p.name, found: found.has(p.key) }));
}

/**
 * The box that holds every route at most SCENIC.detour longer than the straight line: the
 * ellipse with the two ends as foci, plus the street join's reach at either end.
 */
export function corridorBounds(from: LngLat, to: LngLat): Bounds {
  const d = Math.max(1, distanceM(from, to));
  const a = (d * (1 + SCENIC.detour)) / 2;
  const b = Math.sqrt(Math.max(0, a * a - (d / 2) ** 2));
  const mid: LngLat = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
  const [ex0, ny0] = projector(mid)(to);
  const len = Math.hypot(ex0, ny0) || 1;
  const cos = ex0 / len;
  const sin = ny0 / len;
  const halfX = Math.sqrt((a * cos) ** 2 + (b * sin) ** 2) + NAV.joinM;
  const halfY = Math.sqrt((a * sin) ** 2 + (b * cos) ** 2) + NAV.joinM;
  const mLat = 111_320;
  const mLon = 111_320 * Math.cos((mid[1] * Math.PI) / 180);
  return [mid[0] - halfX / mLon, mid[1] - halfY / mLat, mid[0] + halfX / mLon, mid[1] + halfY / mLat];
}

/** A point is inside the detour's ellipse: its two distances to the ends add up to within the budget. */
export const inCorridor = (p: LngLat, from: LngLat, to: LngLat): boolean =>
  distanceM(from, p) + distanceM(p, to) <= distanceM(from, to) * (1 + SCENIC.detour);

type XY = [number, number];
const CELL = 100;

/** Lookups over one read's signals, in metres around `origin`; built once per routing, never kept. */
export interface Probe {
  /** The green area a point is inside, or null. */
  green(p: LngLat): GreenArea | null;
  /** The strongest busy line within SCENIC.busyM, or null. */
  busy(p: LngLat): BusyLine | null;
}

export function probeOf(signals: Signals, origin: LngLat): Probe {
  const proj = projector(origin);
  const key = (x: number, y: number) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;
  // Green: each area under the cells its box covers.
  const greenCells = new Map<string, number[]>();
  const greenXY = signals.green.map((g) => g.rings.map((r) => r.map(proj)));
  greenXY.forEach((rings, i) => {
    const xs = rings[0].map((q) => q[0]);
    const ys = rings[0].map((q) => q[1]);
    for (let cx = Math.floor(Math.min(...xs) / CELL); cx <= Math.floor(Math.max(...xs) / CELL); cx++)
      for (let cy = Math.floor(Math.min(...ys) / CELL); cy <= Math.floor(Math.max(...ys) / CELL); cy++) {
        const k = `${cx},${cy}`;
        (greenCells.get(k) ?? greenCells.set(k, []).get(k)!).push(i);
      }
  });
  const inXY = (p: XY, rings: XY[][]) => inRings(p as unknown as LngLat, rings as unknown as LngLat[][]);
  // Busy: each stretch of line under the cells within reach of it.
  const busyCells = new Map<string, { a: XY; b: XY; i: number }[]>();
  signals.busy.forEach((line, i) => {
    for (const l of line.lines) {
      const pts = l.map(proj);
      for (let k = 1; k < pts.length; k++) {
        const a = pts[k - 1];
        const b = pts[k];
        const pad = SCENIC.busyM;
        for (let cx = Math.floor((Math.min(a[0], b[0]) - pad) / CELL); cx <= Math.floor((Math.max(a[0], b[0]) + pad) / CELL); cx++)
          for (let cy = Math.floor((Math.min(a[1], b[1]) - pad) / CELL); cy <= Math.floor((Math.max(a[1], b[1]) + pad) / CELL); cy++) {
            const c = `${cx},${cy}`;
            (busyCells.get(c) ?? busyCells.set(c, []).get(c)!).push({ a, b, i });
          }
      }
    }
  });
  const segDist = (p: XY, a: XY, b: XY) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2)) : 0;
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  };
  return {
    green(p) {
      const xy = proj(p);
      for (const i of greenCells.get(key(xy[0], xy[1])) ?? []) if (inXY(xy, greenXY[i])) return signals.green[i];
      return null;
    },
    busy(p) {
      const xy = proj(p);
      let best: BusyLine | null = null;
      for (const s of busyCells.get(key(xy[0], xy[1])) ?? []) {
        const line = signals.busy[s.i];
        if ((!best || line.grade > best.grade) && segDist(xy, s.a, s.b) <= SCENIC.busyM) best = line;
      }
      return best;
    },
  };
}
