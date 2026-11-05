// @layer view
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { planViews, type WalkMapHandle } from '../../components/map/types';
import { db } from '../db';
import { boundsOf, type Bounds } from '../geo';
import { mapReads } from '../mapReads';
import { withTimeout } from '../placeAll';
import { deriveSegments } from '../streets';
import { formatDistance } from '../summary';
import type { LngLat, StreetSegment, Walk } from '../types';
import { routeLeanings } from '../routeLeanings';
import { getUnits } from '../units';
import { aboutTimeLeft, DEFAULT_PACE_MPS, timeAtPaceMs } from './eta';
import { announceStep, navStep, routeTo, startNav, tooFar, type NavState } from './navigator';
import { routeOptions, scenicPlan, scenicRouteSource, type RouteOption } from './scenic';
import { scenicRead } from './scenicRead';
import type { Signals } from './scenicSignals';
import { clearNav, loadNav, saveNav } from './store';
import { streetRouteSource, type StreetSource } from './streetRoute';
import { traceRouteSource } from './traceRoute';
import type { Route, RouteSource, Waypoint } from './types';

/** Streets are read this far around both ends of a route. */
const AREA_PAD_M = 300;
/** Each view of the street read may take a few seconds; the read gets this long per view, within these bounds. */
const VIEW_MS = 5000;
const READ_MIN_MS = 15_000;
const READ_MAX_MS = 90_000;
/** A failed re-route reads the streets around you again, at most this often. */
const REREAD_MS = 60_000;
/** The scenic read (tiles and Overture for the corridor) gets this long; then the direct way (SR9). */
const SCENIC_READ_MS = 30_000;

/** The destination with no scenic leaning: the direct way there. */
function directTo(dest: Waypoint): Waypoint {
  const out = { ...dest };
  delete out.leanings;
  return out;
}

/** Scenic routes (SR2, SR8): the routes offered for a destination, and the one highlighted. */
export interface RoutePreview {
  dest: Waypoint;
  options: RouteOption[];
  selected: number;
}

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
  /** The way you are walking (headingOf): a route starts on the street you are on (NB7). */
  heading?: number | null;
  /** On a ride (rides, R12): no re-route and no "off your route"; arriving still counts. */
  riding?: boolean;
  map: () => WalkMapHandle | null;
  onArrive: (dest: Waypoint) => void;
  /** A route that couldn't be found names where it was asked for, so the screen can offer Open in Maps (NH5). */
  onError: (message: string, dest?: Waypoint) => void;
  onNotice: (message: string) => void;
  /** This walk's pace in m/s, read when a time left is announced (QL18); 1.3 m/s without one. */
  pace?: () => number;
}) {
  const [nav, setNav] = useState<NavState | null>(null);
  const [finding, setFinding] = useState(false);
  const [preview, setPreviewState] = useState<RoutePreview | null>(null);
  const previewRef = useRef<RoutePreview | null>(null);
  const setPreview = (p: RoutePreview | null) => {
    previewRef.current = p;
    setPreviewState(p);
  };
  // The streets and signals the preview's routes were found on, for the chosen one's re-routes (SR10).
  const previewRead = useRef<{ streets: StreetSource; signals: Signals } | null>(null);
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
  /** "about 6 minutes" at this walk's pace, for the start and stepped announcements (QL18). */
  const timeLeftSaid = (leftM: number) => aboutTimeLeft(timeAtPaceMs(leftM, latest.current.pace?.() ?? DEFAULT_PACE_MPS));

  const end = useCallback(() => {
    apply(null);
    setPreview(null);
    previewRead.current = null;
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

  /** Navigating starts: the route, the sources its re-routes use, the announcement, the destination kept. */
  const begin = useCallback(async (walkId: string, dest: Waypoint, route: Route, list: RouteSource[]) => {
    sources.current = list;
    rereadAt.current = Date.now();
    apply(startNav(dest, route, Date.now()));
    AccessibilityInfo.announceForAccessibility(`Navigating to ${dest.label}, ${formatDistance(route.lengthM)}, ${timeLeftSaid(route.lengthM)}`);
    await saveNav(walkId, dest);
  }, []);

  const goTo = useCallback(async (dest: Waypoint): Promise<void> => {
    const { walk, here } = latest.current;
    if (!walk || busy.current) return;
    busy.current = true;
    cancelled.current = false;
    setPreview(null);
    previewRead.current = null;
    const fail = async (message: string) => {
      // A destination that can't be reached is forgotten, so a reload doesn't try it again.
      clearNav().catch(() => {});
      latest.current.onError(message, dest);
    };
    try {
      const pauses = await db.getPauses(walk.id);
      const stills = await db.getStills(walk.id).catch(() => []);
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
      if (tooFar(from, dest.at)) return await fail('Too far to walk from here');
      setFinding(true);
      const hint0 = { heading: here ? latest.current.heading : null };
      // Scenic routes (SR2, SR9, SR11, SR12): a chosen leaning (a reload) routes on it again; otherwise,
      // with a leaning on and within reach, the corridor is read and the routes offered side by side.
      const leanings = dest.leanings ?? routeLeanings.store.get();
      const plan = scenicPlan(dest, from, leanings, getUnits());
      if (!plan.scenic && plan.notice) latest.current.onNotice(plan.notice);
      if (plan.scenic) {
        const read = await withTimeout(scenicRead.read(from, dest.at, () => cancelled.current), SCENIC_READ_MS, 'The scenic read').catch(() => null);
        if (cancelled.current) return;
        if (read) {
          const cached = await db.getSegmentsIn(boundsOf([from, dest.at], AREA_PAD_M)!).catch(() => [] as StreetSegment[]);
          const streets = streetRouteSource([...new Map([...cached, ...read.segments].map((x) => [x.id, x])).values()]);
          if (!(await db.getWalk(walk.id))?.open) return;
          if (dest.leanings) {
            const src = scenicRouteSource(streets, read.signals, dest.leanings);
            const r = src.route(from, dest.at, hint0);
            if (r) return await begin(walk.id, dest, r, [src]);
          } else {
            const options = routeOptions({ streets, signals: read.signals, leanings, from, to: dest.at, hint: hint0 });
            if (options.length > 1) {
              previewRead.current = { streets, signals: read.signals };
              setPreview({ dest, options, selected: 0 });
              AccessibilityInfo.announceForAccessibility(`${options.length} routes to ${dest.label}`);
              return;
            }
            latest.current.onNotice('No scenic way nearby');
            if (options.length === 1) return await begin(walk.id, dest, options[0].route, [streets]);
          }
        } else if (!dest.leanings) latest.current.onNotice('No scenic way nearby');
      }
      // Back along this walk, for its start or a capture (walk me back), against the streets
      // already cached around you; the shorter wins, so it never retraces a detour (owner, Nov 1).
      const list: RouteSource[] = [];
      if (dest.kind === 'start' || dest.kind === 'capture') {
        list.push(traceRouteSource(points, pauses, walk.started_at, stills));
        list.push(await cachedStreets(boundsOf([from, dest.at], AREA_PAD_M)!));
      }
      const hint = { heading: here ? latest.current.heading : null };
      let found = routeTo(list, from, dest.at, 'shortest', hint);
      if (!found.route) {
        list.push(await readStreets(boundsOf([from, dest.at], AREA_PAD_M)!, [from, dest.at]));
        if (cancelled.current) return;
        found = routeTo(list, from, dest.at, 'shortest', hint);
      }
      if (!found.route) return await fail(found.reason ?? 'No walking route found nearby');
      // Stopped while the route was being found: nothing to navigate.
      if (!(await db.getWalk(walk.id))?.open) return;
      // A scenic leaning that couldn't be routed again is dropped: this is the direct way (SR11).
      await begin(walk.id, directTo(dest), found.route, list);
    } finally {
      busy.current = false;
      setFinding(false);
    }
  }, [begin]);

  /** Stops finding a route: the street read ends after the view at hand. */
  const cancel = useCallback(() => {
    cancelled.current = true;
    pending.current = null;
    clearNav().catch(() => {});
  }, []);

  /** SR8: highlights one of the preview's routes. */
  const select = useCallback((i: number) => {
    const p = previewRef.current;
    if (p && i >= 0 && i < p.options.length && i !== p.selected) setPreview({ ...p, selected: i });
  }, []);

  /** SR8: Go on a row: navigating starts on that route, its re-routes keeping its leaning (SR10). */
  const choose = useCallback((i: number) => {
    const walk = latest.current.walk;
    const read = previewRead.current;
    const p = previewRef.current;
    const o = p?.options[i];
    if (!p || !o || !walk || !read) return;
    const dest: Waypoint = o.leanings.length ? { ...directTo(p.dest), leanings: o.leanings } : directTo(p.dest);
    const list: RouteSource[] = o.leanings.length ? [scenicRouteSource(read.streets, read.signals, o.leanings)] : [read.streets];
    setPreview(null);
    previewRead.current = null;
    void begin(walk.id, dest, o.route, list);
  }, [begin]);

  /** SR8: Cancel, Back or Escape on the preview: no destination is set. */
  const dismiss = useCallback(() => {
    setPreview(null);
    previewRead.current = null;
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
        return;
      }
      let next = step.state;
      // A bus or trolley follows its own line: leaving the route on one is not getting lost (R12).
      const riding = !!latest.current.riding;
      if (riding) next = { ...next, offCount: 0, offRoute: false };
      if (announceStep(s.leftM, next.leftM)) AccessibilityInfo.announceForAccessibility(`${formatDistance(next.leftM)}, ${timeLeftSaid(next.leftM)} left to ${s.dest.label}`);
      if (step.reroute && !riding) {
        const again = routeTo(sources.current, here, s.dest.at, 'shortest', { heading: latest.current.heading }).route;
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

  return { nav, finding, preview, goTo, end, cancel, relabel, select, choose, dismiss };
}
