// @layer core
import type { Faced } from './moment';
import { distanceM, pausedMs, type PauseSpan } from './geo';
import { markOf, type NoteTypeInfo } from './noteType';
import { JUST_AFTER_MS, minutesInLine } from './resurface/context';
import { numberWord } from './resurface/lines';
import { THUMB } from './thumbPlan';
import type { CaptureKind, LngLat } from './types';

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
/** A pin of exactly one note with a type wears that type's mark (NY10); a pin of several shows its kinds (tend map T14). */
export function pinMark(pin: CapturePin): NoteTypeInfo | null {
  return pin.captures.length === 1 ? markOf(pin.captures[0]) : null;
}

/** What a screen reader hears of a single typed note's pin: "Note, idea" (NY10, NY11); null when the pin wears no mark. */
export function pinNoteLabel(pin: CapturePin): string | null {
  const m = pinMark(pin);
  return m ? `Note, ${m.name.toLowerCase()}` : null;
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

/** Its kinds in the order first taken, each once. */
function kindsInOrder(pin: CapturePin): CaptureKind[] {
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

/** A pin's moments by kind, in words, in the order first taken: "A photo and a note", "Two photos and a voice memo" (VISION.md, "Counts are words"). */
export function pinKindsWords(pin: CapturePin): string {
  const parts = kindsInOrder(pin).map((k) => {
    const n = pin.captures.filter((c) => c.kind === k).length;
    return n === 1 ? ONE[k] : `${numberWord(n)} ${MANY[k]}`;
  });
  const text = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0] ?? '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * How far into its walk a pin's first moment was, in walked time and in words, as the moment's own line says it
 * (MC3): "twelve minutes in", "at the start". Null unless every moment of the pin is of one walk whose clock is given,
 * and they lie within JUST_AFTER_MS of each other in walked time (tend map audit 19).
 */
export function pinInto(pin: CapturePin, clocks: readonly WalkClock[] | undefined): string | null {
  const walkId = pin.captures[0]?.walk_id;
  if (!walkId || pin.captures.some((c) => c.walk_id !== walkId)) return null;
  const clock = clocks?.find((w) => w.id === walkId);
  if (!clock) return null;
  const walked = (t: number) => Math.max(0, t - clock.started_at - pausedMs(clock.pauses, clock.started_at, t));
  const first = walked(pin.captures[0].t);
  // Pins group by place, never time: moments far apart in the walk (a loop's start and end) share no one time (tend
  // map audit 19), so the pin says its kinds alone.
  if (walked(pin.captures[pin.captures.length - 1].t) - first > JUST_AFTER_MS) return null;
  const line = minutesInLine(first);
  return line.charAt(0).toLowerCase() + line.slice(1);
}

const KIND_NAME: Record<CaptureKind, string> = { photo: 'Photo', video: 'Video', voice: 'Voice memo', text: 'Note' };

/**
 * What a screen reader hears of a pin's moments, before its bell and its "Open": one moment by its kind ("Photo",
 * "Note, idea", "Memory: Photo"); several by their kinds in words, with how far into the walk when it is known (tend
 * map T14): "A photo and a note, twelve minutes in"; a memory pin's "Memories: a photo and a note".
 */
export function pinSpoken(pin: CapturePin, o: { memory?: boolean; clocks?: readonly WalkClock[] }): string {
  if (pin.captures.length === 1) {
    const kind = KIND_NAME[pin.captures[0].kind];
    return o.memory ? `Memory: ${kind}` : pinNoteLabel(pin) ?? kind;
  }
  const kinds = pinKindsWords(pin);
  if (o.memory) return `Memories: ${kinds.charAt(0).toLowerCase()}${kinds.slice(1)}`;
  const into = pinInto(pin, o.clocks);
  return into ? `${kinds}, ${into}` : kinds;
}

/**
 * What a pin's marker is keyed by on native (tend map audit 20): its moments, its small copy and its note's mark, so a
 * regroup that keeps the first id and the count (a photo and a note becoming two photos) still redraws its fan.
 */
export function pinKey(pin: CapturePin): string {
  return [pin.id, pin.captures.map((c) => c.id).join(','), pinThumb(pin) ?? '', pinMark(pin)?.id ?? ''].join(':');
}

/**
 * The walk screen's clocks (tend map audit 21): its walk's, with the open walk's pauses, only while the open walk is
 * that same walk. After Stop the open walk and its pauses are gone while the screen still shows the walk, and its
 * pins' minutes would count the pauses as walked; with no clock they say their kinds alone.
 */
export function walkClocks(walk: { id: string; started_at: number } | null, open: { id: string } | null, pauses: PauseSpan[]): WalkClock[] | undefined {
  return walk && open?.id === walk.id ? [{ id: walk.id, started_at: walk.started_at, pauses }] : undefined;
}
