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
}): string | null {
  if (i.riding) return null;
  const route = i.route?.length ? `${i.route.length}:${i.route[0].join(',')}:${i.route[i.route.length - 1].join(',')}` : '-';
  return [i.places ? 'on' : 'off', i.rangeM, [...i.hidden].sort().join(','), [...i.keys].sort().join(','), route].join('|');
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
}): { arriving: Set<string>; leaving: Set<string>; back: Set<string> } {
  const back = new Set(i.ids.filter((id) => i.leaving.has(id)));
  const arriving = new Set<string>();
  const leaving = new Set<string>();
  const moving = i.prev != null && i.context != null && i.context === i.prevContext;
  if (!moving || !i.prev) return { arriving, leaving, back };
  const now = new Set(i.ids);
  for (const id of i.ids) if (!i.prev.has(id) && !back.has(id) && !i.recentlyLeft.has(id) && i.inView(id)) arriving.add(id);
  for (const id of i.prev) if (!now.has(id) && i.inView(id)) leaving.add(id);
  return { arriving, leaving, back };
}

/** A mark's entrance at a sync: a reveal's turn or a find's pulse wins over its arrival (PI7). */
export const arrivalEnter = <K extends string>(arriving: boolean, change: K | null): K | 'grow' | null => change ?? (arriving ? 'grow' : null);
