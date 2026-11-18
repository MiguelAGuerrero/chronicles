// @layer core
import type { Faced } from './moment';
import { formatDistance } from './format';
import { boundsOf, distanceM, distanceToLinesM, type Bounds } from './geo';
import type { Units } from './units';
import type { LngLat, StreetSegment, Walk } from './types';
import { STREET_REACH_M, streetAt } from './resurface/context';
import { numberWord } from './resurface/lines';
import { pinHint } from './replay';

/**
 * Moments and days (the concept doc's "Moments and days" tab). A capture is a
 * moment that may or may not belong to a walk; a day collects its moments and
 * walks, local midnight to midnight. Days are never stored: they are worked
 * out from times when read. Pure: nothing here touches storage or the map.
 */

/** Moments closer than this are one place on the day's card. */
const SPOT_M = 100;

export type DayEntry =
  | { kind: 'moment'; t: number; capture: Faced }
  | { kind: 'walk'; t: number; walk: Walk; captures: Faced[] };

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
export function buildDays(walks: Walk[], captures: Faced[]): Day[] {
  const closed = new Map(walks.filter((w) => !w.open && w.ended_at != null).map((w) => [w.id, w]));
  const byWalk = new Map<string, Faced[]>();
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

/** A day's counts in words, "three moments", "one walk"; a day whose walk kept nothing says no count of moments. */
function countWords(day: Day, space: string): string[] {
  const said = (n: number, one: string, many: string) => `${numberWord(n)}${space}${n === 1 ? one : many}`;
  return [day.moments > 0 ? said(day.moments, 'moment', 'moments') : null, day.walks > 0 ? said(day.walks, 'walk', 'walks') : null]
    .filter((x): x is string => !!x);
}

/**
 * "Three moments · one walk" for the days list and a day's header (M7), in words as the timeline under them says its
 * own (tend tabs T32, the owner's yes, Nov 14). A day whose walk kept nothing says "One walk", never "zero moments" (as
 * tend tabs audit 22). `bind`, for the days row, which has room, keeps each count on its noun's line; a day's header,
 * about 88 px wide at 320 px, wraps between words instead, so no word is broken (tend tabs audit 25).
 */
export function dayCounts(day: Day, o: { bind?: boolean } = {}): string {
  return capWord(countWords(day, o.bind ? '\u00a0' : ' ').join(' · '));
}

/**
 * A day's row as a screen reader says it: "Today, three moments, one walk" (tend tabs T32), plain spaces. Speech is no
 * reason for them: a no-break space is said as a space, and spoken distances keep theirs (tend map audit 47).
 */
export function daySpoken(label: string, day: Day): string {
  return [label, ...countWords(day, ' ')].join(', ');
}

/** Every moment of a day, loose or in a walk, in time order. */
export function dayCaptures(day: Day): Faced[] {
  return day.entries.flatMap((e) => (e.kind === 'walk' ? e.captures : [e.capture])).sort((a, b) => a.t - b.t);
}

/** Places on the card: moments within SPOT_M of one another are one; placeless moments are none (M13). */
export function spotCount(captures: Faced[]): number {
  const spots: LngLat[] = [];
  for (const c of captures) {
    if (c.lat == null || c.lon == null) continue;
    const p: LngLat = [c.lon, c.lat];
    if (!spots.some((s) => distanceM(s, p) <= SPOT_M)) spots.push(p);
  }
  return spots.length;
}

/** The day's frame (RR16): its placed moments and its walks' traces, rides included as a walk's replay frames them (tend replay 10). */
export function dayFrame(moments: Faced[], walks: { runs: LngLat[][]; rideRuns: LngLat[][] }[]): Bounds | null {
  const points: LngLat[] = moments.filter((c) => c.lat != null && c.lon != null).map((c) => [c.lon!, c.lat!] as LngLat);
  for (const w of walks) points.push(...w.runs.flat(), ...w.rideRuns.flat());
  return boundsOf(points, 150);
}

/** Meta key set once a day's replay has been watched to its end (M12). */
export const watchedKey = (key: string) => `day_watched:${key}`;

/** What a walk's replay knows of where its moments were: its streets, and the places its moments found. */
export interface WalkPlaces {
  walked: StreetSegment[];
  fog: StreetSegment[];
  found: { capture_id: string; name: string; generic: boolean }[];
}

/**
 * The named place of a placed moment of a walk (tend replay T19, decision 0153: named places only): the place it
 * found, else its street as a moment's own line states it (`streetAt`). A loose moment, or one with no street within
 * reach, has none.
 */
export function momentPlace(c: Pick<Faced, 'id' | 'lat' | 'lon' | 'segment_id'>, walk: WalkPlaces | null | undefined): string | null {
  if (!walk || c.lat == null || c.lon == null) return null;
  const found = walk.found.find((f) => f.capture_id === c.id && !f.generic);
  if (found) return found.name;
  return streetAt([c.lon, c.lat], [...walk.walked, ...walk.fog], c.segment_id ?? null)?.name ?? null;
}

/**
 * The day card's line, a clause (tend replay T19, decision 0165): "Four moments, around Wickenden Street and the Old
 * Mill" when every moment given has a named place and there are one or two; else "Four moments around Fox Point",
 * the day's area; else "Four moments". Null with no moments. `dayPlaces` says which places and area it may use.
 */
export function dayLine(moments: number, places: readonly (string | null)[], area: string | null): string | null {
  if (moments < 1) return null;
  const said = `${capWord(numberWord(moments))} ${moments === 1 ? 'moment' : 'moments'}`;
  const named = [...new Set(places.filter((p): p is string => !!p))];
  if (places.length && places.every(Boolean) && named.length <= 2) return `${said}, around ${named.join(' and ')}`;
  return area ? `${said} around ${area}` : said;
}

/** The day's area: the one area its walks share, if they share one. */
export function dayArea(day: Day): string | null {
  const areas = new Set(day.entries.flatMap((e) => (e.kind === 'walk' && e.walk.area ? [e.walk.area] : [])));
  return areas.size === 1 ? [...areas][0] : null;
}

/**
 * Where the day's card may say its moments were (the owner, Nov 14, "Only when all are placed"; tend replay audit 12):
 * a named place for each moment, and the day's area, only when every moment of the day has a place inside it. A walk's
 * moment is inside its walk; a loose one is checked against the streets the day's walks read: on a named one it is
 * there, within reach of any it is inside the area, else outside. A moment with no place, or one outside, leaves the
 * card its count alone (`names` empty, `area` null).
 */
export function dayPlaces(day: Day, walks: ReadonlyMap<string, WalkPlaces> | undefined): { names: (string | null)[]; area: string | null } {
  const caps = dayCaptures(day);
  const none = { names: [], area: null };
  if (!caps.length || caps.some((c) => c.lat == null || c.lon == null)) return none;
  const read = day.entries.flatMap((e) => {
    const w = e.kind === 'walk' ? walks?.get(e.walk.id) : undefined;
    return w ? [...w.walked, ...w.fog] : [];
  });
  const inside = (c: Faced) => read.some((s) => distanceToLinesM([c.lon!, c.lat!], s.geometry) <= STREET_REACH_M);
  if (caps.some((c) => !c.walk_id && !inside(c))) return none;
  const names = caps.map((c) =>
    c.walk_id ? momentPlace(c, walks?.get(c.walk_id)) : streetAt([c.lon!, c.lat!], read, c.segment_id ?? null)?.name ?? null,
  );
  return { names, area: dayArea(day) };
}

const capWord = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * What the day screen loaded that its card reads (tend replay audit 13): each walk's distance, and each walk's replay
 * for where its moments were. One value, handed over whole, so the card cannot be built without the walks.
 */
export interface DayLoaded {
  distance: ReadonlyMap<string, number>;
  walks: ReadonlyMap<string, WalkPlaces>;
}

/**
 * The day's closing card: quiet, no streaks or badges (M13). Its distance in the units setting, as the walk's card (tend
 * replay 3); its moments a clause, with their named places or the day's area (tend replay T19).
 */
export function dayCard(day: Day, now: number, loaded: DayLoaded, units?: Units) {
  const { distance: distanceByWalk, walks } = loaded;
  const date = new Date(dayStart(day.key));
  const label = dayLabel(day.key, now);
  const weekday = date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  const caps = dayCaptures(day);
  const where = dayPlaces(day, walks);
  const metres = day.entries.reduce((m, e) => m + (e.kind === 'walk' ? distanceByWalk.get(e.walk.id) ?? 0 : 0), 0);
  return {
    title: label === 'Today' || label === 'Yesterday' ? `${label} · ${weekday}` : weekday,
    line: dayLine(caps.length, where.names, where.area),
    walked: metres > 0 ? `${formatDistance(metres, units)} walked` : null,
    // No pin, no hint (tend replay audit 11).
    hint: pinHint(caps),
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
