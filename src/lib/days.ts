// @layer core
import { distanceM } from './geo';
import type { Capture, LngLat, Walk } from './types';

/**
 * Moments and days (the concept doc's "Moments and days" tab). A capture is a
 * moment that may or may not belong to a walk; a day collects its moments and
 * walks, local midnight to midnight. Days are never stored: they are worked
 * out from times when read. Pure: nothing here touches storage or the map.
 */

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

/** The day less the moments just deleted (D3, audit 26): its story and its card read the same. The same day when nothing was. */
export function dayWithout(day: Day, hidden: ReadonlySet<string>): Day {
  if (!day.entries.some((e) => (e.kind === 'moment' ? hidden.has(e.capture.id) : e.captures.some((c) => hidden.has(c.id))))) return day;
  const entries = day.entries.flatMap((e): Day['entries'] =>
    e.kind === 'moment' ? (hidden.has(e.capture.id) ? [] : [e]) : [{ ...e, captures: e.captures.filter((c) => !hidden.has(c.id)) }],
  );
  const moments = entries.reduce((n, e) => n + (e.kind === 'moment' ? 1 : e.captures.length), 0);
  return { ...day, entries, moments };
}
