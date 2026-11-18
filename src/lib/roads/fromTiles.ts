// @layer core
import type { LngLat } from '../types';
import { ROAD_RULES } from './rules';
import type { Road, RoadKind } from './types';

/*
 * Roads as a tile of the map gives them (RE5, RE6): the line features of its `transportation` layer whose class is one the engine
 * reads, with a link flagged by `ramp` and a sense by `oneway`. A tile's lines run a little past its edge, so each is cut to the
 * tile's own rectangle: a stretch is then read from one tile only, and the graph joins the halves again.
 */
export interface RoadTileFeature {
  class: string;
  oneway?: number | null;
  ramp?: number | boolean | null;
  lines: LngLat[][];
}

/** A tile's rectangle, [west, south, east, north], at any zoom. */
export function tileRect(z: number, x: number, y: number): [number, number, number, number] {
  const n = 2 ** z;
  const lon = (v: number) => (v / n) * 360 - 180;
  const lat = (v: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * v) / n))) * 180) / Math.PI;
  return [lon(x), lat(y + 1), lon(x + 1), lat(y)];
}

/** The parts of a line inside a rectangle (Liang-Barsky, a segment at a time). */
function clip(line: LngLat[], [w, s, e, n]: [number, number, number, number]): LngLat[][] {
  const out: LngLat[][] = [];
  let cur: LngLat[] = [];
  const close = () => {
    if (cur.length > 1) out.push(cur);
    cur = [];
  };
  for (let i = 0; i < line.length - 1; i++) {
    const [x0, y0] = line[i];
    const [x1, y1] = line[i + 1];
    const dx = x1 - x0;
    const dy = y1 - y0;
    let t0 = 0;
    let t1 = 1;
    let inside = true;
    for (const [p, q] of [[-dx, x0 - w], [dx, e - x0], [-dy, y0 - s], [dy, n - y0]]) {
      if (p === 0) {
        if (q < 0) inside = false;
      } else {
        const r = q / p;
        if (p < 0) {
          if (r > t1) inside = false;
          else if (r > t0) t0 = r;
        } else if (r < t0) inside = false;
        else if (r < t1) t1 = r;
      }
    }
    if (!inside) {
      close();
      continue;
    }
    const a: LngLat = [x0 + t0 * dx, y0 + t0 * dy];
    const b: LngLat = [x0 + t1 * dx, y0 + t1 * dy];
    if (t0 > 0) close();
    if (!cur.length) cur.push(a);
    cur.push(b);
    if (t1 < 1) close();
  }
  close();
  return out;
}

const KINDS: ReadonlySet<string> = new Set(ROAD_RULES.kinds);

/**
 * RE5, RE6: one tile's roads. `cut` null leaves the lines whole (hand-made roads in tests); otherwise each is cut to the tile.
 */
export function roadsFromTile(features: readonly RoadTileFeature[], z: number, x: number, y: number, cut: 'tile' | null = 'tile'): Road[] {
  const rect = cut ? tileRect(z, x, y) : null;
  const out: Road[] = [];
  for (const f of features) {
    if (!KINDS.has(f.class)) continue;
    const oneWay = f.oneway === 1 ? 1 : f.oneway === -1 ? -1 : 0;
    for (const line of f.lines) {
      for (const points of rect ? clip(line, rect) : [line]) {
        if (points.length > 1) out.push({ kind: f.class as RoadKind, link: f.ramp === 1 || f.ramp === true, oneWay, points });
      }
    }
  }
  return out;
}
