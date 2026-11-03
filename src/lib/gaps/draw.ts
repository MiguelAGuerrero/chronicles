import { lineLengthM } from '../geo';
import type { LngLat, StreetSegment } from '../types';
import { PieceGraph, type Gap } from './infer';
import { GAP_RULES } from './rules';

/**
 * Drawing a gap's way (the concept doc's Filling gaps tab, GW3-GW6). Pure: the
 * walker taps points along where they went, and each pair is joined along the
 * mapped paths, or straight where there is no path within GAP_RULES.joinM.
 */

export interface Draw {
  gap: Gap;
  /** The tapped points, in order, after the fix before the gap. */
  points: LngLat[];
}

export interface DrawnLine {
  /** From the fix before the gap, through every tap, and to the fix after once done. */
  path: LngLat[];
  lengthM: number;
  /** How many joins were straight: no path near a point, or none between two. */
  straight: number;
  /** Done, and faster than walking over the gap's time (GW6): said, never refused. */
  fast: boolean;
}

export const startDraw = (gap: Gap): Draw => ({ gap, points: [] });
export const addPoint = (d: Draw, p: LngLat): Draw => ({ ...d, points: [...d.points, p] });
/** Removes the last tapped point; the fix before the gap stays (GW4). */
export const undoPoint = (d: Draw): Draw => ({ ...d, points: d.points.slice(0, -1) });

/**
 * The line drawn so far (GW3), or done (GW5): the fix before the gap, each
 * tap, then the fix after. Each pair is joined by the shortest way over the
 * paths between them, never through another point's join, else straight.
 */
export function drawnLine(d: Draw, segments: StreetSegment[], opts: { done: boolean }): DrawnLine {
  const stops = [d.gap.from, ...d.points, ...(opts.done ? [d.gap.to] : [])];
  const path: LngLat[] = [stops[0]];
  let straight = 0;
  if (stops.length > 1) {
    const graph = segments.length ? PieceGraph.of(segments, d.gap.from) : null;
    const ends = stops.map((p) => graph?.joinFix(p) ?? null);
    const joined = new Set(ends.filter((e): e is number => e != null));
    for (let i = 1; i < stops.length; i++) {
      const a = ends[i - 1];
      const b = ends[i];
      let way: LngLat[] | null = null;
      if (graph && a != null && b != null && a !== b) {
        // Never through another tap's join: that would cut across off the paths.
        const others = new Set([...joined].filter((e) => e !== a && e !== b));
        const w = graph.shortest(a, b, Infinity, undefined, others);
        if (w) way = w.nodes.slice(1).map((n) => graph.pts[n]);
      }
      if (!way) {
        straight++;
        way = [stops[i]];
      }
      // The join's own end is the tapped point itself, so the line passes through every tap.
      way[way.length - 1] = stops[i];
      path.push(...way);
    }
  }
  const lengthM = lineLengthM(path);
  const seconds = (d.gap.t1 - d.gap.t0) / 1000;
  return { path, lengthM, straight, fast: opts.done && seconds > 0 && lengthM / seconds > GAP_RULES.maxPace };
}
