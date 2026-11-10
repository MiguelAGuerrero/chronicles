// @layer core
/*
 * Discrete navigation (DN1, DN10-DN13; the row of cards, decision 0123): Explore's map never pans by one finger.
 * The pure part: what a drag means. The map reports drags; the screen turns them into row steps (`rowStep`, atlas/carousel).
 */

export const SNAP = {
  /** A drag shorter than this is a tap or a wobble, never a swipe (DN2). */
  minSwipePx: 24,
  /** A second touch this soon after a tap is maplibre's tap-drag zoom, never a swipe (discrete-navigation audit 2). */
  tapDragMs: 500,
} as const;

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
