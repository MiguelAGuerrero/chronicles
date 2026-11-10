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

/**
 * Pins for the captures that have a position. A capture joins the nearest
 * pin within `radiusM` of it (on screen, PIN_GROUP_PX at the map's zoom),
 * else starts its own. Captures are taken in time order, so the grouping is
 * the same however the list arrives.
 */
export function pinsFor(captures: Faced[], radiusM: number): CapturePin[] {
  const r = Math.min(radiusM, MAX_GROUP_M);
  const pins: CapturePin[] = [];
  for (const c of [...captures].sort((a, b) => a.t - b.t || a.id.localeCompare(b.id))) {
    if (c.lat == null || c.lon == null) continue;
    const at: LngLat = [c.lon, c.lat];
    let best: CapturePin | null = null;
    let bestD = r;
    for (const p of pins) {
      const d = distanceM(p.lngLat, at);
      if (d <= bestD) {
        best = p;
        bestD = d;
      }
    }
    if (best) {
      best.captures.push(c);
      if (best.kind !== c.kind) best.kind = 'mixed';
    } else {
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
