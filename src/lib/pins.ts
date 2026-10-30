import { distanceM } from './geo';
import type { Capture, CaptureKind, LngLat } from './types';

/** Captures within this distance of a pin's first capture share the pin. */
const PIN_GROUP_M = 25;

export interface CapturePin {
  id: string;
  lngLat: LngLat;
  /** In the order they were taken. */
  captures: Capture[];
  /** The icon to show: the one kind, or 'mixed'. */
  kind: CaptureKind | 'mixed';
}

/** Pins for the captures that have a position, nearby captures sharing one. */
export function pinsFor(captures: Capture[]): CapturePin[] {
  const pins: CapturePin[] = [];
  for (const c of [...captures].sort((a, b) => a.t - b.t)) {
    if (c.lat == null || c.lon == null) continue;
    const at: LngLat = [c.lon, c.lat];
    const pin = pins.find((p) => distanceM(p.lngLat, at) <= PIN_GROUP_M);
    if (pin) {
      pin.captures.push(c);
      if (pin.kind !== c.kind) pin.kind = 'mixed';
    } else {
      pins.push({ id: c.id, lngLat: at, captures: [c], kind: c.kind });
    }
  }
  return pins;
}
