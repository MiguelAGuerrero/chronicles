import { bearingDeg, distanceM, distanceToLinesM, filterFixes, lineLengthM, nearPoints, stepToward, withoutPauses, type PauseSpan } from '../geo';
import type { LngLat, StreetSegment, TracePoint } from '../types';
import { isMarkable } from './noise';
import { isOffered } from './places';
import { isRevealed } from './scan';
import type { CategoryId, Mark, Offered, Place } from './types';

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
  /** A reminder goes first: no hint this soon after one (R7). */
  afterReminderMs: 60_000,
  /** A scan mark this close is being pursued (A8). */
  pursueM: 150,
  /** A piece whose middle the trace passed this close counts as walked this walk (A5). */
  onTraceM: 20,
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
function hash01(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^ (h >>> 16)) >>> 0) / 2 ** 32;
}
export function walkSilent(walkId: string): boolean {
  return hash01(walkId) < AMBIENT_RULES.silentWalkP;
}
/** Each place's coin, drawn once per walk: a batch a second must not re-toss it (A6, audit). */
export const coinFor = (walkId: string, placeKey: string) => hash01(`${walkId}|${placeKey}`) < AMBIENT_RULES.coinP;

/**
 * A8: a hint waits while a scan mark is pursued (navigating to it, or within
 * 150 m of an open one) or an ambient mark is open and not yet reached; once
 * you have arrived, it no longer holds the next one back (audit).
 */
export function isPursuing(o: { open: Mark[]; here: LngLat; fixes: LngLat[]; navMarkId: string | null }): boolean {
  return o.open.some((m) =>
    m.id === o.navMarkId ||
    (m.origin === 'ambient' ? !isRevealed(m, o.fixes) : distanceM(m.at, o.here) <= AMBIENT_RULES.pursueM));
}

/** The point halfway along a piece, not its middle vertex (often a junction). */
function midway(s: StreetSegment): LngLat {
  const line = s.geometry[0] ?? [];
  let left = lineLengthM(line) / 2;
  for (let i = 1; i < line.length; i++) {
    const d = distanceM(line[i - 1], line[i]);
    if (d >= left) return stepToward(line[i - 1], line[i], left);
    left -= d;
  }
  return line[line.length - 1] ?? [0, 0];
}

/** Pieces no walk has credited and this walk hasn't gone down (A5): along, not across. */
export function unwalkedPieces(segments: StreetSegment[], visited: Set<string>, fixes: LngLat[]): StreetSegment[] {
  const near = nearPoints(fixes, AMBIENT_RULES.onTraceM);
  return segments.filter((s) => !visited.has(s.id) && !near(midway(s)));
}

/**
 * The way the walker is going (A4): the device's course while moving, else
 * the bearing from the latest fix 20-30 m back. Neither: null, and no alert.
 */
export function headingOfFixes(fixes: TracePoint[]): number | null {
  const last = fixes[fixes.length - 1];
  if (!last) return null;
  const here: LngLat = [last.lon, last.lat];
  let back: number | null = null;
  for (let i = fixes.length - 2; i >= 0; i--) {
    const p: LngLat = [fixes[i].lon, fixes[i].lat];
    const d = distanceM(p, here);
    if (d < AMBIENT_RULES.backMinM) continue;
    if (d <= AMBIENT_RULES.backMaxM) back = bearingDeg(p, here);
    break;
  }
  const moving = last.course != null && last.course >= 0 && (last.speed ?? 0) >= AMBIENT_RULES.courseSpeed;
  // Trusted when the trace agrees with it, or, with no trace to check, when it isn't Android's 0 for "no bearing" (audit).
  if (moving && back != null) return Math.abs(turn(back, last.course!)) <= AMBIENT_RULES.coneDeg ? last.course! : back;
  if (moving && last.course !== 0) return last.course;
  return back;
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
  /** When a reminder last fired: it goes first (R7). */
  lastRecallAt?: number | null;
  /** Tests only: a coin in place of each place's own (coinFor). */
  random?: () => number;
}): { place: Place; distanceM: number; side: Side; text: string } | null {
  if (ambientBlocked(o)) return null;
  if (o.pursuing) return null;
  if (o.lastRecallAt != null && o.now - o.lastRecallAt < AMBIENT_RULES.afterReminderMs) return null;
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
    // Attractions only (S18-S20).
    if (!isMarkable(p)) continue;
    if (!o.unwalked.some((s) => distanceToLinesM(p.at, s.geometry) <= AMBIENT_RULES.streetM)) continue;
    // Each candidate passes its coin, the same one every batch.
    if (o.random ? o.random() >= AMBIENT_RULES.coinP : !coinFor(o.walkId, p.key)) continue;
    best = { place: p, d, t };
  }
  if (!best) return null;
  const side: Side = best.t < -10 ? 'left' : best.t > 10 ? 'right' : 'ahead';
  return { place: best.place, distanceM: best.d, side, text: ambientText(best.place.category, best.d, side) };
}

/** The cheap part of the gate, checked before anything is read (audit): off, quiet, a silent walk, or the budget spent. */
export function ambientBlocked(o: { enabled: boolean; quiet: boolean; walkId: string; fired: { count: number; lastAt: number | null }; now: number }): boolean {
  if (!o.enabled || o.quiet || walkSilent(o.walkId)) return true;
  if (o.fired.count >= AMBIENT_RULES.perWalk) return true;
  return o.fired.lastAt != null && o.now - o.fired.lastAt < AMBIENT_RULES.gapMs;
}
