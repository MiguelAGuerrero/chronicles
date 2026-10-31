import { useCallback, useEffect, useRef, useState } from 'react';
import { planViews, type WalkMapHandle } from '../../components/map/types';
import { db } from '../db';
import { boundsOf } from '../geo';
import { withTimeout } from '../places';
import { deriveSegments } from '../streets';
import type { LngLat, StreetSegment, Walk } from '../types';
import { navStep, routeTo, startNav, tooFar, type NavState } from './navigator';
import { clearNav, loadNav, saveNav } from './store';
import { streetRouteSource } from './streetRoute';
import { traceRouteSource } from './traceRoute';
import type { RouteSource, Waypoint } from './types';

/** Streets are read this far around both ends of a route. */
const AREA_PAD_M = 300;
const COLLECT_MS = 30_000;

/**
 * Navigating inside a walk (the owner's call): routes are computed on the
 * device, along this walk's trace for walk me back and over the streets read
 * from the map for any other point. Each accepted fix updates the distance
 * left, notices leaving the route (and re-routes), and notices arriving. The
 * walk keeps recording throughout.
 */
export function useNavigation(opts: {
  walk: Walk | null;
  here: LngLat | null;
  lastFixAt: number | null;
  paused: boolean;
  map: () => WalkMapHandle | null;
  onArrive: (dest: Waypoint) => void;
  onError: (message: string) => void;
}) {
  const [nav, setNav] = useState<NavState | null>(null);
  const [finding, setFinding] = useState(false);
  const navRef = useRef<NavState | null>(null);
  const sources = useRef<RouteSource[]>([]);
  const latest = useRef(opts);
  useEffect(() => {
    latest.current = opts;
  });
  const apply = (s: NavState | null) => {
    navRef.current = s;
    setNav(s);
  };

  const end = useCallback(() => {
    apply(null);
    sources.current = [];
    clearNav().catch(() => {});
  }, []);

  const goTo = useCallback(async (dest: Waypoint) => {
    const { walk, here, map } = latest.current;
    if (!walk) return;
    const pauses = await db.getPauses(walk.id);
    const points = await db.getPoints(walk.id);
    const last = points[points.length - 1];
    const from: LngLat | null = here ?? (last ? [last.lon, last.lat] : null);
    if (!from) {
      latest.current.onError('Waiting for your position');
      return;
    }
    if (tooFar(from, dest.at)) {
      latest.current.onError('Too far to walk from here');
      return;
    }
    setFinding(true);
    try {
      // Back along this walk first, for its start or a capture (walk me back).
      const list: RouteSource[] = [];
      if (dest.kind === 'start' || dest.kind === 'capture') list.push(traceRouteSource(points, pauses, walk.started_at));
      let found = routeTo(list, from, dest.at);
      if (!found.route) {
        // Streets around both ends: read from the map now, plus what is cached.
        const bounds = boundsOf([from, dest.at], AREA_PAD_M)!;
        const m = map();
        let read: StreetSegment[] = [];
        if (m) {
          const { width, height } = m.size();
          const features = await withTimeout(m.collect(planViews(bounds, width, height, [from, dest.at])), COLLECT_MS, 'The map').catch(() => null);
          if (features) read = deriveSegments(features.roads, features.names);
        }
        const cached = await db.getSegmentsIn(bounds).catch(() => [] as StreetSegment[]);
        const byId = new Map([...cached, ...read].map((s) => [s.id, s]));
        list.push(streetRouteSource([...byId.values()]));
        found = routeTo(list, from, dest.at);
      }
      if (!found.route) {
        latest.current.onError(found.reason ?? 'No walking route here');
        return;
      }
      sources.current = list;
      apply(startNav(dest, found.route, Date.now()));
      await saveNav(walk.id, dest);
    } finally {
      setFinding(false);
    }
  }, []);

  // A reload resumes where you were heading, with the route computed again (N13).
  const walkId = opts.walk?.id ?? null;
  useEffect(() => {
    if (!walkId) return;
    let alive = true;
    loadNav(walkId).then((dest) => {
      if (alive && dest && !navRef.current) goTo(dest).catch(() => {});
    });
    return () => {
      alive = false;
    };
  }, [walkId, goTo]);

  // Each accepted fix: distance left, off the route, arrival. Handled just
  // after the fix is published, not inside the effect itself.
  const { here, lastFixAt, paused } = opts;
  useEffect(() => {
    const s = navRef.current;
    if (!s || !here || paused) return;
    let alive = true;
    queueMicrotask(() => {
      if (!alive || navRef.current !== s) return;
      const now = Date.now();
      const step = navStep(s, here, now);
      if (step.state.arrived) {
        latest.current.onArrive(s.dest);
        end();
        return;
      }
      let next = step.state;
      if (step.reroute) {
        const again = routeTo(sources.current, here, s.dest.at).route;
        if (again) next = { ...next, route: again, leftM: again.lengthM, offCount: 0, offRoute: false };
      }
      apply(next);
    });
    return () => {
      alive = false;
    };
  }, [here, lastFixAt, paused, end]);

  return { nav, finding, goTo, end };
}
