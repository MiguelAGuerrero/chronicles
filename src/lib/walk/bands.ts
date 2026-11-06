// @layer core
import type { Band, WayFacts } from './types';

/*
 * What a way is to someone on foot (WK5-WK8). One fixed table, judged from the way's own tags and from
 * whether a footway runs beside it (match.ts decides that). Pure; bands are derived on read and never
 * stored (WK9), so changing the table means bumping WALK_CODE, which drops the cached tiles' results.
 */

/** Bump when the table below changes (WK9). */
export const WALK_CODE = 'w2';

/** A calm street: at or under this the sidewalk makes it easy on foot (WK5). 50 km/h is 30 mph. */
export const CALM_KMH = 50;
/** At or over this, with nothing beside the road, it is built around cars (WK5). 70 km/h is 45 mph. */
export const FAST_KMH = 70;

/** Ways made for people. */
const PEOPLE = new Set(['pedestrian', 'living_street', 'footway', 'path', 'steps']);
/** Classes that carry traffic first. */
const MAJOR = new Set(['primary', 'secondary']);
/** Classes judged by their tags. Anything else (service, track, cycleway...) is too little to say. */
const JUDGED = new Set(['primary', 'secondary', 'tertiary', 'residential', 'unclassified']);

/** Footway kinds that run beside a street (a sidewalk, or a plain path), as opposed to across it or up steps. */
export const isBeside = (w: Pick<WayFacts, 'cls' | 'sub'>) =>
  (w.cls === 'footway' || w.cls === 'path' || w.cls === 'pedestrian') && w.sub !== 'crosswalk';

export const isCrossing = (w: Pick<WayFacts, 'cls' | 'sub'>) => w.cls === 'footway' && w.sub === 'crosswalk';

/**
 * WK5, WK7: the band of one way. `near.path` says a separate footway runs beside it on its own level
 * (WK6). Nothing mapped is not absent: no sidewalk data alone never makes a street `car`.
 */
export function bandOf(w: WayFacts, near: { path: boolean }): Band {
  if (PEOPLE.has(w.cls)) return 'foot';
  const walkway = near.path || (w.sidewalk !== undefined && w.sidewalk !== 'none');
  if (w.cls === 'motorway' || w.cls === 'trunk') return walkway ? 'mixed' : 'car';
  if (!JUDGED.has(w.cls)) return 'unknown';
  const speed = w.speedKmh;
  if (walkway) return (speed ?? 0) <= CALM_KMH && !MAJOR.has(w.cls) ? 'foot' : 'mixed';
  if (speed !== undefined && speed >= FAST_KMH) return 'car';
  if (w.sidewalk === 'none' && MAJOR.has(w.cls)) return 'car';
  if (w.cls === 'unclassified' && speed === undefined && w.sidewalk === undefined) return 'unknown';
  return 'mixed';
}
