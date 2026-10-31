import { bearingDeg, distanceM, distanceToLinesM, filterFixes, withoutPauses, type PauseSpan } from '../geo';
import type { LngLat, StreetSegment, TracePoint } from '../types';
import { isOffered } from './places';
import type { CategoryId, Offered, Place } from './types';

/** Ambient's numbers (A4-A6, A10). */
export const AMBIENT_RULES = {
  /** A candidate is this close... */
  reachM: 150,
  /** ...and within this of straight ahead. */
  coneDeg: 45,
  /** On or beside an unwalked street: within this of one. */
  streetM: 30,
  perWalk: 3,
  gapMs: 10 * 60_000,
  /** This share of walks have no alerts at all. */
  silentWalkP: 0.25,
  /** Each eligible candidate then passes this coin. */
  coinP: 0.5,
  /** An ambient mark shows its name only on arrival. */
  revealM: 30,
  /** The heading without a course: the bearing from a fix this far back. */
  backMinM: 20,
  backMaxM: 30,
  /** A device course counts once moving at least this fast. */
  courseSpeed: 0.5,
} as const;

/** One plain phrase per category: the tiles can't say "a mural" (A7). */
const NOUN: Record<CategoryId, string> = {
  art: 'Some art',
  food: 'Somewhere to eat',
  shops: 'A shop',
  history: 'Some history',
  parks: 'A green space',
  culture: 'Something cultural',
  viewpoints: 'A view',
  nightlife: 'A bar',
};

export type Side = 'left' | 'right' | 'ahead';

/** "Some art, 120 m ahead, on your left": category, distance to 10 m, side, never the name (A7). */
export function ambientText(category: CategoryId, meters: number, side: Side): string {
  const d = Math.max(10, Math.round(meters / 10) * 10);
  return `${NOUN[category]}, ${d} m ahead${side === 'ahead' ? '' : `, on your ${side}`}`;
}

/** A stable draw per walk: a restart never redraws whether the walk is silent (A6). */
export function walkSilent(walkId: string): boolean {
  let h = 2166136261;
  for (let i = 0; i < walkId.length; i++) h = Math.imul(h ^ walkId.charCodeAt(i), 16777619);
  return (h >>> 0) / 2 ** 32 < AMBIENT_RULES.silentWalkP;
}

/**
 * The way the walker is going (A4): the device's course while moving, else
 * the bearing from the latest fix 20-30 m back. Neither: null, and no alert.
 */
export function headingOfFixes(fixes: TracePoint[]): number | null {
  const last = fixes[fixes.length - 1];
  if (!last) return null;
  if (last.course != null && last.course >= 0 && (last.speed ?? 0) >= AMBIENT_RULES.courseSpeed) return last.course;
  const here: LngLat = [last.lon, last.lat];
  for (let i = fixes.length - 2; i >= 0; i--) {
    const p: LngLat = [fixes[i].lon, fixes[i].lat];
    const d = distanceM(p, here);
    if (d < AMBIENT_RULES.backMinM) continue;
    return d <= AMBIENT_RULES.backMaxM ? bearingDeg(p, here) : null;
  }
  return null;
}

/** Signed degrees from the heading to the bearing, -180..180. */
const turn = (heading: number, bearing: number) => ((bearing - heading + 540) % 360) - 180;

/**
 * The ambient gate (A2-A8), run on each batch of fixes in the location task
 * and in front alike. Returns the one place to hint at, or null.
 */
export function ambientCheck(o: {
  enabled: boolean;
  quiet: boolean;
  walkId: string;
  startedAt: number;
  pauses: PauseSpan[];
  /** This walk's raw fixes; the gate filters them itself (A3). */
  fixes: TracePoint[];
  places: Place[];
  /** Pieces no walk has credited, and not walked this walk. */
  unwalked: StreetSegment[];
  offered: Offered[];
  fired: { count: number; lastAt: number | null };
  now: number;
  /** A scan mark being pursued, or an ambient mark open (A8). */
  pursuing: boolean;
  random?: () => number;
}): { place: Place; distanceM: number; side: Side; text: string } | null {
  if (!o.enabled || o.quiet || o.pursuing || walkSilent(o.walkId)) return null;
  if (o.fired.count >= AMBIENT_RULES.perWalk) return null;
  if (o.fired.lastAt != null && o.now - o.fired.lastAt < AMBIENT_RULES.gapMs) return null;
  const fixes = filterFixes(withoutPauses(o.fixes, o.pauses), o.startedAt);
  const heading = headingOfFixes(fixes);
  const last = fixes[fixes.length - 1];
  if (heading == null || !last) return null;
  const here: LngLat = [last.lon, last.lat];
  let best: { place: Place; d: number; t: number } | null = null;
  for (const p of o.places) {
    const d = distanceM(here, p.at);
    if (d > AMBIENT_RULES.reachM || (best && d >= best.d)) continue;
    const t = turn(heading, bearingDeg(here, p.at));
    if (Math.abs(t) > AMBIENT_RULES.coneDeg) continue;
    if (isOffered(p, o.offered)) continue;
    if (!o.unwalked.some((s) => distanceToLinesM(p.at, s.geometry) <= AMBIENT_RULES.streetM)) continue;
    best = { place: p, d, t };
  }
  if (!best) return null;
  if ((o.random ?? Math.random)() >= AMBIENT_RULES.coinP) return null;
  const side: Side = best.t < -10 ? 'left' : best.t > 10 ? 'right' : 'ahead';
  return { place: best.place, distanceM: best.d, side, text: ambientText(best.place.category, best.d, side) };
}
