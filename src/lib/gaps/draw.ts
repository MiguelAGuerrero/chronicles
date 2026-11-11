// @layer core
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
  /** The line up to the last tap, whatever `done` (the line shown while drawing). */
  sofar: LngLat[];
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
 * paths between them, never through another tap's join. A tap near a path
 * is taken onto it, so the line never spikes out to where the finger landed
 * (gap-drawing audit 2); a tap with no path near is joined straight. One graph,
 * one pass, for both the line so far and the line done (gap-drawing audit 9).
 */
export function drawnLine(d: Draw, segments: StreetSegment[], opts: { done: boolean }): DrawnLine {
  const stops = [d.gap.from, ...d.points, d.gap.to];
  const graph = segments.length ? PieceGraph.of(segments, d.gap.from) : null;
  // The fixes beside the gap carry the heading (GB3); a tap has none, so it joins its nearest street.
  const ends = stops.map((p, i) => graph?.joinFix(p, i === 0 ? d.gap.fromHeading : i === stops.length - 1 ? d.gap.toHeading : undefined) ?? null);
  const joined = ends.filter((e): e is number => e != null);
  const path: LngLat[] = [stops[0]];
  let sofar: LngLat[] = [stops[0]];
  let straight = 0;
  let straightSofar = 0;
  // Where the line now is in the graph: a node on a path, or null after a straight join from nowhere.
  let cur: number | null = ends[0];
  for (let i = 1; i < stops.length; i++) {
    const last = i === stops.length - 1;
    const target = ends[i];
    let leg: LngLat[] | null = null;
    let next: number | null = null;
    if (graph && cur != null && target != null && cur !== target) {
      const others = new Set(joined.filter((e) => e !== target && e !== cur));
      const w = graph.shortest(cur, target, Infinity, undefined, others);
      if (w && w.nodes.length > 1) {
        if (last) {
          leg = w.nodes.slice(1).map((n) => graph.pts[n]);
          leg[leg.length - 1] = stops[i];
        } else {
          // Up to the tap's own point on the path, never out to the tap itself.
          const body = w.nodes.slice(1, -1);
          leg = body.map((n) => graph.pts[n]);
          next = body.length ? body[body.length - 1] : cur;
        }
      }
    }
    if (!leg) {
      straight++;
      leg = [stops[i]];
      next = target;
    }
    path.push(...leg);
    cur = next;
    if (i === stops.length - 2) {
      sofar = path.slice();
      straightSofar = straight;
    }
  }
  const full = opts.done ? path : sofar;
  const lengthM = lineLengthM(full);
  const seconds = (d.gap.t1 - d.gap.t0) / 1000;
  return {
    path: full,
    sofar,
    lengthM,
    straight: opts.done ? straight : straightSofar,
    fast: opts.done && seconds > 0 && lengthM / seconds > GAP_RULES.maxPace,
  };
}
