// @layer core
import type { Faced } from './moment';
import { distanceM, pausedMs, type PauseSpan } from './geo';
import { ordered, type ReactionInfo, type ReactionSet } from './reactions/core';
import { dayPartLine, JUST_AFTER_MS, minutesInLine } from './resurface/context';
import { numberWord } from './resurface/lines';
import { THUMB } from './thumbPlan';
import type { CaptureKind, LngLat } from './types';

const MIN = 60_000;

/** Pins closer than this on screen merge into one, drawn with its kinds (tend map T14). */
export const PIN_GROUP_PX = 44;
/** Never group captures further apart than this, however far out the map is. */
const MAX_GROUP_M = 5000;

export interface CapturePin {
  /** The first capture's id: stable while the pin keeps its first capture. */
  id: string;
  lngLat: LngLat;
  /** In the order they were taken. */
  captures: Faced[];
  /** The icon to show: the one kind, or 'mixed'. */
  kind: CaptureKind | 'mixed';
}

/** Meters one screen pixel covers at a zoom level and latitude (512 px tiles, as MapLibre). */
export function metersPerPixel(zoom: number, lat: number): number {
  return (40075016.686 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** zoom);
}

/** The sphere `distanceM` measures on. */
const R_M = 6371008.8;
/** Metres in a degree of latitude, on that sphere. */
const M_PER_DEG_LAT = (R_M * Math.PI) / 180;
/** Never more cells than this across a band (a reach of 0 m would ask for infinitely many). */
const MAX_CELLS = 1e9;

/**
 * How many cells of longitude a band of latitude is cut into, so that two points within `r` metres of each other, both
 * in this band or the ones beside it, are never more than one cell apart. At latitudes up to `poleward` (in degrees),
 * two points `dLon` apart are at least 2R asin(cos(poleward) sin(dLon/2)) apart, so a cell at least
 * 2 asin(sin(r/2R) / cos(poleward)) wide will do; near a pole, the band is one cell.
 */
function cellsAcross(row: number, band: number, r: number): number {
  const poleward = Math.min(90, Math.max(Math.abs((row - 1) * band), Math.abs((row + 2) * band)));
  const cos = Math.cos((poleward * Math.PI) / 180);
  const ratio = Math.sin(r / (2 * R_M)) / cos;
  if (!(ratio < 1) || cos <= 0) return 1;
  const width = (2 * Math.asin(ratio) * 180) / Math.PI;
  return Math.max(1, Math.min(MAX_CELLS, Math.floor(360 / width)));
}

/**
 * Pins for the captures that have a position. A capture joins the nearest
 * pin within `radiusM` of it (on screen, PIN_GROUP_PX at the map's zoom),
 * else starts its own. Captures are taken in time order, so the grouping is
 * the same however the list arrives.
 *
 * Pins are kept in cells: bands of latitude `radiusM` tall, each cut into cells
 * of longitude at least `radiusM` wide at the band's pole-most latitude, wrapping
 * at ±180. A capture is measured only against the pins of its cell and the eight
 * around it (tend map 4, tend map audit 5: Chronicle's map groups every placed
 * moment on each half step of zoom, and along one parallel a band alone held them all).
 */
export function pinsFor(captures: Faced[], radiusM: number): CapturePin[] {
  const r = Math.min(radiusM, MAX_GROUP_M);
  const band = Math.max(r, 1e-6) / M_PER_DEG_LAT;
  const pins: CapturePin[] = [];
  const rows = new Map<number, { n: number; cells: Map<number, number[]> }>();
  const rowOf = (k: number) => {
    let got = rows.get(k);
    if (!got) {
      got = { n: cellsAcross(k, band, r), cells: new Map() };
      rows.set(k, got);
    }
    return got;
  };
  const cellOf = (lon: number, n: number) => {
    const turn = (((lon + 180) % 360) + 360) % 360;
    return Math.min(n - 1, Math.floor((turn / 360) * n));
  };
  for (const c of [...captures].sort((a, b) => a.t - b.t || a.id.localeCompare(b.id))) {
    if (c.lat == null || c.lon == null) continue;
    const at: LngLat = [c.lon, c.lat];
    const row = Math.floor(c.lat / band);
    let best = -1;
    let bestD = r;
    for (let k = row - 1; k <= row + 1; k++) {
      const { n, cells } = rowOf(k);
      const cell = cellOf(c.lon, n);
      const seen = new Set<number>();
      for (const j of [cell - 1, cell, cell + 1]) {
        const key = ((j % n) + n) % n;
        if (seen.has(key)) continue;
        seen.add(key);
        for (const i of cells.get(key) ?? []) {
          const d = distanceM(pins[i].lngLat, at);
          // The nearest within reach; on a tie, the later pin, as one pass over them all in order would choose.
          if (d < bestD || (d === bestD && i > best)) {
            best = i;
            bestD = d;
          }
        }
      }
    }
    if (best >= 0) {
      pins[best].captures.push(c);
      if (pins[best].kind !== c.kind) pins[best].kind = 'mixed';
    } else {
      const { n, cells } = rowOf(row);
      const key = cellOf(c.lon, n);
      const list = cells.get(key);
      if (list) list.push(pins.length);
      else cells.set(key, [pins.length]);
      pins.push({ id: c.id, lngLat: at, captures: [c], kind: c.kind });
    }
  }
  return pins;
}

/** Whether a pin wears the reminder bell (RB1, RB2): any of its captures has a live reminder. */
export function pinReminded(pin: CapturePin, ids: ReadonlySet<string>): boolean {
  return pin.captures.some((c) => ids.has(c.id));
}

/**
 * The stored ref of the small copy a pin's head shows (QL26): only for a pin of
 * one photo or one video (VS3) whose copy is made. Never the full photo or the
 * video's file: while the copy is being made, or for one that won't decode, the
 * pin keeps its icon, so a map never decodes full media. A pin of several shows its kinds (`pinHeadKinds`, tend map T14).
 */
/**
 * The reactions a pin wears as bubbles (RX17, RX19): a pin of exactly one moment, its reactions in the families' order;
 * a pin of several, none. The head is never one of them (RX18).
 */
export function pinReactions(pin: Pick<CapturePin, 'captures'>, sets: ReadonlyMap<string, ReactionSet>): ReactionInfo[] {
  if (pin.captures.length !== 1) return [];
  const set = sets.get(pin.captures[0].id);
  return set ? ordered(set) : [];
}

export function pinThumb(pin: CapturePin): string | null {
  if (pin.captures.length !== 1) return null;
  const c = pin.captures[0];
  if ((c.kind !== 'photo' && c.kind !== 'video') || !c.thumb_path || c.thumb_path === THUMB.none) return null;
  return c.thumb_path;
}

/** A walk's clock, so a pin can say how far into the walk its moments were (tend map T14): its id, start and pauses. */
export interface WalkClock {
  id: string;
  started_at: number;
  pauses: PauseSpan[];
}

/** Moments in the order they were taken, by kind: a pin's, or a reminder's put in that order (tend explore T29). */
interface KindsTaken {
  captures: readonly { kind: CaptureKind }[];
}

/** Its kinds in the order first taken, each once. */
function kindsInOrder(pin: KindsTaken): CaptureKind[] {
  return [...new Set(pin.captures.map((c) => c.kind))];
}

/**
 * The kinds a pin of several moments shows in its head, fanned, in place of a numeral (tend map T14, decision
 * 0154): the first two kinds taken; a pin of one kind shows it twice, so it never reads as one moment. Null for a
 * pin of one moment, which keeps its own head.
 */
export function pinHeadKinds(pin: CapturePin): CaptureKind[] | null {
  if (pin.captures.length < 2) return null;
  const kinds = kindsInOrder(pin);
  return kinds.length > 1 ? kinds.slice(0, 2) : [kinds[0], kinds[0]];
}

const ONE: Record<CaptureKind, string> = { photo: 'a photo', video: 'a video', voice: 'a voice memo', text: 'a note' };
const MANY: Record<CaptureKind, string> = { photo: 'photos', video: 'videos', voice: 'voice memos', text: 'notes' };

/**
 * A pin's moments by kind, in words, in the order first taken: "A photo and a note", "Two photos and a voice memo"
 * (VISION.md, "Counts are words"). The one table of the kinds' words: a reminder of several says its kinds with it
 * too (tend explore T29), its moments put in the order taken first.
 */
export function pinKindsWords(pin: KindsTaken): string {
  const parts = kindsInOrder(pin).map((k) => {
    const n = pin.captures.filter((c) => c.kind === k).length;
    return n === 1 ? ONE[k] : `${numberWord(n)} ${MANY[k]}`;
  });
  const text = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0] ?? '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The clock of the one walk every moment of a pin belongs to, if it is given; else null. */
function clockOf(pin: CapturePin, clocks: readonly WalkClock[] | undefined): WalkClock | null {
  const walkId = pin.captures[0]?.walk_id;
  if (!walkId || pin.captures.some((c) => c.walk_id !== walkId)) return null;
  return clocks?.find((w) => w.id === walkId) ?? null;
}

/** Walked time into a walk at `t`: its pauses left out, as the moment's own line counts it (MC3). */
function walkedAt(clock: WalkClock, t: number): number {
  return Math.max(0, t - clock.started_at - pausedMs(clock.pauses, clock.started_at, t));
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** A day's part said after a comma: "Tuesday evening" keeps its capital, "This evening" is "this evening". */
const NAMED = /^(Sun|Mon|Tues|Wednes|Thurs|Fri|Satur)day\b|^(January|February|March|April|May|June|July|August|September|October|November|December)\b/;
const afterComma = (line: string) => (NAMED.test(line) ? line : lower(line));

/** The day a moment belongs to, as `dayPartLine` reckons it: the small hours (before five) are the evening before's. */
function dayOf(t: number): string {
  const d = new Date(new Date(t).getHours() < 5 ? t - 5 * 3_600_000 : t);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * When a pin no walk clock holds was taken (tend map T28): its first moment's part of the day; when its moments fall on
 * different days, the span of their days (tend map audit 27, the owner's answer to ux 1): "from three weeks ago to
 * Tuesday evening", an end whose line carries its own comma ("three weeks ago, afternoon") giving the part before it.
 */
function dayWhen(pin: CapturePin, now: number): string {
  const first = pin.captures[0].t;
  const last = pin.captures[pin.captures.length - 1].t;
  if (dayOf(first) === dayOf(last)) return afterComma(dayPartLine(first, now));
  const end = (t: number) => afterComma(dayPartLine(t, now).replace(/, [^,]+$/, ''));
  // Two days whose ends read alike ("three weeks ago") are said once.
  return end(first) === end(last) ? end(first) : `from ${end(first)} to ${end(last)}`;
}

/**
 * When a pin's moments were, in words (tend map T28, decision 0164): with its walk's clock, the first one's minutes in
 * ("twelve minutes in"), or, when they lie more than JUST_AFTER_MS apart in walked time, the span ("from the start to
 * fifty-eight minutes in"); with none (no clock given, moments of two walks, a moment outside a walk), the part of the
 * day of its first moment as the moment's own line says it (MC4, `dayPartLine`): "Tuesday evening". Null with neither
 * a clock nor `now`.
 */
export function pinWhen(pin: CapturePin, clocks: readonly WalkClock[] | undefined, now: number | undefined): string | null {
  const first = pin.captures[0];
  if (!first) return null;
  // A map of several walks (a day's replay) says every pin's part of the day: "ten minutes in" would not say which
  // walk (tend map audit 28, the owner's answer to ux 2).
  const clock = clocks && clocks.length > 1 ? null : clockOf(pin, clocks);
  if (!clock) return now == null ? null : dayWhen(pin, now);
  const from = walkedAt(clock, first.t);
  const to = walkedAt(clock, pin.captures[pin.captures.length - 1].t);
  // In the minutes the words name: a span only when they lie more than ten apart (tend map audit 30).
  const [a, b] = [Math.round(from / MIN), Math.round(to / MIN)];
  if (b - a <= JUST_AFTER_MS / MIN) return lower(minutesInLine(from));
  if (a === 0) return `from the start to ${lower(minutesInLine(to))}`;
  // Both under an hour share their unit: "from twelve to fifty minutes in".
  if (b < 60) return `from ${numberWord(a)} to ${numberWord(b)} minutes in`;
  return `from ${lower(minutesInLine(from).replace(/ in$/, ''))} to ${lower(minutesInLine(to))}`;
}

/** One moment's kind by name: "Photo", "Voice memo"; a pin's and a reminder's (tend explore T29). */
export const KIND_NAME: Readonly<Record<CaptureKind, string>> = { photo: 'Photo', video: 'Video', voice: 'Voice memo', text: 'Note' };

/**
 * What a screen reader hears of a pin's moments, before its stack, its bell and its "Open": one moment by its kind
 * ("Photo", "Note, idea", "Memory: Photo"), several by their kinds in words (tend map T14), each followed by when
 * (`pinWhen`, tend map T28): "Photo, twelve minutes in", "A photo and a note, from the start to fifty-eight minutes
 * in", "Memories: a photo and a note, Tuesday evening". A memory pin's moments are of other walks, so it always says
 * the part of the day.
 */
export function pinSpoken(pin: CapturePin, o: { memory?: boolean; clocks?: readonly WalkClock[]; now?: number; reactions?: readonly ReactionInfo[] }): string {
  // One moment's reactions are said after its kind, as its bubbles are drawn (RX21): "Photo, happy, idea".
  const one = pin.captures.length === 1 ? [KIND_NAME[pin.captures[0].kind], ...(o.reactions ?? []).map((r) => r.name.toLowerCase())].join(', ') : null;
  const kinds = one ?? pinKindsWords(pin);
  const what = o.memory
    ? pin.captures.length === 1 ? `Memory: ${kinds}` : `Memories: ${lower(kinds)}`
    : kinds;
  const when = pinWhen(pin, o.memory ? undefined : o.clocks, o.now);
  return when ? `${what}, ${when}` : what;
}

/**
 * What a pin's marker is keyed by on native (tend map audit 20): its moments, its small copy and its note's mark, so a
 * regroup that keeps the first id and the count (a photo and a note becoming two photos) still redraws its fan.
 */
export function pinKey(pin: CapturePin): string {
  return [pin.id, pin.captures.map((c) => c.id).join(','), pinThumb(pin) ?? ''].join(':');
}

/**
 * The walk screen's clocks (tend map audit 21): its walk's, with the open walk's pauses, only while the open walk is
 * that same walk. After Stop the open walk and its pauses are gone while the screen still shows the walk, and its
 * pins' minutes would count the pauses as walked; with no clock they say their part of the day (tend map T28).
 */
export function walkClocks(walk: { id: string; started_at: number } | null, open: { id: string } | null, pauses: PauseSpan[]): WalkClock[] | undefined {
  return walk && open?.id === walk.id ? [{ id: walk.id, started_at: walk.started_at, pauses }] : undefined;
}
