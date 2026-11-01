import { boundsOf, distanceM, type Bounds } from './geo';
import { groupCaptures, type Schedule } from './replay';
import type { Capture, LngLat, Walk } from './types';

/**
 * Moments and days (the concept doc's "Moments and days" tab). A capture is a
 * moment that may or may not belong to a walk; a day collects its moments and
 * walks, local midnight to midnight. Days are never stored: they are worked
 * out from times when read. Pure: nothing here touches storage or the map.
 */

/** How long the day's replay takes to ease the map to the next pin. */
export const FLY_MS = 1500;
/** Moments closer than this are one place on the day's card. */
const SPOT_M = 100;

export type DayEntry =
  | { kind: 'moment'; t: number; capture: Capture }
  | { kind: 'walk'; t: number; walk: Walk; captures: Capture[] };

export interface Day {
  /** Local date, YYYY-MM-DD. */
  key: string;
  /** Moments and walks in time order. */
  entries: DayEntry[];
  /** Every moment of the day, loose or in one of its walks. */
  moments: number;
  walks: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** The local date a time falls on (M6). */
export function dayKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local midnight at the start of a day key. */
export function dayStart(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

/** Local midnight at the end of a day: the next day's start, so 23- and 25-hour days are right. */
export function nextDayStart(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d + 1).getTime();
}

/**
 * Groups walks and moments into days, newest first (M6-M8). A walk belongs to
 * the day it started, with all its moments; open walks are left out (they are
 * still going), as are captures of a walk that is not listed.
 */
export function buildDays(walks: Walk[], captures: Capture[]): Day[] {
  const closed = new Map(walks.filter((w) => !w.open && w.ended_at != null).map((w) => [w.id, w]));
  const byWalk = new Map<string, Capture[]>();
  const days = new Map<string, DayEntry[]>();
  const push = (e: DayEntry) => {
    const k = dayKey(e.t);
    const list = days.get(k);
    if (list) list.push(e);
    else days.set(k, [e]);
  };
  for (const c of captures) {
    if (c.walk_id == null) push({ kind: 'moment', t: c.t, capture: c });
    else if (closed.has(c.walk_id)) {
      const list = byWalk.get(c.walk_id);
      if (list) list.push(c);
      else byWalk.set(c.walk_id, [c]);
    }
  }
  for (const w of closed.values()) {
    push({ kind: 'walk', t: w.started_at, walk: w, captures: (byWalk.get(w.id) ?? []).sort((a, b) => a.t - b.t) });
  }
  return [...days.entries()]
    .map(([key, entries]) => {
      entries.sort((a, b) => a.t - b.t);
      const walksIn = entries.filter((e) => e.kind === 'walk');
      return {
        key,
        entries,
        moments: entries.reduce((n, e) => n + (e.kind === 'walk' ? e.captures.length : 1), 0),
        walks: walksIn.length,
      };
    })
    .sort((a, b) => (a.key < b.key ? 1 : -1));
}

/** "Today", "Yesterday", else "Tue, Nov 3" in the device's language (M9). */
export function dayLabel(key: string, now: number): string {
  if (key === dayKey(now)) return 'Today';
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (key === dayKey(y.getTime())) return 'Yesterday';
  return new Date(dayStart(key)).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "3 moments · 1 walk" for the days list (M7). */
export function dayCounts(day: Day): string {
  const parts = [plural(day.moments, 'moment', 'moments')];
  if (day.walks) parts.push(plural(day.walks, 'walk', 'walks'));
  return parts.join(' · ');
}

/** Every moment of a day, loose or in a walk, in time order. */
export function dayCaptures(day: Day): Capture[] {
  return day.entries.flatMap((e) => (e.kind === 'walk' ? e.captures : [e.capture])).sort((a, b) => a.t - b.t);
}

/** Places on the card: moments within SPOT_M of one another are one; placeless moments are none (M13). */
export function spotCount(captures: Capture[]): number {
  const spots: LngLat[] = [];
  for (const c of captures) {
    if (c.lat == null || c.lon == null) continue;
    const p: LngLat = [c.lon, c.lat];
    if (!spots.some((s) => distanceM(s, p) <= SPOT_M)) spots.push(p);
  }
  return spots.length;
}

/** Meta key set once a day's replay has been watched to its end (M12). */
export const watchedKey = (key: string) => `day_watched:${key}`;

function formatKm(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

/** The day's closing card: quiet, no streaks or badges (M13). */
export function dayCard(day: Day, now: number, distanceByWalk: Map<string, number>) {
  const date = new Date(dayStart(day.key));
  const label = dayLabel(day.key, now);
  const weekday = date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  const caps = dayCaptures(day);
  const spots = spotCount(caps);
  const metres = day.entries.reduce((m, e) => m + (e.kind === 'walk' ? distanceByWalk.get(e.walk.id) ?? 0 : 0), 0);
  return {
    title: label === 'Today' || label === 'Yesterday' ? `${label} · ${weekday}` : weekday,
    line: `${plural(caps.length, 'moment', 'moments')} · ${plural(spots, 'place', 'places')}`,
    walked: metres > 0 ? `${formatKm(metres)} walked` : null,
  };
}

export type DayStep =
  /** The map eases to a pin before its stop. */
  | { kind: 'fly'; to: LngLat; ms: number }
  /** Moments shown one after another, each until the viewer moves on. */
  | { kind: 'stop'; captures: Capture[]; walkId: string | null }
  /** A stretch of a walk's path, in that walk's replay time (`Schedule`). */
  | { kind: 'path'; walkId: string; fromMs: number; toMs: number };

const posOf = (c: Capture): LngLat | null => (c.lat != null && c.lon != null ? [c.lon, c.lat] : null);

/**
 * The day's replay as steps (M10-M14). Loose moments ease the map to their
 * pin and stop; a moment with no place stops where the map is. A walk plays
 * its path from its own schedule, stopping at its moments, then the day
 * carries on. A walk whose replay could not be loaded shows its moments as
 * loose ones.
 */
export function dayPlan(day: Day, walks: Map<string, { sched: Schedule; start: LngLat | null }>): DayStep[] {
  const steps: DayStep[] = [];
  const looseGroup = (captures: Capture[]) => {
    for (const g of groupCaptures(captures)) {
      const to = g.at ?? g.captures.map(posOf).find((p) => p != null) ?? null;
      if (to) steps.push({ kind: 'fly', to, ms: FLY_MS });
      steps.push({ kind: 'stop', captures: g.captures, walkId: null });
    }
  };
  let pending: Capture[] = [];
  const flush = () => {
    if (pending.length) looseGroup(pending);
    pending = [];
  };
  for (const e of day.entries) {
    if (e.kind === 'moment') {
      pending.push(e.capture);
      continue;
    }
    flush();
    const w = walks.get(e.walk.id);
    if (!w || w.sched.movingMs <= 0) {
      looseGroup(e.captures);
      continue;
    }
    if (w.start) steps.push({ kind: 'fly', to: w.start, ms: FLY_MS });
    let from = 0;
    for (const g of w.sched.groups) {
      if (g.atMs > from) steps.push({ kind: 'path', walkId: e.walk.id, fromMs: from, toMs: g.atMs });
      from = Math.max(from, g.atMs);
      steps.push({ kind: 'stop', captures: g.captures, walkId: e.walk.id });
    }
    if (w.sched.movingMs > from) steps.push({ kind: 'path', walkId: e.walk.id, fromMs: from, toMs: w.sched.movingMs });
  }
  flush();
  return steps;
}

/** How closely a pin is framed when the day's replay flies to it. */
const PIN_FRAME_M = 150;

/**
 * Where the camera frames each fly step (audit: a day across a city left
 * every walk a few pixels wide): a walk by its whole trace, a pin close up.
 * Other steps keep the frame they are in (null).
 */
export function stepFrames(plan: DayStep[], walkPoints: Map<string, LngLat[]>): (Bounds | null)[] {
  return plan.map((s, i) => {
    if (s.kind !== 'fly') return null;
    const after = plan[i + 1];
    const pts = after?.kind === 'path' ? walkPoints.get(after.walkId) : null;
    return pts?.length ? boundsOf(pts, 60) : boundsOf([s.to], PIN_FRAME_M);
  });
}
