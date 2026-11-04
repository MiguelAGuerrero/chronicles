// @layer core
import { bearingDeg, distanceM } from '../geo';
import type { LngLat } from '../types';

/*
 * Discrete navigation (DN1-DN13): Explore's map steps from area to area
 * instead of panning. The pure part: what a drag means, which way it points,
 * and which area lies that way. The map reports drags; the screen calls in.
 */

export const SNAP = {
  /** A drag shorter than this is a tap or a wobble, never a swipe (DN2). */
  minSwipePx: 24,
  /** An area counts as "that way" within this many degrees either side (DN2). */
  coneDeg: 45,
  /** With nothing selected, an area this close to the map's middle is where you are looking: a swipe goes past it (DN3). */
  hereM: 100,
} as const;

export interface SnapPoint {
  key: string;
  at: LngLat;
}

/** The step just taken, so the opposite swipe can come back (DN5). */
export interface SnapStep {
  from: string | null;
  to: string;
  heading: number;
}

/** Degrees between two headings, 0 to 180. */
const apart = (a: number, b: number) => Math.abs((((a - b) % 360) + 540) % 360 - 180);

/** A finished single-pointer drag as a swipe, or null: too short, a long press, or two fingers (DN2, DN10). */
export function swipeOf(
  from: { x: number; y: number },
  to: { x: number; y: number },
  o: { multi?: boolean; held?: boolean } = {},
): { dx: number; dy: number } | null {
  if (o.multi || o.held) return null;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.hypot(dx, dy) >= SNAP.minSwipePx ? { dx, dy } : null;
}

/**
 * The compass heading a drag points to, as a pan would have moved the map
 * (DN2): what comes into view lies opposite the finger's travel on screen.
 * `bearing` is the map's, the heading at the top of the screen.
 */
export function swipeHeading(dx: number, dy: number, bearing: number): number {
  // Clockwise from the screen's top, of the vector (-dx, -dy) on a screen whose y grows down.
  const screen = (Math.atan2(-dx, dy) * 180) / Math.PI;
  return (((screen + bearing) % 360) + 360) % 360;
}

/** An arrow key as the swipe that goes that way (DN11): ArrowRight is a drag to the left. */
export function arrowSwipe(key: string): { dx: number; dy: number } | null {
  const d = SNAP.minSwipePx * 2;
  switch (key) {
    case 'ArrowRight': return { dx: -d, dy: 0 };
    case 'ArrowLeft': return { dx: d, dy: 0 };
    case 'ArrowUp': return { dx: 0, dy: d };
    case 'ArrowDown': return { dx: 0, dy: -d };
    default: return null;
  }
}

/**
 * The area a swipe lands on (DN2-DN5): from the selected area (`fromKey`) or,
 * with none, from the map's middle, the nearest candidate within the cone
 * around `heading`. Straight after a step, the opposite swipe returns to where
 * that step began, while it is still listed. Null when nothing lies that way.
 */
export function nextArea(from: LngLat, fromKey: string | null, candidates: SnapPoint[], heading: number, last: SnapStep | null = null): SnapPoint | null {
  if (last && fromKey != null && last.to === fromKey && apart(heading, last.heading + 180) <= SNAP.coneDeg) {
    const back = candidates.find((c) => c.key === last.from);
    if (back) return back;
  }
  let best: SnapPoint | null = null;
  let bestM = Infinity;
  for (const c of candidates) {
    if (c.key === fromKey) continue;
    const m = distanceM(from, c.at);
    if (m < (fromKey == null ? SNAP.hereM : 1)) continue;
    if (apart(bearingDeg(from, c.at), heading) > SNAP.coneDeg) continue;
    if (m < bestM) {
      best = c;
      bestM = m;
    }
  }
  return best;
}

/**
 * Which areas a swipe steps between (DN7, DN8): on the page near you, its
 * neighborhoods; on a town's page, the towns, until one of its neighborhoods
 * is selected.
 */
export function snapScope(o: { townPage: string | null; selected: string | null }): 'neighborhoods' | 'towns' {
  return o.townPage != null && (o.selected == null || o.selected === o.townPage) ? 'towns' : 'neighborhoods';
}
