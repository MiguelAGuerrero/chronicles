// @layer core
/**
 * Places come and go with a settle on a walk (specs/poi-transitions, PI1-PI14): which "?" marks grow in and
 * shrink out at a sync. Only a new position moves a mark (PI12), only on screen (PI4), never on first sight (PI5),
 * never while riding or for a mark back within `backStillMs` (PI13). Pure; the maps animate (`components/Enter`).
 */
import { MOTION } from './motionTokens';
import type { LngLat } from './types';

export interface MarkSpring {
  stiffness: number;
  damping: number;
  mass: number;
}

export const MARK_MOTION = {
  /** The arrival grows from this scale (PI9: 80% or more). */
  fromScale: 0.8,
  /** And is fully opaque from its first frame, so a place is never missing while it arrives. */
  fromOpacity: 1,
  /**
   * The marks' own spring: a slight overshoot, the owner's pick (Nov 20), beside `MOTION.spring`, which shows none.
   * Damping ratio about 0.55: peaks near 1.025 from 0.8 and settles within about 350 ms.
   */
  spring: { stiffness: 600, damping: 27, mass: 1 } as MarkSpring,
  /** Leaving shrinks back to this scale as it fades out, no slower than a lift (PI9). */
  leaveScale: 0.8,
  leaveMs: MOTION.lift,
  /**
   * The leave's two drivers (poi-transitions ui 3): the fade is linear and done by two thirds of the way, the shrink
   * runs the whole way on Material's exit curve (emphasized accelerate). One eased value for both held the mark
   * opaque, then dropped it at the end.
   */
  leaveFadeUntil: 2 / 3,
  leaveCurve: [0.3, 0, 0.8, 0.15] as const,
  /** A mark back within this long of leaving comes back still: no flicker at the range's edge (PI13). */
  backStillMs: 30_000,
} as const;

/** How far a spring is from critical damping: 1 settles with no overshoot, under 1 overshoots. */
export const dampingRatio = (s: MarkSpring): number => s.damping / (2 * Math.sqrt(s.stiffness * s.mass));

/** Where a spring from `from` at rest towards 1 stands after `ms` (an underdamped spring, as `Animated.spring` runs it). */
function springAt(s: MarkSpring, from: number, ms: number): number {
  const w0 = Math.sqrt(s.stiffness / s.mass);
  const z = dampingRatio(s);
  const t = ms / 1000;
  const e0 = from - 1;
  if (z >= 1) return 1 + e0 * (1 + w0 * t) * Math.exp(-w0 * t);
  const wd = w0 * Math.sqrt(1 - z * z);
  return 1 + e0 * Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
}

/** The furthest past full size a spring from `from` goes (PI9). */
export function springPeak(s: MarkSpring, from: number): number {
  const z = dampingRatio(s);
  if (z >= 1) return 1;
  return 1 + (1 - from) * Math.exp((-z * Math.PI) / Math.sqrt(1 - z * z));
}

/** When a spring from `from` last stands more than 0.2% off full size: settled from then on (PI9). */
export function springSettleMs(s: MarkSpring, from: number, tolerance = 0.002): number {
  let last = 0;
  for (let ms = 0; ms <= 3000; ms++) if (Math.abs(springAt(s, from, ms) - 1) > tolerance) last = ms;
  return last;
}

/**
 * Everything that decides the walk's "?" list except where you are (PI12): a change in any of these comes and goes
 * at once. `keys` are the places read, in any order; `route` the whole route navigated, never the route ahead, which
 * shortens with each fix. Riding has none: nothing moves on a ride (PI13).
 */
export function markContext(i: {
  places: boolean;
  rangeM: number;
  hidden: Iterable<string>;
  keys: readonly string[];
  route: readonly LngLat[] | null;
  riding: boolean;
  /** The places found: a find loaded or removed shows or hides a found mark at any distance (poi-transitions audit 4). */
  found?: Iterable<string>;
}): string | null {
  if (i.riding) return null;
  const route = i.route?.length ? `${i.route.length}:${i.route[0].join(',')}:${i.route[i.route.length - 1].join(',')}` : '-';
  const found = [...(i.found ?? [])].sort().join(',');
  return [i.places ? 'on' : 'off', i.rangeM, [...i.hidden].sort().join(','), [...i.keys].sort().join(','), route, found].join('|');
}

/** The marks that left within `backStillMs` of `now` (PI13). */
export function recentlyLeft(leftAt: ReadonlyMap<string, number>, now: number): Set<string> {
  const out = new Set<string>();
  for (const [id, t] of leftAt) if (now - t <= MARK_MOTION.backStillMs) out.add(id);
  return out;
}

/**
 * Which marks move at one sync. `prev` is what the map showed (null before its first sync: first sight, PI5);
 * `prevContext` and `context` the context then and now (null: a screen with none, or riding). `leaving` are the
 * marks still shrinking: one back in the list is in `back`, its leave cut and its one marker kept (PI6). A mark in
 * both lists stays, whatever changed in its look (PI7). Every arrival of a change is in one set (PI9).
 */
export function markMoves(i: {
  prev: ReadonlySet<string> | null;
  prevContext: string | null;
  ids: readonly string[];
  context: string | null;
  recentlyLeft: ReadonlySet<string>;
  leaving: ReadonlySet<string>;
  inView: (id: string) => boolean;
  /**
   * The places within range before and now, shown or not (poi-transitions audit 9): only crossing the range's edge
   * moves a mark; one the nearest-eight cap drops or brings back, still within range, comes and goes still.
   */
  inRangeBefore?: ReadonlySet<string>;
  inRangeNow?: ReadonlySet<string>;
}): { arriving: Set<string>; leaving: Set<string>; back: Set<string> } {
  const back = new Set(i.ids.filter((id) => i.leaving.has(id)));
  const arriving = new Set<string>();
  const leaving = new Set<string>();
  const moving = i.prev != null && i.context != null && i.context === i.prevContext;
  if (!moving || !i.prev) return { arriving, leaving, back };
  const now = new Set(i.ids);
  for (const id of i.ids) if (!i.prev.has(id) && !back.has(id) && !i.recentlyLeft.has(id) && !i.inRangeBefore?.has(id) && i.inView(id)) arriving.add(id);
  // A mark that left moments ago goes still too: the range's edge never shrinks on every jitter (poi-transitions ui 2).
  for (const id of i.prev) if (!now.has(id) && !i.recentlyLeft.has(id) && !i.inRangeNow?.has(id) && i.inView(id)) leaving.add(id);
  return { arriving, leaving, back };
}

/** A mark's entrance at a sync: a reveal's turn or a find's pulse wins over its arrival (PI7). */
export const arrivalEnter = <K extends string>(arriving: boolean, change: K | null): K | 'grow' | null => change ?? (arriving ? 'grow' : null);

/** Whether a point is inside a map's visible bounds, `[west, south, east, north]` (MapLibre RN's order; PI4). */
export const inBounds = (at: LngLat, b: readonly [number, number, number, number] | null): boolean =>
  !!b && at[0] >= b[0] && at[0] <= b[2] && at[1] >= b[1] && at[1] <= b[3];

/** A cubic Bézier easing (CSS's `cubic-bezier`): the eased progress at `x`, by bisection on the curve's x. */
export function cubicBezier([x1, y1, x2, y2]: readonly [number, number, number, number], x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const at = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    if (at(x1, x2, mid) < x) lo = mid;
    else hi = mid;
  }
  return at(y1, y2, (lo + hi) / 2);
}

/** The leave at progress `p` (0 to 1 of `leaveMs`): what `Leave` draws (poi-transitions ui 3). */
export function leaveAt(p: number): { opacity: number; scale: number } {
  const opacity = Math.max(0, Math.min(1, 1 - p / MARK_MOTION.leaveFadeUntil));
  return { opacity, scale: 1 - (1 - MARK_MOTION.leaveScale) * cubicBezier(MARK_MOTION.leaveCurve, p) };
}

/** A "?" mark's foot in its 36 x 44 box, where it stands on its place (`MarkPinView`). */
export const MARK_FOOT = { x: 18, y: 44 } as const;

/**
 * The point a mark grows and shrinks about, in its box: its place (poi-transitions ui 4). The foot for a mark on its
 * point; for a spread one, the dot at the end of its leg (`below` is how far the foot stands below the point).
 */
export function markOrigin(spread: { dx: number; dy: number } | undefined, below: number): { x: number; y: number } {
  if (!spread) return { x: MARK_FOOT.x, y: MARK_FOOT.y };
  return { x: MARK_FOOT.x - spread.dx, y: MARK_FOOT.y - spread.dy - below };
}

/**
 * Whether the walk's marks have settled since the screen mounted or came back to the front (poi-transitions audit 1).
 * Each position (and each return) is a step: a return starts again, and the marks may move from the second position
 * on. The first is the one the screen opens with (a reload's last stored fix); the next may jump far.
 */
export function settleStep(s: { epoch: number; n: number }, resumed: number): { epoch: number; n: number } {
  if (s.epoch !== resumed) return { epoch: resumed, n: 0 };
  return s.n >= 2 ? s : { epoch: s.epoch, n: s.n + 1 };
}

export const marksSettled = (s: { epoch: number; n: number }, resumed: number): boolean => s.epoch === resumed && s.n >= 2;

/**
 * What the native map draws between a change of the list and its decision a tick later (poi-transitions audits 2, 5):
 * a new mark under a context is held back, since it may grow; a mark gone from the list under the same context is
 * drawn still on its own marker until it is decided, so it never misses a render; with no context nothing waits.
 */
export function markDraw(i: {
  ids: readonly string[];
  context: string | null;
  decided: { known: ReadonlySet<string> | null; context: string | null };
  leaving: ReadonlySet<string>;
}): { held: Set<string>; stillGone: Set<string> } {
  const held = new Set<string>();
  const stillGone = new Set<string>();
  const known = i.decided.known;
  if (i.context == null || !known || i.decided.context !== i.context) return { held, stillGone };
  const now = new Set(i.ids);
  for (const id of i.ids) if (!known.has(id)) held.add(id);
  for (const id of known) if (!now.has(id) && !i.leaving.has(id)) stillGone.add(id);
  return { held, stillGone };
}

/** Whether a native marker grows as it mounts: only under the key it arrived with, so a remount never grows again (audit 6). */
export const growsNow = (grow: ReadonlyMap<string, string>, id: string, key: string): boolean => grow.get(id) === key;
