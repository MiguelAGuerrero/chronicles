import { bearingDeg, distanceM, distanceToLinesM } from '../geo';
import { NAV } from '../nav/navigator';
import type { Waypoint } from '../nav/types';
import type { LngLat } from '../types';

/** On the walk (v1.5 slice 3, L13-L16). */
export const LANDING_WALK = {
  /** The loop stays within navigation's limit. */
  loopMaxM: NAV.maxM,
  /** On a strip: within this of its lines. */
  stripM: 30,
  /** A dead zone: further than this from every pocket... */
  deadM: 400,
  /** ...for this long... */
  deadMs: 10 * 60_000,
  /** ...with one within this to nudge toward. */
  nudgeM: 1500,
  /** Reaching the landing (a scan there). */
  arriveM: 30,
} as const;

export interface LoopLeg {
  at: LngLat;
  label: string;
}

/**
 * The loop (L13): from the landing through each pocket's centre, nearest
 * next each time, and back; a pocket is taken only while the loop, out and
 * back in straight lines, stays within the limit. The rest are left for
 * another walk.
 */
export function planLoop(start: LngLat, pockets: { name: string; centre: LngLat }[]): LoopLeg[] {
  const legs: LoopLeg[] = [];
  const left = [...pockets];
  let at = start;
  let walked = 0;
  while (left.length) {
    let best = 0;
    for (let i = 1; i < left.length; i++) if (distanceM(at, left[i].centre) < distanceM(at, left[best].centre)) best = i;
    const next = left[best];
    const leg = distanceM(at, next.centre);
    if (walked + leg + distanceM(next.centre, start) > LANDING_WALK.loopMaxM) break;
    walked += leg;
    legs.push({ at: next.centre, label: next.name });
    at = next.centre;
    left.splice(best, 1);
  }
  legs.push({ at: start, label: 'Start here' });
  return legs;
}

/** The strip you are on, within 30 m, for the quiet chip (L14). */
export function stripAt(here: LngLat, strips: { name: string; lines: LngLat[][] }[]): string | null {
  let best: string | null = null;
  let bestD: number = LANDING_WALK.stripM;
  for (const s of strips) {
    const d = distanceToLinesM(here, s.lines);
    if (d <= bestD) [best, bestD] = [s.name, d];
  }
  return best;
}

const COMPASS = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];

/**
 * The dead-zone nudge (L15): after 10 min further than 400 m from every
 * remembered pocket, the nearest within 1.5 km, once a walk, never on a quiet
 * walk. "Thayer Street strip, 600 m north".
 */
export function deadZoneNudge(o: {
  here: LngLat;
  pockets: { name: string; centre: LngLat; strip?: boolean }[];
  /** How long you have been further than 400 m from every pocket. */
  farSinceMs: number;
  quiet: boolean;
  nudged: boolean;
}): { text: string; at: LngLat; name: string } | null {
  if (o.quiet || o.nudged || o.farSinceMs < LANDING_WALK.deadMs || !o.pockets.length) return null;
  let best = o.pockets[0];
  for (const p of o.pockets) if (distanceM(o.here, p.centre) < distanceM(o.here, best.centre)) best = p;
  const d = distanceM(o.here, best.centre);
  if (d <= LANDING_WALK.deadM || d > LANDING_WALK.nudgeM) return null;
  const dir = COMPASS[Math.round(((bearingDeg(o.here, best.centre) + 360) % 360) / 45) % 8];
  const metres = Math.round(d / 50) * 50;
  return { text: `${best.name}${best.strip ? ' strip' : ''}, ${metres} m ${dir}`, at: best.centre, name: best.name };
}

/** Whether the walker is in a dead zone now: further than 400 m from every pocket. */
export const inDeadZone = (here: LngLat, pockets: { centre: LngLat }[]) =>
  pockets.length > 0 && pockets.every((p) => distanceM(here, p.centre) > LANDING_WALK.deadM);

/**
 * The loop as one waypoint (L13): first the landing, then each pocket nearest
 * first, and back to the landing, numbered "1 of N".
 */
export function loopWaypoint(at: LngLat, street: string | null, pockets: { name: string; centre: LngLat }[]): Waypoint {
  const rest = planLoop(at, pockets);
  const all = [{ at, label: street ?? 'Start here' }, ...rest];
  const legs: Waypoint[] = all.map((l, i) => ({ at: l.at, label: l.label, kind: 'place', leg: { n: i + 1, of: all.length }, scanOnArrive: i === 0 }));
  return { ...legs[0], legs: legs.slice(1) };
}

