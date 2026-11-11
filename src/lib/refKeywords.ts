// @layer core
import { distanceM } from './geo';
import type { KeywordKind, KeywordRef } from './refs';
import type { LngLat } from './types';

/**
 * Reference keywords (specs/reference-keywords, decision 0141): the palette a note's "@" opens beside its moments.
 * Each entry resolves from the moment's own fix and time, handed in, never read here: no clock, no location call.
 * A value that cannot resolve is absent (RK6), and nothing here ranks or scores a place (RK7).
 */

/** The ranges that decide when a place is "here" or "next to me" (RK13); one object, like `RECALL_RULES`. */
export const REF_RULES = { hereM: 60, nearM: 25, listM: 400 } as const;

/** A named place near a fix, from the local places adapters (never a business list: 0109, 0127). */
export interface NearPlace {
  name: string;
  at: LngLat;
}

/** The basic time anchors common in prose (RK16): a fixed list, none saying anything of quality or mood. */
export const TIME_WORDS = ['now', 'soon', 'later', 'today', 'tonight', 'this morning', 'this afternoon', 'this evening', 'yesterday', 'tomorrow'] as const;
export type TimeWord = (typeof TIME_WORDS)[number];

/** The reserved set, in the palette's order. No weather and no temperature (RK12). */
export const KEYWORD_KINDS: readonly KeywordKind[] = ['here', 'near', 'there', 'time'];

/** What the palette says for each place keyword. */
export const PLACE_WORDS: Record<'here' | 'near' | 'there', string> = { here: 'here', near: 'next to me', there: 'over there' };

const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');
// The device's offset from UTC, in minutes, is an argument (the shell reads it for the moment's own time): core reads no timezone.
const local = (t: number, offsetMin: number) => new Date(t + offsetMin * 60_000);
// The default clock reads like the viewer's ("2:20 PM", audit 17); the shell passes the device's own formatter.
const clock12 = (t: number, offsetMin: number) => {
  const d = local(t, offsetMin);
  const h = d.getUTCHours();
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(d.getUTCMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
};
const day = (t: number, offsetMin: number, plus = 0) => {
  const d = local(t + plus * 86_400_000, offsetMin);
  return `${SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
};

/**
 * A time word resolved against the moment's own time (RK16), stored as an absolute value so it never moves with when
 * the note is read: "now" is its clock time, "yesterday" its date, "soon" and "later" are "after" it.
 */
export function resolveTime(word: TimeWord, t: number, offsetMin: number, clockOf: (t: number) => string = (x) => clock12(x, offsetMin)): string {
  switch (word) {
    case 'now':
      return clockOf(t);
    case 'soon':
    case 'later':
      return `after ${clockOf(t)}`;
    case 'today':
      return day(t, offsetMin);
    case 'tonight':
    case 'this evening':
      return `${day(t, offsetMin)}, evening`;
    case 'this morning':
      return `${day(t, offsetMin)}, morning`;
    case 'this afternoon':
      return `${day(t, offsetMin)}, afternoon`;
    case 'yesterday':
      return day(t, offsetMin, -1);
    case 'tomorrow':
      return day(t, offsetMin, 1);
  }
}

/** How far a place is, in words (RK7): never a number, never "closest". */
export function distanceWords(m: number): string {
  if (m < 15) return 'right here';
  if (m < 40) return 'a few steps away';
  if (m < 150) return 'up the street';
  if (m < 400) return 'a short walk away';
  return 'a way off';
}

/** A place as a payload: `lng,lat`, to five places (about a metre). */
export const pointPayload = (at: LngLat): string => `${at[0].toFixed(5)},${at[1].toFixed(5)}`;

/** The places in reach of a fix, nearest first, each with its distance in words (RK7, RK18). Unnamed ones never appear. */
export function nearbyPlaces(fix: LngLat, places: NearPlace[], withinM: number = REF_RULES.listM): { name: string; at: LngLat; how: string }[] {
  return places
    .filter((p) => p.name.trim())
    .map((p) => ({ p, d: distanceM(fix, p.at) }))
    .filter((x) => x.d <= withinM)
    .sort((a, b) => a.d - b.d)
    .map(({ p, d }) => ({ name: p.name.trim(), at: p.at, how: distanceWords(d) }));
}

/** The one place within `rangeM` of a fix, or null when there is none or more than one (RK13). */
function onlyPlace(fix: LngLat, places: NearPlace[], rangeM: number): NearPlace | null {
  const within = places.filter((p) => p.name.trim() && distanceM(fix, p.at) <= rangeM);
  return within.length === 1 ? within[0] : null;
}

/** An entry in the palette: what the keyword says, and what it would store (null value: chosen in the picker). */
export interface KeywordEntry {
  key: KeywordKind;
  word: string;
  value: string | null;
  payload: string;
}

/**
 * The keywords that can resolve at this fix (RK6, RK13): "here" names the one place within `hereM`, else the street,
 * else it is absent; "next to me" names the one place within `nearM`, else it is absent; "over there" is always
 * offered, for the picker (RK18). `fix` is the moment's own (the saved one when it has one, else the stamp's).
 */
export function placeEntries(o: { fix: LngLat | null; places: NearPlace[]; street: string | null }): KeywordEntry[] {
  const out: KeywordEntry[] = [];
  if (o.fix) {
    const here = onlyPlace(o.fix, o.places, REF_RULES.hereM);
    if (here) out.push({ key: 'here', word: PLACE_WORDS.here, value: here.name.trim(), payload: pointPayload(here.at) });
    else if (o.street?.trim()) out.push({ key: 'here', word: PLACE_WORDS.here, value: o.street.trim(), payload: pointPayload(o.fix) });
    const near = onlyPlace(o.fix, o.places, REF_RULES.nearM);
    if (near) out.push({ key: 'near', word: PLACE_WORDS.near, value: near.name.trim(), payload: pointPayload(near.at) });
  }
  out.push({ key: 'there', word: PLACE_WORDS.there, value: null, payload: '' });
  return out;
}

/** The time entries, always resolvable: "N minutes in" is offered only on a walk (RK16, with `minutesIn`). */
export function timeEntries(t: number, offsetMin: number, minutesIn: number | null = null, clockOf?: (t: number) => string): KeywordEntry[] {
  const out: KeywordEntry[] = TIME_WORDS.map((w) => ({ key: 'time' as const, word: w, value: resolveTime(w, t, offsetMin, clockOf), payload: String(t) }));
  if (minutesIn != null && minutesIn >= 1) {
    const n = Math.round(minutesIn);
    out.push({ key: 'time', word: `${n} minutes in`, value: `${n} minutes in`, payload: String(t) });
  }
  return out;
}

/** The reference a chosen entry stores (RK3), once it has a value (an entry for the picker has none until picked). */
export const entryRef = (e: KeywordEntry, value: string | null = e.value, payload: string = e.payload): KeywordRef | null =>
  value ? { key: e.key, word: e.word, value, payload } : null;

/** The palette's order: where, then when (RK1). */
export const paletteOrder = (entries: KeywordEntry[]): KeywordEntry[] => {
  const rank = (e: KeywordEntry) => KEYWORD_KINDS.indexOf(e.key);
  return [...entries].sort((a, b) => rank(a) - rank(b));
};

/**
 * The entries a typed query keeps (RK21): none typed keeps all; else those whose word, or one of its words, starts with
 * it, then those whose value holds it. Case never matters, and the order is the palette's own within each group.
 */
export function matchEntries<T extends { word: string; value?: string | null }>(entries: readonly T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...entries];
  const starts = (e: T) => e.word.toLowerCase().split(/\s+/).some((w) => w.startsWith(q)) || e.word.toLowerCase().startsWith(q);
  const holds = (e: T) => !!e.value && e.value.toLowerCase().includes(q);
  return [...entries.filter(starts), ...entries.filter((e) => !starts(e) && holds(e))];
}

/** The menu's highlight after an arrow (RK22): it stays in the list, and a list of none has none. */
export function moveHighlight(index: number, delta: number, count: number): number {
  if (count <= 0) return -1;
  return Math.min(count - 1, Math.max(0, index + delta));
}

/** "Over there" first, then the rest as given, so a late "here" never moves the first row (audit 3). */
export function orderPlaces<T extends { key: string }>(entries: readonly T[]): T[] {
  return [...entries.filter((e) => e.key === 'there'), ...entries.filter((e) => e.key !== 'there')];
}

/** Whether Enter picks the highlight (RK22, audit 6): after a letter or an arrow, and never while an IME composes. */
export const enterPicks = (query: string, touched: boolean, composing: boolean): boolean => !composing && (query.length > 0 || touched);

/** The fix a new reply may offer place keywords from (audit 13): the last known one only while it is as fresh as the reply's own stamp. */
export function freshFix(last: { at: LngLat; t: number } | null, now: number, maxAgeMs: number): LngLat | null {
  return last && now - last.t >= 0 && now - last.t <= maxAgeMs ? last.at : null;
}

/** What a spot picked on the map is called (RK18, audit 15): the name the owner gave, else only the word, never one made up. */
export const mapPickValue = (name: string, word: string): string => name.trim() || word;
