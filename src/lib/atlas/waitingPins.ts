// @layer core
import { distanceM } from '../geo';
import type { LngLat } from '../types';
import { ATLAS_LABEL, ATLAS_ORDER, waitingMarks, type AtlasMark } from './atlas';
import type { Kind } from '../discovery/types';

/*
 * Whole towns (WT7, WT12-WT14, decision 0127): every place still to find in the selected area is on Explore's map,
 * a "?" pin where the pin has room on screen and a dot in its kind's colour where it would overlap another pin.
 * Decided at the settled zoom, rounded to half levels (as capture pins are), nearest the area's middle first.
 */

export const PIN_ROOM = {
  /** A "?" pin's footprint, with a little air: two pins closer than this, east-west and north-south, overlap. */
  px: 40,
  /** A tapped dot zooms in at most this far: the map's closest fit (`fitMaxZoom`'s default). */
  maxZoom: 17,
} as const;

/** Metres a screen pixel spans at a zoom (512 px tiles, as `pressRadiusM`). */
export const metresPerPx = (zoom: number, lat: number) => (40_075_016.686 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** zoom);

/** WT12: the zoom the split is decided at: half levels, so a pinch in progress regroups nothing. */
export const halfZoom = (zoom: number) => Math.round(zoom * 2) / 2;

/** How far apart two spots are east-west and north-south, in metres. */
function apart(a: LngLat, b: LngLat): [number, number] {
  const lat = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  return [Math.abs(a[0] - b[0]) * 111_320 * Math.cos(lat), Math.abs(a[1] - b[1]) * 110_574];
}
const overlaps = (a: LngLat, b: LngLat, gapM: number) => {
  const [dx, dy] = apart(a, b);
  return dx < gapM && dy < gapM;
};

/** WT12: which waiting places are "?" pins and which are dots at this zoom; no two pins overlap. */
export function waitingPins<T extends { key: string; at: LngLat }>(marks: readonly T[], centre: LngLat, zoom: number, lat: number): { pins: T[]; dots: T[] } {
  const gapM = PIN_ROOM.px * metresPerPx(halfZoom(zoom), lat);
  const order = [...marks].sort((a, b) => distanceM(a.at, centre) - distanceM(b.at, centre) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const pins: T[] = [];
  const dots: T[] = [];
  for (const m of order) (pins.some((p) => overlaps(p.at, m.at, gapM)) ? dots : pins).push(m);
  return { pins, dots };
}

/** WT13: the lowest half zoom at which a dot has room to be a "?" (no other place within a pin of it), at most `maxZoom`. */
export function roomZoom(target: { key: string; at: LngLat }, marks: readonly { key: string; at: LngLat }[], lat: number, maxZoom: number = PIN_ROOM.maxZoom): number {
  let nearest = Infinity;
  for (const m of marks) {
    if (m.key === target.key) continue;
    nearest = Math.min(nearest, Math.max(...apart(m.at, target.at)));
  }
  if (nearest === Infinity) return maxZoom;
  if (nearest <= 0) return maxZoom;
  // metresPerPx(z) * px <= nearest  ⇔  z >= log2(C cos(lat) px / (512 nearest)); the next half level up, a hair over.
  const z = Math.log2((40_075_016.686 * Math.cos((lat * Math.PI) / 180) * PIN_ROOM.px) / (512 * nearest));
  return Math.min(maxZoom, Math.ceil((z + 1e-9) * 2) / 2);
}

/** WT13: the dot a press landed on, nearest within the press's reach, or null. */
export function dotAt<T extends { at: LngLat }>(press: LngLat, radiusM: number, dots: readonly T[]): T | null {
  let best: { d: T; m: number } | null = null;
  for (const d of dots) {
    const m = distanceM(press, d.at);
    if (m <= radiusM && (!best || m < best.m)) best = { d, m };
  }
  return best?.d ?? null;
}

/** WT7, WT10: the selected area's map: every place still to find, of the kinds shown, split at this zoom; never a find. */
export function areaMapMarks(marks: readonly AtlasMark[], found: Set<string>, hidden: Set<Kind>, centre: LngLat, zoom: number, lat: number) {
  return waitingPins(waitingMarks([...marks], found, centre, hidden, { all: true }), centre, zoom, lat);
}

/** WT11: what a screen reader hears for the selected area's "?" and dots: the area and the kinds, never how many. */
export function waitingLabel(area: string, marks: readonly Pick<AtlasMark, 'category'>[]): string {
  const kinds = ATLAS_ORDER.filter((c) => marks.some((m) => m.category === c)).map((c) => ATLAS_LABEL[c].toLowerCase());
  return kinds.length ? `Places to find in ${area}: ${kinds.join(', ')}` : '';
}
