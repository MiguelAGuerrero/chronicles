// @layer core
import type { WalkStatus } from '../walk/layer';

/** The quiet line under a layer while it works or can't (layers audit 7): in words, and never for a layer that is off. */
/** SF7, SF10: what the Storefronts layer is doing: drawn, drawn nothing for a covered area, no pack over the map, a read that failed, reading, or too far out to draw. */
export type StorefrontsStatus = 'ok' | 'empty' | 'uncovered' | 'failed' | 'reading' | 'far';

const STOREFRONT_LINES: Record<StorefrontsStatus, string | null> = {
  ok: 'Shops from OpenStreetMap. Tap a mark for its name.',
  // A covered area with none is not a failure: it says nothing (SF7).
  empty: null,
  uncovered: 'Not covered here yet',
  failed: "Couldn't read the shops",
  reading: 'Reading…',
  far: 'Zoom in to see them',
};

export function layerNotes(s: { walkability: WalkStatus; busyReading: boolean; busyFailed: boolean; storefronts?: StorefrontsStatus }): Record<string, string | null> {
  const walk = s.walkability;
  return {
    walkability: walk === 'reading' ? 'Reading…' : walk === 'unavailable' ? 'Not available now' : walk === 'waiting' ? 'Waiting for your position' : null,
    busy: s.busyReading ? 'Reading…' : s.busyFailed ? 'Not available now' : null,
    storefronts: s.storefronts ? STOREFRONT_LINES[s.storefronts] : null,
  };
}
