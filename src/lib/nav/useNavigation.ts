import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { planViews, type WalkMapHandle } from '../../components/map/types';
import { db } from '../db';
import { boundsOf, type Bounds } from '../geo';
import { mapReads } from '../mapReads';
import { withTimeout } from '../places';
import { deriveSegments } from '../streets';
import { formatDistance } from '../summary';
import type { LngLat, StreetSegment, Walk } from '../types';
import { announceStep, navStep, routeTo, startNav, tooFar, type NavState } from './navigator';
import { clearNav, loadNav, saveNav } from './store';
import { streetRouteSource } from './streetRoute';
import { traceRouteSource } from './traceRoute';
import type { RouteSource, Waypoint } from './types';

/** Streets are read this far around both ends of a route. */
const AREA_PAD_M = 300;
/** Each view of the street read may take a few seconds; the read gets this long per view, within these bounds. */
const VIEW_MS = 5000;
const READ_MIN_MS = 15_000;
const READ_MAX_MS = 90_000;
/** A failed re-route reads the streets around you again, at most this often. */
const REREAD_MS = 60_000;

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
  onNotice: (message: string) => void;
}) {
  const [nav, setNav] = useState<NavState | null>(null);
  const [finding, setFinding] = useState(false);
  const navRef = useRef<NavState | null>(null);
  const sources = useRef<RouteSource[]>([]);
  // Where you are heading before there is a fix to route from (a walk just started from the home).
  const pending = useRef<Waypoint | null>(null);
  const busy = useRef(false);
  const cancelled = useRef(false);
  const rereadAt = useRef(0);
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
    pending.current = null;
    sources.current = [];
    clearNav().catch(() => {});
  }, []);

  /** Streets for an area, read from the map now (cancellable) and from the cache. */
  const readStreets = async (bounds: Bounds, ends: LngLat[]): Promise<RouteSource> => {
    const m = latest.current.map();
    let read: StreetSegment[] = [];
    if (m) {
      const { width, height } = m.size();
      const views = planViews(bounds, width, height, ends);
      const ms = Math.min(READ_MAX_MS, Math.max(READ_MIN_MS, views.length * VIEW_MS));
      // One map read at a time: a scan in progress holds the camera, and the cache stands in.
      const features = await mapReads
        .run(() => withTimeout(m.collect(views, () => cancelled.current), ms, 'The map'))
        .catch(() => null);
      if (features) read = deriveSegments(features.roads, features.names);
    }
    const cached = await db.getSegmentsIn(bounds).catch(() => [] as StreetSegment[]);
    return streetRouteSource([...new Map([...cached, ...read].map((s) => [s.id, s])).values()]);
  };

  /** The streets already cached between two points: no camera moves. */
  const cachedStreets = async (bounds: Bounds): Promise<RouteSource> => {
    const segs = await db.getSegmentsIn(bounds).catch(() => [] as StreetSegment[]);
    const s = streetRouteSource(segs);
    return { ...s, id: 'cached-streets' };
  };

  const goTo = useCallback(async (dest: Waypoint): Promise<void> => {
    const { walk, here } = latest.current;
    if (!walk || busy.current) return;
    busy.current = true;
    cancelled.current = false;
    const fail = (message: string) => {
      // A destination that can't be reached is forgotten, so a reload doesn't try it again.
      clearNav().catch(() => {});
      latest.current.onError(message);
    };
    try {
      const pauses = await db.getPauses(walk.id);
      const points = await db.getPoints(walk.id);
      const last = points[points.length - 1];
      const from: LngLat | null = here ?? (last ? [last.lon, last.lat] : null);
      if (!from) {
        // No position yet: route as soon as the first fix arrives.
        pending.current = dest;
        latest.current.onNotice('Waiting for your position');
        return;
      }
      pending.current = null;
      if (tooFar(from, dest.at)) return fail('Too far to walk from here');
      setFinding(true);
      // Back along this walk, for its start or a capture (walk me back), against the streets
      // already cached around you; the shorter wins, so it never retraces a detour (owner, Nov 1).
      const list: RouteSource[] = [];
      if (dest.kind === 'start' || dest.kind === 'capture') {
        list.push(traceRouteSource(points, pauses, walk.started_at));
        list.push(await cachedStreets(boundsOf([from, dest.at], AREA_PAD_M)!));
      }
      let found = routeTo(list, from, dest.at, 'shortest');
      if (!found.route) {
        list.push(await readStreets(boundsOf([from, dest.at], AREA_PAD_M)!, [from, dest.at]));
        if (cancelled.current) return;
        found = routeTo(list, from, dest.at, 'shortest');
      }
      if (!found.route) {
        // A loop skips a leg it can't route, and says so (L13).
        const [next, ...rest] = dest.legs ?? [];
        if (next) {
          latest.current.onNotice(`No route to ${dest.label}: on to ${next.label}`);
          busy.current = false;
          setFinding(false);
          await goToRef.current?.({ ...next, legs: rest });
          return;
        }
        return fail(found.reason ?? 'No walking route found nearby');
      }
      // Stopped while the route was being found: nothing to navigate.
      if (!(await db.getWalk(walk.id))?.open) return;
      sources.current = list;
      rereadAt.current = Date.now();
      apply(startNav(dest, found.route, Date.now()));
      AccessibilityInfo.announceForAccessibility(`Navigating to ${dest.label}, ${formatDistance(found.route.lengthM)}`);
      await saveNav(walk.id, dest);
    } finally {
      busy.current = false;
      setFinding(false);
    }
  }, []);

  const goToRef = useRef(goTo);
  useEffect(() => {
    goToRef.current = goTo;
  }, [goTo]);

  /** Stops finding a route: the street read ends after the view at hand. */
  const cancel = useCallback(() => {
    cancelled.current = true;
    pending.current = null;
    clearNav().catch(() => {});
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

  // Each accepted fix: a waiting destination is routed; then distance left,
  // off the route, arrival. Handled just after the fix is published.
  const { here, lastFixAt, paused } = opts;
  useEffect(() => {
    if (!here || paused) return;
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      if (pending.current && !navRef.current && !busy.current) {
        goTo(pending.current).catch(() => {});
        return;
      }
      const s = navRef.current;
      if (!s) return;
      const now = Date.now();
      const step = navStep(s, here, now);
      if (step.state.arrived) {
        latest.current.onArrive(s.dest);
        end();
        // A loop goes on to its next leg (L13).
        const [next, ...rest] = s.dest.legs ?? [];
        if (next) goTo({ ...next, legs: rest }).catch(() => {});
        return;
      }
      let next = step.state;
      if (announceStep(s.leftM, next.leftM)) AccessibilityInfo.announceForAccessibility(`${formatDistance(next.leftM)} left to ${s.dest.label}`);
      if (step.reroute) {
        const again = routeTo(sources.current, here, s.dest.at, 'shortest').route;
        if (again) {
          next = { ...next, route: again, leftM: again.lengthM, offCount: 0, offRoute: false };
          latest.current.onNotice('New route');
          AccessibilityInfo.announceForAccessibility(`New route, ${formatDistance(again.lengthM)} to ${s.dest.label}`);
        } else if (now - rereadAt.current >= REREAD_MS && !busy.current) {
          // Off the streets read before: read the ones around you, then try again.
          rereadAt.current = now;
          busy.current = true;
          readStreets(boundsOf([here, s.dest.at], AREA_PAD_M)!, [here, s.dest.at])
            .then((streets) => {
              sources.current = [...sources.current.filter((x) => x.id !== streets.id), streets];
            })
            .catch(() => {})
            .finally(() => {
              busy.current = false;
            });
        }
      }
      apply(next);
    });
    return () => {
      alive = false;
    };
  }, [here, lastFixAt, paused, end, goTo]);

  /** Renames the destination in place: a mark, once revealed, is called by its name (S12). */
  const relabel = useCallback((label: string) => {
    const s = navRef.current;
    const walk = latest.current.walk;
    if (!s || s.dest.label === label || !walk) return;
    const dest = { ...s.dest, label };
    apply({ ...s, dest });
    saveNav(walk.id, dest).catch(() => {});
  }, []);

  return { nav, finding, goTo, end, cancel, relabel };
}
