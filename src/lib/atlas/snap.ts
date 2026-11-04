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
  /**
   * How a flick coasts, as maplibre-gl's own pan inertia does (its defaults): the release speed times
   * `linearity`, capped at `maxSpeed` px/s, slowing at `deceleration` px/s² (DN2, the owner, Nov 4).
   */
  inertia: { linearity: 0.3, maxSpeed: 1400, deceleration: 2500 },
  /** With nothing selected, an area this close to the map's middle is where you are looking: a swipe goes past it (DN3). */
  hereM: 100,
  /** A second touch this soon after a tap is maplibre's tap-drag zoom, never a swipe (discrete-navigation audit 2). */
  tapDragMs: 500,
} as const;

export interface SnapPoint {
  key: string;
  at: LngLat;
}

/** A finished drag: pixels moved, and the speed at release in px/s (0 when the finger stopped first). */
export interface Swipe {
  dx: number;
  dy: number;
  vx: number;
  vy: number;
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

/** A gesture that starts as a zoom (a shift box-zoom, or a tap-drag zoom's second touch) is never a swipe (audit 2). */
export function zoomStart(o: { shift: boolean; sinceTapMs: number }): boolean {
  return o.shift || o.sinceTapMs < SNAP.tapDragMs;
}

/** A native release as a swipe: one finger all the way, and no long press during it (discrete-navigation audit 3). */
export function releaseSwipe(g: { dx: number; dy: number; maxTouches: number; held: boolean }): { dx: number; dy: number } | null {
  return swipeOf({ x: 0, y: 0 }, { x: g.dx, y: g.dy }, { multi: g.maxTouches > 1, held: g.held });
}

/** A tap clears the selection only away from every area's point (DN9, discrete-navigation audit 6). */
export function tapClears(at: LngLat, radiusM: number, points: LngLat[]): boolean {
  return !points.some((p) => distanceM(at, p) <= radiusM);
}

/**
 * Where to scroll so a row is in view (DN6, discrete-navigation audits 4 and 8): `top` is the row's
 * top measured from the scroll view's visible top, `insetBottom` what covers the view's bottom (a
 * town's back pill). Null when it is already in view.
 */
export function revealTo(o: { top: number; h: number; viewH: number; scrollY: number; insetBottom: number }): number | null {
  const margin = 8;
  const visible = o.viewH - o.insetBottom;
  if (o.top < 0 || o.h > visible) return Math.max(0, o.scrollY + o.top - margin);
  if (o.top + o.h > visible) return o.scrollY + (o.top + o.h - visible) + margin;
  return null;
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

/** How far a flick coasts past the release, in screen pixels along the swipe, as a pan's inertia would. */
export function coastPx(vx: number, vy: number): [number, number] {
  const { linearity, maxSpeed, deceleration } = SNAP.inertia;
  const v = Math.hypot(vx, vy);
  if (!v) return [0, 0];
  const speed = Math.min(v * linearity, maxSpeed);
  const px = (speed * speed) / (2 * deceleration * linearity);
  return [(vx / v) * px, (vy / v) * px];
}

/**
 * Where the map's middle would land had the swipe panned it (DN2): the content follows the finger, so
 * the middle moves the other way; a flick coasts on. `bearing` is the map's, `mpp` its metres a pixel.
 */
export function landing(from: LngLat, s: Swipe, bearing: number, mpp: number): LngLat {
  const [cx, cy] = coastPx(s.vx, s.vy);
  const right = -(s.dx + cx) * mpp;
  const up = (s.dy + cy) * mpp;
  const b = (bearing * Math.PI) / 180;
  const east = right * Math.cos(b) + up * Math.sin(b);
  const north = up * Math.cos(b) - right * Math.sin(b);
  const k = 111320 * Math.cos((from[1] * Math.PI) / 180);
  return [from[0] + east / k, from[1] + north / 111320];
}

/**
 * The area a swipe lands on (DN2-DN4, the owner, Nov 4): the nearest to where the swipe would have panned
 * the map's middle, among the areas on the side swiped toward (less than 90° off it), never the selected one,
 * so every swipe moves and a longer or faster one goes further. From the selected area (`fromKey`), else the
 * map's middle, past an area within `hereM` of it (DN3). Null when no area lies on that side.
 */
export function nextArea(from: LngLat, fromKey: string | null, candidates: SnapPoint[], s: Swipe, bearing: number, mpp: number): SnapPoint | null {
  const heading = swipeHeading(s.dx, s.dy, bearing);
  const land = landing(from, s, bearing, mpp);
  let best: SnapPoint | null = null;
  let bestM = Infinity;
  for (const c of candidates) {
    if (c.key === fromKey) continue;
    if (distanceM(from, c.at) < (fromKey == null ? SNAP.hereM : 1)) continue;
    if (apart(bearingDeg(from, c.at), heading) >= 90) continue;
    const m = distanceM(land, c.at);
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
