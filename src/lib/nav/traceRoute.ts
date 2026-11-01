import { distanceM, isBreak, smoothDwells, type PauseSpan } from '../geo';
import { readTrace } from '../rides';
import type { LngLat, TracePoint } from '../types';
import { WalkGraph } from './graph';
import { NAV } from './rules';
import type { RouteSource } from './types';

/** Trace points closer than this along the walk are thinned, so a long walk stays a small graph. */
const STEP_M = 8;
/** A shortcut skips only a stretch at least this long that came back near itself: a loop, not a corner. */
const LOOP_MIN_M = 100;

/**
 * Routes along ground this walk covered (walk me back): the trace as a graph,
 * with a shortcut wherever it passed within NAV.loopM of itself, so a loop
 * is cut across rather than walked again (N1, N2). Pauses and gaps are not
 * joined: nothing was walked across them.
 */
export function traceRouteSource(points: TracePoint[], pauses: PauseSpan[], startedAt: number | null = null, stills: PauseSpan[] = []): RouteSource {
  // Walked ground only: walk me back never follows a ride (R13), and a ride breaks the trace.
  const { walked, breaks } = readTrace(points, startedAt, pauses, stills);
  const fixes = smoothDwells(walked);
  const g = new WalkGraph(fixes.length ? [fixes[0].lon, fixes[0].lat] : [0, 0]);
  // How far along the walk each point was, so a shortcut only skips a loop.
  const along: number[] = [];
  let prev: { i: number; f: TracePoint } | null = null;
  for (const f of fixes) {
    const p: LngLat = [f.lon, f.lat];
    const joined = prev && !isBreak(prev.f, f, breaks);
    if (prev && joined && distanceM(g.points[prev.i], p) < STEP_M) continue;
    const i = g.add(p);
    along[i] = prev && joined ? along[prev.i] + distanceM(g.points[prev.i], p) : (prev ? along[prev.i] + LOOP_MIN_M : 0);
    if (prev && joined) g.link(prev.i, i);
    prev = { i, f };
  }
  // Shortcuts where the walk came back near itself: two points within
  // NAV.loopM of each other, but a loop apart along the walk. Points either
  // side of a corner are close too, and only a little apart along it: that
  // corner is walked round, never cut through a building.
  for (let i = 0; i < g.points.length; i++) {
    for (const j of g.within(g.points[i], NAV.loopM)) {
      if (j > i + 1 && Math.abs(along[j] - along[i]) >= LOOP_MIN_M) g.link(i, j);
    }
  }
  const id = 'trace';
  return {
    id,
    route(from, to) {
      // Joined from where you stand to the nearest point you walked (N1),
      // within NAV.joinM: further off, a straight line would cross blocks,
      // and the streets take over.
      const a = g.nearest(from, NAV.joinM);
      const b = g.nearest(to, NAV.joinM);
      if (a == null || b == null) return null;
      const s = g.shortest(a, b);
      if (!s) return null;
      const path: LngLat[] = [from, ...s.path.map((i) => g.points[i]), to];
      return { path, lengthM: distanceM(from, g.points[a]) + s.m + distanceM(g.points[b], to), source: id };
    },
  };
}
