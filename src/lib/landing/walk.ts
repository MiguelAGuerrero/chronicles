import { bearingDeg, distanceM, distanceToLinesM } from '../geo';
import type { LngLat } from '../types';

/** On the walk (v1.5 slice 3, L14-L15; the loop, L13 and L16, retired by explore). */
export const LANDING_WALK = {
  /** On a strip: within this of its lines; off it again past the second (no blinking at the edge). */
  stripM: 30,
  stripOffM: 45,
  /** A dead zone: further than this from every pocket... */
  deadM: 400,
  /** ...for this long... */
  deadMs: 10 * 60_000,
  /** ...with one within this to nudge toward. */
  nudgeM: 1500,
} as const;

/** The strip you are on, within 30 m, for the quiet chip (L14); the one you were on holds until 45 m. */
export function stripAt(here: LngLat, strips: { name: string; lines: LngLat[][] }[], current: string | null = null): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  for (const s of strips) {
    const d = distanceToLinesM(here, s.lines);
    const reach = s.name === current ? LANDING_WALK.stripOffM : LANDING_WALK.stripM;
    if (d <= reach && d < bestD) [best, bestD] = [s.name, d];
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

/** Whether a dead-zone nudge could fire now, before any storage read (audit: not two reads a fix). */
export function deadZoneDue(o: { here: LngLat; pockets: { name?: string; centre: LngLat }[]; farSinceMs: number }): boolean {
  if (o.farSinceMs < LANDING_WALK.deadMs) return false;
  return o.pockets.some((p) => {
    const d = distanceM(o.here, p.centre);
    return d > LANDING_WALK.deadM && d <= LANDING_WALK.nudgeM;
  });
}
