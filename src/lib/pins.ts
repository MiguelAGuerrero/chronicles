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

/** Metres in a degree of latitude, on the sphere `distanceM` measures with. */
const M_PER_DEG_LAT = (6371008.8 * Math.PI) / 180;

/**
 * Pins for the captures that have a position. A capture joins the nearest
 * pin within `radiusM` of it (on screen, PIN_GROUP_PX at the map's zoom),
 * else starts its own. Captures are taken in time order, so the grouping is
 * the same however the list arrives.
 *
 * Pins are kept in bands of latitude `radiusM` tall, and a capture is measured
 * only against the pins of its band and the two beside it: two points within
 * `radiusM` are never further apart in latitude (tend map 4; Chronicle's map
 * groups every placed moment on each half step of zoom).
 */
export function pinsFor(captures: Faced[], radiusM: number): CapturePin[] {
  const r = Math.min(radiusM, MAX_GROUP_M);
  const band = Math.max(r, 1e-6) / M_PER_DEG_LAT;
  const pins: CapturePin[] = [];
  const bands = new Map<number, number[]>();
  for (const c of [...captures].sort((a, b) => a.t - b.t || a.id.localeCompare(b.id))) {
    if (c.lat == null || c.lon == null) continue;
    const at: LngLat = [c.lon, c.lat];
    const row = Math.floor(c.lat / band);
    let best = -1;
    let bestD = r;
    for (let k = row - 1; k <= row + 1; k++) {
      for (const i of bands.get(k) ?? []) {
        const d = distanceM(pins[i].lngLat, at);
        // The nearest within reach; on a tie, the later pin, as one pass over them all in order would choose.
        if (d < bestD || (d === bestD && i > best)) {
          best = i;
          bestD = d;
        }
      }
    }
    if (best >= 0) {
      pins[best].captures.push(c);
      if (pins[best].kind !== c.kind) pins[best].kind = 'mixed';
    } else {
      const list = bands.get(row);
      if (list) list.push(pins.length);
      else bands.set(row, [pins.length]);
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
