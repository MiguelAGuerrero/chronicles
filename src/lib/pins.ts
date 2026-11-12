// @layer core
import type { Faced } from './moment';
import { distanceM } from './geo';
import { THUMB } from './thumbPlan';
import type { CaptureKind, LngLat } from './types';

/** Pins closer than this on screen merge into one, with a count. */
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
 * one photo whose copy is made. Never the full photo: while the copy is being
 * made, or for a photo that won't decode, the pin keeps its icon, so a map never
 * decodes full photos. A pin of several keeps its count.
 */
export function pinThumb(pin: CapturePin): string | null {
  if (pin.captures.length !== 1) return null;
  const c = pin.captures[0];
  if (c.kind !== 'photo' || !c.thumb_path || c.thumb_path === THUMB.none) return null;
  return c.thumb_path;
}
